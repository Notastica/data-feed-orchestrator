import * as chai from 'chai';
import dirtyChai from 'dirty-chai';
import Orchestrator from '../src/orchestrator';
import geocoding from '../src/modules/geocoding';
import uuid from 'node-uuid';
import _ from 'lodash';
import mockPersistence from './mock-persistence-module';
import elasticsearch from '../src/modules/elasticsearch';
import JSON from 'json3';

// TEST SETUP
// =============================================================================
chai.use(dirtyChai);

describe('geocoding module', function () {

  // eslint-disable-next-line no-invalid-this
  this.timeout(5000);

  it('Should geocode an address', function () {

    const defaultOptions = {
      registerQueue: `register-${uuid.v4()}`,
      messagesQueue: `messages-${uuid.v4()}`
    };

    const apiKey = process.env.GAPI_KEY;
    let mock = mockPersistence(defaultOptions);
    const o = new Orchestrator(defaultOptions);
    const m = geocoding(_.defaults({
      apiKey: apiKey
    }, defaultOptions));

    mock.register().then((result) => {
      mock = result;
    }); // register mock async
    return o.listen().then(() => {
      return m.register();
    }).then(() => {
      const pub = o.amqpContext.socket('PUSH');
      const message = { uuid: uuid.v4(), address: '1600 Amphitheatre Parkway, Mountain View, CA' };

      pub.connect(o.messagesQueue, () => {
        pub.write(JSON.stringify(message));
      });

      return new Promise((resolve) => {
        let mockReceivedCount = 2;

        mock.on('data', () => {
          if (--mockReceivedCount <= 0) {
            if (Object.keys(mock.messages).length > 0) {
              chai.expect(mock.messages).to.have.contains.key(message.uuid);
              chai.expect(mock.messages[message.uuid]).to.contains.key('address');
              chai.expect(mock.messages[message.uuid]).to.contains.key('location');
              resolve();
            }
          }
        });
      });


    });


  });

  it('Should query ES to avoid multiple calls for the same venue', function () {

    const defaultOptions = {
      registerQueue: `register-${uuid.v4()}`,
      messagesQueue: `messages-${uuid.v4()}`
    };

    const apiKey = process.env.GAPI_KEY;
    const o = new Orchestrator(defaultOptions);
    let es = elasticsearch(_.defaults({
      messagesIndex: uuid.v4(),
      messagesType: uuid.v4()
    }, o));
    const m = geocoding(_.defaults({
      apiKey: apiKey,
      queryEs: true,
      sameVenueField: 'placeId',
      sortEsQueryField: 'uuid',
      sortEsQueryOrder: 'desc',
      esIndex: o.messagesIndex
    }, defaultOptions, o));

    es.register().then((result) => {
      es = result;
    }); // register mock async
    return o.listen().then(() => {
      m.register();
    }).then(() => {
      const pub = o.amqpContext.socket('PUSH');
      const message1 = {
        placeId: uuid.v4(),
        address: '1600 Amphitheatre Parkway, Mountain View, CA'
      };

      // Bulding another message with the same placeId and address but different id
      const message2 = _.defaults({}, message1);

      pub.connect(o.messagesQueue, () => {
        pub.write(JSON.stringify(message1));
        // Send some ms after to simulate pipe delay
        setTimeout(() => {
          pub.write(JSON.stringify(message2));
        }, 2000);
      });

      return new Promise((resolve) => {
        m.googleMapsClient.actualGeocode = m.googleMapsClient.geocode;
        process.stdout.oldWrite = process.stdout.write;

        process.stdout.write = function (args) {
          if (args && args.indexOf('Already populated') >= 0) {
            resolve();
            process.stdout.write = process.stdout.oldWrite;
          }
          process.stdout.oldWrite(args);
        };
      });

    });

  });

});
