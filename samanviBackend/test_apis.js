/**
 * Full-cycle API test — Samanvi Travels hierarchy
 * Tests the exact payloads the React app sends after the securePayload fix
 * Run: node test_apis.js
 */
const crypto = require('crypto')
const http = require('http')
const mysql = require('./node_modules/mysql2/promise')

const SECRET_KEY = 'KUHClb5flJsboviTKv32bjL4hgjt1ADR'

function encryptPayload(data) {
  const plain = JSON.stringify(data)
  const bs = 16, pad = bs - (plain.length % bs)
  const padded = plain + String.fromCharCode(pad).repeat(pad)
  const c = crypto.createCipheriv('aes-256-ecb', Buffer.from(SECRET_KEY), null)
  c.setAutoPadding(false)
  return Buffer.concat([c.update(Buffer.from(padded)), c.final()]).toString('base64')
}
function securePayload(data) {
  const ep = encryptPayload(data)
  return { encryptedPayload: ep, signature: crypto.createHmac('sha256', Buffer.from(SECRET_KEY)).update(ep).digest('hex') }
}

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const s = JSON.stringify(body)
    const req = http.request({
      hostname: 'localhost', port: 8945, path: `/nodeapp${path}`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s),
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { try { resolve({ code: res.statusCode, body: JSON.parse(d) }) } catch { resolve({ code: res.statusCode, body: d }) } })
    })
    req.on('error', reject); req.write(s); req.end()
  })
}

const rows = []
let pass = 0, fail = 0
const ok = (l, d = '') => { pass++; rows.push(['✓', l, d]) }
const ko = (l, d = '') => { fail++; rows.push(['✗', l, d]) }
const check = (l, c, d) => c ? ok(l, d) : ko(l, d)
const section = t => rows.push(['—', t, ''])

