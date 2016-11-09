import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Module from '../src/module';
import logger from '../src/logging/logger';
import dockerNames from 'docker-names';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);

describe('Module', function () {
  it('Should fail when registering a module without service', function () {

    return new Promise((resolve, reject) => {
      try {
        const m = new Module();

        m.name = dockerNames.getRandomName(false); // eslint complains!
        reject();
      } catch (err) {
        resolve();
      }
    });
  });

  it('Should log when a new module is being initialized with options', function (done) {

    logger._test_debug = logger.debug;
    logger.debug = function () {
      if (arguments[0] === 'Initializing module with options:') {
        // reset logger;
        logger.debug = logger._test_debug;
        done();
      }
      logger._test_debug.apply(logger, arguments);

    };

    const m = new Module({ service: 'testService' });

    logger.info(`Module initialized [${m.service}]-[${m.name}]`);

  });

  it('Should NOT log when a new module is being initialized with Module', function (done) {

    let m = new Module({ service: 'testService' });

    logger._test_debug = logger.debug;
    logger.debug = function () {
      if (arguments[0] === 'Initializing module with options:') {
        // reset logger;
        logger.debug = logger._test_debug;
        done(new Error('Module initialization with module should not be logged'));
      }
      logger._test_debug.apply(logger, arguments);

    };

    m = new Module(m);

    logger.info(`Module initialized [${m.service}]-[${m.name}]`);
    logger.debug = logger._test_debug;
    done();

  });

  it('Should fail when a new property is added and not reflected in the test', function () {
    const m = new Module('test-service-name');

    // STATIC TEST
    // This is to make sure any new property added to the Module class is verified
    // if it should be added to the toJSON() method that is called on module serialization.
    // if a new property is added that should be serialized is not added to the toJSON method
    // it will not be serialized and the functionality might fail.
    // After verification this constant should be increased by the number of new properties
    const expectedKeysSize = 20;

    chai.expect(Object.keys(m).length).to.be.equals(expectedKeysSize);


  });

});
