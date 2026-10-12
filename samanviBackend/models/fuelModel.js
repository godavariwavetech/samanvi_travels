var sqldb = require('../config/dbconnect');
var refnum = require('../utils/refnumber');
var ensureColumn = require('../utils/ensurecolumn');
var moment = require('moment');

// Per-bus monthly fuel target — replaces the legacy per-service_number
// fuel_target_t table now that Fuel Entry no longer collects service number.
// Multiple rows can exist for the same bus over time; the "current" one is the
// most recent with d_in = 0. Submit soft-deletes older active rows for the
// same bus so there's always exactly one active target per bus.
sqldb.query(`CREATE TABLE IF NOT EXISTS fuel_target_bus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_no VARCHAR(50) NOT NULL,
  target_liters DECIMAL(10,2) NOT NULL DEFAULT 0,
  period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  d_in INT NOT NULL DEFAULT 0,
  i_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
  entry_by VARCHAR(200) DEFAULT NULL,
  user_id INT DEFAULT 0,
  updatedby VARCHAR(200) DEFAULT NULL,
  updatedid INT DEFAULT 0,
  updated_at DATETIME DEFAULT NULL,
  INDEX idx_bus_no (bus_no),
  INDEX idx_active (d_in)
)`, function (err) {
  if (err) console.error('[DB] fuel_target_bus init:', err.message);
  else console.log('fuel_target_bus table ready');
});

// Add the remarks column if it's not already there. MariaDB supports IF NOT
// EXISTS on ADD COLUMN, but for portability check INFORMATION_SCHEMA first so
// we don't emit a duplicate-column error on MySQL versions that don't support
// the IF NOT EXISTS clause.
sqldb.query(
  `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_entry' AND COLUMN_NAME = 'remarks'`,
  function (err, rows) {
    if (err) { console.error('[DB] fuel_entry.remarks check:', err.message); return; }
    if (rows && rows[0] && rows[0].c > 0) return;
    sqldb.query('ALTER TABLE fuel_entry ADD COLUMN remarks TEXT DEFAULT NULL', function (err2) {
      if (err2) console.error('[DB] fuel_entry.remarks add:', err2.message);
      else console.log('fuel_entry.remarks column added');
    });
  }
);

// Fuel entries are reviewed the way vouchers are, and a rejection there
// always carries a reason (mainvoucher_t.rejection_reason); this is its home
// on a fuel entry. Through ensureColumn, so a database where the ALTER cannot
// run still approves and rejects - just without keeping the reason.
var rejectionReason = ensureColumn(sqldb, 'fuel_entry', 'rejection_reason', 'TEXT DEFAULT NULL');

// Reference number generation is derived from MAX(c_id) inside fuel_entry rather
// than a separate counter table — this matches how mainvoucher_t / trips already
// mint their own c_numbers (see mainCtrl tripcreated). Concurrent submits could
// collide; the whole create flow runs inside a single connection/transaction to
// keep the window small, but MySQL isn't guaranteeing uniqueness — good enough
// for the traffic this endpoint sees, matches prior modules' behavior.
// Reference = F + the fuel date + a per-day sequence (see utils/refnumber),
// the voucher-number style; c_id stays the running row counter it always was.
function nextRefNumber(connection, fuelDate, cb) {
  connection.query('SELECT MAX(CAST(c_id AS UNSIGNED)) AS max_id FROM fuel_entry', function (err, rows) {
    if (err) return cb(err);
    var next = ((rows[0] && rows[0].max_id) || 0) + 1;
    refnum.nextRefNumber(connection, 'fuel_entry', 'F', fuelDate, function (err2, c_number) {
      if (err2) return cb(err2);
      cb(null, { c_id: next, c_number: c_number });
    });
  });
}

