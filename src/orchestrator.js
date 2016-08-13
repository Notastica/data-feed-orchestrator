import Loki from 'lokijs';
import logger from './logging/logger';
import uuid from 'node-uuid';
import Module from './model/module';
import jsonpath from 'jsonpath';
import dockerNames from 'docker-names';

class Orchestrator {
  constructor() {
    this.dbPath = 'orchestrator.js';
    this.name = dockerNames.getRandomName(false);
    this.db = null;
    this.modulesCollection = null;
    this.initialized = false;
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
      options = options || {};
      logger.info('Initializing Orchestrator with options', options);
      this.name = options.name || this.name;
      this.dbPath = options.dbPath || this.dbPath;
      this.db = new Loki(this.dbName);
      this.modulesCollection = this.db.addCollection('modules');
      logger.debug('Database initialized with name', this.dbPath);
      this.initialized = true;
      resolve(this.initialized);
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
        module = this.checkModule(module);
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
    module = this.checkModule(module);
    return this.modulesCollection.find({ uuid: module.uuid }).length > 0;
  }

  /**
   * Register a module in the Orchestrator
   * @param {Module} module
   * @return {*|Promise}
   */
  register(module) {
    return this.checkInit().then(() => {
      module = this.checkModule(module);
      logger.info('Registering new module', module);

      if (!module.uuid) {
        module.uuid = uuid.v4();
      }

      if (this.isRegistered(module)) {
        logger.info(`Module ${module.name} already registered for uuir ${module.uuid}`);
        logger.info('Unregistering previously registered module, to register the new one');
        return this.unregister(this.modulesCollection.find({ uuid: module.uuid })[0])
          .then(() => this.register(module));
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
          matches = this.matchesPath(message, module.positivePath);
        }

        if (module.negativePath) {
          matches = !this.matchesPath(message, module.negativePath);
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
  matchesPath(obj, path) {
    return jsonpath.query(obj, path).length > 0;
  }

}


export default Orchestrator;


