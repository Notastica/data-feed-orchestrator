import * as winston from 'winston';
import isProd from 'isprod';

const level = process.env.NODE_ENV === 'test' || !isProd ? 'debug' : 'info';

export const logger = new winston.Logger({
  level: level,
  transports: [
    new (winston.transports.Console)({
      colorize: true, timestamp: true
    })
  ]
});

logger.debug('Default logger initialized with level', level);

export default logger;
