import uuid from 'node-uuid';
import names from 'docker-names';
import assert from 'assert';
import * as mq from './mq/connection';
import Promise from 'bluebird';
import logger from './logging/logger';
import _ from 'lodash';
import EventEmitter from 'events';

/**
 * Module class that represents a module that is connected directly to the Orchestrator.
 * @class
 */
class Module extends EventEmitter {

  /**
   * Constructor for module, several options are expected.
   * //TODO document all options
   * @param {Object|string} options
   */

  constructor(options) {
    super();
    options = options || options;
    if (typeof options === 'string') {
      options = { service: options };
    }
    options = options || options;
    const defaults = {
      uuid: uuid.v4(),
      name: names.getRandomName(false),
      order: -1,
      registerQueue: 'o_register',
      amqpURL: 'amqp://localhost:5672'
    };

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
    this.order = options.order;
    this.registerQueue = options.registerQueue;
    this.amqpURL = options.amqpURL;
    this.messagesQueue = null;

    // ---------------------------------------------

    // Complex properties (Objects, classes, etc)
    // ---------------------------------------------
    this.workerQueueName = null;
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
      messagesQueue: this.messagesQueue
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
            req.pipe(process.stdout);
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
    this.workerSocket = this.amqpContext.socket('WORKER');
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