function insertSubtRows(connection, params, cb) {
  var { c_id, c_number, entry_by, user_id, vehicleNo, voucherdate, rows, accountType } = params;
  if (!rows || rows.length === 0) return cb(null);
  var sql = `INSERT INTO fuelentry_subt
    (parent_subgroup_id, parent_subchild_id, account_type, amount, child, staticname,
     district_id, mandal_name, mandal_id, subchildtwo, subchildtwo_id, expensives,
     village_id, i_ts, lastinsert_id, c_number, c_id, entry_by, user_id, vehicleNo,
     voucherdate, ledger_id, parent_grp_level, d_in, status, admin_status)
    VALUES ?`;
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  var values = rows.map(function (r) {
    var l = r.ledger || {};
    return [
      l.parent_subgroup_id || null,
      l.parent_subchild_id || null,
      accountType,
      String(r.amount || 0),
      l.child || null,
      l.staticname || null,
      l.district_id || null,
      l.mandal_name || null,
      l.mandal_id || null,
      l.subchildtwo || null,
      l.subchildtwo_id || null,
      l.temple_name || l.expensives || null,
      l.village_id || null,
      now,
      String(params.parent_id),
      c_number,
      c_id,
      entry_by || '',
      user_id || 0,
      vehicleNo || null,
      voucherdate || null,
      l.id ? String(l.id) : null,
      l.parent_grp_level || null,
      0, 0, 0,
    ];
  });
  connection.query(sql, [values], cb);
}

