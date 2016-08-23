/**
 * Common test Dependencies
 */

import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Orchestrator from '../src/orchestrator';
import uuid from 'node-uuid';
import logger from '../src/logging/logger';
import elasticsearch from '../src/modules/elasticsearch';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);

describe('Orchestrator Integration', function () {

  it('Should store message on ES', function () {

    // eslint-disable-next-line no-invalid-this
    this.timeout(10000); //

    const defaultOptions = {
      registerQueue: `register-${uuid.v4()}`,
      messagesQueue: `messages-${uuid.v4()}`
    };

    const o = new Orchestrator(defaultOptions);

    after(() => {
      o.shutdown();
    });

    const esOptions = {
      messagesIndex: `index-${uuid.v4()}`,
      messagesType: `type-${uuid.v4()}`
    };

    esOptions.registerQueue = defaultOptions.registerQueue;

    const m = elasticsearch(esOptions);

    o.listen(); // should be asynchronous
    return m.register()
      .then(() => {
        logger.info(`Module started and waiting for new messages on queue ${m.workerQueueName}`);
      })
      .then(() => {

        const pub = o.amqpContext.socket('PUSH');
        const message = { uuid: uuid.v4() };

        pub.connect(o.messagesQueue, () => {
          pub.write(JSON.stringify(message));
        });

        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            m.esClient.count({
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
