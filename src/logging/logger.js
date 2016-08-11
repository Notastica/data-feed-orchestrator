import * as winston from 'winston';
import isProd from 'isprod';
import * as expressWinston from 'express-winston';


const level = process.env.NODE_ENV === 'test' || !isProd ? 'debug' : 'info';

export const logger = new winston.Logger({
  level: level,
  transports: [
    new (winston.transports.Console)({
      colorize: true, timestamp: true
    })
  ]
});

logger.debug('Logger initialized with level', level);

export const expressLogger = expressWinston.logger({
  transports: [
    new winston.transports.Console({
      colorize: true,
      timestamp: true
    })
  ],
  meta: true, // optional: control whether you want to log the meta data about the request (default to true)
  msg: 'HTTP {{req.method}} {{req.url}}', // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
  expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
  colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
  ignoreRoute: () => {
    return false;
  } // optional: allows to skip some log messages based on request and/or response
});

export default logger;
