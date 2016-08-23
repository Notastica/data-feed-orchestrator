import uuid from 'node-uuid';
import names from 'docker-names';
import assert from 'assert';
import * as mq from './mq/connection';
import Promise from 'bluebird';
import logger from './logging/logger';
import _ from 'lodash';
import EventEmitter from 'events';
import * as JSON from 'json3';

/**
 * Module class that represents a module that is connected directly to the Orchestrator.
 * @class
 */
class Module extends EventEmitter {

  /**
   * Constructor for module, several options are expected.
   * //TODO document all options
   * @param {Object|String} options either a config object or a string with the service name
   * @param {String} options.service the name of the service of this module, modules are grouped by servicename in the Orchestrator
   * @param {String} [options.uuid] a unique id for the module, one will be generated if not passed
   * @param {String} [options.name] Name your module, or one will be automatically generated
   * @param {String} [options.registerQueue] the name of the queue that the orchestrator is listening for registrations, default to 'o_register'
   * @param {String} [options.amqpURL] the url to connect to the rabbitmq, defaults to: amqp://localhost:5672
   * @param {Number} [options.prefetch] the number of messages that will be prefetched to be processed, defaults to 1,
   * which means a new message will only arrive after afterProcess is called
   * @param {String} [options.type] The type of this module, it should be either persistence or enricher
   * a Peristence module is the module that only persists data, you can only have a single persistence module (same instances can be launched by service to process heavy load)
   * @param {String} [options.positivePath] the json path {@see https://github.com/dchester/jsonpath} that when matched messages will be sent to this module
   * @param {String} [options.negativePath] the json path {@see https://github.com/dchester/jsonpath} that when NOT matched messages will be sent to this module
   *
   */

  constructor(options) {
    super();

    const defaults = {
      uuid: uuid.v4(),
      name: names.getRandomName(false),
      registerQueue: 'o_register',
      amqpURL: 'amqp://localhost:5672',
      type: 'processor',
      prefecth: 1
    };

    if (typeof options === 'string') {
      defaults.service = options;
    }

    options = _.defaults(options, defaults);
    logger.debug('Initializing module with options:', options);

    // Simple properties that should be added to JSON
    // ---------------------------------------------
    this.service = options.service;
    assert.ok(this.service, 'We need a service to know your module');
    this.uuid = options.uuid;
    this.name = options.name;
    this.positivePath = options.positivePath;
    this.negativePath = options.negativePath;
    this.order = -1;
    this.registerQueue = options.registerQueue;
    this.amqpURL = options.amqpURL;
    this.messagesQueue = null;
    this.workerQueueName = null;
    this.prefetch = options.prefetch;
    this.type = options.type;

    // ---------------------------------------------

    // Complex properties (Objects, classes, etc)
    // ---------------------------------------------
    this.amqpContext = null;
    this.workerSocket = null;
    this.messageQueueSocket = null;
    // ---------------------------------------------
  }

  /**
   * Generates a JSON that represents this object
   * @return {Object} a JSON representation of this object
   */
  toJSON() {
    return JSON.stringify({
      service: this.service,
      uuid: this.uuid,
      name: this.name,
      positivePath: this.positivePath,
      negativePath: this.negativePath,
      order: this.order,
      registerQueue: this.registerQueue,
      amqpURL: this.amqpURL,
      workerQueueName: this.workerQueueName,
      messagesQueue: this.messagesQueue,
      prefetch: this.prefetch,
      type: this.type
    });
  }

  /**
   * Tries to register this module into the Orchestrator
   * The following steps are executed:
   *  - Connect to the MQ
   *  - Create a REQUEST socket to send the registration to the Orchestrator
   *  - Send itself to the retistration queue
   *  - Wait for an answer in the reply queue (automagically generated)
   *  - Grabs the response, apply the new values to itself from response
   *  - resolve the promise with itself updated
   * @return {Promise.<Module>}
   */
  register() {
    const _this = this;

    return mq.connect(this.amqpURL)
      .then((context) => {
        _this.amqpContext = context;
        return context.socket('REQ');
      })
      .then((req) => {
        return new Promise((resolve) => {
          req.connect(_this.registerQueue, () => {
            req.write(_this.toJSON());
            req.on('data', (res) => {
              const m = JSON.parse(res);

              logger.debug('Got a response back from the orchestrator', m);
              if (m.uuid === _this.uuid) {
                _.assign(_this, m);
                _this.listen();
                resolve(_this);
              }
            });
          });
        });
      });
  }

  /**
   * Start listening on {Module.WokerQueueName} (defined in registration)
   * for new jobs to process
   */
  listen() {
    logger.debug('Listening for new messages on queue: ', this.workerQueueName);
    this.workerSocket = this.amqpContext.socket('WORKER', { prefetch: this.prefetch });
    this.workerSocket.connect(this.workerQueueName);
    const _this = this;

    this.workerSocket.on('data', (message) => {

      logger.debug(`New message received ${message.toString()}`);
      try {
        message = JSON.parse(message);
      } catch (err) {
        logger.debug('Could not convert message to JSON, sending raw value');
        message = message.toString();
      }
      _this.emit('data', message);
    });
  }

  /**
   * Send an acknowledge message back to the orchestrator, this ack the last received job
   * and should be called for every message handled inside #handleMessage
   * @see handleMessage
   * @param {*} message
   */
  afterProcess(message) {

    message.__meta = {
      type: this.type,
      service: this.service,
      uuid: this.uuid
    };

    this._connectToMessageQueue().then(() => {
      this.messageQueueSocket.write(JSON.stringify(message));
      logger.debug('Sending ACK for last received message');
      this.workerSocket.ack();
    });
  }

  /**
   * Connects to the message queue that the Orchestrator has given back in the field messageQueue
   * @private
   * @return {Promise}
   */
  _connectToMessageQueue() {
    if (this.messageQueueSocket) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.messageQueueSocket = this.amqpContext.socket('PUSH');
      this.messageQueueSocket.connect(this.messagesQueue, resolve);
    });

  }
}


export default Module;

