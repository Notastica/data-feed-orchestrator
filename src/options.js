/**
 * default options from env variables
 */
// TODO document all them here
export default {
  dbPath: process.env.DB_PATH,
  name: process.env.NAME,
  modulesCollectionName: process.env.MODULES_COLLECTION_NAME || 'modules',
  registerQueue: process.env.REQISTER_QUEUE || 'o_register',
  messagesQueue: process.env.MESSAGES_QUEUE || 'o_messages',
  amqpURL: process.env.AMQP_URL || 'amqp://localhost:5672',
  messagesIndex: process.env.MESSAGES_INDEX || 'messages',
  messagesType: process.env.MESSAGES_TYPE || 'mType',
  esHost: process.env.ES_HOST || 'localhost:9200',
  ENABLE_ELASTICSEARCH: process.env.ENABLE_ELASTICSEARCH,
  googleApiKey: process.env.GEO_GAPI_KEY,
  geoQueryEs: process.env.GEO_QUERY_ES || false,
  geoSameVenueField: process.env.GEO_SAME_VENUE_FIELD,
  geoSortEsQueryField: process.env.GEO_SORT_FIELD,
  geoSortQueryOrder: process.env.GEO_SORT_ORDER || 'desc',
  geoNegativePath: process.env.GEO_NEGATIVE_PATH,
  geoPositivePath: process.env.GEO_POSITIVE_PATH,
  geoSourceFields: process.env.GEO_SOURCE_FIELDS,
  geoDestinationField: process.env.GEO_DESTINATION_FIELD,
  geoPrefetch: process.env.GEO_PREFETCH ? parseInt(process.env.GEO_PREFETCH, 10) : process.env.GEO_PREFETCH
};
