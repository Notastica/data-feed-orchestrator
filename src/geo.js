import geocoding from './modules/geocoding';
import options from './options';
import _ from 'lodash';
import logger from './logging/logger';
import * as symbols from './utils/symbols';

const geoOptions = _.defaults({
  apiKey: options.googleApiKey,
  sourceFields: options.geoSourceFields,
  destinationField: options.geoDestinationField,
  prefetch: options.geoPrefetch,
  queryEs: options.geoQueryEs,
  sameVenueField: options.geoSameVenueField,
  sortEsQueryField: options.geoSortEsQueryField,
  sortEsQueryOrder: options.geoSortQueryOrder,
  esIndex: options.messagesIndex,
  negativePath: options.geoNegativePath,
  positivePath: options.geoPositivePath
}, options);

logger.debug(`Initializing geomodule with options ${geoOptions}`);
const geo = geocoding(geoOptions);


geo.register().then(() => {
  logger.info(`[${symbols.check}] Module ${geo.service} registered and waiting for new messages`);
});
