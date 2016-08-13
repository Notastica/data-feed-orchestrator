/**
 * Common test Dependencies
 */

import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Orchestrator from '../src/orchestrator';
import uuid from 'node-uuid';
import Module from '../src/model/module';
import dockerNames from 'docker-names';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);


describe('Orchestrator', function () {
  const serviceName = dockerNames.getRandomName(false);


  it('Should reject when not initialized', function () {
    return new Promise((resolve, reject) => {
      const or = new Orchestrator();

      or.register(new Module({ name: 'test', service: serviceName })).then(reject, resolve); // orders flipped as it should be rejected
    });
  });

  it('Should init with default options', function () {
    return new Orchestrator().init();
  });

  it('Should reregister a module if already registered', function () {
    const o = new Orchestrator();

    return o.init().then(() => {
      const name = 'test-processor';
      const negativePath = '$';
      const updatedKeyValue = '$..name';
      const moduleUUID = uuid.v4();

      return o.register(new Module({
        service: serviceName,
        name: name,
        uuid: moduleUUID,
        negativePath: negativePath
      })).then((module) => {
        chai.expect(module).not.to.be.undefined();
        chai.expect(module.uuid).not.to.be.undefined();
        chai.expect(module.name).to.be.equals(name);
        return module;
      }).then((module) => {
        module.negativePath = updatedKeyValue;
        return o.register(module).then((updatedModule) => {
          chai.expect(updatedModule.uuid).to.be.equals(moduleUUID);
          chai.expect(updatedModule.negativePath).to.be.equals(updatedKeyValue);
        });
      });
    });
  });

  it('Should register a module', function () {
    const o = new Orchestrator();

    return o.init().then(() => {
      const name = 'test-processor';


      return o.register(new Module({ service: serviceName, name: name })).then((module) => {
        chai.expect(module).not.to.be.undefined();
        chai.expect(module.uuid).not.to.be.undefined();
        chai.expect(module.name).to.be.equals(name);
      });
    });
  });

  it('Should unregister a module', function () {
    const o = new Orchestrator();

    return o.init().then(() => {
      const name = 'test-processor';

      return o.register(new Module({ service: serviceName, name: name })).then((module) => {
        chai.expect(module).not.to.be.undefined();
        chai.expect(module.uuid).not.to.be.undefined();
        chai.expect(module.name).to.be.equals(name);
        return module;
      }).then((module) => {
        return o.unregister(module).then(() => {
          chai.expect(o.isRegistered(module)).to.be.false();
        });
      });
    });
  });

  it('Should find a module by negativePath', function () {
    const o = new Orchestrator();

    return o.init().then(() => {
      const originalModule = new Module({ service: serviceName });

      originalModule.negativePath = '$.negativeKeyName';

      return o.register(originalModule).then(() => {
        return o.findMatchingModules({ key: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules[0])
          .to.have.property('uuid')
          .that.is.equals(originalModule.uuid);
      });
    });
  });

  it('Should NOT find a module by negativePath', function () {
    const o = new Orchestrator();

    return o.init().then(() => {
      const originalModule = new Module({ service: serviceName });

      originalModule.negativePath = '$.key';

      return o.register(originalModule).then(() => {
        return o.findMatchingModules({ key: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules).to.be.empty();
      });
    });
  });

  it('Should find a module by positivePath', function () {
    const o = new Orchestrator();

    return o.init().then(() => {
      const originalModule = new Module({ service: serviceName });

      originalModule.positivePath = '$.positiveKeyName';

      return o.register(originalModule).then(() => {
        return o.findMatchingModules({ positiveKeyName: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules[0])
          .to.have.property('uuid')
          .that.is.equals(originalModule.uuid);
      });
    });
  });

  it('Should NOT find a module by positivePath', function () {
    const o = new Orchestrator();

    return o.init().then(() => {
      const originalModule = new Module({ service: serviceName });

      originalModule.positivePath = '$.BadPositiveKeyName';

      return o.register(originalModule).then(() => {
        return o.findMatchingModules({ positiveKeyName: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules).to.be.empty();
      });
    });
  });
});
