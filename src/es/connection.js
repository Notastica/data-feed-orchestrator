import elasticsearch from 'elasticsearch';
import isProd from 'isprod';
import Promise from 'bluebird';

const defaultOptions = { log: isProd ? 'warn' : 'info' };

/**
 * Creates an elastic connection
 * @param options more on https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html#config-options
 * @return Promise that resolves to the client
 */

export const connect = (options) => {
  return new Promise((resolve, reject) => {
    options = options || Object.assign({}, defaultOptions);
    const client = new elasticsearch.Client(options);

    client.ping().then(() => {
      resolve(client);
    }, (err) => {
      reject(err);
    });
  });
};
