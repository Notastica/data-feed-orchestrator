/**
 * Common test Dependencies
 */

import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Orchestrator from '../src/orchestrator';
import uuid from 'node-uuid';
import Module from '../src/module';
import dockerNames from 'docker-names';
import * as temp from 'temp';


// TEST SETUP
// =============================================================================
chai.use(dirtyChai);

let o;

describe('Orchestrator', function () {

  before(function () {

    o = new Orchestrator({
      registerQueue: `register-${uuid.v4()}`,
      messagesQueue: `messages-${uuid.v4()}`,
      messagesIndex: `index-${uuid.v4()}`,
      dbPath: temp.path()
    });
  });

  after(function () {
    return o.shutdown();
  });

  const serviceName = dockerNames.getRandomName(false);

  it('Should init with default options', function () {
    return new Orchestrator();
  });

  it('Should reregister a module if already registered', function () {
    // const o = new Orchestrator();

    return o.listen().then(() => {
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
    // const o = new Orchestrator();

    return o.listen().then(() => {
      const name = 'test-processor';


      return o.register(new Module({ service: serviceName, name: name })).then((module) => {
        chai.expect(module).not.to.be.undefined();
        chai.expect(module.uuid).not.to.be.undefined();
        chai.expect(module.name).to.be.equals(name);
      });
    });
  });

  it('Should unregister a module', function () {
    // const o = new Orchestrator();

    return o.listen().then(() => {
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
    // const o = new Orchestrator();

    return o.listen().then(() => {
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
    // const o = new Orchestrator();

    return o.listen().then(() => {
      const originalModule = new Module({ service: serviceName, registerQueue: o.registerQueue });

      originalModule.negativePath = '$.key';

      return o.register(originalModule).then(() => {
        return o.findMatchingModules({ key: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules).to.be.not.to.contains.key('uuid').that.is.equals(originalModule.uuid);
      });
    });
  });

  it('Should find a module by positivePath', function () {
    // const o = new Orchestrator();

    return o.listen().then(() => {
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

  it('Should find a module by positivePath AND negativePath', function () {
    // const o = new Orchestrator();

    return o.listen().then(() => {
      const originalModule = new Module({ service: serviceName });

      originalModule.positivePath = '$.positiveKeyName';
      originalModule.negativePath = '$.negativeKeyName';

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
    // const o = new Orchestrator();

    return o.listen().then(() => {
      const originalModule = new Module({ service: serviceName });

      originalModule.positivePath = '$.BadPositiveKeyName';

      return o.register(originalModule).then(() => {
        return o.findMatchingModules({ positiveKeyName: 'value' });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules).not.to.have.property('uuid').that.is.equals(originalModule.uuid);
      });
    });
  });

  it('Should listen with default options', function () {
    // const o = new Orchestrator();

    return o.listen();
  });

  it('Should reject when bad modules are passed', function () {
    // const o = new Orchestrator();

    return o.listen()
      .then(() => {
        const m = { invalid_module: 'invalid' };

        return o.onNewModule(m)
          .catch((err) => {
            chai.expect(err).to.be.not.null();
          });
      });
  });

  it('Should increase the order', function () {
    return o.listen()
      .then(() => {
        const m1 = new Module({ service: dockerNames.getRandomName(false), registerQueue: o.registerQueue });
        const m2 = new Module({ service: dockerNames.getRandomName(false), registerQueue: o.registerQueue });

        return m1.register().then(() => {
          return m2.register();
        }).then(() => {
          return chai.expect(m1.order).to.be.below(m2.order);

        });
      });
  });

  it('Should shutdown gracefully', function () {
    // const o = new Orchestrator();

    return o.listen()
      .then(() => {
        return o.shutdown();
      });
  });

  it('Should handle module registration on it\'s queue', function () {
    // const o = new Orchestrator();

    return o.listen()
      .then(() => {
        const m = new Module({ service: dockerNames.getRandomName(false), registerQueue: o.registerQueue });

        return m.register().then((module) => {
          chai.expect(module.uuid).to.be.equals(m.uuid);
          chai.expect(o.isRegistered(module)).to.be.true();
        });
      });
  });
  it('Should restore the database between executions', function () {

    const modUUID = uuid.v4();

    return o.shutdown()
      .then(() => {
        o = new Orchestrator({ dbPath: temp.path() }); // create new Orchestrator
        return o.listen(); // start it (initialize everything, including db)
      })
      .then(() => {
        // add a module
        o.modulesCollection.insert(new Module(modUUID));
        o.modulesCollection.insert(new Module(modUUID));
        o.modulesCollection.insert(new Module(modUUID));
      })
      .then(() => {
        // shutdown and close db (should persist)
        return o.shutdown();
      })
      .then(() => {
        // start a new orchestrator pointing to the same db
        o = new Orchestrator({ dbPath: o.dbPath });
        return o.listen();
      }).then(() => {
        const modules = o.modulesCollection.find({ service: modUUID });

        chai.expect(modules).not.to.be.empty();
        chai.expect(modules).to.have.lengthOf(3);
        chai.expect(modules[0].service).to.be.equals(modUUID);
        chai.expect(modules[1].service).to.be.equals(modUUID);
        chai.expect(modules[2].service).to.be.equals(modUUID);
      });
  });

})
;
