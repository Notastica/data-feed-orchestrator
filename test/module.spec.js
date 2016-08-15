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

});
