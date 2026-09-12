var sqldb = require('../config/dbconnect');
var moment = require('moment');

// Laundry bills are reviewed the way vouchers are, and a rejection there
// always carries a reason; this is its home on a bill (one value per bill,
// stamped on every vehicle row of it).
sqldb.query(
  `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'laundrybill_maint' AND COLUMN_NAME = 'rejection_reason'`,
  function (err, rows) {
    if (err) { console.error('[DB] laundrybill_maint.rejection_reason check:', err.message); return; }
    if (rows && rows[0] && rows[0].c > 0) return;
    sqldb.query('ALTER TABLE laundrybill_maint ADD COLUMN rejection_reason TEXT DEFAULT NULL', function (err2) {
      if (err2) console.error('[DB] laundrybill_maint.rejection_reason add:', err2.message);
      else console.log('laundrybill_maint.rejection_reason column added');
    });
  }
);

// Reference number is minted from MAX(c_id) inside mainlaundry_t — same pattern
// as fuel entries. Not concurrency-safe on paper; the create flow runs inside a
// single connection/transaction to keep the collision window small.
function nextRefNumber(connection, cb) {
  connection.query('SELECT MAX(CAST(c_id AS UNSIGNED)) AS max_id FROM mainlaundry_t', function (err, rows) {
    if (err) return cb(err);
    var next = ((rows[0] && rows[0].max_id) || 0) + 1;
    var c_number = 'LND' + String(next).padStart(5, '0');
    cb(null, { c_id: next, c_number: c_number });
  });
}

// Insert one row per product-rate pair. Vendor's ledger metadata is duplicated
// on each row (matches how the old app stored it, and what the reporting
// queries expect).
function insertVendorProducts(connection, params, cb) {
  var { c_id, c_number, parent_id, ledger, rows, entry_by, user_id, voucherdate, name } = params;
  if (!rows || rows.length === 0) return cb(null);
  var sql = `INSERT INTO laundry_subt
    (parent_subgroup_id, parent_subchild_id, parent_grp_level, ledger_id,
     account_type, amount, child, staticname, district_id, mandal_name, mandal_id,
     subchildtwo, subchildtwo_id, expensives, village_id, i_ts,
     lastinsert_id, c_number, c_id, entry_by, user_id, name, voucherdate,
     product_name, d_in, status)
    VALUES ?`;
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  var l = ledger || {};
  var values = rows.map(function (r) {
    var product = r.d_test_name || {};
    return [
      l.parent_subgroup_id || null,
      l.parent_subchild_id || null,
      l.parent_grp_level || null,
      l.id ? String(l.id) : null,
      'Debit Account',
      String(r.d_test_amount || 0),
      l.child || null,
      l.staticname || null,
      l.district_id || null,
      l.mandal_name || null,
      l.mandal_id || null,
      l.subchildtwo || null,
      l.subchildtwo_id || null,
      l.temple_name || null,
      l.village_id || null,
      now,
      String(parent_id),
      c_number,
      c_id,
      entry_by || '',
      Number(user_id || 0),
      name || l.temple_name || '',
      voucherdate || null,
      product.product_name || '',
      0, 0,
    ];
  });
  connection.query(sql, [values], cb);
}

