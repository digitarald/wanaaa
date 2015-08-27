import main from '../';

exports['test empty'] = function(assert) {
  assert.pass('Unit test running!');
};

exports['test empty async'] = function(assert, done) {
  assert.pass('async Unit test running!');
  done();
};

import test from 'sdk/test';
test.run(exports);
