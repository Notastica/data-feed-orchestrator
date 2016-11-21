/**
 * Common test Dependencies
 */
import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Orchestrator from '../src/orchestrator';
import uuid from 'uuid';
import Module from '../src/module';
import dockerNames from 'docker-names';
import * as temp from 'temp';
import mock from './mock-persistence-module';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);

let o;

describe('Orchestrator', function () {

  const registerMock = function () {
    return mock({
      registerQueue: o.registerQueue
    }).register();
  };

  beforeEach(function () {

    o = new Orchestrator({
      registerQueue: `register-${uuid.v4()}`,
      messagesQueue: `messages-${uuid.v4()}`,
      messagesIndex: `index-${uuid.v4()}`,
      dbPath: temp.path()
    });

  });

  const serviceName = dockerNames.getRandomName(false);

  it('Should init with default options', function () {
    return new Orchestrator();
  });

  it('Should reregister a module if already registered', function () {
    // const o = new Orchestrator();
    registerMock();
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
    registerMock();
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
    registerMock();
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
    registerMock();
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
    registerMock();
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
    registerMock();
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
    registerMock();
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
    registerMock();
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


  it('Should resend to the same service when module.resend is omitted', function () {
    // const o = new Orchestrator();
    registerMock();
    return o.listen().then(() => {
      const originalModule = new Module({ service: serviceName });

      originalModule.negativePath = '$.negativeKeyName';

      return o.register(originalModule).then(() => {
        return o.findMatchingModules({ key: 'value' }, { service: serviceName });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules).not.to.be.empty();
        chai.expect(modules[0]).to.have.property('uuid').that.is.equals(originalModule.uuid);
      });
    });
  });


  it('Should not resend to the same service when module.resend is false', function () {
    // const o = new Orchestrator();
    registerMock();
    return o.listen().then(() => {
      const originalModule = new Module({ service: serviceName, resend: false });

      originalModule.negativePath = '$.negativeKeyName';

      return o.register(originalModule).then(() => {
        return o.findMatchingModules({ key: 'value' }, { service: serviceName });
      }).then((modules) => {
        chai.expect(modules).to.be.a('array');
        chai.expect(modules).to.be.empty();
      });
    });
  });

  it('Should listen with default options', function () {
    // const o = new Orchestrator();
    registerMock();
    return o.listen();
  });

  it('Should reject when bad modules are passed', function () {
    // const o = new Orchestrator();
    registerMock();
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
    registerMock();
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
    registerMock();
    return o.listen()
      .then(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            o.shutdown().then(resolve);
          }, 200);
        });
      });
  });

  it('Should handle module registration on it\'s queue', function () {
    // const o = new Orchestrator();
    registerMock();
    return o.listen()
      .then(() => {
        const m = new Module({ service: dockerNames.getRandomName(false), registerQueue: o.registerQueue });

        return m.register().then((module) => {
          chai.expect(module.uuid).to.be.equals(m.uuid);
          chai.expect(o.isRegistered(module)).to.be.true();
        });
      });
  });


  it('Should fail when no persistence module is registered', function (done) {
    // const o = new Orchestrator();

    o = new Orchestrator({ dbPath: temp.path(), registerQueue: dockerNames.getRandomName(false) }); // create new Orchestrator

    o.listen(); // listen async


    setTimeout(() => {
      // noinspection JSAccessibilityCheck
      o._storeMessage({}).then((message) => {
        chai.expect(message).to.be.null();
      }).catch((err) => {
        chai.expect(err).to.be.not.null();
        chai.expect(err.message).to.contain('No persistence module registered');
      }).then(done, done);
    }, 200);

  });

  it('Should not start while no persistence module is registered', function (done) {
    // const o = new Orchestrator();

    o = new Orchestrator({ dbPath: temp.path(), registerQueue: dockerNames.getRandomName(false) }); // create new Orchestrator

    o.listen().then(() => {
      done(new Error('Should not resolve when no persistence module is registered'));
    });


    setTimeout(() => {
      chai.expect(o._running).to.be.false();
      done();
    }, 200);

  });

  it('Should restore the database between executions', function () {
    const waitDBInitialized = function (orc) {
      return new Promise((resolve) => {
        const wait = setInterval(() => {
          if (orc._dbInitialized) {
            clearInterval(wait);
            resolve(orc);
          }
        }, 50);
      });
    };
    const modUUID = uuid.v4();


    o = new Orchestrator({ dbPath: temp.path(), registerQueue: o.registerQueue }); // create new Orchestrator

    return waitDBInitialized(o)
      .then(() => {
        // add modules
        o.modulesCollection.insert(new Module(modUUID));
        o.modulesCollection.insert(new Module(modUUID));
        o.modulesCollection.insert(new Module(modUUID));
      })
      .then(() => {
        return o.shutdown();
      })
      .then(() => {
        // start a new orchestrator pointing to the same db
        o = new Orchestrator({ dbPath: o.dbPath });

        return waitDBInitialized(o);
      }).then(() => {
        const modules = o.modulesCollection.find({ service: modUUID });

        chai.expect(modules).not.to.be.empty();
        chai.expect(modules).to.have.lengthOf(3);
        chai.expect(modules[0].service).to.be.equals(modUUID);
        chai.expect(modules[1].service).to.be.equals(modUUID);
        chai.expect(modules[2].service).to.be.equals(modUUID);
      });
  });

  it('Should resolve when listen is called multiple times', function () {
    registerMock();
    return o.listen()
      .then(() => {
        return o.listen();
      });
  });

  it('Should always only have 1 persistence module', function () {
    registerMock();
    return o.listen()
      .then(() => {
        chai.expect(o.modulesCollection.find({ type: 'persistence' }))
          .to.have.lengthOf(1);
        return registerMock()
          .then((newModule) => {
            const registeredModules = o.modulesCollection.find({ type: 'persistence' });

            chai.expect(registeredModules).to.have.lengthOf(1);
            chai.expect(registeredModules[0].name).to.be.equal(newModule.name);
          });
      });
  });

  it('Should return the same messagesQueue for the same services', function () {

    const service = dockerNames.getRandomName();
    let workerQueueName;

    registerMock();
    return o.listen()
      .then(() => {
        return o.register(new Module(service));
      })
      .then((m) => {
        chai.expect(m).not.to.be.undefined();
        workerQueueName = m.workerQueueName;
      })
      .then(() => {
        return o.register(new Module(service));
      })
      .then((m) => {
        chai.expect(m.workerQueueName).to.be.equal(workerQueueName);
      });

  });

})
;
