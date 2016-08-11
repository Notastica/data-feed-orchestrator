import * as winston from 'winston';
import isProd from 'isprod';

/**
 *
 */
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)()
  ]
});

logger.configure({ level: isProd ? 'info' : 'debug' });

export default logger;
