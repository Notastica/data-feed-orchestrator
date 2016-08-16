import Orchestrator from './orchestrator';
import logger from './logging/logger';
import uuid from 'node-uuid';
import * as mq from './mq/connection';

const o = new Orchestrator({
  registerQueue: uuid.v4(),
  messagesQueue: uuid.v4(),
  messagesIndex: uuid.v4()
});

mq.connect(o.amqpURL).then((context) => {
  const pub = context.socket('PUSH');
  const messageSent = { uuid: uuid.v4() };

  pub.connect(o.messagesQueue);
  pub.write(JSON.stringify(messageSent));

})
  .then(() => {
    return qo.listen();
  })
  .then(() => {
    logger.info(`Orchestrator ${o.name} ready to receive new modules in the queue ${o.registerQueue}`);
  });

process.on('SIGINT', function () {
  logger.warn('Gracefully shutting down from SIGINT (Ctrl-C)');
  o.shutdown();
});
