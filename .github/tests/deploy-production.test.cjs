const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflow = fs.readFileSync(path.join(__dirname, '../workflows/deploy.yml'), 'utf8');
const scripts = [...workflow.matchAll(/PRODUCTION_SCRIPT="[^"\n]+" node -e "([\s\S]*?)\n\s{12}"/g)]
  .map(match => match[1].replace(/\\"/g, '"'));
assert.equal(scripts.length, 2, 'Both production process/migration checks must be present');

function execute(script, apps, columnPresent = true) {
  const result = { output: '', exitCode: 0 };
  const database = { query(sql, values, callback) {
    assert.deepEqual(Array.from(values), ['fuel_entry', 'value_date']);
    assert.match(sql, /TABLE_SCHEMA = DATABASE\(\)/);
    callback(null, [{ count: columnPresent ? 1 : 0 }]);
  }, end() {} };
  const process = {
    env: { PRODUCTION_SCRIPT: '/home/samanvitravelsor/api/app.js' },
    stdout: { write(value) { result.output += value; } },
    exit(code) { result.exitCode = code; throw new Error('Exit ' + code); },
    get exitCode() { return result.exitCode; }, set exitCode(code) { result.exitCode = code; },
  };
  const requireStub = name => name === 'path' ? path
    : name === 'child_process' ? { execFileSync(command, args) {
      assert.equal(command, 'pm2'); assert.deepEqual(Array.from(args), ['jlist']);
      return JSON.stringify(apps);
    } } : database;
  try { vm.runInNewContext(script, { require: requireStub, process, console: { log() {}, error() {} } }); }
  catch (error) { if (!/^Exit /.test(error.message)) throw error; }
  return result;
}

const apps = [
  { pm_id: 0, pm2_env: { pm_exec_path: '/home/samanvitravelsor/api/app.js', status: 'online' } },
  { pm_id: 1, pm2_env: { pm_exec_path: '/home/samanvitravelsor/test_api/app.js', status: 'online' } },
  { pm_id: 2, pm2_env: { pm_exec_path: '/home/samanvitravelsor/staging_api/app.js', status: 'online' } },
];

test('production deploy selects only /api, even when /test_api shares its PM2 name', () => {
  assert.equal(execute(scripts[0], apps).output, '0');
  assert.equal(execute(scripts[0], apps.slice(1)).exitCode, 1);
});

test('deployment rejects an errored production process or missing value-date migration', () => {
  assert.equal(execute(scripts[1], apps).exitCode, 0);
  assert.equal(execute(scripts[1], [{ ...apps[0], pm2_env: { ...apps[0].pm2_env, status: 'errored' } }]).exitCode, 1);
  assert.equal(execute(scripts[1], apps, false).exitCode, 1);
});
