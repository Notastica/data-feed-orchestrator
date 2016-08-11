import elasticsearch from 'elasticsearch';
import isProd from 'isprod';

/**
 * Creates an elastic connection
 * @param options more on https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html#config-options
 * @return Promise that resolves to the client
 */

const defaultOptions = { log: isProd ? 'info' : 'debug' };


export default (options) => {
  return new Promise((resolve, reject) => {
    options = options || defaultOptions;
    const client = new elasticsearch.Client(options);

    client.ping().then(() => {
      resolve(client);
    }, (err) => {
      reject(err);
    });
  });
};
