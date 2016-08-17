/**
 * Common test Dependencies
 */

import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Orchestrator from '../src/orchestrator';
import Module from '../src/module';
import uuid from 'node-uuid';
import logger from '../src/logging/logger';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);

describe('Module integration', function () {

  const o = new Orchestrator({
    registerQueue: `register-${uuid.v4()}`,
    messagesQueue: `messages-${uuid.v4()}`,
    messagesIndex: `index-${uuid.v4()}`,
    messagesType: `type-${uuid.v4()}`
  });

  after(() => {
    o.shutdown();
  });

  it('Should send back messages processed to the Orchestrator', function () {


    const m1 = new Module({
      service: 'm1',
      name: 'm1',
      registerQueue: o.registerQueue,
      positivePath: '$.uuid',
      negativePath: '$.m1Key'
    });

    const m2 = new Module({
      service: 'm2',
      name: 'm2',
      registerQueue: o.registerQueue,
      positivePath: '$.m1Key',
      negativePath: '$.m2Key'
    });

    return o.listen()
      .then(() => {
        return m1.register();
      })
      .then(() => {
        return m2.register();
      })
      .then(() => {
        return new Promise((resolve) => {
          const expectedMessage = {
            uuid: uuid.v4()
          };

          let passedM1 = false;

          // Setup listener to proccess received message
          m1.on('data', (message) => {
            chai.expect(passedM1).to.be.false('Already passed m1');
            logger.info(`[${m1.name}] Received message: ${message.toString()}`);
            message.m1Key = uuid.v4();
            chai.expect(message.uuid).to.be.equals(expectedMessage.uuid, 'not same message');
            passedM1 = true;
            m1.afterProcess(message);
          });

          m2.on('data', (message) => {
            logger.info(`[${m2.name}] Received message: ${message.toString()}`);
            message.m2key = uuid.v4();
            chai.expect(message.uuid).to.be.equals(expectedMessage.uuid, 'not same message');
            chai.expect(message.m1Key).to.be.ok('m1Key is not set');
            chai.expect(passedM1).to.be.true('passed m2 before passing m1');
            m2.afterProcess(message);
            resolve();
          });

          // Sent message to tue message queue
          const push = o.amqpContext.socket('PUSH');

          logger.debug('Sending validation message to ', o.messagesQueue);
          push.connect(o.messagesQueue, () => {
            push.write(JSON.stringify(expectedMessage));
          });
        });
      });


  });
});
