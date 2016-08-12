import Loki from 'lokijs';
import logger from './logging/logger';
import uuid from 'node-uuid';
import Module from './model/module';
import jsonpath from 'jsonpath';

let db, modulesCollection;
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
    modulesCollection = db.addCollection(options.modules);
    initialized = true;
    resolve(initialized);
  });
};

/**
 * Check if the module is of type {Module} if not convert to it
 *
 * @param {*|Module} module
 * @return {Module}
 */
const checkModule = (module) => {
  return typeof module === Module ? module : new Module(module);
};

/**
 * Unregister a module in the Orchestrator
 * @param {Module} module
 * @return {Promise}
 */
export const unregister = (module) => {

  return checkInit()
    .then(() => {
      module = checkModule(module);
      const previousModule = modulesCollection.find({ uuid: module.uuid });

      if (previousModule) {
        logger.info(`Unregistering ${module.name} with uuid ${module.uuid}`);
        modulesCollection.remove(previousModule);
      }
    });

};

/**
 * Check if a module is registered
 * @param {Module} module
 * @return {boolean}
 */
export const isRegistered = (module) => {
  module = checkModule(module);
  return modulesCollection.find({ uuid: module.uuid }).length > 0;
};

/**
 * Register a module in the Orchestrator
 * @param {Module} module
 * @return {*|Promise}
 */
export const register = (module) => {
  return checkInit().then(() => {
    module = checkModule(module);
    logger.info('Registering new module', module);

    if (!module.uuid) {
      module.uuid = uuid.v4();
    }

    if (isRegistered(module)) {
      logger.info(`Module ${module.name} already registered for uuir ${module.uuid}`);
      logger.info('Unregistering previously registered module, to register the new one');
      return unregister(modulesCollection.find({ uuid: module.uuid })[0])
        .then(() => register(module));
    }
    module.order = order++;
    return modulesCollection.insert(module);
  });
};

/**
 * Checks if the given object matches a jsonpath
 * @param {*} obj
 * @param {Path} path
 * @return {boolean}
 */
const matchesPath = (obj, path) => {
  return jsonpath.query(obj, path).length > 0;
};

/**
 * Find modules that matches for the give message
 * ordered by their registration order
 * @param {Object} message
 * @return {Promise}
 */
export const findMatchingModules = (message) => {
  return new Promise((resolve) => {
    logger.debug('Finding modules that matches', message);
    const modules = modulesCollection.where((module) => {
      let matches = false;

      if (module.positivePath) {
        matches = matchesPath(message, module.positivePath);
      }

      if (module.negativePath) {
        matches = !matchesPath(message, module.negativePath);
      }
      return matches;
    });

    logger.debug('Found modules:', modules.length);
    resolve(modules);

  });


};


