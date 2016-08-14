import uuid from 'node-uuid';
import names from 'docker-names';
import assert from 'assert';
import * as mq from '../mq/connection';
import Promise from 'bluebird';


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
    this.service = moduleFrom.service;
    assert.ok(this.service, 'We need a service to know your module');
    this.uuid = moduleFrom.uuid || uuid.v4();
    this.name = moduleFrom.name || names.getRandomName(false);
    this.positivePath = moduleFrom.positivePath;
    this.negativePath = moduleFrom.negativePath;
    this.order = moduleFrom.order || -1;
    this.registerQueue = moduleFrom.registerQueue || 'o_register';
    this.amqpURL = moduleFrom.amqpURL || 'amqp://localhost:5672';
  }

  register() {
    return mq.connect(this.amqpURL)
      .then((context) => {
        return context.socket('REQ');
      })
      .then((req) => {
        return new Promise((resolve) => {
          req.connect(this.registerQueue, () => {
            const resp = req.write(JSON.stringify(this));

            resolve(resp);
          });
        });
      });
  }
}


export default Module;
