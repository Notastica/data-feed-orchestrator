import { createConnection } from 'amqp';
import logger from '../logging/logger';

/**
 * Connects to an amqp instance and return a promise that resolves to the connection
 * @param [options] {Object} the mq options more on https://github.com/postwait/node-amqp#connection-options-and-url
 * @return {Promise}
 */

export const connect = (options) => {
  return new Promise((resolve, reject) => {
    logger.info('Connecting to mq');
    const connection = createConnection(options);

    connection.on('ready', () => {
      logger.info('Connected to mq');
      resolve(connection);
    });

    connection.on('error', (err) => {
      logger.warn(`Error connecting to mq ${err}`);
      reject(err);
    });

  });
};

/**
 * Create, if doesn't exists, a new queue, connects to it and return the queue instance
 * @param {Object} connection Object the connection object
 * @param {Object} name the name of the queue
 * @param {Object} [options] see more: https://github.com/postwait/node-amqp#queue
 * @return {Promise}
 */
export const bindToQueue = (connection, name, options) => {
  return new Promise((resolve, reject) => {
    try {

      const cb = (q) => {
        logger.info('Connected to queue', name);
        resolve(q);
      };

      options = options || cb;
      connection.queue(name, options, cb);
    } catch (err) {
      logger.warn('Could not connect to queue', name, err);
      reject(err);
    }
  });
};
