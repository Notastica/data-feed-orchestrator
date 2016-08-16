<big><h1 align="center">data-feed-orchestrator</h1></big>

<p align="center">
  <a href="https://www.codacy.com/app/Notastica/data-feed-orchestrator?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Notastica/data-feed-orchestrator&amp;utm_campaign=Badge_Grade">
    <img src="https://api.codacy.com/project/badge/Grade/a22cdb0e4712418d898e301da3f92bbf"/>
  </a>
  <a href="https://npmjs.org/package/data-feed-orchestrator">
    <img src="https://img.shields.io/npm/v/data-feed-orchestrator.svg" alt="NPM Version">
  </a>

  <a href="http://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/npm/l/data-feed-orchestrator.svg" alt="License">
  </a>

  <a href="https://github.com/Notastica/data-feed-orchestrator/issues">
    <img src="https://img.shields.io/github/issues/Notastica/data-feed-orchestrator.svg" alt="Github Issues">
  </a>

  
  <a href="https://travis-ci.org/Notastica/data-feed-orchestrator">
    <img src="https://img.shields.io/travis/Notastica/data-feed-orchestrator.svg" alt="Travis Status">
  </a>
  
  <a href="https://david-dm.org/Notastica/data-feed-orchestrator">
    <img src="https://david-dm.org/Notastica/data-feed-orchestrator.svg" alt="Dependencies">
  </a>
  
  <a href="https://coveralls.io/github/Notastica/data-feed-orchestrator">
    <img src="https://img.shields.io/coveralls/Notastica/data-feed-orchestrator.svg" alt="Coveralls">
  </a>
  

  
</p>

<p align="center"><big>
A data feed orchestrator
</big></p>

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

```sh
// TODO
```
## License

- **MIT** : http://opensource.org/licenses/MIT

## Contributing

Contributions are highly welcome!
