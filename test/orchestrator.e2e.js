/**
 * Common test Dependencies
 */

import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Orchestrator from '../src/orchestrator';
import uuid from 'node-uuid';
import logger from '../src/logging/logger';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);

describe('Orchestrator Integration', function () {

  it('Should store message on ES', function () {


    const o = new Orchestrator({
      registerQueue: `register-${uuid.v4()}`,
      messagesQueue: `messages-${uuid.v4()}`,
      messagesIndex: `index-${uuid.v4()}`,
      messagesType: `type-${uuid.v4()}`
    });

    after(() => {
      o.shutdown();
    });

    return o.listen()
      .then(() => {
        const pub = o.amqpContext.socket('PUSH');
        const message = { uuid: uuid.v4() };

        pub.connect(o.messagesQueue, () => {
          pub.write(JSON.stringify(message));
        });

        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            o.esClient.count({
              index: o.messagesIndex,
              ignoreUnavailable: true
            }, (err, response) => {
              if (err) {
                logger.warn(`ElasticSearch is returning error ${err}`);
              } else if (response.count > 0) {
                clearInterval(checkInterval);
                resolve(response.count);
              }
            });
          }, 100);
        });
      });
  });
})
;
