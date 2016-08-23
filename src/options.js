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
  ENABLE_ELASTICSEARCH: process.env.ENABLE_ELASTICSEARCH

};