async function run() {
  // ── DB ────────────────────────────────────────────────────────────────
  section('DATABASE')
  let conn
  try {
    conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'latest_samanvi_db' })
    const [masters] = await conn.query('SELECT id, districtnm FROM mainmastersadd ORDER BY id')
    check('4 root nodes in mainmastersadd', masters.length === 4, masters.map(m=>`${m.id}:${m.districtnm}`).join(', '))
    const [grps]  = await conn.query('SELECT COUNT(*) c FROM mainmastersgroup')
    ok('mainmastersgroup', `${grps[0].c} rows`)
    const [sgs]   = await conn.query('SELECT COUNT(*) c FROM mainmasterssubgroup')
    ok('mainmasterssubgroup', `${sgs[0].c} rows`)
    const [ch]    = await conn.query('SELECT COUNT(*) c FROM mainmasterssubchild')
    ok('mainmasterssubchild', `${ch[0].c} rows`)
    const [led]   = await conn.query('SELECT COUNT(*) c FROM mainmasterssubchildtwo WHERE d_in=0 OR d_in IS NULL')
    ok('mainmasterssubchildtwo (ledgers)', `${led[0].c} active rows`)

    // Check for null-field garbage from previous broken runs
    const [garbage] = await conn.query("SELECT COUNT(*) c FROM mainmastersgroup WHERE mandal_name IS NULL OR mandal_name=''")
    check('No null-name garbage in mainmastersgroup', garbage[0].c === 0, `${garbage[0].c} garbage rows found — run cleanup.js`)
  } catch(e) { ko('DB', e.message) }

  // ── Login ──────────────────────────────────────────────────────────────
  section('LOGIN')
  const lr = await post('/loginuser', securePayload({ phone: '9848252645', usr_pwd: 'Samanvi@Samanvi@123', rememberme: false }))
  check('POST /loginuser → 200', lr.body?.status === 200, JSON.stringify(lr.body).slice(0,100))
  const token = lr.body?.acstkn
  check('Token returned', !!token, '')
  if (!token) { printResults(); if(conn) await conn.end(); process.exit(1) }

  // ── Read endpoints ────────────────────────────────────────────────────
  section('HIERARCHY READ')
  const ctx = { role_type: '1', district_id: '1' }

  const r1 = await post('/alldistrictsget', ctx, token)
  check('/alldistrictsget → 200', r1.body?.status === 200, '')
  const masters = r1.body?.data ?? []
  check('Returns exactly 4 roots', masters.length === 4, masters.map(m=>m.districtnm).join(', '))

  const r2 = await post('/getallmandaldata', ctx, token)
  check('/getallmandaldata → 200', r2.body?.status === 200, `${(r2.body?.data??[]).length} groups`)

  const r3 = await post('/getmainmasterssubgroup', {}, token)
  check('/getmainmasterssubgroup → 200', r3.body?.status === 200, `${(r3.body?.data??[]).length} sub-groups`)

  const r4 = await post('/getmainmasterssubchild', {}, token)
  check('/getmainmasterssubchild → 200', r4.body?.status === 200, `${(r4.body?.data??[]).length} children`)

  const r5 = await post('/getledgerdatadropdown', ctx, token)
  check('/getledgerdatadropdown → 200', r5.body?.status === 200, `${(r5.body?.data??[]).length} ledgers`)

  // ── Full cycle: Add → Verify in Read → Update → Delete ───────────────
  section('FULL CRUD CYCLE (raw JSON — React app behavior after fix)')
  const assetsNode = masters.find(m => m.districtnm?.toUpperCase().includes('ASSET'))
  let testGroupId = null

  if (assetsNode) {
    // 1. ADD (Level 1 → Level 2 group)
    const addPayload = {
      district_id: String(assetsNode.id),
      mandal_name: '__API_TEST_GROUP__',
      staticentry: assetsNode.districtnm,
    }
    const addRes = await post('/addmastergroupdata', addPayload, token)
    check('ADD group (level 2) → status 200', addRes.body?.status === 200, JSON.stringify(addRes.body).slice(0,100))
    testGroupId = addRes.body?.data?.result?.insertId
    check('ADD returns insertId', !!testGroupId, `id=${testGroupId}`)

    // 2. VERIFY it appears in READ
    const readAfterAdd = await post('/getallmandaldata', ctx, token)
    const found = (readAfterAdd.body?.data ?? []).some(g => g.id === testGroupId)
    check('New group appears in /getallmandaldata', found, found ? `id=${testGroupId} found` : 'Not found in list')

    // 3. UPDATE (matches React app: spreads node with level, district_id, mandal_id)
    const updatePayload = {
      id: testGroupId,
      level: 2,
      district_id: String(assetsNode.id),
      mandal_id: String(testGroupId),
      editname: '__API_TEST_UPDATED__',
    }
    const updRes = await post('/updateGroupName', updatePayload, token)
    check('UPDATE group name → status 200', updRes.body?.status === 200, JSON.stringify(updRes.body).slice(0,100))

    // 4. DELETE (matches React app: spreads node)
    const deletePayload = {
      id: testGroupId,
      level: 2,
      district_id: String(assetsNode.id),
      mandal_id: String(testGroupId),
    }
    const delRes = await post('/deleteGroup', deletePayload, token)
    check('DELETE group → status 200', delRes.body?.status === 200, JSON.stringify(delRes.body).slice(0,100))

    // 5. VERIFY it's gone
    const readAfterDel = await post('/getallmandaldata', ctx, token)
    const stillExists = (readAfterDel.body?.data ?? []).some(g => g.id === testGroupId)
    check('Deleted group gone from /getallmandaldata', !stillExists, stillExists ? 'Still in list!' : 'Correctly removed')
  }

  // ── Ledger add test ───────────────────────────────────────────────────
  section('LEDGER ADD (parent_level field — after fix)')
  const groupsForLedger = r2.body?.data ?? []
  const testGroup = groupsForLedger[0]
  if (testGroup) {
    const ledgerPayload = {
      temple_name: '__API_TEST_LEDGER__',
      amount: 0,
      parent_level: 2,           // model reads data.parent_level → parent_grp_level column
      parent_subgroup_id: null,
      parent_subchild_id: null,
      district_id: String(testGroup.district_id),
      staticname: 'ASSETS',
      mandal_id: String(testGroup.id),
      mandal_name: testGroup.mandal_name,
      village_id: null,
      child: '',
      subchildtwo: testGroup.mandal_name,
      user_id: '8',
      entry_by: 'Sai',
    }
    const ledgerRes = await post('/addledgerdata', ledgerPayload, token)
    check('ADD ledger → status 200', ledgerRes.body?.status === 200, JSON.stringify(ledgerRes.body).slice(0,100))
    const ledgerId = ledgerRes.body?.insertId ?? ledgerRes.body?.data?.insertId

    if (ledgerId) {
      // Check parent_grp_level was stored correctly
      if (conn) {
        const [ledgerRow] = await conn.query('SELECT id, temple_name, parent_grp_level FROM mainmasterssubchildtwo WHERE id=?', [ledgerId])
        if (ledgerRow.length > 0) {
          check('Ledger stored with correct parent_grp_level=2', ledgerRow[0].parent_grp_level === 2, `got ${ledgerRow[0].parent_grp_level}`)
        }
      }
      // Delete test ledger
      const delLed = await post('/deleteLedger', { id: ledgerId }, token)
      check('DELETE test ledger → status 200', delLed.body?.status === 200, JSON.stringify(delLed.body).slice(0,100))
    }
  }

  // ── Missing routes ────────────────────────────────────────────────────
  section('MISSING ROUTES')
  const fg = await post('/updateGroupFlags', { parent_id: 1, has_ledgers: 1 }, token)
  check('/updateGroupFlags route EXISTS (needs to be added)', fg.code !== 404, `HTTP ${fg.code}${fg.code===404?' — MISSING FROM routes.js':''}`)

  // ── Reports ───────────────────────────────────────────────────────────
  section('REPORT ENDPOINTS')
  const txp = securePayload({ fromdate: '', todate: '', ledger_name: '', user_id: '8' })
  const t1 = await post('/Selectdatagetfinaltranscationsreport', txp, token)
  check('/Selectdatagetfinaltranscationsreport → 200', t1.body?.status === 200, '')
  const t2 = await post('/Selectdatagetfinaltranscationsreport1', txp, token)
  check('/Selectdatagetfinaltranscationsreport1 → 200', t2.body?.status === 200, '')
  const db = await post('/getdaybookreports', {}, token)
  check('/getdaybookreports → 200', db.body?.status === 200, '')
  const tb = await post('/gettrialbalancereports', {}, token)
  check('/gettrialbalancereports → 200', tb.body?.status === 200, '')

  if (conn) await conn.end()
  printResults()
}

function printResults() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║         Samanvi Travels — API Diagnostic Report          ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  rows.forEach(([icon, label, detail]) => {
    if (icon === '—') { console.log(`\n  ── ${label} ──`); return }
    console.log(`  ${icon}  ${label}${detail ? `\n       ${detail}` : ''}`)
  })
  console.log(`\n  ─────────────────────────────`)
  console.log(`  Passed: ${pass}   Failed: ${fail}`)
  console.log(`  ─────────────────────────────\n`)
}

// Clean up any leftover test records first
async function cleanup() {
  const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'latest_samanvi_db' })
  await conn.query("DELETE FROM mainmastersgroup WHERE mandal_name IN ('__API_TEST_GROUP__','__API_TEST_UPDATED__','__TEST_RAW__','__TEST_ENC__','__TEST_ENCRYPTED__')")
  await conn.query("DELETE FROM mainmasterssubchildtwo WHERE temple_name='__API_TEST_LEDGER__'")
  await conn.end()
}

cleanup().then(run).catch(e => { console.error(e); process.exit(1) })
