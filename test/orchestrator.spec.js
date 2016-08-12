/**
 * Common test Dependencies
 */

import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import * as Orchestrator from '../src/orchestrator';
import uuid from 'node-uuid';
import Module from '../src/model/module';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);


describe('Orchestrator', function () {

  it('Should reject when not initialized', function () {
    return new Promise((resolve, reject) => {
      Orchestrator.register({ name: 'test' }).then(reject, resolve); // orders flipped as it should be rejected
    });
  });

  it('Should init with default options', function () {
    return Orchestrator.init();
  });

  it('Should reregister a module if already registered', function () {
    return Orchestrator.init().then(() => {
      const name = 'test-processor';
      const negativePath = '$';
      const updatedKeyValue = '$..name';
      const moduleUUID = uuid.v4();

      return Orchestrator.register(new Module({
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
        return Orchestrator.register(module).then((updatedModule) => {
          chai.expect(updatedModule.uuid).to.be.equals(moduleUUID);
          chai.expect(updatedModule.negativePath).to.be.equals(updatedKeyValue);
        });
      });
    });
  });

  it('Should register a module', function () {
    return Orchestrator.init().then(() => {
      const name = 'test-processor';

      return Orchestrator.register({ name: name }).then((module) => {
        chai.expect(module).not.to.be.undefined();
        chai.expect(module.uuid).not.to.be.undefined();
        chai.expect(module.name).to.be.equals(name);
      });
    });
  });

  it('Should unregister a module', function () {
    return Orchestrator.init().then(() => {
      const name = 'test-processor';

      return Orchestrator.register({ name: name }).then((module) => {
        chai.expect(module).not.to.be.undefined();
        chai.expect(module.uuid).not.to.be.undefined();
        chai.expect(module.name).to.be.equals(name);
        return module;
      }).then((module) => {
        return Orchestrator.unregister(module).then(() => {
          chai.expect(Orchestrator.isRegistered(module)).to.be.false();
        });
      });
    });
  });

  it('Should find a module by negativePath', function () {
    return Orchestrator.init().then(() => {
      const originalModule = new Module();

      originalModule.negativePath = '$.negativeKeyName';

      return Orchestrator.register(originalModule).then(() => {
        return Orchestrator.findMatchingModules({ key: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules[0])
          .to.have.property('uuid')
          .that.is.equals(originalModule.uuid);
      });
    });
  });

  it('Should NOT find a module by negativePath', function () {
    return Orchestrator.init().then(() => {
      const originalModule = new Module();

      originalModule.negativePath = '$.key';

      return Orchestrator.register(originalModule).then(() => {
        return Orchestrator.findMatchingModules({ key: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules).to.be.empty();
      });
    });
  });

  it('Should find a module by positivePath', function () {
    return Orchestrator.init().then(() => {
      const originalModule = new Module();

      originalModule.positivePath = '$.positiveKeyName';

      return Orchestrator.register(originalModule).then(() => {
        return Orchestrator.findMatchingModules({ positiveKeyName: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules[0])
          .to.have.property('uuid')
          .that.is.equals(originalModule.uuid);
      });
    });
  });

  it('Should NOT find a module by positivePath', function () {
    return Orchestrator.init().then(() => {
      const originalModule = new Module();

      originalModule.positivePath = '$.BadPositiveKeyName';

      return Orchestrator.register(originalModule).then(() => {
        return Orchestrator.findMatchingModules({ positiveKeyName: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules).to.be.empty();
      });
    });
  });
});