// Fuel entry create — single connection + transaction wraps: mint c_number,
// insert header, insert debit rows, insert credit rows, roll the bus odometer.
// Old backend did this via nested callbacks with no rollback — a mid-flight
// failure left orphan rows in fuelentry_subt.
exports.createFuelEntryMdl = function (data, callback) {
  sqldb.getConnection(function (err, connection) {
    if (err) return callback(err);
    connection.beginTransaction(function (err) {
      if (err) { connection.release(); return callback(err); }
      var rollback = function (e) { connection.rollback(function () { connection.release(); callback(e); }); };

      nextRefNumber(connection, data.date, function (err, ref) {
        if (err) return rollback(err);
        var now = moment().format('YYYY-MM-DD HH:mm:ss');
        var debitRows = data.patientsTstdts || [];
        var creditRows = data.creditaddrowdts || [];
        var debitSum = debitRows.reduce(function (s, r) { return s + Number(r.d_test_amount || 0); }, 0);
        var creditSum = creditRows.reduce(function (s, r) { return s + Number(r.creditamount || 0); }, 0);

        var headerSql = `INSERT INTO fuel_entry
          (date, vehicle_number, previous_odometer, present_odometer, quantity_filled,
           price_per_liter, total_bill, avg_kmpl, debit_account, credit_account,
           d_in, c_id, c_number, entry_by, user_id, kilometers, prev_odometer,
           admin_status, i_ts, issparetank, remarks)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        var headerVals = [
          data.date || null,
          data.vehicleNumber || null,
          String(data.previousOdometer || 0),
          String(data.presentOdometer || 0),
          String(data.qtyFilled || 0),
          String(data.pricePerLitre || 0),
          String(data.totalBill || 0),
          String(data.averageKMPL || 0),
          String(debitSum),
          String(creditSum),
          0,
          String(ref.c_id),
          ref.c_number,
          data.named || '',
          String(data.user_id || 0),
          String(data.kilometers || 0),
          String(data.previousOdometer || 0),
          0,
          now,
          0,
          data.remarks || null,
        ];
        connection.query(headerSql, headerVals, function (err, headerRes) {
          if (err) return rollback(err);
          var parentId = headerRes.insertId;
          var subtParams = {
            c_id: ref.c_id, c_number: ref.c_number,
            entry_by: data.named, user_id: data.user_id,
            vehicleNo: data.vehicleNumber, voucherdate: data.date,
            parent_id: parentId,
          };

          // debits first, then credits — order doesn't matter functionally, this
          // just mirrors old submitfuelentrydataCtrl call sequence so anything
          // reading fuelentry_subt ordered by id keeps the same layout.
          insertSubtRows(connection, Object.assign({}, subtParams, { rows: debitRows.map(function (r) { return { ledger: r.d_test_name, amount: r.d_test_amount }; }), accountType: 'Debit Account' }), function (err) {
            if (err) return rollback(err);
            insertSubtRows(connection, Object.assign({}, subtParams, { rows: creditRows.map(function (r) { return { ledger: r.creditledger, amount: r.creditamount }; }), accountType: 'Credit Account' }), function (err) {
              if (err) return rollback(err);
              // Roll bus odometer forward so the next fuel entry defaults to
              // this reading — matches old app step 4 of submit.
              connection.query(
                'UPDATE busses SET odometer = ? WHERE bus_no = ?',
                [String(data.presentOdometer || 0), data.vehicleNumber],
                function (err) {
                  if (err) return rollback(err);
                  connection.commit(function (err) {
                    if (err) return rollback(err);
                    connection.release();
                    callback(null, { id: parentId, c_number: ref.c_number });
                  });
                }
              );
            });
          });
        });
      });
    });
  });
};

// An approved or rejected entry is on the books (its ledger rows feed Ledger
// Wise once approved): editing or deleting it would re-insert those rows as
// pending and make the entry vanish from every ledger report while its header
// still read approved. The pages already hide Edit / Delete for such rows; the
// API refuses too, so nothing else can do it by accident.
var lockedError = function () { var e = new Error('Approved / rejected entries cannot be edited or deleted'); e.code = 'LOCKED'; return e; };
function whenFuelEntryOpen(id, callback, run) {
  sqldb.query('SELECT admin_status FROM fuel_entry WHERE id = ? AND d_in = 0', [Number(id)], function (err, rows) {
    if (err) return callback(err);
    if (rows.length && Number(rows[0].admin_status) !== 0) return callback(lockedError());
    run();
  });
}

exports.updateFuelEntryMdl = function (data, callback) {
  whenFuelEntryOpen(data.id, callback, function () { updateFuelEntryOpen(data, callback); });
};
function updateFuelEntryOpen(data, callback) {
  sqldb.getConnection(function (err, connection) {
    if (err) return callback(err);
    connection.beginTransaction(function (err) {
      if (err) { connection.release(); return callback(err); }
      var rollback = function (e) { connection.rollback(function () { connection.release(); callback(e); }); };

      var debitRows = data.patientsTstdts || [];
      var creditRows = data.creditaddrowdts || [];
      var debitSum = debitRows.reduce(function (s, r) { return s + Number(r.d_test_amount || 0); }, 0);
      var creditSum = creditRows.reduce(function (s, r) { return s + Number(r.creditamount || 0); }, 0);
      var now = moment().format('YYYY-MM-DD HH:mm:ss');

      var updateSql = `UPDATE fuel_entry SET
        date=?, vehicle_number=?, previous_odometer=?, present_odometer=?,
        quantity_filled=?, price_per_liter=?, total_bill=?, avg_kmpl=?,
        debit_account=?, credit_account=?, kilometers=?, prev_odometer=?,
        updatedid=?, updatedby=?, updated_date=?, remarks=?
        WHERE id=?`;
      var updateVals = [
        data.date || null, data.vehicleNumber || null,
        String(data.previousOdometer || 0), String(data.presentOdometer || 0),
        String(data.qtyFilled || 0), String(data.pricePerLitre || 0),
        String(data.totalBill || 0), String(data.averageKMPL || 0),
        String(debitSum), String(creditSum),
        String(data.kilometers || 0), String(data.previousOdometer || 0),
        Number(data.user_id || 0), data.named || '', now,
        data.remarks || null,
        Number(data.id),
      ];
      connection.query(updateSql, updateVals, function (err) {
        if (err) return rollback(err);
        // Soft-delete existing sub rows before re-inserting — same replace-all
        // pattern the voucher edit flow uses; simpler than diffing rows.
        connection.query('UPDATE fuelentry_subt SET d_in=1 WHERE lastinsert_id=?', [String(data.id)], function (err) {
          if (err) return rollback(err);
          var subtParams = {
            c_id: data.c_id, c_number: data.c_number,
            entry_by: data.named, user_id: data.user_id,
            vehicleNo: data.vehicleNumber, voucherdate: data.date,
            parent_id: data.id,
          };
          insertSubtRows(connection, Object.assign({}, subtParams, { rows: debitRows.map(function (r) { return { ledger: r.d_test_name, amount: r.d_test_amount }; }), accountType: 'Debit Account' }), function (err) {
            if (err) return rollback(err);
            insertSubtRows(connection, Object.assign({}, subtParams, { rows: creditRows.map(function (r) { return { ledger: r.creditledger, amount: r.creditamount }; }), accountType: 'Credit Account' }), function (err) {
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
  });
};

exports.deleteFuelEntryMdl = function (data, callback) {
  whenFuelEntryOpen(data.id, callback, function () {
    var now = moment().format('YYYY-MM-DD HH:mm:ss');
    sqldb.query(
      `UPDATE fuel_entry SET d_in=1, deletedby_id=?, deletedby_name=?, deletedby_date=? WHERE id=?;
       UPDATE fuelentry_subt SET d_in=1 WHERE lastinsert_id=?`,
      [String(data.user_id || 0), data.named || '', now, Number(data.id), String(data.id)],
      callback
    );
  });
};

exports.listFuelEntriesMdl = function (callback) {
  // Ledger names pulled from the subt rows so the list shows Dr/Cr next to each
  // entry without a modal — GROUP_CONCAT keeps multi-ledger entries readable.
  var sql = `
    SELECT fe.*,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Debit Account') AS debit_ledger_id,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Credit Account') AS credit_ledger_id
    FROM fuel_entry fe
    WHERE fe.d_in = 0
    ORDER BY fe.id DESC`;
  sqldb.query(sql, callback);
};

exports.searchFuelEntriesMdl = function (data, callback) {
  // admin_status is optional — omit for the Fuel Entry page's date-only search,
  // pass 1/2 for the Approved-Reports page's Approved/Rejected filter.
  var params = [data.fromdate, data.todate];
  var statusClause = '';
  if (data.admin_status !== undefined && data.admin_status !== null && data.admin_status !== '') {
    statusClause = ' AND fe.admin_status = ?';
    params.push(Number(data.admin_status));
  }
  var sql = `
    SELECT fe.*,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ') FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Debit Account') AS debit_ledger_id,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ') FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Credit Account') AS credit_ledger_id
    FROM fuel_entry fe
    WHERE fe.d_in = 0 AND fe.date BETWEEN ? AND ?${statusClause}
    ORDER BY fe.date DESC, fe.id DESC`;
  sqldb.query(sql, params, callback);
};

exports.updateFuelAdminStatusMdl = function (data, callback) {
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  // The reason travels with a rejection only; approving or reopening the
  // entry clears it, as it does on a voucher.
  var status = Number(data.admin_status);
  var reason = status === 2 ? String(data.rejection_reason || '') : '';
  var reasonSet = rejectionReason.present ? ', rejection_reason=?' : '';
  var reasonArg = rejectionReason.present ? [reason] : [];
  sqldb.query(
    `UPDATE fuel_entry SET admin_status=?, admin_status_byid=?, admin_status_byname=?, admin_status_bydate=?${reasonSet} WHERE id=?;
     UPDATE fuelentry_subt SET admin_status=? WHERE lastinsert_id=?`,
    [status, String(data.user_id || 0), data.named || '', now].concat(reasonArg, [Number(data.id),
     status, String(data.id)]),
    callback
  );
};

exports.getFuelAccountsMdl = function (data, callback) {
  sqldb.query(
    'SELECT * FROM fuelentry_subt WHERE lastinsert_id = ? AND d_in = 0 ORDER BY id ASC',
    [String(data.id)],
    callback
  );
};

// ── Fuel Target (per-bus) ────────────────────────────────────────────────
exports.listFuelTargetsMdl = function (callback) {
  sqldb.query(
    'SELECT * FROM fuel_target_bus WHERE d_in = 0 ORDER BY bus_no ASC',
    callback
  );
};

// Submit soft-deletes any existing active target for the same bus + period
// before inserting the new one — guarantees a single active target per bus
// without needing a unique constraint (soft-deleted history rows would break
// a UNIQUE anyway).
exports.submitFuelTargetMdl = function (data, callback) {
  sqldb.getConnection(function (err, connection) {
    if (err) return callback(err);
    connection.beginTransaction(function (err) {
      if (err) { connection.release(); return callback(err); }
      var rollback = function (e) { connection.rollback(function () { connection.release(); callback(e); }); };
      var period = data.period || 'monthly';
      connection.query(
        'UPDATE fuel_target_bus SET d_in = 1 WHERE bus_no = ? AND period = ? AND d_in = 0',
        [data.bus_no, period],
        function (err) {
          if (err) return rollback(err);
          connection.query(
            `INSERT INTO fuel_target_bus (bus_no, target_liters, period, entry_by, user_id)
             VALUES (?, ?, ?, ?, ?)`,
            [data.bus_no, Number(data.target_liters), period, data.named || '', Number(data.user_id || 0)],
            function (err, result) {
              if (err) return rollback(err);
              connection.commit(function (err) {
                if (err) return rollback(err);
                connection.release();
                callback(null, { id: result.insertId });
              });
            }
          );
        }
      );
    });
  });
};

exports.updateFuelTargetMdl = function (data, callback) {
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  sqldb.query(
    `UPDATE fuel_target_bus SET bus_no = ?, target_liters = ?, period = ?,
       updatedby = ?, updatedid = ?, updated_at = ?
     WHERE id = ? AND d_in = 0`,
    [data.bus_no, Number(data.target_liters), data.period || 'monthly',
     data.named || '', Number(data.user_id || 0), now, Number(data.id)],
    callback
  );
};

// Fuel station dropdown — distinct ledger names across BOTH debit and credit
// sides of past fuel entries. Some orgs put the station on the debit side
// ("Fuel - Reliance"), others on the credit side ("Reliance Petrol Bunk");
// unioning both means neither convention gets hidden.
exports.listFuelStationsMdl = function (callback) {
  sqldb.query(
    `SELECT DISTINCT expensives FROM fuelentry_subt
     WHERE d_in = 0 AND expensives IS NOT NULL AND expensives <> ''
     ORDER BY expensives ASC`,
    callback
  );
};

// Top Performers: per-entry rows ranked by that entry's avg_kmpl (matches the
// old Angular layout which used per-fill rows, not per-bus aggregation). Driver
// names are derived from trip_created on (bus + date) so the "Paired Driver"
// column has real data. Entries without recorded kilometers are excluded since
// their KMPL would be 0 and skew the ranking.
exports.listTopPerformersReportMdl = function (data, callback) {
  var sql = `
    SELECT fe.id, fe.c_number, fe.date, fe.vehicle_number AS bus_no,
           fe.kilometers, fe.quantity_filled, fe.price_per_liter,
           fe.total_bill, fe.avg_kmpl, fe.admin_status,
      (SELECT GROUP_CONCAT(DISTINCT driver1_name SEPARATOR ', ')
         FROM trip_created tc
         WHERE tc.d_in = 0 AND tc.bus_no = fe.vehicle_number AND tc.trip_date = fe.date
           AND driver1_name IS NOT NULL AND driver1_name <> '') AS driver1,
      (SELECT GROUP_CONCAT(DISTINCT driver2_name SEPARATOR ', ')
         FROM trip_created tc
         WHERE tc.d_in = 0 AND tc.bus_no = fe.vehicle_number AND tc.trip_date = fe.date
           AND driver2_name IS NOT NULL AND driver2_name <> '') AS driver2
    FROM fuel_entry fe
    WHERE fe.d_in = 0
      AND fe.date BETWEEN ? AND ?
      AND CAST(fe.kilometers AS DECIMAL(12,2)) > 0
      AND CAST(fe.quantity_filled AS DECIMAL(12,2)) > 0
    ORDER BY CAST(fe.avg_kmpl AS DECIMAL(10,2)) DESC, fe.date DESC`;
  sqldb.query(sql, [data.fromdate, data.todate], callback);
};

// Target Report: per-bus consumption over a date range compared to the bus's
// current monthly target. Buses with neither a target nor any consumption in
// the range are excluded so the report only lists rows that actually matter.
// Optional bus filter narrows to a single bus. Consumption is a subquery so
// the JOIN cardinality stays 1:1 with busses.
exports.listTargetReportMdl = function (data, callback) {
  var params = [data.fromdate, data.todate];
  var busClause = '';
  if (data.bus_no && data.bus_no.trim() !== '') {
    busClause = ' AND b.bus_no = ?';
    params.push(data.bus_no);
  }
  var sql = `
    SELECT
      b.bus_no,
      t.target_liters,
      t.period,
      COALESCE(agg.consumed, 0) AS consumed_liters,
      COALESCE(agg.fills, 0) AS fill_count,
      COALESCE(agg.total_bill, 0) AS total_bill
    FROM busses b
    LEFT JOIN fuel_target_bus t
      ON t.bus_no = b.bus_no AND t.d_in = 0 AND t.period = 'monthly'
    LEFT JOIN (
      SELECT vehicle_number,
             SUM(quantity_filled) AS consumed,
             COUNT(*) AS fills,
             SUM(total_bill) AS total_bill
      FROM fuel_entry
      WHERE d_in = 0 AND date BETWEEN ? AND ?
      GROUP BY vehicle_number
    ) agg ON agg.vehicle_number = b.bus_no
    WHERE b.d_in = 0
      AND (t.id IS NOT NULL OR agg.consumed > 0)${busClause}
    ORDER BY b.bus_no ASC`;
  sqldb.query(sql, params, callback);
};

// Driver dropdown source — driver_register is the master table. We removed
// driver1/driver2 from fuel_entry, so this list drives the report filter
// rather than being derived from prior fuel entries.
exports.listDriversMdl = function (callback) {
  sqldb.query(
    `SELECT id, driver_name FROM driver_register
     WHERE d_in = 0 AND driver_name IS NOT NULL AND driver_name <> ''
     ORDER BY driver_name ASC`,
    callback
  );
};

// Driver Wise report: since fuel_entry has no driver column, driver
// attribution is *derived* from trip_created — whoever was on that bus on that
// day. GROUP_CONCAT (not a single JOIN row) so multiple trips in a day surface
// all drivers; the caller sees the ambiguity instead of us silently picking
// one. Driver filter uses EXISTS so multi-trip days still match when any
// trip matches the filter.
exports.listDriverWiseReportMdl = function (data, callback) {
  var params = [data.fromdate, data.todate];
  // Always require at least one driver on the matched trip — otherwise a Driver
  // Wise report would list fuel entries with blank driver columns, which is
  // meaningless. When a specific driver is picked, the clause tightens to
  // match that driver exactly.
  var driverClause;
  if (data.driver_name && data.driver_name.trim() !== '') {
    driverClause = ` AND EXISTS (
      SELECT 1 FROM trip_created tc
      WHERE tc.d_in = 0 AND tc.bus_no = fe.vehicle_number AND tc.trip_date = fe.date
      AND (tc.driver1_name = ? OR tc.driver2_name = ?)
    )`;
    params.push(data.driver_name, data.driver_name);
  } else {
    driverClause = ` AND EXISTS (
      SELECT 1 FROM trip_created tc
      WHERE tc.d_in = 0 AND tc.bus_no = fe.vehicle_number AND tc.trip_date = fe.date
      AND ((tc.driver1_name IS NOT NULL AND tc.driver1_name <> '')
        OR (tc.driver2_name IS NOT NULL AND tc.driver2_name <> ''))
    )`;
  }
  var sql = `
    SELECT fe.id, fe.c_number, fe.date, fe.vehicle_number,
           fe.quantity_filled, fe.price_per_liter, fe.total_bill,
           fe.avg_kmpl, fe.kilometers, fe.admin_status, fe.remarks,
      (SELECT GROUP_CONCAT(DISTINCT driver1_name SEPARATOR ', ')
         FROM trip_created tc
         WHERE tc.d_in = 0 AND tc.bus_no = fe.vehicle_number AND tc.trip_date = fe.date
           AND driver1_name IS NOT NULL AND driver1_name <> '') AS driver1,
      (SELECT GROUP_CONCAT(DISTINCT driver2_name SEPARATOR ', ')
         FROM trip_created tc
         WHERE tc.d_in = 0 AND tc.bus_no = fe.vehicle_number AND tc.trip_date = fe.date
           AND driver2_name IS NOT NULL AND driver2_name <> '') AS driver2,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Credit Account') AS fuel_station,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Debit Account') AS debit_ledger
    FROM fuel_entry fe
    WHERE fe.d_in = 0
      AND fe.date BETWEEN ? AND ?${driverClause}
    ORDER BY fe.date ASC, fe.id ASC`;
  sqldb.query(sql, params, callback);
};

// Bus Wise report: fuel entries in a date range for a single bus (optional —
// omit for all buses). LEFT JOIN on credit subt so entries without a credit
// row still appear (data hygiene issue but shouldn't hide the entry).
exports.listBusWiseReportMdl = function (data, callback) {
  var params = [data.fromdate, data.todate];
  var busClause = '';
  if (data.ledger_name && data.ledger_name.trim() !== '') {
    busClause = ' AND fe.vehicle_number = ?';
    params.push(data.ledger_name);
  }
  var sql = `
    SELECT fe.id, fe.c_number, fe.date, fe.vehicle_number,
           fe.quantity_filled, fe.price_per_liter, fe.total_bill,
           fe.avg_kmpl, fe.previous_odometer, fe.present_odometer,
           fe.kilometers, fe.admin_status, fe.remarks,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Credit Account') AS fuel_station,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Debit Account') AS debit_ledger
    FROM fuel_entry fe
    WHERE fe.d_in = 0
      AND fe.date BETWEEN ? AND ?${busClause}
    ORDER BY fe.date ASC, fe.id ASC`;
  sqldb.query(sql, params, callback);
};

// Station Wise report: fuel entries in a date range, optionally filtered by a
// ledger name matching *either* the debit or credit side (the "fuel station"
// dropdown now unions both). Filter uses EXISTS so an entry with the ledger on
// either side still matches without duplicating the row via a JOIN.
exports.listStationWiseReportMdl = function (data, callback) {
  var params = [data.fromdate, data.todate];
  var stationClause = '';
  if (data.ledger_name && data.ledger_name.trim() !== '') {
    stationClause = ` AND EXISTS (
      SELECT 1 FROM fuelentry_subt s
      WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.expensives = ?
    )`;
    params.push(data.ledger_name);
  }
  var sql = `
    SELECT fe.id, fe.c_number, fe.date, fe.vehicle_number,
           fe.quantity_filled, fe.price_per_liter, fe.total_bill,
           fe.avg_kmpl, fe.admin_status, fe.remarks,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Debit Account') AS debit_ledger,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Credit Account') AS credit_ledger
    FROM fuel_entry fe
    WHERE fe.d_in = 0
      AND fe.date BETWEEN ? AND ?${stationClause}
    ORDER BY fe.date ASC, fe.id ASC`;
  sqldb.query(sql, params, callback);
};

// Day Wise report: fuel entries for a single date, with the credit-side ledger
// surfaced as "Fuel Station" (matches the old Angular column). The subquery
// concatenates when an entry has multiple credit rows, though the usual case
// is exactly one row so the concat is a no-op.
exports.listDayWiseReportMdl = function (data, callback) {
  var sql = `
    SELECT fe.id, fe.c_number, fe.date, fe.vehicle_number,
           fe.quantity_filled, fe.price_per_liter, fe.total_bill,
           fe.avg_kmpl, fe.present_odometer, fe.previous_odometer, fe.kilometers,
           fe.admin_status, fe.remarks,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Credit Account') AS fuel_station,
      (SELECT GROUP_CONCAT(expensives SEPARATOR ', ')
         FROM fuelentry_subt s
         WHERE s.lastinsert_id = fe.id AND s.d_in = 0 AND s.account_type = 'Debit Account') AS debit_ledger
    FROM fuel_entry fe
    WHERE fe.d_in = 0 AND fe.date = ?
    ORDER BY fe.vehicle_number ASC, fe.id ASC`;
  sqldb.query(sql, [data.fromdate], callback);
};

exports.deleteFuelTargetMdl = function (data, callback) {
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  sqldb.query(
    'UPDATE fuel_target_bus SET d_in = 1, updatedby = ?, updatedid = ?, updated_at = ? WHERE id = ?',
    [data.named || '', Number(data.user_id || 0), now, Number(data.id)],
    callback
  );
};
