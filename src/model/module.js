import uuid from 'node-uuid';
import names from 'docker-names';
import assert from 'assert';
import * as mq from '../mq/connection';
import Promise from 'bluebird';
import logger from '../logging/logger';
import _ from 'lodash';

/**
 * Module class that represents a module that is connected directly to the Orchestrator.
 *
 */
class Module {

  /**
   * Constructor for module, several options are expected.
   * //TODO document all options
   * @param {*} moduleFrom
   */

  constructor(moduleFrom) {
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

  listen() {
    this.workerSocket = this.amqpContext.socket('WORKER');
    this.workerSocket.connect(this.workerQueueName);
    this.workerSocket.on('data', (message) => {
      this.handleMessage(message);
    });
  }

  handleMessage(message) {
    logger.warn('Default #handleMessage triggered, your module should overwrite this method.', message.toString());
    logger.warn('Calling ACK and automatically dismissing message');
    this.sendAck();
  }

  sendAck() {
    logger.debug('Sending ACK for last received message');
    this.workerSocket.ack();
  }

}


export default Module;

