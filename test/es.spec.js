/**
 * Common test Dependencies
 */
// import {assert, should, expect} from "chai";
import es from '../src/es/connection';

/**
 * Test dependencies
 */

describe('Elasticsearch', function () {
  it('Should reject when connection fails', function (done) {
    es({
      host: 'http://localhost:555',
      pingTimeout: 500,
      maxRetries: 1,
      log: null
    }).then(() => {
      done(new Error('Should not return valid connection'));
    }).catch(() => {
      done();
    });
  });

  it('Should resolve to a valid client', function () {
    return es({
      pingTimeout: 500,
      maxRetries: 1,
      log: null
    }).then((client) => {
      return client.ping();
    });
  });
});
