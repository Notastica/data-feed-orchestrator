import Loki from 'lokijs';
import logger from './logging/logger';
import Module from './module';
import jsonpath from 'jsonpath';
import dockerNames from 'docker-names';
import * as mq from './mq/connection';
import * as symbols from './utils/symbols';
import Promise from 'bluebird';
import _ from 'lodash/core';
import uuid from 'node-uuid';
import * as temp from 'temp';
import * as JSON from 'json3';

/**
 * The Orchestrator is the class that manages all modules
 * - manages connections and queue
 * - manages elasticsearch as persistence
 * - it manages things
 * - it is smart
 * @class
 */
class Orchestrator {

  /**
   * Initialise the Orchestrator
   * @param {Object} [options]
   */
  constructor(options) {
    const defaults = {
      dbPath: temp.path(),
      name: dockerNames.getRandomName(false),
      modulesCollectionName: 'modules',
      registerQueue: 'o_register',
      messagesQueue: 'o_messages',
      amqpURL: 'amqp://localhost:5672',
      prefetch: 100
    };

    options = _.defaults(options || {}, defaults);
    logger.info('Initializing Orchestrator with options', options);

    /**
     * The name/path of the lokijs in memory database
     * @type {any}
     */
    this.dbPath = options.dbPath;

    /**
     * The name of this Orchestrator
     * @type {String}
     */
    this.name = options.name;

    /**
     * Whether this orchestrator is currently _running or not;
     * @type {boolean}
     * @private
     */
    this._running = false;

    /**
     * Last module order, this is used to order modules when querying them
     * @type {number}
     * @private
     */
    this._order = 0;

    /**
     * The name of the queue in which new messages will arrive
     * @type {string}
     */
    this.messagesQueue = options.messagesQueue;


    /**
     * Wether the database was fully initialized or not.
     * @type {boolean}
     * @private
     */
    this._dbInitialized = false;

    /**
     * The lokijs database;
     * @type {Loki}
     * @private
     */
    this._db = new Loki(this.dbPath, {
      autoload: true, autosave: true, autoloadCallback: () => {
        this._onRestoreDB();
      }
    });

    this.modulesCollectionName = options.modulesCollectionName;

    /**
     * The modules collection
     * @type {Collection}
     */
    this.modulesCollection = null;

    /**
     * The name of the queue in which registrations will be received
     * @type {string}
     */
    this.registerQueue = options.registerQueue;

    /**
     * The AMQP connection url, eg: amqp://localhost:5672
     * @type {string}
     */
    this.amqpURL = options.amqpURL;

    /**
     * The amqp context (connection) that this Orchestrator is running
     * @see listen
     * @type {Context}
     */
    this.amqpContext = null;

    /**
     * The amount of messages to be prefetched
     * @type {Number}
     */
    this.prefetch = options.prefetch;

    this.modulesSockets = [];
  }


  /**
   * Start listening to a queue for new modules to be registered
   * @return {Promise}
   */
  listen() {
    if (this._running) {
      return Promise.resolve(this);
    }
    if (!this._dbInitialized) {
      return new Promise((resolve) => {
        logger.debug('Database not initialized, waiting 100ms');
        setTimeout(() => {
          resolve(this.listen());
        }, 100);
      });
    }
    return mq.connect(this.amqpURL)
      .bind(this)
      .then((context) => {
        this.amqpContext = context;
        return context.socket('REPLY');
      })
      .then(this._connectToRegistrationQueue)
      .then(this._waitForPersistenceModules)
      .then(() => {
        this._running = true;
        return this.amqpContext.socket('WORKER', { prefetch: this.prefetch });
      }).then(this._connectToMessagesQueue);
  }

