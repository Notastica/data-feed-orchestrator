import * as mq from '../src/mq/connection';

/**
 * Test dependencies
 */

describe('MQ', function () {
  it('Should reject when connection fails', function (done) {
    mq.connect('amqp://localhost:555').then(() => {
      done(new Error('Should not return valid connection'));
    }).catch(() => {
      done();
    });
  });

  it('Should resolve to a valid client', function () {
    return mq.connect();
  });

});
