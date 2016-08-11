import { expect } from 'chai';

describe('Logger', function () {
  beforeEach(function () {
    // delete the require to make sure it is a clean log for every test
    delete require.cache[require.resolve('../src/logging/logger')];
  });
  it('should return a valid logger', function () {
    const logger = require('../src/logging/logger');

    return expect(logger).not.to.be.undefined;
  });


  it('should return level debug when in dev', function () {
    process.env.NODE_ENV = 'dev';
    require.cache = {};
    delete require.cache[require.resolve('../src/logging/logger')];
    const logger = require('../src/logging/logger');

    return expect(logger.default.level).to.be.equals('debug');
  });

  it('should return level info when in prod', function () {
    process.env.NODE_ENV = 'production';
    require.cache = {};
    delete require.cache[require.resolve('../src/logging/logger')];
    const logger = require('../src/logging/logger');

    return expect(logger.default.level).to.be.equals('debug');
  });
});
