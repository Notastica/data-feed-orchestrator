import Loki from 'lokijs';
import logger from './logging/logger';
import Module from './model/module';
import jsonpath from 'jsonpath';
import dockerNames from 'docker-names';
import * as mq from './mq/connection';
import * as es from './es/connection';
import * as symbols from './utils/symbols';
import Promise from 'bluebird';

class Orchestrator {
  constructor() {
    this.dbPath = 'orchestrator.js';
    this.name = dockerNames.getRandomName(false);
    this.db = null;
    this.modulesCollection = null;
    this.initialized = false;
    this.running = false;
    this.order = 0;
    this.registerQueue = null;
  }

  /**
   * Initialise the Orchestrator
   * @param {Object} [options]
   * @return {Promise}
   */
  init(options) {
    return new Promise((resolve) => {
      if (this.initialized) {
        resolve();
      }
      options = options || {};
      logger.info('Initializing Orchestrator with options', options);
      this.name = options.name || this.name;
      this.dbPath = options.dbPath || this.dbPath;
      this.db = new Loki(this.dbName);
      this.modulesCollection = this.db.addCollection('modules');
      logger.debug('Database initialized with name', this.dbPath);
      this.registerQueue = options.registerQueue || 'o_register';
      this.amqpContext = null;
      this.amqpURL = options.amqpURL || 'amqp://localhost:5672';
      this.esClient = null;
      this.initialized = true;
      resolve(this.initialized);
    });
  }


  /**
   * Start listening to a queue for new modules to be registered
   * @return {Promise}
   */
  listen() {
    if (this.running) {
      return Promise.resolve(this);
    }
    return mq.connect(this.amqpURL)
      .bind(this)
      .then((context) => {
        this.amqpContext = context;
        return context.socket('REPLY');
      })
      .then((reply) => {
        reply.connect(this.registerQueue);
        reply.on('data', (message) => {
          return this.onNewModule(message).then((m) => {
            reply.write(JSON.stringify(m));
            return m;
          });
        });
        logger.info(`[${symbols.check}] AMQP connected, waiting for new modules`);
      })
      .then(() => {
        return es.connect();
      })
      .then((esClient) => {
        this.esClient = esClient;
        logger.info(`[${symbols.check}] ElasticSearch connected`);
        this.running = true;
        return this;
      });

  }

  shutdown() {
    if (this.running) {
      if (this.amqpContext) {
        this.amqpContext.close();
      }
      logger.info(`[${symbols.check}] AMQP disconnected`);
      if (this.esClient) {
        this.esClient.close();
      }
      logger.info(`[${symbols.check}] Elasticsearch disconnected`);
      this.running = false;
    }
  }

  /**
   * Handles new modules registrations from the amqp queue
   * @param  {Object} message
   * @return {Promise}
   */
  onNewModule(message) {
    return new Promise((resolve, reject) => {
      try {
        message = typeof message === 'string' || Buffer.isBuffer(message) ? JSON.parse(message) : message;
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
   * Check the Orchestrator is initialized
   * @return {Promise}
   */
  checkInit() {
    return new Promise((resolve, reject) => {
      if (!this.initialized) {
        logger.warn('Orchestrator not initialized');
        reject('Orchestrator not initialized');
      }
      resolve(this.initialized);
    });

  }

  /**
   * Check if the module is of type {Module} if not convert to it
   *
   * @param {*|Module} module
   * @return {Module}
   */
  static
  checkModule(module) {
    return typeof module === Module ? module : new Module(module);
  }

  /**
   * Unregister a module in the Orchestrator
   * @param {Module} module
   * @return {Promise}
   */
  unregister(module) {

    return this.checkInit()
      .then(() => {
        module = Orchestrator.checkModule(module);
        const previousModule = this.modulesCollection.find({ uuid: module.uuid });

        if (previousModule) {
          logger.info(`Unregistering ${module.name} with uuid ${module.uuid}`);
          this.modulesCollection.remove(previousModule);
        }
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
    return this.checkInit().then(() => {
      module = Orchestrator.checkModule(module);
      logger.info('Registering new module', module);

      if (this.isRegistered(module)) {
        logger.info(`Module ${module.name} already registered for uuir ${module.uuid}`);
        logger.info('Unregistering previously registered module, to register the new one');
        return this.unregister(this.modulesCollection.find({ uuid: module.uuid })[0])
          .then(() => {
            return this.register(module);
          });
      }
      module.order = this.order++;
      return this.modulesCollection.insert(module);
    });
  }


  /**
   * Find modules that matches for the give message
   * ordered by their registration order
   * @param {Object} message
   * @return {Promise}
   */
  findMatchingModules(message) {
    return new Promise((resolve) => {
      logger.debug('Finding modules that matches', message);
      const modules = this.modulesCollection.where((module) => {
        let matches = false;

        if (module.positivePath) {
          matches = Orchestrator.matchesPath(message, module.positivePath);
        }

        if (module.negativePath) {
          matches = !Orchestrator.matchesPath(message, module.negativePath);
        }
        return matches;
      });

      logger.debug('Found modules:', modules.length);
      resolve(modules);

    });

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

}


export default Orchestrator;


