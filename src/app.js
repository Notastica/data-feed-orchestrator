import Orchestrator from './orchestrator';
import logger from './logging/logger';
import uuid from 'node-uuid';
import * as mq from './mq/connection';

const options = {
  dbPath: process.env.DB_PATH,
  name: process.env.NAME,
  modulesCollectionName: process.env.MODULES_COLLECTION_NAME,
  registerQueue: process.env.REQISTER_QUEUE,
  messagesQueue: process.env.MESSAGES_QUEUE,
  amqpURL: process.env.AMQP_URL,
  messagesIndex: process.env.MESSAGES_INDEX,
  messagesType: process.env.MESSAGES_TYPE,
  esHost: process.env.ES_HOST
};

const o = new Orchestrator(options);

mq.connect(o.amqpURL).then((context) => {
  const pub = context.socket('PUSH');
  const messageSent = { uuid: uuid.v4() };

  pub.connect(o.messagesQueue);
  pub.write(JSON.stringify(messageSent));

})
  .then(() => {
    return o.listen();
  })
  .then(() => {
    logger.info(`Orchestrator ${o.name} ready to receive new modules in the queue ${o.registerQueue}`);
  });

process.on('SIGINT', function () {
  logger.warn('Gracefully shutting down from SIGINT (Ctrl-C)');
  o.shutdown().then(() => {
    logger.warn('Shutdown complete');
    process.exit();
  });
});