  /**
   * Wait for persistence modules to register
   * @private
   * @return {Promise} that only resolves when a persistence module is connected
   */
  _waitForPersistenceModules() {

    return new Promise((resolve) => {
      if (!this._hasPersistenceModule()) {
        logger.debug('No persistence module registered, will wait for 200ms');
        setTimeout(() => {
          this._waitForPersistenceModules().then(resolve);
        }, 200);
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if a persistence module is already registered
   * @return {boolean}
   * @private
   */
  _hasPersistenceModule() {
    return this.modulesCollection.find({ type: 'persistence' }).length > 0;
  }

  /**
   * Connects to the message queue and wait for new messages to arrive
   * @param {WorkerSocket} workerSocket
   * @private
   * @return {WorkerSocket}
   */
  _connectToMessagesQueue(workerSocket) {
    logger.debug('Connecting to messages queue', this.messagesQueue);
    workerSocket.connect(this.messagesQueue);
    const _this = this;

    workerSocket.on('data', (message) => {
      _this._onMessage(JSON.parse(message.toString()));
      workerSocket.ack();
    });
    return workerSocket;
  }

  /**
   * Connects to the registration queue and wait for new modules
   *
   * @param {RepSocket} replySocket
   * @return {RepSocket}
   * @private
   */
  _connectToRegistrationQueue(replySocket) {
    replySocket.connect(this.registerQueue);
    replySocket.on('data', (message) => {
      logger.debug('Received new module registration');
      return this.onNewModule(message).then((m) => {
        logger.debug('Module registered, writing back response', m.toJSON());
        replySocket.write(m.toJSON());
        logger.debug('Response written');
        return m;
      });
    });
    logger.info(`[${symbols.check}] AMQP connected, waiting for new modules`);
    return replySocket;
  }

  /**
   * Shutdown this Orchestrator, disconnection from MQ and ES and freeing resources
   * @return {Promise}
   */
  shutdown() {
    return new Promise((resolve) => {
      let waitAmqp = false;

      if (this._running) {
        if (this.amqpContext) {
          this.amqpContext.on('close', () => {
            resolve();
          });
          this.amqpContext.close();
          waitAmqp = true;
        }
        logger.info(`[${symbols.check}] AMQP disconnected`);
        if (this.esClient) {
          this.esClient.close();
        }
        logger.info(`[${symbols.check}] Elasticsearch disconnected`);
        this._running = false;
      }
      if (this._db) {
        this._db.saveDatabase(() => {
          this._db.close(!waitAmqp ? resolve : null);
        });
      }
      if (!waitAmqp) {
        resolve();
      }
    });

  }

  /**
   * Handles new modules registrations from the amqp queue
   * @param  {Object} message
   * @return {Promise}
   */
  onNewModule(message) {
    return new Promise((resolve, reject) => {
      try {
        message = typeof message === 'string' || Buffer.isBuffer(message) ? JSON.parse(message.toString()) : message;
        logger.debug(`Received new message on the module register queue ${message}`, message);
        const module = new Module(message);

        return this.register(module).then((m) => {
          resolve(m);
        });
      } catch (e) {
        logger.warn('Error parsing new module', e);
        reject(e);
      }
    });
  }

  /**
   * Handles new messages arrived, dispatching to first matching worker it can find
   * @param {any} originalMessage
   * @private
   * @return {Promise} that resolves if handling of the message is OK
   */
  _onMessage(originalMessage) {

    const meta = originalMessage.__meta;

    delete originalMessage.__meta; // Removing meta to make sure it's not send to other modules
    if (meta && meta.type === 'persistence') { // If it's coming from the persistence module
      return this.findMatchingModules(originalMessage)
        .then((modules) => {
          if (_.isEmpty(modules)) {
            logger.info('Finished pipeline for message, storing and not redirecting to any module');
          } else {
            return this._sendMessageToModule(originalMessage, modules[0]);
          }
        });
    }
    return this._storeMessage(originalMessage);
  }

  /**
   * Send the given message to the given module.
   * @param {*} message
   * @param {Module} module
   * @private
   */
  _sendMessageToModule(message, module) {
    module = Orchestrator.checkModule(module);

    logger.info('Redirecting message to module', module.service, module.name);
    logger.debug('Sending message to queue', message, module.workerQueueName);
    if (!this.modulesSockets[module.service]) {
      const pushSocket = this.amqpContext.socket('PUSH');

      this.modulesSockets[module.service] = pushSocket;
      pushSocket.connect(module.workerQueueName, () => {
        this._sendMessageToModule(message, module);
      });

    } else {
      this.modulesSockets[module.service].write(JSON.stringify(message));
    }
  }


  /**
   * Stores the arrived message into the elasticsearch
   * and return a Promise that resolves to the stored message
   * @param {Object} message
   * @private
   * @return {Promise}
   */
  _storeMessage(message) {
    const _this = this;

    if (!message.uuid) {
      message.uuid = uuid.v4();
    }
    return new Promise((resolve, reject) => {
      const modules = _this.modulesCollection.find({ type: 'persistence' });

      if (modules.length === 1) { // only allow 1 persistence module for now
        this._sendMessageToModule(message, modules[0]);
        // } else if (modules.length > 1) { // This is being limited by registration now
        //   reject(new Error('More than 1 persistence module is currently not supported'));
      } else {
        reject(new Error('No persistence module registered, orchestrator should not have been started'));
      }
    });
  }


  /**
   * Unregister a module in the Orchestrator
   * @param {Module} module
   * @return {Promise}
   */
  unregister(module) {

    return new Promise((resolve) => {
      module = Orchestrator.checkModule(module);
      const previousModule = this.modulesCollection.find({ uuid: module.uuid });

      if (previousModule) {
        logger.info(`Unregistering ${module.name} with uuid ${module.uuid}`);
        this.modulesCollection.remove(previousModule);
      }
      resolve();
    });
  }


  /**
   * Check if a module is registered
   * @param {Module} module
   * @return {boolean}
   */
  isRegistered(module) {
    module = Orchestrator.checkModule(module);
    return this.modulesCollection.find({ uuid: module.uuid }).length > 0;
  }

  /**
   * Register a module in the Orchestrator
   * @param {Module} module
   * @return {*|Promise}
   */
  register(module) {

    return Promise.resolve().then(() => {
      module = Orchestrator.checkModule(module);
      logger.info('Registering new module', module.toJSON());

      if (this.isRegistered(module)) {
        logger.info(`Module ${module.name} already registered for uuid ${module.uuid}`);
        this.modulesCollection.removeWhere({ uuid: module.uuid });
        return this.modulesCollection.insert(module);
      }

      // Only 1 persistence module allowed, the new one always replace the old one
      if (module.type === 'persistence' && this._hasPersistenceModule()) {
        this.modulesCollection.removeWhere((m) => {
          return m.type === 'persistence';
        });
      }
      module.order = ++this._order;
      module.messagesQueue = this.messagesQueue;
      module.workerQueueName = this.generateModuleQueueName(module);
      return this.modulesCollection.insert(module);
    });
  }


  /**
   * Find modules that matches for the give message
   * ordered by their registration _order
   * @param {Object} message
   * @param {Object} [meta] the message metadata
   * @return {Promise}
   */
  findMatchingModules(message, meta) {
    return new Promise((resolve) => {
      logger.debug('Finding modules that matches', message);
      const modules = this.modulesCollection.where((module) => {
        if (module.type === 'persistence') {
          return false;
        }
        if (meta && meta.service === module.service && !module.resend) {
          return false;
        }

        let matchesPositive = true;
        let matchesNegative = true;


        if (module.positivePath) {
          matchesPositive = Orchestrator.matchesPath(message, module.positivePath);
        }

        if (module.negativePath) {
          matchesNegative = !Orchestrator.matchesPath(message, module.negativePath);
        }
        return matchesPositive && matchesNegative;
      });

      logger.debug('Found modules:', modules.length);
      resolve(modules);

    });

  }

  /**
   * Generates a random (with pattern) queue name to be used by modules
   * NOTE: if a module is already registered for the same service, the previously generated queue is returned.
   * This way all modules for the same service will be listening to the same queue
   * @param {Module} module
   * @return {string}
   */
  generateModuleQueueName(module) {
    const serviceModules = this.modulesCollection.find({ service: module.service });

    if (!_.isEmpty(serviceModules)) {
      return serviceModules[0].workerQueueName;
    }
    return `${module.service}-${module.order}-${uuid.v4()}`;
  }

  /**
   * Checks if the given object matches a jsonpath
   * @param {*} obj
   * @param {Path} path
   * @return {boolean}
   */
  static
  matchesPath(obj, path) {
    return jsonpath.query(obj, path).length > 0;
  }

  /**
   * Check if the module is of type {Module} if not convert to it
   *
   * @param {*|Module} module
   * @return {Module}
   */
  static
  checkModule(module) {
    return module instanceof Module ? module : new Module(module);
  }

  /**
   * Called when the database is ready
   * @private
   */
  _onRestoreDB() {
    this.modulesCollection = this._db.getCollection(this.modulesCollectionName);
    if (!this.modulesCollection) {
      this.modulesCollection = this._db.addCollection(this.modulesCollectionName);
      this._dbInitialized = true;
    } else {

      const parseAndRegister = (m) => {
        if (typeof m === 'string') {
          m = JSON.parse(m);
        }
        return this.register(m);
      };

      Promise.all(this.modulesCollection.find().map(parseAndRegister))
        .then(() => {
          logger.debug(`Database loaded with, ${this.modulesCollection.count()} modules`);
          this._dbInitialized = true;
        });
    }
  }
}


export default Orchestrator;


