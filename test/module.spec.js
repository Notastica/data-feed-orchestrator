import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Module from '../src/model/module';
import dockerNames from 'docker-names';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);

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
