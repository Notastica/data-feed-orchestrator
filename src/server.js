// import { mq } from './mq/connection';
import { logger, expressLogger } from './logging/logger';
import express from 'express';
import pack from '../package.json';

// BASE SETUP
// =============================================================================
const app = express();                 // define our app using express
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(expressLogger);

// ROUTES FOR OUR API
// =============================================================================
const router = new express.Router();

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', (req, res) => {
  res.json({ message: `Welcome to ${pack.name}`, version: pack.version });
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================

app.listen(port, () => {
  logger.info(`Server initialized and listening on ${port}`);
});


