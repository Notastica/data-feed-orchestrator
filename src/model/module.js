import uuid from 'node-uuid';
import names from 'docker-names';

class Module {
  constructor(moduleFrom) {
    moduleFrom = moduleFrom || {};
    this.uuid = moduleFrom.uuid || uuid.v4();
    this.name = moduleFrom.name || names.getRandomName(false);
    this.positivePath = moduleFrom.positivePath;
    this.negativePath = moduleFrom.negativePath;
    this.order = moduleFrom.order || -1;

  }
}


export default Module;

