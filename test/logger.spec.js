/**
 * Common test Dependencies
 */

import * as chai from 'chai';
import dirtyChai from 'dirty-chai';

chai.use(dirtyChai);

describe('Logger', function () {
  beforeEach(function () {
    // delete the require to make sure it is a clean log for every test
    delete require.cache[require.resolve('../src/logging/logger')];
  });
  it('should return a valid logger', function () {
    const logger = require('../src/logging/logger');

    return chai.expect(logger).not.to.be.undefined;
  });


  it('should return level debug when in dev', function () {
    const oldEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'dev';
    require.cache = {};

    delete require.cache[require.resolve('../src/logging/logger')];

    const logger = require('../src/logging/logger');

    process.env.NODE_ENV = oldEnv;
    chai.expect(logger.default.level).to.be.equals('debug');
  });
});
