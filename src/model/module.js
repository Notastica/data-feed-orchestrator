import uuid from 'node-uuid';
import names from 'docker-names';
import assert from 'assert';
import * as mq from '../mq/connection';
import Promise from 'bluebird';
import logger from '../logging/logger';
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
   * @param {*} moduleFrom
   */

  constructor(moduleFrom) {
    super();
    moduleFrom = moduleFrom || {};
    // Simple properties that should be added to JSON
    // ---------------------------------------------
    this.service = moduleFrom.service;
    assert.ok(this.service, 'We need a service to know your module');
    this.uuid = moduleFrom.uuid || uuid.v4();
    this.name = moduleFrom.name || names.getRandomName(false);
    this.positivePath = moduleFrom.positivePath;
    this.negativePath = moduleFrom.negativePath;
    this.order = moduleFrom.order || -1;
    this.registerQueue = moduleFrom.registerQueue || 'o_register';
    this.amqpURL = moduleFrom.amqpURL || 'amqp://localhost:5672';
    // ---------------------------------------------

    // Complex properties (Objects, classes, etc)
    // ---------------------------------------------
    this.workerQueueName = null;
    this.amqpContext = null;
    this.workerSocket = null;
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
      workerQueueName: this.workerQueueName
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
                resolve(m);
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
    this.workerSocket = this.amqpContext.socket('WORKER');
    this.workerSocket.connect(this.workerQueueName);
    const _this = this;

    this.workerSocket.on('data', (message) => {
      logger.debug('New message received', message);
      try {
        message = JSON.parse(message.toString());
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
   */
  sendAck() {
    logger.debug('Sending ACK for last received message');
    this.workerSocket.ack();
  }

}


export default Module;

