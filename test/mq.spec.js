import mq from '../src/mq/connection';

/**
 * Test dependencies
 */

describe('MQ', function () {
  it('Should reject when connection fails', function (done) {
    mq().then(() => {
      done(new Error('Should not return valid connection'));
    }).catch(() => {
      done();
    });
  });
});
