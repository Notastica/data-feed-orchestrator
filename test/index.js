import test from 'ava';
import 'babel-core/register';

import dataFeedOrchestrator from '../src/lib/';

test('dataFeedOrchestrator', (t) => {
  t.is(dataFeedOrchestrator(), true);
});