exports.createVendorMdl = function (data, callback) {
  sqldb.getConnection(function (err, connection) {
    if (err) return callback(err);
    connection.beginTransaction(function (err) {
      if (err) { connection.release(); return callback(err); }
      var rollback = function (e) { connection.rollback(function () { connection.release(); callback(e); }); };

      var det = data.expensedetails || {};
      var ledger = det.selectedledger || null;
      var vendorName = det.name || (ledger && ledger.temple_name) || '';

      nextRefNumber(connection, function (err, ref) {
        if (err) return rollback(err);
        var now = moment().format('YYYY-MM-DD HH:mm:ss');
        var mainSql = `INSERT INTO mainlaundry_t
          (description, name, voucherdate, fromdate, todate, i_ts, d_in,
           c_id, c_number, entry_by, user_id)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
        var mainVals = [
          det.description || null,
          vendorName,
          det.voucherdate || null,
          det.fromdate || null,
          det.todate || null,
          now, 0,
          ref.c_id, ref.c_number,
          data.named || '',
          Number(data.user_id || 0),
        ];
        connection.query(mainSql, mainVals, function (err, mainRes) {
          if (err) return rollback(err);
          var parentId = mainRes.insertId;
          insertVendorProducts(connection, {
            c_id: ref.c_id, c_number: ref.c_number, parent_id: parentId,
            ledger: ledger, rows: data.patientsTstdts || [],
            entry_by: data.named, user_id: data.user_id,
            voucherdate: det.voucherdate, name: vendorName,
          }, function (err) {
            if (err) return rollback(err);
            connection.commit(function (err) {
              if (err) return rollback(err);
              connection.release();
              callback(null, { id: parentId, c_number: ref.c_number });
            });
          });
        });
      });
    });
  });
};

exports.updateVendorMdl = function (data, callback) {
  sqldb.getConnection(function (err, connection) {
    if (err) return callback(err);
    connection.beginTransaction(function (err) {
      if (err) { connection.release(); return callback(err); }
      var rollback = function (e) { connection.rollback(function () { connection.release(); callback(e); }); };

      var det = data.expensedetails || {};
      var ledger = det.selectedledger || null;
      var vendorName = det.name || (ledger && ledger.temple_name) || '';
      var now = moment().format('YYYY-MM-DD HH:mm:ss');

      var updateSql = `UPDATE mainlaundry_t SET
        name=?, voucherdate=?, fromdate=?, todate=?,
        updated_at=?, updated_by=?
        WHERE id=?`;
      connection.query(updateSql, [
        vendorName, det.voucherdate || null, det.fromdate || null, det.todate || null,
        now, data.named || '', Number(data.id),
      ], function (err) {
        if (err) return rollback(err);
        // Same replace-all approach used in fuel edit — soft-delete existing
        // product rows before re-inserting the current set.
        connection.query('UPDATE laundry_subt SET d_in=1 WHERE lastinsert_id=?', [String(data.id)], function (err) {
          if (err) return rollback(err);
          insertVendorProducts(connection, {
            c_id: data.c_id, c_number: data.c_number, parent_id: data.id,
            ledger: ledger, rows: data.patientsTstdts || [],
            entry_by: data.named, user_id: data.user_id,
            voucherdate: det.voucherdate, name: vendorName,
          }, function (err) {
            if (err) return rollback(err);
            connection.commit(function (err) {
              if (err) return rollback(err);
              connection.release();
              callback(null, { id: data.id });
            });
          });
        });
      });
    });
  });
};

exports.deleteVendorMdl = function (data, callback) {
  sqldb.query(
    `UPDATE mainlaundry_t SET d_in=1 WHERE id=?;
     UPDATE laundry_subt SET d_in=1 WHERE lastinsert_id=?`,
    [Number(data.id), String(data.id)],
    callback
  );
};

// Return a flat list of vendor × product rows. Frontend groups by
// (vendor id, contract dates) to build the dynamic product columns — same
// grouping the old Angular `loadReport` did, moved to the client to keep the
// SQL simple.
exports.listVendorsMdl = function (callback) {
  var sql = `
    SELECT m.id, m.c_id, m.c_number, m.name, m.voucherdate, m.fromdate, m.todate,
           s.id AS subt_id, s.product_name, s.amount, s.expensives, s.ledger_id
    FROM mainlaundry_t m
    LEFT JOIN laundry_subt s
      ON s.lastinsert_id = m.id AND s.d_in = 0
    WHERE m.d_in = 0
    ORDER BY m.id DESC, s.id ASC`;
  sqldb.query(sql, callback);
};

exports.listLaundryProductsMdl = function (callback) {
  sqldb.query(
    `SELECT id, product_name FROM laundryproduct_t
     WHERE d_in = 0 AND product_name IS NOT NULL AND product_name <> ''
     ORDER BY product_name ASC`,
    callback
  );
};

// ── Laundry Bill (bill entry against a vendor contract) ─────────────────────

// Vendor dropdown for the bill page. Also returns the vendor's ledger info so
// the credit side auto-fills on pick (matches old submitlaundryaddbill flow).
// No contract-date filter — matches old Angular behaviour, and lets billing
// happen for a contract that was renewed after its original todate lapsed.
exports.listVendorsForBillMdl = function (callback) {
  sqldb.query(
    `SELECT DISTINCT m.id, m.name, m.c_number, m.fromdate, m.todate,
            (SELECT ledger_id FROM laundry_subt s WHERE s.lastinsert_id = m.id AND s.d_in = 0 LIMIT 1) AS ledger_id,
            (SELECT expensives FROM laundry_subt s WHERE s.lastinsert_id = m.id AND s.d_in = 0 LIMIT 1) AS ledger_name
     FROM mainlaundry_t m
     WHERE m.d_in = 0
     ORDER BY m.name ASC`,
    callback
  );
};

// Return the contracted product rates for a vendor. The bill page uses these
// to build one Qty column per product this vendor charges for.
exports.getVendorRatesMdl = function (data, callback) {
  sqldb.query(
    `SELECT id, product_name, amount, ledger_id, expensives,
            parent_subgroup_id, parent_subchild_id, parent_grp_level,
            child, staticname, district_id, mandal_name, mandal_id,
            subchildtwo, subchildtwo_id, village_id
     FROM laundry_subt
     WHERE lastinsert_id = ? AND d_in = 0
     ORDER BY id ASC`,
    [String(data.vendor_id)],
    callback
  );
};

// Bill reference: LNB + zero-padded max id from laundrybill_maint. All rows of
// a single bill share the same c_id / c_number.
function nextBillRefNumber(connection, cb) {
  connection.query('SELECT MAX(CAST(c_id AS UNSIGNED)) AS max_id FROM laundrybill_maint', function (err, rows) {
    if (err) return cb(err);
    var next = ((rows[0] && rows[0].max_id) || 0) + 1;
    cb(null, { c_id: next, c_number: 'LNB' + String(next).padStart(5, '0') });
  });
}

// Insert vehicle rows into laundrybill_maint. The table's product columns are
// hardcoded (blanket/white/pillow/cover/curtain) but we also store the full
// row aggregate via product_json in the `remarks` column? No — better: store
// per-product qty/rate/amount in a generic child table row for products we
// don't have a matching hardcoded column. Practical shortcut: map by product
// name into the 5 legacy columns, and if a bill uses more products we drop
// them into the leftover generic slots. Since the DB constrains us to those
// columns and the current product master has exactly 5 rows, this works for
// today. If new products are added later, we'll need a schema change.
var PRODUCT_COL_MAP = {
  'blankets': 'blanket',
  'blanket': 'blanket',
  'whites': 'white',
  'white': 'white',
  'pillow covers': 'pillow',
  'pillow': 'pillow',
  'bed covers': 'cover',
  'covers': 'cover',
  'cover': 'cover',
  'curtains': 'curtain',
  'curtain': 'curtain',
};
function colKeyFor(productName) {
  return PRODUCT_COL_MAP[String(productName || '').trim().toLowerCase()] || null;
}

function insertBillVehicleRows(connection, params, cb) {
  var { c_id, c_number, vendor, vehicles, entry_by, user_id, voucherdate, remarks } = params;
  if (!vehicles || vehicles.length === 0) return cb(null);
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  var sql = `INSERT INTO laundrybill_maint
    (vehicle_no, service_no, totalamount, name, account_type, child, staticname,
     mandal_name, mandal_id, subchildtwo, subchildtwo_id, voucherdate, vouchertype,
     expensives, c_id, c_number, entry_by, user_id, date, admin_status, d_in,
     its_1, remarks,
     blanket_qty, blanket_rate, blanket_amount,
     white_qty, white_rate, white_amount,
     pillow_qty, pillow_rate, pillow_amount,
     cover_qty, cover_rate, cover_amount,
     curtain_qty, curtain_rate, curtain_amount)
    VALUES ?`;
  var v = vendor || {};
  var values = vehicles.map(function (row) {
    // Convert row.products [{product_name, qty, rate, amount}] into the 5
    // legacy columns. Products not in the map are silently dropped — this
    // only happens if someone adds a new laundry product outside the fixed set.
    var buckets = { blanket: null, white: null, pillow: null, cover: null, curtain: null };
    (row.products || []).forEach(function (p) {
      var key = colKeyFor(p.product_name);
      if (!key) return;
      buckets[key] = {
        qty: String(p.qty || 0),
        rate: String(p.rate || 0),
        amount: String(p.amount || 0),
      };
    });
    var totalAmount = (row.products || []).reduce(function (s, p) { return s + Number(p.amount || 0); }, 0);
    return [
      row.vehicle_no || null,
      row.service_no || '',
      String(totalAmount),
      v.ledger_name || v.name || '',
      'Vehicle Row',
      v.child || null, v.staticname || null,
      v.mandal_name || null, v.mandal_id || null,
      v.subchildtwo || null, v.subchildtwo_id || null,
      voucherdate || null, 'Journal',
      v.ledger_name || null,
      c_id, c_number,
      entry_by || '', String(user_id || 0),
      voucherdate || null,
      0, 0,
      now,
      remarks || null,
      buckets.blanket ? buckets.blanket.qty : null,
      buckets.blanket ? buckets.blanket.rate : null,
      buckets.blanket ? buckets.blanket.amount : null,
      buckets.white ? buckets.white.qty : null,
      buckets.white ? buckets.white.rate : null,
      buckets.white ? buckets.white.amount : null,
      buckets.pillow ? buckets.pillow.qty : null,
      buckets.pillow ? buckets.pillow.rate : null,
      buckets.pillow ? buckets.pillow.amount : null,
      buckets.cover ? buckets.cover.qty : null,
      buckets.cover ? buckets.cover.rate : null,
      buckets.cover ? buckets.cover.amount : null,
      buckets.curtain ? buckets.curtain.qty : null,
      buckets.curtain ? buckets.curtain.rate : null,
      buckets.curtain ? buckets.curtain.amount : null,
    ];
  });
  connection.query(sql, [values], cb);
}

function insertBillAccountRows(connection, params, cb) {
  var { c_id, c_number, parent_id, rows, accountType, entry_by, user_id, voucherdate } = params;
  if (!rows || rows.length === 0) return cb(null);
  var sql = `INSERT INTO laundrybill_subt
    (parent_subgroup_id, parent_subchild_id, account_type, amount, child, staticname,
     district_id, mandal_name, mandal_id, subchildtwo, subchildtwo_id, expensives,
     village_id, i_ts, lastinsert_id, c_number, c_id, entry_by, user_id,
     debit_amount, credit_amount, d_in, status, ledger_id, parent_grp_level)
    VALUES ?`;
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  var values = rows.map(function (r) {
    var l = r.ledger || {};
    return [
      l.parent_subgroup_id || null,
      l.parent_subchild_id || null,
      accountType,
      String(r.amount || 0),
      l.child || null, l.staticname || null,
      l.district_id || null, l.mandal_name || null, l.mandal_id || null,
      l.subchildtwo || null, l.subchildtwo_id || null,
      l.temple_name || l.expensives || null,
      l.village_id || null, now,
      String(parent_id), c_number, c_id,
      entry_by || '', Number(user_id || 0),
      accountType === 'Debit Account' ? String(r.amount || 0) : '0',
      accountType === 'Credit Account' ? String(r.amount || 0) : '0',
      0, 0,
      // Ledger Wise, Payables and the edit screen all find a row by its
      // ledger_id (the fuel rows carry it); without it a laundry bill's
      // ledgers never appeared on any ledger report.
      l.id ? String(l.id) : (l.ledger_id ? String(l.ledger_id) : null),
      l.parent_grp_level || null,
    ];
  });
  connection.query(sql, [values], cb);
}

exports.createLaundryBillMdl = function (data, callback) {
  sqldb.getConnection(function (err, connection) {
    if (err) return callback(err);
    connection.beginTransaction(function (err) {
      if (err) { connection.release(); return callback(err); }
      var rollback = function (e) { connection.rollback(function () { connection.release(); callback(e); }); };

      nextBillRefNumber(connection, function (err, ref) {
        if (err) return rollback(err);
        var det = data.expensedetails || {};
        insertBillVehicleRows(connection, {
          c_id: ref.c_id, c_number: ref.c_number,
          vendor: data.vendor || {},
          vehicles: data.vehicles || [],
          entry_by: data.named, user_id: data.user_id,
          voucherdate: det.voucherdate,
          remarks: det.remarks,
        }, function (err, vehRes) {
          if (err) return rollback(err);
          // Use the FIRST inserted vehicle row's id as the parent_id anchor for
          // the accounting subt rows. laundrybill_subt.lastinsert_id points to
          // that anchor; the c_number is what actually joins bill+accounts
          // during list/edit queries.
          var parentId = vehRes.insertId;
          var debitParams = {
            c_id: ref.c_id, c_number: ref.c_number, parent_id: parentId,
            rows: data.patientsTstdts || [], accountType: 'Debit Account',
            entry_by: data.named, user_id: data.user_id, voucherdate: det.voucherdate,
          };
          insertBillAccountRows(connection, debitParams, function (err) {
            if (err) return rollback(err);
            insertBillAccountRows(connection, Object.assign({}, debitParams, {
              rows: data.creditaddrowdts || [], accountType: 'Credit Account',
            }), function (err) {
              if (err) return rollback(err);
              connection.commit(function (err) {
                if (err) return rollback(err);
                connection.release();
                callback(null, { c_number: ref.c_number, c_id: ref.c_id });
              });
            });
          });
        });
      });
    });
  });
};

// Same lock as the fuel entry: an approved or rejected bill is on the books,
// so the API refuses to edit or delete it (the page hides those actions).
var lockedError = function () { var e = new Error('Approved / rejected bills cannot be edited or deleted'); e.code = 'LOCKED'; return e; };
function whenBillOpen(c_number, callback, run) {
  sqldb.query('SELECT MIN(admin_status) AS s FROM laundrybill_maint WHERE c_number = ? AND d_in = 0', [c_number], function (err, rows) {
    if (err) return callback(err);
    if (rows.length && rows[0].s != null && Number(rows[0].s) !== 0) return callback(lockedError());
    run();
  });
}

exports.updateLaundryBillMdl = function (data, callback) {
  whenBillOpen(data.c_number, callback, function () { updateLaundryBillOpen(data, callback); });
};
function updateLaundryBillOpen(data, callback) {
  sqldb.getConnection(function (err, connection) {
    if (err) return callback(err);
    connection.beginTransaction(function (err) {
      if (err) { connection.release(); return callback(err); }
      var rollback = function (e) { connection.rollback(function () { connection.release(); callback(e); }); };

      // Replace-all strategy — soft-delete all existing rows for this c_number,
      // then re-insert the current set. Simpler than diffing vehicle + product
      // combinations and matches how fuel entry edit works.
      connection.query('UPDATE laundrybill_maint SET d_in=1 WHERE c_number=?', [data.c_number], function (err) {
        if (err) return rollback(err);
        connection.query('UPDATE laundrybill_subt SET d_in=1 WHERE c_number=?', [data.c_number], function (err) {
          if (err) return rollback(err);
          var det = data.expensedetails || {};
          insertBillVehicleRows(connection, {
            c_id: data.c_id, c_number: data.c_number,
            vendor: data.vendor || {},
            vehicles: data.vehicles || [],
            entry_by: data.named, user_id: data.user_id,
            voucherdate: det.voucherdate, remarks: det.remarks,
          }, function (err, vehRes) {
            if (err) return rollback(err);
            var parentId = vehRes.insertId;
            var debitParams = {
              c_id: data.c_id, c_number: data.c_number, parent_id: parentId,
              rows: data.patientsTstdts || [], accountType: 'Debit Account',
              entry_by: data.named, user_id: data.user_id, voucherdate: det.voucherdate,
            };
            insertBillAccountRows(connection, debitParams, function (err) {
              if (err) return rollback(err);
              insertBillAccountRows(connection, Object.assign({}, debitParams, {
                rows: data.creditaddrowdts || [], accountType: 'Credit Account',
              }), function (err) {
                if (err) return rollback(err);
                connection.commit(function (err) {
                  if (err) return rollback(err);
                  connection.release();
                  callback(null, { c_number: data.c_number });
                });
              });
            });
          });
        });
      });
    });
  });
};

exports.deleteLaundryBillMdl = function (data, callback) {
  whenBillOpen(data.c_number, callback, function () { deleteLaundryBillOpen(data, callback); });
};
function deleteLaundryBillOpen(data, callback) {
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  sqldb.query(
    `UPDATE laundrybill_maint SET d_in=1, delete_by_id=?, delete_by_name=?, delete_by_date=? WHERE c_number=?;
     UPDATE laundrybill_subt SET d_in=1 WHERE c_number=?`,
    [String(data.user_id || 0), data.named || '', now, data.c_number, data.c_number],
    callback
  );
};

// List of bills for the table. One row per c_number with aggregated totals.
exports.listLaundryBillsMdl = function (callback) {
  sqldb.query(
    `SELECT c_number, MIN(c_id) AS c_id, MIN(name) AS vendor_name,
            MIN(voucherdate) AS voucherdate, MIN(remarks) AS remarks,
            MIN(entry_by) AS entry_by, MIN(admin_status) AS admin_status,
            MIN(admin_action_id) AS admin_action_id,
            MIN(admin_action_name) AS admin_action_name,
            MIN(admin_action_date) AS admin_action_date,
            MIN(rejection_reason) AS rejection_reason,
            COUNT(*) AS vehicle_count,
            SUM(CAST(totalamount AS DECIMAL(15,2))) AS total_amount
     FROM laundrybill_maint
     WHERE d_in = 0
     GROUP BY c_number
     ORDER BY MIN(c_id) DESC`,
    callback
  );
};

// Bill details for View / Edit — vehicle rows and accounting rows separately.
exports.getLaundryBillDetailsMdl = function (data, callback) {
  var q1 = new Promise(function (resolve, reject) {
    sqldb.query(
      `SELECT * FROM laundrybill_maint WHERE c_number = ? AND d_in = 0 ORDER BY id ASC`,
      [data.c_number],
      function (err, rows) { err ? reject(err) : resolve(rows); }
    );
  });
  var q2 = new Promise(function (resolve, reject) {
    sqldb.query(
      `SELECT * FROM laundrybill_subt WHERE c_number = ? AND d_in = 0 ORDER BY id ASC`,
      [data.c_number],
      function (err, rows) { err ? reject(err) : resolve(rows); }
    );
  });
  Promise.all([q1, q2])
    .then(function (r) { callback(null, { vehicles: r[0], accounts: r[1] }); })
    .catch(function (e) { callback(e); });
};

exports.updateLaundryBillAdminStatusMdl = function (data, callback) {
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  sqldb.query(
    // Ledger Wise reads the approval off the ledger rows (l.admin_status on
    // laundrybill_subt), as it does for fuel, so both tables are stamped -
    // an approved bill used to stay invisible on every ledger report.
    `UPDATE laundrybill_maint
     SET admin_status = ?, admin_action_id = ?, admin_action_name = ?, admin_action_date = ?, rejection_reason = ?
     WHERE c_number = ?;
     UPDATE laundrybill_subt SET admin_status = ? WHERE c_number = ?`,
    // The reason travels with a rejection only; approving or reopening the
    // bill clears it, as it does on a voucher.
    [Number(data.admin_status), String(data.user_id || 0), data.named || '', now,
     Number(data.admin_status) === 2 ? String(data.rejection_reason || '') : '', data.c_number,
     Number(data.admin_status), data.c_number],
    callback
  );
};
