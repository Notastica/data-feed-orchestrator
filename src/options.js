/**
 * default options from env variables
 */
export default {

  /**
   * the path where the orchestrator database will be stored, it's a .json file
   */

  dbPath: process.env.DB_PATH,

  /**
   * the name of the Orchestrator
   */

  name: process.env.NAME,

  /**
   *the name of the modules collections in the orchestrator's database
   */

  modulesCollectionName: process.env.MODULES_COLLECTION_NAME || 'modules',

  /**
   * the name of the registration queue where the orchestrator will be listening and new modules should register themselves
   */

  registerQueue: process.env.REQISTER_QUEUE || 'o_register',

  /**
   * The name of the messages queue where the Orchestrator will be listening for new messages
   */
  messagesQueue: process.env.MESSAGES_QUEUE || 'o_messages',

  /**
   * The AMQP url, can be any valid amqp uri: https://www.rabbitmq.com/uri-spec.html
   */
  amqpURL: process.env.AMQP_URL || 'amqp://localhost:5672',

  /**
   * The index where elasticsearch should store messages, if enabled.
   */
  messagesIndex: process.env.MESSAGES_INDEX || 'messages',

  /**
   * The type under elasticsearch should store messages, if enabled
   */
  messagesType: process.env.MESSAGES_TYPE || 'mType',

  /**
   * The elasticsearch host, if enabled.
   */
  esHost: process.env.ES_HOST || 'localhost:9200',

  /**
   * Whether to enable or not elasticsearch
   */
  ENABLE_ELASTICSEARCH: process.env.ENABLE_ELASTICSEARCH,

  /**
   * Google api key for the Gomodule
   */
  googleApiKey: process.env.GEO_GAPI_KEY,

  /**
   * Whether the geoModule should query elasticsearch for the same venues before asking Google Maps
   */
  geoQueryEs: process.env.GEO_QUERY_ES || false,

  /**
   * What is the venue field that should be used to query ES when looking for matching venues
   */
  geoSameVenueField: process.env.GEO_SAME_VENUE_FIELD,

  /**
   * Which field to sort when querying elasticsearch for matching venues
   */
  geoSortEsQueryField: process.env.GEO_SORT_FIELD,

  /**
   * Sort order when querying elasticsearch
   */
  geoSortQueryOrder: process.env.GEO_SORT_ORDER || 'desc',

  /**
   * Geo module negative JSON path
   */
  geoNegativePath: process.env.GEO_NEGATIVE_PATH,

  /**
   * Geo module positive JSON path
   */
  geoPositivePath: process.env.GEO_POSITIVE_PATH,

  /**
   * A comma separated list of fields (jsonpath) that should be used to create the full address
   */
  geoSourceFields: process.env.GEO_SOURCE_FIELDS,

  /**
   * The destination field where the geocoded address should be stored
   */
  geoDestinationField: process.env.GEO_DESTINATION_FIELD,

  /**
   * How many messages should the geocoding module prefetch
   */
  geoPrefetch: process.env.GEO_PREFETCH ? parseInt(process.env.GEO_PREFETCH, 10) : process.env.GEO_PREFETCH
};
