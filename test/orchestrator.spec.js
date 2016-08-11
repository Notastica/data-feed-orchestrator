/**
 * Common test Dependencies
 */

import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import * as Orchestrator from '../src/orchestrator';


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
});
