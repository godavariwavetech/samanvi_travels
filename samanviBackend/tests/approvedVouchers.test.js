const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function guard(user, dbError = null) {
  const context = { module: { exports: {} }, require() {
    return { query(sql, values, callback) {
      if (sql.includes('mainvoucher_t')) return callback(null, [{ status: 1 }]);
      assert.match(sql, /role_type/);
      assert.match(sql, /d_in = 0/);
      assert.equal(values[0], 17);
      callback(dbError, user ? [user] : []);
    } };
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../utils/approvedVouchers'), 'utf8'), context);
  let denial;
  context.module.exports.guardApprovedVoucher(17, 'V123', result => { denial = result; });
  return denial;
}

test('approved voucher guard permits Super Admin numeric and string roles', () => {
  for (const role_type of [0, '0']) assert.equal(guard({ role_type, number: '9999999999' }), null);
});

test('approved voucher guard preserves the designated editor and denies other users', () => {
  assert.equal(guard({ role_type: 1, number: '7032285554' }), null);
  for (const role_type of [1, 2, null, undefined, '']) {
    assert.equal(guard({ role_type, number: '9999999999' }).code, 403);
  }
  assert.equal(guard(null).code, 403);
  assert.equal(guard(null, new Error('offline')).code, 500);
});
