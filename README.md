
  [![bitHound Code](https://www.bithound.io/github/Notastica/data-feed-orchestrator/badges/code.svg)](https://www.bithound.io/github/Notastica/data-feed-orchestrator)
  [![Codacy](https://api.codacy.com/project/badge/Grade/a22cdb0e4712418d898e301da3f92bbf)](https://www.codacy.com/app/Notastica/data-feed-orchestrator?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Notastica/data-feed-orchestrator&amp;utm_campaign=Badge_Grade)
  [![NPM Version](https://img.shields.io/npm/v/data-feed-orchestrator.svg)](https://npmjs.org/package/data-feed-orchestrator)
  [![License](https://img.shields.io/npm/l/data-feed-orchestrator.svg)](http://opensource.org/licenses/MIT)
  [![Github Issues](https://img.shields.io/github/issues/Notastica/data-feed-orchestrator.svg)](https://github.com/Notastica/data-feed-orchestrator/issues)
  [![Travis Status](https://img.shields.io/travis/Notastica/data-feed-orchestrator.svg)](https://travis-ci.org/Notastica/data-feed-orchestrator)
  [![Dependencies](https://david-dm.org/Notastica/data-feed-orchestrator.svg)](https://david-dm.org/Notastica/data-feed-orchestrator)
  [![Coverage Status](https://coveralls.io/repos/github/Notastica/data-feed-orchestrator/badge.svg?branch=master)](https://coveralls.io/github/Notastica/data-feed-orchestrator?branch=master)
  
 
# A data feed orchestrator

[![Greenkeeper badge](https://badges.greenkeeper.io/Notastica/data-feed-orchestrator.svg)](https://greenkeeper.io/)

## Why?

  After some investigation, we could not find an easy to setup tool that would [https://en.wikipedia.org/wiki/Magic_(programming)](automagically) handle data _accelerators_ in a distributed system
  where if one piece of the puzzle suddenly crashes or for some reason stop processing the whole puzzle manages and is capable of healing itself 

## What it does?

  The __Data Feed Orchestrator__ consists basically in 2 main pieces, an `Orchestrator` and __N__ `Modules`, all modules are connected to the `Orchestrator` who is responsible for handling new messages arrivals
   and is able to decide to which module each new messages should be delivered in the next iteration.
   After a message is handled by the module, it sends the message back to the orchestrator that decides what to do next.
   
## How?
  
  The `Orchestrator` is listening to 2 basic queues in an ampq (rabbitmq) server, _Messages queue_ and _Register Queue_.
  
  - __Register Queue__
    - The register queue, is a queue that new modules should register themselvees, by sending a shallow copy of itself to the queue (Automagically done by the `Module#register()` method.
  - __Messages Queue__
    - The messages queue is the one that new messages will arrive, by an external process (or a module).
  
  Each modules register itself using the `Module#register()` method using the _Register queue_ and the Orchestrator answers back a queue to which the module will be listening to.
  
  __NOTE:__ Modules are grouped by the `Module.service` property, which means, all modules registered with the same `service` name will be listening to the same `queue`. 
    This enables the capability that __N__ instances of the same module can be launched to process messages in parallel.
    
   
   

## Usage



## Install

```sh
npm install data-feed-orchestrator
```




## Usage

 - Launching infra

```sh
#Launch elasticsearch
docker run --name=es -d -p 9200:9200 -p 9300:9300 elasticsearch:2.0

#Launch rabbitmq
docker run --name=mq -d --hostname my-rabbit -p 127.0.0.1:5672:5672 -p 127.0.0.1:8080:15672 rabbitmq:3-management

#Launch the orchestrator
docker run --name orc -v /data --link=mq --link=es -e ENABLE_ELASTICSEARCH=true -e ES_HOST=es:9200 -e NODE_ENV=prod -e AMQP_URL=amqp://mq:5672 notastica/orchestrator node lib/app.js

```

__NOTE:__ There are several environment variables that can be set when launching the orchestrator, see them all in [options.js](./src/options.js)

 - Create your module

```javascript
var dataFeed = require('data-feed-orchestrator');

var m = new dataFeed.Module({
    service: 'test-service',  // This groups several modules into the same service and messages are distributed evenly
    name: 'arandomname',      // this should be your modules name, if you dont provide a random one will be asigned
    positivePath: '$',        // messages matching the positivePath and *NOT* matching the negativePath will be sent to your module
    negativePath: '$.key1'
});

var count = 0;

var start;
m.on('data', function (message) { // our listener when new messages arrive, proccess as quick as you can
    if (!start) {
        start = new Date();
    }
    count++;
    // console.log('Received data', message.toString());

    // ... Your module's magic goes here
    
    message.key1 = 'hooooray, I got a value';

    m.afterProcess(message); // **IMPORTANT** to call this one once you finish processing
    console.log('Received: ', count);
    if (count === 5000) {
        console.log('Started at', start);
        console.log('Finished at', new Date());
        console.log('Took:', new Date() - start);
        console.log('Amazingly fast ah? Only ' + Math.round((new Date() - start) / count) + 'ms per request!');
    }
});

m.register().then(function (m) {
    console.log('Module registered', m);
});
```

Let us know the nice things you build with it 👍

## License

- **MIT** : http://opensource.org/licenses/MIT

## Contributing

Contributions and issues report, as well as feature requests (and Pull requests) are highly welcome!
