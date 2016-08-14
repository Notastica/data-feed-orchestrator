import rabbitjs from 'rabbit.js';
import logger from '../logging/logger';
import Promise from 'bluebird';

/**
 * Connects to an amqp instance and return a promise that resolves to the connection
 * @param {string} url the ampq connection url
 * @param {Object} [options] the mq options more on http://www.squaremobius.net/rabbit.js/
 * @return {Promise}
 */
export const connect = (url, options) => {
  return new Promise((resolve, reject) => {
    logger.info('Connecting to mq');
    const context = rabbitjs.createContext(url, options);

    context.on('ready', () => {
      logger.info('Connected to mq');
      resolve(context);
    });

    context.on('error', (err) => {
      logger.warn(`Error connecting to mq ${err}`);
      reject(err);
    });

  });
};

// /**
//  * Create, if doesn't exists, a new queue, connects to it and return the queue instance
//  * @param {Object} connection Object the connection object
//  * @param {Object} name the name of the queue
//  * @param {Object} [options] see more: https://github.com/postwait/node-amqp#queue
//  * @return {Promise}
//  */
// export const bindToQueue = (connection, name, options) => {
//   return new Promise((resolve, reject) => {
//     try {
//
//       const cb = (q) => {
//         logger.info('Connected to queue', name);
//         resolve(q);
//       };
//
//       options = options || cb;
//       connection.queue(name, options, cb);
//     } catch (err) {
//       logger.warn('Could not connect to queue', name, err);
//       reject(err);
//     }
//   });
// };
