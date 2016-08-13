import uuid from 'node-uuid';
import names from 'docker-names';
import assert from 'assert';

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
  }
}


export default Module;

