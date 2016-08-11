import Loki from 'lokijs';
import logger from './logging/logger';
import uuid from 'node-uuid';

let db, modules;
let initialized = false;
let order = 0;

const defaultOptions = {
  dbName: 'orchestrator',
  modules: 'modules'
};

/**
 * Check the Orchestrator is initialized
 * @return {Promise}
 */
const checkInit = () => {
  return new Promise((resolve, reject) => {
    if (!initialized) {
      logger.warn('Orchestrator not initialized');
      reject('Orchestrator not initialized');
    }
    resolve(initialized);
  });

};


/**
 * Initialise the Orchestrator
 * @param {Object} [options]
 * @return {Promise}
 */
export const init = (options) => {
  return new Promise((resolve) => {
    logger.info('Initializing Orchestrator');
    options = options || defaultOptions;
    db = new Loki(options.dbName);
    modules = db.addCollection(options.modules);
    initialized = true;
    resolve(initialized);
  });
};

/**
 * Unregister a module in the Orchestrator
 * @param {Object} module
 * @return {*|Promise}
 */
export const unregister = (module) => {

  return checkInit().then(() => {
    const previousModule = modules.find({ uuid: module.uuid });

    if (previousModule) {
      logger.info(`Unregistering ${module.name} with uuid ${module.uuid}`);
      modules.remove(previousModule);
    }
  });

};

/**
 * Check if a module is registered
 * @param {Object} module
 * @return {boolean}
 */
export const isRegistered = (module) => {
  return modules.find({ uuid: module.uuid }).length > 0;
};

/**
 * Register a module in the Orchestrator
 * @param {Object} module
 * @return {*|Promise}
 */
export const register = (module) => {
  return checkInit().then(() => {
    logger.info('Registering new module', module);

    if (!module.uuid) {
      module.uuid = uuid.v4();
    }

    if (isRegistered(module)) {
      logger.info(`Module ${module.name} already registered for uuir ${module.uuid}`);
      logger.info('Unregistering previously registered module, to register the new one');
      unregister(modules.find({ uuid: module.uuid })[0]);
    }
    module.order = order++;
    return modules.insert(module);
  });
};


