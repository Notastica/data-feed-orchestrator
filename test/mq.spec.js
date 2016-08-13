import * as mq from '../src/mq/connection';
import dockerNames from 'docker-names';

/**
 * Test dependencies
 */

describe('MQ', function () {
  it('Should reject when connection fails', function (done) {
    mq.connect({ url: 'amqp://localhost:555' }).then(() => {
      done(new Error('Should not return valid connection'));
    }).catch(() => {
      done();
    });
  });

  it('Should resolve to a valid client', function () {
    return mq.connect();
  });

  it('Should return a valid queue', function () {
    return mq.connect().then((client) => {
      return mq.bindToQueue(client, dockerNames.getRandomName(false));
    });
  });
});
