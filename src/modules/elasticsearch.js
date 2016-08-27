import Module from '../module';
import logger from '../logging/logger';
import * as es from '../es/connection';
import * as symbols from '../utils/symbols';

const elasticsearch = (options) => {
  options.type = 'persistence';
  options.service = options.service || 'elasticsearch';
  const m = new Module(options);

  es.connect({ host: options.esHost })
    .then((esCli) => {
      m.esClient = esCli;
      logger.info(`[${symbols.check}] ElasticSearch connected`);
    })
    .then(() => {
      return m.esClient.indices.exists({ index: options.messagesIndex })
        .then(() => {
          logger.info(`[${symbols.check}] ElasticSearch already exists [${options.messagesIndex}]`);
        }).catch(() => {
          return m.esClient.indices.create({ index: options.messagesIndex })
            .then(() => {
              logger.info(`[${symbols.check}] ElasticSearch index created [${options.messagesIndex}]`);
            });
        });

    })
    .then(() => {

      // Setup the new module
      m.on('data', (message) => {
        m.esClient.index({
          index: options.messagesIndex,
          type: options.messagesType,
          body: message,
          id: message.uuid
        }, function (err, response) {
          if (err) {
            logger.warn('There was an error indexing the message in elasticsearch', err);
          } else {
            logger.info('Message stored in elasticsearch under id', response._id);
          }
          m.afterProcess(message);
        });
      });
    });
  return m;
};

export default elasticsearch;

