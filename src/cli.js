#! /usr/bin/env node

import meow from 'meow';
import dataFeedOrchestrator from './lib/';

const cli = meow({
  help: [
    'Usage',
    '  $ data-feed-orchestrator [input]',
    '',
    'Options',
    '  --foo  Lorem ipsum. [Default: false]',
    '',
    'Examples',
    '  $ data-feed-orchestrator',
    '  unicorns & rainbows',
    '  $ data-feed-orchestrator ponies',
    '  ponies & rainbows'
  ]
});

const input = cli.input || [];
const flags = cli.flags || {};

console.log(cli.help); // eslint-disable-line

dataFeedOrchestrator(input, flags);
