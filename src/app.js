import Orchestrator from './orchestrator';
import logger from './logging/logger';
import * as mq from './mq/connection';
import options from './options';
import elasticsearch from './modules/elasticsearch';

const o = new Orchestrator(options);

if (options.ENABLE_ELASTICSEARCH) {
  const m = elasticsearch(options);

  m.register().then(() => {
    logger.info(`Module ${m.service} started and waiting for new messages on queue ${m.workerQueueName}`);
  });
}

mq.connect(o.amqpURL)
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
