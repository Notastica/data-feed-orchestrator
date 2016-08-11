import dataFeedOrchestrator from '../src/lib/';
import { expect } from 'chai';


describe('dataFeedOrchestrator', function () {
  it('Should be true', function () {
    return expect(dataFeedOrchestrator()).to.be.true;
  });
});
