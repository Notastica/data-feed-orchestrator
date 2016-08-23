import Module from '../src/module';
import logger from '../src/logging/logger';


const mock = (options) => {
  options.type = 'persistence';
  options.service = 'mock-persistence';

  const m = new Module(options);

  m.on('data', (message) => {
    logger.info('[MOCK] Lets pretend I actually persisted anything');
    m.afterProcess(message);
  });
  return m;
};

export default mock;
