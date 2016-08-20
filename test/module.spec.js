import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Module from '../src/module';
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

  it('Should fail when a new property is added and not reflected in the test', function () {
    const m = new Module('test-service-name');

    // STATIC TEST
    // This is to make sure any new property added to the Module class is verified
    // if it should be added to the toJSON() method that is called on module serialization.
    // if a new property is added that should be serialized is not added to the toJSON method
    // it will not be serialized and the functionality might fail.
    // After verification this constant should be increased by the number of new properties
    const expectedKeysSize = 18;

    chai.expect(Object.keys(m).length).to.be.equals(expectedKeysSize);


  });

});
