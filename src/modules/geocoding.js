import google from '@google/maps';
import Module from '../module';
import _ from 'lodash';
import jsonpath from 'jsonpath';
import logger from '../logging/logger';
import * as symbols from '../utils/symbols';
import elasticsearch from 'elasticsearch';

const defaults = {
  sourceFields: 'address',
  positivePath: 'address',
  negativePath: 'location',
  addressConcatenateChar: ',',
  destinationField: 'location',
  serviceName: 'geocoding',
  prefetch: 1,
  queryEs: false,
  esHost: 'localhost:9200'
};

/**
 * Creates a geocoding module with the given options
 * @param {Object} options
 * @param {string} options.apiKey The Google api key that will be used
 * @param {string|array} [options.sourceFields] The fields where the source address are stored. Can be an array, a string with comma separated field names
 * @param {string} [options.addressConcatenateChar] the char that will be used to concatenate the fields before sending the request, defaults to '-'
 * @param {string} [options.destinationField] the field where the geolocationr esult will be stored, defaults to 'location'
 * @param {string} [options.serviceName] The service name of this module, defaults to 'geocoding'
 * @param {string} [options.moduleName] The module name that will be registered
 * @param {string} [options.registerQueue] The queue to register the module
 * @param {string} [options.amqpURL] the url of the amqp client, defaults to localhost
 * @param {int} [options.prefetch] the number of messages to prefetch before having to ack
 * @param {string} [options.positivePath] The positivePath of the module
 * @param {string} [options.negativePath] The negativePath of the module
 * @param {string} [options.disableListener] When you want to handle the messages in another layer, set this to true
 * @param {boolean} [options.queryEs] When true, elasticsearch will be queried to get information already there in order to avoid multiple calls to GAPI
 * @param {string} [options.esHost] The elasticsearch url to use, default to localhost:9200
 * @param {string} [options.sameVenueField] The field that determines if 2 messages belong to the same venue
 * @param {string} [options.sortEsQueryField] The field to be used when sorting the ES query
 * @param {string} [options.sortEsQueryOrder] The order to sort, should be 'asc' or 'desc'
 * @param {string} [options.esIndex] The elasticsearch index to look for matching objects
 * @see {../module}
 */

const geocoding = (options) => {

  options = options || {};
  options = _.defaults(options, defaults);

  const apiKey = options.apiKey;

  if (!apiKey) {
    logger.error(`[${symbols.x}] Google api key not provided`);
    throw new Error('An API Key was not specified');
  }

  const sourceFields = Array.isArray(options.sourceFields) ? options.sourceFields : options.sourceFields.split(',');

  const sourceFieldJsonpath = [];

  sourceFields.forEach((field) => {
    sourceFieldJsonpath.push(jsonpath.parse(field));
  });


  logger.info(`[${symbols.check}]Goole maps client`);

  const m = new Module({
    service: options.serviceName,
    name: options.moduleName,
    registerQueue: options.registerQueue,
    amqpURL: options.amqpURL,
    prefetch: options.prefetch,
    positivePath: options.positivePath,
    negativePath: options.negativePath
  });

  m.googleMapsClient = google.createClient({
    key: apiKey
  });

  const buildEsQuery = (message) => {
    const query = {
      index: options.esIndex,
      body: {
        size: 1,
        query: {
          match: {}
        },
        sort: [],
        filter: {
          exists: {
            field: options.destinationField
          }
        }
      }
    };

    // This will add a match query on the field, like
    // {
    //   "id": message.id
    // }
    const value = jsonpath.value(message, jsonpath.parse(options.sameVenueField));

    if (!value) {
      throw new Error(`Same venue field ${options.sameVenueField} is ${value} and cannot be queried`);
    }

    query.body.query.match[options.sameVenueField] = value;

    // This will generate something like:
    // {
    //    date: {
    //        order: 'desc'
    //    }
    // }
    const sort = {};

    sort[options.sortEsQueryField] = { order: options.sortEsQueryOrder };
    query.body.sort.push(sort);
    logger.debug(`Built query:\n${JSON.stringify(query, null, 4)}`);

    return query;

  };

  const populateFromElasticsearch = function (esClient, message) {
    // Query elasticsearch and return an object if found
    return new Promise((resolve) => {
      logger.debug('Trying to populate from elasticsearch');
      esClient.search(buildEsQuery(message))
        .then((resp) => {
          const hits = resp.hits.hits;

          logger.debug(`Elasticearch returned ${hits.length} hits`);
          if (hits && hits.length > 0) {
            // populate the destination field in the message
            logger.debug('Updating message with data from elasticsearch');
            message[options.destinationField] = hits[0]._source[options.destinationField];
          }
          // delivery the message, populated or not
          resolve(message);
        });
    });
  };

  // If the module should not handle the messages and only expose the GoogleApiClient
  if (!options.disableListener) {
    let esClient;

    // Setup the esclient if we need to query elasticsearch
    if (options.queryEs) {
      esClient = new elasticsearch.Client({
        host: options.esHost
      });
    }

    // Finally setup the data listener!
    m.on('data', (message) => {

      return Promise.resolve()
        .then(() => {
          if (options.queryEs) {
            return populateFromElasticsearch(esClient, message);
          }
          return message;
        }).catch((err) => {
          logger.info('There was an error querying elasticsearch', err);
          return message;
        }).then((updatedMessage) => {
          updatedMessage = updatedMessage || message; // in case for some reason we don't get an updated version
          if (updatedMessage[options.destinationField]) {
            logger.info('Already populated in elasticsearch, using latest value');
            return updatedMessage;
          }
          logger.info('Querying Google api to get geocoding');
          const addressValues = [];

          sourceFieldJsonpath.forEach((path) => {
            addressValues.push(jsonpath.value(updatedMessage, path));
          });

          const address = addressValues.join(options.addressConcatenateChar);

          return new Promise((resolve, reject) => {
            m.googleMapsClient.geocode({
              address: address,
              timeout: 5000 // 5 seconds google not answering? something is wrong
            }, function (err, response) {
              if (err) {
                logger.warn(`[${symbols.x}] Error returned from Google Geocode API`, err);
                reject(err);
                return;
              } else if (response.json.results && response.json.results.length > 0) {
                logger.info('Got response back from google api');
                updatedMessage[options.destinationField] = response.json.results[0];
              } else {
                updatedMessage[options.destinationField] = 'UNKNOWN';
                logger.info(`Google was Unable to find the address for the given message, setting as as ${updatedMessage[options.destinationField]}`);
              }
              resolve(updatedMessage);
            });
          });
        })
        .catch((err) => {
          logger.warn('There was an error getting the location, retuning the message untouched.');
          logger.debug('Error:', err);
          return message;
        })
        .then((finalMessage) => {
          m.afterProcess(finalMessage);
        });
    });
  }
  return m;

};

export default geocoding;
