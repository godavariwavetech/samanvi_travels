var sqldb = require("../config/dbconnect");
var dbutil = require(appRoot + "/utils/assets_dbutils");
var moment = require("moment");

// Garage approval workflow schema migration (runs once on startup)
(function initGarageWorkflow() {
  sqldb.query(`CREATE TABLE IF NOT EXISTS job_approval_stages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_card_id INT NOT NULL,
    job_card_number VARCHAR(30),
    stage VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    action_by_id INT DEFAULT 0,
    action_by_name VARCHAR(255) DEFAULT '',
    action_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    d_in INT DEFAULT 0
  )`, function (err) { if (err) console.log('[DB] job_approval_stages init:', err.message) });
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_jobs' AND COLUMN_NAME = 'current_stage'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE vehicle_jobs ADD COLUMN current_stage VARCHAR(50) DEFAULT 'open'`, function (err) {
        if (err) console.log('[DB] current_stage migration:', err.message);
        else console.log('[DB] current_stage column added to vehicle_jobs');
      });
    }
  });
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_jobs' AND COLUMN_NAME = 'job_date'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE vehicle_jobs ADD COLUMN job_date DATE DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] job_date migration:', err.message);
        else console.log('[DB] job_date column added to vehicle_jobs');
      });
    }
  });
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_jobs' AND COLUMN_NAME = 'created_by'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE vehicle_jobs ADD COLUMN created_by VARCHAR(255) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] created_by migration:', err.message);
        else console.log('[DB] created_by column added to vehicle_jobs');
      });
    }
  });
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_jobs' AND COLUMN_NAME = 'finish_remarks'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE vehicle_jobs ADD COLUMN finish_remarks TEXT DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] finish_remarks migration:', err.message);
        else console.log('[DB] finish_remarks column added to vehicle_jobs');
      });
    }
  });
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_jobs' AND COLUMN_NAME = 'approval_remarks'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE vehicle_jobs ADD COLUMN approval_remarks TEXT DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] approval_remarks migration:', err.message);
        else console.log('[DB] approval_remarks column added to vehicle_jobs');
      });
    }
  });
  // Create parts_price_history table if it doesn't exist
  sqldb.query(`CREATE TABLE IF NOT EXISTS parts_price_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    part_id INT NOT NULL,
    old_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    new_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    d_in TINYINT DEFAULT 0
  )`, function(err){ if(err) console.log('[DB] parts_price_history init:', err.message); else console.log('[DB] parts_price_history ready'); });
  // Seed garage workflow sub-modules for the permissions module (id=200,201 to avoid conflicts)
  sqldb.query(`INSERT IGNORE INTO sub_modules (id,title,path,module_id,module_order,d_in) VALUES (200,'Job Approval','/garage/repairtracking',19,5,0)`, function(err){ if(err) console.log('[DB] Job Approval sub_module:', err.message); });
  sqldb.query(`INSERT IGNORE INTO sub_modules (id,title,path,module_id,module_order,d_in) VALUES (201,'Job Completion','/garage/repairtracking',19,6,0)`, function(err){ if(err) console.log('[DB] Job Completion sub_module:', err.message); });
  // Repeat-job traceability columns
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vehicle_jobs' AND COLUMN_NAME='parent_job_card_id'`, function(err, rows){
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE vehicle_jobs ADD COLUMN parent_job_card_id INT DEFAULT NULL, ADD COLUMN parent_job_card_number VARCHAR(30) DEFAULT NULL, ADD COLUMN insertion_type VARCHAR(30) DEFAULT NULL`, function(e){ console.log(e ? '[DB] parent cols err:'+e.message : '[DB] parent_job_card cols added'); });
    }
  });
  // Hire Bus + extended vehicle detail columns
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='busses' AND COLUMN_NAME='bus_category'`, function(err, rows){
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE busses
        ADD COLUMN bus_category VARCHAR(20) DEFAULT 'normal',
        ADD COLUMN luxury_type VARCHAR(20) DEFAULT NULL,
        ADD COLUMN seating_capacity INT DEFAULT NULL,
        ADD COLUMN chassis_make VARCHAR(100) DEFAULT NULL,
        ADD COLUMN body_made VARCHAR(100) DEFAULT NULL,
        ADD COLUMN chassis_model VARCHAR(100) DEFAULT NULL,
        ADD COLUMN mfg_year VARCHAR(10) DEFAULT NULL,
        ADD COLUMN reg_date DATE DEFAULT NULL`, function(e){
        if (e) { console.log('[DB] busses hire-bus cols err:'+e.message); return; }
        console.log('[DB] busses hire-bus cols added');
        sqldb.query(`UPDATE busses SET bus_category='spare' WHERE issparetank=1`, function(e2){ if (e2) console.log('[DB] busses bus_category backfill err:'+e2.message); });
      });
    }
  });
  // Sold Out / Service Out description — service_out_date already existed as a plain
  // form field with no way to say *why*; this backs the new Service Out / Reactivate flow.
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='busses' AND COLUMN_NAME='service_out_reason'`, function(err, rows){
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE busses ADD COLUMN service_out_reason VARCHAR(255) DEFAULT NULL`, function(e){
        if (e) { console.log('[DB] busses service_out_reason col err:'+e.message); return; }
        console.log('[DB] busses service_out_reason col added');
      });
    }
  });
  // Seating Capacity master (predefined dropdown values for Add Bus form)
  sqldb.query(`CREATE TABLE IF NOT EXISTS seating_capacities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    capacity INT NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){ if(err) console.log('[DB] seating_capacities init:', err.message); else console.log('[DB] seating_capacities ready'); });
  // Chassis Model master (predefined dropdown values for Add Bus form)
  sqldb.query(`CREATE TABLE IF NOT EXISTS chassis_models (
    id INT PRIMARY KEY AUTO_INCREMENT,
    model_name VARCHAR(100) NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){ if(err) console.log('[DB] chassis_models init:', err.message); else console.log('[DB] chassis_models ready'); });
  // Body Builder master (predefined dropdown values for the Bus master's "Body Made" field) —
  // this master was missing entirely; the field silently reused the vehicle_companies (chassis
  // manufacturer) master instead, which is a different real-world category from who built the body.
  sqldb.query(`CREATE TABLE IF NOT EXISTS body_builders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    builder_name VARCHAR(100) NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){
    if (err) { console.log('[DB] body_builders init:', err.message); return; }
    console.log('[DB] body_builders ready');
    sqldb.query(`SELECT COUNT(*) as cnt FROM body_builders`, function(cErr, rows){
      if (!cErr && rows && rows[0].cnt === 0) {
        sqldb.query(`INSERT INTO body_builders (builder_name) VALUES ('MG Veera')`, function(sErr){
          if (sErr) console.log('[DB] body_builders seed err:', sErr.message); else console.log('[DB] body_builders seeded');
        });
      }
    });
  });
  // Luxury Type master (predefined dropdown values for Add Bus form)
  sqldb.query(`CREATE TABLE IF NOT EXISTS luxury_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){
    if (err) { console.log('[DB] luxury_types init:', err.message); return; }
    console.log('[DB] luxury_types ready');
    sqldb.query(`SELECT COUNT(*) as cnt FROM luxury_types`, function(cErr, rows){
      if (!cErr && rows && rows[0].cnt === 0) {
        sqldb.query(`INSERT INTO luxury_types (type_name) VALUES ('AC'), ('Non AC')`, function(sErr){
          if (sErr) console.log('[DB] luxury_types seed err:', sErr.message); else console.log('[DB] luxury_types seeded');
        });
      }
    });
  });
  // Mfg Year master (predefined dropdown values for Add Bus form)
  sqldb.query(`CREATE TABLE IF NOT EXISTS mfg_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year_value INT NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){
    if (err) { console.log('[DB] mfg_years init:', err.message); return; }
    console.log('[DB] mfg_years ready');
    sqldb.query(`SELECT COUNT(*) as cnt FROM mfg_years`, function(cErr, rows){
      if (!cErr && rows && rows[0].cnt === 0) {
        var currentYear = new Date().getFullYear();
        var values = [];
        for (var y = currentYear; y >= 1990; y--) values.push(`(${y})`);
        sqldb.query(`INSERT INTO mfg_years (year_value) VALUES ${values.join(',')}`, function(sErr){
          if (sErr) console.log('[DB] mfg_years seed err:', sErr.message); else console.log('[DB] mfg_years seeded');
        });
      }
    });
  });
  // City List master (Service No form: From/To boarding-city dropdowns)
  sqldb.query(`CREATE TABLE IF NOT EXISTS city_list (
    id INT PRIMARY KEY AUTO_INCREMENT,
    city_name VARCHAR(100) NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){ if(err) console.log('[DB] city_list init:', err.message); else console.log('[DB] city_list ready'); });
  // Boarding Points master (Service No form: start/end boarding point dropdowns)
  sqldb.query(`CREATE TABLE IF NOT EXISTS boarding_points (
    id INT PRIMARY KEY AUTO_INCREMENT,
    point_name VARCHAR(100) NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){ if(err) console.log('[DB] boarding_points init:', err.message); else console.log('[DB] boarding_points ready'); });
  // Bus Operator master
  sqldb.query(`CREATE TABLE IF NOT EXISTS bus_operators (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operator_name VARCHAR(100) NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){ if(err) console.log('[DB] bus_operators init:', err.message); else console.log('[DB] bus_operators ready'); });
  // Line Code master (Service No form)
  sqldb.query(`CREATE TABLE IF NOT EXISTS line_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    line_code VARCHAR(50) NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){ if(err) console.log('[DB] line_codes init:', err.message); else console.log('[DB] line_codes ready'); });
  // Route ID master (Service No form)
  sqldb.query(`CREATE TABLE IF NOT EXISTS route_ids (
    id INT PRIMARY KEY AUTO_INCREMENT,
    route_id_name VARCHAR(50) NOT NULL,
    d_in TINYINT DEFAULT 0
  )`, function(err){ if(err) console.log('[DB] route_ids init:', err.message); else console.log('[DB] route_ids ready'); });
  // Service Route (driverone) — Line Code / Route ID / Boarding Point + time columns
  [
    ['line_code', "VARCHAR(50) DEFAULT NULL"],
    ['route_id', "VARCHAR(50) DEFAULT NULL"],
    ['start_boarding_point', "VARCHAR(100) DEFAULT NULL"],
    ['start_boarding_time', "VARCHAR(10) DEFAULT NULL"],
    ['end_boarding_point', "VARCHAR(100) DEFAULT NULL"],
    ['end_boarding_time', "VARCHAR(10) DEFAULT NULL"],
    ['vehicle_type', "VARCHAR(10) DEFAULT 'bus'"],
    ['bus_operator_id', "TEXT DEFAULT NULL"],
    ['bus_operator_name', "TEXT DEFAULT NULL"],
    ['trip_type', "VARCHAR(30) DEFAULT NULL"],
  ].forEach(function (col) {
    var colName = col[0], colDef = col[1];
    sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driverone' AND COLUMN_NAME = '${colName}'`, function (err, rows) {
      if (!err && rows && rows.length === 0) {
        sqldb.query(`ALTER TABLE driverone ADD COLUMN ${colName} ${colDef}`, function (err) {
          if (err) console.log('[DB] driverone.' + colName + ' migration:', err.message);
          else console.log('[DB] driverone.' + colName + ' column added');
        });
      }
    });
  });
  // Trip Created — run status (Running/Halt), separate from the existing `status`
  // column which already means "converted to an expense entry" (see mainModel.js
  // trip_created update calls that set status='1').
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trip_created' AND COLUMN_NAME = 'trip_run_status'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE trip_created ADD COLUMN trip_run_status VARCHAR(20) DEFAULT 'Running'`, function (err) {
        if (err) console.log('[DB] trip_created.trip_run_status migration:', err.message);
        else console.log('[DB] trip_created.trip_run_status column added');
      });
    }
  });
  // Trip Creation ledger wiring — Paid-To advance / Van hirer receivable vouchers.
  // phone_number on mainmasterssubchildtwo lets a Van hirer's ledger be found again
  // by phone on a repeat booking (temple_name-only dedupe would create a duplicate
  // ledger for the same person spelled differently the second time).
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mainmasterssubchildtwo' AND COLUMN_NAME = 'phone_number'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE mainmasterssubchildtwo ADD COLUMN phone_number VARCHAR(10) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] mainmasterssubchildtwo.phone_number migration:', err.message);
        else console.log('[DB] mainmasterssubchildtwo.phone_number column added');
      });
    }
  });
  // The hire-bus owner's ledger, chosen on the Bus Masters "Hire Bus" form.
  // VARCHAR rather than INT on purpose: updatebusnumber quotes every value into
  // its SET clause, so an unset id arrives as '' and a strict server rejects
  // that for an integer column - the same trap that broke expense filing.
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'busses' AND COLUMN_NAME = 'owner_ledger_id'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE busses ADD COLUMN owner_ledger_id VARCHAR(20) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] busses.owner_ledger_id migration:', err.message);
        else console.log('[DB] busses.owner_ledger_id column added');
      });
    }
  });
  // Legacy: Halt Beta started as a per-service-number rate on driverone. It is now
  // one company-wide amount in app_settings (see below) and nothing reads or
  // writes this column any more; the migration stays so older rows keep loading.
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driverone' AND COLUMN_NAME = 'halt_beta'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE driverone ADD COLUMN halt_beta VARCHAR(50) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] driverone.halt_beta migration:', err.message);
        else console.log('[DB] driverone.halt_beta column added');
      });
    }
  });
  // Halt Beta is a single company-wide amount, not a per-service-number rate, so
  // it lives in app_settings under the key 'halt_beta' rather than on driverone.
  // Generic key/value table so later one-off settings need no new migration.
  sqldb.query(`CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
    setting_value VARCHAR(255) DEFAULT NULL,
    updated_by VARCHAR(100) DEFAULT NULL,
    updated_userid VARCHAR(20) DEFAULT NULL,
    u_ts DATETIME DEFAULT NULL
  )`, function (err) {
    if (err) console.log('[DB] app_settings migration:', err.message);
  });
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driver_register' AND COLUMN_NAME = 'driver_type'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE driver_register ADD COLUMN driver_type VARCHAR(30) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] driver_register.driver_type migration:', err.message);
        else console.log('[DB] driver_register.driver_type column added');
      });
    }
  });
  // ledger_id links a registered person to the Payables ledger auto-created for
  // them. adddriverMdl/addstaffMdl/addhelperMdl write it, and the edit path uses
  // it to decide between renaming an existing ledger and backfilling a missing
  // one — but nothing ever created the column, so on a database seeded from the
  // production dump those writes fail with "Unknown column" and are swallowed by
  // the ignore-everything callbacks around them. Add it wherever it is absent.
  ['staff_register', 'driver_register', 'helper_register'].forEach(function (tbl) {
    sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'ledger_id'`, [tbl], function (err, rows) {
      if (!err && rows && rows.length === 0) {
        sqldb.query(`ALTER TABLE \`${tbl}\` ADD COLUMN ledger_id INT DEFAULT NULL`, function (err) {
          if (err) console.log('[DB] ' + tbl + '.ledger_id migration:', err.message);
          else console.log('[DB] ' + tbl + '.ledger_id column added');
        });
      }
    });
  });
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trip_created' AND COLUMN_NAME = 'voucher_number'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE trip_created ADD COLUMN voucher_number VARCHAR(30) DEFAULT NULL, ADD COLUMN hirer_ledger_id INT DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] trip_created.voucher_number/hirer_ledger_id migration:', err.message);
        else console.log('[DB] trip_created.voucher_number/hirer_ledger_id columns added');
      });
    }
  });
  // Trip Creation Bus/Van toggle — bulkCreateTripsMdl writes vehicle_type/line_code
  // for every row plus hirer_name/booking_amount for Van rows; these were never
  // added to this auto-migration file when that feature landed.
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trip_created' AND COLUMN_NAME = 'vehicle_type'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE trip_created
        ADD COLUMN vehicle_type VARCHAR(10) DEFAULT 'bus',
        ADD COLUMN line_code VARCHAR(50) DEFAULT NULL,
        ADD COLUMN hirer_name VARCHAR(255) DEFAULT NULL,
        ADD COLUMN booking_amount DECIMAL(12,2) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] trip_created.vehicle_type/line_code/hirer_name/booking_amount migration:', err.message);
        else console.log('[DB] trip_created.vehicle_type/line_code/hirer_name/booking_amount columns added');
      });
    }
  });
  // Opting driver/helper — a separate relief person (own ledger) assignable per
  // Driver1/Driver2/Helper slot on the Daily Trip Sheet, distinct from driverone's
  // route-level optDriver/optHelper *rate* columns. Selecting one is itself the
  // "opting" signal (replaces the old unwired optreg checkbox flag).
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trip_created' AND COLUMN_NAME = 'opt_driver1_id'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE trip_created
        ADD COLUMN opt_driver1_id INT DEFAULT NULL,
        ADD COLUMN opt_driver1_name VARCHAR(255) DEFAULT NULL,
        ADD COLUMN opt_driver2_id INT DEFAULT NULL,
        ADD COLUMN opt_driver2_name VARCHAR(255) DEFAULT NULL,
        ADD COLUMN opt_helper_id INT DEFAULT NULL,
        ADD COLUMN opt_helper_name VARCHAR(255) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] trip_created.opt_driver1_id/etc migration:', err.message);
        else console.log('[DB] trip_created.opt_driver1_id/etc columns added');
      });
    }
  });
  // Per-person "pay directly" flags ticked on the Trip Creation grid. They decide
  // which "Pay <name>" checkboxes come up already ticked in the Trip Expenses
  // modal — i.e. whose beta goes to their own ledger instead of falling through
  // to Paid To. Only the four roles that have a checkbox at creation time; the
  // opting people are never pre-ticked because that grid has no toggle for them.
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trip_created' AND COLUMN_NAME = 'driver1_paid_direct'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      // trip_created sits exactly on MariaDB's 8126-byte inline row limit — not
      // even one TINYINT can be added until something moves off-page (verified:
      // a single probe column fails with "Row size too large"). optreg/optreg1/
      // optreg2 are the dead legacy per-role "opting" flags, superseded by the
      // opt_driverX_id columns and written as NULL by every current insert, so
      // widening those three to TEXT frees the room without touching a column
      // anything still reads. Runs first, and only inside this one-time guard.
      sqldb.query(`ALTER TABLE trip_created
        MODIFY COLUMN optreg TEXT DEFAULT NULL,
        MODIFY COLUMN optreg1 TEXT DEFAULT NULL,
        MODIFY COLUMN optreg2 TEXT DEFAULT NULL`, function (convErr) {
        if (convErr) console.log('[DB] trip_created.optreg TEXT conversion:', convErr.message);
        sqldb.query(`ALTER TABLE trip_created
          ADD COLUMN driver1_paid_direct TINYINT(1) DEFAULT 0,
          ADD COLUMN driver2_paid_direct TINYINT(1) DEFAULT 0,
          ADD COLUMN helper_paid_direct TINYINT(1) DEFAULT 0,
          ADD COLUMN conductor_paid_direct TINYINT(1) DEFAULT 0`, function (err) {
          if (err) console.log('[DB] trip_created.driverX_paid_direct migration:', err.message);
          else console.log('[DB] trip_created.driverX_paid_direct columns added');
        });
      });
    }
  });
  // Same opting-person columns on tripexpenses_data (denormalized copy carried
  // through at filing time), plus parking_amt — a snapshot of the service's
  // driverone.parkingAmount at the moment the expense was filed, so it survives
  // even if the service route's parking amount changes later.
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tripexpenses_data' AND COLUMN_NAME = 'opt_driver1_id'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE tripexpenses_data
        ADD COLUMN opt_driver1_id INT DEFAULT NULL,
        ADD COLUMN opt_driver1_name VARCHAR(255) DEFAULT NULL,
        ADD COLUMN opt_driver2_id INT DEFAULT NULL,
        ADD COLUMN opt_driver2_name VARCHAR(255) DEFAULT NULL,
        ADD COLUMN opt_helper_id INT DEFAULT NULL,
        ADD COLUMN opt_helper_name VARCHAR(255) DEFAULT NULL,
        ADD COLUMN parking_amt DECIMAL(12,2) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] tripexpenses_data.opt_driver1_id/etc/parking_amt migration:', err.message);
        else console.log('[DB] tripexpenses_data.opt_driver1_id/etc/parking_amt columns added');
      });
    }
  });
  // "Bus Operating Driver" and "Salaried Driver" used to be seeded as separate
  // Payables containers. Every driver now files under the single "Drivers"
  // container regardless of how they are paid, so those two are retired here:
  // anything still parked under them is moved to Drivers first (never orphaned),
  // then the empty container is soft-deleted. Idempotent — once they are gone
  // the lookup finds nothing and this does nothing.
  ['Bus Operating Driver', 'Salaried Driver'].forEach(function (label) {
    sqldb.query(`SELECT id FROM mainmasterssubchild WHERE parent_subgroup_id = 5 AND temple_name = ? AND d_in = 0 LIMIT 1`, [label], function (err, rows) {
      if (err || !rows || rows.length === 0) return;
      var staleId = rows[0].id;
      sqldb.query(`SELECT id FROM mainmasterssubchild WHERE parent_subgroup_id = 5 AND temple_name = 'Drivers' AND d_in = 0 LIMIT 1`, function (err, driverRows) {
        if (err || !driverRows || driverRows.length === 0) return; // Drivers seeded below; retry next boot
        var driversId = driverRows[0].id;
        sqldb.query(`UPDATE mainmasterssubchildtwo SET subchildtwo = 'Drivers', subchildtwo_id = ?, parent_subchild_id = ? WHERE d_in = 0 AND (subchildtwo = ? OR subchildtwo_id = ?)`, [driversId, driversId, label, staleId], function (err, res) {
          if (err) return console.log('[DB] ' + label + ' ledger move:', err.message);
          if (res && res.affectedRows) console.log('[DB] moved ' + res.affectedRows + ' ledger(s) from ' + label + ' to Drivers');
          sqldb.query(`UPDATE mainmasterssubchild SET d_in = 1 WHERE id = ?`, [staleId], function (err) {
            if (err) console.log('[DB] ' + label + ' container retire:', err.message);
            else console.log('[DB] ' + label + ' ledger container retired');
          });
        });
      });
    });
  });
  sqldb.query(`SELECT id FROM mainmasterssubchild WHERE parent_subgroup_id = 3 AND temple_name = 'Hirers' AND d_in = 0 LIMIT 1`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`INSERT INTO mainmasterssubchild (parent_subgroup_id, district_id, staticentry, mandal_id, mandal_name, village_id, temple_name, child, level_depth, has_ledgers, can_add_subgroups, is_grp_ledger, d_in) VALUES (3, '1', 'ASSETS', '2', '2) CURRENT ASSETS', 3, 'Hirers', 'b) Receivables', 4, 0, 1, 0, 0)`, function (err) {
        if (err) console.log('[DB] Hirers container seed:', err.message);
        else console.log('[DB] Hirers ledger container seeded');
      });
    }
  });
  // Drivers / Staff / Helpers — the three containers every registered person
  // files under. They predate this app's migration system (they shipped as part
  // of the original seed data), so there was never a startup check ensuring they
  // exist. Confirmed missing on at least one live deployment (Helpers) even
  // though local dev had it, and "Drivers" had no guard at all — so guard all
  // three, and ensurePersonLedger("Drivers"/"Staff"/"Helpers", ...) can never
  // fail with "No container found under Payables" regardless of the DB's history.
  // Trip expense ledgers — the DEBIT side of a filed trip expense. These are the
  // ledgers the old Angular screen posted to (addAutoDebitSalaryAndBeta hardcodes
  // Salaries and Betas), but they live in that app's older database: the dump this
  // deployment was seeded from carries only Diesel and Mechanical Works & Spares
  // under EXPENSES, so the names resolve to nothing here and the Trip Expenses
  // modal reports "Ledger not found".
  //
  // Seeded under their original homes and with their original names — Salaries and
  // Betas under 3) Employee Benefit Expenses, Parking under 2) Operating And Direct
  // Expenses — at level 2, directly under the group, which is how this app stores a
  // ledger added straight to a level-2 node (see the PSRR capital ledger). Matched
  // on a normalised name so an existing "Beta's"/"Salary's" is reused rather than
  // duplicated, which also makes this a no-op on any database that already has them.
  // The full EXPENSES chart of accounts as it stands on the live database (39
  // ledgers). Only Diesel and Mechanical Works & Spares survived into the dump
  // this deployment was seeded from, so the rest are recreated here: without
  // them the Trip Expenses / voucher debit pickers offer a near-empty EXPENSES
  // group and there is nowhere to post a toll, a challan or a repair.
  //
  // `sub` names the level-3 container the ledger sits in (Fuels / Vehicles
  // Maintenance); those rows carry parent_subgroup_id + village_id pointing at
  // it and parent_grp_level 3. Everything else hangs straight off its group at
  // level 2, which is how this app stores a ledger added directly to a level-2
  // node. Matched on a normalised name so an existing "Beta's"/"Salary's" is
  // reused rather than duplicated — a no-op on any database that already has
  // them, including live.
  var EXPENSE_CHART = [
    // 1) Cost Of Materials Consumed
    { name: 'Diesel', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Fuels' },
    { name: 'Engine oil', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Fuels' },
    { name: 'Ad Blue', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Fuels' },
    { name: 'Mechanical Works & Spares', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'Automotive Service Bills', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'Electrical Works & Spares', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'Accidental Repairs', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'AC Works & Spares', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'Tyre Maintenance', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'Police Challans', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'RTO Challans', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'RTO Check Reports', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'Glass Maintenance', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    { name: 'Battery Maintenance', mandalId: 10, mandalName: '1) Cost Of Materials Consumed', sub: 'Vehicles Maintenance' },
    // 2) Operating And Direct Expenses
    { name: 'Parking', mandalId: 11, mandalName: '2) Operating And Direct Expenses', aliases: ['parking'] },
    { name: 'Wheel Alignment', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Laundry Expenses', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Water Cases', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'PC Expenses', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Toll Charges', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Transport & Courier Charges', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Other Expenses', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Room Fresheners', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Free Tickets', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Settlements', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Cleaning Water', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Tickets Shifting & Refund', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Pooja', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Grease', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Office Expenses', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Bike Maintenance', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Pollution Certificate', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Permit Expenses', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'Hire vehicle charges', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    { name: 'New Parking (Ameenpur) Expenses', mandalId: 11, mandalName: '2) Operating And Direct Expenses' },
    // 3) Employee Benefit Expenses
    { name: 'Salaries', mandalId: 12, mandalName: '3) Employee Benefit Expenses', aliases: ['salaries', 'salarys', 'salary'] },
    { name: 'Betas', mandalId: 12, mandalName: '3) Employee Benefit Expenses', aliases: ['betas', 'beta'] },
    { name: 'Conductors Beta', mandalId: 12, mandalName: '3) Employee Benefit Expenses' },
    // 4) Other Expenses
    { name: 'Bank Charges', mandalId: 13, mandalName: '4) Other Expenses' },
  ];
  var normLedgerSql = "REPLACE(REPLACE(REPLACE(LOWER(temple_name), '''', ''), ' ', ''), '-', '')";
  EXPENSE_CHART.forEach(function (led) {
    // Must normalise EXACTLY as normLedgerSql does below (lower-case, then
    // drop apostrophes, spaces and hyphens — nothing else), or a name carrying
    // any other punctuation never matches its existing row and is re-inserted
    // on every boot. 'New Parking (Ameenpur) Expenses' is the one that bites.
    var aliases = led.aliases || [String(led.name).toLowerCase().replace(/['\s-]/g, '')];
    sqldb.query(
      `SELECT id FROM mainmasterssubchildtwo WHERE district_id = '4' AND d_in = 0 AND ${normLedgerSql} IN (?) LIMIT 1`,
      [aliases],
      function (err, rows) {
        if (err || (rows && rows.length)) return;
        var ts = moment().utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss');
        var insert = function (parentSubgroupId) {
          // A level-3 ledger whose container is missing would render nowhere, so
          // it is skipped rather than filed under the wrong node.
          if (led.sub && !parentSubgroupId) return;
          var lvl = led.sub ? 3 : 2;
          var child = led.sub || '';
          var subchildtwo = led.sub || led.mandalName;
          sqldb.query(`INSERT INTO mainmasterssubchildtwo
            (parent_subgroup_id, parent_subchild_id, ledger_type, created_at, updated_at, district_id, staticname,
             mandal_id, mandal_name, village_id, temple_name, entry_by, d_in, child, i_ts, subchildtwo,
             subchildtwo_id, parent_grp_level)
            VALUES (?, NULL, 'inherited', ?, ?, '4', 'EXPENSES', ?, ?, ?, ?, 'system', 0, ?, ?, ?, NULL, ?)`,
            [parentSubgroupId, ts, ts, String(led.mandalId), led.mandalName, parentSubgroupId,
             led.name, child, ts, subchildtwo, lvl],
            function (err) {
              if (err) console.log('[DB] expense ledger "' + led.name + '" seed:', err.message);
              else console.log('[DB] expense ledger seeded: ' + led.name);
            });
        };
        if (!led.sub) return insert(null);
        // Resolve the container by NAME, not id — subgroup ids differ per database.
        sqldb.query(
          `SELECT id FROM mainmasterssubgroup WHERE d_in = 0 AND district_id = 4 AND LOWER(village_name) = ? LIMIT 1`,
          [String(led.sub).toLowerCase()],
          function (err2, subRows) {
            if (err2) return console.log('[DB] expense ledger "' + led.name + '" container lookup:', err2.message);
            insert(subRows && subRows.length ? subRows[0].id : null);
          });
      });
  });
  // "Opting" is a fourth container, holding one ledger per crew role: the payee
  // for a trip seat covered by someone who isn't on the driver / helper / staff
  // register (Trip Creation's "Opting Driver" / "Opting Helper" / "Opting
  // Conductor" options). Such a person has no ledger of their own, so Trip
  // Expenses credits the one for their role instead — split per role so driver
  // and helper opting spend stay separately visible. Ensured right after the
  // container, in the same callback, so a fresh database gets both on the first
  // boot rather than the ledgers only on the second.
  //
  // An "Opting" ledger from before the split is left exactly where it is: it
  // still carries the journal entries already posted against it, and renaming it
  // would silently retag that history as one role's.
  // 'Hire Vehicles' is the hire-bus group: the owners we hire vehicles from, and
  // therefore owe. It predates this app on the live database (it already holds
  // real owner ledgers), so it is guarded rather than assumed.
  ['Drivers', 'Staff', 'Helpers', 'Opting', 'Hire Vehicles'].forEach(function (label) {
    sqldb.query(`SELECT id FROM mainmasterssubchild WHERE parent_subgroup_id = 5 AND temple_name = ? AND d_in = 0 LIMIT 1`, [label], function (err, rows) {
      if (err) return;
      var ensureOptingLedger = function () {
        if (label !== 'Opting') return;
        ['Opting Driver', 'Opting Helper', 'Opting Conductor'].forEach(function (ledgerName) {
          sqldb.query(`SELECT id FROM mainmasterssubchildtwo WHERE LOWER(temple_name) = ? AND d_in = 0 LIMIT 1`,
            [ledgerName.toLowerCase()], function (err, ledRows) {
              if (err || (ledRows && ledRows.length)) return;
              module.exports.ensurePersonLedger('Opting', ledgerName, null, 'system', function (err) {
                if (err) console.log('[DB] ' + ledgerName + ' ledger seed:', err.message);
                else console.log('[DB] ' + ledgerName + ' payables ledger seeded');
              });
            });
        });
      };
      if (rows && rows.length) return ensureOptingLedger();
      sqldb.query(`INSERT INTO mainmasterssubchild (parent_subgroup_id, district_id, staticentry, mandal_id, mandal_name, village_id, temple_name, child, level_depth, has_ledgers, can_add_subgroups, is_grp_ledger, d_in) VALUES (5, '2', 'EQUITIES AND LIABILITIES', '5', '3) CURRENT LIABILITIES', 5, ?, 'Payables', 4, 0, 1, 0, 0)`, [label], function (err) {
        if (err) return console.log('[DB] ' + label + ' container seed:', err.message);
        console.log('[DB] ' + label + ' ledger container seeded');
        ensureOptingLedger();
      });
    });
  });
  // Opting seats used to be stored as the bare name "Opting" on every role. Each
  // role now has its own name and its own ledger, and Trip Expenses resolves that
  // ledger from the stored name, so rename the old rows to their role's name.
  // Guarded on an empty person id: that is what makes a seat opting rather than a
  // real crew member who happens to be called Opting. Runs every boot but matches
  // nothing once done.
  [
    { tbl: 'trip_created', col: 'driver1_name', id: 'driver1_id', to: 'Opting Driver' },
    { tbl: 'trip_created', col: 'driver2_name', id: 'driver2_id', to: 'Opting Driver' },
    { tbl: 'trip_created', col: 'helper_name', id: 'helper_id', to: 'Opting Helper' },
    { tbl: 'trip_created', col: 'conductor_name', id: 'conductor_id', to: 'Opting Conductor' },
    { tbl: 'tripexpenses_data', col: 'driver1_name', id: 'driver1_id', to: 'Opting Driver' },
    { tbl: 'tripexpenses_data', col: 'driver2_name', id: 'driver2_id', to: 'Opting Driver' },
    { tbl: 'tripexpenses_data', col: 'helper_name', id: 'helper_id', to: 'Opting Helper' },
    { tbl: 'tripexpenses_data', col: 'conductor_name', id: 'conductor_id', to: 'Opting Conductor' },
  ].forEach(function (m) {
    sqldb.query(
      'UPDATE `' + m.tbl + '` SET `' + m.col + '` = ? WHERE TRIM(LOWER(`' + m.col + '`)) = \'opting\' ' +
      'AND (`' + m.id + '` IS NULL OR `' + m.id + '` = 0 OR `' + m.id + '` = \'\')',
      [m.to],
      function (err, res) {
        if (err) return console.log('[DB] ' + m.tbl + '.' + m.col + ' opting rename:', err.message);
        if (res && res.affectedRows) console.log('[DB] ' + m.tbl + '.' + m.col + ': renamed ' + res.affectedRows + ' row(s) to ' + m.to);
      });
  });
  // Trip reference on a voucher, so a trip-sourced voucher can show which trip
  // it came from the same way job_card_number/battery_code/tyre_code already do
  // for their modules — rather than being buried in the description text.
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mainvoucher_t' AND COLUMN_NAME = 'trip_c_number'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE mainvoucher_t ADD COLUMN trip_c_number VARCHAR(50) DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] mainvoucher_t.trip_c_number migration:', err.message);
        else console.log('[DB] mainvoucher_t.trip_c_number column added');
      });
    }
  });
  // Backfill runs on every boot rather than only alongside the ALTER: it is
  // idempotent (only touches rows still NULL) and older trip vouchers arrive
  // by two different routes. Pass 1 uses trip_created's own voucher_number
  // link; pass 2 covers the vouchers that predate that link being written,
  // whose trip number survives only in the "[Trip: TRIPnnn]" description tag.
  sqldb.query(`UPDATE mainvoucher_t mv JOIN trip_created t ON t.voucher_number = mv.c_number AND t.d_in = 0
    SET mv.trip_c_number = t.c_number WHERE mv.trip_c_number IS NULL`, function (bfErr, res) {
    if (bfErr) return console.log('[DB] trip_c_number backfill (link):', bfErr.message);
    if (res && res.affectedRows) console.log('[DB] trip_c_number backfilled from link on ' + res.affectedRows + ' voucher(s)');
    sqldb.query(`UPDATE mainvoucher_t SET trip_c_number = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(description, '[Trip: ', -1), ']', 1))
      WHERE trip_c_number IS NULL AND source_type = 'trip' AND description LIKE '%[Trip: %]%'`, function (dErr, dRes) {
      if (dErr) console.log('[DB] trip_c_number backfill (description):', dErr.message);
      else if (dRes && dRes.affectedRows) console.log('[DB] trip_c_number backfilled from description on ' + dRes.affectedRows + ' voucher(s)');
    });
  });
  // Seniority rank on the Designation master (staff_types) — lower number sorts
  // higher (1 = most senior). NULL for existing rows until someone sets it.
  sqldb.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_types' AND COLUMN_NAME = 'level'`, function (err, rows) {
    if (!err && rows && rows.length === 0) {
      sqldb.query(`ALTER TABLE staff_types ADD COLUMN level INT DEFAULT NULL`, function (err) {
        if (err) console.log('[DB] staff_types.level migration:', err.message);
        else console.log('[DB] staff_types.level column added');
      });
    }
  });

})();

exports.check_user_mobilenoMdl = function (data, callback) {
  var cntxtDtls = "in check_user_mobilenoMdl";
  var m = [data.number];
  var QRY_TO_EXEC = `select * from users  where d_in = '0' and number =? ; `;
  //console.log()QRY_TO_EXEC, 10)
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.checkUserExistMdl = function (number, callback) {
  var cntxtDtls = "in checkUserExistMdl";
  var m = [number[0], number[1]];
  var QRY_TO_EXEC = ` SELECT id,name,role_type,department_id,department_name from users where number =?  and password = ? and d_in=0;`;

  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getUserDataMdl = function (user_id, callback) {
  var cntxtDtls = "in getUserDataMdl";
  var m = [user_id, user_id];
  var QRY_TO_EXEC = `SELECT mm.* from main_modules as mm join permissions as ps on mm.id=ps.module_id  where ps.user_id =? and ps.d_in <> 1 and mm.d_in=0 group by  ps.module_id    ;
	SELECT mm.* from sub_modules as mm join permissions as ps on mm.id=ps.sub_module_id  where ps.user_id =? and ps.d_in <> 1 and mm.d_in=0 order by module_order  ;
	`;

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.get_user_moduleslist = function (reqdata, callback) {
  var cntxtDtls = "in get_user_moduleslist";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var QRY_TO_EXEC = "";
  var m = [reqdata.user_id];
  if (reqdata.role_type == 0 || reqdata.role_type == 1) {
    QRY_TO_EXEC = `SELECT sm.id,sm.module_id,m.title as module_nm,sm.path,sm.icon,sm.title,sm.id,m.icon,sm.d_in,sm.module_order,"false" as check_sub_menu FROM main_modules as m JOIN sub_modules as sm ON sm.module_id=m.id WHERE sm.d_in=0 and m.d_in=0;`;
  } else {
    QRY_TO_EXEC = `SELECT p.user_id,sm.id,sm.module_id,m.title as module_nm,sm.path,sm.icon,sm.title,sm.id,m.icon,p.d_in,sm.module_order,"false" as check_sub_menu FROM permissions as p JOIN main_modules as m ON m.id=p.module_id JOIN sub_modules as sm ON sm.id=p.sub_module_id WHERE p.user_id=? and sm.d_in=0 and m.d_in=0;`;
  }

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.houseimageeditMdl = function (imageupload1, img_ind1, callback) {
  var cntxtDtls = "in houseimageeditMdl";
  var m = [imageupload1, img_ind1.imgid];
  var QRY_TO_EXEC = `UPDATE ${img_ind1.tablenm} SET ${img_ind1.column_name} = ? WHERE id=?`;

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getusermainmodulesMdl = function (reqdata, callback) {
  var cntxtDtls = "in getusermainmodulesMdl";
  var m = [reqdata.user_id];
  var QRY_TO_EXEC = `SELECT m.id as module_id,m.title as module_nm,m.icon as main_icon,sm.*,m.order_by,p.can_add,p.can_edit,p.can_delete,p.can_view FROM permissions as p 
JOIN sub_modules as sm ON p.sub_module_id=sm.id
JOIN main_modules as m ON m.id=p.module_id
WHERE p.user_id=? AND p.d_in=0 AND sm.d_in=0 and m.d_in=0 order by m.order_by,sm.module_order asc;`;

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addUsers2Mdl = function (user, imageuploadlao, callback) {
  var cntxtDtls = "in addUsers2Mdl";
  var raw = {
    name: user.name,
    password: user.password,
    number: user.number,
    entry_by: user.entry_by,
    role_type: user.role_type,
    department_id: user.department_id,
    department_name: user.department_name,
    designation: user.designation_name,
    email: user.mail || user.email,
    section_title_id: user.section_id,
    section_title: user.section_name,
    d_in: user.d_in !== undefined ? user.d_in : 0,
  };
  // Strip undefined so column DEFAULT values apply instead of forcing NULL
  var dta = Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== undefined && v !== null || v === 0));
  var QRY_TO_EXEC = `insert into users set ?;`;
  //console.log()QRY_TO_EXEC);

  if (callback && typeof callback == "function")
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.postusermenulistMdl = async function (data, usr_id, callback) {
  try {
    var cntxtDtls = "in postusermenulistMdl";
    var m = [usr_id];
    var QRY_TO_EXEC2 = `DELETE FROM permissions WHERE user_id = ?;`;

    // Delete existing permissions first
    await new Promise((resolve, reject) => {
      dbutil.execupdateQuery(
        sqldb,
        QRY_TO_EXEC2,
        m,
        cntxtDtls,
        function (err, results1) {
          if (err) reject(err);
          else resolve(results1);
        }
      );
    });

    // Insert all rows in parallel using Promise.all
    var QRY_TO_EXEC = `
      INSERT INTO permissions 
      (user_id, module_id, sub_module_id, entry_by, can_add, can_edit, can_view, can_delete)
      VALUES (?)
    `;

    const insertPromises = data.map((item) => {
      return new Promise((resolve, reject) => {
        dbutil.sqlinjection(
          sqldb,
          QRY_TO_EXEC,
          item,
          cntxtDtls,
          function (err, results) {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });
    });

    // Wait for all inserts to complete
    const resultsArray = await Promise.all(insertPromises);

    // Call callback once with success (you can send resultsArray if needed)
    callback(null, resultsArray);
  } catch (error) {
    callback(error);
  }
};

exports.geteditusermoduleslistMdl = function (reqdata, callback) {
  console.log(reqdata, 164);

  var cntxtDtls = "in geteditusermoduleslistMdl";

  if (reqdata.role_type == 0 || reqdata.role_type == 1) {
    console.log("role 1 ");
    var QRY_TO_EXEC = `SELECT FALSE as check_sub_menu, sm.id,sm.module_id,m.title as module_nm,sm.path,sm.icon,sm.title,sm.id,m.icon,sm.d_in,
            module_order FROM main_modules as m 
            JOIN sub_modules as sm ON m.id=sm.module_id
            WHERE m.d_in=0 and sm.d_in=0 ORDER BY m.order_by,sm.module_order;SELECT * FROM permissions WHERE user_id=${reqdata.user_id};`;
  } else {
    console.log("role2");
    var QRY_TO_EXEC = `SELECT FALSE as check_sub_menu, user_id,sm.id,sm.module_id,m.title as module_nm,sm.path,sm.icon,sm.title,sm.id,m.icon,p.d_in,
            module_order FROM permissions as p 
            JOIN main_modules as m ON m.id=p.module_id
            JOIN sub_modules as sm ON sm.id=p.sub_module_id
            WHERE p.user_id=${reqdata.entry_by} and p.d_in=0 and m.d_in=0 and sm.d_in=0;SELECT * FROM permissions WHERE user_id=${reqdata.user_id};`;
  }

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// orginal
exports.getusermoduleslistMdl = function (reqdata, callback) {
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var cntxtDtls = "in getusermoduleslistMdl";

  if (reqdata.role_type == 0 || reqdata.role_type == 1) {
    var QRY_TO_EXEC = `SELECT 
    p.user_id,
    p.entry_by,
    l.id,
    l.name,
    l.number,
    l.department_name,
    l.designation,
    l.section_title,
    l.section_title_id,
    l.department_id,
    l.profile_image,
    l.email,
    GROUP_CONCAT(DISTINCT m.title) AS module_nm,
    COUNT(DISTINCT m.title) as mcnt,
    GROUP_CONCAT(DISTINCT sm.title) AS sub_menu
FROM permissions as p 
JOIN sub_modules AS sm ON p.sub_module_id = sm.id 
JOIN main_modules AS m ON p.module_id = m.id 
JOIN users as l ON l.id = p.user_id 
WHERE p.d_in=0 AND l.d_in=0 AND m.d_in=0 AND sm.d_in=0 
GROUP BY 
    p.user_id,
    p.entry_by,
    l.id,
    l.name,
    l.number,
    l.department_name,
    l.designation,
    l.section_title,
    l.section_title_id,
    l.department_id,
    l.profile_image,
    l.email
ORDER BY mcnt, l.id;
`;
  } else {
    if (reqdata.role_type == 2) {
      var entry_by = ` AND p.entry_by=${reqdata.entry_by}`;
    } else {
      var entry_by = ``;
    }
    var QRY_TO_EXEC = `SELECT p.entry_by,l.id,name,l.number,l.department_name,l.designation,l.section_title,l.section_title_id,l.department_id,l.profile_image,l.email,GROUP_CONCAT(DISTINCT m.title) AS module_nm, COUNT(m.title) as mcnt, GROUP_CONCAT(sm.title) AS sub_menu 
    FROM permissions as p 
    JOIN sub_modules AS sm ON p.sub_module_id = sm.id 
    JOIN main_modules AS m ON p.module_id = m.id 
    JOIN users as l ON l.id = p.user_id 
    where p.d_in=0 and l.d_in=0 and m.d_in=0 and sm.d_in=0 AND l.role_type!=0 ${entry_by}
    GROUP BY p.user_id ORDER BY mcnt,l.id;`;
  }


  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};



exports.helpdeskcount = function (data, callback) {
  var cntxtDtls = "in helpdeskcount";
  var QRY_TO_EXEC = `SELECT  (select count(*) from help_desk where d_in='0') as total,
	(select count(*) from help_desk where status = '1'  and d_in='0') as pending,
	(select count(*) from help_desk where status = '2'  and d_in='0') as resolved;`;

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.problemdone = function (data, callback) {
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var cntxtDtls = "in problemdone";
  var QRY_TO_EXEC = ` update help_desk set resloved_by = '${data.done_by}',status = '${data.status}',resloved_date ='${date}' where id='${data.id}' ; `;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submithelpdata = function (data, callback) {
  var cntxtDtls = "in submithelpdata";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    module_name: data.module,
    sub_module: data.submodule,
    priority: data.priority,
    issue_description: data.issue,
    status: "1",
    entry_by: data.entry_by,
    i_ts: date,
  };
  var QRY_TO_EXEC = `insert into help_desk SET ? `;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getdata = function (data, callback) {
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var cntxtDtls = "in getdata";
  var QRY_TO_EXEC = `SELECT * , (select name from users where id='${data.entry_by}') as user_name from help_desk where d_in=0 `;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getAllUsersMdl = function (callback) {
  var cntxtDtls = "in getAllUsersMdl";
  var QRY_TO_EXEC = `SELECT id, name, number, email, role_type, department_id, department_name, designation, d_in, i_ts FROM users WHERE d_in = 0 ORDER BY id DESC;`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      callback(err, results);
    });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deleteUsersMdl = function (id, callback) {
  var cntxtDtls = "in deleteUsersMdl";
  var QRY_TO_EXEC = `update  users set d_in = 1   where id  = '${id}' ; `;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

//analysis

exports.getdepartmentDataMdl = function (callback) {
  var cntxtDtls = "in getdepartmentDataMdl";
  var QRY_TO_EXEC = `SELECT * from usersdrodown where d_in=0  order by id desc`;
  //console.log()QRY_TO_EXEC, 304);

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.addNewbusnumMdl = function (data, callback) {
  console.log(data, 316);
  var cntxtDtls = "in addNewbusnumMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var dta = {
    bus_no: data.busno,
    engine_no: data.engineno,
    chassis_no: data.chassisno,
    insurance_validity: data.insurancevalidity,
    pollution_validity: data.pollutionvalidity,
    base_point_validity: data.basepointvalidity,
    date_of_purchase: data.dateofpurchase,
    atp_validity: data.atpvalidity,
    atp_authentication_validity: data.atpauthenticationvalidity,
    fc_validity: data.fcvalidity,
    home_tax_validity: data.hometaxvalidity,
    service_out_date: data.serviceoutdate,
    remarks: data.remarks,
    user_id: data.userid,
    usr_nm: data.usrnm,
    i_ts: date,
    odometer: data.odometer,
    ownername: data.ownername,
    vehicle_type: data.vehicletype,
    company: data.company,
    issparetank: data.issparetank || 0,
    bus_category: data.buscategory || 'normal',
    luxury_type: data.luxurytype || null,
    seating_capacity: data.seatingcapacity || null,
    chassis_make: data.chassismake || null,
    body_made: data.bodymade || null,
    chassis_model: data.chassismodel || null,
    mfg_year: data.mfgyear || null,
    reg_date: data.regdate || null,
    owner_ledger_id: data.owner_ledger_id || null
  };
  //console.log()dta, 334);

  var QRY_TO_EXEC = `insert into busses set ?;`;

  //console.log()QRY_TO_EXEC, 336)
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getbussesdataMdl = function (callback) {
  var cntxtDtls = "in getbussesdataMdl";
  // reg_date is a native DATE column (every other validity/date field here is varchar);
  // re-select it as a plain 'YYYY-MM-DD' string so <input type="date"> can display it —
  // otherwise the driver hands back a Date object that JSON-serializes with a time part.
  var QRY_TO_EXEC = `select *, DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date from busses where  d_in='0'`;
  //console.log()QRY_TO_EXEC, 351);

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getbussessparetankdataMdl = function (callback) {
  var cntxtDtls = "in getbussessparetankdataMdl";
  var QRY_TO_EXEC = `select * from busses where  d_in='0' and issparetank = 1 `;
  //console.log()QRY_TO_EXEC, 351);

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addservicenumner = function (data, callback) {
  var cntxtDtls = "in addservicenumner";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  var dta = {
    name: data.serviceno,
    cts: date,
    user_id: data.userid,
    usr_nm: data.usrnm,
  };
  var QRY_TO_EXEC = `insert into service_number set ?;`;
  // var QRY_TO_EXEC = `insert into  service_number (name,cts) VALUES('${data.service_no}','${date}')  `;
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.driverone = function (data, callback) {
  console.log(data);

  var cntxtDtls = "in driverone";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var dta = {
    serviceFor: data.serviceFor,
    serviceNo: data.serviceNo,
    fromCity: data.fromCity,
    toCity: data.toCity,
    viaPlaces: data.viaPlaces,
    parkingAmount: data.parkingAmount,
    driverOneBeta: data.driverOneBeta,
    driverTwoBeta: data.driverTwoBeta,
    helperBeta: data.helperBeta,
    optDriver: data.optDriver,
    optHelper: data.optHelper,
    optDriverSalary: data.optDriverSalary,
    optHelperSalary: data.optHelperSalary,
    remarks: data.remarks,
    user_id: data.userid,
    conductorBeta: data.conductorBeta,
    distance: data.distance,
    usr_nm: data.usrnm,
    i_ts: date,
    service_for_id: data.service_for_id,
    line_code: data.line_code,
    route_id: data.route_id,
    start_boarding_point: data.start_boarding_point,
    start_boarding_time: data.start_boarding_time,
    end_boarding_point: data.end_boarding_point,
    end_boarding_time: data.end_boarding_time,
    vehicle_type: data.vehicle_type || "bus",
    bus_operator_id: data.bus_operator_id || null,
    bus_operator_name: data.bus_operator_name || null,
    trip_type: data.trip_type || null,
    up_down: data.up_down || null,
  };
  //console.log()dta, 400);
  // var QRY_TO_EXEC = `insert into  driverone (name,mobile_number,cts) VALUES('${data.drive_one}','${data.mobile_number}','${date}')  `;
  var QRY_TO_EXEC = `insert into driverone set ?;`;
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getdriveone = function (callback) {
  var cntxtDtls = "in getdriveone";
  var QRY_TO_EXEC = `select * from driverone where  d_in='0' `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.checknameMdl = function (data, callback) {
  var cntxtDtls = "in checknameMdl";
  var conditions = [`driver_name='${data.driver_name}'`];
  if (data.nickname) conditions.push(`nickname='${data.nickname}'`);
  if (data.mobile_number) conditions.push(`mobile_number='${data.mobile_number}'`);
  if (data.alternate_number) conditions.push(`alternate_number='${data.alternate_number}'`);
  if (data.aadhar_number) conditions.push(`aadhar_number='${data.aadhar_number}'`);
  if (data.dl_number) conditions.push(`dl_number='${data.dl_number}'`);
  const QRY_TO_EXEC = `
    select * from  driver_register where d_in=0 and (${conditions.join(" or ")})`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.checkhelpername = function (data, callback) {
  var cntxtDtls = "in checknameMdl";
  var conditions = [`helper_name='${data.helper_name}'`];
  if (data.mobile_number) conditions.push(`mobile_number='${data.mobile_number}'`);
  if (data.alternate_number) conditions.push(`alternate_number='${data.alternate_number}'`);
  if (data.adhar_number) conditions.push(`adhar_number='${data.adhar_number}'`);
  const QRY_TO_EXEC = `
    select * from   helper_register where d_in=0 and  (${conditions.join(" or ")})`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.checksaffnameMdl = function (data, callback) {
  var cntxtDtls = "in checknameMdl";
  var conditions = [`fullName='${data.fullName}'`];
  if (data.mobile) conditions.push(`mobile='${data.mobile}'`);
  if (data.alternativemobilenumber) conditions.push(`alternativemobilenumber='${data.alternativemobilenumber}'`);
  if (data.aadhaar) conditions.push(`aadhaar='${data.aadhaar}'`);
  const QRY_TO_EXEC = `
    select * from   staff_register where d_in=0 and  (${conditions.join(" or ")})`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.addstaffregisterMdl = function (
  data,
  imageuploadlao,
  imageuploadlaotwo,
  imageuploadlaothree,
  callback
) {
  var cntxtDtls = "in addstaffregisterMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD");

  var dta = {
    designation: data.designation,
    idNumber: data.idNumber || "",
    fullName: data.fullName,
    mobile: data.mobile,
    emergencyContact: data.emergencyContact,
    aadhaar: data.aadhaar,
    accountHolderName: data.accountHolderName,
    accountNumber: data.accountNumber,
    bankName: data.bankName,
    ifscCode: data.ifscCode,
    upiId: data.upiId,
    aadhaarCardFront: imageuploadlao,
    aadhaarCardBack: imageuploadlaotwo,
    upiScanner: imageuploadlaothree,
    dateOfJoining: data.dateOfJoining,
    dateOfLeaving: data.dateOfLeaving || null,
    remarks: data.remarks || "",
    alternativemobilenumber: data.alternativemobilenumber || "",
    referencename: data.referencename || "",
    branchname: data.branchname || "",
    dob: data.dob || null,
    address: data.address || "",
    i_ts: date,
    user_id: data.entryby,
    usr_nm: data.usrnm,
    nickName: data.nickName,
  };
  //console.log()dta, 400);
  var QRY_TO_EXEC = `INSERT INTO staff_register SET ?;`;
  if (callback && typeof callback === "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        if (err) { callback(err, results); return; }
        var disambiguator = data.idNumber || ("#" + results.insertId);
        module.exports.ensurePersonLedger("Staff", data.fullName, disambiguator, data.entryby, function (ledgerErr, ledgerId) {
          if (ledgerErr) {
            console.error("[ensurePersonLedger] failed for staff " + results.insertId + ":", ledgerErr.message);
            callback(err, results);
            return;
          }
          dbutil.execupdateQuery(sqldb, `UPDATE staff_register SET ledger_id = ? WHERE id = ?`, [ledgerId, results.insertId], cntxtDtls, function () {
            callback(err, results);
          });
        });
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.addhelperregisterMdl = function (
  data,
  adharFront,
  adharBack,
  upiScanner,
  callback
) {
  const cntxtDtls = "in addhelperregisterMdl";
  const date = moment().utcOffset("+05:30").format("YYYY-MM-DD");

  // helper_id_number is NOT NULL with no default and nothing else in this
  // codebase generates it — auto-assign the next sequential H#### id
  // (matching the existing historical "H0053"-style values).
  const genIdQry = `SELECT COALESCE(MAX(CAST(SUBSTRING(helper_id_number, 2) AS UNSIGNED)), 0) + 1 AS nextid FROM helper_register WHERE helper_id_number REGEXP '^H[0-9]+$'`;
  dbutil.execQuery(sqldb, genIdQry, cntxtDtls, function (idErr, idRows) {
    if (idErr) {
      if (callback && typeof callback === "function") { callback(idErr, null); }
      return;
    }
    const nextId = idRows && idRows[0] ? idRows[0].nextid : 1;
    const helperIdNumber = "H" + String(nextId).padStart(4, "0");

    const dta = {
      helper_id_number: helperIdNumber,
      helper_name: data.helper_name,
      mobile_number: data.mobile_number,
      alternate_number: data.alternate_number || "",
      adhar_number: data.adhar_number,
      reference: data.reference || "",
      account_holder_name: data.account_holder_name,
      account_number: data.account_number,
      bank_name: data.bank_name,
      branch_name: data.branch_name || "",
      ifsc_code: data.ifsc_code,
      upi_id: data.upi_id || "",
      date_of_joining: data.date_of_joining,
      date_of_leaving: data.date_of_leaving || null,
      remarks: data.remarks || "",
      adhar_card_front: adharFront,
      adhar_card_back: adharBack,
      upi_scanner: upiScanner,
      nickname: data.nickname || "",
      emergencymobilenumber: data.emergency_mobile_number || "",
      dob: data.dob || null,
      address: data.address || "",
      i_ts: date,
      user_id: data.entryby,
      usr_nm: data.usrnm,
    };

    const QRY_TO_EXEC = `INSERT INTO helper_register SET ?;`;
    if (callback && typeof callback === "function") {
      dbutil.execupdateQuery(
        sqldb,
        QRY_TO_EXEC,
        dta,
        cntxtDtls,
        function (err, results) {
          if (err) { callback(err, results); return; }
          module.exports.ensurePersonLedger("Helpers", data.helper_name, helperIdNumber, data.entryby, function (ledgerErr, ledgerId) {
            if (ledgerErr) {
              console.error("[ensurePersonLedger] failed for helper " + helperIdNumber + ":", ledgerErr.message);
              callback(err, results);
              return;
            }
            dbutil.execupdateQuery(sqldb, `UPDATE helper_register SET ledger_id = ? WHERE id = ?`, [ledgerId, results.insertId], cntxtDtls, function () {
              callback(err, results);
            });
          });
        }
      );
    } else {
      return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
    }
  });
};

exports.adddriverregisterMdl = function (
  data,
  adharFront,
  adharBack,
  dlFront,
  dlBack,
  upiimage,
  callback
) {
  const cntxtDtls = "in adddriverregisterMdl";
  const date = moment().utcOffset("+05:30").format("YYYY-MM-DD");

  // driver_id_number: auto-assign the next sequential D#### id (mirrors
  // helper_id_number's H#### pattern).
  const genIdQry = `SELECT COALESCE(MAX(CAST(SUBSTRING(driver_id_number, 2) AS UNSIGNED)), 0) + 1 AS nextid FROM driver_register WHERE driver_id_number REGEXP '^D[0-9]+$'`;
  dbutil.execQuery(sqldb, genIdQry, cntxtDtls, function (idErr, idRows) {
    if (idErr) {
      if (callback && typeof callback === "function") { callback(idErr, null); }
      return;
    }
    const nextId = idRows && idRows[0] ? idRows[0].nextid : 1;
    const driverIdNumber = "D" + String(nextId).padStart(4, "0");

    const dta = {
      driver_id_number: driverIdNumber,
      driver_name: data.driver_name,
      mobile_number: data.mobile_number,
      alternate_number: data.alternate_number || "",
      aadhar_number: data.aadhar_number,
      reference: data.reference || "",
      account_holder_name: data.account_holder_name,
      account_number: data.account_number,
      bank_name: data.bank_name,
      branch_name: data.branch_name || "",
      ifsc_code: data.ifsc_code,
      upi_id: data.upi_id || "",
      date_of_joining: data.date_of_joining,
      date_of_leaving: data.date_of_leaving || null,
      remarks: data.remarks || "",
      aadhar_card_front: adharFront,
      aadhar_card_back: adharBack,
      dl_front: dlFront,
      dl_back: dlBack,
      upi_scanner: upiimage,
      nickname: data.nickname || "",
      emergency_mobile_number: data.emergency_mobile_number || "",
      dl_number: data.dl_number,
      dl_expiry_date: data.dl_expiry_date,
      address: data.address || "",
      i_ts: date,
      user_id: data.entryby,
      usr_nm: data.usrnm,
      dldateofbirth: data.dldateofbirth || "",
      drivinglicense_joining_date: data.drivinglicense_joining_date || "",
      transportoneissuedate: data.transportoneissuedate || "",
      transportvalidityfrom: data.transportvalidityfrom || "",
      transportvalidityto: data.transportvalidityto || "",
      dl_issued_by: data.dl_issued_by || "",
      dl_dob: data.dl_dob || "",
      dl_linked_mobile: data.dl_linked_mobile || "",
    };
    const QRY_TO_EXEC = `INSERT INTO driver_register SET ?;`;
    if (callback && typeof callback === "function") {
      dbutil.execupdateQuery(
        sqldb,
        QRY_TO_EXEC,
        dta,
        cntxtDtls,
        function (err, results) {
          if (err) { callback(err, results); return; }
          // Best-effort: the driver record is already saved regardless of whether
          // the ledger auto-creation below succeeds. Every driver lands under the
          // single shared "Drivers" container — no more split by driver type.
          module.exports.ensurePersonLedger("Drivers", data.driver_name, driverIdNumber, data.entryby, function (ledgerErr, ledgerId) {
            if (ledgerErr) {
              console.error("[ensurePersonLedger] failed for driver " + driverIdNumber + ":", ledgerErr.message);
              callback(err, results);
              return;
            }
            dbutil.execupdateQuery(sqldb, `UPDATE driver_register SET ledger_id = ? WHERE id = ?`, [ledgerId, results.insertId], cntxtDtls, function () {
              callback(err, results);
            });
          });
        }
      );
    } else {
      return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
    }
  });
};
exports.getservicenumberdata = function (callback) {
  var cntxtDtls = "in getservicenumberdata";
  var QRY_TO_EXEC = `select * from service_number where  d_in='0' order by id desc`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getserviceforreportdropdownMdl = function (callback) {
  var cntxtDtls = "in getserviceforreportdropdownMdl";
  var QRY_TO_EXEC = `select * from service_number where  d_in='0' order by id desc `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.gethelperMdl = function (data, callback) {
  var cntxtDtls = "in gethelperMdl";
  //console.log()data.staffreports, 581);
  if (data.staffreports == "Staff") {
    var QRY_TO_EXEC = `select * from  staff_register where  d_in='0' order by id desc`;
  } else if (data.staffreports == "Helper") {
    var QRY_TO_EXEC = `select * from  helper_register where  d_in='0' order by id desc`;
  } else if (data.staffreports == "Driver") {
    var QRY_TO_EXEC = `select * from  driver_register where  d_in='0' order by id desc`;
  }
  //console.log()QRY_TO_EXEC, 589);
  // var QRY_TO_EXEC = `select * from  staff_register where  d_in='0' order by id desc`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// ── Sold Out / Service Out ──────────────────────────────────────────────────
// Replaces the old "Delete Bus" action: instead of silently soft-hiding a bus
// with no record of why, this captures a date + description and moves it to
// a dedicated list (mirrors the Staff Register terminate/rejoin flow above).
exports.markBusServiceOutMdl = function (data, callback) {
  var cntxtDtls = "in markBusServiceOutMdl";
  var esc = function (v) { return String(v == null ? '' : v).replace(/'/g, "''"); };
  var QRY_TO_EXEC = `UPDATE busses SET d_in=1, service_out_date='${esc(data.service_out_date)}', service_out_reason='${esc(data.service_out_reason)}' WHERE id='${data.id}'`;
  dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
    if (err) { callback(err, results); return; }
    var note = `Marked Sold/Out of Service: ${esc(data.service_out_reason)} (effective ${esc(data.service_out_date)})`;
    var histQ = `INSERT INTO bus_edit_history (bus_id, bus_no, changes_note, changed_by_id, changed_by_name) VALUES ('${data.id}', (SELECT bus_no FROM busses WHERE id='${data.id}'), '${note}', '${esc(data.userid)}', '${esc(data.usrnm)}')`;
    sqldb.query(histQ, function (histErr) {
      if (histErr) console.log('[markBusServiceOutMdl] history log error:', histErr.message);
      callback(null, results);
    });
  });
};

exports.reactivateBusMdl = function (data, callback) {
  var cntxtDtls = "in reactivateBusMdl";
  var esc = function (v) { return String(v == null ? '' : v).replace(/'/g, "''"); };
  var QRY_TO_EXEC = `UPDATE busses SET d_in=0, service_out_date=NULL, service_out_reason=NULL WHERE id='${data.id}'`;
  dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
    if (err) { callback(err, results); return; }
    var histQ = `INSERT INTO bus_edit_history (bus_id, bus_no, changes_note, changed_by_id, changed_by_name) VALUES ('${data.id}', (SELECT bus_no FROM busses WHERE id='${data.id}'), 'Reactivated — moved back to active fleet', '${esc(data.userid)}', '${esc(data.usrnm)}')`;
    sqldb.query(histQ, function (histErr) {
      if (histErr) console.log('[reactivateBusMdl] history log error:', histErr.message);
      callback(null, results);
    });
  });
};

exports.getServiceOutBusesMdl = function (callback) {
  var cntxtDtls = "in getServiceOutBusesMdl";
  var QRY_TO_EXEC = `SELECT * FROM busses WHERE d_in=1 AND service_out_date IS NOT NULL AND service_out_date <> '' ORDER BY service_out_date DESC`;
  dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, callback);
};
exports.deletedriveoneMdl = function (data, callback) {
  var cntxtDtls = "in deletedriveoneMdl";
  var QRY_TO_EXEC = `UPDATE driverone SET d_in = 1 WHERE id = '${data.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      callback(err, results); return;
    });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deleteservicenumber = function (data, callback) {
  var cntxtDtls = "in deleteservicenumber";
  var QRY_TO_EXEC = ` update service_number set d_in = '1'  WHERE  id = '${data.index}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.deletedriverdata = function (data, callback) {
  var cntxtDtls = "in deletedriverdata";
  var QRY_TO_EXEC = ` update driver_register set d_in = '1'  WHERE  id = '${data.index}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletehelperdata = function (data, callback) {
  var cntxtDtls = "in deletehelperdata";
  var QRY_TO_EXEC = ` update helper_register set d_in = '1'  WHERE  id = '${data.index}'`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// ── Staff Types ──────────────────────────────────────────────────────────────
// `level` is a seniority rank (1 = most senior) — rows without one sort last.
exports.getStaffTypesMdl = function (callback) {
  var cntxtDtls = "in getStaffTypesMdl";
  var QRY_TO_EXEC = `SELECT * FROM staff_types WHERE d_in=0 ORDER BY level IS NULL, level, type_name`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.addStaffTypeMdl = function (data, callback) {
  var cntxtDtls = "in addStaffTypeMdl";
  var level = (data.level !== undefined && data.level !== null && data.level !== '') ? Number(data.level) : 'NULL';
  var QRY_TO_EXEC = `INSERT INTO staff_types (type_name, level) VALUES ('${data.type_name}', ${level})`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.deleteStaffTypeMdl = function (data, callback) {
  var cntxtDtls = "in deleteStaffTypeMdl";
  var QRY_TO_EXEC = `UPDATE staff_types SET d_in=1 WHERE id='${data.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.updateStaffTypeMdl = function (data, callback) {
  var cntxtDtls = "in updateStaffTypeMdl";
  var level = (data.level !== undefined && data.level !== null && data.level !== '') ? Number(data.level) : 'NULL';
  var QRY_TO_EXEC = `UPDATE staff_types SET type_name='${data.type_name}', level=${level} WHERE id='${data.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// ── Vehicle Types ────────────────────────────────────────────────────────────
exports.getVehicleTypesMdl = function (callback) {
  var cntxtDtls = "in getVehicleTypesMdl";
  var QRY_TO_EXEC = `SELECT * FROM vehicle_types WHERE d_in=0 ORDER BY type_name`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.addVehicleTypeMdl = function (data, callback) {
  var cntxtDtls = "in addVehicleTypeMdl";
  var QRY_TO_EXEC = `INSERT INTO vehicle_types (type_name) VALUES ('${data.type_name}')`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.deleteVehicleTypeMdl = function (data, callback) {
  var cntxtDtls = "in deleteVehicleTypeMdl";
  var QRY_TO_EXEC = `UPDATE vehicle_types SET d_in=1 WHERE id='${data.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// ── Vehicle Companies ────────────────────────────────────────────────────────
exports.getVehicleCompaniesMdl = function (callback) {
  var cntxtDtls = "in getVehicleCompaniesMdl";
  var QRY_TO_EXEC = `SELECT * FROM vehicle_companies WHERE d_in=0 ORDER BY company_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addVehicleCompanyMdl = function (data, callback) {
  var cntxtDtls = "in addVehicleCompanyMdl";
  var QRY_TO_EXEC = `INSERT INTO vehicle_companies (company_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.company_name], cntxtDtls, callback);
};
exports.deleteVehicleCompanyMdl = function (data, callback) {
  var cntxtDtls = "in deleteVehicleCompanyMdl";
  var QRY_TO_EXEC = `UPDATE vehicle_companies SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Seating Capacities ───────────────────────────────────────────────────────
exports.getSeatingCapacitiesMdl = function (callback) {
  var cntxtDtls = "in getSeatingCapacitiesMdl";
  var QRY_TO_EXEC = `SELECT * FROM seating_capacities WHERE d_in=0 ORDER BY capacity`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addSeatingCapacityMdl = function (data, callback) {
  var cntxtDtls = "in addSeatingCapacityMdl";
  var QRY_TO_EXEC = `INSERT INTO seating_capacities (capacity) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.capacity], cntxtDtls, callback);
};
exports.deleteSeatingCapacityMdl = function (data, callback) {
  var cntxtDtls = "in deleteSeatingCapacityMdl";
  var QRY_TO_EXEC = `UPDATE seating_capacities SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Chassis Models ───────────────────────────────────────────────────────────
exports.getChassisModelsMdl = function (callback) {
  var cntxtDtls = "in getChassisModelsMdl";
  var QRY_TO_EXEC = `SELECT * FROM chassis_models WHERE d_in=0 ORDER BY model_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addChassisModelMdl = function (data, callback) {
  var cntxtDtls = "in addChassisModelMdl";
  var QRY_TO_EXEC = `INSERT INTO chassis_models (model_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.model_name], cntxtDtls, callback);
};
exports.deleteChassisModelMdl = function (data, callback) {
  var cntxtDtls = "in deleteChassisModelMdl";
  var QRY_TO_EXEC = `UPDATE chassis_models SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Body Builders ────────────────────────────────────────────────────────────
exports.getBodyBuildersMdl = function (callback) {
  var cntxtDtls = "in getBodyBuildersMdl";
  var QRY_TO_EXEC = `SELECT * FROM body_builders WHERE d_in=0 ORDER BY builder_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addBodyBuilderMdl = function (data, callback) {
  var cntxtDtls = "in addBodyBuilderMdl";
  var QRY_TO_EXEC = `INSERT INTO body_builders (builder_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.builder_name], cntxtDtls, callback);
};
exports.deleteBodyBuilderMdl = function (data, callback) {
  var cntxtDtls = "in deleteBodyBuilderMdl";
  var QRY_TO_EXEC = `UPDATE body_builders SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Luxury Types ─────────────────────────────────────────────────────────────
exports.getLuxuryTypesMdl = function (callback) {
  var cntxtDtls = "in getLuxuryTypesMdl";
  var QRY_TO_EXEC = `SELECT * FROM luxury_types WHERE d_in=0 ORDER BY type_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addLuxuryTypeMdl = function (data, callback) {
  var cntxtDtls = "in addLuxuryTypeMdl";
  var QRY_TO_EXEC = `INSERT INTO luxury_types (type_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.type_name], cntxtDtls, callback);
};
exports.deleteLuxuryTypeMdl = function (data, callback) {
  var cntxtDtls = "in deleteLuxuryTypeMdl";
  var QRY_TO_EXEC = `UPDATE luxury_types SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Mfg Years ────────────────────────────────────────────────────────────────
exports.getMfgYearsMdl = function (callback) {
  var cntxtDtls = "in getMfgYearsMdl";
  var QRY_TO_EXEC = `SELECT * FROM mfg_years WHERE d_in=0 ORDER BY year_value DESC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addMfgYearMdl = function (data, callback) {
  var cntxtDtls = "in addMfgYearMdl";
  var QRY_TO_EXEC = `INSERT INTO mfg_years (year_value) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.year_value], cntxtDtls, callback);
};
exports.deleteMfgYearMdl = function (data, callback) {
  var cntxtDtls = "in deleteMfgYearMdl";
  var QRY_TO_EXEC = `UPDATE mfg_years SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── City List ────────────────────────────────────────────────────────────────
exports.getCityListMdl = function (callback) {
  var cntxtDtls = "in getCityListMdl";
  var QRY_TO_EXEC = `SELECT * FROM city_list WHERE d_in=0 ORDER BY city_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addCityListMdl = function (data, callback) {
  var cntxtDtls = "in addCityListMdl";
  var QRY_TO_EXEC = `INSERT INTO city_list (city_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.city_name], cntxtDtls, callback);
};
exports.deleteCityListMdl = function (data, callback) {
  var cntxtDtls = "in deleteCityListMdl";
  var QRY_TO_EXEC = `UPDATE city_list SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Boarding Points ──────────────────────────────────────────────────────────
exports.getBoardingPointsMdl = function (callback) {
  var cntxtDtls = "in getBoardingPointsMdl";
  var QRY_TO_EXEC = `SELECT * FROM boarding_points WHERE d_in=0 ORDER BY point_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addBoardingPointMdl = function (data, callback) {
  var cntxtDtls = "in addBoardingPointMdl";
  var QRY_TO_EXEC = `INSERT INTO boarding_points (point_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.point_name], cntxtDtls, callback);
};
exports.deleteBoardingPointMdl = function (data, callback) {
  var cntxtDtls = "in deleteBoardingPointMdl";
  var QRY_TO_EXEC = `UPDATE boarding_points SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Bus Operators ────────────────────────────────────────────────────────────
exports.getBusOperatorsMdl = function (callback) {
  var cntxtDtls = "in getBusOperatorsMdl";
  var QRY_TO_EXEC = `SELECT * FROM bus_operators WHERE d_in=0 ORDER BY operator_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addBusOperatorMdl = function (data, callback) {
  var cntxtDtls = "in addBusOperatorMdl";
  var QRY_TO_EXEC = `INSERT INTO bus_operators (operator_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.operator_name], cntxtDtls, callback);
};
exports.deleteBusOperatorMdl = function (data, callback) {
  var cntxtDtls = "in deleteBusOperatorMdl";
  var QRY_TO_EXEC = `UPDATE bus_operators SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Line Codes ───────────────────────────────────────────────────────────────
exports.getLineCodesMdl = function (callback) {
  var cntxtDtls = "in getLineCodesMdl";
  var QRY_TO_EXEC = `SELECT * FROM line_codes WHERE d_in=0 ORDER BY line_code`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addLineCodeMdl = function (data, callback) {
  var cntxtDtls = "in addLineCodeMdl";
  var QRY_TO_EXEC = `INSERT INTO line_codes (line_code) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.line_code], cntxtDtls, callback);
};
exports.deleteLineCodeMdl = function (data, callback) {
  var cntxtDtls = "in deleteLineCodeMdl";
  var QRY_TO_EXEC = `UPDATE line_codes SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Route IDs ────────────────────────────────────────────────────────────────
exports.getRouteIdsMdl = function (callback) {
  var cntxtDtls = "in getRouteIdsMdl";
  var QRY_TO_EXEC = `SELECT * FROM route_ids WHERE d_in=0 ORDER BY route_id_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addRouteIdMdl = function (data, callback) {
  var cntxtDtls = "in addRouteIdMdl";
  var QRY_TO_EXEC = `INSERT INTO route_ids (route_id_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.route_id_name], cntxtDtls, callback);
};
exports.deleteRouteIdMdl = function (data, callback) {
  var cntxtDtls = "in deleteRouteIdMdl";
  var QRY_TO_EXEC = `UPDATE route_ids SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Terminate / Rejoin ───────────────────────────────────────────────────────
exports.terminateStaffMdl = function (data, callback) {
  var cntxtDtls = "in terminateStaffMdl";
  var tableMap = { staff: 'staff_register', driver: 'driver_register', helper: 'helper_register' };
  var dateCol  = data.staff_type === 'staff' ? 'dateOfLeaving' : 'date_of_leaving';
  var table    = tableMap[data.staff_type] || 'staff_register';
  var QRY_TO_EXEC = `UPDATE ${table} SET d_in=1, ${dateCol}='${data.termination_date}', termination_reason='${data.termination_reason}' WHERE id='${data.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.rejoinStaffMdl = function (data, callback) {
  var cntxtDtls = "in rejoinStaffMdl";
  var tableMap = { staff: 'staff_register', driver: 'driver_register', helper: 'helper_register' };
  var dateCol  = data.staff_type === 'staff' ? 'dateOfLeaving' : 'date_of_leaving';
  var table    = tableMap[data.staff_type] || 'staff_register';
  var QRY_TO_EXEC = `UPDATE ${table} SET d_in=0, ${dateCol}=NULL, termination_reason=NULL WHERE id='${data.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getTerminatedStaffMdl = function (callback) {
  var cntxtDtls = "in getTerminatedStaffMdl";
  var QRY_TO_EXEC = `
    SELECT id, fullName AS name, designation AS role, mobile, dateOfLeaving AS leaving_date, termination_reason, 'staff' AS staff_type FROM staff_register WHERE d_in=1
    UNION ALL
    SELECT id, driver_name AS name, 'Driver' AS role, mobile_number AS mobile, date_of_leaving AS leaving_date, termination_reason, 'driver' AS staff_type FROM driver_register WHERE d_in=1
    UNION ALL
    SELECT id, helper_name AS name, 'Helper' AS role, mobile_number AS mobile, date_of_leaving AS leaving_date, termination_reason, 'helper' AS staff_type FROM helper_register WHERE d_in=1
    ORDER BY leaving_date DESC;`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletestaffdataMdl = function (data, callback) {
  var cntxtDtls = "in deletehelperdata";
  var QRY_TO_EXEC = ` update staff_register set d_in = '1'  WHERE  id = '${data.index}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

////booking module starts
exports.getaccountantsdataMdl = function (data, callback) {
  var cntxtDtls = "in getaccountantsdataMdl";
  var QRY_TO_EXEC = `SELECT ad.*, u.name, SUM(ad.amount) AS f_amount FROM accountant_data ad JOIN users u ON u.id = ad.colagent_id WHERE ad.d_in = '0' AND ad.accontant_id = '${data.user_id}' AND ad.status = '0' GROUP BY ad.colagent_id, u.id`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.accounttantscleardataMdl = function (data, callback) {
  var cntxtDtls = "in accounttantscleardataMdl";
  var statusvalue = data.data.statusType == 2 ? 1 : 2;
  var agentsubmitAcntValue = data.data.statusType == 2 ? 3 : 2;
  // First, get the affected rows
  var QRY_SELECT = `SELECT * FROM accountant_data WHERE colagent_id = '${data.data.colagent_id}' and status='0'`;
  dbutil.execQuery(
    sqldb,
    QRY_SELECT,
    cntxtDtls,
    function (err, results) {
      if (err) {
        if (callback && typeof callback == "function") {
          callback(err, null);
        }
        return;
      }
      // Now update the status field in the accountant_data table
      var QRY_UPDATE = `UPDATE accountant_data SET status = '${statusvalue}' WHERE colagent_id = '${data.data.colagent_id}' and status='0' `;
      dbutil.execQuery(
        sqldb,
        QRY_UPDATE,
        cntxtDtls,
        function (updateErr, updateResults) {
          if (updateErr) {
            if (callback && typeof callback == "function") {
              callback(updateErr, null);
            }
            return;
          }
          // Use the data from the SELECT query to update another table
          var affectedRows = results;
          var insertQueries = affectedRows
            .map((row) => {
              return `UPDATE samanvidata SET agentsubmit_acnt = '${agentsubmitAcntValue}' WHERE assigned_id = '${row.colagent_id}' and 
				assigneddate='${row.dates}' AND d_in = '0' and id='${row.service_id}' and agentsubmit_acnt='1'`;
            })
            .join("; ");

          dbutil.execQuery(
            sqldb,
            insertQueries,
            cntxtDtls,
            function (insertErr, insertResults) {
              if (callback && typeof callback == "function") {
                callback(insertErr, insertResults);
              }
            }
          );
        }
      );
    }
  );
};
exports.expensessubmitMdl = function (data, callback) {
  var cntxtDtls = "in expensessubmitMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `insert into expenses_data(bus_number, description, amount,user_id,date,status,insert_date) VALUES ('${data.bus_number}','${data.description}','${data.amount}','${data.user_id}','${date}','1','${data.date}') `;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.cashreceiptsubmit = function (data, callback) {
  var cntxtDtls = "in cashreceiptsubmit";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `insert into cashreceipts(date, description, amount,user_id,created_date) VALUES ('${data.date}','${data.description}','${data.amount}','${data.user_id}','${date}') `;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addtoaccountentagentMdlInsert = function (data, callback) {
  var cntxtDtls = "in addtoaccountentagentMdlInsert";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD");
  var QRY_TO_EXEC = "";
  data.selectedRows.forEach((row) => {
    QRY_TO_EXEC += `INSERT INTO accountant_data (accontant_id, colagent_id, service_id, amount, dates,ramrks) VALUES ('${data.selectedAccountant.id}', '${data.user_id}', '${row.id}', '${row.amount}', '${date}','${data.notss}'); `;
  });
  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};
exports.addtoaccountentagentMdlUpdate = function (data, callback) {
  var cntxtDtls = "in addtoaccountentagentMdlUpdate";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  var updateQueries = data.selectedRows
    .map((row) => {
      return `UPDATE samanvidata SET agentsubmit_acnt = '1',assigneddate='${date}' WHERE id = '${row.id}';`;
    })
    .join(" ");
  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      updateQueries,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, updateQueries, cntxtDtls);
  }
};

exports.getaccountantanalysisdataMdl = function (data, callback) {
  var cntxtDtls = "in getaccountantanalysisdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT 
    -- Current balance: total income - total expenses
    ((SELECT COALESCE(SUM(amount), 0) FROM accountant_data 
      WHERE d_in = '0' AND status = '2' AND accontant_id = '${data.user_id}') 
     + 
     (SELECT COALESCE(SUM(amount), 0) FROM additionalincome 
      WHERE user_id = '${data.user_id}' AND status = '2') 
     - 
     (SELECT COALESCE(SUM(amount), 0) FROM expenses_data 
      WHERE user_id = '${data.user_id}' AND status = '2')) AS current_balance,

    -- Additional income
    (SELECT COALESCE(SUM(amount), 0) FROM additionalincome 
     WHERE user_id = '${data.user_id}' AND status = '1') AS additional_income,

    -- Expenses amount
    (SELECT COALESCE(SUM(amount), 0) FROM expenses_data 
     WHERE user_id = '${data.user_id}' AND status = '1') AS expenses_amount,

    -- Balance amount: sum of accountant data and additional income minus expenses
    ((SELECT COALESCE(SUM(amount), 0) FROM accountant_data 
      WHERE d_in = '0' AND status = '2' AND accontant_id = '${data.user_id}') 
     + 
     (SELECT COALESCE(SUM(amount), 0) FROM additionalincome 
      WHERE user_id = '${data.user_id}' AND status = '1') 
     - 
     (SELECT COALESCE(SUM(amount), 0) FROM expenses_data 
      WHERE user_id = '${data.user_id}' AND status = '1')) AS balance_amount;`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getcollectionagentMdl = function (data, callback) {
  var cntxtDtls = "in getcollectionagentMdl";
  var QRY_TO_EXEC = `SELECT * from users where d_in=0 and usertype='2' order by id desc`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.accountanthistdataMdl = function (data, callback) {
  var cntxtDtls = "in accountanthistdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT ad.*, u.name, SUM(ad.amount) AS f_amount FROM accountant_data ad JOIN users u ON u.id = ad.colagent_id WHERE ad.d_in = '0' AND ad.accontant_id = '${data.user_id}'and ad.dates = '${date}' GROUP BY ad.colagent_id, u.id`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getvendordataMdl = function (data, callback) {
  var cntxtDtls = "in getvendordataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `
            SELECT
        p.id as mainparent_id,
        p.name AS mainparent_vendor_name,
        p.c_number AS mainparent_c_number,
        p.voucherdate as mainparent_voucherdate,
        p.fromdate as mainparent_fromdate,
        p.todate as mainparent_todate,
        p.creditanddebitamount as parent_creditanddebitamount,
        c.*,   -- all child columns
        c.id as child_id
        FROM mainlaundry_t p
        JOIN laundry_subt c ON p.c_number = c.c_number
        WHERE p.c_number = '${data.c_number}' and p.d_in=0 and c.d_in=0;`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.accountanthistcheckdataMdl = function (data, callback) {
  var cntxtDtls = "in accountanthistcheckdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT ad.*, u.name, SUM(ad.amount) AS f_amount FROM accountant_data ad JOIN users u ON u.id = ad.colagent_id WHERE ad.d_in = '0' AND ad.accontant_id = '${data.user_id}' AND ad.dates BETWEEN '${data.fromdate}' AND '${data.todate}'
GROUP BY ad.colagent_id, u.id;`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.totalincomesourcedataMdl = function (data, callback) {
  var cntxtDtls = "in totalincomesourcedataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `select * from additionalincome where user_id='${data.user_id}' and date='${date}'`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.chechwithadditioncountsMdl = function (data, callback) {
  const cntxtDtls = "in chechwithadditioncountsMdl";
  const QRY_TO_EXEC = ` SELECT *  FROM additionalincome   WHERE user_id = '${data.user_id}'   AND date BETWEEN '${data.fromdate}' AND '${data.todate}' `;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};
exports.totalexpensesdataMdl = function (data, callback) {
  var cntxtDtls = "in totalexpensesdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `select * from expenses_data where user_id='${data.user_id}' and date='${date}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.chechwithexpenescountsMdl = function (data, callback) {
  var cntxtDtls = "in chechwithexpenescountsMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `select * from expenses_data where  user_id = '${data.user_id}'   AND date BETWEEN '${data.fromdate}' AND '${data.todate}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getexpensestochairmanshistoryMdl = function (callback) {
  var cntxtDtls = "in getexpensestochairmanshistoryMdl";
  var QRY_TO_EXEC = `select (SELECT COALESCE(SUM(amount), 0) FROM expenses_data WHERE d_in = '0' AND status = '2') AS expenses`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.deleteincomsorcedataMdl = function (data, callback) {
  var cntxtDtls = "in deleteincomsorcedataMdl";
  var QRY_TO_EXEC = ` update additionalincome set d_in = '1'  WHERE  id = '${data.index}'`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.aditionalincomesourceMdl = function (data, callback) {
  var cntxtDtls = "in aditionalincomesourceMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `insert into additionalincome(additionalsource, amount, date,user_id,status,insert_date) VALUES ('${data.incomesource}','${data.amount}','${date}','${data.user_id}','1','${data.insert_date}') `;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getincomesourceMdl = function (data, callback) {
  var cntxtDtls = "in getincomesourceMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `select * from additionalincome where user_id='${data.user_id}' and d_in='0'`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.submiteditincomesrcMdl = function (data, callback) {
  var cntxtDtls = "in submiteditincomesrcMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `update additionalincome set additionalsource='${data.incomesource}', amount='${data.amount}',user_id='${data.user_id}',status='1' where id= '${data.id}' and d_in='0'   `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getexpenseslist = function (callback) {
  var cntxtDtls = "in getexpenseslist";
  var QRY_TO_EXEC = `select * from tripexpenses_data  where  d_in='0'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getbookingsdataMdl = function (callback) {
  var cntxtDtls = "in getbookingsdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT * from samanvidata where d_in=0   order by id desc `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.assigntoagentMdl = function (data, callback) {
  var cntxtDtls = "in assigntoagentMdl";
  var QRY_TO_EXEC = ` update samanvidata set assigned_id = '${data.user_id}',assigned_name='${data.named}',finalamount = '${data.amounts}'  WHERE  id = '${data.id}'`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.assigntoamountsMdl = function (data, callback) {
  var cntxtDtls = "in assigntoamountsMdl";
  var QRY_TO_EXEC = ` update samanvidata set finalamount = '${data.amounts}'  WHERE  id = '${data.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.deletedataMdl = function (data, callback) {
  var cntxtDtls = "in deletedataMdl";
  var QRY_TO_EXEC = ` update samanvidata set d_in = '1'  WHERE  id = '${data.index}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.uploadexceldataMdl = function (data, callback) {
  var cntxtDtls = "in uploadexceldataMdl";
  function sanitize(value) {
    return value === undefined ? "" : value;
  }
  var QRY_TO_EXEC = `insert into samanvidata(servicenumber,seatnumber,name,fare,gst,discount,agentcommission,amount,bookedby,remarks,date) values 
    ('${sanitize(data.servicenumber)}','${sanitize(
    data.seatnumber
  )}','${sanitize(data.name)}','${sanitize(data.fare)}','${sanitize(
    data.gst
  )}','${sanitize(data.discount)}','${sanitize(
    data.agentcommission
  )}','${sanitize(data.amount)}','${sanitize(data.bookedby)}','${sanitize(
    data.remarks
  )}','${sanitize(data.date)}');`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.editthedataofadminMdl = function (data, callback) {
  var cntxtDtls = "in editthedataofadminMdl";
  var QRY_TO_EXEC = `update samanvidata set assigned_name='${data.assigned_id}',finalamount='${data.finalamount}'  WHERE  id = '${data.id}' `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.checkAlreadyDatedatexts = function (data, callback) {
  var cntxtDtls = "in checkAlreadyDatedatexts";
  var daterslt = data.rqrd_date;
  var QRY_TO_EXEC = `SELECT * FROM samanvidata WHERE d_in='0' AND date='${daterslt}'`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        if (err) {
          console.error("Database Query Error:", err);
          return callback(err, []);
        }
        return callback(null, results || []);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};
exports.addSamanvidataMdl = function (data, callback) {
  const cntxtDtls = "in addSamanvidataMdl";
  var QRY_TO_EXEC = "";
  var MUL_QRY_TO_EXEC = "";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  // Check if 'data.collections' exists and has items
  if (!data.collections || data.collections.length === 0) {
    return callback(new Error("No collections found"), null); // Handle the case where no collections are provided
  }

  for (let i = 0; i < data.collections.length; i++) {
    QRY_TO_EXEC = `INSERT INTO samanvidata (pnr_no , service_name, 
        servicenumber, seatnumber, name, fare, gst, discount,
         agentcommission, amount, bookedby, remarks, date , booking_source , i_ts  )
        VALUES('${data.collections[i].pnr_number}' ,
        '${data.collections[i].service_name}' ,
         '${data.collections[i].service_number}' , 
         '${data.collections[i].seat_no}' ,
          '${data.collections[i].passenger_name}',
          '${data.collections[i].base_fare}',
          '${data.collections[i].gst}', 
          '${data.collections[i].discount}' ,
           '${data.collections[i].branch_agent_commission}' ,
          '${data.collections[i].net_ticket_amount}'  ,
       '${data.collections[i].booked_by}'  ,
       '${data.collections[i].remarks}'  ,  
       '${data.collections[i].travel_date}'   , 
       '${data.collections[i].booking_source}' , 
       '${date}');`;

    MUL_QRY_TO_EXEC = MUL_QRY_TO_EXEC + QRY_TO_EXEC;
  }

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      MUL_QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, MUL_QRY_TO_EXEC, cntxtDtls);
  }
};
exports.getbookingsdatahisdatewiseMdl = function (callback) {
  var cntxtDtls = "in getbookingsdatahisdatewiseMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT * from samanvidata where d_in=0  and date='${date}' order by id desc`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getbookingselecteddateswiseMdl = function (data, callback) {
  var cntxtDtls = "in getbookingselecteddateswiseMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT * 
FROM samanvidata 
WHERE d_in = 0 
  AND date BETWEEN '${data.fromdate}' AND '${data.todate}' 
ORDER BY id DESC `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getcollectionagentdataMdl = function (data, callback) {
  var cntxtDtls = "in getcollectionagentdataMdl";
  var QRY_TO_EXEC = ` SELECT * from samanvidata where d_in=0 And assigned_id='${data.user_id}' And (agentsubmit_acnt = 0 OR agentsubmit_acnt = 3)  order by id desc ; `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getaccountantsnamesMdl = function (callback) {
  var cntxtDtls = "in getaccountantsnamesMdl";
  var QRY_TO_EXEC = `SELECT * from users where d_in=0 and usertype='3'  order by id desc`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getcollectionagenanalysisdataMdl = function (data, callback) {
  var cntxtDtls = "in getcollectionagenanalysisdataMdl";
  var QRY_TO_EXEC = ` SELECT(select count(*) from samanvidata where d_in='0' and assigned_id='${data.user_id}'and agentsubmit_acnt='0' ) as totalcount, (select sum(finalamount) from samanvidata where d_in='0'and assigned_id='${data.user_id}'and agentsubmit_acnt='0') as assignedamount, (SELECT sum(finalamount) FROM samanvidata WHERE d_in=0 AND assigned_id='${data.user_id}' and agentsubmit_acnt='1') as assignedtoaccnt, ((SELECT sum(finalamount) FROM samanvidata WHERE d_in=0 AND  assigned_id='${data.user_id}')-(SELECT sum(finalamount) FROM samanvidata WHERE d_in=0 AND assigned_id='${data.user_id}' and agentsubmit_acnt='1') )as blncamount`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getcollectiondatadatewiseMdl = function (data, callback) {
  var cntxtDtls = "in getcollectiondatadatewiseMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT * FROM samanvidata  WHERE d_in = 0 and assigned_id='${data.user_id}' and date ='${date}'ORDER BY id DESC `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getcollectiondataondatesMdl = function (data, callback) {
  var cntxtDtls = "in getcollectiondataondatesMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT * FROM samanvidata WHERE d_in = 0  AND date BETWEEN '${data.fromdate}' AND '${data.todate}' And   assigned_id='${data.user_id}' ORDER BY id DESC `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getexpensesMdl = function (data, callback) {
  var cntxtDtls = "in getexpensesMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `
  SELECT
  t.*,
  t.id AS trip_creation_id,
  COALESCE(d1.nickname, d1.driver_name, t.driver1_name) AS driver1_name,
  COALESCE(d2.nickname, d2.driver_name, t.driver2_name) AS driver2_name,
  COALESCE(h.helper_name, t.helper_name) AS helper_name,
  COALESCE(s.fullName, t.conductor_name) AS conductor_name,
  CASE
    WHEN t.paid_to_type = 'driver' THEN COALESCE(d3.nickname, d3.driver_name, t.paid_to_name)
    WHEN t.paid_to_type = 'helper' THEN COALESCE(h2.helper_name, t.paid_to_name)
    WHEN t.paid_to_type = 'staff' THEN COALESCE(s2.fullName, t.paid_to_name)
    ELSE t.paid_to_name
  END AS paid_to_name
FROM
  trip_created t
LEFT JOIN driver_register d1 ON t.driver1_id = d1.id
LEFT JOIN driver_register d2 ON t.driver2_id = d2.id
LEFT JOIN helper_register h ON t.helper_id = h.id
LEFT JOIN staff_register s ON t.conductor_id = s.id
LEFT JOIN driver_register d3 ON t.paid_to_id = d3.id
LEFT JOIN helper_register h2 ON t.paid_to_id = h2.id
LEFT JOIN staff_register s2 ON t.paid_to_id = s2.id
WHERE
  t.d_in = '0' AND t.admin_status != '1'
  order by trip_date DESC;
`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getexpensesreportMdl = function (data, callback) {
  var cntxtDtls = "in getexpensesreportMdl";

  console.log(data);
  let check = "";
  if (data.type == "approved") {
    check = ' and admin_status="1"';
  } else {
    check = ' and admin_status= "2"';
  }

  var QRY_TO_EXEC = `SELECT 
    te.*, 
    d1.nickname AS driver1_name,
    d2.nickname AS driver2_name,
    h.helper_name AS helper_name,
    s.fullName AS conductor_name,
    CASE 
    WHEN te.paid_to_type = 'driver' THEN d3.nickname
    WHEN te.paid_to_type = 'helper' THEN h2.helper_name
    WHEN te.paid_to_type = 'staff' THEN s2.fullName
    ELSE NULL
  END AS paid_to_name
  FROM 
    tripexpenses_data te
  LEFT JOIN driver_register d1 ON te.driver1_id = d1.id
  LEFT JOIN driver_register d2 ON te.driver2_id = d2.id
  LEFT JOIN helper_register h ON te.helper_id = h.id
  LEFT JOIN staff_register s ON te.conductor_id = s.id
  LEFT JOIN driver_register d3 ON te.paid_to_id = d3.id
LEFT JOIN helper_register h2 ON te.paid_to_id = h2.id
LEFT JOIN staff_register s2 ON te.paid_to_id = s2.id
  WHERE 
    te.d_in = '0' ${check}`;

  console.log(QRY_TO_EXEC);

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deleteexpensesdataMdl = function (data, callback) {
  var cntxtDtls = "in deleteexpensesdataMdl";
  var QRY_TO_EXEC = ` update expenses_data set d_in = '1'  WHERE  id = '${data.index}'`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.maintripexpenseuniquenoMdl = function (callback) {
  var cntxtDtls = "in maintripexpenseuniquenoMdl";
  var QRY_TO_EXEC = `SELECT c_id FROM trip_created  WHERE d_in='0' order by c_id desc limit 1 ;`;
  //console.log()QRY_TO_EXEC, 22582);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletetripexpensesMdl = function (data, callback) {
  var cntxtDtls = "in deletetripexpensesMdl";
  var QRY_TO_EXEC = `
  update tripexpenses_data set d_in = '2'  WHERE  c_number = '${data.c_number}';
  update expensive_details set d_in='2' WHERE c_number = '${data.c_number}';
  `;
  //console.log()QRY_TO_EXEC, 22582);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.adddiagnoptntTstdtsmmdl = function (
  c_id,
  c_number,
  lastid,
  data,
  callback
) {
  var cntxtDtls = "in adddiagnoptntTstdtsmmdl";
  //console.log()data, 1225);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = "";

  var bus_no = data.expensedetails.bus_no;

  var service_no = data.expensedetails.service_no;

  QRY_TO_EXEC = `INSERT INTO expensive_details(serial_no,expensives,amount,bus_no,service_no,child,district_id,mandal_id,subchildtwo,temple_name,village_id,i_ts,staticname,mandal_name,subchildtwo_id,amount_type,c_id,c_number,trip_date,parent_subgroup_id,parent_subchild_id,parent_grp_level,ledger_id,account_type,paid_to_id,paid_to_name,paid_to_type,trip_creation_id) VALUES ?`;
  const values = data.patientsTstdts.map((obj) => [
    lastid,
    obj.d_test_name.temple_name,
    obj.d_test_amount || data.credit.credit_amount,
    bus_no,
    service_no,
    obj.d_test_name.child,
    obj.d_test_name.district_id,
    obj.d_test_name.mandal_id,
    obj.d_test_name.subchildtwo,
    obj.d_test_name.temple_name,
    obj.d_test_name.village_id,
    date,
    obj.d_test_name.staticname,
    obj.d_test_name.mandal_name,
    obj.d_test_name.subchildtwo_id,
    obj.account_name,
    c_id,
    c_number,
    data.expensedetails.trip_date,
    obj.d_test_name.parent_subgroup_id,
    obj.d_test_name.parent_subchild_id,
    obj.d_test_name.parent_grp_level,
    obj.d_test_name.ledger_id,
    obj.account_name,
    data.expensedetails.paid_to_id,
    data.expensedetails.paid_to_name,
    data.expensedetails.paid_to_type,
    data.expensedetails.trip_creation_id,
  ]);
  if (callback && typeof callback == "function")
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      values,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updateadddiagnoptntTstdtsmmdl = function (
  c_id,
  c_number,
  lastid,
  data,
  callback
) {
  var cntxtDtls = "in adddiagnoptntTstdtsmmdl";
  //console.log()data, 1225);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = "";

  var bus_no = data.expensedetails.bus_no;

  var service_no = data.expensedetails.service_no;

  QRY_TO_EXEC = `INSERT INTO expensive_details(serial_no,expensives,amount,bus_no,service_no,child,district_id,mandal_id,subchildtwo,temple_name,village_id,i_ts,staticname,mandal_name,subchildtwo_id,amount_type,c_id,c_number,trip_date,parent_subgroup_id,parent_subchild_id,parent_grp_level,ledger_id,account_type,paid_to_id,paid_to_name,paid_to_type,trip_creation_id) VALUES ?`;
  const values = data.patientsTstdts.map((obj) => [
    lastid,
    obj.d_test_name.temple_name,
    obj.d_test_amount || data.credit.credit_amount,
    bus_no,
    service_no,
    obj.d_test_name.child,
    obj.d_test_name.district_id,
    obj.d_test_name.mandal_id,
    obj.d_test_name.subchildtwo,
    obj.d_test_name.temple_name,
    obj.d_test_name.village_id,
    data.date,
    obj.d_test_name.staticname,
    obj.d_test_name.mandal_name,
    obj.d_test_name.subchildtwo_id,
    obj.account_name,
    data.c_id,
    data.c_number,
    data.expensedetails.trip_date,
    obj.d_test_name.parent_subgroup_id,
    obj.d_test_name.parent_subchild_id,
    obj.d_test_name.parent_grp_level,
    obj.d_test_name.ledger_id,
    obj.account_name,
    data.paid_to_id,
    data.paid_to_name,
    data.paid_to_type,
    data.trip_creation_id,
  ]);
  if (callback && typeof callback == "function")
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      values,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.adddingcreditmmdl = function (c_id, c_number, lastid, data, callback) {
  var cntxtDtls = "in adddingcreditmmdl";
  //console.log()data.credit.credit_name, 1592);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = "";
  var bus_no = data.expensedetails.bus_no;
  var service_no = data.expensedetails.service_no;

  QRY_TO_EXEC = `INSERT INTO expensive_details(serial_no,expensives,amount,amount_type,credit_amount,bus_no,service_no,child,district_id,mandal_id,subchildtwo,temple_name,village_id,i_ts,staticname,mandal_name,subchildtwo_id,c_id,c_number,trip_date,parent_subgroup_id,parent_subchild_id,parent_grp_level,ledger_id,account_type,paid_to_id,paid_to_name,paid_to_type,trip_creation_id) VALUES ?`;
  const values = data.credit.map((obj) => [
    lastid,
    obj.credit_name.temple_name,
    data.patientsTstdts.d_test_amount || obj.credit_amount,
    obj.account_name,
    obj.credit_amount,
    bus_no,
    service_no,
    obj.credit_name.child,
    obj.credit_name.district_id,
    obj.credit_name.mandal_id,
    obj.credit_name.subchildtwo,
    obj.credit_name.temple_name,
    obj.credit_name.village_id,
    date,
    obj.credit_name.staticname,
    obj.credit_name.mandal_name,
    obj.credit_name.subchildtwo_id,
    c_id,
    c_number,
    data.expensedetails.trip_date,
    obj.credit_name.parent_subgroup_id,
    obj.credit_name.parent_subchild_id,
    obj.credit_name.parent_grp_level,
    obj.credit_name.ledger_id,
    obj.account_name,
    data.expensedetails.paid_to_id,
    data.expensedetails.paid_to_name,
    data.expensedetails.paid_to_type,
    data.expensedetails.trip_creation_id,
  ]);
  //console.log()QRY_TO_EXEC, 1619);

  if (callback && typeof callback == "function")
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      values,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updateadddingcreditmmdl = function (
  c_id,
  c_number,
  lastid,
  data,
  callback
) {
  var cntxtDtls = "in adddingcreditmmdl";
  //console.log()data.credit.credit_name, 1592);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = "";
  var bus_no = data.expensedetails.bus_no;
  var service_no = data.expensedetails.service_no;

  QRY_TO_EXEC = `INSERT INTO expensive_details(serial_no,expensives,amount,amount_type,credit_amount,bus_no,service_no,child,district_id,mandal_id,subchildtwo,temple_name,village_id,i_ts,staticname,mandal_name,subchildtwo_id,c_id,c_number,trip_date,parent_subgroup_id,parent_subchild_id,parent_grp_level,ledger_id,account_type,paid_to_id,paid_to_name,paid_to_type,trip_creation_id) VALUES ?`;
  const values = data.credit.map((obj) => [
    lastid,
    obj.credit_name.temple_name,
    data.patientsTstdts.d_test_amount || obj.credit_amount,
    obj.account_name,
    obj.credit_amount,
    bus_no,
    service_no,
    obj.credit_name.child,
    obj.credit_name.district_id,
    obj.credit_name.mandal_id,
    obj.credit_name.subchildtwo,
    obj.credit_name.temple_name,
    obj.credit_name.village_id,
    data.date,
    obj.credit_name.staticname,
    obj.credit_name.mandal_name,
    obj.credit_name.subchildtwo_id,
    data.c_id,
    data.c_number,
    data.expensedetails.trip_date,
    obj.credit_name.parent_subgroup_id,
    obj.credit_name.parent_subchild_id,
    obj.credit_name.parent_grp_level,
    obj.credit_name.ledger_id,
    obj.account_name,
    data.paid_to_id,
    data.paid_to_name,
    data.paid_to_type,
    data.trip_creation_id,
  ]);
  //console.log()QRY_TO_EXEC, 1619);

  if (callback && typeof callback == "function")
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      values,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updatefunction = function (c_id, c_number, data, callback) {
  //console.log()data, 15589);

  var cntxtDtls = "in updatefunction";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `update trip_created set status = '1',grantotal='${data.expensedetails.grandtotal}',salary_beta_tot_amount='${data.total_salary_beta}',total_amount='${data.total_amount}',c_id='${c_id}',c_number='${c_number}'  WHERE  id = '${data.expensedetails.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.editupdatefunction = function (c_id, c_number, data, callback) {
  //console.log()data, 15589);

  var cntxtDtls = "in updatefunction";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `update trip_created set status = '1',grantotal='${data.expensedetails.grandtotal}',salary_beta_tot_amount='${data.total_salary_beta}',total_amount='${data.total_amount}',c_id='${data.c_id}',c_number='${data.c_number}'  WHERE  id = '${data.expensedetails.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getexpensesfiltere = function (data, callback) {
  var cntxtDtls = "in getexpensesfiltere";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  var QRY_TO_EXEC = `SELECT * FROM trip_created WHERE d_in = 0  AND trip_date BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY id DESC `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deleteexpenseMdl = function (data, callback) {
  var cntxtDtls = "in deleteexpenseMdl";

  var QRY_TO_EXEC = `
  update tripexpenses_data set d_in = '1',delete_by_id='${data.delete_by_id}',delete_by_name='${data.delete_by_name}',delete_by_date='${data.delete_by_date}'  WHERE  c_number = '${data.c_number}';
  update expensive_details set d_in='1' WHERE c_number = '${data.c_number}';
  update trip_created set d_in='1' WHERE c_number = '${data.c_number}';
  `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getexpensesreportsfiltereMdl = function (data, callback) {
  var cntxtDtls = "in getexpensesreportsfiltereMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  let check2 = "";

  if (data.fromdate != "" && data.todate != "") {
    check2 = `  AND trip_date BETWEEN '${data.fromdate}' AND '${data.todate}' `;
  }

  let check = "";
  if (data.type == "1") {
    check = " and admin_status=1";
  } else {
    check = " and admin_status=2";
  }

  var QRY_TO_EXEC = `SELECT * FROM tripexpenses_data WHERE d_in = 0  ${check2}  ${check} ORDER BY id DESC `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getbusseraching = function (data, callback) {
  var cntxtDtls = "in getbusseraching";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT * FROM trip_created WHERE d_in = 0  AND bus_no = '${data.bus_no}' ORDER BY id DESC `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getaccountantanalysisdatas = function (data, callback) {
  var cntxtDtls = "in getaccountantanalysisdatas";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT 
    (
     (SELECT COALESCE(SUM(amount), 0) FROM cashreceipts 
      WHERE user_id = '${data.user_id}' AND status = '2') 
     - 
     (SELECT COALESCE(SUM(amount), 0) FROM expenses_data 
      WHERE user_id = '${data.user_id}' AND status = '2')) AS current_balance,


    (SELECT COALESCE(SUM(amount), 0) FROM cashreceipts 
     WHERE user_id = '${data.user_id}' AND status = '1') AS additional_income,


    (SELECT COALESCE(SUM(amount), 0) FROM expenses_data 
     WHERE user_id = '${data.user_id}' AND status = '1') AS expenses_amount,


    ((SELECT COALESCE(SUM(amount), 0) FROM cashreceipts 
      WHERE user_id = '${data.user_id}' AND status = '1') 
     - 
     (SELECT COALESCE(SUM(amount), 0) FROM expenses_data 
      WHERE user_id = '${data.user_id}' AND status = '1')) AS balance_amount;`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getserviceseraching = function (data, callback) {
  var cntxtDtls = "in getserviceseraching";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = `SELECT * FROM trip_created WHERE d_in = 0  AND service_no = '${data.service_no}' ORDER BY id DESC `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getpatientDiagnosticTestsmmdl = function (data, callback) {
  var cntxtDtls = "in getpatientDiagnosticTestsmmdl";
  var QRY_TO_EXEC = `SELECT 
    a.id AS expense_id,
    a.serial_no,
    a.expensives,
    a.amount,
    a.bus_no,
    a.service_no,
    b.driveronebeta,
    b.driveronebeta_payment,
    b.driveronesalary,
    b.driverone_payment,
    b.drivertwobeta,
    b.drivertwobeta_payment,
    b.drivertwosalary,
    b.drivertwo_payment,
    b.helperbeta,
    b.helperbeta_payment,
    b.helpersalary,
    b.helper_payment
FROM 
    expensive_details AS a
JOIN 
    tripexpenses_data AS b
ON 
    a.serial_no = b.id
WHERE 
    a.d_in = '0' 
AND 
    a.serial_no = '${data.group_id}';
`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// exports.addledgerpostmaindataMdl = function (data, callback) {
//     var cntxtDtls = "in addledgerpostmaindataMdl";
//     //console.log()data,1380);
//     var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
//     var dta = {
//         selectedasset: data.selectedasset,
//         user_id: data.user_id,
//         usr_nm: data.usr_nm,
//         i_ts: date,
//     }
//     //console.log()dta, 334);
//     var QRY_TO_EXEC = `insert into addledger set ?;`;
//     //console.log()QRY_TO_EXEC, 336)
//     if (callback && typeof callback == "function")
//         dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, dta, cntxtDtls, function (err, results) {
//             callback(err, results);
//             return;
//         });
//     else
//         return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
// };

// exports.addledgerpostsubdataMdl = function (data, p_id, callback) {
//     var cntxtDtls = "in addledgerpostsubdataMdl";
//     //console.log()data, 1403);
//     var date = moment().utcOffset("+05:30").format("YYYY-MM-DD");
//     var baseQuery = "INSERT INTO addledger_sub ";
//     var columns = ['subType', 'user_id', 'lastinsertid', 'usr_nm', 'selectedasset', 'inputs', 'i_ts', 'asset_type'];
//     var valueRows = [];
//     if (data.assetform.liabilitySubType && data.assetform.liabilitySubType === 'group' && data.assetform.liabilityInputs && data.assetform.liabilityInputs.length > 0) {
//         let inputData = data.assetform.liabilityInputs.filter(input => input !== null);
//         inputData.forEach(function (input) {
//             var row = [
//                 data.assetform.liabilitySubType,
//                 data.user_id,
//                 p_id,
//                 data.usr_nm,
//                 data.selectedLiability.asset_name,
//                 input,
//                 date,
//                 'Liabilities'
//             ];
//             valueRows.push(row);
//         });
//     } else {
//         let inputData = data.assetform.inputs.filter(input => input !== null);
//         inputData.forEach(function (input) {
//             var row = [
//                 data.assetform.subType,
//                 data.user_id,
//                 p_id,
//                 data.usr_nm,
//                 data.selectedasset.asset_name,
//                 input,
//                 date,
//                 'Assets'
//             ];
//             valueRows.push(row);
//         });
//     }
//     baseQuery += `(${columns.join(', ')}) VALUES ?`;
//     //console.log()"Generated Query:", baseQuery);
//     //console.log()"Values to Insert:", valueRows);
//     dbutil.execupdateQuery(sqldb, baseQuery, [valueRows], cntxtDtls, function (err, results) {
//         if (err) {
//             //console.log()"Error executing query:", err);
//             callback(err, null);
//         } else {
//             //console.log()"Query executed successfully:", results);
//             callback(null, results);
//         }
//     });
// };
exports.addledgerpostsubdataMdl = function (data, p_id, callback) {
  var cntxtDtls = "in addledgerpostsubdataMdl";
  //console.log()data, 1403);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD");
  var baseQuery = "INSERT INTO addledger_sub ";
  var columns = [
    "subType",
    "user_id",
    "lastinsertid",
    "usr_nm",
    "selectedasset",
    "inputs",
    "i_ts",
    "asset_type",
  ];
  var valueRows = [];

  // Check for valid liabilityInputs if liabilitySubType is 'group'
  if (
    (data.assetform.liabilitySubType &&
      data.assetform.liabilitySubType === "group") ||
    data.assetform.liabilitySubType === "ledger"
  ) {
    if (
      data.assetform.liabilityInputs &&
      data.assetform.liabilityInputs.length > 0
    ) {
      let inputData = data.assetform.liabilityInputs.filter(
        (input) => input !== null
      );
      //console.log()"Filtered Liability Inputs:", inputData, 1468);
      inputData.forEach(function (input) {
        var row = [
          data.assetform.liabilitySubType,
          data.user_id,
          p_id,
          data.usr_nm,
          data.selectedLiability.asset_name,
          input,
          date,
          "EQUITIES AND LIABILITIES",
        ];
        valueRows.push(row);
      });
    } else {
      //console.log()"No valid liability inputs found.");
    }
  } else {
    // Handle assets (if liabilitySubType is not 'group')
    if (data.assetform.inputs && data.assetform.inputs.length > 0) {
      let inputData = data.assetform.inputs.filter((input) => input !== null);
      //console.log()"Filtered Asset Inputs:", inputData);
      inputData.forEach(function (input) {
        var row = [
          data.assetform.subType,
          data.user_id,
          p_id,
          data.usr_nm,
          data.selectedasset.asset_name,
          input,
          date,
          "ASSETS",
        ];
        valueRows.push(row);
      });
    } else {
      //console.log()"No valid asset inputs found.");
    }
  }

  // Check if valueRows is empty
  if (valueRows.length === 0) {
    //console.log()"No data to insert. valueRows is empty.");
    callback("No data to insert", null);
    return; // Exit early if no data to insert
  }

  // Create the SQL query
  baseQuery += `(${columns.join(", ")}) VALUES ?`;

  //console.log()"Generated Query:", baseQuery);
  //console.log()"Values to Insert:", valueRows);

  // Execute the query
  dbutil.execupdateQuery(
    sqldb,
    baseQuery,
    [valueRows],
    cntxtDtls,
    function (err, results) {
      if (err) {
        //console.log()"Error executing query:", err);
        callback(err, null);
      } else {
        //console.log()"Query executed successfully:", results);
        callback(null, results);
      }
    }
  );
};

exports.addledgerpostmaindataMdl = function (data, callback) {
  var cntxtDtls = "in addledgerpostmaindataMdl";
  //console.log()"Received data:", data);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var dta = {
    user_id: data.user_id,
    usr_nm: data.usr_nm,
    i_ts: date,
  };
  if (
    data.selectedasset &&
    data.selectedasset !== "null" &&
    data.selectedasset !== ""
  ) {
    dta.selectedasset = data.selectedasset.asset_name; // If selectedasset is valid, use it
  } else if (
    data.selectedLiability &&
    data.selectedLiability !== "null" &&
    data.selectedLiability !== ""
  ) {
    dta.selectedasset = data.selectedLiability.asset_name; // If selectedasset is invalid, use selectedLiability
  } else {
    //console.log()"Error: Both selectedasset and selectedLiability are null or invalid.");
    return;
  }
  //console.log()"Data to insert:", dta);

  if (!dta.selectedasset || !dta.user_id || !dta.usr_nm) {
    //console.log()"Error: Missing required data fields. Cannot insert into database.");
    return; // Prevent query execution if required fields are missing
  }

  // SQL query to insert data into the `addledger` table
  var QRY_TO_EXEC = `INSERT INTO addledger SET ?;`;
  //console.log()"Generated Query: ", QRY_TO_EXEC);

  // Execute the query and handle callback
  if (callback && typeof callback === "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        if (err) {
          console.error("Error executing query:", err); // Log error if query fails
        } else {
          //console.log()"Query executed successfully. Results:", results); // Log success if query is successful
        }
        callback(err, results); // Pass error and results to the callback
      }
    );
  } else {
    // If no callback, execute the query without callback
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.addprofitlosspostsubdataMdl = function (data, p_id, callback) {
  var cntxtDtls = "in addprofitlosspostsubdataMdl";
  //console.log()data, 1403);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD");
  var baseQuery = "INSERT INTO addprofitloss_sub ";
  var columns = [
    "subType",
    "user_id",
    "lastinsertid",
    "usr_nm",
    "selectedasset",
    "inputs",
    "i_ts",
    "asset_type",
  ];
  var valueRows = [];

  // Check for valid liabilityInputs if liabilitySubType is 'group'
  if (
    (data.assetform.liabilitySubType &&
      data.assetform.liabilitySubType === "group") ||
    data.assetform.liabilitySubType === "ledger"
  ) {
    if (
      data.assetform.liabilityInputs &&
      data.assetform.liabilityInputs.length > 0
    ) {
      let inputData = data.assetform.liabilityInputs.filter(
        (input) => input !== null
      );
      //console.log()"Filtered Liability Inputs:", inputData, 1468);
      inputData.forEach(function (input) {
        var row = [
          data.assetform.liabilitySubType,
          data.user_id,
          p_id,
          data.usr_nm,
          data.selectedLiability.asset_name,
          input,
          date,
          "EXPENSES",
        ];
        valueRows.push(row);
      });
    } else {
      //console.log()"No valid liability inputs found.");
    }
  } else {
    // Handle assets (if liabilitySubType is not 'group')
    if (data.assetform.inputs && data.assetform.inputs.length > 0) {
      let inputData = data.assetform.inputs.filter((input) => input !== null);
      //console.log()"Filtered Asset Inputs:", inputData);
      inputData.forEach(function (input) {
        var row = [
          data.assetform.subType,
          data.user_id,
          p_id,
          data.usr_nm,
          data.selectedasset.asset_name,
          input,
          date,
          "INCOME",
        ];
        valueRows.push(row);
      });
    } else {
      //console.log()"No valid asset inputs found.");
    }
  }

  // Check if valueRows is empty
  if (valueRows.length === 0) {
    //console.log()"No data to insert. valueRows is empty.");
    callback("No data to insert", null);
    return; // Exit early if no data to insert
  }

  // Create the SQL query
  baseQuery += `(${columns.join(", ")}) VALUES ?`;

  //console.log()"Generated Query:", baseQuery);
  //console.log()"Values to Insert:", valueRows);

  // Execute the query
  dbutil.execupdateQuery(
    sqldb,
    baseQuery,
    [valueRows],
    cntxtDtls,
    function (err, results) {
      if (err) {
        //console.log()"Error executing query:", err);
        callback(err, null);
      } else {
        //console.log()"Query executed successfully:", results);
        callback(null, results);
      }
    }
  );
};

exports.addprofitlosspostsubdatachildMdl = function (data, p_id, callback) {
  var cntxtDtls = "in addprofitlosspostsubdatachildMdl";
  //console.log()data, 1403);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD");
  var baseQuery = "INSERT INTO addprofitlosschild";
  var columns = [
    "subType",
    "user_id",
    "lastinsertid",
    "usr_nm",
    "selectedasset",
    "inputs",
    "i_ts",
    "asset_type",
    "child",
  ];
  var valueRows = [];
  // Check for valid liabilityInputs if liabilitySubType is 'group'
  // if (data.assetform.liabilitySubType && data.assetform.liabilitySubType === 'group' || data.assetform.liabilitySubType === 'ledger') {
  //     if (data.assetform.liabilityInputs && data.assetform.liabilityInputs.length > 0) {
  //         let inputData = data.assetform.liabilityInputs.filter(input => input !== null);
  //         //console.log()"Filtered Liability Inputs:", inputData,1468);
  //         inputData.forEach(function (input) {
  //             var row = [
  //                 data.assetform.liabilitySubType,
  //                 data.user_id,
  //                 p_id,
  //                 data.usr_nm,
  //                 data.selectedLiability.asset_name,
  //                 input,
  //                 date,
  //                 'Expense',
  //                 data.childdata
  //             ];
  //             valueRows.push(row);
  //         });
  //     } else {
  //         //console.log()"No valid liability inputs found.");
  //     }
  // }
  // else {
  if (data.assetform.inputs && data.assetform.inputs.length > 0) {
    let inputData = data.assetform.inputs.filter((input) => input !== null);
    //console.log()"Filtered Asset Inputs:", inputData);
    inputData.forEach(function (input) {
      var row = [
        data.assetform.subType,
        data.user_id,
        p_id,
        data.usr_nm,
        data.selectedasset.asset_name,
        input,
        date,
        "INCOME",
        data.childdata,
      ];
      valueRows.push(row);
    });
  } else {
    //console.log()"No valid asset inputs found.");
  }
  // }

  // Check if valueRows is empty
  if (valueRows.length === 0) {
    //console.log()"No data to insert. valueRows is empty.");
    callback("No data to insert", null);
    return; // Exit early if no data to insert
  }

  // Create the SQL query
  baseQuery += `(${columns.join(", ")}) VALUES ?`;

  //console.log()"Generated Query:", baseQuery);
  //console.log()"Values to Insert:", valueRows);

  // Execute the query
  dbutil.execupdateQuery(
    sqldb,
    baseQuery,
    [valueRows],
    cntxtDtls,
    function (err, results) {
      if (err) {
        //console.log()"Error executing query:", err);
        callback(err, null);
      } else {
        //console.log()"Query executed successfully:", results);
        callback(null, results);
      }
    }
  );
};

exports.addprofitlosspostmaindataMdl = function (data, callback) {
  var cntxtDtls = "in addprofitlosspostmaindataMdl";
  //console.log()"Received data:", data);
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var dta = {
    user_id: data.user_id,
    usr_nm: data.usr_nm,
    i_ts: date,
  };
  if (
    data.selectedasset &&
    data.selectedasset !== "null" &&
    data.selectedasset !== ""
  ) {
    dta.selectedasset = data.selectedasset.asset_name; // If selectedasset is valid, use it
  } else if (
    data.selectedLiability &&
    data.selectedLiability !== "null" &&
    data.selectedLiability !== ""
  ) {
    dta.selectedasset = data.selectedLiability.asset_name; // If selectedasset is invalid, use selectedLiability
  } else {
    //console.log()"Error: Both selectedasset and selectedLiability are null or invalid.");
    return;
  }
  //console.log()"Data to insert:", dta);
  if (!dta.selectedasset || !dta.user_id || !dta.usr_nm) {
    //console.log()"Error: Missing required data fields. Cannot insert into database.");
    return; // Prevent query execution if required fields are missing
  }

  // SQL query to insert data into the `addledger` table
  var QRY_TO_EXEC = `INSERT INTO addprofitloss SET ?;`;
  //console.log()"Generated Query: ", QRY_TO_EXEC);

  // Execute the query and handle callback
  if (callback && typeof callback === "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        if (err) {
          console.error("Error executing query:", err); // Log error if query fails
        } else {
          //console.log()"Query executed successfully. Results:", results); // Log success if query is successful
        }
        callback(err, results); // Pass error and results to the callback
      }
    );
  } else {
    // If no callback, execute the query without callback
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};
exports.getassetsdropdownMdl = function (data, callback) {
  var cntxtDtls = "in getassetsdropdownMdl";
  var QRY_TO_EXEC = `select * from assets_t where d_in='0' order by asset_name`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.addassetpostdataMdl = function (data, callback) {
  var cntxtDtls = "in addassetpostdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var dta = {
    asset_name: data.asset_name,
    user_id: data.user_id,
    usr_nm: data.usr_nm,
    i_ts: date,
    asset_main: "ASSETS",
  };
  //console.log()dta, 334);

  var QRY_TO_EXEC = `insert into assets_t set ?;`;

  //console.log()QRY_TO_EXEC, 336)
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.selectedassetdropdowndataMdl = function (data, callback) {
  var cntxtDtls = "in selectedassetdropdowndataMdl";
  //console.log()data, 1677);

  var QRY_TO_EXEC = `select * from addledger_sub where d_in='0' and  selectedasset='${data.selectedAsset}' and asset_type='${data.asset_main}' order by id desc`;
  //console.log()QRY_TO_EXEC, 1674);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getliablitiesdropdownMdl = function (callback) {
  var cntxtDtls = "in getliablitiesdropdownMdl";
  var QRY_TO_EXEC = `select * from liablities_t where d_in='0' order by asset_name`;
  //console.log()QRY_TO_EXEC, 1688);

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addliablitypostdataMdl = function (data, callback) {
  var cntxtDtls = "in addliablitypostdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var dta = {
    asset_name: data.asset_name,
    user_id: data.user_id,
    usr_nm: data.usr_nm,
    i_ts: date,
    asset_main: "Liabilities",
  };
  //console.log()dta, 334);

  var QRY_TO_EXEC = `insert into liablities_t set ?;`;

  //console.log()QRY_TO_EXEC, 336)
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addincomepostdataMdl = function (data, callback) {
  var cntxtDtls = "in addincomepostdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var dta = {
    asset_name: data.asset_name,
    user_id: data.user_id,
    usr_nm: data.usr_nm,
    i_ts: date,
    asset_main: "INCOME",
  };
  //console.log()dta, 334);

  var QRY_TO_EXEC = `insert into income_t set ?;`;

  //console.log()QRY_TO_EXEC, 336)
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.addexpensepostdataMdl = function (data, callback) {
  var cntxtDtls = "in addexpensepostdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var dta = {
    asset_name: data.asset_name,
    user_id: data.user_id,
    usr_nm: data.usr_nm,
    i_ts: date,
    asset_main: "Expense",
  };
  //console.log()dta, 334);

  var QRY_TO_EXEC = `insert into expense_t set ?;`;

  //console.log()QRY_TO_EXEC, 336)
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getincomedropdownMdl = function (data, callback) {
  var cntxtDtls = "in getincomedropdownMdl";
  var QRY_TO_EXEC = `select * from income_t where d_in='0' order by asset_name`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.selectedprofitsdropdowndataMdl = function (data, callback) {
  var cntxtDtls = "in selectedprofitsdropdowndataMdl";
  //console.log()data, 1677);

  var QRY_TO_EXEC = `select * from addprofitloss_sub where d_in='0' and  selectedasset='${data.selectedAsset}' and asset_type='${data.asset_main}' order by id desc`;
  //console.log()QRY_TO_EXEC, 1853);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.selectedprofitsdropdownmaindatagetchildMdl = function (data, callback) {
  var cntxtDtls = "in selectedprofitsdropdownmaindatagetchildMdl";
  //console.log()data, 1677);

  var QRY_TO_EXEC = `select * from addprofitlosschild where d_in='0' and  child='${data.childdata}' order by id desc`;
  //console.log()QRY_TO_EXEC, 1853);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.subchildselectedprofitsdropdownmaindatagetchildMdl = function (
  data,
  callback
) {
  var cntxtDtls = "in subchildselectedprofitsdropdownmaindatagetchildMdl";
  //console.log()data, 1677);

  var QRY_TO_EXEC = `select * from addprofitlosschild where d_in='0' and  child='${data.childdata}' order by id desc`;
  //console.log()QRY_TO_EXEC, 1853);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getexpensesdropdownMdl = function (callback) {
  var cntxtDtls = "in getexpensesdropdownMdl";
  var QRY_TO_EXEC = `select * from expense_t where d_in='0' order by asset_name`;
  //console.log()QRY_TO_EXEC, 1688);

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getallstfdrivhelpMdl = function (callback) {
  var cntxtDtls = "in getallstfdrivhelpMdl";
  var QRY_TO_EXEC = `SELECT id AS paid_to_id, COALESCE(NULLIF(nickname, ''), driver_name) AS paid_to_name, 'driver' AS paid_to_type, ledger_id
FROM driver_register
WHERE d_in = 0

UNION ALL

SELECT id AS paid_to_id, fullName AS paid_to_name, 'staff' AS paid_to_type, ledger_id
FROM staff_register
WHERE d_in = 0

UNION ALL

SELECT id AS paid_to_id, helper_name AS paid_to_name, 'helper' AS paid_to_type, ledger_id
FROM helper_register
WHERE d_in = 0;`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

//courtcases start
exports.alldistrictsgetmdl = function (data, callback) {
  var cntxtDtls = "in alldistrictsgetmdl";
  var QRY_TO_EXEC = `select * from mainmastersadd where d_in=0  order by districtnm ASC;`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.Duplicatecheckdistrictsmdl = function (data, callback) {
  var cntxtDtls = "in Duplicatecheckdistrictsmdl";
  var QRY_TO_EXEC = `select * from mainmastersadd where d_in=0 and districtnm='${data.districtnm}';`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.postdistrictsdatamdl = function (data, callback) {
  var cntxtDtls = "in postdistrictsdatamdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    districtnm: data.districtnm,
    i_ts: date,
  };
  var QRY_TO_EXEC = `insert into mainmastersadd SET ? `;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.dltdistrictsdatamdl = function (data, callback) {
  var cntxtDtls = "in dltdistrictsdatamdl";
  var m = [data.id];
  var QRY_TO_EXEC = `update mainmastersadd set d_in=1 where id = ?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.editdistrictsdatamdl = function (data, callback) {
  var cntxtDtls = "in editdistrictsdatamdl";
  var m = [data.districtnm, data.id];
  var QRY_TO_EXEC = `update mainmastersadd set districtnm=? where id = ?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.DuplicatecheckMandalsmdl = function (data, callback) {
  var cntxtDtls = "in DuplicatecheckMandalsmdl";
  //console.log()data, 5168);
  var QRY_TO_EXEC = `select * from mainmastersgroup where d_in=0 and mandal_name='${data.mandal_name}' and district_id='${data.district_id}';`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.submitMandalsDataMdl = function (data, callback) {
  var cntxtDtls = "in submitMandalsDataMdl";
  var curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    district_id: data.district_id,
    mandal_name: data.mandal_name,
    i_ts: curDate,
    staticentry: data.district_name,
  };
  var QRY_TO_EXEC = `insert into mainmastersgroup set ?;`;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getallmandaldataMdl = function (data, callback) {
  var cntxtDtls = "in getallmandaldataMdl";
  var QRY_TO_EXEC = `SELECT m.*,d.districtnm as district_name from mainmastersgroup as m JOIN mainmastersadd as d ON d.id=m.district_id where m.d_in=0 and d.d_in=0  order by m.id desc`;

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.editmandalsMdl = function (data, callback) {
  var cntxtDtls = "in editmandalsMdl";
  var m = [data.district_id, data.mandal_name, data.id];
  var QRY_TO_EXEC = `update mainmastersgroup set district_id=?,mandal_name=? where id = ?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.deletemandalsMdl = function (data, callback) {
  var cntxtDtls = "in deletemandalsMdl";
  var m = [data.id];
  var QRY_TO_EXEC = `update mainmastersgroup set d_in=1 where id=?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getallchilddatadataMdl = function (data, callback) {
  var cntxtDtls = "in getallchilddatadataMdl";
  //console.log()data, 5242)
  // var r;
  // if(data.role_type == 0){
  //     r=``
  // }
  // else{
  //     r=`and m.district_id='${data.district_id}'`
  // }
  var QRY_TO_EXEC = `SELECT * from mainmasterssubgroup  where d_in=0 and mandal_id='${data.mandal_id}'  order by id desc`;
  //console.log()QRY_TO_EXEC);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
//Villages

exports.Duplicatecheckvillagesmdl = function (data, callback) {
  var cntxtDtls = "in Duplicatecheckvillagesmdl";
  var QRY_TO_EXEC = `select * from mainmasterssubgroup where d_in=0 and village_name='${data.village_name}'`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitVillagesDataMdl = function (data, callback) {
  var cntxtDtls = "in submitVillagesDataMdl";
  var curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    district_id: data.district_id,
    mandal_id: data.mandal_id,
    village_name: data.village_name,
    i_ts: curDate,
    staticentry: data.district_name,
  };
  var QRY_TO_EXEC = `insert into mainmasterssubgroup set ?;`;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getallvillagedataMdl = function (data, callback) {
  var cntxtDtls = "in getallvillagedataMdl";

  var QRY_TO_EXEC = `SELECT v.*,m.mandal_name,d.districtnm as district_name FROM mainmasterssubgroup as v JOIN mainmastersgroup as m ON v.mandal_id=m.id JOIN mainmastersadd as d on v.district_id=d.id WHERE v.d_in=0 and m.d_in=0 and d.d_in=0  order by v.id desc`;

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.editvillagesmdl = function (data, callback) {
  var cntxtDtls = "in editvillagesmdl";
  var m = [data.district_id, data.mandal_id, data.village_name, data.id];
  var QRY_TO_EXEC = `update mainmasterssubgroup set district_id=?,mandal_id =?,village_name=? where id = ?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.deletevillagesMdl = function (data, callback) {
  var cntxtDtls = "in deletevillagesMdl";
  var m = [data.id];
  var QRY_TO_EXEC = `update mainmasterssubgroup set d_in=1 where id=?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.Duplicatechecktemplesmdl = function (data, callback) {
  var cntxtDtls = "in Duplicatechecktemplesmdl";
  //console.log()data, 5391);
  var QRY_TO_EXEC = `select * from mainmasterssubchild where d_in=0 and temple_name='${data.temple_name}'`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getallTemplesdataMdl = function (data, callback) {
  var cntxtDtls = "in getallTemplesdataMdl";

  var QRY_TO_EXEC = `select t.*,d.districtnm,m.mandal_name from mainmasterssubchild as t left JOIN mainmastersadd as d ON t.district_id=d.id left JOIN mainmastersgroup as m ON m.id=t.mandal_id where t.d_in=0 and d.d_in=0 and m.d_in=0  order by t.id desc;`;

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitTemplesMdl = function (data, callback) {
  var cntxtDtls = "in submitTemplesMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    temple_name: data.temple_name,
    district_id: data.district_id,
    mandal_id: data.mandal_id,
    entry_by: data.entry_by,
    child: data.child.village_name,
    village_id: data.child.id,
    i_ts: date,
    mandal_name: data.mandal_name,
    staticentry: data.district_name,
  };
  var QRY_TO_EXEC = `insert into mainmasterssubchild SET ? `;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletetempleMdl = function (data, callback) {
  var cntxtDtls = "in deletetempleMdl";
  var m = [data.id];
  var QRY_TO_EXEC = `update mainmasterssubchild set d_in=1 where id = ?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.editTemplesMdl = function (data, callback) {
  var cntxtDtls = "in editTemplesMdl";
  var m = [data.temple_name, data.district_id, data.mandal_id, data.id];
  var QRY_TO_EXEC = `update mainmasterssubchild set temple_name=?,district_id=?,mandal_id=? where id = ?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.submitfinaldataMdl = function (data, callback) {
  var cntxtDtls = "in submitfinaldataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  // var dta = {
  //     temple_name: data.temple_name.temple_name,
  //     district_id: data.district_id,
  //     mandal_id: data.mandal_id,
  //     entry_by: data.entry_by,
  //     child: data.child.village_name,
  //     village_id: data.child.id,
  //     temple_id: data.temple_name.id,
  //     i_ts:date
  // };
  var dta = {
    temple_name: data.ledger.temple_name,
    district_id: data.ledger.district_id,
    mandal_id: data.ledger.mandal_id,
    entry_by: data.entry_by,
    child: data.ledger.village_name,
    village_id: data.ledger.village_id,
    temple_id: data.ledger.id,
    i_ts: date,
    amount: data.amount,
    date: data.date,
  };
  var QRY_TO_EXEC = `insert into mainmastersoveralldata SET ? `;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getmainallchilddatadataMdl = function (data, callback) {
  var cntxtDtls = "in getmainallchilddatadataMdl";
  //console.log()data, 5484)
  // var r;
  // if(data.role_type == 0){
  //     r=``
  // }
  // else{
  //     r=`and m.district_id='${data.district_id}'`
  // }
  var QRY_TO_EXEC = `SELECT * from mainmasterssubchild  where d_in=0 and village_id='${data.id}'  order by id desc`;
  //console.log()QRY_TO_EXEC);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getmainmasterchildsubseconddataMdl = function (data, callback) {
  var cntxtDtls = "in getmainmasterchildsubseconddataMdl";
  //console.log()data, 5484)
  // var r;
  // if(data.role_type == 0){
  //     r=``
  // }
  // else{
  //     r=`and m.district_id='${data.district_id}'`
  // }
  var QRY_TO_EXEC = `SELECT * from mainmasterssubchild  where d_in=0 and village_id='${data.id}'  order by id desc`;
  //console.log()QRY_TO_EXEC);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.Duplicatechecksubchildtwomainmastermdl = function (data, callback) {
  var cntxtDtls = "in Duplicatechecksubchildtwomainmastermdl";
  //console.log()data, 5391);
  var QRY_TO_EXEC = `select * from mainmasterssubchildtwo where d_in=0 and temple_name='${data.temple_name}'`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.submitsubchildtwomainmastersMdl = function (data, callback) {
  var cntxtDtls = "in submitsubchildtwomainmastersMdl";
  //console.log()data, 5533);

  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    temple_name: data.temple_name,
    district_id: data.district_id,
    staticname: data.district_name,
    mandal_id: data.mandal_id,
    mandal_name: data.mandal_name,
    entry_by: data.entry_by,
    child: data.child.village_name,
    village_id: data.child.id,
    i_ts: date,
    subchildtwo: data.subchildtwo.temple_name,
    subchildtwo_id: data.subchildtwo.id,
  };
  var QRY_TO_EXEC = `insert into mainmasterssubchildtwo SET ? `;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getsubchildtworeportdataMdl = function (data, callback) {
  var cntxtDtls = "in getsubchildtworeportdataMdl";

  var QRY_TO_EXEC = `select * from mainmasterssubchildtwo  where d_in=0 order by id desc;`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getledgerdatadropdownMdl = function (data, callback) {
  var cntxtDtls = "in getledgerdatadropdownMdl";
  var QRY_TO_EXEC = `select *,mainmasterssubchildtwo.id as ledger_id from mainmasterssubchildtwo where d_in=0 order by temple_name ASC;`;
  //console.log()QRY_TO_EXEC, 50078);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getexpensetripledgerdataMdl = function (callback) {
  var cntxtDtls = "in getexpensetripledgerdataMdl";

  var QRY_TO_EXEC = `SELECT *,mainmasterssubchildtwo.id as ledger_id from mainmasterssubchildtwo where d_in=0 order by temple_name desc`;
  //console.log()QRY_TO_EXEC);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getvouchermodaldataMdl = function (data, callback) {
  var cntxtDtls = "in getvouchermodaldataMdl";

  var QRY_TO_EXEC = `SELECT * from  mainvoucher_t where d_in=0 and c_number='${data.serviceNo}';
        SELECT * FROM mainvoucher_subt where c_number = '${data.serviceNo}' and d_in=0;
        `;

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getallemployeesdropdownvoucherentryMdl = function (callback) {
  var cntxtDtls = "in getallemployeesdropdownvoucherentryMdl";
  var QRY_TO_EXEC = `select *,id as staff_id,"staff" as "type" from staff_register where  d_in='0' order by id desc;select *,id as staff_id, "helper" as "type" from  helper_register where  d_in='0' order by id desc;select *,id as staff_id,"driver" as "type" from  driver_register where  d_in='0' order by id desc`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// tripexpenses_data.opt_driver1_id / opt_driver2_id / opt_helper_id are INT
// columns and parking_amt is DECIMAL, but the INSERTs below build their VALUES
// by string interpolation and wrapped all four in quotes. An unfilled seat sends
// '', which MySQL in strict mode rejects for a numeric column ("Incorrect
// integer value: ''"), failing the whole INSERT — the trip expense then comes
// back as a 500 and nothing is saved. Every filing sends '' for all three opt_*
// ids now that opting is recorded on the seat itself rather than as a second
// person, so this was not an edge case: it broke filing outright.
function sqlIntOrNull(v) {
  if (v === undefined || v === null || String(v).trim() === '') return 'NULL';
  var n = parseInt(String(v).trim(), 10);
  return isNaN(n) ? 'NULL' : String(n);
}
function sqlNumOrNull(v) {
  if (v === undefined || v === null || String(v).trim() === '') return '0';
  var n = Number(String(v).trim());
  return isNaN(n) ? '0' : String(n);
}

exports.updateadddiagnoptntDtsmmdl = function (c_id, c_number, data, callback) {
  var cntxtDtls = "in adddiagnoptntDtsmmdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var QRY_TO_EXEC = `insert into tripexpenses_data(date,
		driveronebeta,driver1Beta,driveronesalary,driverone_payment,drivertwobeta,driver2Beta,drivertwosalary,drivertwo_payment ,helperbeta,helpersudBeta,helpersalary,conductor_beta,ConductorsudBeta,conductor_salary,helper_payment,bus_no,service_no,driver1_name,driver2_name,helper_name,amount,status,user_id,usr_nm,driveronebeta_payment,drivertwobeta_payment,helperbeta_payment,tot_salary,tot_beta,tot_salary_beta,total_amount,trip_date,trip_for,c_id,c_number,paid_to_id,paid_to_name,paid_to_type,trip_creation_id,driver1_id,driver2_id,helper_id,conductor_id,conductor_name,updatedby_id,updatedby_name,updatedby_date,service_no_id,trip_for_id,remarks,opt_driver1_id,opt_driver1_name,opt_driver2_id,opt_driver2_name,opt_helper_id,opt_helper_name,parking_amt)values( '${data.date}',
		'${data.expensedetails.driveronebeta}' , '${data.expensedetails.driveronesalary}','${data.expensedetails.driveronesudsalary}' , '${data.expensedetails.driverone_payment}' ,
		 '${data.expensedetails.drivertwobeta}' , '${data.expensedetails.drivertwosalary}','${data.expensedetails.drivertwosudsalary}', '${data.expensedetails.drivertwo_payment}','${data.expensedetails.helperbeta}','${data.expensedetails.helpersalary}',
     '${data.expensedetails.helpersudsalary}','${data.expensedetails.conductorbeta}','${data.expensedetails.conductorsalary}','${data.expensedetails.conductorudsalary}','${data.expensedetails.helper_payment}','${data.expensedetails.bus_no}','${data.expensedetails.service_no}','${data.expensedetails.driver1_name}','${data.expensedetails.driver2_name}','${data.expensedetails.helper_name}','${data.expensedetails.grandtotal}','1','${data.expensedetails.user_id}','${data.expensedetails.named}','${data.expensedetails.driveronebeta_payment}','${data.expensedetails.drivertwobeta_payment}','${data.expensedetails.helperbeta_payment}','${data.total_salary}','${data.total_beta}','${data.total_salary_beta}','${data.total_amount}','${data.expensedetails.trip_date}','${data.expensedetails.trip_for}','${data.c_id}','${data.c_number}','${data.paid_to_id}','${data.paid_to_name}','${data.paid_to_type}','${data.trip_creation_id}','${data.driver1_id}','${data.driver2_id}','${data.helper_id}','${data.conductor_id}','${data.expensedetails.conductor_name}','${data.updatedby_id}','${data.updatedby_nm}','${data.updatedby_date}','${data.service_no_id}','${data.trip_for_id}','${data.remarks}',${sqlIntOrNull(data.expensedetails.opt_driver1_id)},'${data.expensedetails.opt_driver1_name || ''}',${sqlIntOrNull(data.expensedetails.opt_driver2_id)},'${data.expensedetails.opt_driver2_name || ''}',${sqlIntOrNull(data.expensedetails.opt_helper_id)},'${data.expensedetails.opt_helper_name || ''}',${sqlNumOrNull(data.expensedetails.parking_amt)})`;

  console.log(QRY_TO_EXEC, 3645);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.adddiagnoptntDtsmmdl = function (c_id, c_number, data, callback) {
  var cntxtDtls = "in adddiagnoptntDtsmmdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var QRY_TO_EXEC = `insert into tripexpenses_data(date,
		driveronebeta,driver1Beta,driveronesalary,driverone_payment,drivertwobeta,	driver2Beta,drivertwosalary,drivertwo_payment ,helperbeta,helpersudBeta,helpersalary,conductor_beta,ConductorsudBeta,conductor_salary,helper_payment,bus_no,service_no,driver1_name,driver2_name,helper_name,amount,status,user_id,usr_nm,driveronebeta_payment,drivertwobeta_payment,helperbeta_payment,tot_salary,tot_beta,tot_salary_beta,total_amount,trip_date,trip_for,c_id,c_number,paid_to_id,paid_to_name,paid_to_type,trip_creation_id,driver1_id,driver2_id,helper_id,conductor_id,conductor_name,service_no_id,trip_for_id,remarks,opt_driver1_id,opt_driver1_name,opt_driver2_id,opt_driver2_name,opt_helper_id,opt_helper_name,parking_amt)values( '${date}',
		'${data.expensedetails.driveronebeta}' , '${data.expensedetails.driveronesalary}','${data.expensedetails.driveronesudsalary}' , '${data.expensedetails.driverone_payment}' ,
		 '${data.expensedetails.drivertwobeta}' , '${data.expensedetails.drivertwosalary}','${data.expensedetails.drivertwosudsalary}', '${data.expensedetails.drivertwo_payment}','${data.expensedetails.helperbeta}','${data.expensedetails.helpersalary}',
     '${data.expensedetails.helpersudsalary}','${data.expensedetails.conductorbeta}','${data.expensedetails.conductorsalary}','${data.expensedetails.conductorudsalary}','${data.expensedetails.helper_payment}','${data.expensedetails.bus_no}','${data.expensedetails.service_no}','${data.expensedetails.driver1_name}','${data.expensedetails.driver2_name}','${data.expensedetails.helper_name}','${data.expensedetails.grandtotal}','1','${data.expensedetails.user_id}','${data.expensedetails.named}','${data.expensedetails.driveronebeta_payment}','${data.expensedetails.drivertwobeta_payment}','${data.expensedetails.helperbeta_payment}','${data.total_salary}','${data.total_beta}','${data.total_salary_beta}','${data.total_amount}','${data.expensedetails.trip_date}','${data.expensedetails.trip_for}','${c_id}','${c_number}','${data.expensedetails.paid_to_id}','${data.expensedetails.paid_to_name}','${data.expensedetails.paid_to_type}','${data.expensedetails.trip_creation_id}','${data.expensedetails.driver1_id}','${data.expensedetails.driver2_id}','${data.expensedetails.helper_id}','${data.expensedetails.conductor_id}','${data.expensedetails.conductor_name}','${data.service_no_id}','${data.trip_for_id}','${data.remarks}',${sqlIntOrNull(data.expensedetails.opt_driver1_id)},'${data.expensedetails.opt_driver1_name || ''}',${sqlIntOrNull(data.expensedetails.opt_driver2_id)},'${data.expensedetails.opt_driver2_name || ''}',${sqlIntOrNull(data.expensedetails.opt_helper_id)},'${data.expensedetails.opt_helper_name || ''}',${sqlNumOrNull(data.expensedetails.parking_amt)})`;
  //console.log()1531, QRY_TO_EXEC);

  console.log(QRY_TO_EXEC);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.driverdata = function (callback) {
  var cntxtDtls = "in driverdata";
  var QRY_TO_EXEC = `select *,driver_register.nickname as driver_name from  driver_register
 where  d_in='0' `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};


var TRIP_FIELD_LABELS = {
  bus_no: 'Bus No', driver1_name: 'Driver 1', driver2_name: 'Driver 2',
  helper_name: 'Helper', conductor_name: 'Conductor',
  trip_run_status: 'Status', hirer_name: 'Hirer',
};

exports.tripcreated = function (c_id, c_number, data, callback) {
  // Get current time in milliseconds
  const now = new Date();

  // Convert to IST (UTC+05:30)
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

  // Format as YYYY-MM-DD HH:mm:ss
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istTime.getUTCDate()).padStart(2, "0");
  const hours = String(istTime.getUTCHours()).padStart(2, "0");
  const minutes = String(istTime.getUTCMinutes()).padStart(2, "0");
  const seconds = String(istTime.getUTCSeconds()).padStart(2, "0");

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  console.log(formattedDate);

  var cntxtDtls = "in tripcreated";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD");
  var QRY_TO_EXEC = ``;
  //console.log()QRY_TO_EXEC);

  if (data.type == "add") {
    QRY_TO_EXEC = `insert into  trip_created (bus_no,service_no,optreg,driver1_name,optreg1,driver2_name,optreg2,helper_name,conductor_name,cts,trip_date,trip_for,trip_for_id,service_no_id,paid_to_id,paid_to_name,paid_to_type,remarks,created_id,created_name,driver1_id,driver2_id,conductor_id,helper_id,c_id,c_number) VALUES('${data.bus_no}','${data.service_no}',
  '${data.optreg}','${data.driver1_name}','${data.optreg1}','${data.driver2_name}','${data.optreg2}','${data.helper_name}','${data.conductor_name}','${formattedDate}','${data.trip_date}','${data.trip_for}','${data.trip_for_id}','${data.service_no_id}','${data.paid_to_id}','${data.paid_to_name}','${data.paid_to_type}','${data.remarks}','${data.created_id}','${data.created_name}','${data.driver1_id}','${data.driver2_id}','${data.conductor_id}','${data.helper_id}','${c_id}','${c_number}')`;

    console.log(QRY_TO_EXEC, 3820);

    if (callback && typeof callback == "function")
      dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
        callback(err, results);
        return;
      });
    else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
    return;
  }

  // ── Edit: select-before → update → diff bus/driver/helper/conductor →
  // log a trip_edit_history row if anything actually changed. Mirrors
  // updatebusnumber's history-logging pattern above.
  var esc = function (v) { return String(v == null ? '' : v).replace(/'/g, "''"); };
  var trackedFields = { bus_no: data.bus_no, driver1_name: data.driver1_name, driver2_name: data.driver2_name, helper_name: data.helper_name, conductor_name: data.conductor_name, trip_run_status: data.trip_run_status, hirer_name: data.hirer_name };

  sqldb.query(`SELECT bus_no, driver1_name, driver2_name, helper_name, conductor_name, trip_run_status, hirer_name FROM trip_created WHERE id = ?`, [data.id], function (selErr, rows) {
    var before = (!selErr && rows && rows[0]) ? rows[0] : {};

    // Only the fields actually supplied are written. A Bus edit has no
    // hirer_name and a Van edit has no service_no_id, so writing a fixed column
    // list would blank whichever the form didn't show. optreg/optreg1/optreg2
    // stay editable because Trip Expenses stores the per-role beta amounts in
    // them (buildUpdateTripPayload in TripExpensesPage.tsx).
    // Values are escaped - a name containing an apostrophe used to break this
    // query outright.
    var EDITABLE = ['bus_no', 'service_no', 'service_no_id',
      'driver1_name', 'driver1_id', 'driver2_name', 'driver2_id',
      'helper_name', 'helper_id', 'conductor_name', 'conductor_id',
      'optreg', 'optreg1', 'optreg2',
      'opt_driver1_id', 'opt_driver1_name', 'opt_driver2_id', 'opt_driver2_name', 'opt_helper_id', 'opt_helper_name',
      'trip_date', 'trip_for', 'trip_for_id', 'trip_run_status',
      'paid_to_type', 'paid_to_name', 'paid_to_id',
      'hirer_name', 'phone_number', 'line_code', 'remarks',
      'driver1_paid_direct', 'driver2_paid_direct', 'helper_paid_direct', 'conductor_paid_direct',
      'updatedby_id', 'updatedby_name', 'updated_date'];
    var sets = EDITABLE
      .filter(function (k) { return data[k] !== undefined; })
      .map(function (k) { return '`' + k + "` = '" + esc(data[k]) + "'"; });
    if (sets.length === 0) { callback(null, { affectedRows: 0 }); return; }
    QRY_TO_EXEC = 'UPDATE trip_created SET ' + sets.join(', ') + ' WHERE id = ' + Number(data.id);

    console.log(QRY_TO_EXEC, 3820);

    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      if (err) { callback(err, results); return; }

      var changes = [];
      Object.keys(trackedFields).forEach(function (k) {
        var oldV = before[k] == null ? '' : String(before[k]);
        var newV = trackedFields[k] == null ? '' : String(trackedFields[k]);
        if (oldV !== newV) changes.push(`${TRIP_FIELD_LABELS[k] || k}: '${oldV || '—'}' -> '${newV || '—'}'`);
      });

      if (changes.length === 0) { callback(null, results); return; }

      var histQ = `INSERT INTO trip_edit_history (trip_id, c_number, changes_note, changed_by_id, changed_by_name) VALUES ('${data.id}', '${esc(data.c_number || '')}', '${esc(changes.join('\n'))}', '${esc(data.updatedby_id)}', '${esc(data.updatedby_name)}')`;
      sqldb.query(histQ, function (histErr) {
        if (histErr) console.log('[tripcreated edit] history log error:', histErr.message);
        callback(null, results);
      });
    });
  });
};

// ── Bulk Trip Creation (date-picker + per-service-route grid) ─────────────────
// Rows without a bus_no (Halt / left blank) are dropped before insert — nothing
// is saved for them. c_number is minted once per batch (fetch max c_id, then
// increment locally per row) and inserted in a single multi-row statement,
// mirroring bulkUploadServiceRoutesMdl's array-of-arrays batch-insert shape.
//
// Ledger/voucher wiring: every row (Bus or Van) can carry its own
// `debit_ledger_id`/`debit_ledger_name` + `credit_ledger_id`/`credit_ledger_name`
// + amount (`amount` for Bus, `booking_amount` for Van — both persisted into the
// same `trip_created.booking_amount` column so Trip Records has one "Amount"
// column regardless of vehicle type) — the frontend pre-fills debit from the
// selected Paid-To person (Bus) but the user can override it per row. For Van,
// if a row's debit_ledger_id is left blank, a Receivables ledger is resolved
// here via ensureHirerLedger (deduped by phone, so a repeat hirer reuses their
// ledger) — an explicit debit_ledger_id always wins over that auto-resolve.
// Rows with both a debit and credit ledger + a positive amount are returned in
// `voucherCandidates` so the controller can post one Journal voucher per row via
// createTripVoucherMdl and link it back with `voucher_number`.
exports.bulkCreateTripsMdl = function (trip_date, rows, userId, usrNm, callback) {
  var cntxtDtls = 'in bulkCreateTripsMdl';
  // A Halt row records that the service did not run, so it legitimately has no
  // bus and no crew — filtering on bus_no alone silently threw those away and
  // the day's sheet lost them.
  var toInsert = (rows || []).filter(function (r) {
    return r && (r.bus_no || r.trip_run_status === 'Halt');
  });
  if (toInsert.length === 0) return callback(null, { inserted: 0, total: (rows || []).length, voucherCandidates: [] });

  // Resolve a Receivables ledger for every Van row that didn't get an explicit
  // debit_ledger_id, one at a time (ensureHirerLedger does its own dedupe-by-phone
  // lookup/insert, so these can't run in parallel without risking duplicate
  // ledgers for the same phone).
  var vi = 0;
  var resolveNext = function () {
    if (vi >= toInsert.length) return proceedWithInsert();
    var r = toInsert[vi];
    if (r.vehicle_type === 'van' && !r.debit_ledger_id && r.hirer_name && r.phone_number && r.booking_amount) {
      exports.ensureHirerLedger(r.hirer_name, r.phone_number, userId, function (err, ledgerId) {
        if (err) console.error('[ensureHirerLedger] failed for trip hirer ' + r.hirer_name + ':', err.message);
        else r.hirer_ledger_id = ledgerId;
        vi++; resolveNext();
      });
    } else {
      vi++; resolveNext();
    }
  };
  resolveNext();

  function proceedWithInsert() {
    exports.maintripexpenseuniquenoMdl(function (err, cresults1) {
      if (err) return callback(err, null);
      var c_id = cresults1[0] ? cresults1[0].c_id : 0;
      c_id = c_id * 1;

      var now = new Date();
      var istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      var formattedDate = istTime.getUTCFullYear() + '-' +
        String(istTime.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(istTime.getUTCDate()).padStart(2, '0') + ' ' +
        String(istTime.getUTCHours()).padStart(2, '0') + ':' +
        String(istTime.getUTCMinutes()).padStart(2, '0') + ':' +
        String(istTime.getUTCSeconds()).padStart(2, '0');

      var voucherCandidates = [];
      var vals = toInsert.map(function (r) {
        c_id = c_id + 1;
        var c_number = 'TRIP00' + c_id;

        var amount = parseFloat(r.vehicle_type === 'van' ? r.booking_amount : r.amount) || 0;
        var debitLedgerId = r.debit_ledger_id || (r.vehicle_type === 'van' ? r.hirer_ledger_id : null);
        var debitLedgerName = r.debit_ledger_name || (r.vehicle_type === 'van' ? r.hirer_name : r.paid_to_name);
        if (debitLedgerId && r.credit_ledger_id && amount > 0) {
          voucherCandidates.push({
            c_number: c_number, amount: amount,
            debit_ledger_id: debitLedgerId, debit_ledger_name: debitLedgerName,
            credit_ledger_id: r.credit_ledger_id, credit_ledger_name: r.credit_ledger_name,
          });
        }

        return [
          r.bus_no || null, r.service_no || null, r.optreg || null,
          r.driver1_name || null, r.optreg1 || null, r.driver2_name || null, r.optreg2 || null,
          r.helper_name || null, r.conductor_name || null, formattedDate, trip_date,
          r.trip_for || null, r.trip_for_id || null, r.service_no_id || null,
          r.paid_to_id || null, r.paid_to_name || null, r.paid_to_type || null, r.remarks || null,
          userId, usrNm, r.driver1_id || null, r.driver2_id || null, r.conductor_id || null, r.helper_id || null,
          c_id, c_number, r.trip_run_status || 'Running',
          r.vehicle_type || 'bus', r.line_code || null, r.hirer_name || null, (amount || null), r.phone_number || null,
          r.hirer_ledger_id || null,
          r.opt_driver1_id || null, r.opt_driver1_name || null,
          r.opt_driver2_id || null, r.opt_driver2_name || null,
          r.opt_helper_id || null, r.opt_helper_name || null,
          r.driver1_paid_direct ? 1 : 0, r.driver2_paid_direct ? 1 : 0,
          r.helper_paid_direct ? 1 : 0, r.conductor_paid_direct ? 1 : 0,
        ];
      });
      var QRY = 'INSERT INTO trip_created (bus_no, service_no, optreg, driver1_name, optreg1, driver2_name, optreg2, helper_name, conductor_name, cts, trip_date, trip_for, trip_for_id, service_no_id, paid_to_id, paid_to_name, paid_to_type, remarks, created_id, created_name, driver1_id, driver2_id, conductor_id, helper_id, c_id, c_number, trip_run_status, vehicle_type, line_code, hirer_name, booking_amount, phone_number, hirer_ledger_id, opt_driver1_id, opt_driver1_name, opt_driver2_id, opt_driver2_name, opt_helper_id, opt_helper_name, driver1_paid_direct, driver2_paid_direct, helper_paid_direct, conductor_paid_direct) VALUES ?';
      dbutil.execupdateQuery(sqldb, QRY, [vals], cntxtDtls, function (err) {
        if (err) return callback(err, null);
        callback(null, { inserted: toInsert.length, total: (rows || []).length, voucherCandidates: voucherCandidates });
      });
    });
  }
};

exports.addtoexpensive_details = function (c_id, c_number, data, callback) {
  const cntxtDtls = "in addtoexpensive_details";

  const QRY_TO_EXEC = `
    INSERT INTO expensive_details (
      bus_no,
      service_no,
      trip_date,
      paid_to_type,
      paid_to_name,
      paid_to_id,
      c_number,
      c_id
    )
    VALUES (
      '${data.bus_no}',
      '${data.service_no}',
      '${data.trip_date}',
      '${data.paid_to_type}',
      '${data.paid_to_name}',
      '${data.paid_to_id}',
      '${c_number}',
      '${c_id}')`;

  console.log(QRY_TO_EXEC);

  if (callback && typeof callback === "function") {
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, (err, results) => {
      callback(err, results);
    });
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};


exports.updatetripcreated = function (data, callback) {
  var cntxtDtls = "in updatetripcreated";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");
  var QRY_TO_EXEC = ``;

  QRY_TO_EXEC = `
        UPDATE tripexpenses_data
        SET 
        trip_date = '${data.trip_date}',
        bus_no = '${data.bus_no}',
        service_no = '${data.service_no}',
        service_no_id  = '${data.service_no_id}',
        trip_for = '${data.trip_for}',
        trip_for_id = '${data.trip_for_id}',
        driveronebeta = '${data.optreg}',
        driver1_name = '${data.driver1_name}',
        driver1_id = '${data.driver1_id}',
        drivertwobeta = '${data.optreg1}',
        driver2_name = '${data.driver2_name}',
        driver2_id = '${data.driver2_id}',
        helperbeta = '${data.optreg2}',
        helper_name = '${data.helper_name}',
        helper_id = '${data.helper_id}',
        conductor_name = '${data.conductor_name}',
        conductor_id = '${data.conductor_id}',
        paid_to_type = '${data.paid_to_type}',
        paid_to_name = '${data.paid_to_name}',
        paid_to_id = '${data.paid_to_id}',
        remarks = '${data.remarks}'
        WHERE trip_creation_id = '${data.id}' ;


        UPDATE expensive_details
        SET 
        bus_no = '${data.bus_no}',
        service_no = '${data.service_no}',
        trip_date = '${data.trip_date}',
        paid_to_type = '${data.paid_to_type}',
        paid_to_name = '${data.paid_to_name}',
        paid_to_id = '${data.paid_to_id}'
        WHERE trip_creation_id = ${data.id};
        `;
  // console.log(QRY_TO_EXEC)

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.gettripceated = function (callback) {
  var cntxtDtls = "in gettripceated";
  var QRY_TO_EXEC = `select * from trip_created where  d_in='0' and status!='1'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.gettripceated1Mdl = function (callback) {
  var cntxtDtls = "in gettripceated1Mdl";
  // var QRY_TO_EXEC = `select * from trip_created where  d_in='0' order by cts`;
  // COALESCE falls back to driver_name/the plain-text column stored at insert
  // time whenever the JOIN'd nickname is null — driver_register.nickname is
  // optional and 4/10 active drivers don't have one set, so the un-COALESCE'd
  // join was silently blanking out driver1/driver2/paid_to names for any trip
  // assigned to one of those drivers, even though the trip was saved correctly.
  var QRY_TO_EXEC = `SELECT
  t.*,
  COALESCE(d1.nickname, d1.driver_name, t.driver1_name) AS driver1_name,
  COALESCE(d2.nickname, d2.driver_name, t.driver2_name) AS driver2_name,
  COALESCE(h.helper_name, t.helper_name) AS helper_name,
  COALESCE(s.fullName, t.conductor_name) AS conductor_name,
  CASE
    WHEN t.paid_to_type = 'driver' THEN COALESCE(d3.nickname, d3.driver_name, t.paid_to_name)
    WHEN t.paid_to_type = 'helper' THEN COALESCE(h2.helper_name, t.paid_to_name)
    WHEN t.paid_to_type = 'staff' THEN COALESCE(s2.fullName, t.paid_to_name)
    ELSE t.paid_to_name
  END AS paid_to_name,
  vd.expensives AS debit_ledger_name,
  vc.expensives AS credit_ledger_name
FROM
  trip_created t
LEFT JOIN
  driver_register d1 ON t.driver1_id = d1.id
LEFT JOIN
  driver_register d2 ON t.driver2_id = d2.id
LEFT JOIN
  helper_register h ON t.helper_id = h.id
LEFT JOIN
  staff_register s ON t.conductor_id = s.id
LEFT JOIN driver_register d3 ON t.paid_to_id = d3.id
LEFT JOIN helper_register h2 ON t.paid_to_id = h2.id
LEFT JOIN staff_register s2 ON t.paid_to_id = s2.id
LEFT JOIN mainvoucher_subt vd ON vd.c_number = t.voucher_number AND vd.account_type = 'Debit Account' AND vd.d_in = 0
LEFT JOIN mainvoucher_subt vc ON vc.c_number = t.voucher_number AND vc.account_type = 'Credit Account' AND vc.d_in = 0
WHERE
  t.d_in = '0'
ORDER BY
  CAST(SUBSTRING(t.c_number, 6) AS UNSIGNED) DESC;
`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletetripcreatedMdl = function (reqdata, callback) {
  console.log(reqdata, 3056);
  var cntxtDtls = "in deletetripcreatedMdl";
  var QRY_TO_EXEC = `
    update trip_created set d_in=1 where id='${reqdata.id}';
    update tripexpenses_data set d_in=1 where trip_creation_id='${reqdata.id}';
    update expensive_details set d_in=1 where trip_creation_id='${reqdata.id}';
    `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getvoucherentrydataMdl = function (callback) {
  var cntxtDtls = "in getvoucherentrydataMdl";
  var QRY_TO_EXEC = `SELECT mv.*,
    GROUP_CONCAT(CASE WHEN sub.account_type='Debit Account'  THEN sub.expensives END SEPARATOR '|') AS debit_ledger_name,
    GROUP_CONCAT(CASE WHEN sub.account_type='Credit Account' THEN sub.expensives END SEPARATOR '|') AS credit_ledger_name,
    SUM(CASE WHEN sub.account_type='Debit Account' THEN sub.amount ELSE 0 END) AS debit_total
  FROM mainvoucher_t mv
  LEFT JOIN mainvoucher_subt sub ON mv.c_number = sub.c_number AND sub.d_in = 0
  WHERE mv.d_in = '0' AND mv.status = '0'
  GROUP BY mv.c_number
  ORDER BY mv.id DESC;`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitvoucherentrysubtable = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitvoucherentrysubtable";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.creditaddrowdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};
    const row = {
      lastinsert_id: lastid,
      account_type: credit.creditaccount || null,
      amount: credit.creditamount || 0,
      child: credit.creditledger?.child || null,
      district_id: credit.creditledger?.district_id || null,
      mandal_id: credit.creditledger?.mandal_id || null,
      subchildtwo: credit.creditledger?.subchildtwo || null,
      expensives: credit.creditledger?.temple_name || null,
      village_id: credit.creditledger?.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.named,
      user_id: data.user_id,
      staticname: credit.creditledger?.staticname || null,
      mandal_name: credit.creditledger?.mandal_name || null,
      subchildtwo_id: credit.creditledger?.subchildtwo_id || null,
      description: credit.description || data.expensedetails.description,
      name: credit.name || data.expensedetails.name,
      staff_type: credit.staff_type || data.expensedetails.staff_type,
      staff_type_id: credit.staff_type_id || data.expensedetails.staff_type_id,
      valueDate: credit.valueDate || data.expensedetails.valueDate,
      vehicleNo: credit.vehicleNo || data.expensedetails.vehicleNo,
      creditanddebitamount: data.creditanddebitamount,
      vouchertype: data.expensedetails.vouchertype.voucher_type,
      voucher_type_id: data.expensedetails.voucher_type_id,
      voucherdate: data.expensedetails.voucherdate,
      parent_subgroup_id: credit.creditledger?.parent_subgroup_id,
      parent_subchild_id: credit.creditledger?.parent_subchild_id,
      parent_grp_level: credit.creditledger?.parent_grp_level,
      ledger_id: credit.creditledger?.ledger_id,
    };
    // console.log(row,2948)
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert:", insertRows);
  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_subt SET ?`;
  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          // console.error(? Insert error at index ${i}:, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};

exports.updatesubmitvoucherentrysubtable = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitvoucherentrysubtable";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.creditaddrowdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};
    const row = {
      lastinsert_id: lastid,
      account_type: credit.creditaccount || null,
      amount: credit.creditamount || 0,
      child: credit.creditledger?.child || null,
      district_id: credit.creditledger?.district_id || null,
      mandal_id: credit.creditledger?.mandal_id || null,
      subchildtwo: credit.creditledger?.subchildtwo || null,
      expensives: credit.creditledger?.temple_name || null,
      village_id: credit.creditledger?.village_id || null,
      i_ts: data.i_ts,
      c_number: data.c_number,
      c_id: data.c_id,
      entry_by: data.entry_by,
      user_id: data.user_id,
      staticname: credit.creditledger?.staticname || null,
      mandal_name: credit.creditledger?.mandal_name || null,
      subchildtwo_id: credit.creditledger?.subchildtwo_id || null,
      description: credit.description || data.expensedetails.description,
      name: credit.name || data.expensedetails.name,
      staff_type: credit.staff_type || data.expensedetails.staff_type,
      staff_type_id: credit.staff_type_id || data.expensedetails.staff_type_id,
      valueDate: credit.valueDate || data.expensedetails.valueDate,
      vehicleNo: credit.vehicleNo || data.expensedetails.vehicleNo,
      creditanddebitamount: data.creditanddebitamount,
      vouchertype: data.expensedetails.vouchertype.voucher_type,
      voucher_type_id: data.expensedetails.voucher_type_id,
      voucherdate: data.expensedetails.voucherdate,
      parent_subgroup_id: credit.creditledger?.parent_subgroup_id,
      parent_subchild_id: credit.creditledger?.parent_subchild_id,
      parent_grp_level: credit.creditledger?.parent_grp_level,
      ledger_id: credit.creditledger?.ledger_id,
    };
    // console.log(row,2948)
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert:", insertRows);
  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_subt SET ?`;
  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          // console.error(? Insert error at index ${i}:, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};

exports.submitvoucherentrysubtableseconddata = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitvoucherentrysubtableseconddata";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.patientsTstdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};

    const row = {
      lastinsert_id: lastid,
      account_type: patient.debitaccount || null,
      amount: patient.d_test_amount || 0,
      child: patient.d_test_name?.child || null,
      district_id: patient.d_test_name?.district_id || null,
      mandal_id: patient.d_test_name?.mandal_id || null,
      subchildtwo: patient.d_test_name?.subchildtwo || null,
      expensives: patient.d_test_name?.temple_name || null,
      village_id: patient.d_test_name?.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.named,
      user_id: data.user_id,
      staticname: patient.d_test_name?.staticname || null,
      mandal_name: patient.d_test_name?.mandal_name || null,
      subchildtwo_id: patient.d_test_name?.subchildtwo_id || null,
      description: patient.description || data.expensedetails.description,
      name: patient.name || data.expensedetails.name,
      valueDate: patient.valueDate || data.expensedetails.valueDate,
      vehicleNo: patient.vehicleNo || data.expensedetails.vehicleNo,
      creditanddebitamount: data.creditanddebitamount,
      vouchertype: data.expensedetails.vouchertype.voucher_type,
      voucher_type_id: data.expensedetails.voucher_type_id,
      staff_type: patient.staff_type || data.expensedetails.staff_type,
      staff_type_id: patient.staff_type_id || data.expensedetails.staff_type_id,
      voucherdate: data.expensedetails.voucherdate,
      parent_subgroup_id: patient.d_test_name?.parent_subgroup_id,
      parent_subchild_id: patient.d_test_name?.parent_subchild_id,
      parent_grp_level: patient.d_test_name?.parent_grp_level,
      ledger_id: patient.d_test_name?.ledger_id,
    };
    // console.log(row,3033)
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert:", insertRows);

  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_subt SET ?`;

  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          // console.error(? Insert error at index ${i}:, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};

exports.updatesubmitvoucherentrysubtableseconddata = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitvoucherentrysubtableseconddata";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.patientsTstdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};

    const row = {
      lastinsert_id: lastid,
      account_type: patient.debitaccount || null,
      amount: patient.d_test_amount || 0,
      child: patient.d_test_name?.child || null,
      district_id: patient.d_test_name?.district_id || null,
      mandal_id: patient.d_test_name?.mandal_id || null,
      subchildtwo: patient.d_test_name?.subchildtwo || null,
      expensives: patient.d_test_name?.temple_name || null,
      village_id: patient.d_test_name?.village_id || null,
      i_ts: data.i_ts,
      c_number: data.c_number,
      c_id: data.c_id,
      entry_by: data.entry_by,
      user_id: data.user_id,
      staticname: patient.d_test_name?.staticname || null,
      mandal_name: patient.d_test_name?.mandal_name || null,
      subchildtwo_id: patient.d_test_name?.subchildtwo_id || null,
      description: patient.description || data.expensedetails.description,
      name: patient.name || data.expensedetails.name,
      valueDate: patient.valueDate || data.expensedetails.valueDate,
      vehicleNo: patient.vehicleNo || data.expensedetails.vehicleNo,
      creditanddebitamount: data.creditanddebitamount,
      vouchertype: data.expensedetails.vouchertype.voucher_type,
      voucher_type_id: data.expensedetails.voucher_type_id,
      staff_type: patient.staff_type || data.expensedetails.staff_type,
      staff_type_id: patient.staff_type_id || data.expensedetails.staff_type_id,
      voucherdate: data.expensedetails.voucherdate,
      parent_subgroup_id: patient.d_test_name?.parent_subgroup_id,
      parent_subchild_id: patient.d_test_name?.parent_subchild_id,
      parent_grp_level: patient.d_test_name?.parent_grp_level,
      ledger_id: patient.d_test_name?.ledger_id,
    };
    // console.log(row,3033)
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert:", insertRows);

  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_subt SET ?`;

  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          // console.error(? Insert error at index ${i}:, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};

exports.getcollectionagentMdl = function (callback) {
  var cntxtDtls = "in getcollectionagentMdl";
  var QRY_TO_EXEC = `SELECT * from users where d_in=0 and usertype='2'  order by id desc`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.SelectdatagetfinaltranscationsreportMdl = function (data, callback) {
  const cntxtDtls = "in SelectdatagetfinaltranscationsreportMdl";

  // Base WHERE clauses
  let expenseCondition = `ed.d_in='0' AND ed.admin_status='1'`;
  let voucherCondition = `mv.d_in='0' AND mv.status='1'`;
  let fuelCondition = `f.d_in='0' AND f.admin_status='1'`;
  let laundryCondition = `l.d_in='0' AND l.admin_status='1'`;

  // const typeFilter = `(mm.district_id = "3" OR mm.district_id = "4")`;
  const typeFilter = ``;

  if (data.fromdate && data.todate) {
    const dateFilter = `DATE(ed.i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'`;

    expenseCondition += ` AND ${dateFilter}`;

    if (data.ledger_name || data.ledger_id) {
      expenseCondition += ` AND ed.temple_name = '${data.ledger_name}' or led.ledger_id = '${data.ledger_id}'`;
    }

    const dateVoucherFilter = `DATE(mv.i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'`;
    voucherCondition += ` AND ${dateVoucherFilter}`;
    if (data.ledger_name || data.ledger_id) {
      voucherCondition += ` AND mv.expensives = '${data.ledger_name}' or led.ledger_id = '${data.ledger_id}'`;
    }

    const dateFuelFilter = `DATE(f.i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'`;
    fuelCondition += ` AND ${dateFuelFilter}`;
    if (data.ledger_name || data.ledger_id) {
      fuelCondition += ` AND f.expensives = '${data.ledger_name}' or led.ledger_id = '${data.ledger_id}'`;
    }

    const dateLaundryFilter = `DATE(l.i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'`;
    laundryCondition += ` AND ${dateLaundryFilter}`;
    if (data.ledger_name || data.ledger_id) {
      laundryCondition += ` AND l.expensives = '${data.ledger_name}' or led.ledger_id = '${data.ledger_id}'`;
    }
  }

  const QRY_TO_EXEC = `
        SELECT ed.*, mm.district_id FROM expensive_details AS ed
        JOIN mainmasterssubchildtwo AS mm ON mm.id = ed.ledger_id
        WHERE mm.d_in = '0' AND ${expenseCondition};

        SELECT mv.*, mm.district_id FROM mainvoucher_subt AS mv
        JOIN mainmasterssubchildtwo AS mm ON mm.id = mv.ledger_id
        WHERE mm.d_in = '0' AND ${voucherCondition};

        SELECT f.*, mm.district_id FROM fuelentry_subt AS f
        JOIN mainmasterssubchildtwo AS mm ON mm.id = f.ledger_id
        WHERE mm.d_in = '0' AND ${fuelCondition};

        SELECT l.*, mm.district_id FROM laundrybill_subt AS l
        JOIN mainmasterssubchildtwo AS mm ON mm.id = l.ledger_id
        WHERE mm.d_in = '0' AND ${laundryCondition};
    `;

  console.log(QRY_TO_EXEC, 3360);

  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.getLedgerWiseReportMdl = function (data, callback) {
  var cntxtDtls = "in getLedgerWiseReportMdl";

  var ledgerFilter = data.ledger_id
    ? `AND ms2.ledger_id = '${data.ledger_id}'`
    : '';

  var dateFilter = (data.fromdate && data.todate)
    ? `AND DATE(mv.voucherdate) BETWEEN '${data.fromdate}' AND '${data.todate}'`
    : '';

  var QRY_TO_EXEC = `
    SELECT
      mv.c_number,
      mv.vouchertype,
      mv.voucherdate,
      mv.valueDate,
      mv.vehicleNo,
      mv.staff_type,
      mv.entry_by,
      s.credit_ledger_name,
      s.debit_ledger_name,
      s.amount
    FROM mainvoucher_t mv
    INNER JOIN (
      SELECT
        ms.c_number,
        MAX(CASE WHEN ms.account_type = 'Credit Account' THEN ms.expensives END) AS credit_ledger_name,
        MAX(CASE WHEN ms.account_type = 'Debit Account' THEN ms.expensives END) AS debit_ledger_name,
        MAX(ms.amount) AS amount
      FROM mainvoucher_subt ms
      WHERE ms.d_in = 0 AND ms.status = 1
        AND ms.c_number IN (
          SELECT DISTINCT ms2.c_number
          FROM mainvoucher_subt ms2
          WHERE ms2.d_in = 0 AND ms2.status = 1 ${ledgerFilter}
        )
      GROUP BY ms.c_number
    ) s ON mv.c_number = s.c_number
    WHERE mv.d_in = 0 AND mv.status = 1 ${dateFilter}
    ORDER BY mv.voucherdate DESC, CAST(SUBSTRING(mv.c_number, 5) AS UNSIGNED) DESC
  `;

  if (callback && typeof callback === 'function') {
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      callback(err, results);
    });
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.getvouchertypedatamdl = function (data, callback) {
  var cntxtDtls = "in getvouchertypedatamdl";
  var QRY_TO_EXEC = `select * from voucher_type where d_in=0  order by voucher_type ASC;`;
  //console.log()QRY_TO_EXEC, 50078);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitvouchertypemdl = function (data, callback) {
  var cntxtDtls = "in submitvouchertypemdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    voucher_type: data.vouchertype,
    i_ts: date,
    d_in: 0,
  };
  //console.log()dta);

  var QRY_TO_EXEC = `insert into voucher_type SET ? `;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.editvouchernamemdl = function (data, callback) {
  var cntxtDtls = "in editvouchernamemdl";
  var m = [data.vouchertype, data.id];
  var QRY_TO_EXEC = `update voucher_type set voucher_type='${data.vouchertype}' where id = '${data.id}';`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletevouchernamemdl = function (data, callback) {
  var cntxtDtls = "in deletevouchernamemdl";
  var m = [data.id];
  var QRY_TO_EXEC = `update voucher_type set d_in=1 where id = ?;`;
  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updatevoucherentrystatusMdl = function (data, callback) {
  var cntxtDtls = "in updatevoucherentrystatusMdl";
  var QRY_TO_EXEC = `update mainvoucher_t set status=?, admin_status_by_id=?, admin_status_by_name=?, admin_status_by_date=?, rejection_reason=? where c_number=?;
  update mainvoucher_subt set status=? where c_number=?;`;

  var m = [
    data.vouchervalue,
    data.admin_status_by_id,
    data.admin_status_by_name,
    data.admin_status_by_date,
    data.rejection_reason || '',
    data.voucherdata.c_number,
    data.vouchervalue,
    data.voucherdata.c_number
  ];

  console.log(QRY_TO_EXEC, 4255);

  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls);
};

exports.insertVoucherAuditMdl = function (data, callback) {
  var cntxtDtls = "insertVoucherAuditMdl";
  var QRY_TO_EXEC = `INSERT INTO mainvoucher_audit (c_number, action, action_by_id, action_by_name, action_at, changes_note)
     VALUES (?, ?, ?, ?, NOW(), ?)`;
  var m = [
    data.c_number, 
    data.action, 
    data.action_by_id || '', 
    data.action_by_name || '', 
    data.changes_note || ''
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

exports.getVoucherAuditMdl = function (c_number, callback) {
  var cntxtDtls = "getVoucherAuditMdl";
  var QRY_TO_EXEC = `SELECT * FROM mainvoucher_audit WHERE c_number = ? ORDER BY action_at ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [c_number], cntxtDtls, callback);
};
exports.updatetripadminstatusMdl = function (data, callback) {
  var cntxtDtls = "in updatetripadminstatusMdl";
  let vouchervalue = "";
  var QRY_TO_EXEC = `
    update tripexpenses_data set status = '${data.vouchervalue}',admin_status='${data.vouchervalue}',admin_action_by='${data.user_id}',admin_action_date='${data.updated_date}',action_by_name='${data.user_nm}' where c_number='${data.voucherdata.c_number}';

    update expensive_details set admin_status='${data.vouchervalue}',admin_action_by='${data.user_id}',admin_action_date='${data.updated_date}',action_by_name='${data.user_nm}' where c_number='${data.voucherdata.c_number}';


    update trip_created set admin_status='${data.vouchervalue}' where id='${data.voucherdata.id}';`;
  console.log(QRY_TO_EXEC, 6330);

  // console.log(QRY_TO_EXEC)

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.updatefueladminstatusMdl = function (data, callback) {
  var cntxtDtls = "in updatefueladminstatusMdl";
  let vouchervalue = "";
  var QRY_TO_EXEC = `update fuel_entry set admin_status='${data.vouchervalue}',admin_status_byid='${data.admin_status_byid}',admin_status_byname='${data.admin_status_byname}',admin_status_bydate='${data.admin_status_bydate}' where c_number='${data.voucherdata.c_number}';
    update fuelentry_subt set admin_status='${data.vouchervalue}' where c_number='${data.voucherdata.c_number}';`;
  console.log(QRY_TO_EXEC, 7132);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// exports.updatelaundryadminstatusMdl = function (data, callback) {
//     var cntxtDtls = "in updatelaundryadminstatusMdl";
//     let vouchervalue = '';
//     var QRY_TO_EXEC = `update laundrybill_subt set admin_status='${data.vouchervalue}' where lastinsert_id='${data.voucherdata.id}';update laundrybill_maint set admin_status='${data.vouchervalue}' where id='${data.voucherdata.id}';`;
//     //console.log()QRY_TO_EXEC, 7149);
//     if (callback && typeof callback == "function") {
//         dbutil.execQuery(
//             sqldb,
//             QRY_TO_EXEC,
//             cntxtDtls,
//             function (err, results) {
//                 callback(err, results);
//                 return;
//             }
//         );
//     } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
// };

exports.updatelaundryadminstatusMdl = function (data, callback) {
  var cntxtDtls = "in updatelaundryadminstatusMdl";
  let vouchervalue = "";
  var QRY_TO_EXEC = `update laundrybill_subt set admin_status='${data.vouchervalue}' where c_number='${data.voucherdata.c_number}';
    update laundrybill_maint set admin_status='${data.vouchervalue}',admin_action_date ='${data.admin_action_date}',admin_action_name ='${data.admin_action_name}',admin_action_id = '${data.admin_action_id}' where c_number='${data.voucherdata.c_number}';`;
  //console.log()QRY_TO_EXEC, 7149);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletelaundrybillMdl = function (data, callback) {
  var cntxtDtls = "in deletelaundrybillMdl";
  let vouchervalue = "";
  var QRY_TO_EXEC = `update laundrybill_subt set d_in='1' where c_number='${data.c_number}';
    update laundrybill_maint set d_in='1',delete_by_date ='${data.admin_action_date}',delete_by_name ='${data.admin_action_name}',delete_by_id = '${data.admin_action_id}' where c_number='${data.c_number}';`;
  //console.log()QRY_TO_EXEC, 7149);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getbetaMdl = function (data, callback) {
  var cntxtDtls = "in getbetaMdl";
  //console.log()data, 5242);

  var QRY_TO_EXEC = `SELECT * from driverone where d_in=0 and serviceNo='${data.serviceNo}'`;
  //console.log()QRY_TO_EXEC, 6529);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// ── Halt Beta ───────────────────────────────────────────────────────────────
// One amount for the whole company: what each assigned crew member is paid when
// a service is marked Halt on Trip Creation, in place of their running beta.
exports.gethaltbetaMdl = function (data, callback) {
  var cntxtDtls = "in gethaltbetaMdl";
  var QRY_TO_EXEC = `SELECT setting_value FROM app_settings WHERE setting_key = 'halt_beta'`;
  return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
    if (callback && typeof callback == "function") callback(err, results);
  });
};

exports.savehaltbetaMdl = function (data, callback) {
  var cntxtDtls = "in savehaltbetaMdl";
  var date = moment().format("YYYY-MM-DD HH:mm:ss");
  var QRY_TO_EXEC = `INSERT INTO app_settings (setting_key, setting_value, updated_by, updated_userid, u_ts)
    VALUES ('halt_beta', ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by),
      updated_userid = VALUES(updated_userid), u_ts = VALUES(u_ts)`;
  var params = [String(data.halt_beta == null ? '' : data.halt_beta), data.usrnm || null, data.userid || null, date];
  return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls, function (err, results) {
    if (callback && typeof callback == "function") callback(err, results);
  });
};

exports.getmodaldataMdl = function (data, callback) {
  var cntxtDtls = "in getbetaMdl";
  //console.log()data, 5242);
  if (data.sudId == 2) {
    var QRY_TO_EXEC = `SELECT * from  expensive_details where d_in=0 and c_number='${data.serviceNo}';
        `;
  } else if (data.sudId == 3) {
    var QRY_TO_EXEC = `SELECT * from  expensive_details where d_in=0 and c_number='${data.serviceNo}';
        SELECT
  te.*,
  COALESCE(d1.nickname, d1.driver_name, te.driver1_name) AS driver1_name,
  COALESCE(d2.nickname, d2.driver_name, te.driver2_name) AS driver2_name,
  COALESCE(h.helper_name, te.helper_name) AS helper_name,
  COALESCE(s.fullName, te.conductor_name) AS conductor_name,
  d1.ledger_id AS driver1_ledger_id,
  d2.ledger_id AS driver2_ledger_id,
  h.ledger_id AS helper_ledger_id,
  s.ledger_id AS conductor_ledger_id,
  CASE
      WHEN te.paid_to_type = 'driver' THEN COALESCE(d3.nickname, d3.driver_name, te.paid_to_name)
      WHEN te.paid_to_type = 'helper' THEN COALESCE(h2.helper_name, te.paid_to_name)
      WHEN te.paid_to_type = 'staff'  THEN COALESCE(s2.fullName, te.paid_to_name)
      ELSE te.paid_to_name
  END AS paid_to_name
FROM
  tripexpenses_data te
LEFT JOIN driver_register d1 ON te.driver1_id = d1.id
LEFT JOIN driver_register d2 ON te.driver2_id = d2.id
LEFT JOIN helper_register h ON te.helper_id = h.id
LEFT JOIN staff_register s ON te.conductor_id = s.id
LEFT JOIN driver_register d3 ON te.paid_to_id = d3.id
LEFT JOIN helper_register h2 ON te.paid_to_id = h2.id
LEFT JOIN staff_register s2 ON te.paid_to_id = s2.id
WHERE
  te.c_number = '${data.serviceNo}'
  AND te.d_in = 0;


        `;
  } else {
    var QRY_TO_EXEC = `SELECT * from mainvoucher_subt where d_in=0 and 	c_number='${data.serviceNo}'`;
  }
  console.log(QRY_TO_EXEC);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.gettripdeletedmodaldataMdl = function (data, callback) {
  var cntxtDtls = "in gettripdeletedmodaldataMdl";

  var QRY_TO_EXEC = `SELECT * from  expensive_details where  serial_no='${data.serviceNo}';
        SELECT * FROM tripexpenses_data where id = '${data.serviceNo}';
        `;

  console.log(QRY_TO_EXEC)

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitlaundrytypemainmastersMdl = function (data, callback) {
  var cntxtDtls = "in submitlaundrytypemainmastersMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    product_name: data.vouchertype,
    i_ts: date,
    d_in: 0,
  };
  //console.log()dta);

  var QRY_TO_EXEC = `insert into laundryproduct_t SET ? `;
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getlaundrytypemainmastersMdl = function (data, callback) {
  var cntxtDtls = "in getlaundrytypemainmastersMdl";
  var QRY_TO_EXEC = `select * from laundryproduct_t where d_in=0  order by id ASC;`;
  //console.log()QRY_TO_EXEC, 50078);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

////////laundry post code starts
exports.submitlaundrydataMdlreferencenumber = function (callback) {
  var cntxtDtls = "in submitlaundrydataMdlreferencenumber";
  var QRY_TO_EXEC = `SELECT c_id FROM mainlaundry_t  WHERE d_in='0' order by id desc limit 1 ;`;
  //console.log()QRY_TO_EXEC, 22582);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitlaundrymaindata = function (c_number, c_id, data, callback) {
  const cntxtDtls = "in submitlaundrymaindata";
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const dta = {
    description: data.expensedetails.description,
    name: data.expensedetails.name,
    valueDate: data.expensedetails.valueDate,
    vehicleNo: data.expensedetails.vehicleNo,
    creditanddebitamount: data.creditanddebitamount,
    i_ts: curDate,
    vouchertype: data.expensedetails.vouchertype,
    voucherdate: data.expensedetails.voucherdate,
    c_number: c_number,
    c_id: c_id,
    entry_by: data.named,
    user_id: data.user_id,
    fromdate: data.expensedetails.fromdate,
    todate: data.expensedetails.todate,
  };
  const QRY_TO_EXEC = `INSERT INTO mainlaundry_t SET ?;`;
  if (callback && typeof callback === "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      callback
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.submitlaundrysubtable = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitlaundrysubtable";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];
  //console.log()data, 7309);

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }
  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  const selectedledger = data.expensedetails?.selectedledger || {};

  data.patientsTstdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};

    const row = {
      lastinsert_id: lastid,
      account_type: patient.debitaccount || null,
      amount: patient.d_test_amount || 0,
      child: selectedledger.child || null,
      district_id: selectedledger.district_id || null,
      mandal_id: selectedledger.mandal_id || null,
      subchildtwo: selectedledger.subchildtwo || null,
      expensives: selectedledger.temple_name || null,
      village_id: selectedledger.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.named,
      user_id: data.user_id,
      staticname: selectedledger.staticname || null,
      mandal_name: selectedledger.mandal_name || null,
      subchildtwo_id: selectedledger.subchildtwo_id || null,
      description: data.expensedetails.description,
      name: data.expensedetails.name,
      valueDate: data.expensedetails.valueDate,
      vehicleNo: data.expensedetails.vehicleNo,
      creditanddebitamount: data.creditanddebitamount,
      vouchertype: data.expensedetails.voucher_type,
      voucherdate: data.expensedetails.voucherdate,
      product_name: patient.d_test_name?.product_name || null,
      parent_subgroup_id: selectedledger.parent_subgroup_id,
      parent_subchild_id: selectedledger.parent_subchild_id,
      parent_grp_level: selectedledger.parent_grp_level,
      ledger_id: selectedledger.ledger_id,
    };

    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into laundry_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert:", insertRows);

  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO laundry_subt SET ?`;

  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};

///fuei post code starts
exports.mainfuelticketMdl = function (callback) {
  var cntxtDtls = "in mainfuelticketMdl";
  // var QRY_TO_EXEC = `SELECT c_id FROM fuelentry_subt  WHERE d_in='0' order by id desc limit 1 ;`;
  var QRY_TO_EXEC = `SELECT max(c_id) as c_id FROM fuelentry_subt  WHERE d_in='0' order by id desc limit 1 ;`;
  //console.log()QRY_TO_EXEC, 7610);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitfuelentrymaindata = function (c_number, c_id, data, callback) {
  // console.log(data, 7282);
  const cntxtDtls = "in submitvoucherentrymaindata";
  // const curDate = moment().utcOffset("+05:30").format('YYYY-MM-DD HH:mm:ss');
  //console.log()data.previousOdometer1, 7512)
  const dta = {
    date: data.date,
    vehicle_number: data.vehicleNumber,
    // previous_odometer: data.previousOdometer1,
    prev_odometer: data.previousOdometer1=='null' ? 0 : data.previousOdometer1,
    present_odometer: data.presentOdometer || 0,
    driver1: data.driver1,
    driver2: data.driver2, 
    quantity_filled: data.qtyFilled,
    price_per_liter: data.pricePerLitre,
    total_bill: data.totalBill,
    avg_kmpl: data.averageKMPL,
    debit_account: data.patientsTstdts[0].d_test_amount,
    credit_account: data.creditaddrowdts[0].creditamount,
    d_in: 0,
    c_number: c_number,
    c_id: c_id,
    entry_by: data.named,
    user_id: data.user_id,
    previous_odometer: data.previousodometer,
    service_number: data.serviceNumber,
    kilometers: data.kilometers,
    target: data.fueltraget,
    driver1_id: data.driver1_id,
    driver2_id: data.driver2_id,
    issparetank: data.issparetank
  };

  // console.log(dta)
  const QRY_TO_EXEC = `INSERT INTO  fuel_entry SET ?;`;
  if (callback && typeof callback === "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      callback
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

 exports.editsubmitfuelentrysubtable = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitfuelentrysubtable";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];
  //console.log()data, 7403);
  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  data.creditaddrowdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};

    const row = {
      lastinsert_id: lastid,
      account_type: "Credit Account",
      amount: data.creditaddrowdts[index].creditamount || 0,
      child: data.creditaddrowdts[index].creditledger.child || null,
      district_id: data.creditaddrowdts[index].creditledger.district_id || null,
      mandal_id: data.creditaddrowdts[index].creditledger.mandal_id || null,
      subchildtwo: data.creditaddrowdts[index].creditledger.subchildtwo || null,
      expensives: data.creditaddrowdts[index].creditledger.temple_name || null,
      village_id: data.creditaddrowdts[index].creditledger.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.entry_by,
      staticname: data.creditaddrowdts[index].creditledger.staticname || null,
      mandal_name: data.creditaddrowdts[index].creditledger.mandal_name || null,
      subchildtwo_id:
        data.creditaddrowdts[index].creditledger.subchildtwo_id || null,
      user_id: data.user_id,
      vehicleNo: data.vehicleNumber,
      // creditanddebitamount: (data.patientsTstdts[0].d_test_amount + data.creditaddrowdts[0].creditamount),
      // debit_amount: data.patientsTstdts[index].d_test_amount,
      // credit_amount: data.creditaddrowdts[index].creditamount,
      status: 0,
      d_in: 0,
      voucherdate: data.date,
      parent_subgroup_id:
        data.creditaddrowdts[index].creditledger.parent_subgroup_id,
      parent_subchild_id:
        data.creditaddrowdts[index].creditledger.parent_subchild_id,
      parent_grp_level:
        data.creditaddrowdts[index].creditledger.parent_grp_level,
      ledger_id: data.creditaddrowdts[index].creditledger.ledger_id,
    };
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert 1:", insertRows);
  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO fuelentry_subt SET ?`;
  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          console.error(`? Insert error at index ${i}:`, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };
  insertNext(); // Start insert loop
};

 exports.editsubmitfuelentrysubtableseconddata = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitfuelentrysubtableseconddata";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.patientsTstdts.forEach((patient, index) => {
    const credit = data.patientsTstdts[index] || {};

    const row = {
      lastinsert_id: lastid,
      account_type: "Debit Account",
      amount: data.patientsTstdts[index].d_test_amount || 0,
      child: data.patientsTstdts[index].d_test_name.child || null,
      district_id: data.patientsTstdts[index].d_test_name.district_id || null,
      mandal_id: data.patientsTstdts[index].d_test_name.mandal_id || null,
      subchildtwo: data.patientsTstdts[index].d_test_name.subchildtwo || null,
      expensives: data.patientsTstdts[index].d_test_name.temple_name || null,
      village_id: data.patientsTstdts[index].d_test_name.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.entry_by,
      user_id: data.user_id,
      staticname: data.patientsTstdts[index].d_test_name.staticname || null,
      mandal_name: data.patientsTstdts[index].d_test_name.mandal_name || null,
      subchildtwo_id:
        data.patientsTstdts[index].d_test_name.subchildtwo_id || null,
      vehicleNo: data.vehicleNumber,
      // creditanddebitamount: (data.patientsTstdts[0].d_test_amount + data.creditaddrowdts[0].creditamount),
      // debit_amount: data.patientsTstdts[index].d_test_amount,
      // credit_amount: data.creditaddrowdts[index].creditamount,
      status: 0,
      d_in: 0,
      voucherdate: data.date,
      parent_subgroup_id:
        data.patientsTstdts[index].d_test_name.parent_subgroup_id,
      parent_subchild_id:
        data.patientsTstdts[index].d_test_name.parent_subchild_id,
      parent_grp_level: data.patientsTstdts[index].d_test_name.parent_grp_level,
      ledger_id: data.patientsTstdts[index].d_test_name.ledger_id,
    };
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert2:", insertRows);

  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO fuelentry_subt SET ?`;

  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          console.error(`? Insert error at index ${i}:`, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};
exports.submitfuelentrysubtable = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitfuelentrysubtable";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];
  //console.log()data, 7403);
  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.creditaddrowdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};

    const row = {
      lastinsert_id: lastid,
      account_type: "Credit Account",
      amount: data.creditaddrowdts[index].creditamount || 0,
      child: data.creditaddrowdts[index].creditledger.child || null,
      district_id: data.creditaddrowdts[index].creditledger.district_id || null,
      mandal_id: data.creditaddrowdts[index].creditledger.mandal_id || null,
      subchildtwo: data.creditaddrowdts[index].creditledger.subchildtwo || null,
      expensives: data.creditaddrowdts[index].creditledger.temple_name || null,
      village_id: data.creditaddrowdts[index].creditledger.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.named,
      staticname: data.creditaddrowdts[index].creditledger.staticname || null,
      mandal_name: data.creditaddrowdts[index].creditledger.mandal_name || null,
      subchildtwo_id:
        data.creditaddrowdts[index].creditledger.subchildtwo_id || null,
      user_id: data.user_id,
      vehicleNo: data.vehicleNumber,
      // creditanddebitamount: (data.patientsTstdts[0].d_test_amount + data.creditaddrowdts[0].creditamount),
      // debit_amount: data.patientsTstdts[index].d_test_amount,
      // credit_amount: data.creditaddrowdts[index].creditamount,
      status: 0,
      d_in: 0,
      voucherdate: data.date,
      parent_subgroup_id:
        data.creditaddrowdts[index].creditledger.parent_subgroup_id,
      parent_subchild_id:
        data.creditaddrowdts[index].creditledger.parent_subchild_id,
      parent_grp_level:
        data.creditaddrowdts[index].creditledger.parent_grp_level,
      ledger_id: data.creditaddrowdts[index].creditledger.ledger_id,
    };
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert 1:", insertRows);
  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO fuelentry_subt SET ?`;
  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          console.error(`? Insert error at index ${i}:`, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };
  insertNext(); // Start insert loop
};

exports.submitfuelentrysubtableseconddata = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitfuelentrysubtableseconddata";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.patientsTstdts.forEach((patient, index) => {
    const credit = data.patientsTstdts[index] || {};

    const row = {
      lastinsert_id: lastid,
      account_type: "Debit Account",
      amount: data.patientsTstdts[index].d_test_amount || 0,
      child: data.patientsTstdts[index].d_test_name.child || null,
      district_id: data.patientsTstdts[index].d_test_name.district_id || null,
      mandal_id: data.patientsTstdts[index].d_test_name.mandal_id || null,
      subchildtwo: data.patientsTstdts[index].d_test_name.subchildtwo || null,
      expensives: data.patientsTstdts[index].d_test_name.temple_name || null,
      village_id: data.patientsTstdts[index].d_test_name.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.named,
      user_id: data.user_id,
      staticname: data.patientsTstdts[index].d_test_name.staticname || null,
      mandal_name: data.patientsTstdts[index].d_test_name.mandal_name || null,
      subchildtwo_id:
        data.patientsTstdts[index].d_test_name.subchildtwo_id || null,
      vehicleNo: data.vehicleNumber,
      // creditanddebitamount: (data.patientsTstdts[0].d_test_amount + data.creditaddrowdts[0].creditamount),
      // debit_amount: data.patientsTstdts[index].d_test_amount,
      // credit_amount: data.creditaddrowdts[index].creditamount,
      status: 0,
      d_in: 0,
      voucherdate: data.date,
      parent_subgroup_id:
        data.patientsTstdts[index].d_test_name.parent_subgroup_id,
      parent_subchild_id:
        data.patientsTstdts[index].d_test_name.parent_subchild_id,
      parent_grp_level: data.patientsTstdts[index].d_test_name.parent_grp_level,
      ledger_id: data.patientsTstdts[index].d_test_name.ledger_id,
    };
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert2:", insertRows);

  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO fuelentry_subt SET ?`;

  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          console.error(`? Insert error at index ${i}:`, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};

exports.setpreviousodometerMdl = function (data, callback) {
  var cntxtDtls = "in setpreviousodometerMdl";
  var m = [data.presentOdometer, data.busid];
  //console.log()m);

  var QRY_TO_EXEC = `UPDATE busses SET odometer = ? WHERE id=?`;

  //console.log()QRY_TO_EXEC);

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletefueldataMdl1 = function (data, callback) {
  const QRY_TO_EXEC = `
    update fuel_entry set d_in = 1,deletedby_id='${data.deletedby_id}',deletedby_name='${data.deletedby_name}',deletedby_date='${data.deletedby_date}' WHERE c_number = '${data.c_number}';
    update fuelentry_subt set d_in = 1 WHERE c_number = '${data.c_number}';
  `;

  //   console.log(QRY_TO_EXEC,4319)

  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      data,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, data);
  }
};

exports.updatemaintablesubtableMdl = function (data, callback) {
  const QRY_TO_EXEC = `
    update fuel_entry set d_in = 2 WHERE c_number = '${data.c_number}';
    update fuelentry_subt set d_in = 2 WHERE c_number = '${data.c_number}';
  `;
  //console.log()QRY_TO_EXEC);

  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      data,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, data);
  }
};

exports.updatemaintablesubtablerefeMdl = function (c_id, data, callback) {
  //console.log()c_id, 7953);
  const QRY_TO_EXEC = `
    UPDATE fuel_entry 
    SET c_id = '${data.id}', c_number = '${data.c_number}',updatedid ='${data.user_id}',updatedby ='${data.named}'
    WHERE c_number = '${data.c_number}';

    UPDATE fuelentry_subt 
    SET c_id = '${data.id}', c_number ='${data.c_number}',updatedid ='${data.user_id}',updatedby ='${data.named}'
    WHERE c_id = '${c_id}';
  `;
  //console.log()QRY_TO_EXEC, 7962);

  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      data,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, data);
  }
};

 exports.submitfuelentryupdatemaindata = function (
  c_number,
  c_id,
  data,
  callback
) {
  const cntxtDtls = "in submitfuelentryupdatemaindata";
  const dta = {
    date: data.date,
    vehicle_number: data.vehicleNumber,
    prev_odometer: data.previousOdometer, // ? Corrected
    present_odometer: data.presentOdometer,
    driver1: data.driver1,
    driver2: data.driver2,
    quantity_filled: data.qtyFilled,
    price_per_liter: data.pricePerLitre,
    total_bill: data.totalBill,
    avg_kmpl: data.averageKMPL,
    debit_account: data.patientsTstdts[0].d_test_amount,
    credit_account: data.creditaddrowdts[0].creditamount,
    d_in: 0,
    c_number: c_number,
    c_id: c_id,
    entry_by: data.entry_by,
    user_id: data.user_id,
    previous_odometer: data.previousOdometer,
    service_number: data.serviceNumber,
    kilometers: data.kilometers,
    target: data.fueltraget,
    updatedid: data.updatedid,
    updatedby: data.updatedby,
    updated_date: data.updated_date,
    driver1_id: data.driver1_id,
    driver2_id: data.driver2_id,
    issparetank:data.issparetank
  };
  const QRY_TO_EXEC = `INSERT INTO  fuel_entry SET ?;`;
  if (callback && typeof callback === "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      callback
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

///update fuel code ends

exports.getVehicleDetailsMdl = function (data, callback) {
  var cntxtDtls = "in getbetaMdl";
  //console.log()data, 5242);

  var QRY_TO_EXEC = `SELECT * from busses where d_in=0 and   bus_no='${data.bus_no}'`;
  //console.log()QRY_TO_EXEC);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.Selectdatagetfinaltranscationsreport1Mdl = function (data, callback) {
  var cntxtDtls = "in Selectdatagetfinaltranscationsreport1Mdl";
  //console.log()data, 7711);

  // Base conditions
  var expenseCondition = "d_in='0' AND admin_status='1'";
  var voucherCondition = "d_in='0' AND status='1'";
  var fuelCondition = "d_in='0' AND admin_status='1'";
  var laundryCondition = "d_in='0' AND admin_status='1'";
  if (data.fromdate && data.todate) {
    const dateFilter = `DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'`;
    expenseCondition += ` AND ${dateFilter}`;
    if (data.ledger_name) expenseCondition += ` AND temple_name = '${data.ledger_name}'`;
    voucherCondition += ` AND ${dateFilter}`;
    if (data.ledger_name) voucherCondition += ` AND expensives = '${data.ledger_name}'`;
    fuelCondition += ` AND ${dateFilter}`;
    if (data.ledger_name) fuelCondition += ` AND expensives = '${data.ledger_name}'`;
    laundryCondition += ` AND ${dateFilter}`;
    if (data.ledger_name) laundryCondition += ` AND expensives = '${data.ledger_name}'`;
  }

  const QRY_TO_EXEC = `
        SELECT * FROM expensive_details WHERE ${expenseCondition};
        SELECT * FROM mainvoucher_subt WHERE ${voucherCondition};
        SELECT * FROM fuelentry_subt WHERE ${fuelCondition};
        SELECT * FROM  laundrybill_subt WHERE ${laundryCondition};
    `;

  //console.log()QRY_TO_EXEC, 8081);

  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.getledgernameMdl = function (callback) {
  var cntxtDtls = "in getledgernameMdl";
  const QRY_TO_EXEC = `
    select *,mainmasterssubchildtwo.id as ledger_id from mainmasterssubchildtwo where d_in=0`;
  // console.log(QRY_TO_EXEC )
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getmainmasterssubgroupMdl = function (callback) {
  var cntxtDtls = "in getmainmasterssubgroupMdl";
  const QRY_TO_EXEC = `
    SELECT * FROM mainmasterssubgroup where d_in=0`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getmainmasterssubchildMdl = function (callback) {
  var cntxtDtls = "in getmainmasterssubchildMdl";
  const QRY_TO_EXEC = `
    SELECT * FROM mainmasterssubchild where d_in=0`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getlaundryreportdataMdl = function (callback) {
  var cntxtDtls = "in getlaundryreportdataMdl";
  var QRY_TO_EXEC = `SELECT sm.lastinsert_id as lastinserid,sm.expensives,sm.account_type,sm.ledger_id,sm.expensives,sm.amount,sm.child,sm.expensives,sm.id,sm.product_name,m.name,m.vouchertype,m.voucherdate,m.fromdate,m.c_number,m.id as mainid,m.todate,sm.d_in,m.d_in FROM mainlaundry_t as m JOIN laundry_subt as sm ON sm.c_number=m.c_number WHERE sm.d_in=0 and m.d_in=0`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};


// exports.getlaundryreportdataMdl = function (callback) {
//   const cntxtDtls = "in getlaundryreportdataMdl";

//   const QRY_TO_EXEC = `
//     SELECT 
//       sm.lastinsert_id as lastinserid,
//       sm.expensives,
//       sm.account_type,
//       sm.ledger_id,
//       sm.amount,
//       sm.child,
//       sm.id,
//       sm.product_name,
//       m.name,
//       m.vouchertype,
//       m.voucherdate,
//       m.fromdate,
//       m.c_number,
//       m.id as mainid,
//       m.todate,
//       sm.d_in,
//       m.d_in 
//     FROM mainlaundry_t as m 
//     JOIN laundry_subt as sm 
//       ON sm.c_number = m.c_number 
//     WHERE sm.d_in = 0 
//       AND m.d_in = 0`;

//   if (typeof callback === "function") {
//     dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, callback);
//   } else {
//     return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
//   }
// };


exports.getvendorlistlaundrydropdownMdl = function (callback) {
  var cntxtDtls = "in getvendorlistlaundrydropdownMdl";
  const QRY_TO_EXEC = `
    SELECT name, expensives, SUM(amount) AS total_amount FROM laundry_subt WHERE d_in = 0 GROUP BY name, expensives;`;
    // select * from laundry_subt where d_in=0 group by name
  //console.log()QRY_TO_EXEC, 7675);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.SelectedvendordropdownoptionMdl = function (data, callback) {
  var cntxtDtls = "in SelectedvendordropdownoptionMdl";

  const QRY_TO_EXEC = `SELECT * FROM  laundry_subt WHERE d_in='0' and name= '${data.ledger_name}';`;

  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.updateLaundryDataMdl = function (data, callback) {
  var cntxtDtls = "in updateLaundryDataMdl";

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, "0");

  const formattedDate = `${year}-${month}-${day}`;

  let parentdata = data.parent;

  const QRY_TO_EXEC = `
        UPDATE mainlaundry_t 
        SET 
            name='${parentdata.name}',
            creditanddebitamount='${parentdata.creditanddebitamount}',
            vouchertype='${parentdata.vouchertype}',
            voucherdate='${parentdata.voucherdate}',
            fromdate='${parentdata.fromdate}',
            todate='${parentdata.todate}',
            updated_by='${parentdata.user_id}',
            updated_at='${formattedDate}'
        WHERE c_number='${parentdata.c_number}'
    `;

  // console.log(QRY_TO_EXEC)

  const SELECT_QUERY = `
        SELECT * FROM mainlaundry_t 
        WHERE c_number='${parentdata.c_number}'
    `;

  if (callback && typeof callback === "function") {
    // Execute update query first
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, updateResult) {
        if (err) return callback(err);

        // Then select the updated record
        dbutil.execQuery(
          sqldb,
          SELECT_QUERY,
          cntxtDtls,
          function (err, selectResult) {
            callback(err, selectResult);
          }
        );
      }
    );
  } else {
    // Promise-style return if no callback
    return dbutil
      .execQuery(sqldb, QRY_TO_EXEC, cntxtDtls)
      .then(() =>
        dbutil.execQuery(sqldb, SELECT_QUERY, cntxtDtls)
      );
  }
};

exports.updateLaundryDataMdl1 = function (data, c_id, c_number, callback) {
  var cntxtDtls = "in updateLaundryDataMdl1";

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  let childata = data.child; // array of objects

  // 1. Update existing rows to mark d_in = 1
  const updateDInQuery = `UPDATE laundry_subt SET d_in = 1 WHERE c_number = '${c_number}'`;

  dbutil.execQuery(
    sqldb,
    updateDInQuery,
    cntxtDtls,
    function (err, results) {
      if (err) return callback(err);

      // 2. Insert new rows from childata
      let processedCount = 0;
      let errorOccurred = false;

      childata.forEach((child) => {
        const insertQuery = `
                INSERT INTO laundry_subt (
                    parent_subgroup_id, parent_subchild_id, parent_grp_level, ledger_id,
                    account_type, amount, creditanddebitamount, child, staticname,
                    district_id, mandal_name, mandal_id, subchildtwo, subchildtwo_id,
                    expensives, village_id, i_ts, d_in, lastinsert_id, status, c_number,
                    c_id, entry_by, user_id, description, name, valueDate, vehicleNo,
                    vouchertype, voucherdate, product_name
                ) VALUES (
                    '${child.parent_subgroup_id}', '${child.parent_subchild_id}', '${child.parent_grp_level}', '${child.ledger_id}',
                    '${child.account_type}', '${child.amount}', '${child.creditanddebitamount}', '${child.child}', '${child.staticname}',
                    '${child.district_id}', '${child.mandal_name}', '${child.mandal_id}', '${child.subchildtwo}', '${child.subchildtwo_id}',
                    '${child.expensives}', '${child.village_id}', '${formattedDate}', '${child.d_in}', '${c_id}', '${child.status}', '${child.c_number}',
                    '${c_id}', '${child.entry_by}', '${child.user_id}', '${child.description}', '${child.name}', '${child.valueDate}', '${child.vehicleNo}',
                    '${child.vouchertype}', '${child.voucherdate}', '${child.product_name}'
                )
            `;

        dbutil.execQuery(
          sqldb,
          insertQuery,
          cntxtDtls,
          function (err, results) {
            if (err) {
              errorOccurred = true;
              return callback(err);
            }

            processedCount++;
            if (processedCount === childata.length && !errorOccurred) {
              callback(null, {
                message: "Rows updated and inserted successfully",
              });
            }
          }
        );
      });

      // In case childata array is empty, call callback immediately
      if (childata.length === 0) {
        callback(null, { message: "Rows updated, no new data to insert" });
      }
    }
  );
};

///submit laundry bill post code starts
exports.laundrybillrefMdl = function (callback) {
  var cntxtDtls = "in laundrybillrefMdl";
  var QRY_TO_EXEC = `SELECT c_id FROM laundrybill_maint  WHERE d_in='0' order by id desc limit 1 ;`;
  //console.log()QRY_TO_EXEC, 22582);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitlaundrybillmaindata = function (
  c_number,
  c_id,
  dataArray,
  callback
) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return callback && callback(new Error("No data provided"));
  }

  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  // Prepare an array of insert objects
  const records = dataArray.map((data) => {
    const maindata = data.maindata || {};
    console.log(data.service_no, 'model');

    return {
      date: data.date_of_selection,
      account_type: maindata.account_type || "",
      child: maindata.child || "",
      staticname: maindata.staticname || "",
      district_id: maindata.district_id || "",
      mandal_name: maindata.mandal_name || "",
      mandal_id: maindata.mandal_id || "",
      subchildtwo: maindata.subchildtwo || "",
      subchildtwo_id: maindata.subchildtwo_id || "",
      expensives: maindata.expensives || "",
      village_id: maindata.village_id || "",
      voucherdate: maindata.voucherdate || "",
      vouchertype: maindata.vouchertype || "",
      name: maindata.name || "",
      c_number: c_number,
      c_id: c_id,
      entry_by: dataArray[0].created_name,
      user_id: dataArray[0].created_by,
      totalamount: data.total || "",
      its_1: curDate,
      remarks: data.remarks || "",
      vehicle_no: data.vehicle_no,
      service_no: data.service_no,
      // Added laundry item fields
      blanket_qty: data.blanket_qty || 0,
      blanket_rate: data.blanket_rate || 0,
      blanket_amount: data.blanket_amount || 0,

      white_qty: data.white_qty || 0,
      white_rate: data.white_rate || 0,
      white_amount: data.white_amount || 0,

      pillow_qty: data.pillow_qty || 0,
      pillow_rate: data.pillow_rate || 0,
      pillow_amount: data.pillow_amount || 0,

      cover_qty: data.cover_qty || 0,
      cover_rate: data.cover_rate || 0,
      cover_amount: data.cover_amount || 0,

      curtain_qty: data.curtain_qty || 0,
      curtain_rate: data.curtain_rate || 0,
      curtain_amount: data.curtain_amount || 0,
    };
  });

  const QRY_TO_EXEC = `INSERT INTO laundrybill_maint SET ?;`;

  // Use async iteration to insert all
  let inserted = 0;
  records.forEach((record, index) => {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      record,
      "in submitlaundrybillmaindata",
      (err, result) => {
        if (err) return callback && callback(err);
        inserted++;
        if (inserted === records.length) {
          return (
            callback &&
            callback(null, {
              message: "All records inserted successfully",
              count: inserted,
            })
          );
        }
      }
    );
  });
};

exports.submitlaundrybillsubtable = function (
  c_number,
  c_id,
  dataArray,
  lastid,
  callback
) {
  const cntxtDtls = "in submitlaundrybillsubtable";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return callback(new Error("Invalid dataArray"));
  }

  const data = dataArray[0]; // Credit is one-time
  const creditRow = data.creditaddrowdts[0] || {};
  const creditLedger = creditRow.creditledger || {};

  const row = {
    lastinsert_id: lastid,
    account_type: "Credit Account",
    amount: creditRow.creditamount || 0,
    child: creditLedger.child || null,
    district_id: creditLedger.district_id || null,
    mandal_id: creditLedger.mandal_id || null,
    subchildtwo: creditLedger.subchildtwo || null,
    expensives: creditLedger.temple_name || null,
    village_id: creditLedger.village_id || null,
    its_1: curDate,
    c_number: c_number,
    c_id: c_id,
    staticname: creditLedger.staticname || null,
    mandal_name: creditLedger.mandal_name || null,
    subchildtwo_id: creditLedger.subchildtwo_id || null,
    entry_by: dataArray[0].created_name,
    user_id: dataArray[0].created_by,
    vehicleNo: null,
    debit_amount: 0,
    credit_amount: creditRow.creditamount || 0,
    status: 0,
    d_in: 0,
    parent_subgroup_id: creditLedger.parent_subgroup_id,
    parent_subchild_id: creditLedger.parent_subchild_id,
    parent_grp_level: creditLedger.parent_grp_level,
    ledger_id: creditLedger.ledger_id,

    // Laundry columns set to zero
    blanket_qty: 0,
    blanket_rate: 0,
    blanket_amount: 0,
    white_qty: 0,
    white_rate: 0,
    white_amount: 0,
    pillow_qty: 0,
    pillow_rate: 0,
    pillow_amount: 0,
    cover_qty: 0,
    cover_rate: 0,
    cover_amount: 0,
    curtain_qty: 0,
    curtain_rate: 0,
    curtain_amount: 0,
    total: 0,
    i_ts: dataArray[0].date_of_selection,
    remarks: dataArray[0].remarks,
  };

  const QRY_TO_EXEC = `INSERT INTO laundrybill_subt SET ?`;

  dbutil.sqlinjection(
    sqldb,
    QRY_TO_EXEC,
    row,
    cntxtDtls,
    (err, result) => {
      if (err) return callback(err);
      return callback(null, { message: "Credit Account inserted", count: 1 });
    }
  );
};
//tow
exports.submitlaundrysubtableseconddata = function (
  c_number,
  c_id,
  dataArray,
  lastid,
  callback
) {
  const cntxtDtls = "in submitlaundrysubtableseconddata";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return callback(new Error("Invalid or empty dataArray"));
  }

  const QRY_TO_EXEC = `INSERT INTO laundrybill_subt SET ?`;
  let parentIndex = 0;
  let childIndex = 0;

  function insertNext() {
    if (parentIndex >= dataArray.length) {
      // ? Done with all parents
      return callback(null, {
        message: `Insertion complete`,
        count: parentIndex,
      });
    }

    const parentItem = dataArray[parentIndex];

    // ? Get all test rows inside patientsTstdts
    const patientsTests = Array.isArray(parentItem.patientsTstdts)
      ? parentItem.patientsTstdts
      : [];

    if (childIndex >= patientsTests.length) {
      // ? Move to next parent item
      parentIndex++;
      childIndex = 0;
      return insertNext();
    }

    const testItem = patientsTests[childIndex];

    // Skip if invalid
    if (!testItem || typeof testItem !== "object") {
      childIndex++;
      return insertNext();
    }

    const patientData = testItem.d_test_name || {};

    const row = {
      lastinsert_id: lastid,
      account_type: testItem.debitaccount || "Debit Account",
      amount: testItem.d_test_amount || 0,
      child: patientData.child || null,
      district_id: patientData.district_id || null,
      mandal_id: patientData.mandal_id || null,
      subchildtwo: patientData.subchildtwo || null,
      expensives: patientData.temple_name || null,
      village_id: patientData.village_id || null,
      staticname: patientData.staticname || null,
      mandal_name: patientData.mandal_name || null,
      subchildtwo_id: patientData.subchildtwo_id || null,
      parent_subgroup_id: patientData.parent_subgroup_id || null,
      parent_subchild_id: patientData.parent_subchild_id || null,
      parent_grp_level: patientData.parent_grp_level || null,
      ledger_id: patientData.ledger_id || null,
      vehicleNo: parentItem.vehicle_no || null,
      entry_by: dataArray[0].created_name,
      user_id: dataArray[0].created_by,
      its_1: curDate,
      c_number: c_number,
      c_id: c_id,
      debit_amount: testItem.d_test_amount || 0,
      credit_amount: 0,
      status: 0,
      d_in: 0,
      blanket_qty: parentItem.blanket_qty || 0,
      blanket_rate: parentItem.blanket_rate || 0,
      blanket_amount: parentItem.blanket_amount || 0,
      white_qty: parentItem.white_qty || 0,
      white_rate: parentItem.white_rate || 0,
      white_amount: parentItem.white_amount || 0,
      pillow_qty: parentItem.pillow_qty || 0,
      pillow_rate: parentItem.pillow_rate || 0,
      pillow_amount: parentItem.pillow_amount || 0,
      cover_qty: parentItem.cover_qty || 0,
      cover_rate: parentItem.cover_rate || 0,
      cover_amount: parentItem.cover_amount || 0,
      curtain_qty: parentItem.curtain_qty || 0,
      curtain_rate: parentItem.curtain_rate || 0,
      curtain_amount: parentItem.curtain_amount || 0,
      total: testItem.d_test_amount || 0,
      i_ts: parentItem.date_of_selection || curDate,
      remarks: parentItem.remarks || null,
    };

    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      row,
      cntxtDtls,
      (err, result) => {
        if (err) {
          console.error("Insert error:", err);
          return callback(err);
        }
        console.log(
          `? Inserted test ${childIndex + 1} of parent ${parentIndex + 1}`
        );
        childIndex++;
        insertNext();
      }
    );
  }

  insertNext();
};

exports.setLaundrybillMainInactive = function (c_number, callback) {
  const QRY = `UPDATE laundrybill_maint SET d_in = 2 WHERE c_number = ?`;
  dbutil.sqlinjection(
    sqldb,
    QRY,
    [c_number],
    "setLaundrybillMainInactive",
    callback
  );
};

// Mark sub table records as inactive for given c_number
exports.setLaundrySubbillMainInactive = function (c_number, callback) {
  const QRY = `UPDATE laundrybill_subt SET d_in = 2 WHERE c_number = ?`;
  dbutil.sqlinjection(
    sqldb,
    QRY,
    [c_number],
    "setLaundrybillSubInactive",
    callback
  );
};

exports.updatelaundrybillmaindata = function (
  c_number,
  c_id,
  dataArray,
  callback
) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return callback && callback(new Error("No data provided"));
  }
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const records = dataArray.map((data) => {
    const maindata = data.maindata || {};
    return {
      account_type: maindata.account_type || "",
      child: maindata.child || "",
      staticname: maindata.staticname || "",
      district_id: maindata.district_id || "",
      mandal_name: maindata.mandal_name || "",
      mandal_id: maindata.mandal_id || "",
      subchildtwo: maindata.subchildtwo || "",
      subchildtwo_id: maindata.subchildtwo_id || "",
      expensives: maindata.expensives || "",
      village_id: maindata.village_id || "",
      voucherdate: maindata.voucherdate || "",
      vouchertype: maindata.vouchertype || "",
      name: maindata.name || "",
      totalamount: data.total || "",
      remarks: data.remarks || "",
      vehicle_no: data.vehicle_no,
      service_no: data.service_no,
      blanket_qty: data.blanket_qty || 0,
      blanket_rate: data.blanket_rate || 0,
      blanket_amount: data.blanket_amount || 0,
      white_qty: data.white_qty || 0,
      white_rate: data.white_rate || 0,
      white_amount: data.white_amount || 0,
      pillow_qty: data.pillow_qty || 0,
      pillow_rate: data.pillow_rate || 0,
      pillow_amount: data.pillow_amount || 0,
      cover_qty: data.cover_qty || 0,
      cover_rate: data.cover_rate || 0,
      cover_amount: data.cover_amount || 0,
      curtain_qty: data.curtain_qty || 0,
      curtain_rate: data.curtain_rate || 0,
      curtain_amount: data.curtain_amount || 0,
      // Audit fields
      updated_by: dataArray[0].updated_by_id,
      updated_at: dataArray[0].updated_by_date, // default to now
      updated_by_name: dataArray[0].updated_by_name,
      date: data.date,
      c_number: c_number,
      c_id: c_id,
      entry_by: dataArray[0].entry_by,
      user_id: dataArray[0].user_id,
      its_1: dataArray[0].its_1,
    };
  });

  const QRY_TO_EXEC = `INSERT INTO laundrybill_maint SET ?;`;
  let inserted = 0;
  let firstInsertId = null;
  records.forEach((record, index) => {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      record,
      "in updatelaundrybillmaindata",
      (err, result) => {
        if (err) return callback && callback(err);
        // Store first insertId for possible use in sub-table
        if (inserted === 0 && result && result.insertId) {
          firstInsertId = result.insertId;
        }
        inserted++;
        if (inserted === records.length) {
          return (
            callback &&
            callback(null, {
              message: "All records inserted successfully",
              count: inserted,
              insertId: firstInsertId,
            })
          );
        }
      }
    );
  });
};
//subt funnction
//credit account
exports.updatelaundrybillsubtable = function (
  c_number,
  c_id,
  dataArray,
  lastid,
  callback
) {
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return callback(new Error("Invalid dataArray"));
  }

  const data = dataArray[0];
  const creditRow = data.creditaddrowdts[0] || {};
  const creditLedger = creditRow.creditledger || {};

  const row = {
    lastinsert_id: lastid,
    account_type: "Credit Account",
    amount: creditRow.creditamount || 0,
    child: creditLedger.child || null,
    district_id: creditLedger.district_id || null,
    mandal_id: creditLedger.mandal_id || null,
    subchildtwo: creditLedger.subchildtwo || null,
    expensives: creditLedger.temple_name || null,
    village_id: creditLedger.village_id || null,
    staticname: creditLedger.staticname || null,
    mandal_name: creditLedger.mandal_name || null,
    subchildtwo_id: creditLedger.subchildtwo_id || null,
    vehicleNo: null,
    debit_amount: 0,
    credit_amount: creditRow.creditamount || 0,
    status: 0,
    d_in: 0,
    parent_subgroup_id: creditLedger.parent_subgroup_id,
    parent_subchild_id: creditLedger.parent_subchild_id,
    parent_grp_level: creditLedger.parent_grp_level,
    ledger_id: creditLedger.ledger_id,
    blanket_qty: 0,
    blanket_rate: 0,
    blanket_amount: 0,
    white_qty: 0,
    white_rate: 0,
    white_amount: 0,
    pillow_qty: 0,
    pillow_rate: 0,
    pillow_amount: 0,
    cover_qty: 0,
    cover_rate: 0,
    cover_amount: 0,
    curtain_qty: 0,
    curtain_rate: 0,
    curtain_amount: 0,
    total: 0,
    remarks: dataArray[0].remarks,
    // Audit fields
    // updated_by_roleid: data.updated_by_roleid || null,
    // updated_at: curDate,
    // updated_by_name: data.updated_by_name || null,
    i_ts: dataArray[0].date_of_selection,
    c_number: c_number,
    c_id: c_id,
    entry_by: dataArray[0].entry_by,
    user_id: dataArray[0].user_id,
    its_1: dataArray[0].its_1,
  };

  const insertQry = `INSERT INTO laundrybill_subt SET ?`;
  dbutil.sqlinjection(
    sqldb,
    insertQry,
    row,
    "in updatelaundrybillsubtable",
    (err, result) => {
      if (err) return callback(err);
      return callback(null, {
        message: "Credit Account inserted",
        count: 1,
        insertId: result && result.insertId,
      });
    }
  );
};

//debit account
exports.updatelaundrysubtableseconddata = function (
  c_number,
  c_id,
  dataArray,
  lastid,
  callback
) {
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return callback(new Error("Invalid or empty dataArray"));
  }

  const insertQry = `INSERT INTO laundrybill_subt SET ?`;
  let parentIndex = 0;
  let childIndex = 0;

  function insertNext() {
    if (parentIndex >= dataArray.length) {
      // Done with all parents
      return callback(null, {
        message: `Insertion complete`,
        count: parentIndex,
      });
    }

    const parentItem = dataArray[parentIndex];
    const patientsTests = Array.isArray(parentItem.patientsTstdts)
      ? parentItem.patientsTstdts
      : [];

    if (childIndex >= patientsTests.length) {
      parentIndex++;
      childIndex = 0;
      return insertNext();
    }

    const testItem = patientsTests[childIndex];
    if (!testItem || typeof testItem !== "object") {
      childIndex++;
      return insertNext();
    }

    const patientData = testItem.d_test_name || {};

    const row = {
      lastinsert_id: lastid,
      account_type: testItem.debitaccount || "Debit Account",
      amount: testItem.d_test_amount || 0,
      child: patientData.child || null,
      district_id: patientData.district_id || null,
      mandal_id: patientData.mandal_id || null,
      subchildtwo: patientData.subchildtwo || null,
      expensives: patientData.temple_name || null,
      village_id: patientData.village_id || null,
      staticname: patientData.staticname || null,
      mandal_name: patientData.mandal_name || null,
      subchildtwo_id: patientData.subchildtwo_id || null,
      parent_subgroup_id: patientData.parent_subgroup_id || null,
      parent_subchild_id: patientData.parent_subchild_id || null,
      parent_grp_level: patientData.parent_grp_level || null,
      ledger_id: patientData.ledger_id || null,
      vehicleNo: parentItem.vehicle_no || null,
      debit_amount: testItem.d_test_amount || 0,
      credit_amount: 0,
      status: 0,
      d_in: 0,
      blanket_qty: parentItem.blanket_qty || 0,
      blanket_rate: parentItem.blanket_rate || 0,
      blanket_amount: parentItem.blanket_amount || 0,
      white_qty: parentItem.white_qty || 0,
      white_rate: parentItem.white_rate || 0,
      white_amount: parentItem.white_amount || 0,
      pillow_qty: parentItem.pillow_qty || 0,
      pillow_rate: parentItem.pillow_rate || 0,
      pillow_amount: parentItem.pillow_amount || 0,
      cover_qty: parentItem.cover_qty || 0,
      cover_rate: parentItem.cover_rate || 0,
      cover_amount: parentItem.cover_amount || 0,
      curtain_qty: parentItem.curtain_qty || 0,
      curtain_rate: parentItem.curtain_rate || 0,
      curtain_amount: parentItem.curtain_amount || 0,
      total: testItem.d_test_amount || 0,
      remarks: parentItem.remarks || null,
      // Audit fields
      // updated_at: curDate,
      // updated_by_roleid: parentItem.updated_by_roleid || null,
      // updated_by_name: parentItem.updated_by_name || null,

      entry_by: dataArray[0].entry_by,
      user_id: dataArray[0].user_id,
      its_1: dataArray[0].its_1,
      c_number: c_number,
      c_id: c_id,
      i_ts: parentItem.date_of_selection || curDate,
    };

    dbutil.sqlinjection(
      sqldb,
      insertQry,
      row,
      "in updatelaundrysubtableseconddata",
      (err, result) => {
        if (err) {
          console.error("Insert error:", err);
          return callback(err);
        }
        childIndex++;
        insertNext();
      }
    );
  }

  insertNext();
};

exports.getfuelledgernameMdl = function (callback) {
  var cntxtDtls = "in getfuelledgernameMdl";
  const QRY_TO_EXEC = `
    select distinct(expensives) from  fuelentry_subt where d_in=0`;
  //console.log()QRY_TO_EXEC, 7675);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// exports.getsearchdataMdl = function (data, callback) {
//   var cntxtDtls = "in getsearchdataMdl";

//   // Base conditions
//   var expenseCondition = "d_in='0' AND admin_status='1'";
//   var voucherCondition = "d_in='0' AND status='1'";
//   var fuelCondition = "d_in='0' AND admin_status='1'";
//   var laundryCondition = "d_in='0' AND admin_status='1'";

//   if (data.fromdate && data.todate) {
//     const dateFilter = `DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'`;
//     const beforeDateFilter = `DATE(i_ts) < '${data.fromdate}'`;

//     expenseCondition += ` AND ${dateFilter}`;
//     voucherCondition += ` AND ${dateFilter}`;
//     fuelCondition += ` AND ${dateFilter}`;
//     laundryCondition += ` AND ${dateFilter}`;

//     if (data.ledger_id) {
//       expenseCondition += ` AND ledger_id = "${data.ledger_id}"`;
//       voucherCondition += ` AND ledger_id = "${data.ledger_id}"`;
//       fuelCondition += ` AND ledger_id = "${data.ledger_id}"`;
//       laundryCondition += ` AND ledger_id = "${data.ledger_id}"`;
//     }

//     var openingExpenseCondition = `d_in='0' AND admin_status='1' AND ${beforeDateFilter}`;
//     var openingVoucherCondition = `d_in='0' AND status='1' AND ${beforeDateFilter}`;
//     var openingFuelCondition = `d_in='0' AND admin_status='1' AND ${beforeDateFilter}`;
//     var openingLaundryCondition = `d_in='0' AND admin_status='1' AND ${beforeDateFilter}`;

//     if (data.ledger_id) {
//       openingExpenseCondition += ` AND ledger_id = "${data.ledger_id}"`;
//       openingVoucherCondition += ` AND ledger_id = "${data.ledger_id}"`;
//       openingFuelCondition += ` AND ledger_id = "${data.ledger_id}"`;
//       openingLaundryCondition += ` AND ledger_id = "${data.ledger_id}"`;
//     }
//   }

//   const QRY_TO_EXEC = `
//         -- Opening balance calculation
//         ${data.fromdate && data.todate
//       ? `
//         SELECT 
//             'opening_balance' AS record_type,
//             SUM(CASE 
//                 WHEN amount_type = 'Credit Account' THEN amount
//                 WHEN amount_type = 'Debit Account' THEN -amount
//                 ELSE 0
//             END) AS balance
//         FROM expensive_details
//         WHERE ${openingExpenseCondition}

//         UNION ALL

//         SELECT 
//             'opening_balance' AS record_type,
//             SUM(CASE 
//                 WHEN account_type = 'Credit Account' THEN amount
//                 WHEN account_type = 'Debit Account' THEN -amount
//                 ELSE 0
//             END) AS balance
//         FROM mainvoucher_subt
//         WHERE ${openingVoucherCondition}

//         UNION ALL

//         SELECT 
//             'opening_balance' AS record_type,
//             SUM(CASE 
//                 WHEN account_type = 'Credit Account' THEN amount
//                 WHEN account_type = 'Debit Account' THEN -amount
//                 ELSE 0
//             END) AS balance
//         FROM fuelentry_subt
//         WHERE ${openingFuelCondition}

//         UNION ALL

//         SELECT 
//             'opening_balance' AS record_type,
//             SUM(CASE 
//                 WHEN account_type = 'Credit Account' THEN amount
//                 WHEN account_type = 'Debit Account' THEN -amount
//                 ELSE 0
//             END) AS balance
//         FROM laundrybill_subt
//         WHERE ${openingLaundryCondition};
//         `
//       : `
//         SELECT 'opening_balance' AS record_type, 0 AS balance 
//         UNION ALL SELECT 'opening_balance' AS record_type, 0 AS balance
//         UNION ALL SELECT 'opening_balance' AS record_type, 0 AS balance  
//         UNION ALL SELECT 'opening_balance' AS record_type, 0 AS balance;
//         `
//     }

//         -- Current transactions

//         -- Expensive details
//         SELECT ed.*, 'expensive_details' as source_table,
//                GROUP_CONCAT(DISTINCT mm2.temple_name) AS opp_ledgers
//         FROM expensive_details ed
//         LEFT JOIN expensive_details ed2 
//             ON ed.c_number = ed2.c_number 
//             AND ed2.d_in='0' AND ed2.admin_status='1'
//         LEFT JOIN mainmasterssubchildtwo mm2 
//             ON ed2.ledger_id = mm2.id
//         WHERE ed.d_in='0' AND ed.admin_status='1'
//         ${data.fromdate && data.todate
//       ? `AND DATE(ed.trip_date) BETWEEN '${data.fromdate}' AND '${data.todate}'`
//       : ""
//     }
//         ${data.ledger_id ? `AND ed.ledger_id = "${data.ledger_id}"` : ""}
//         GROUP BY ed.id, ed.c_number;

//         -- Main voucher
//         SELECT mv.*, 'mainvoucher_subt' as source_table,
//                GROUP_CONCAT(DISTINCT mm2.temple_name) AS opp_ledgers
//         FROM mainvoucher_subt mv
//         LEFT JOIN mainvoucher_subt mv2 
//             ON mv.c_number = mv2.c_number 
//             AND mv2.d_in='0' AND mv2.status='1'
//         LEFT JOIN mainmasterssubchildtwo mm2 
//             ON mv2.ledger_id = mm2.id
//         WHERE mv.d_in='0' AND mv.status='1'
//         ${data.fromdate && data.todate
//       ? `AND DATE(mv.voucherdate) BETWEEN '${data.fromdate}' AND '${data.todate}'`
//       : ""
//     }
//         ${data.ledger_id ? `AND mv.ledger_id = "${data.ledger_id}"` : ""}
//         GROUP BY mv.id, mv.c_number;

//         -- Fuel entry
//         SELECT fe.*, 'fuelentry_subt' as source_table,
//                GROUP_CONCAT(DISTINCT mm2.temple_name) AS opp_ledgers
//         FROM fuelentry_subt fe
//         LEFT JOIN fuelentry_subt fe2 
//             ON fe.c_number = fe2.c_number 
//             AND fe2.d_in='0' AND fe2.admin_status='1'
//         LEFT JOIN mainmasterssubchildtwo mm2 
//             ON fe2.ledger_id = mm2.id
//         WHERE fe.d_in='0' AND fe.admin_status='1'
//         ${data.fromdate && data.todate
//       ? `AND DATE(fe.voucherdate) BETWEEN '${data.fromdate}' AND '${data.todate}'`
//       : ""
//     }
//         ${data.ledger_id ? `AND fe.ledger_id = "${data.ledger_id}"` : ""}
//         GROUP BY fe.id, fe.c_number;

//         -- Laundry bill
//         SELECT lb.*, 'laundrybill_subt' as source_table,
//                GROUP_CONCAT(DISTINCT mm2.temple_name) AS opp_ledgers
//         FROM laundrybill_subt lb
//         LEFT JOIN laundrybill_subt lb2 
//             ON lb.c_number = lb2.c_number 
//             AND lb2.d_in='0' AND lb2.admin_status='1'
//         LEFT JOIN mainmasterssubchildtwo mm2 
//             ON lb2.ledger_id = mm2.id
//         WHERE lb.d_in='0' AND lb.admin_status='1'
//         ${data.fromdate && data.todate
//       ? `AND DATE(lb.i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'`
//       : ""
//     }
//         ${data.ledger_id ? `AND lb.ledger_id = "${data.ledger_id}"` : ""}
//         GROUP BY lb.id, lb.c_number;
//     `;

//   // console.log(QRY_TO_EXEC);

//   const handleResults = (err, results) => {
//     if (err) return callback(err);

//     let openingBalance = 0;
//     for (let i = 0; i < 4; i++) {
//       if (results[0][i] && results[0][i].balance !== null) {
//         openingBalance += parseFloat(results[0][i].balance);
//       }
//     }

//     const response = {
//       opening_balance: {
//         amount: Math.abs(openingBalance),
//         type: openingBalance >= 0 ? "Credit" : "Debit",
//       },
//       transactions: {
//         expensive_details: results[1],
//         mainvoucher_subt: results[2],
//         fuelentry_subt: results[3],
//         laundrybill_subt: results[4],
//       },
//     };

//     callback(null, response);
//   };

//   if (callback && typeof callback === "function") {
//     dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, handleResults);
//   } else {
//     return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
//   }
// };

exports.getsearchdataMdl = function (data, callback) {
  var cntxtDtls = "in getsearchdataMdl";

  // -------------------------------
  // DATE RANGE CONDITIONS
  // -------------------------------
  let openingExp = "";
  let openingVoucher = "";
  let openingFuel = "";
  let openingLaundry = "";

  let transExp = "";
  let transVoucher = "";
  let transFuel = "";
  let transLaundry = "";

  if (data.fromdate && data.todate) {
    openingExp = ` AND DATE(ed.trip_date) < '${data.fromdate}' `;
    openingVoucher = ` AND DATE(mv.voucherdate) < '${data.fromdate}' `;
    openingFuel = ` AND DATE(fe.voucherdate) < '${data.fromdate}' `;
    openingLaundry = ` AND DATE(lb.i_ts) < '${data.fromdate}' `;

    transExp = ` AND DATE(ed.trip_date) BETWEEN '${data.fromdate}' AND '${data.todate}' `;
    transVoucher = ` AND DATE(mv.voucherdate) BETWEEN '${data.fromdate}' AND '${data.todate}' `;
    transFuel = ` AND DATE(fe.voucherdate) BETWEEN '${data.fromdate}' AND '${data.todate}' `;
    transLaundry = ` AND DATE(lb.i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}' `;
  }

  // -------------------------------
  // LEDGER CONDITIONS
  // -------------------------------
  let ledgerExp = "";
  let ledgerVoucher = "";
  let ledgerFuel = "";
  let ledgerLaundry = "";

  if (data.ledger_id) {
    ledgerExp = ` AND ed.ledger_id = "${data.ledger_id}" `;
    ledgerVoucher = ` AND mv.ledger_id = "${data.ledger_id}" `;
    ledgerFuel = ` AND fe.ledger_id = "${data.ledger_id}" `;
    ledgerLaundry = ` AND lb.ledger_id = "${data.ledger_id}" `;
  }

  // -------------------------------
  // OPENING BALANCE QUERY
  // -------------------------------
  const openingBalanceQuery = `
    SELECT
      (
        COALESCE((SELECT SUM(ed.amount) FROM expensive_details ed
          WHERE ed.d_in='0' AND ed.admin_status='1'
          AND ed.amount_type='Credit Account'
          ${openingExp} ${ledgerExp}), 0)
        +
        COALESCE((SELECT SUM(mv.amount) FROM mainvoucher_subt mv
          WHERE mv.d_in='0' AND mv.status='1'
          AND mv.account_type='Credit Account'
          ${openingVoucher} ${ledgerVoucher}), 0)
        +
        COALESCE((SELECT SUM(fe.amount) FROM fuelentry_subt fe
          WHERE fe.d_in='0' AND fe.admin_status='1'
          AND fe.account_type='Credit Account'
          ${openingFuel} ${ledgerFuel}), 0)
        +
        COALESCE((SELECT SUM(lb.amount) FROM laundrybill_subt lb
          WHERE lb.d_in='0' AND lb.admin_status='1'
          AND lb.account_type='Credit Account'
          ${openingLaundry} ${ledgerLaundry}), 0)
      ) AS total_credit,

      (
        COALESCE((SELECT SUM(ed.amount) FROM expensive_details ed
          WHERE ed.d_in='0' AND ed.admin_status='1'
          AND ed.amount_type='Debit Account'
          ${openingExp} ${ledgerExp}), 0)
        +
        COALESCE((SELECT SUM(mv.amount) FROM mainvoucher_subt mv
          WHERE mv.d_in='0' AND mv.status='1'
          AND mv.account_type='Debit Account'
          ${openingVoucher} ${ledgerVoucher}), 0)
        +
        COALESCE((SELECT SUM(fe.amount) FROM fuelentry_subt fe
          WHERE fe.d_in='0' AND fe.admin_status='1'
          AND fe.account_type='Debit Account'
          ${openingFuel} ${ledgerFuel}), 0)
        +
        COALESCE((SELECT SUM(lb.amount) FROM laundrybill_subt lb
          WHERE lb.d_in='0' AND lb.admin_status='1'
          AND lb.account_type='Debit Account'
          ${openingLaundry} ${ledgerLaundry}), 0)
      ) AS total_debit;
  `;

  // -------------------------------
  // TRANSACTIONS QUERY
  // -------------------------------
  const transactionQuery = `
    -- EXPENSIVE DETAILS
    SELECT ed.*, 'expensive_details' AS source_table,
      GROUP_CONCAT(DISTINCT mm.temple_name) AS opp_ledgers
    FROM expensive_details ed
    LEFT JOIN expensive_details ed2
      ON ed.c_number = ed2.c_number AND ed2.d_in='0' AND ed2.ledger_id != ed.ledger_id
    LEFT JOIN mainmasterssubchildtwo mm ON ed2.ledger_id = mm.id
    WHERE ed.d_in='0' AND ed.admin_status='1'
    ${transExp} ${ledgerExp}
    GROUP BY ed.id;

    -- MAIN VOUCHER
    SELECT mv.*, 'mainvoucher_subt' AS source_table,
      GROUP_CONCAT(DISTINCT mm.temple_name) AS opp_ledgers
    FROM mainvoucher_subt mv
    LEFT JOIN mainvoucher_subt mv2
      ON mv.c_number = mv2.c_number AND mv2.d_in='0' AND mv2.ledger_id != mv.ledger_id
    LEFT JOIN mainmasterssubchildtwo mm ON mv2.ledger_id = mm.id
    WHERE mv.d_in='0' AND mv.status='1'
    ${transVoucher} ${ledgerVoucher}
    GROUP BY mv.id;

    -- FUEL ENTRY
    SELECT fe.*, 'fuelentry_subt' AS source_table,
      GROUP_CONCAT(DISTINCT mm.temple_name) AS opp_ledgers
    FROM fuelentry_subt fe
    LEFT JOIN fuelentry_subt fe2
      ON fe.c_number = fe2.c_number AND fe2.d_in='0' AND fe2.ledger_id != fe.ledger_id
    LEFT JOIN mainmasterssubchildtwo mm ON fe2.ledger_id = mm.id
    WHERE fe.d_in='0' AND fe.admin_status='1'
    ${transFuel} ${ledgerFuel}
    GROUP BY fe.id;

    -- LAUNDRY BILL
    SELECT lb.*, 'laundrybill_subt' AS source_table,
      GROUP_CONCAT(DISTINCT mm.temple_name) AS opp_ledgers
    FROM laundrybill_subt lb
    LEFT JOIN laundrybill_subt lb2
      ON lb.c_number = lb2.c_number AND lb2.d_in='0' AND lb2.ledger_id != lb.ledger_id
    LEFT JOIN mainmasterssubchildtwo mm ON lb2.ledger_id = mm.id
    WHERE lb.d_in='0' AND lb.admin_status='1'
    ${transLaundry} ${ledgerLaundry}
    GROUP BY lb.id;
  `;

  // -------------------------------
  // COMBINE QUERIES
  // -------------------------------
  const QRY_TO_EXEC = openingBalanceQuery + transactionQuery;

  console.log(QRY_TO_EXEC)

  // -------------------------------
  // HANDLE RESULTS
  // -------------------------------
  const handleResults = (err, results) => {
    if (err) return callback(err);

    const opening = results[0][0];

    const totalCredit = parseFloat(opening.total_credit || 0);
    const totalDebit = parseFloat(opening.total_debit || 0);

    let type = "Balanced";
    let amount = 0;

    if (totalCredit > totalDebit) {
      type = "Credit";
      amount = totalCredit - totalDebit;
    } else if (totalDebit > totalCredit) {
      type = "Debit";
      amount = totalDebit - totalCredit;
    }

    const response = {
      opening_balance: { type, amount },
      transactions: {
        expensive_details: results[1],
        mainvoucher_subt: results[2],
        fuelentry_subt: results[3],
        laundrybill_subt: results[4]
      }
    };

    callback(null, response);
  };

  dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, handleResults);
};


exports.checktargetMdl = function (data, callback) {
  var cntxtDtls = "in checktargetMdl";
  const QRY_TO_EXEC = `
    select * from fuel_target_t  where d_in=0 AND service_number='${data.serviceNumber}'`;
  //console.log()QRY_TO_EXEC, 7675);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submittargetMdl = function (data, callback) {
  //console.log()data, 7282);

  const cntxtDtls = "in submitvoucherentrymaindata";
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const dta = {
    service_number: data.serviceNumber,
    target: data.targetFuel,
    i_ts: curDate,
    d_in: 0,
  };
  const QRY_TO_EXEC = `INSERT INTO  fuel_target_t SET ?;`;
  if (callback && typeof callback === "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      callback
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.maindarshanticketMdl = function (callback) {
  var cntxtDtls = "in maindarshanticketMdl";
  var QRY_TO_EXEC = `SELECT c_id FROM mainvoucher_t  WHERE d_in='0' order by c_id desc limit 1 ;`;
  // console.log(QRY_TO_EXEC, 22582);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.todayVoucherCountMdl = function (callback) {
  var cntxtDtls = "in todayVoucherCountMdl";
  var QRY_TO_EXEC = `SELECT COUNT(*) as cnt FROM mainvoucher_t WHERE c_number LIKE CONCAT('V', DATE_FORMAT(CURDATE(), '%y%m%d'), '%');`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      callback(err, results);
      return;
    });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.voucherCountByDateMdl = function (dateStr, callback) {
  var cntxtDtls = "in voucherCountByDateMdl";
  var formatted = moment(dateStr, 'YYYY-MM-DD').format('YYMMDD');
  var QRY_TO_EXEC = `SELECT COUNT(*) as cnt FROM mainvoucher_t WHERE c_number LIKE 'V${formatted}%';`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      callback(err, results);
      return;
    });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deletevouchertypebill = function (data, callback) {
  var cntxtDtls = "in deletevouchertypebill";
  var QRY_TO_EXEC = `
  
  update mainvoucher_t set d_in=2,updatedby_id='${data.updatedby_id}',updatedby_name='${data.updatedby_name}',updatedby_date='${data.updatedby_date}' where c_number='${data.c_number}';
  update mainvoucher_subt set d_in=2 where c_number = '${data.c_number}'
  
  `;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};


exports.deletevouchertypebill2 = function (data, callback) {
  var cntxtDtls = "in deletevouchertypebill";
  var QRY_TO_EXEC = `
  
  update mainvoucher_t set d_in=1,deleted_by_id='${data.updatedby_id}',deleted_by_name='${data.updatedby_name}',deleted_by_date='${data.updatedby_date}' where c_number='${data.c_number}';
  update mainvoucher_subt set d_in=1 where c_number = '${data.c_number}'
  
  `;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.submitvoucherentrymaindata = function (c_number, c_id, data, callback) {
  const cntxtDtls = "in submitvoucherentrymaindata";
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const dta = {
    description: data.expensedetails.description,
    name: data.expensedetails.name,
    valueDate: data.expensedetails.valueDate,
    vehicleNo: data.expensedetails.vehicleNo,
    creditanddebitamount: data.creditanddebitamount,
    i_ts: curDate,
    vouchertype: data.expensedetails.vouchertype.voucher_type,
    voucherdate: data.expensedetails.voucherdate,
    voucher_type_id: data.expensedetails.voucher_type_id,
    staff_type: data.expensedetails.staff_type,
    staff_type_id: data.expensedetails.staff_type_id,
    c_number: c_number,
    c_id: c_id,
    entry_by: data.named,
    user_id: data.user_id,
    d_in: 0,
    status: 0,
  };
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_t SET ?;`;
  if (callback && typeof callback === "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      callback
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.updatesubmitvoucherentrymaindata = function (
  c_number,
  c_id,
  data,
  callback
) {
  const cntxtDtls = "in submitvoucherentrymaindata";
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const dta = {
    description: data.expensedetails.description,
    name: data.expensedetails.name,
    valueDate: data.expensedetails.valueDate,
    vehicleNo: data.expensedetails.vehicleNo,
    creditanddebitamount: data.creditanddebitamount,
    i_ts: data.i_ts,
    vouchertype: data.expensedetails.vouchertype.voucher_type,
    voucherdate: data.expensedetails.voucherdate,
    voucher_type_id: data.expensedetails.voucher_type_id,
    staff_type: data.expensedetails.staff_type,
    staff_type_id: data.expensedetails.staff_type_id,
    c_number: data.c_number,
    c_id: data.c_id,
    entry_by: data.entry_by,
    user_id: data.user_id,
    updatedby_id: data.updatedby_id,
    updatedby_name: data.updatedby_name,
    updatedby_date: data.updatedby_date,
    d_in: 0,
    status: 0,
    // Preserves the voucher's Payable classification across an edit —
    // without this the re-inserted row always defaulted to a "normal"
    // (non-payable) voucher, even when editing a payables voucher.
    is_payable: data.is_payable || 0,
  };
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_t SET ?;`;
  if (callback && typeof callback === "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      callback
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.gettargetdataMdl = function (callback) {
  var cntxtDtls = "in gettargetdataMdl";
  var QRY_TO_EXEC = `select * from fuel_target_t where  d_in='0' `;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// Get Daywise Report
exports.getdaywisereportMdl = function (data, callback) {
  var cntxtDtls = "in getdaywisereportMdl";

  //console.log()data, 5242);

  // if(data.ledger_name){
  // var QRY_TO_EXEC = `
  //     SELECT
  //         fe.*,
  //         fs.*
  //     FROM fuel_entry fe
  //     JOIN fuelentry_subt fs ON fe.id = fs.lastinsert_id
  //     WHERE
  //         fs.d_in = 0
  //         AND DATE(fs.i_ts) BETWEEN '${data.fromdate}' AND '${data.fromdate}'
  //         AND fs.expensives = '${data.ledger_name}'
  //         ${data.account_type ? `AND fs.account_type = '${data.account_type}'` : ''}
  //     ORDER BY fs.i_ts DESC
  // `;
  // }else{
  var QRY_TO_EXEC = `
    SELECT 
        fe.*,
        fs.*
    FROM fuel_entry fe
    JOIN fuelentry_subt fs ON fe.id = fs.lastinsert_id
    WHERE 
        fs.d_in = 0 
        ${data.fromdate ? `AND DATE(fs.voucherdate) = '${data.fromdate}'` : ""}
    ORDER BY fs.voucherdate ASC
`;
  // }

  //console.log()QRY_TO_EXEC, 6529);
  // var params = [data.fromdate, data.todate, data.ledger_name];

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};

// Get Station Wise
exports.getstationwisereportMdl = function (data, callback) {
  var cntxtDtls = "in getstationwisereportMdl";
  //console.log()data, 5242);

  if (data.ledger_name) {
    var QRY_TO_EXEC = `
   SELECT 
    fe.*,
    fs.*
FROM fuel_entry fe
JOIN fuelentry_subt fs ON fe.id = fs.lastinsert_id
WHERE 
    fs.d_in = 0 
    AND DATE(fs.voucherdate) BETWEEN '${data.fromdate}' AND '${data.todate}'
    AND fs.expensives = '${data.ledger_name}'
    AND fs.account_type = 'Credit Account'
ORDER BY fs.voucherdate ASC
`;
  }
  // else if(data.fromdate){

  // }
  else {
    var QRY_TO_EXEC = `
    SELECT 
        fe.*,
        fs.*
    FROM fuel_entry fe
    JOIN fuelentry_subt fs ON fe.id = fs.lastinsert_id
    WHERE 
        fs.d_in = 0 
        AND DATE(fs.voucherdate) BETWEEN '${data.fromdate}' AND '${data.todate}'
       
        ${data.account_type
        ? `AND fs.account_type = '${data.account_type}'`
        : ""
      }
    ORDER BY fs.voucherdate DESC
`;
  }
  //console.log()QRY_TO_EXEC, 6529);
  // var params = [data.fromdate, data.todate, data.ledger_name];

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};

// Get Busnumber
exports.getbusnumberMdl = function (callback) {
  var cntxtDtls = "in getbusnumberMdl";
  const QRY_TO_EXEC = `
    select * from busses where d_in=0`;
  //console.log()QRY_TO_EXEC, 7675);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

// Bus wise
exports.getbuswisewisereportsMdl = function (data, callback) {
  var cntxtDtls = "in getbuswisewisereportsMdl";
  //console.log()data, 5242);

  var QRY_TO_EXEC = `
   SELECT 
    fe.*,
    fs.*
FROM fuel_entry fe
JOIN fuelentry_subt fs ON fe.id = fs.lastinsert_id
WHERE 
    fs.d_in = 0 
    AND DATE(fs.voucherdate) BETWEEN '${data.fromdate}' AND '${data.todate}'
    AND fs.	vehicleNo = '${data.ledger_name}'
    AND fs.account_type = 'Credit Account'
ORDER BY fs.voucherdate ASC
`;

  //console.log()QRY_TO_EXEC, 6529);
  // var params = [data.fromdate, data.todate, data.ledger_name];

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};
exports.getbusperormancereportsMdl = function (data, callback) {
  var cntxtDtls = "in getbuswisewisereportsMdl";
  //console.log()data, 5242);

  var QRY_TO_EXEC = `
SELECT 
    vehicle_number AS bus_no,
    (present_odometer - previous_odometer) AS kms_run,
    quantity_filled AS qty,
    avg_kmpl,
    driver1,
    driver2,
    date,
    service_number,
    kilometers
FROM 
    fuel_entry 
WHERE 
    d_in = 0 
    AND vehicle_number='${data.ledger_name}' AND  DATE(date) BETWEEN '${data.fromdate}' AND '${data.todate}';

    `;
  //console.log()QRY_TO_EXEC, 6529);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};

// july 25 get driver name
exports.getdrivernameMdl = function (callback) {
  var cntxtDtls = "in getdrivernameMdl";
  const QRY_TO_EXEC = `
    select * from fuel_entry where d_in=0`;
  //console.log()QRY_TO_EXEC, 7675);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getdriverperormancereportsMdl = function (data, callback) {
  var cntxtDtls = "in getdriverperormancereportsMdl";
  //console.log()data, 5242);

  var QRY_TO_EXEC = `


SELECT 
    vehicle_number AS bus_no,
    (present_odometer - previous_odometer) AS kms_run,
    quantity_filled AS qty,
    avg_kmpl,
    driver1,
    driver2,
    date,
    kilometers,
    service_number
FROM 
    fuel_entry 
WHERE 
    d_in = 0 
    AND (driver1='${data.ledger_name}' OR driver2='${data.ledger_name}') AND  DATE(date) BETWEEN '${data.fromdate}' AND '${data.todate}';

    `;
  //console.log()QRY_TO_EXEC, 6529);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};

exports.gettargetreportsMdl = function (data, callback) {
  var cntxtDtls = "in getdriverperormancereportsMdl";
  //console.log()data, 5242);

  var QRY_TO_EXEC = `


SELECT 
   *
FROM 
    fuel_entry 
WHERE 
    d_in = 0 
    AND service_number='${data.ledger_name}' AND  DATE(date) BETWEEN '${data.fromdate}' AND '${data.todate}';
    `;
  console.log(QRY_TO_EXEC, 6529);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};

exports.gettopperormancereportsMdl = function (data, callback) {
  var cntxtDtls = "in getdriverperormancereportsMdl";
  //console.log()data, 5242);

  var QRY_TO_EXEC = `


SELECT 
    vehicle_number AS bus_no,
    (present_odometer - previous_odometer) AS kms_run,
    quantity_filled AS qty,
    avg_kmpl,
    driver1,
    driver2,
    date,
    kilometers,
    service_number
FROM 
    fuel_entry 
WHERE 
    d_in = 0 
    AND  DATE(date) BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY 
    avg_kmpl ASC;

    `;
  //console.log()QRY_TO_EXEC, 6529);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};

exports.getfueltargetdatamdl = function (data, callback) {
  var cntxtDtls = "in getfueltargetdatamdl";

  var QRY_TO_EXEC = `select * from  fuel_target_t where d_in=0 ORDER By id DESC;`;
  //console.log()QRY_TO_EXEC, 50078);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getdaybookreportsMdl = function (data, callback) {
  const cntxtDtls = "in getdaybookreportsMdl";
  //console.log()data, 5242);

  const query1 = `SELECT * FROM expensive_details WHERE d_in = 0 AND DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY i_ts DESC;`;
  const query2 = `SELECT * FROM mainvoucher_subt WHERE d_in = 0 AND voucherdate BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY i_ts DESC;`;
  const query3 = `SELECT * FROM fuelentry_subt WHERE d_in = 0 AND DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY i_ts DESC;`;
  const query4 = `SELECT * FROM laundrybill_subt WHERE d_in = 0 AND DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY i_ts DESC;`;

  //console.log()'Query1:', query1);
  //console.log()'Query2:', query2);
  //console.log()'Query3:', query3);

  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      query1,
      cntxtDtls,
      function (err1, result1) {
        if (err1) return callback(err1, null);

        dbutil.execQuery(
          sqldb,
          query2,
          cntxtDtls,
          function (err2, result2) {
            if (err2) return callback(err2, null);

            dbutil.execQuery(
              sqldb,
              query3,
              cntxtDtls,
              function (err3, result3) {
                if (err3) return callback(err3, null);
                dbutil.execQuery(
                  sqldb,
                  query4,
                  cntxtDtls,
                  function (err4, result4) {
                    if (err4) return callback(err4, null);
                    // Return all 3 result sets
                    const combinedResult = {
                      expensiveDetails: result1,
                      mainVoucherDetails: result2,
                      fuelEntryDetails: result3,
                      laundryDetails: result4,
                    };

                    return callback(null, combinedResult);
                  }
                );
              }
            );
          }
        );
      }
    );
  }
};
exports.gettrialbalancereportsMdl = function (data, callback) {
  const cntxtDtls = "in gettrialbalancereportsMdl";
  //console.log()data, 5242);
  const query1 = `SELECT * FROM expensive_details WHERE d_in = 0 and admin_status='1' AND DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY id DESC;`;
  const query2 = `SELECT * FROM mainvoucher_subt WHERE d_in = 0 and status='1' AND DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY id DESC;`;
  const query3 = `SELECT * FROM fuelentry_subt WHERE d_in = 0 and admin_status='1' AND DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY id DESC;`;
  const query4 = `SELECT * FROM laundrybill_subt WHERE d_in = 0 and admin_status='1' AND DATE(i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}' ORDER BY id DESC ;`;

  if (callback && typeof callback === "function") {
    dbutil.execQuery(
      sqldb,
      query1,
      cntxtDtls,
      function (err1, result1) {
        if (err1) return callback(err1, null);

        dbutil.execQuery(
          sqldb,
          query2,
          cntxtDtls,
          function (err2, result2) {
            if (err2) return callback(err2, null);

            dbutil.execQuery(
              sqldb,
              query3,
              cntxtDtls,
              function (err3, result3) {
                if (err3) return callback(err3, null);
                dbutil.execQuery(
                  sqldb,
                  query4,
                  cntxtDtls,
                  function (err4, result4) {
                    if (err4) return callback(err4, null);
                    // Return all 3 result sets
                    const combinedResult = {
                      expensiveDetails: result1,
                      mainVoucherDetails: result2,
                      fuelEntryDetails: result3,
                      laundryDetails: result4,
                    };

                    return callback(null, combinedResult);
                  }
                );
              }
            );
          }
        );
      }
    );
  }
};

exports.getsalarypaymentwisereportMdl = function (data, callback) {
  var cntxtDtls = "in getsalarypaymentwisereportMdl";
  //console.log()data, 5242);

  // if(data.ledger_name){
  // var QRY_TO_EXEC = `
  //    SELECT
  //     fe.*,
  //     fs.*
  // FROM fuel_entry fe
  // JOIN fuelentry_subt fs ON fe.id = fs.lastinsert_id
  // WHERE
  //     fs.d_in = 0
  //     AND DATE(fs.i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'
  //     AND fs.expensives = '${data.ledger_name}'
  //     AND fs.account_type = 'Credit Account'
  // ORDER BY fs.i_ts DESC
  // `;
  // }
  // else{
  //      var QRY_TO_EXEC = `
  //     SELECT
  //         fe.*,
  //         fs.*
  //     FROM fuel_entry fe
  //     JOIN fuelentry_subt fs ON fe.id = fs.lastinsert_id
  //     WHERE
  //         fs.d_in = 0
  //         AND DATE(fs.i_ts) BETWEEN '${data.fromdate}' AND '${data.todate}'

  //         ${data.account_type ? `AND fs.account_type = '${data.account_type}'` : ''}
  //     ORDER BY fs.i_ts DESC
  // `;
  // }

  // var QRY_TO_EXEC=`SELECT
  //     ROW_NUMBER() OVER (ORDER BY driver_name) AS 'SINo',
  //     driver_name AS 'Name',
  //     SUM(CASE WHEN role = 'Driver 1' THEN 1 ELSE 0 END) AS 'Driver_1',
  //     SUM(CASE WHEN role = 'Driver 2' THEN 1 ELSE 0 END) AS 'Driver_2',
  //     COUNT(*) AS 'Total_Duties',
  //     SUM(
  //         CASE
  //             WHEN role = 'Driver 1' THEN CAST(NULLIF(driveronesalary, '') AS DECIMAL(10,2))
  //             WHEN role = 'Driver 2' THEN CAST(NULLIF(drivertwosalary, '') AS DECIMAL(10,2))
  //             ELSE 0
  //         END
  //     ) AS 'Amount',
  //     GROUP_CONCAT(DISTINCT c_number SEPARATOR ', ') AS 'Challan_Numbers',
  //     GROUP_CONCAT(DISTINCT bus_no SEPARATOR ', ') AS 'Bus_Numbers',
  //     GROUP_CONCAT(DISTINCT service_no SEPARATOR ', ') AS 'Service_Numbers'
  // FROM (
  //     SELECT
  //         driver1_name AS driver_name,
  //         'Driver 1' AS role,
  //         driveronesalary,
  //         drivertwosalary,
  //         c_number,
  //         bus_no,
  //         service_no
  //     FROM tripexpenses_data
  //     WHERE driver1_name IS NOT NULL
  //       AND driver1_name != ''
  //       AND driveronebeta = 'Regular'

  //     UNION ALL

  //     SELECT
  //         driver2_name AS driver_name,
  //         'Driver 2' AS role,
  //         driveronesalary,
  //         drivertwosalary,
  //         c_number,
  //         bus_no,
  //         service_no
  //     FROM tripexpenses_data
  //     WHERE driver2_name IS NOT NULL
  //       AND driver2_name != ''
  //       AND drivertwobeta = 'Regular'
  // ) AS driver_data
  // GROUP BY driver_name
  // ORDER BY Total_Duties DESC;`;

  if (data.ledger_name == "driver") {
    var QRY_TO_EXEC = `SELECT 
        ROW_NUMBER() OVER (ORDER BY driver_name) AS 'SINo',
        driver_name AS 'Name',
        SUM(CASE WHEN role = 'Driver 1' THEN 1 ELSE 0 END) AS 'Driver_1',
        SUM(CASE WHEN role = 'Driver 2' THEN 1 ELSE 0 END) AS 'Driver_2',
        COUNT(*) AS 'Total_Duties',
        SUM(
            CASE
                WHEN role = 'Driver 1' THEN CAST(NULLIF(driveronesalary, '') AS DECIMAL(10,2))
                WHEN role = 'Driver 2' THEN CAST(NULLIF(drivertwosalary, '') AS DECIMAL(10,2))
                ELSE 0
            END
        ) AS 'Amount',
        GROUP_CONCAT(DISTINCT c_number SEPARATOR ', ') AS 'Challan_Numbers',
        GROUP_CONCAT(DISTINCT bus_no SEPARATOR ', ') AS 'Bus_Numbers',
        GROUP_CONCAT(DISTINCT service_no SEPARATOR ', ') AS 'Service_Numbers',
        GROUP_CONCAT(DISTINCT trip_date SEPARATOR ', ') AS 'Trip_Dates',
        GROUP_CONCAT(DISTINCT trip_for SEPARATOR ', ') AS 'Trip_Purposes'
    FROM (
        SELECT
            driver1_name AS driver_name,
            'Driver 1' AS role,
            driveronesalary,
            drivertwosalary,
            c_number,
            bus_no,
            service_no,
            trip_date,
            trip_for
        FROM tripexpenses_data
        WHERE driver1_name IS NOT NULL
          AND driver1_name != ''
          AND driveronebeta = 'Regular'
    
        UNION ALL
    
        SELECT
            driver2_name AS driver_name,
            'Driver 2' AS role,
            driveronesalary,
            drivertwosalary,
            c_number,
            bus_no,
            service_no,
            trip_date,
            trip_for
        FROM tripexpenses_data
        WHERE driver2_name IS NOT NULL
          AND driver2_name != ''
          AND drivertwobeta = 'Regular'
    ) AS driver_data
    GROUP BY driver_name
    ORDER BY Total_Duties DESC;`;
  } else if (data.ledger_name == "helper") {
    var QRY_TO_EXEC = `SELECT 
        ROW_NUMBER() OVER (ORDER BY helper_name) AS 'SINo',
        helper_name AS 'Name',
        SUM(CASE WHEN role = 'Helper' THEN 1 ELSE 0 END) AS 'Helper_Duties',
        COUNT(*) AS 'Total_Duties',
        SUM(CAST(NULLIF(helpersalary, '') AS DECIMAL(10,2))) AS 'Amount',
        GROUP_CONCAT(DISTINCT c_number SEPARATOR ', ') AS 'Challan_Numbers',
        GROUP_CONCAT(DISTINCT bus_no SEPARATOR ', ') AS 'Bus_Numbers',
        GROUP_CONCAT(DISTINCT service_no SEPARATOR ', ') AS 'Service_Numbers',
        GROUP_CONCAT(DISTINCT trip_date SEPARATOR ', ') AS 'Trip_Dates',
        GROUP_CONCAT(DISTINCT trip_for SEPARATOR ', ') AS 'Trip_Purposes'
    FROM (
        SELECT
            helper_name,
            'Helper' AS role,
            helpersalary,
            c_number,
            bus_no,
            service_no,
            trip_date,
            trip_for
        FROM tripexpenses_data
        WHERE helper_name IS NOT NULL
          AND helper_name != ''
          AND helperbeta = 'Regular'
    ) AS helper_data
    GROUP BY helper_name
    ORDER BY Total_Duties DESC;`;
  }
  // else{

  // }
  //console.log()QRY_TO_EXEC, 6529);
  // var params = [data.fromdate, data.todate, data.ledger_name];

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};

exports.mainsalaryuniquenoMdl = function (callback) {
  var cntxtDtls = "in maintripexpenseuniquenoMdl";
  var QRY_TO_EXEC = `SELECT c_id FROM  payment_t  WHERE d_in='0' order by id desc limit 1 ;`;
  //console.log()QRY_TO_EXEC, 22582);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addsalarypaymentmdl = function (c_id, c_number, data, callback) {
  var cntxtDtls = "in addsalarypaymentmdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  try {
    // Check if data.payments exists and is an array
    if (!data.payments) {
      throw new Error("Payments data is missing");
    }

    var paymentsArray = Array.isArray(data.payments)
      ? data.payments
      : [data.payments];

    // Validate required fields
    paymentsArray.forEach((payment) => {
      if (!payment.name || !payment.amount) {
        throw new Error("Required payment fields are missing");
      }
    });

    // Build parameterized query
    var placeholders = [];
    var values = [];

    paymentsArray.forEach((payment) => {
      placeholders.push(
        "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)"
      );
      values.push(
        payment.name || null,
        payment.driver1_count || 0,
        payment.driver2_count || 0,
        payment.total_duties || 0,
        payment.amount || 0,
        payment.old_balance || 0,
        payment.incentive || 0,
        payment.total || 0,
        payment.advance || 0,
        payment.balance || 0,
        payment.payment || 0,
        payment.balance2 || 0,
        payment.pay || null,
        payment.check || null,
        payment.remarks || null,
        c_id,
        c_number,
        payment.c_number || null,
        0,
        payment.balance2 || 0,
        date
      );
    });

    var QRY_TO_EXEC = `INSERT INTO payment_t (
            name, driver1_count, driver2_count, totalduties, amount,
            oldbalance, incentive, total, advance, balance1,
            payment, balance2, check_payment, pay, remarks,
            c_id, c_number, old_c_number,d_in,balance_update,i_ts	
        ) VALUES ${placeholders.join(",")}`;

    //console.log()'Executing query:', QRY_TO_EXEC);
    //console.log()'With values:', values);

    if (callback && typeof callback === "function") {
      dbutil.execQuery(
        sqldb,
        {
          sql: QRY_TO_EXEC,
          values: values,
        },
        cntxtDtls,
        function (err, results) {
          if (err) {
            console.error("Database error:", err);
            return callback(err, null);
          }
          callback(null, results);
        }
      );
    } else {
      return dbutil.execQuery(
        sqldb,
        {
          sql: QRY_TO_EXEC,
          values: values,
        },
        cntxtDtls
      );
    }
  } catch (error) {
    console.error("Error in addsalarypaymentmdl:", error);
    if (callback && typeof callback === "function") {
      return callback(error, null);
    }
    throw error;
  }
};

exports.addsalarydebitmdl = function (c_id, c_number, lastid, data, callback) {
  var cntxtDtls = "in adddiagnoptntTstdtsmmdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  // Prepare individual INSERT statements
  var queries = [];
  var creditAmount = data.credit[0]?.credit_amount || 0;

  data.patientsTstdts.forEach((patient) => {
    var singleQuery = {
      sql: `INSERT INTO payment_sub_t(
                serial_no,expensives,amount,bus_no,service_no,child,district_id,
                mandal_id,subchildtwo,temple_name,village_id,i_ts,staticname,
                mandal_name,subchildtwo_id,account_type,c_id,c_number,trip_date
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      values: [
        lastid,
        patient.d_test_name.temple_name,
        patient.d_test_amount || creditAmount,
        data.payments[0].bus_no, // Assuming single payment
        data.payments[0].service_no, // Assuming single payment
        patient.d_test_name.child,
        patient.d_test_name.district_id,
        patient.d_test_name.mandal_id,
        patient.d_test_name.subchildtwo,
        patient.d_test_name.temple_name,
        patient.d_test_name.village_id,
        date,
        patient.d_test_name.staticname,
        patient.d_test_name.mandal_name,
        patient.d_test_name.subchildtwo_id,
        patient.account_name,
        c_id,
        c_number,
        data.payments[0].trip_date || date, // Assuming single payment
      ],
    };
    queries.push(singleQuery);
  });

  if (queries.length === 0) {
    if (callback) return callback(new Error("No data to insert"), null);
    return;
  }

  // Execute all queries in a transaction
  sqldb.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      const executeQueries = queries.map((query) => {
        return new Promise((resolve, reject) => {
          connection.query(query.sql, query.values, (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
      });

      Promise.all(executeQueries)
        .then((results) => {
          connection.commit((err) => {
            connection.release();
            if (err) return callback(err);
            callback(null, results);
          });
        })
        .catch((err) => {
          connection.rollback(() => {
            connection.release();
            callback(err);
          });
        });
    });
  });
};

exports.updatepaymentadvanceMdl = function (
  c_id,
  c_number,
  lastid,
  data,
  callback
) {
  var cvrclrViewDtls = "in updatepaymentadvanceMdl";
  //console.log()data, 10903);

  var payments = data.payments;

  if (!Array.isArray(payments) || payments.length === 0) {
    if (callback && typeof callback === "function")
      return callback(null, "No payments to update");
    return;
  }

  // Build dynamic update queries using advance value
  let updateQueries = [];
  payments.forEach((payment) => {
    if (payment.pay === true) {
      const name = payment.name.replace(/'/g, ""); // Sanitize name
      const advanceAmount = payment.advance || 0; // default to 0 if undefined
      updateQueries.push(
        `UPDATE mainvoucher_subt SET advanceamount_update = '${advanceAmount}' WHERE name = '${name}'`
      );
    }
  });

  if (updateQueries.length === 0) {
    if (callback && typeof callback === "function")
      return callback(null, "No qualifying payments to update");
    return;
  }

  const QRY_TO_EXEC = updateQueries.join("; ");
  //console.log()QRY_TO_EXEC, 10856);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cvrclrViewDtls,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cvrclrViewDtls);
  }
};

exports.updatepaymentadvanceMdl = function (
  c_id,
  c_number,
  lastid,
  data,
  callback
) {
  var cvrclrViewDtls = "in updatepaymentadvanceMdl";
  // var lyear = (data.year * 1 + 1)
  // var fromdate = data.year + "-04-01";
  // var todate = lyear + "-03-31";
  var QRY_TO_EXEC = `update  mainvoucher_subt set amount='0' where name='${data.advancemainid}';`;
  //console.log()QRY_TO_EXEC, 10856);

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cvrclrViewDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cvrclrViewDtls);
};
exports.adddsalarycreditmdl = function (
  c_id,
  c_number,
  lastid,
  data,
  callback
) {
  var cntxtDtls = "in adddsalarycreditmdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  // Prepare individual INSERT statements
  var queries = [];

  data.credit.forEach((creditObj) => {
    var testAmount = data.patientsTstdts[0]?.d_test_amount;

    var singleQuery = {
      sql: `INSERT INTO payment_sub_t(
                serial_no,expensives,amount,account_type,credit_amount,bus_no,
                service_no,child,district_id,mandal_id,subchildtwo,temple_name,
                village_id,i_ts,staticname,mandal_name,subchildtwo_id,c_id,c_number,trip_date
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      values: [
        lastid,
        creditObj.credit_name.temple_name,
        testAmount || creditObj.credit_amount,
        creditObj.account_name,
        creditObj.credit_amount,
        data.payments[0].bus_no, // Assuming single payment
        data.payments[0].service_no, // Assuming single payment
        creditObj.credit_name.child,
        creditObj.credit_name.district_id,
        creditObj.credit_name.mandal_id,
        creditObj.credit_name.subchildtwo,
        creditObj.credit_name.temple_name,
        creditObj.credit_name.village_id,
        date,
        creditObj.credit_name.staticname,
        creditObj.credit_name.mandal_name,
        creditObj.credit_name.subchildtwo_id,
        c_id,
        c_number,
        data.payments[0].trip_date || date, // Assuming single payment
      ],
    };
    queries.push(singleQuery);
  });

  if (queries.length === 0) {
    if (callback) return callback(new Error("No data to insert"), null);
    return;
  }

  // Execute all queries in a transaction
  sqldb.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }
      const executeQueries = queries.map((query) => {
        return new Promise((resolve, reject) => {
          connection.query(query.sql, query.values, (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
      });
      Promise.all(executeQueries)
        .then((results) => {
          connection.commit((err) => {
            connection.release();
            if (err) return callback(err);
            callback(null, results);
          });
        })
        .catch((err) => {
          connection.rollback(() => {
            connection.release();
            callback(err);
          });
        });
    });
  });
};

// exports.getadvanceMdl = function (data, callback) {
//     var cntxtDtls = "in getoldBalanceMdl";
//     //console.log()data, 5242);

// var QRY_TO_EXEC=`select amount from  mainvoucher_subt where name='${data.name}' AND expensives="Salary" AND account_type="Debit Account" order by id desc limit 1`;

//     //console.log()QRY_TO_EXEC, 6529);

//     if (callback && typeof callback == "function") {
//         dbutil.execQuery(
//             sqldb,
//             QRY_TO_EXEC,

//             cntxtDtls,
//             function (err, results) {
//                 callback(err, results);
//                 return;
//             }
//         );
//     } else {
//         return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
//     }
// };

exports.getadvanceMdl = function (data, callback) {
  var cntxtDtls = "in getadvanceMdl";
  //console.log()data, 11207);
  // var QRY_TO_EXEC = `select SUM(amount) AS amount,id,account_type,amount,child,staticname,district_id,mandal_name,mandal_id,subchildtwo,subchildtwo_id,expensives,village_id,i_ts,d_in,lastinsert_id,status,c_number,c_id,entry_by,user_id,description,name,valueDate,vehicleNo,creditanddebitamount,vouchertype,voucherdate from  mainvoucher_subt where name='${data.name}' AND expensives="Salary Advances" AND account_type="Debit Account" order by id desc limit 1`;
  // var QRY_TO_EXEC = `SELECT SUM(amount) AS amount,advanceamount_update,id,account_type,child,staticname,district_id,mandal_name,mandal_id,subchildtwo,subchildtwo_id,expensives,village_id,i_ts,d_in,lastinsert_id,status,c_number,c_id,entry_by,user_id,description,name,valueDate,vehicleNo,creditanddebitamount,vouchertype,voucherdate from  mainvoucher_subt where name='${data.name}' and expensives="Salary Advances" AND account_type="Debit Account"  order by id desc limit 1`;
  var QRY_TO_EXEC = `SELECT 
  SUM(amount) AS advanceamounttotal,
  advanceamount_update,
  (SUM(amount) - advanceamount_update) AS amount,
  id,
  account_type,
  child,
  staticname,
  district_id,
  mandal_name,
  mandal_id,
  subchildtwo,
  subchildtwo_id,
  expensives,
  village_id,
  i_ts,
  d_in,
  lastinsert_id,
  status,
  c_number,
  c_id,
  entry_by,
  user_id,
  description,
  name,
  valueDate,
  vehicleNo,
  creditanddebitamount,
  vouchertype,
  voucherdate
FROM mainvoucher_subt 
WHERE 
  name = '${data.name}' 
  AND expensives = "Salary Advances" 
  AND account_type = "Debit Account" and  status='1'
ORDER BY id DESC 
LIMIT 1;
`;
  //console.log()QRY_TO_EXEC, 11210);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};
exports.sudMdl = function (data, callback) {
  var cntxtDtls = "in getoldBalanceMdl";
  //console.log()data, 5242);

  var QRY_TO_EXEC = `select * from  payment_t where name='${data.name}' order by id desc limit 1`;

  //console.log()QRY_TO_EXEC, 6529);

  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,

      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, params, cntxtDtls);
  }
};

exports.getfuelentrydataMdl = function (callback) {
  var cntxtDtls = "in getvouchgetfuelentrydataMdlerentrydataMdl";
//   var QRY_TO_EXEC = `SELECT *
// FROM fuel_entry
// WHERE d_in = 0 and admin_status = 0
// ORDER BY CAST(SUBSTRING(c_number, 7) AS UNSIGNED) DESC;
// `;
  var QRY_TO_EXEC = `
  SELECT 
    fe.*,
    fs.credit_ledger_id,
    fs.debit_ledger_id,
    fs.amount
FROM fuel_entry fe
LEFT JOIN (
    SELECT 
        c_number,
        MAX(CASE WHEN account_type = 'Credit Account' THEN expensives END) AS credit_ledger_id,
        MAX(CASE WHEN account_type = 'Debit Account' THEN expensives END) AS debit_ledger_id,
        MAX(amount) AS amount
    FROM fuelentry_subt
    where fuelentry_subt.d_in = 0
    GROUP BY c_number
) fs
    ON fe.c_number = fs.c_number
WHERE fe.d_in = 0
  AND fe.admin_status = 0
ORDER BY CAST(SUBSTRING(fe.c_number, 7) AS UNSIGNED) DESC;

`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getfuelentryapproveddataMdl = function (callback) {
  var cntxtDtls = "in getfuelentryapproveddataMdl";
  var QRY_TO_EXEC = `select * from  fuel_entry  where  d_in=0 and admin_status=1 ORDER BY fuel_entry.date DESC;`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getfuelentrysearchdataMdl = function (data, callback) {
  var cntxtDtls = "in getfuelentrysearchdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  let check2 = "";

  if (data.fromdate != "" && data.todate != "") {
    check2 = `  AND date BETWEEN '${data.fromdate}' AND '${data.todate}' `;
  }

  let check = "";
  if (data.type == "1") {
    check = " and admin_status=1";
  } else {
    check = " and admin_status=2";
  }

  var QRY_TO_EXEC = `SELECT * FROM fuel_entry WHERE d_in = 0  ${check2}  ${check} ORDER BY fuel_entry.date DESC `;
  console.log(QRY_TO_EXEC, 'QRY_TO_EXEC');

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getfuelaccountsdataMdl = function (data, callback) {
  var cntxtDtls = "in getbetaMdl";
  console.log(data, 10658);

  var QRY_TO_EXEC = "";

  if (data.type == "view") {
    QRY_TO_EXEC = `SELECT * from fuelentry_subt where d_in=0 and c_number='${data.c_number}'`;
  } else {
    QRY_TO_EXEC = `SELECT *,id as main_id from fuel_entry where d_in=0 and c_number='${data.c_number}';
     SELECT *,id as sub_id FROM fuelentry_subt where d_in=0 and c_number='${data.c_number}';
     `;
  }

  //console.log()QRY_TO_EXEC);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getlaundrybilldataMdl = function (callback) {
  var cntxtDtls = "in getlaundrybilldataMdl";
  var QRY_TO_EXEC = `SELECT c_number,name,date,admin_status,SUM(totalamount) AS totalamount FROM laundrybill_maint WHERE d_in = 0 and admin_status = 0 GROUP BY c_number,name,date,admin_status;`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getlaundrybillsubdataMdl = function (data, callback) {
  var cntxtDtls = "in getlaundrybillsubdataMdl";
  //console.log()data, 10437);

  var QRY_TO_EXEC = `
        SELECT * from laundrybill_maint where d_in=0 and c_number='${data.c_number}';
    SELECT * from laundrybill_subt where d_in=0 and c_number='${data.c_number}'`;

  //console.log()QRY_TO_EXEC);
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

var BUS_FIELD_LABELS = {
  bus_no: 'Bus No', ownername: 'Owner', chassis_no: 'Chassis No', vehicle_type: 'Vehicle Type',
  company: 'Company', insurance_validity: 'Insurance Validity', odometer: 'Odometer', engine_no: 'Engine No',
  pollution_validity: 'PUCC Validity', base_point_validity: 'Permit Validity', date_of_purchase: 'Purchase Date',
  atp_validity: 'AITP Validity', fc_validity: 'Fitness Validity', atp_authentication_validity: 'Authorization Validity',
  home_tax_validity: 'Home Tax Validity', service_out_date: 'Service Out Date', remarks: 'Remarks',
  bus_category: 'Category', owner_ledger_id: 'Owner Ledger', luxury_type: 'Luxury Type', seating_capacity: 'Seating Capacity',
  chassis_make: 'Chassis Make', body_made: 'Body Made', chassis_model: 'Chassis Model',
  mfg_year: 'Mfg Year', reg_date: 'Registration Date',
};

exports.updatebusnumber = function (data, callback) {
  console.log(data, 6245);
  var cntxtDtls = "in updatebusnumber";
  var esc = function (v) { return String(v == null ? '' : v).replace(/'/g, "''"); };

  var fieldValues = {
    bus_no: data.busnumber, ownername: data.ownername, chassis_no: data.chassisno,
    vehicle_type: data.vehicletype || '', company: data.company || '',
    insurance_validity: data.insurancevalidity, odometer: data.odometer, engine_no: data.engineno,
    pollution_validity: data.pollutionvalidity, base_point_validity: data.basepointvalidity,
    date_of_purchase: data.dateofpurchase, atp_validity: data.atpvalidity, fc_validity: data.fcvalidity,
    atp_authentication_validity: data.atpauthenticationvalidity, home_tax_validity: data.hometaxvalidity,
    service_out_date: data.serviceoutdate, remarks: data.remarks,
    bus_category: data.buscategory || 'normal', owner_ledger_id: data.owner_ledger_id || '',
    luxury_type: data.luxurytype, seating_capacity: data.seatingcapacity,
    chassis_make: data.chassismake, body_made: data.bodymade, chassis_model: data.chassismodel,
    mfg_year: data.mfgyear, reg_date: data.regdate || '',
  };

  // reg_date is a native DATE column (every other field diffed below is varchar); re-select it
  // as a plain 'YYYY-MM-DD' string so it compares equal to fieldValues.reg_date when unchanged —
  // otherwise this comes back as a Date object and every save falsely logs it as edited.
  sqldb.query(`SELECT *, DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date FROM busses WHERE id = ?`, [data.id], function (selErr, rows) {
    var before = (!selErr && rows && rows[0]) ? rows[0] : {};

    var setClauses = Object.keys(fieldValues).map(function (k) { return `${k}='${esc(fieldValues[k])}'`; }).join(',');
    var QRY_TO_EXEC = `update busses set ${setClauses},user_id='${esc(data.user_id)}',usr_nm='${esc(data.usrnm)}',updated_by='${esc(data.usrnm)}',updated_userid='${esc(data.userid)}' WHERE id = '${data.id}'`;

    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      if (err) { callback(err, results); return; }

      var changes = [];
      Object.keys(fieldValues).forEach(function (k) {
        var oldV = before[k] == null ? '' : String(before[k]);
        var newV = fieldValues[k] == null ? '' : String(fieldValues[k]);
        if (oldV !== newV) changes.push(`${BUS_FIELD_LABELS[k] || k}: '${oldV || '—'}' -> '${newV || '—'}'`);
      });

      if (changes.length === 0) { callback(null, results); return; }

      var histQ = `INSERT INTO bus_edit_history (bus_id, bus_no, changes_note, changed_by_id, changed_by_name) VALUES ('${data.id}', '${esc(fieldValues.bus_no)}', '${esc(changes.join('\n'))}', '${esc(data.userid)}', '${esc(data.usrnm)}')`;
      sqldb.query(histQ, function (histErr) {
        if (histErr) console.log('[updatebusnumber] history log error:', histErr.message);
        callback(null, results);
      });
    });
  });
};

exports.getBusHistoryMdl = function (data, callback) {
  var cntxtDtls = "getBusHistoryMdl";
  var busId = parseInt(data.bus_id) || 0;
  var QRY_TO_EXEC = `SELECT * FROM bus_edit_history WHERE bus_id = ${busId} ORDER BY changed_at ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.getTripHistoryMdl = function (data, callback) {
  var cntxtDtls = "getTripHistoryMdl";
  var tripId = parseInt(data.trip_id) || 0;
  var QRY_TO_EXEC = `SELECT * FROM trip_edit_history WHERE trip_id = ${tripId} ORDER BY changed_at ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.getDriverHistoryMdl = function (data, callback) {
  var cntxtDtls = "getDriverHistoryMdl";
  var driverId = parseInt(data.driver_id) || 0;
  var QRY_TO_EXEC = `SELECT * FROM driver_edit_history WHERE driver_id = ${driverId} ORDER BY changed_at ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

// Fields editable from the Vehicle Validations screen — whitelisted so the
// column name (which comes from the client) can never reach raw SQL unchecked.
var VALIDATION_FIELD_LABELS = {
  fc_validity: 'Fitness Validity', home_tax_validity: 'Home Tax Validity',
  insurance_validity: 'Insurance Validity', pollution_validity: 'PUCC Validity',
  base_point_validity: 'Permit Validity', atp_validity: 'AITP Validity',
  atp_authentication_validity: 'Authorization Validity',
};

exports.updateBusValidityDateMdl = function (data, callback) {
  var cntxtDtls = "updateBusValidityDateMdl";
  var esc = function (v) { return String(v == null ? '' : v).replace(/'/g, "''"); };
  var field = data.field;
  var busId = parseInt(data.bus_id) || 0;

  if (!VALIDATION_FIELD_LABELS[field] || !busId) {
    callback(new Error('Invalid field or bus_id'), null);
    return;
  }

  sqldb.query(`SELECT bus_no, ${field} FROM busses WHERE id = ?`, [busId], function (selErr, rows) {
    if (selErr) { callback(selErr, null); return; }
    var before = (rows && rows[0]) || {};
    var oldV = before[field] == null ? '' : String(before[field]);
    var newV = data.value == null ? '' : String(data.value);

    var QRY_TO_EXEC = `UPDATE busses SET ${field}='${esc(newV)}', updated_by='${esc(data.usrnm)}', updated_userid='${esc(data.userid)}' WHERE id = '${busId}'`;
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      if (err) { callback(err, results); return; }
      if (oldV === newV) { callback(null, results); return; }

      var note = `${VALIDATION_FIELD_LABELS[field]}: '${oldV || '—'}' -> '${newV || '—'}'`;
      var histQ = `INSERT INTO bus_edit_history (bus_id, bus_no, changes_note, changed_by_id, changed_by_name) VALUES ('${busId}', '${esc(before.bus_no)}', '${esc(note)}', '${esc(data.userid)}', '${esc(data.usrnm)}')`;
      sqldb.query(histQ, function (histErr) {
        if (histErr) console.log('[updateBusValidityDateMdl] history log error:', histErr.message);
        callback(null, results);
      });
    });
  });
};

exports.updateservicenumber = function (data, callback) {
  console.log(data, 6260);
  var cntxtDtls = "in updateservicenumber";
  var QRY_TO_EXEC = ` update service_number set  name='${data.serviceno}',updated_by='${data.usrnm}',updated_userid='${data.userid}' WHERE  id = '${data.id}'`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updateservicenoMdl = function (data, callback) {
  // console.log(data)
  var cntxtDtls = "in updateservicenoMdl";
  var QRY_TO_EXEC = ` update driverone set  distance='${data.distance}',driverOneBeta='${data.driverOneBeta}',driverTwoBeta='${data.driverTwoBeta}',fromCity='${data.fromCity}',helperBeta='${data.helperBeta}',optDriver='${data.optDriver}',optHelper='${data.optHelper}',optDriverSalary='${data.optDriverSalary}',optHelperSalary='${data.optHelperSalary}',parkingAmount='${data.parkingAmount}',remarks='${data.remarks}',serviceFor='${data.serviceFor}',serviceNo='${data.serviceNo}',toCity='${data.toCity}',viaPlaces='${data.viaPlaces}',conductorBeta='${data.conductorBeta}',updated_by='${data.usrnm}',updated_userid='${data.userid}',service_for_id = ${data.service_for_id},line_code='${data.line_code || ''}',route_id='${data.route_id || ''}',start_boarding_point='${data.start_boarding_point || ''}',start_boarding_time='${data.start_boarding_time || ''}',end_boarding_point='${data.end_boarding_point || ''}',end_boarding_time='${data.end_boarding_time || ''}',vehicle_type='${data.vehicle_type || 'bus'}',bus_operator_id='${data.bus_operator_id || ''}',bus_operator_name='${data.bus_operator_name || ''}',trip_type='${data.trip_type || ''}',up_down='${data.up_down || ''}' WHERE  id = '${data.id}'`;
  //console.log()QRY_TO_EXEC, 10136)
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

var DRIVER_FIELD_LABELS = {
  driver_name: 'DL Name', mobile_number: 'Mobile Number', alternate_number: 'Alternate Mobile',
  aadhar_number: 'Aadhar Number', reference: 'Referred By', account_holder_name: 'Account Holder Name',
  account_number: 'Account Number', bank_name: 'Bank Name', branch_name: 'Branch Name', ifsc_code: 'IFSC Code',
  upi_id: 'UPI ID', date_of_joining: 'Date of Joining', remarks: 'Remarks', nickname: 'Aadhar Name',
  emergency_mobile_number: 'Emergency Number', dl_number: 'DL Number', dl_expiry_date: 'DL Expiry Date',
  address: 'Address', dldateofbirth: 'Date of Birth', drivinglicense_joining_date: 'DL Issue Date',
  transportoneissuedate: 'Transport Issue Date', transportvalidityfrom: 'Transport Valid From',
  transportvalidityto: 'Transport Valid To', dl_issued_by: 'DL Issued By', dl_dob: 'DL Date of Birth',
  dl_linked_mobile: 'DL Linked Mobile Number',
};

exports.adddrivereditMdl = function (
  data,
  adharFront,
  adharBack,
  dlFront,
  dlBack,
  upiimage,
  callback
) {
  const cntxtDtls = "in adddrivereditMdl";
  const date = moment().utcOffset("+05:30").format("YYYY-MM-DD");

  const dta = {
    driver_id_number: data.driver_id_number,
    driver_name: data.driver_name,
    mobile_number: data.mobile_number,
    alternate_number: data.alternate_number || "",
    aadhar_number: data.aadhar_number,
    reference: data.reference || "",
    account_holder_name: data.account_holder_name,
    account_number: data.account_number,
    bank_name: data.bank_name,
    branch_name: data.branch_name || "",
    ifsc_code: data.ifsc_code,
    upi_id: data.upi_id || "",
    date_of_joining: data.date_of_joining,
    date_of_leaving: data.date_of_leaving || null,
    remarks: data.remarks || "",
    aadhar_card_front: adharFront,
    aadhar_card_back: adharBack,
    dl_front: dlFront,
    dl_back: dlBack,
    upi_scanner: upiimage,
    nickname: data.nickname || "",
    emergency_mobile_number: data.emergency_mobile_number || "",
    dl_number: data.dl_number,
    dl_expiry_date: data.dl_expiry_date,
    address: data.address || "",
    i_ts: date,
    user_id: data.entryby,
    usr_nm: data.usrnm,
    dldateofbirth: data.dldateofbirth || "",
    drivinglicense_joining_date: data.drivinglicense_joining_date || "",
    transportoneissuedate: data.transportoneissuedate || "",
    transportvalidityfrom: data.transportvalidityfrom || "",
    transportvalidityto: data.transportvalidityto || "",
    dl_issued_by: data.dl_issued_by || "",
    dl_dob: data.dl_dob || "",
    dl_linked_mobile: data.dl_linked_mobile || "",
    updatedby: data.usrnm,
    updateduser_id: data.entryby,
  };

  // const dta = {
  //     driver_id_number: data.driveridnumber,
  //     driver_name: data.fullname,
  //     mobile_number: data.mobile_number,
  //     alternate_number: data.alternate_mobile_number || '',
  //     aadhar_number: data.aadhar_number,
  //     reference: data.ref_name || '',
  //     account_holder_name: data.account_holder_name,
  //     account_number: data.account_number,
  //     bank_name: data.bank_name,
  //     branch_name: data.branch_name || '',
  //     ifsc_code: data.ifsc_code,
  //     upi_id: data.upi_id || '',
  //     date_of_joining: data.dl_joining_date,
  //     date_of_leaving: data.date_of_leaving || null,
  //     remarks: data.remarks || '',
  //     aadhar_card_front: adharFront,
  //     aadhar_card_back: adharBack,
  //     dl_front: dlFront,
  //     dl_back: dlBack,
  //     upi_scanner: upiimage,
  //     nickname: data.nickname || '',
  //     emergency_mobile_number: data.emergencynumber || '',
  //     dl_number: data.dl_number,
  //     dl_expiry_date: data.dl_expiry_date,
  //     i_ts: date,
  //     user_id: data.entryby,
  //     usr_nm: data.usr_nm,
  //     dldateofbirth: data.dldateofbirth || '',
  //     drivinglicense_joining_date: data.drivinglicense_joining_date || '',
  //     transportoneissuedate: data.transportoneissuedate || '',
  //     transportvalidityfrom: data.transportvalidityfrom || '',
  //     transportvalidityto: data.transportvalidityto || '',
  //     updatedby: data.usr_nm || '',
  //     updateduser_id: data.entryby || '',
  //     // Don't update 'id' field itself in SET
  // };

  // Note: remove 'id' from data to update, as it is the WHERE condition
  // If you want, delete dta.id before update, or just don't include in the object above

  const QRY_TO_EXEC = `
    UPDATE driver_register SET ?
    WHERE id = ?
  `;

  function syncDriverLedgerAfterUpdate(err, results) {
    if (err) { callback(err, results); return; }
    dbutil.execupdateQuery(sqldb, `SELECT ledger_id FROM driver_register WHERE id = ?`, [data.id], cntxtDtls, function (selErr, selRows) {
      var existingLedgerId = (!selErr && selRows && selRows[0]) ? selRows[0].ledger_id : null;
      if (existingLedgerId) {
        module.exports.renamePersonLedger(existingLedgerId, data.driver_name, data.driver_id_number, function (renameErr) {
          if (renameErr) console.error("[renamePersonLedger] failed for driver " + data.driver_id_number + ":", renameErr.message);
          callback(err, results);
        });
      } else {
        module.exports.ensurePersonLedger("Drivers", data.driver_name, data.driver_id_number, data.entryby, function (ledgerErr, ledgerId) {
          if (ledgerErr) {
            console.error("[ensurePersonLedger] backfill failed for driver " + data.driver_id_number + ":", ledgerErr.message);
            callback(err, results);
            return;
          }
          dbutil.execupdateQuery(sqldb, `UPDATE driver_register SET ledger_id = ? WHERE id = ?`, [ledgerId, data.id], cntxtDtls, function () {
            callback(err, results);
          });
        });
      }
    });
  }

  // select-before → update → diff tracked fields → log driver_edit_history
  // row if anything changed, then continue into the existing ledger sync —
  // mirrors updatebusnumber's history-logging pattern.
  // dl_dob is a native DATE column (every other tracked field here is varchar);
  // re-select it as a plain 'YYYY-MM-DD' string so it compares equal to
  // dta.dl_dob when unchanged — otherwise mysql2 returns a Date object and
  // every save falsely logs it as edited (same gotcha as updatebusnumber's reg_date).
  var trackedKeys = Object.keys(DRIVER_FIELD_LABELS);
  var selectCols = trackedKeys.map(function (k) { return k === 'dl_dob' ? `DATE_FORMAT(dl_dob, '%Y-%m-%d') as dl_dob` : k; }).join(', ');
  dbutil.execupdateQuery(sqldb, `SELECT ${selectCols} FROM driver_register WHERE id = ?`, [data.id], cntxtDtls, function (selErr, selRows) {
    var before = (!selErr && selRows && selRows[0]) ? selRows[0] : {};

    dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [dta, data.id], cntxtDtls, function (err, results) {
      if (err) { callback(err, results); return; }

      var esc = function (v) { return String(v == null ? '' : v).replace(/'/g, "''"); };
      var changes = [];
      trackedKeys.forEach(function (k) {
        var oldV = before[k] == null ? '' : String(before[k]);
        var newV = dta[k] == null ? '' : String(dta[k]);
        if (oldV !== newV) changes.push(`${DRIVER_FIELD_LABELS[k] || k}: '${oldV || '—'}' -> '${newV || '—'}'`);
      });

      if (changes.length === 0) { syncDriverLedgerAfterUpdate(err, results); return; }

      var histQ = `INSERT INTO driver_edit_history (driver_id, driver_id_number, changes_note, changed_by_id, changed_by_name) VALUES ('${data.id}', '${esc(data.driver_id_number)}', '${esc(changes.join('\n'))}', '${esc(data.entryby)}', '${esc(data.usrnm)}')`;
      sqldb.query(histQ, function (histErr) {
        if (histErr) console.log('[adddrivereditMdl] history log error:', histErr.message);
        syncDriverLedgerAfterUpdate(err, results);
      });
    });
  });
};
// exports.edithelperregisterMdl = function (data, adharFront, adharBack, upiScanner, callback) {
//     const cntxtDtls = "in edithelperregisterMdl";
//     const date = moment().utcOffset("+05:30").format("YYYY-MM-DD");

//     const dta = {
//         helper_id_number: data.helper_id_number,
//         helper_name: data.helper_name,
//         mobile_number: data.mobile_number,
//         alternate_number: data.alternate_number || '',
//         adhar_number: data.adhar_number,
//         reference: data.reference || '',
//         account_holder_name: data.account_holder_name,
//         account_number: data.account_number,
//         bank_name: data.bank_name,
//         branch_name: data.branch_name || '',
//         ifsc_code: data.ifsc_code,
//         upi_id: data.upi_id || '',
//         date_of_joining: data.date_of_joining,
//         date_of_leaving: data.date_of_leaving || null,
//         remarks: data.remarks || '',
//         adhar_card_front: adharFront,
//         adhar_card_back: adharBack,
//         upi_scanner: upiScanner,
//         nickname: data.nickname || '',
//         emergencymobilenumber: data.emergencymobilenumber || '',
//         i_ts: date,
//         user_id: data.entryby,
//         usr_nm: data.usr_nm
//     };

//     const QRY_TO_EXEC = `INSERT INTO helper_register SET ?;`;
//  //console.log()QRY_TO_EXEC, 550);
//     if (callback && typeof callback === "function") {
//         dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, dta, cntxtDtls, function (err, results) {
//             callback(err, results);
//             return;
//         });
//     } else {
//         return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
//     }
// };

// exports.edithelperregisterMdl = function (data, adharFront, adharBack, upiScanner, callback) {
//   const cntxtDtls = "in edithelperregisterMdl";
//   const date = moment().utcOffset("+05:30").format("YYYY-MM-DD");

//   const dta = {
//     helper_id_number: data.helper_id_number,
//     helper_name: data.helper_name,
//     mobile_number: data.mobile_number,
//     alternate_number: data.alternate_number || '',
//     adhar_number: data.adhar_number,
//     reference: data.reference || '',
//     account_holder_name: data.account_holder_name,
//     account_number: data.account_number,
//     bank_name: data.bank_name,
//     branch_name: data.branch_name || '',
//     ifsc_code: data.ifsc_code,
//     upi_id: data.upi_id || '',
//     date_of_joining: data.date_of_joining,
//     date_of_leaving: data.date_of_leaving || null,
//     remarks: data.remarks || '',
//     adhar_card_front: adharFront,
//     adhar_card_back: adharBack,
//     upi_scanner: upiScanner,
//     nickname: data.nickname || '',
//     emergencymobilenumber: data.emergencymobilenumber || '',
//     i_ts: date,
//     user_id: data.entryby,
//     usr_nm: data.usr_nm
//   };

//   const QRY_TO_EXEC = `UPDATE helper_register SET ? WHERE id = ?`;

//   if (callback && typeof callback === "function") {
//     dbutil.execupdateQuery(
//       sqldb,
//       QRY_TO_EXEC,
//       [dta, data.id],
//       cntxtDtls,
//       (err, results) => {
//         callback(err, results);
//         return;
//       }
//     );
//   } else {
//     return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
//   }
// };
exports.edithelperregisterMdl = function (
  data,
  adharFront,
  adharBack,
  upiScanner,
  callback
) {
  const cntxtDtls = "in edithelperregisterMdl";
  const date = moment().utcOffset("+05:30").format("YYYY-MM-DD");

  const dta = {
    helper_id_number: data.helper_id_number,
    helper_name: data.helper_name,
    mobile_number: data.mobile_number,
    alternate_number: data.alternate_number || "",
    adhar_number: data.adhar_number,
    reference: data.reference || "",
    account_holder_name: data.account_holder_name,
    account_number: data.account_number,
    bank_name: data.bank_name,
    branch_name: data.branch_name || "",
    ifsc_code: data.ifsc_code,
    upi_id: data.upi_id || "",
    date_of_joining: data.date_of_joining,
    date_of_leaving: data.date_of_leaving || null,
    remarks: data.remarks || "",
    adhar_card_front: adharFront,
    adhar_card_back: adharBack,
    upi_scanner: upiScanner,
    nickname: data.nickname || "",
    emergencymobilenumber: data.emergency_mobile_number || "",
    dob: data.dob || null,
    address: data.address || "",
    i_ts: date,
    user_id: data.entryby,
    usr_nm: data.usrnm,
  };

  const updateQuery = `UPDATE helper_register SET ? WHERE id = ?`;

  function syncHelperLedgerAfterUpdate(err, results) {
    if (err) { callback(err, results); return; }
    dbutil.execupdateQuery(sqldb, `SELECT ledger_id FROM helper_register WHERE id = ?`, [data.id], cntxtDtls, function (selErr, selRows) {
      var existingLedgerId = (!selErr && selRows && selRows[0]) ? selRows[0].ledger_id : null;
      if (existingLedgerId) {
        module.exports.renamePersonLedger(existingLedgerId, data.helper_name, data.helper_id_number, function (renameErr) {
          if (renameErr) console.error("[renamePersonLedger] failed for helper " + data.helper_id_number + ":", renameErr.message);
          callback(err, results);
        });
      } else {
        module.exports.ensurePersonLedger("Helpers", data.helper_name, data.helper_id_number, data.entryby, function (ledgerErr, ledgerId) {
          if (ledgerErr) {
            console.error("[ensurePersonLedger] backfill failed for helper " + data.helper_id_number + ":", ledgerErr.message);
            callback(err, results);
            return;
          }
          dbutil.execupdateQuery(sqldb, `UPDATE helper_register SET ledger_id = ? WHERE id = ?`, [ledgerId, data.id], cntxtDtls, function () {
            callback(err, results);
          });
        });
      }
    });
  }

  if (callback && typeof callback === "function") {
    dbutil.execupdateQuery(
      sqldb,
      updateQuery,
      [dta, data.id],
      cntxtDtls,
      syncHelperLedgerAfterUpdate
    );
  } else {
    return dbutil.execQuery(sqldb, updateQuery, cntxtDtls);
  }
};
exports.addstaffeditMdl = function (
  data,
  imageuploadlao,
  imageuploadlaotwo,
  imageuploadlaothree,
  callback
) {
  var cntxtDtls = "in addstaffeditMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD");

  var dta = {
    designation: data.designation,
    idNumber: data.idNumber || "",
    fullName: data.fullName,
    mobile: data.mobile,
    emergencyContact: data.emergencyContact,
    aadhaar: data.aadhaar,
    accountHolderName: data.accountHolderName,
    accountNumber: data.accountNumber,
    bankName: data.bankName,
    ifscCode: data.ifscCode,
    upiId: data.upiId,
    aadhaarCardFront: imageuploadlao,
    aadhaarCardBack: imageuploadlaotwo,
    upiScanner: imageuploadlaothree,
    dateOfJoining: data.dateOfJoining,
    dateOfLeaving: data.dateOfLeaving || null,
    remarks: data.remarks || "",
    alternativemobilenumber: data.alternativemobilenumber || "",
    referencename: data.referencename || "",
    branchname: data.branchname || "",
    i_ts: date,
    user_id: data.entryby,
    usr_nm: data.usrnm,
    nickName: data.nickName,
    dob: data.dob || null,
    address: data.address || "",
    updatedby: data.usrnm,
    updateduser_id: data.entryby,
  };

  // var dta = {
  //     designation: data.designation,
  //     idNumber: data.idNumber,
  //     fullName: data.fullName,
  //     mobile: data.mobile,
  //     emergencyContact: data.emergencyContact,
  //     aadhaar: data.aadhaar,
  //     accountHolderName: data.accountHolderName,
  //     accountNumber: data.accountNumber,
  //     bankName: data.bankName,
  //     ifscCode: data.ifscCode,
  //     upiId: data.upiId,
  //     dateOfJoining: data.dateOfJoining,
  //     dateOfLeaving: data.dateOfLeaving || null,
  //     remarks: data.remarks || '',
  //     alternativemobilenumber: data.alternativemobilenumber || '',
  //     referencename: data.referencename || '',
  //     branchname: data.branchname || '',
  //     i_ts: date,
  //     updateduser_id: data.entryby,
  //     updatedby: data.usr_nm,
  //     nickName: data.nickName,
  //     id: data.id
  // };

  if (imageuploadlao) dta.aadhaarCardFront = imageuploadlao;
  if (imageuploadlaotwo) dta.aadhaarCardBack = imageuploadlaotwo;
  if (imageuploadlaothree) dta.upiScanner = imageuploadlaothree;

  const QRY_TO_EXEC = `UPDATE staff_register SET ? WHERE id = ?`;

  function syncStaffLedgerAfterUpdate(err, results) {
    if (err) { callback(err, results); return; }
    dbutil.execupdateQuery(sqldb, `SELECT ledger_id FROM staff_register WHERE id = ?`, [data.id], cntxtDtls, function (selErr, selRows) {
      var existingLedgerId = (!selErr && selRows && selRows[0]) ? selRows[0].ledger_id : null;
      var disambiguator = data.idNumber || ("#" + data.id);
      if (existingLedgerId) {
        module.exports.renamePersonLedger(existingLedgerId, data.fullName, disambiguator, function (renameErr) {
          if (renameErr) console.error("[renamePersonLedger] failed for staff " + data.id + ":", renameErr.message);
          callback(err, results);
        });
      } else {
        module.exports.ensurePersonLedger("Staff", data.fullName, disambiguator, data.entryby, function (ledgerErr, ledgerId) {
          if (ledgerErr) {
            console.error("[ensurePersonLedger] backfill failed for staff " + data.id + ":", ledgerErr.message);
            callback(err, results);
            return;
          }
          dbutil.execupdateQuery(sqldb, `UPDATE staff_register SET ledger_id = ? WHERE id = ?`, [ledgerId, data.id], cntxtDtls, function () {
            callback(err, results);
          });
        });
      }
    });
  }

  if (callback && typeof callback === "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      [dta, data.id],
      cntxtDtls,
      syncStaffLedgerAfterUpdate
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.Duplicatechecksubchildtwomainmastermdlbalancesheet = function (
  data,
  callback
) {
  var cntxtDtls = "in Duplicatechecksubchildtwomainmastermdlbalancesheet";
  //console.log()data, 10438);
  var QRY_TO_EXEC = `select * from mainmasterssubchildtwo where d_in=0 and temple_name='${data.name}'`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.AddledgersingleinbalancesheetMdl = function (data, callback) {
  var cntxtDtls = "in AddledgersingleinbalancesheetMdl";
  //console.log()data, 10451);

  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  const ledger = data.firstLedgerEntry; // Extract from firstLedgerEntry
  var dta = {
    temple_name: data.name,
    district_id: ledger.district_id,
    staticname: ledger.staticname || data.key, // If `staticname` is missing, fallback to `key`
    mandal_id: ledger.mandal_id,
    mandal_name: ledger.mandal_name,
    entry_by: ledger.entry_by,
    child: ledger.child,
    village_id: ledger.village_id,
    i_ts: date,
    subchildtwo: ledger.subchildtwo,
    //  subchildtwo: ledger.subchildtwo,
    subchildtwo_id: ledger.subchildtwo_id,
  };

  var QRY_TO_EXEC = `INSERT INTO mainmasterssubchildtwo SET ?`;
  // executeSQL(QRY_TO_EXEC, dta, callback);
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.Duplicatechecksubchildtwomainmastermdlequlilties = function (
  data,
  callback
) {
  var cntxtDtls = "in Duplicatechecksubchildtwomainmastermdlequlilties";
  //console.log()data, 10438);
  var QRY_TO_EXEC = `select * from mainmasterssubchildtwo where d_in=0 and temple_name='${data.name}'`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.equilitiessingleinbalancesheetMdl = function (data, callback) {
  var cntxtDtls = "in equilitiessingleinbalancesheetMdl";
  //console.log()data, 10451);

  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  const ledger = data.firstLedgerEntry; // Extract from firstLedgerEntry
  var dta = {
    temple_name: data.name,
    district_id: ledger.district_id,
    staticname: ledger.staticname || data.key, // If `staticname` is missing, fallback to `key`
    mandal_id: ledger.mandal_id,
    mandal_name: ledger.mandal_name,
    entry_by: ledger.entry_by,
    child: ledger.child,
    village_id: ledger.village_id,
    i_ts: date,
    subchildtwo: ledger.subchildtwo,
    //  subchildtwo: ledger.subchildtwo,
    subchildtwo_id: ledger.subchildtwo_id,
  };

  var QRY_TO_EXEC = `INSERT INTO mainmasterssubchildtwo SET ?`;
  // executeSQL(QRY_TO_EXEC, dta, callback);
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

///profit and loss code starts
exports.Duplicatechecksubchildtwomainmastermdlprofitandloss = function (
  data,
  callback
) {
  var cntxtDtls = "in Duplicatechecksubchildtwomainmastermdlprofitandloss";
  //console.log()data, 10438);
  var QRY_TO_EXEC = `select * from mainmasterssubchildtwo where d_in=0 and temple_name='${data.name}'`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.AddledgersingleinprofitandlossMdl = function (data, callback) {
  var cntxtDtls = "in AddledgersingleinprofitandlossMdl";
  //console.log()data, 10451);

  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  const ledger = data.firstLedgerEntry; // Extract from firstLedgerEntry
  var dta = {
    temple_name: data.name,
    district_id: ledger.district_id,
    staticname: ledger.staticname || data.key, // If `staticname` is missing, fallback to `key`
    mandal_id: ledger.mandal_id,
    mandal_name: ledger.mandal_name,
    entry_by: ledger.entry_by,
    child: ledger.child,
    village_id: ledger.village_id,
    i_ts: date,
    subchildtwo: ledger.subchildtwo,
    //  subchildtwo: ledger.subchildtwo,
    subchildtwo_id: ledger.subchildtwo_id,
  };

  var QRY_TO_EXEC = `INSERT INTO mainmasterssubchildtwo SET ?`;
  // executeSQL(QRY_TO_EXEC, dta, callback);
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.Duplicatechecksubchildtwomainmastermdlexpenses = function (
  data,
  callback
) {
  var cntxtDtls = "in Duplicatechecksubchildtwomainmastermdlexpenses";
  var QRY_TO_EXEC = `select * from mainmasterssubchildtwo where d_in=0 and temple_name='${data.name}'`;
  if (callback && typeof callback == "function") {
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.incomesingleinprofitandlossMdl = function (data, callback) {
  var cntxtDtls = "in incomesingleinprofitandlossMdl";
  //console.log()data, 10451);

  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  const ledger = data.firstLedgerEntry; // Extract from firstLedgerEntry
  var dta = {
    temple_name: data.name,
    district_id: ledger.district_id,
    staticname: ledger.staticname || data.key, // If `staticname` is missing, fallback to `key`
    mandal_id: ledger.mandal_id,
    mandal_name: ledger.mandal_name,
    entry_by: ledger.entry_by,
    child: ledger.child,
    village_id: ledger.village_id,
    i_ts: date,
    subchildtwo: ledger.subchildtwo,
    //  subchildtwo: ledger.subchildtwo,
    subchildtwo_id: ledger.subchildtwo_id,
  };

  var QRY_TO_EXEC = `INSERT INTO mainmasterssubchildtwo SET ?`;
  // executeSQL(QRY_TO_EXEC, dta, callback);
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.editfueltargetMdl = function (data, callback) {
  var cntxtDtls = "in editfueltargetMdl";
  var QRY_TO_EXEC = `update  fuel_target_t set service_number='${data.serviceNumber}',target='${data.targetFuel}' where id='${data.id}';`;
  //console.log()QRY_TO_EXEC);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      data,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, data);
};

exports.addmastergroupdataMdl = function (data, callback) {
  var cntxtDtls = "in addmastergroupdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  var dta = {
    district_id: data.district_id,
    staticentry: data.staticentry,
    mandal_name: data.mandal_name,
    i_ts: date,
  };

  // Step 1: Check if mandal_name already exists for the given district_id
  var CHECK_QUERY = `SELECT COUNT(*) AS count FROM mainmastersgroup WHERE mandal_name = '${data.mandal_name}'`;

  dbutil.sqlinjection(
    sqldb,
    CHECK_QUERY,
    [data.mandal_name, data.district_id],
    cntxtDtls,
    function (err, results) {
      if (err) {
        return callback(err, null);
      }

      if (results && results[0].count > 0) {
        // ? Mandal already exists ï¿½ throw as error
        const existsError = new Error("Village already exists");
        existsError.code = "Group Already Exists";
        return callback(existsError, null);
      } else {
        // ? Mandal doesn't exist ï¿½ proceed with insert
        var QRY_TO_EXEC = `INSERT INTO mainmastersgroup SET ?`;

        dbutil.sqlinjection(
          sqldb,
          QRY_TO_EXEC,
          dta,
          cntxtDtls,
          function (err2, insertResults) {
            if (err2) {
              return callback(err2, null);
            }
            return callback(null, {
              message: "Inserted successfully",
              inserted: true,
              result: insertResults,
            });
          }
        );
      }
    }
  );
};

exports.addsubgroupdataMdl = function (data, callback) {
  const cntxtDtls = "in addsubgroupdataMdl";
  const date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  const insertData = {
    created_at: date,
    district_id: data.district_id,
    mandal_id: data.mandal_id,
    staticentry: data.staticentry,
    village_name: data.village_name,
    i_ts: date,
  };

  // Step 1: Query to check if village already exists
  const CHECK_QUERY = `
        SELECT COUNT(*) AS count 
        FROM mainmasterssubgroup 
        WHERE village_name = '${data.village_name}'
    `;

  const checkParams = [data.village_name, data.mandal_id, data.district_id];

  dbutil.sqlinjection(
    sqldb,
    CHECK_QUERY,
    checkParams,
    cntxtDtls,
    function (err, results) {
      if (err) {
        return callback(
          {
            code: "Group Already Exists",
            message: "Database error during village check",
            error: err,
          },
          null
        );
      }

      if (results && results[0].count > 0) {
        // ? Mandal already exists ï¿½ throw as error
        const existsError = new Error("Village already exists");
        existsError.code = "Group Already Exists";
        return callback(existsError, null);
      }

      // Step 2: Village doesn't exist, proceed to insert
      const INSERT_QUERY = `INSERT INTO mainmasterssubgroup SET ?`;

      dbutil.sqlinjection(
        sqldb,
        INSERT_QUERY,
        insertData,
        cntxtDtls,
        function (insertErr, insertResult) {
          if (insertErr) {
            return callback(
              {
                code: "DB_ERROR",
                message: "Error inserting village",
                error: insertErr,
              },
              null
            );
          }

          return callback(null, {
            code: "SUCCESS",
            message: "Village inserted successfully",
            result: insertResult,
          });
        }
      );
    }
  );
};

exports.addchilddataMdl = function (data, callback) {
  var cntxtDtls = "in addchilddataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  var dta = {
    parent_subgroup_id: data.parent_subgroup_id,
    self_parent_id: data.self_parent_id,
    temple_name: data.temple_name,
    level_depth: data.level_depth,
    has_ledgers: data.has_ledgers,
    can_add_subgroups: data.can_add_subgroups,
    created_at: date,
    district_id: data.district_id,
    mandal_id: data.mandal_id,
    staticentry: data.staticentry,
    i_ts: date,
    entry_by: data.user_id,
    mandal_name: data.mandal_name,
    child: data.village_name,
    village_id: data.village_id,
  };

  // Step 1: Check if village_name (child) already exists in this mandal/district
  var CHECK_QUERY = `
        SELECT COUNT(*) AS count 
        FROM mainmasterssubchild 
        WHERE temple_name = '${data.temple_name}' 
    `;
  console.log(CHECK_QUERY);
  dbutil.sqlinjection(
    sqldb,
    CHECK_QUERY,
    [data.village_name, data.district_id, data.mandal_id],
    cntxtDtls,
    function (err, results) {
      if (err) {
        return callback(err, null);
      }
      if (results && results[0].count > 0) {
        // ? Village already exists ï¿½ throw error
        const existsError = new Error(
          "Village already exists under this mandal/district"
        );
        existsError.code = "Already Group Exists";
        return callback(existsError, null);
      } else {
        // ? Insert the new child (village)
        var QRY_TO_EXEC = `INSERT INTO mainmasterssubchild SET ?`;

        if (callback && typeof callback == "function") {
          dbutil.sqlinjection(
            sqldb,
            QRY_TO_EXEC,
            dta,
            cntxtDtls,
            function (err, results) {
              callback(err, results);
              return;
            }
          );
        } else {
          return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
        }
      }
    }
  );
};

exports.addInfiniteGroupMdl = function (data, callback) {
  var cntxtDtls = "in addInfiniteGroupMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    parent_subgroup_id: data.parent_subgroup_id,
    self_parent_id: data.self_parent_id,
    temple_name: data.temple_name,
    level_depth: data.level_depth,
    has_ledgers: data.has_ledgers,
    can_add_subgroups: data.can_add_subgroups,
    created_at: date,
    district_id: data.district_id,
    mandal_id: data.mandal_id,
    staticentry: data.staticentry,
    i_ts: date,
    entry_by: data.user_id,
    mandal_name: data.mandal_name,
    child: data.village_name,
    village_id: data.village_id,
  };

  var QRY_TO_EXEC = `INSERT INTO mainmasterssubchild SET ?`;
  // executeSQL(QRY_TO_EXEC, dta, callback);
  if (callback && typeof callback == "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  } else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addledgerdataMdl = function (data, callback) {
  var cntxtDtls = "in addledgerdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");

  var dta = {
    parent_subgroup_id: data.parent_subgroup_id,
    parent_subchild_id: data.parent_subchild_id,
    ledger_type: "inherited",
    created_at: date,
    district_id: data.district_id,
    staticname: data.staticname,
    mandal_id: data.mandal_id,
    mandal_name: data.mandal_name,
    village_id: data.village_id,
    temple_name: data.temple_name,
    entry_by: data.user_id,
    child: data.child,
    i_ts: date,
    subchildtwo: data.subchildtwo,
    subchildtwo_id: data.parent_subchild_id,
    parent_grp_level: data.parent_level,
  };

  // Check if temple_name exists
  var CHECK_EXISTS_QRY = `SELECT 1 FROM mainmasterssubchildtwo WHERE temple_name = ? and d_in=0 LIMIT 1 `;

  dbutil.sqlinjection(
    sqldb,
    CHECK_EXISTS_QRY,
    [data.temple_name],
    cntxtDtls,
    function (checkErr, checkRes) {
      if (checkErr) {
        callback(checkErr, null);
        return;
      }

      if (checkRes && checkRes.length > 0) {
        // Temple already exists ï¿½ throw error
        const existsError = new Error(
          "Temple name already exists. Cannot insert duplicate."
        );
        existsError.code = "DUPLICATE_TEMPLE";
        callback(existsError, null);
        return;
      }

      // Proceed with insert
      var INSERT_QRY = `INSERT INTO mainmasterssubchildtwo SET ?`;

      dbutil.sqlinjection(
        sqldb,
        INSERT_QRY,
        dta,
        cntxtDtls,
        function (insertErr, insertRes) {
          callback(insertErr, insertRes);
        }
      );
    }
  );
};

// ── Auto-ledger creation for Staff / Driver / Helper registration ────────────
// Keeps the balance sheet in sync with the Staff Register module: every person
// added there gets a matching ledger under EQUITIES AND LIABILITIES > 3) CURRENT
// LIABILITIES > Payables > <personLabel>, so nobody has to add it by hand on the
// Ledger master page afterward. personLabel is one of 'Staff' | 'Drivers' |
// 'Helpers' — subchild containers living under the fixed "Payables" subgroup
// (id=5). Drivers are never split by how they are paid: there is one "Drivers"
// container, one "Helpers", one "Staff".
//
// groupConfig lets ensurePersonLedger also target other groups (e.g. Receivables,
// id=3, for Van hirers via ensureHirerLedger below) — defaults to Payables so
// every existing caller (Staff/Driver/Helper) is unaffected.
var PAYABLES_GROUP_CONFIG = {
  parentSubgroupId: 5, districtId: "2", staticname: "EQUITIES AND LIABILITIES",
  mandalId: "5", mandalName: "3) CURRENT LIABILITIES", childLabel: "Payables",
};

function insertPersonLedgerRow(parentSubchildId, personLabel, name, userId, groupConfig, cntxtDtls, callback) {
  var g = groupConfig || PAYABLES_GROUP_CONFIG;
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  var dta = {
    parent_subgroup_id: g.parentSubgroupId,
    parent_subchild_id: parentSubchildId,
    ledger_type: "inherited",
    created_at: date,
    district_id: g.districtId,
    staticname: g.staticname,
    mandal_id: g.mandalId,
    mandal_name: g.mandalName,
    village_id: g.parentSubgroupId,
    temple_name: name,
    entry_by: userId,
    child: g.childLabel,
    i_ts: date,
    subchildtwo: personLabel,
    subchildtwo_id: parentSubchildId,
    parent_grp_level: 4,
  };
  dbutil.execupdateQuery(sqldb, `INSERT INTO mainmasterssubchildtwo SET ?`, dta, cntxtDtls, function (err, result) {
    if (err) return callback(err, null);
    callback(null, result.insertId);
  });
}

exports.ensurePersonLedger = function (personLabel, fullName, disambiguator, userId, callback, groupConfig) {
  var cntxtDtls = "in ensurePersonLedger";
  var g = groupConfig || PAYABLES_GROUP_CONFIG;
  var name = String(fullName || "").trim();
  if (!name) return callback(null, null);

  dbutil.execupdateQuery(
    sqldb,
    `SELECT id FROM mainmasterssubchild WHERE temple_name = ? AND parent_subgroup_id = ? AND d_in = 0 LIMIT 1`,
    [personLabel, g.parentSubgroupId],
    cntxtDtls,
    function (err, rows) {
      if (err) return callback(err, null);
      if (!rows || !rows.length) {
        return callback(new Error(`No "${personLabel}" ledger container found under ${g.childLabel}`), null);
      }
      var parentSubchildId = rows[0].id;

      dbutil.execupdateQuery(
        sqldb,
        `SELECT 1 FROM mainmasterssubchildtwo WHERE temple_name = ? AND d_in = 0 LIMIT 1`,
        [name],
        cntxtDtls,
        function (dupErr, dupRows) {
          if (dupErr) return callback(dupErr, null);
          if (!dupRows || !dupRows.length) {
            return insertPersonLedgerRow(parentSubchildId, personLabel, name, userId, g, cntxtDtls, callback);
          }
          // Name collision — disambiguate once using the person's own id number
          // (e.g. "D0008") rather than silently failing to create the ledger.
          var altName = disambiguator ? `${name} (${disambiguator})` : null;
          if (!altName) return callback(new Error("DUPLICATE_LEDGER_NAME"), null);
          dbutil.execupdateQuery(
            sqldb,
            `SELECT 1 FROM mainmasterssubchildtwo WHERE temple_name = ? AND d_in = 0 LIMIT 1`,
            [altName],
            cntxtDtls,
            function (dupErr2, dupRows2) {
              if (dupErr2) return callback(dupErr2, null);
              if (dupRows2 && dupRows2.length) {
                return callback(new Error("DUPLICATE_LEDGER_NAME"), null);
              }
              return insertPersonLedgerRow(parentSubchildId, personLabel, altName, userId, g, cntxtDtls, callback);
            }
          );
        }
      );
    }
  );
};

// Van hirer ledger — same idea as ensurePersonLedger, but lives under Receivables
// (Assets > Current Assets > Receivables > Hirers, subgroup id=3) since the money
// is owed TO the company rather than the other way round, and dedupes by phone
// number (not name) so a repeat customer whose name is typed slightly differently
// on a later booking still reuses their existing ledger instead of forking a new one.
var RECEIVABLES_HIRERS_CONFIG = {
  parentSubgroupId: 3, districtId: "1", staticname: "ASSETS",
  mandalId: "2", mandalName: "2) CURRENT ASSETS", childLabel: "b) Receivables",
};

exports.ensureHirerLedger = function (fullName, phone, userId, callback) {
  var cntxtDtls = "in ensureHirerLedger";
  var name = String(fullName || "").trim();
  var phoneNum = String(phone || "").trim();
  if (!name) return callback(null, null);

  dbutil.execupdateQuery(
    sqldb,
    `SELECT id FROM mainmasterssubchild WHERE temple_name = 'Hirers' AND parent_subgroup_id = 3 AND d_in = 0 LIMIT 1`,
    [],
    cntxtDtls,
    function (err, rows) {
      if (err) return callback(err, null);
      if (!rows || !rows.length) {
        return callback(new Error('No "Hirers" ledger container found under Receivables'), null);
      }
      var parentSubchildId = rows[0].id;

      var lookupByPhone = function (next) {
        if (!phoneNum) return next(null, null);
        dbutil.execupdateQuery(
          sqldb,
          `SELECT id FROM mainmasterssubchildtwo WHERE phone_number = ? AND parent_subgroup_id = 3 AND d_in = 0 LIMIT 1`,
          [phoneNum],
          cntxtDtls,
          function (err, rows) {
            if (err) return next(err, null);
            next(null, rows && rows.length ? rows[0].id : null);
          }
        );
      };

      lookupByPhone(function (err, existingId) {
        if (err) return callback(err, null);
        if (existingId) return callback(null, existingId);

        // No existing ledger for this phone — insert a new one, disambiguating the
        // display name on a rare temple_name collision (e.g. two different hirers
        // who happen to share a name but not a phone number).
        dbutil.execupdateQuery(
          sqldb,
          `SELECT 1 FROM mainmasterssubchildtwo WHERE temple_name = ? AND d_in = 0 LIMIT 1`,
          [name],
          cntxtDtls,
          function (dupErr, dupRows) {
            if (dupErr) return callback(dupErr, null);
            var finalName = (dupRows && dupRows.length && phoneNum) ? `${name} (${phoneNum})` : name;
            var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
            var g = RECEIVABLES_HIRERS_CONFIG;
            var dta = {
              parent_subgroup_id: g.parentSubgroupId,
              parent_subchild_id: parentSubchildId,
              ledger_type: "inherited",
              created_at: date,
              district_id: g.districtId,
              staticname: g.staticname,
              mandal_id: g.mandalId,
              mandal_name: g.mandalName,
              village_id: g.parentSubgroupId,
              temple_name: finalName,
              entry_by: userId,
              child: g.childLabel,
              i_ts: date,
              subchildtwo: "Hirers",
              subchildtwo_id: parentSubchildId,
              parent_grp_level: 4,
              phone_number: phoneNum || null,
            };
            dbutil.execupdateQuery(sqldb, `INSERT INTO mainmasterssubchildtwo SET ?`, dta, cntxtDtls, function (err, result) {
              if (err) return callback(err, null);
              callback(null, result.insertId);
            });
          }
        );
      });
    }
  );
};

exports.renamePersonLedger = function (ledgerId, newFullName, disambiguator, callback) {
  var cntxtDtls = "in renamePersonLedger";
  var name = String(newFullName || "").trim();
  if (!ledgerId || !name) return callback(null, null);

  dbutil.execupdateQuery(
    sqldb,
    `SELECT 1 FROM mainmasterssubchildtwo WHERE temple_name = ? AND d_in = 0 AND id != ? LIMIT 1`,
    [name, ledgerId],
    cntxtDtls,
    function (dupErr, dupRows) {
      if (dupErr) return callback(dupErr, null);
      var finalize = function (finalName) {
        dbutil.execupdateQuery(
          sqldb,
          `UPDATE mainmasterssubchildtwo SET temple_name = ? WHERE id = ?`,
          [finalName, ledgerId],
          cntxtDtls,
          function (err, result) {
            callback(err, err ? null : result);
          }
        );
      };
      if (!dupRows || !dupRows.length) return finalize(name);

      var altName = disambiguator ? `${name} (${disambiguator})` : null;
      if (!altName) return callback(new Error("DUPLICATE_LEDGER_NAME"), null);
      dbutil.execupdateQuery(
        sqldb,
        `SELECT 1 FROM mainmasterssubchildtwo WHERE temple_name = ? AND d_in = 0 AND id != ? LIMIT 1`,
        [altName, ledgerId],
        cntxtDtls,
        function (dupErr2, dupRows2) {
          if (dupErr2) return callback(dupErr2, null);
          if (dupRows2 && dupRows2.length) return callback(new Error("DUPLICATE_LEDGER_NAME"), null);
          finalize(altName);
        }
      );
    }
  );
};

exports.updateledgerflagMdl = function (data, callback) {
  var cntxtDtls = "in updateledgerflagMdl";
  var QRY_TO_EXEC = ``;
  if (data.updateledgerflagMdl == null) {
    QRY_TO_EXEC = `UPDATE mainmasterssubgroup SET has_direct_ledgers = 1, can_add_subgroups = 0  WHERE village_name='${data.village_name}';
        UPDATE mainmasterssubchild SET can_add_subgroups = '0' WHERE mainmasterssubchild.parent_subgroup_id = '${data.parent_subgroup_id}';
        `;
  }
  var m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        console.log(err);
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updateledgerflagMdl1 = function (data, callback) {
  var cntxtDtls = "in updateledgerflagMdl1";
  // var QRY_TO_EXEC = `select * from mainmasterssubchild where parent_subgroup_id = '${data.parent_subgroup_id}' and level_depth > '${data.parent_level}' `;

  var QRY_TO_EXEC = `update mainmasterssubchild set can_add_subgroups = '0' where parent_subgroup_id = '${data.parent_subgroup_id}' and level_depth > '${data.parent_level}' `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updateledgerflagMdl2 = function (data, callback) {
  var cntxtDtls = "in updateledgerflagMdl1";

  var QRY_TO_EXEC = ``;

  if (data.parent_level == 1) {
    console.log("Level 2 ledger Adding ");
    QRY_TO_EXEC = `
        update mainmastersadd set can_add_subgroups = '0', has_direct_ledgers ='1' where id = '${data.district_id}';
        update mainmastersgroup set can_add_subgroups = '0' where district_id = '${data.district_id}';
        update mainmasterssubgroup set can_add_subgroups = '0' where district_id = '${data.district_id}';
        update mainmasterssubchild set can_add_subgroups = '0' where district_id = '${data.district_id}';
        `;
  } else if (data.parent_level == 2) {
    console.log("Level 2 ledger Adding ");
    QRY_TO_EXEC = `
        update mainmastersgroup set can_add_subgroups = '0', has_direct_ledgers ='1' where district_id = '${data.district_id}' and id = '${data.mandal_id}';
        update mainmasterssubgroup set can_add_subgroups = '0' where district_id = '${data.district_id}' and mandal_id = '${data.mandal_id}';
        update mainmasterssubchild set can_add_subgroups = '0' where district_id = '${data.district_id}' and mandal_id = '${data.mandal_id}';
        `;
  }

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        // console.log(err)
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updateGroupNameMdl = function (data, callback) {
  var cntxtDtls = "in updateGroupNameMdl";
  var QRY_TO_EXEC = ``;

  if (data.level == 1) {
    QRY_TO_EXEC = `update mainmastersadd set districtnm='${data.editname}' where id = '${data.district_id}'`;
  } else if (data.level == 2) {
    QRY_TO_EXEC = `update mainmastersgroup set mandal_name='${data.editname}' where id = '${data.mandal_id}' and district_id = '${data.district_id}'`;
  } else if (data.level == 3) {
    QRY_TO_EXEC = `update mainmasterssubgroup set village_name='${data.editname}' where id = '${data.village_id}' and district_id = '${data.district_id}' and mandal_id = '${data.mandal_id}'`;
  } else if (data.level >= 4) {
    QRY_TO_EXEC = `update mainmasterssubchild set temple_name='${data.editname}' where village_id = '${data.village_id}' and district_id = '${data.district_id}' and mandal_id = '${data.mandal_id}' and id='${data.id}'`;
  }

  var m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        console.log(err);
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deleteGroupMdl = function (data, callback) {
  var cntxtDtls = "in deleteGroupMdl";
  var queries = [];

  // Cascade soft-delete: children → subgroups → group (deepest first)
  if (data.level == 2) {
    // Delete all ledgers, children, and subgroups under this group, then the group itself
    queries = [
      `UPDATE mainmasterssubchildtwo SET d_in=1 WHERE mandal_id='${data.id}'`,
      `UPDATE mainmasterssubchild SET d_in=1 WHERE mandal_id='${data.id}'`,
      `UPDATE mainmasterssubgroup SET d_in=1 WHERE mandal_id='${data.id}'`,
      `UPDATE mainmastersgroup SET d_in=1 WHERE id='${data.id}'`
    ];
  } else if (data.level == 3) {
    // Delete all ledgers and children under this subgroup, then the subgroup itself
    queries = [
      `UPDATE mainmasterssubchildtwo SET d_in=1 WHERE parent_subgroup_id='${data.id}'`,
      `UPDATE mainmasterssubchild SET d_in=1 WHERE parent_subgroup_id='${data.id}'`,
      `UPDATE mainmasterssubgroup SET d_in=1 WHERE id='${data.id}'`
    ];
  } else if (data.level >= 4) {
    // Delete all ledgers under this child, then the child itself
    queries = [
      `UPDATE mainmasterssubchildtwo SET d_in=1 WHERE parent_subchild_id='${data.id}'`,
      `UPDATE mainmasterssubchild SET d_in=1 WHERE id='${data.id}'`
    ];
  } else if (data.level == 1) {
    queries = [
      `UPDATE mainmastersadd SET d_in=1 WHERE id='${data.district_id}'`
    ];
  }

  if (queries.length === 0) {
    if (callback && typeof callback === 'function') callback(null, { affectedRows: 0 });
    return;
  }

  function runNext(index) {
    if (index >= queries.length) {
      if (callback && typeof callback === 'function') callback(null, { affectedRows: 1 });
      return;
    }
    dbutil.execupdateQuery(sqldb, queries[index], [], cntxtDtls, function (err, results) {
      if (err) {
        console.log(err);
        if (callback && typeof callback === 'function') callback(err, null);
        return;
      }
      runNext(index + 1);
    });
  }

  runNext(0);
};

exports.updateLedgerNameMdl = function (data, callback) {
  var cntxtDtls = "in updateLedgerNameMdl";
  var QRY_TO_EXEC = `update mainmasterssubchildtwo set temple_name="${data.temple_name}" where id='${data.id}'`;

  // console.log(QRY_TO_EXEC,7373)
  var m = [];
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        console.log(err);
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.moveLedgerMdl = function (data, callback) {
  var cntxtDtls = "in moveLedgerMdl";
  const nullOrVal = (v) => (v !== null && v !== undefined && v !== '') ? `'${v}'` : 'NULL';
  var QRY_TO_EXEC = `UPDATE mainmasterssubchildtwo SET
    district_id='${data.district_id}',
    staticname='${data.staticname ?? ''}',
    mandal_id=${nullOrVal(data.mandal_id)},
    mandal_name='${data.mandal_name ?? ''}',
    village_id=${nullOrVal(data.village_id)},
    parent_subgroup_id=${nullOrVal(data.parent_subgroup_id)},
    child='${data.child ?? ''}',
    parent_subchild_id=${nullOrVal(data.parent_subchild_id)},
    subchildtwo_id=${nullOrVal(data.parent_subchild_id)},
    subchildtwo='${data.subchildtwo ?? ''}',
    parent_grp_level=${data.parent_grp_level}
    WHERE id='${data.id}'`;
  var m = [];
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, results) {
      callback(err, results);
    });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.deleteLedgerMdl = function (data, callback) {
  var cntxtDtls = "in deleteLedgerMdl";
  var QRY_TO_EXEC = `update mainmasterssubchildtwo set d_in='1' where id='${data.id}'`;
  var m = [];
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        console.log(err);
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.updateGroupFlagsMdl = function (data, callback) {
  var cntxtDtls = "in updateGroupFlagsMdl";
  // Updates has_ledgers and can_add_subgroups on a group node (mainmasterssubchild)
  var QRY_TO_EXEC = `UPDATE mainmasterssubchild SET has_ledgers=${data.has_ledgers ?? 1}, can_add_subgroups=${data.can_add_subgroups ?? 0} WHERE id='${data.parent_id}'`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, function (err, results) {
    callback(err, results);
  });
};

exports.getRefDetailsMdl = function (data, callback) {
  var cntxtDtls = "in getRefDetailsMdl";

  // console.log(data, "Data received for fetching reference details");

  // Dynamic table name and conditions based on source_table
  let tableName = data.source_table;
  let statusCondition = "";
  let parentJoin = "";
  let parentFields = "";

  console.log(tableName);

  switch (tableName) {
    case "expensive_details":
      statusCondition = `d_in='0' AND admin_status='1'`;
      // No parent join needed for expensive_details
      parentJoin = "";
      parentFields = "";
      break;
    case "mainvoucher_subt":
      statusCondition = "d_in='0' AND t.status='1'";
      parentJoin = "LEFT JOIN mainvoucher_t p ON t.c_number = p.c_number AND p.d_in = 0";
      parentFields = `, p.id as parent_id,
                           p.voucherdate as parent_date,
                           p.vouchertype as parent_vouchertype,
                           p.description as parent_description,
                           p.valueDate as parent_valueDate,
                           p.vehicleNo as parent_vehicleNo,
                           p.name as parent_name`;
      break;
    case "fuelentry_subt":
      statusCondition = `d_in='0' AND t.admin_status='1'`;
      parentJoin = "LEFT JOIN fuel_entry p ON  t.c_number = p.c_number";
      parentFields = `, p.id as parent_id,
                           p.date as parent_date,
                           p.vehicle_number as parent_vehicle,
                           p.quantity_filled as parent_quantity,
                           p.price_per_liter as parent_price_per_liter,
                           p.driver1 as parent_driver1,
                           p.driver2 as parent_driver2,
                           p.service_number as parent_service,
                           p.avg_kmpl as parent_kmpl,
                           p.total_bill as parent_total_bill`;
      break;
    case "laundrybill_subt":
      statusCondition = "d_in='0' AND t.admin_status='1'";
      parentJoin = "LEFT JOIN laundrybill_maint p ON  t.c_number = p.c_number";
      parentFields = `, p.id as parent_id,
                           p.voucherdate as parent_date,
                           p.totalamount as parent_total_amount`;
      break;
    default:
      return callback(new Error("Invalid source table"));
  }

  const QRY_TO_EXEC = `
        -- Get all entries for this c_number from ONLY the specific source table with ledger and parent details
        SELECT t.*, 
               '${tableName}' as source_table,
               m.id as master_id,
               m.temple_name as ledger_name,
               m.staticname as ledger_static_name,
               m.mandal_name as ledger_mandal_name,
               m.subchildtwo as ledger_subchild_name${parentFields}
        FROM ${tableName} t
        LEFT JOIN mainmasterssubchildtwo m ON t.ledger_id = m.id AND m.d_in = '0'
        ${parentJoin}
        WHERE t.c_number = '${data.c_number}' AND t.${statusCondition} and t.d_in=0
        ORDER BY t.i_ts;
    `;

  console.log(QRY_TO_EXEC); //
  const handleResults = (err, results) => {
    if (err) return callback(err);

    // Deduplicate by sub-row id (parent JOIN can multiply rows if mainvoucher_t
    // has more than one row per c_number)
    const seen = new Set();
    const allEntries = (results || []).filter(row => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    // Primary data is the first entry
    const primaryData = allEntries[0] || null;

    // console.log(`Found ${allEntries.length} entries from table: ${tableName} for c_number: ${data.c_number}`);

    callback(null, {
      success: true,
      source_table: tableName,
      primary_data: primaryData,
      all_entries: allEntries,
      c_number: data.c_number,
      entry_count: allEntries.length,
    });
  };

  if (callback && typeof callback === "function") {
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, handleResults);
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

//     var cntxtDtls = "in getRefDetailsMdl";

//     console.log(data, "Data received for fetching reference details");

//     // Dynamic table name and conditions based on source_table
//     let tableName = data.source_table;
//     let statusCondition = '';

//     switch (tableName) {
//         case 'expensive_details':
//             statusCondition = "d_in='0' AND admin_status='1'";
//             break;
//         case 'mainvoucher_subt':
//             statusCondition = "d_in='0' AND status='1'";
//             break;
//         case 'fuelentry_subt':
//             statusCondition = "d_in='0' AND admin_status='1'";
//             break;
//         case 'laundrybill_subt':
//             statusCondition = "d_in='0' AND admin_status='1'";
//             break;
//         default:
//             return callback(new Error('Invalid source table'));
//     }

//     const QRY_TO_EXEC = `
//         -- Get all entries for this c_number from ONLY the specific source table
//         SELECT *, '${tableName}' as source_table
//         FROM ${tableName}
//         WHERE c_number = '${data.c_number}' AND ${statusCondition}
//         ORDER BY i_ts;
//     `;

//     console.log(QRY_TO_EXEC);

//     const handleResults = (err, results) => {
//         if (err) return callback(err);

//         // All entries from the specific table only
//         const allEntries = results || [];

//         // Primary data is the first entry
//         const primaryData = allEntries[0] || null;

//         console.log(`Found ${allEntries.length} entries from table: ${tableName} for c_number: ${data.c_number}`);

//         callback(null, {
//             success: true,
//             source_table: tableName,
//             primary_data: primaryData,
//             all_entries: allEntries,
//             c_number: data.c_number,
//             entry_count: allEntries.length
//         });
//     };

//     if (callback && typeof callback === "function") {
//         dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, handleResults);
//     } else {
//         return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
//     }
// };

exports.getalldrivers = function (callback) {
  const cntxtDtls = "in getalldrivers model";

  // SELECT * so every captured field (bank/DL/transport details, document
  // image URLs, etc.) reaches the frontend, matching gethelperMdl's Staff
  // and Helper queries — this used to be a hand-picked 9-column list that
  // silently dropped everything else, including all document images.
  //
  // dl_dob is the one native DATE column on this table (everything else
  // date-shaped is varchar); re-select it as plain 'YYYY-MM-DD' so it never
  // comes back as a JS Date object — mysql2 builds that Date at local
  // midnight, and JSON-serializing it to send over the API shifts it to UTC,
  // landing on the previous day once the frontend reads the date part back
  // out. The duplicate `dl_dob` alias overrides SELECT *'s raw column,
  // same trick as updatebusnumber's reg_date re-select above.
  const QRY_TO_EXEC = `SELECT *, DATE_FORMAT(dl_dob, '%Y-%m-%d') as dl_dob FROM driver_register WHERE d_in = '0' ORDER BY id DESC`;

  if (callback && typeof callback === "function") {
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      callback(err, results);
    });
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.gettriplogscountMdl = function (data, callback) {
  var cntxtDtls = "gettriplogscountMdl";
  var QRY_TO_EXEC = `SELECT d_in, COUNT(*) AS d_in_count FROM tripexpenses_data WHERE d_in IN (1, 2) GROUP BY d_in; `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.gettripupdatedmodaldataMdl = async function (data, callback) {
  const cntxtDtls = "gettripupdatedmodaldataMdl";

  // 1?? Query main table (only where d_in = 2)
  const mainQuery = `SELECT * FROM tripexpenses_data WHERE (d_in = 2  or d_in=0)  and c_number ='${data.serviceNo}' order by id asc`;

  try {
    // Fetch main table records
    const mainResults = await dbutil.execQuery(
      sqldb,
      mainQuery,
      cntxtDtls
    );

    // If no main records, return early
    if (!mainResults || mainResults.length === 0) {
      if (callback && typeof callback === "function") {
        return callback(null, []);
      } else {
        return [];
      }
    }

    // Extract all IDs to fetch only matching details
    const ids = mainResults.map((r) => r.id);
    const idList = ids.join(","); // e.g., "1,5,9"

    // 2?? Query sub table (expensive_details) ï¿½ only matching IDs
    const subQuery = `SELECT * FROM expensive_details WHERE serial_no IN (${idList})`;
    const subResults = await dbutil.execQuery(
      sqldb,
      subQuery,
      cntxtDtls
    );

    // 3?? Group sub table by serial_no
    const detailMap = {};
    subResults.forEach((row) => {
      if (!detailMap[row.serial_no]) detailMap[row.serial_no] = [];
      detailMap[row.serial_no].push(row);
    });

    // 4?? Attach sub rows to main rows
    const finalResult = mainResults.map((main) => ({
      ...main,
      details: detailMap[main.id] || [],
    }));

    // 5?? Return via callback or promise
    if (callback && typeof callback === "function") {
      callback(null, finalResult);
    } else {
      return finalResult;
    }
  } catch (err) {
    if (callback && typeof callback === "function") {
      callback(err, null);
    } else {
      throw err;
    }
  }
};

exports.gettripupdatedlogsMdl = function (data, callback) {
  var cntxtDtls = "gettripupdatedlogsMdl";
  var QRY_TO_EXEC = `SELECT 
  te.*, 
  te.id AS inid,
  d1.nickname AS driver1_name,
  d2.nickname AS driver2_name,
  h.helper_name AS helper_name,
  s.fullName AS conductor_name,
  CASE 
    WHEN te.paid_to_type = 'driver' THEN d3.nickname
    WHEN te.paid_to_type = 'helper' THEN h2.helper_name
    WHEN te.paid_to_type = 'staff' THEN s2.fullName
    ELSE NULL
  END AS paid_to_name
FROM 
  tripexpenses_data te
LEFT JOIN driver_register d1 ON te.driver1_id = d1.id
LEFT JOIN driver_register d2 ON te.driver2_id = d2.id
LEFT JOIN helper_register h ON te.helper_id = h.id
LEFT JOIN staff_register s ON te.conductor_id = s.id
LEFT JOIN driver_register d3 ON te.paid_to_id = d3.id
LEFT JOIN helper_register h2 ON te.paid_to_id = h2.id
LEFT JOIN staff_register s2 ON te.paid_to_id = s2.id
WHERE 
  te.d_in = 2
GROUP BY 
  te.c_number
ORDER BY 
  te.id;
`;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.gettripdeletedlogsMdl = function (data, callback) {
  var cntxtDtls = "gettripdeletedlogsMdl";
  var QRY_TO_EXEC = `
SELECT 
  te.*,
  d1.nickname AS driver1_name,
  d2.nickname AS driver2_name,
  h.helper_name AS helper_name,
  s.fullName AS conductor_name,
  CASE 
    WHEN te.paid_to_type = 'driver' THEN d3.nickname
    WHEN te.paid_to_type = 'helper' THEN h2.helper_name
    WHEN te.paid_to_type = 'staff' THEN s2.fullName
    ELSE NULL
  END AS paid_to_name
FROM 
  tripexpenses_data te
LEFT JOIN driver_register d1 ON te.driver1_id = d1.id
LEFT JOIN driver_register d2 ON te.driver2_id = d2.id
LEFT JOIN helper_register h ON te.helper_id = h.id
LEFT JOIN staff_register s ON te.conductor_id = s.id
LEFT JOIN driver_register d3 ON te.paid_to_id = d3.id
LEFT JOIN helper_register h2 ON te.paid_to_id = h2.id
LEFT JOIN staff_register s2 ON te.paid_to_id = s2.id
WHERE 
  te.id IN (
    SELECT MAX(id)
    FROM tripexpenses_data
    WHERE d_in = 1
    GROUP BY c_number
  );

   `;
  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

//admin approval
exports.getadminstatuscountMdl = function (data, callback) {
  var cntxtDtls = "gettriplogscountMdl";
  var QRY_TO_EXEC = `
  SELECT 
    admin_status, 
    COUNT(*) AS status_count
  FROM tripexpenses_data
  WHERE admin_status IN (1, 2)
  GROUP BY admin_status;
`;
  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getadminapprovedMdl = function (data, callback) {
  var cntxtDtls = "getadminapprovedMdl";
  var QRY_TO_EXEC = `SELECT * FROM tripexpenses_data WHERE admin_status = 1; `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getadminrejectedMdl = function (data, callback) {
  var cntxtDtls = "getadminrejectedMdl";
  var QRY_TO_EXEC = `SELECT * FROM tripexpenses_data WHERE admin_status = 2; `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};


exports.getservicenumMdl = function (data, callback) {
  var cntxtDtls = "getservicenumMdl";
  var QRY_TO_EXEC = `SELECT * FROM trip_created WHERE bus_no = '${data.busNo}' ORDER BY trip_date DESC LIMIT 1;`;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getpdfpatchdata1Mdl = function (data, callback) {
  var cntxtDtls = "getpdfpatchdata1Mdl";
  var QRY_TO_EXEC = `SELECT
  t.*,
  COALESCE(d1.nickname, d1.driver_name, t.driver1_name) AS driver1_name,
  COALESCE(d2.nickname, d2.driver_name, t.driver2_name) AS driver2_name,
  COALESCE(h.helper_name, t.helper_name) AS helper_name,
  COALESCE(s.fullName, t.conductor_name) AS conductor_name,
  CASE
    WHEN t.paid_to_type = 'driver' THEN COALESCE(d3.nickname, d3.driver_name, t.paid_to_name)
    WHEN t.paid_to_type = 'helper' THEN COALESCE(h2.helper_name, t.paid_to_name)
    WHEN t.paid_to_type = 'staff' THEN COALESCE(s2.fullName, t.paid_to_name)
    ELSE t.paid_to_name
  END AS paid_to_name
FROM
  trip_created t
LEFT JOIN 
  driver_register d1 ON t.driver1_id = d1.id
LEFT JOIN 
  driver_register d2 ON t.driver2_id = d2.id
LEFT JOIN 
  helper_register h ON t.helper_id = h.id
LEFT JOIN 
  staff_register s ON t.conductor_id = s.id
LEFT JOIN driver_register d3 ON t.paid_to_id = d3.id
LEFT JOIN helper_register h2 ON t.paid_to_id = h2.id
LEFT JOIN staff_register s2 ON t.paid_to_id = s2.id
WHERE 
  t.bus_no = '${data.bus_no}'
  AND t.trip_date = '${data.trip_date}'
  AND t.d_in = 0;
`;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getbetadataMdl = function (data, callback) {
  var cntxtDtls = "getbetadataMdl";
  var QRY_TO_EXEC = `SELECT * FROM driverone WHERE serviceNo='${data.service_no}' `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

//payables mdls-------------------------------
exports.payablesmaindarshanticketMdl = function (callback) {
  var cntxtDtls = "in maindarshanticketMdl";
  var QRY_TO_EXEC = `SELECT c_id FROM mainvoucher_t  WHERE d_in='0' order by c_id desc limit 1 ;`;
  // console.log(QRY_TO_EXEC, 22582);
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.payablessubmitvoucherentrymaindata = function (c_number, c_id, data, callback) {
  const cntxtDtls = "in submitvoucherentrymaindata";
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const dta = {
    description: data.expensedetails.description,
    name: data.expensedetails.name,
    valueDate: data.expensedetails.valueDate,
    vehicleNo: data.expensedetails.vehicleNo,
    creditanddebitamount: data.creditanddebitamount,
    i_ts: curDate,
    vouchertype: data.expensedetails.vouchertype.voucher_type,
    voucherdate: data.expensedetails.voucherdate,
    voucher_type_id: data.expensedetails.voucher_type_id,
    staff_type: data.expensedetails.staff_type,
    staff_type_id: data.expensedetails.staff_type_id,
    c_number: c_number,
    c_id: c_id,
    entry_by: data.named,
    user_id: data.user_id,
    is_payable: 1
  };
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_t SET ?;`;
  console.log(2222222222222222)
  if (callback && typeof callback === "function") {
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      callback
    );
  } else {
    return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
  }
};

exports.payablessubmitvoucherentrysubtable = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitvoucherentrysubtable";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.creditaddrowdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};
    const row = {
      lastinsert_id: lastid,
      account_type: credit.creditaccount || null,
      amount: credit.creditamount || 0,
      child: credit.creditledger?.child || null,
      district_id: credit.creditledger?.district_id || null,
      mandal_id: credit.creditledger?.mandal_id || null,
      subchildtwo: credit.creditledger?.subchildtwo || null,
      expensives: credit.creditledger?.temple_name || null,
      village_id: credit.creditledger?.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.named,
      user_id: data.user_id,
      staticname: credit.creditledger?.staticname || null,
      mandal_name: credit.creditledger?.mandal_name || null,
      subchildtwo_id: credit.creditledger?.subchildtwo_id || null,
      description: data.expensedetails.description,
      name: data.expensedetails.name,
      staff_type: data.expensedetails.staff_type,
      staff_type_id: data.expensedetails.staff_type_id,
      valueDate: data.expensedetails.valueDate,
      vehicleNo: data.expensedetails.vehicleNo,
      creditanddebitamount: data.creditanddebitamount,
      vouchertype: data.expensedetails.vouchertype.voucher_type,
      voucher_type_id: data.expensedetails.voucher_type_id,
      voucherdate: data.expensedetails.voucherdate,
      parent_subgroup_id: credit.creditledger?.parent_subgroup_id,
      parent_subchild_id: credit.creditledger?.parent_subchild_id,
      parent_grp_level: credit.creditledger?.parent_grp_level,
      ledger_id: credit.creditledger?.ledger_id
    };
    // console.log(row,2948)
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert:", insertRows);
  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_subt SET ?`;
  console.log(3333333333333333333);

  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          // console.error(? Insert error at index ${i}:, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};
exports.payablessubmitvoucherentrysubtableseconddata = function (
  c_number,
  c_id,
  data,
  lastid,
  callback
) {
  const cntxtDtls = "in submitvoucherentrysubtableseconddata";
  const moment = require("moment");
  const curDate = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
  const insertRows = [];

  // 1. Validate required arrays
  if (!Array.isArray(data.patientsTstdts)) {
    console.error("? patientsTstdts is not an array");
    return callback(new Error("Invalid or missing patientsTstdts array"));
  }

  if (!Array.isArray(data.creditaddrowdts)) {
    console.error("? creditaddrowdts is not an array");
    return callback(new Error("Invalid or missing creditaddrowdts array"));
  }

  //console.log()"? patientsTstdts length:", data.patientsTstdts.length);
  //console.log()"? creditaddrowdts length:", data.creditaddrowdts.length);

  // 2. Build insertRows
  data.patientsTstdts.forEach((patient, index) => {
    const credit = data.creditaddrowdts[index] || {};
    console.log(patient, 'patient-----------------------------------------------')
    const row = {
      lastinsert_id: lastid,
      account_type: patient.debitaccount || null,
      amount: patient.d_test_amount || 0,
      child: patient.d_test_name?.child || null,
      district_id: patient.d_test_name?.district_id || null,
      mandal_id: patient.d_test_name?.mandal_id || null,
      subchildtwo: patient.d_test_name?.subchildtwo || null,
      expensives: patient.d_test_name?.temple_name || null,
      village_id: patient.d_test_name?.village_id || null,
      i_ts: curDate,
      c_number: c_number,
      c_id: c_id,
      entry_by: data.named,
      user_id: data.user_id,
      staticname: patient.d_test_name?.staticname || null,
      mandal_name: patient.d_test_name?.mandal_name || null,
      subchildtwo_id: patient.d_test_name?.subchildtwo_id || null,
      description: data.expensedetails.description,
      name: data.expensedetails.name,
      valueDate: data.expensedetails.valueDate,
      vehicleNo: data.expensedetails.vehicleNo,
      creditanddebitamount: data.creditanddebitamount,
      vouchertype: data.expensedetails.vouchertype.voucher_type,
      voucher_type_id: data.expensedetails.voucher_type_id,
      staff_type: data.expensedetails.staff_type,
      staff_type_id: data.expensedetails.staff_type_id,
      voucherdate: data.expensedetails.voucherdate,
      parent_subgroup_id: patient.d_test_name?.parent_subgroup_id,
      parent_subchild_id: patient.d_test_name?.parent_subchild_id,
      parent_grp_level: patient.d_test_name?.parent_grp_level,
      ledger_id: patient.d_test_name?.ledger_id
    };
    // console.log(row,3033)
    insertRows.push(row);
  });

  if (insertRows.length === 0) {
    console.warn("?? No rows to insert into mainvoucher_subt.");
    return callback(null, { message: "No data to insert", count: 0 });
  }

  //console.log()"?? Prepared rows for insert:", insertRows);

  // 3. Insert each row sequentially
  const QRY_TO_EXEC = `INSERT INTO mainvoucher_subt SET ?`;
  console.log(444444444444);

  const insertNext = (i = 0) => {
    if (i >= insertRows.length) {
      //console.log()"? All rows inserted successfully.");
      return callback(null, {
        message: "Insert completed",
        count: insertRows.length,
      });
    }

    const rowData = insertRows[i];
    dbutil.sqlinjection(
      sqldb,
      QRY_TO_EXEC,
      rowData,
      cntxtDtls,
      (err, result) => {
        if (err) {
          // console.error(? Insert error at index ${i}:, err);
          return callback(err);
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(); // Start insert loop
};

// exports.payablesledgerupdate = function (data,callback) {
//   console.log(data,'data   --------------------------------------------10150')
//  console.log(data.selectedledgerdata[0].source_table,'data.selectedledgerdata[0].source_table');

//   var cntxtDtls = "in payablesledgerupdate";
//   let idx = 0;
//   let results = [];
//   // function next() {
//     if (idx >= data.selectedledgerdata.length) {
//       return callback && callback(null, results);
//     }

//     const row = data.selectedledgerdata[idx];
//    const tableName = data.selectedledgerdata[0].source_table;
//   var QRY_TO_EXEC = `
//     UPDATE ${tableName}
//     SET payment = '${data.selectedledgerdata[0].payment}', balance = '${data.selectedledgerdata[0].balanc}', payablesremarks = '${data.selectedledgerdata[0].payablesremarks}'
//     WHERE c_id = '${data.selectedledgerdata[0].c_id}' and c_number='${data.selectedledgerdata[0].c_number}'
//   `;
//   console.log(QRY_TO_EXEC, 22582);
//   if (callback && typeof callback == "function")
//     dbutil.execQuery(
//       sqldb,
//       QRY_TO_EXEC,
//       cntxtDtls,
//       function (err, results) {
//         callback(err, results);
//         return;
//       }
//     );
//   else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
// };

exports.payablesledgerupdate = function (data, settledByCNumber, callback) {
  var cntxtDtls = "in payablesledgerupdate";

  const TABLE_MAP = {
    expensive_details: 'expensive_details',
    mainvoucher_subt: 'mainvoucher_subt',
    fuelentry_subt: 'fuelentry_subt',
    laundrybill_subt: 'laundrybill_subt'
  };
  // expensive_details is already at MariaDB's max inline row size and can't
  // take this column — payment/balance still get recorded there, it just
  // can't be auto-relinked back to the settling voucher for editing later.
  const SUPPORTS_SETTLED_BY = {
    expensive_details: false,
    mainvoucher_subt: true,
    fuelentry_subt: true,
    laundrybill_subt: true
  };

  let idx = 0;
  let results = [];

  function next() {
    if (idx >= data.selectedledgerdata.length) {
      return callback && callback(null, results);
    }

    const row = data.selectedledgerdata[idx];
    const tableName = TABLE_MAP[row.source_table];
    if (!tableName) {
      return callback && callback(new Error('Invalid source_table: ' + row.source_table));
    }

    // `row.payment` from the frontend is only ever THIS settle action's own
    // contribution (capped at whatever was outstanding when it was typed) —
    // never a running total across every voucher that's ever touched this
    // row. Writing it straight to the payment column silently overwrote
    // (instead of adding to) any other still-valid voucher's earlier share.
    // `row.balance` is the one value that's always reliable here (always
    // freshly derived from the row's actual current remaining balance), so
    // payment is derived from it instead: payment = amount - balance, using
    // the row's own (immutable) amount column rather than trusting a second
    // independently-computed number from the client.
    const QRY_TO_EXEC = SUPPORTS_SETTLED_BY[row.source_table]
      ? `UPDATE ${tableName}
         SET payment = (amount - ?), balance = ?, payablesremarks = ?, isedited=?, payables_settled_by = ?
         WHERE id = ? AND c_id = ? AND c_number = ? AND d_in='0'`
      : `UPDATE ${tableName}
         SET payment = (amount - ?), balance = ?, payablesremarks = ?, isedited=?
         WHERE id = ? AND c_id = ? AND c_number = ? AND d_in='0'`;

    const params = SUPPORTS_SETTLED_BY[row.source_table]
      ? [
          row.balance || 0,
          row.balance || 0,
          row.payablesremarks || null,
          row.isedited || 0,
          settledByCNumber || null,
          row.id,
          row.c_id,
          row.c_number
        ]
      : [
          row.balance || 0,
          row.balance || 0,
          row.payablesremarks || null,
          row.isedited || 0,
          row.id,
          row.c_id,
          row.c_number
        ];
    console.log(5555555555555555, QRY_TO_EXEC);

    dbutil.execQuery(
      sqldb,
      { sql: QRY_TO_EXEC, values: params },
      cntxtDtls,
      function (err, result) {
        if (err) return callback && callback(err);
        results.push(result);

        // expensive_details has no inline payables_settled_by column (row-size
        // limit) — record the settling voucher in the side table instead, so
        // unsettlePayablesRowsMdl/getpayablessettledrowsMdl can still find it.
        if (row.source_table === 'expensive_details' && settledByCNumber) {
          const linkQry = `INSERT INTO payables_settled_links (source_table, source_id, c_number)
            VALUES ('expensive_details', ?, ?)
            ON DUPLICATE KEY UPDATE c_number = VALUES(c_number)`;
          dbutil.execQuery(sqldb, { sql: linkQry, values: [row.id, settledByCNumber] }, cntxtDtls, function (linkErr) {
            if (linkErr) console.error('[payablesledgerupdate] settled-link upsert failed:', linkErr.message);
            idx++;
            next();
          });
          return;
        }

        idx++;
        next();
      }
    );
  }

  next();
};

// Read-only version of the history walk in unsettlePayablesRowsMdl below —
// figures out what a row's balance/settled-by WOULD become if voucher
// c_number's own settlement of it were undone, without actually undoing
// anything. Shared by unsettlePayablesRowsMdl (which performs the reset) and
// getpayablessettledrowsMdl (which needs it to show the edit screen the
// amount actually available to THIS voucher — not the row's full original
// amount, which may include other still-valid vouchers' shares).
function computeRestoreState(sourceTable, sourceId, c_number, cb) {
  const histQry = `SELECT c_number, balance_after, action FROM payables_payment_history
    WHERE source_table = ? AND source_id = ? ORDER BY id ASC`;
  dbutil.execQuery(sqldb, { sql: histQry, values: [sourceTable, sourceId] }, 'computeRestoreState', function (histErr, hist) {
    if (histErr || !Array.isArray(hist) || !hist.length) return cb(null, { restoreBalance: null, restoreSettledBy: null });
    let lastVSettleIdx = -1;
    for (let k = hist.length - 1; k >= 0; k--) {
      if (hist[k].c_number === c_number && hist[k].action === 'settled') { lastVSettleIdx = k; break; }
    }
    let i = lastVSettleIdx - 1;
    while (i >= 0 && hist[i].c_number === c_number) i--;
    const prev = i >= 0 ? hist[i] : null;
    if (!prev) return cb(null, { restoreBalance: null, restoreSettledBy: null });
    cb(null, {
      restoreBalance: Number(prev.balance_after) || 0,
      restoreSettledBy: prev.action === 'settled' ? prev.c_number : null,
    });
  });
}

// Returns the original transaction rows a given payables voucher settled —
// used to re-select/pre-fill them when editing that voucher from Voucher
// Approvals. expensive_details rows are looked up via payables_settled_links
// — see note in payablesledgerupdate. Each row also gets `available_balance`
// attached: the amount actually available to THIS voucher (its own share +
// whatever's still unpaid), not the row's full original amount.
exports.getpayablessettledrowsMdl = function (data, callback) {
  var cntxtDtls = "in getpayablessettledrowsMdl";
  const c_number = data.c_number;
  const QRY_TO_EXEC = `
    SELECT *, 'mainvoucher_subt' AS source_table FROM mainvoucher_subt WHERE payables_settled_by = ? AND d_in='0';
    SELECT *, 'fuelentry_subt' AS source_table FROM fuelentry_subt WHERE payables_settled_by = ? AND d_in='0';
    SELECT *, 'laundrybill_subt' AS source_table FROM laundrybill_subt WHERE payables_settled_by = ? AND d_in='0';
    SELECT ed.*, 'expensive_details' AS source_table
      FROM expensive_details ed
      JOIN payables_settled_links psl ON psl.source_table='expensive_details' AND psl.source_id = ed.id
      WHERE psl.c_number = ? AND ed.d_in='0';
  `;
  const params = [c_number, c_number, c_number, c_number];
  if (!(callback && typeof callback === "function")) return dbutil.execQuery(sqldb, { sql: QRY_TO_EXEC, values: params }, cntxtDtls);

  dbutil.execQuery(sqldb, { sql: QRY_TO_EXEC, values: params }, cntxtDtls, function (err, results) {
    if (err) return callback(err, null);
    const combined = [].concat(results[0] || [], results[1] || [], results[2] || [], results[3] || []);
    if (combined.length === 0) return callback(null, combined);

    let idx = 0;
    function next() {
      if (idx >= combined.length) return callback(null, combined);
      const row = combined[idx];
      computeRestoreState(row.source_table, row.id, c_number, function (_e, state) {
        row.available_balance = state.restoreBalance === null ? (Number(row.amount) || 0) : state.restoreBalance;
        idx++; next();
      });
    }
    next();
  });
};

// Bulk-inserts one payment-history row per entry — 'settled' rows after a
// voucher settles transactions, 'reversed' rows when that settlement is
// undone (edit re-selection or rejection). This is the only place the full
// settle/reverse timeline for a row is recorded — payables_settled_by only
// ever holds the single most recent voucher.
exports.insertPayablesPaymentHistoryMdl = function (entries, callback) {
  var cntxtDtls = "in insertPayablesPaymentHistoryMdl";
  if (!Array.isArray(entries) || entries.length === 0) {
    return callback && callback(null, { inserted: 0 });
  }
  const QRY_TO_EXEC = `INSERT INTO payables_payment_history
    (source_table, source_id, c_number, payment, balance_after, action, created_by_id, created_by_name) VALUES ?`;
  const values = entries.map(e => [
    e.source_table, e.source_id, e.c_number,
    e.payment || 0, e.balance_after || 0, e.action || 'settled',
    e.actor_id || '', e.actor_name || ''
  ]);
  dbutil.execQuery(sqldb, { sql: QRY_TO_EXEC, values: [values] }, cntxtDtls, callback);
};

// Full settle/reverse history for one source transaction row, newest last.
exports.getPayablesPaymentHistoryMdl = function (sourceTable, sourceId, callback) {
  var cntxtDtls = "in getPayablesPaymentHistoryMdl";
  const QRY_TO_EXEC = `SELECT * FROM payables_payment_history WHERE source_table = ? AND source_id = ? ORDER BY created_at ASC, id ASC`;
  dbutil.execQuery(sqldb, { sql: QRY_TO_EXEC, values: [sourceTable, sourceId] }, cntxtDtls, callback);
};

// Undoes this payables voucher's settlement of every row it currently holds
// (payables_settled_by/payables_settled_links pointing at it), restoring each
// row to whatever it looked like immediately *before* this voucher touched
// it — NOT a flat wipe to payment=0/balance=amount. A row can be partially
// paid by more than one voucher over time (payables_settled_by only ever
// points at the latest one); resetting to the pristine original amount on
// reject would silently erase an earlier voucher's still-approved payment
// too. The per-row payables_payment_history trail (every settle/reverse
// event, in order) is what lets us find that "state right before this
// voucher" instead — see payablesledgerupdate/getPayablesPaymentHistoryMdl.
exports.unsettlePayablesRowsMdl = function (c_number, actorId, actorName, callback) {
  var cntxtDtls = "in unsettlePayablesRowsMdl";
  const SELECT_QRY = `
    SELECT id, payment, balance, amount, 'mainvoucher_subt' AS source_table FROM mainvoucher_subt WHERE payables_settled_by = ? AND d_in='0';
    SELECT id, payment, balance, amount, 'fuelentry_subt' AS source_table FROM fuelentry_subt WHERE payables_settled_by = ? AND d_in='0';
    SELECT id, payment, balance, amount, 'laundrybill_subt' AS source_table FROM laundrybill_subt WHERE payables_settled_by = ? AND d_in='0';
    SELECT ed.id, ed.payment, ed.balance, ed.amount, 'expensive_details' AS source_table
      FROM expensive_details ed
      JOIN payables_settled_links psl ON psl.source_table='expensive_details' AND psl.source_id = ed.id
      WHERE psl.c_number = ? AND ed.d_in='0';
  `;
  const params = [c_number, c_number, c_number, c_number];
  const SUPPORTS_SETTLED_BY = { mainvoucher_subt: true, fuelentry_subt: true, laundrybill_subt: true, expensive_details: false };

  dbutil.execQuery(sqldb, { sql: SELECT_QRY, values: params }, cntxtDtls, function (err, results) {
    if (err || !results) return callback && callback(err);
    const rows = [].concat(results[0] || [], results[1] || [], results[2] || [], results[3] || []);
    if (rows.length === 0) return callback && callback(null, { affected: 0 });

    let idx = 0;
    function next() {
      if (idx >= rows.length) return callback && callback(null, { affected: rows.length });
      const row = rows[idx];

      computeRestoreState(row.source_table, row.id, c_number, function (_e, state) {
        const restoreBalance = state.restoreBalance;
        const restoreSettledBy = state.restoreSettledBy;

        const restoredBalance = restoreBalance !== null ? restoreBalance : (Number(row.amount) || 0);
        exports.insertPayablesPaymentHistoryMdl([{
          source_table: row.source_table, source_id: row.id, c_number,
          payment: row.payment || 0, balance_after: restoredBalance,
          action: 'reversed', actor_id: actorId, actor_name: actorName,
        }], function (logErr) {
          if (logErr) console.error('[unsettlePayablesRowsMdl] history log failed for', c_number, row.source_table, row.id);

          const tableName = row.source_table;
          // Falling all the way back to unpaid uses `balance=amount` (a
          // column reference, not a bound value) — kept as its own branch
          // rather than trying to parameterize a column name.
          const fellBackToZero = restoreBalance === null;
          // isedited is a tri-state the frontend reads to decide what to show:
          // 0 = untouched (displays the full original amount, ignoring
          // balance!), 1 = partially paid, 2 = fully paid/closed. Restoring
          // payment/balance to a still-partial state but leaving isedited=0
          // was the actual bug — the row's balance column was correct, but
          // the frontend ignored it and showed the full amount anyway.
          const restoredIsEdited = fellBackToZero ? 0 : (restoreBalance > 0 ? 1 : 2);
          // payment is derived as amount - balance (not written from
          // restorePayment directly) — same reasoning as payablesledgerupdate:
          // balance_after in the history trail is reliably cumulative, but a
          // payment value logged before this fix could itself be stale, so
          // the row's own amount column is the trustworthy anchor.
          const finalQry = fellBackToZero
            ? (SUPPORTS_SETTLED_BY[tableName]
                ? `UPDATE ${tableName} SET payment=0, balance=amount, payablesremarks=NULL, isedited=0, payables_settled_by=NULL WHERE id=? AND d_in='0'`
                : `UPDATE ${tableName} SET payment=0, balance=amount, payablesremarks=NULL, isedited=0 WHERE id=? AND d_in='0'`)
            : (SUPPORTS_SETTLED_BY[tableName]
                ? `UPDATE ${tableName} SET payment=(amount - ?), balance=?, payablesremarks=NULL, isedited=?, payables_settled_by=? WHERE id=? AND d_in='0'`
                : `UPDATE ${tableName} SET payment=(amount - ?), balance=?, payablesremarks=NULL, isedited=? WHERE id=? AND d_in='0'`);
          const finalVals = fellBackToZero
            ? [row.id]
            : (SUPPORTS_SETTLED_BY[tableName]
                ? [restoreBalance, restoreBalance, restoredIsEdited, restoreSettledBy, row.id]
                : [restoreBalance, restoreBalance, restoredIsEdited, row.id]);

          dbutil.execQuery(sqldb, { sql: finalQry, values: finalVals }, cntxtDtls, function (updErr) {
            if (updErr) console.error('[unsettlePayablesRowsMdl] row update failed for', c_number, tableName, row.id, updErr.message);

            if (tableName !== 'expensive_details') { idx++; return next(); }

            if (!fellBackToZero && restoreSettledBy) {
              const linkQry = `INSERT INTO payables_settled_links (source_table, source_id, c_number)
                VALUES ('expensive_details', ?, ?) ON DUPLICATE KEY UPDATE c_number = VALUES(c_number)`;
              dbutil.execQuery(sqldb, { sql: linkQry, values: [row.id, restoreSettledBy] }, cntxtDtls, function () { idx++; next() });
            } else {
              dbutil.execQuery(sqldb, { sql: `DELETE FROM payables_settled_links WHERE source_table='expensive_details' AND source_id=?`, values: [row.id] }, cntxtDtls, function () { idx++; next() });
            }
          });
        });
      });
    }
    next();
  });
};

exports.getvoucherapproveddataMdl = function (callback) {
  var cntxtDtls = "in getvoucherapproveddataMdl";
  var QRY_TO_EXEC = `SELECT mv.*,
    GROUP_CONCAT(CASE WHEN sub.account_type='Debit Account'  THEN sub.expensives END SEPARATOR '|') AS debit_ledger_name,
    GROUP_CONCAT(CASE WHEN sub.account_type='Credit Account' THEN sub.expensives END SEPARATOR '|') AS credit_ledger_name,
    SUM(CASE WHEN sub.account_type='Debit Account' THEN sub.amount ELSE 0 END) AS debit_total
    FROM mainvoucher_t mv
    LEFT JOIN mainvoucher_subt sub ON mv.c_number = sub.c_number AND sub.d_in = 0
    WHERE mv.d_in = 0 AND mv.status = 1
    GROUP BY mv.c_number
    ORDER BY mv.id DESC;`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};
exports.getvouchersearchdataMdl = function (data, callback) {
  var cntxtDtls = "in getvouchersearchdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  let check2 = "";

  if (data.fromdate != "" && data.todate != "") {
    check2 = ` AND mv.voucherdate BETWEEN '${data.fromdate}' AND '${data.todate}' `;
  }

  let check = "";
  let check3 = "mv.d_in = 0";

  if (data.type == "1") {
    check = " and mv.status=1";
  } else if (data.type == "2") {
    check = " and mv.status=2";
  } else if (data.type == "3") {
    check3 = "mv.d_in = 1";
  } else if (data.type == "4") {
    check3 = "mv.d_in = 2";
  }

  var QRY_TO_EXEC = `SELECT mv.*,
    GROUP_CONCAT(CASE WHEN sub.account_type='Debit Account'  THEN sub.expensives END SEPARATOR '|') AS debit_ledger_name,
    GROUP_CONCAT(CASE WHEN sub.account_type='Credit Account' THEN sub.expensives END SEPARATOR '|') AS credit_ledger_name,
    SUM(CASE WHEN sub.account_type='Debit Account' THEN sub.amount ELSE 0 END) AS debit_total
    FROM mainvoucher_t mv
    LEFT JOIN mainvoucher_subt sub ON mv.c_number = sub.c_number AND sub.d_in = 0
    WHERE ${check3} ${check2} ${check}
    GROUP BY mv.c_number
    ORDER BY mv.id DESC;`;
  console.log(QRY_TO_EXEC, 'QRY_TO_EXEC');

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};


// Garage Module Models ---------------------------------------------------------------------------------------------------------------------


exports.getrepairentryMdl = function (data, callback) {
  var cntxtDtls = "getrepairentryMdl";
  var QRY_TO_EXEC = `
  SELECT vj.*,
    COALESCE(dr.driver_name, dr.nickname, '') AS driver_name,
    sr.fullName AS staff_name,
    rc.name AS repair_category_name,
    (SELECT GROUP_CONCAT(rc2.name ORDER BY jc2.id SEPARATOR ', ')
     FROM job_categories jc2
     JOIN repair_category rc2 ON rc2.id = jc2.category_id
     WHERE jc2.job_card_id = vj.id AND jc2.d_in = 0) AS all_categories,
    (SELECT COUNT(*) FROM job_categories WHERE job_card_id = vj.id AND d_in = 0) AS category_count,
    COALESCE((SELECT SUM(jp.amount) FROM job_parts_used jp WHERE jp.job_card_id = vj.id AND jp.d_in = 0), 0) AS parts_cost,
    GREATEST(COALESCE(vj.amount, 0) - COALESCE((SELECT SUM(jp.amount) FROM job_parts_used jp WHERE jp.job_card_id = vj.id AND jp.d_in = 0), 0), 0) AS labour_cost,
    COALESCE(vj.amount, (SELECT SUM(jp.amount) FROM job_parts_used jp WHERE jp.job_card_id = vj.id AND jp.d_in = 0), 0) AS total_amount,
    (SELECT s.action_at FROM job_approval_stages s WHERE s.job_card_id = vj.id AND s.action IN ('completed','quick_completed') AND s.d_in = 0 ORDER BY s.action_at DESC LIMIT 1) AS completed_date,
    (SELECT GROUP_CONCAT(CONCAT(COALESCE(ms.temple_name, 'Ledger'), ':', jle.amount) ORDER BY jle.id SEPARATOR '|')
     FROM job_ledger_entries jle LEFT JOIN mainmasterssubchildtwo ms ON ms.id = jle.ledger_id
     WHERE jle.job_card_id = vj.id AND jle.entry_type = 'debit') AS debit_ledgers,
    (SELECT GROUP_CONCAT(CONCAT(COALESCE(ms.temple_name, 'Ledger'), ':', jle.amount) ORDER BY jle.id SEPARATOR '|')
     FROM job_ledger_entries jle LEFT JOIN mainmasterssubchildtwo ms ON ms.id = jle.ledger_id
     WHERE jle.job_card_id = vj.id AND jle.entry_type = 'credit') AS credit_ledgers
  FROM vehicle_jobs vj
  LEFT JOIN driver_register dr ON dr.id = vj.reported_driver_id
  LEFT JOIN repair_category rc ON rc.id = vj.repair_category_id
  LEFT JOIN staff_register sr ON sr.id = vj.assigned_to
  WHERE vj.d_in = 0
  ORDER BY vj.id DESC;
  `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.postrepairentryMdl = function (data, callback) {
  var cntxtDtls = "postrepairentryMdl";
  var QRY_TO_EXEC = `SELECT * FROM driverone WHERE serviceNo='${data.service_no}' `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getstaffdataMdl = function (data, callback) {
  var cntxtDtls = "getstaffdataMdl";
  var QRY_TO_EXEC = `SELECT * FROM staff_register where d_in=0`;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getallrepairCategoryMdl = function (data, callback) {
  var cntxtDtls = "getallrepairCategoryMdl";
  var QRY_TO_EXEC = `SELECT * FROM repair_category where d_in=0`;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addrepaircategoryMdl = function (data, callback) {
  var cntxtDtls = "addrepaircategoryMdl";
  var QRY_TO_EXEC = `insert into repair_category(name,parent_id) values (?,?)`;
  var m = [data.name, data.parent_id || null];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

exports.editrepaircategoryMdl = function (data, callback) {
  var cntxtDtls = "editrepaircategoryMdl";
  var QRY_TO_EXEC = `update repair_category set name=? where id = ?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.name, data.id], cntxtDtls, callback);
};

exports.deleterepaircategoryMdl = function (data, callback) {
  var cntxtDtls = "deleterepaircategoryMdl";
  var QRY_TO_EXEC = `update repair_category set d_in=1 where id = ?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

exports.getallrepairpartsMdl = function (data, callback) {
  var cntxtDtls = "getallrepairpartsMdl";
  var QRY_TO_EXEC = `
    SELECT p.*, rc.name AS category_name
    FROM parts_master p
    LEFT JOIN repair_category rc ON rc.id = p.category_id AND rc.d_in = 0
    WHERE p.d_in = 0
  `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addrepairpaMdl = function (data, callback) {
  var cntxtDtls = "addrepairpaMdl";
  var QRY_TO_EXEC = `insert into parts_master(part_number,part_name,category_id,price) values(?,?,?,?)`;
  var m = [data.part_number || '', data.part_name, data.category_id || null, data.price];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

exports.editrepairpartsMdl = function (data, callback) {
  var cntxtDtls = "editrepairpartsMdl";
  var QRY_TO_EXEC = `update parts_master set part_number=?, part_name=?, category_id=?, price=? where part_id=?`;
  var m = [data.part_number || '', data.part_name, data.category_id || null, data.price, data.id];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

exports.deleterepairpartsMdl = function (data, callback) {
  var cntxtDtls = "deleterepairpartsMdl";
  var QRY_TO_EXEC = `update parts_master set d_in=1 where part_id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

exports.editPartPriceMdl = function (data, callback) {
  var cntxtDtls = "editPartPriceMdl";
  var pid   = parseInt(data.id)   || 0;
  var price = parseFloat(data.price) || 0;
  var QRY_TO_EXEC = `
    INSERT INTO parts_price_history(part_id, old_price, new_price)
    SELECT part_id, price, ${price} FROM parts_master WHERE part_id = ${pid};
    UPDATE parts_master SET price = ${price} WHERE part_id = ${pid};
  `;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.getPartPriceHistoryMdl = function (data, callback) {
  var cntxtDtls = "getPartPriceHistoryMdl";
  var pid = parseInt(data.part_id) || 0;
  var QRY_TO_EXEC = `SELECT * FROM parts_price_history WHERE part_id = ${pid} AND d_in = 0 ORDER BY changed_at DESC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};




exports.JobCarduniquenoMdl = function (callback) {
  var cntxtDtls = "in JobCarduniquenoMdl";
  var QRY_TO_EXEC = `SELECT c_id FROM vehicle_jobs WHERE d_in='0' order by c_id desc limit 1;`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      callback(err, results);
      return;
    });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.todayJobCountMdl = function (callback) {
  var cntxtDtls = "in todayJobCountMdl";
  var QRY_TO_EXEC = `SELECT COUNT(*) as cnt FROM vehicle_jobs WHERE job_card_number LIKE CONCAT('J', DATE_FORMAT(CURDATE(), '%y%m%d'), '%');`;
  if (callback && typeof callback == "function")
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) {
      callback(err, results);
      return;
    });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};


exports.addJobCategoriesMdl = function (jobId, jobCardNumber, jobRows, callback) {
  var cntxtDtls = "addJobCategoriesMdl";
  var values = jobRows.map(function(r) {
    var desc = (r.description || '').replace(/'/g, "''");
    return `('${jobId}', '${jobCardNumber}', '${r.category}', '${r.priority || 'Medium'}', '${r.technician || 0}', '${desc}')`;
  }).join(', ');
  var QRY_TO_EXEC = `INSERT INTO job_categories(job_card_id, job_card_number, category_id, priority, technician_id, description) VALUES ${values}`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.getJobCategoriesMdl = function (data, callback) {
  var cntxtDtls = "getJobCategoriesMdl";
  var jobId = parseInt(data.job_card_id) || 0;
  var QRY_TO_EXEC = `
    SELECT jc.*, rc.name AS category_name, sr.fullName AS technician_name
    FROM job_categories jc
    LEFT JOIN repair_category rc ON rc.id = jc.category_id
    LEFT JOIN staff_register sr ON sr.id = jc.technician_id
    WHERE jc.job_card_id = ${jobId} AND jc.d_in = 0
    ORDER BY jc.id ASC
  `;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.editJobMdl = function (data, callback) {
  var cntxtDtls = "editJobMdl";
  var jobId = parseInt(data.id) || 0;
  var jobNum = (data.job_card_number || '').replace(/'/g, "''");
  var firstRow = (data.job_rows || [])[0] || {};
  var nextDate = data.next_job_date ? `'${data.next_job_date}'` : 'NULL';
  var catRows = (data.job_rows || []).filter(function(r) { return r.category; });
  var catValues = catRows.map(function(r) {
    var desc = (r.description || '').replace(/'/g, "''");
    return `('${jobId}', '${jobNum}', '${r.category}', '${r.priority || 'Medium'}', '${r.technician || 0}', '${desc}')`;
  }).join(', ');
  var QRY_TO_EXEC = `
    UPDATE vehicle_jobs SET
      vehicle_number='${data.vehicle_number}',
      odometer_reading='${data.odometer_reading || ''}',
      reported_driver_id='${data.reported_driver_id || 0}',
      repair_category_id='${firstRow.category || 0}',
      priority='${firstRow.priority || 'Medium'}',
      assigned_to='${firstRow.technician || 0}',
      remarks='${(firstRow.description || '').replace(/'/g, "''")}',
      is_repeated_job='${data.is_repeated_job || 0}',
      next_job_date=${nextDate}
    WHERE id=${jobId};
    UPDATE job_categories SET d_in=1 WHERE job_card_id=${jobId};
    ${catValues ? `INSERT INTO job_categories(job_card_id,job_card_number,category_id,priority,technician_id,description) VALUES ${catValues};` : ''}
  `;
  // Save spare parts if provided
  var parts = (data.parts || []).filter(function(p) { return p.part_id; });
  console.log('[editJobMdl] jobId:', jobId, '| parts received:', parts.length, '| parts:', JSON.stringify(parts));
  if (parts.length > 0) {
    QRY_TO_EXEC += `UPDATE job_parts_used SET d_in = 2 WHERE job_card_id = '${jobId}';`;
    parts.forEach(function(p) {
      var pId  = String(p.part_id || '').replace(/'/g, "''");
      var pQty = parseFloat(p.qty)  || 1;
      var pRate = parseFloat(p.rate) || 0;
      var pAmt  = parseFloat(p.amount) || (pQty * pRate);
      QRY_TO_EXEC += `INSERT INTO job_parts_used (job_card_id, job_card_number, part_id, amount, qty, rate) VALUES ('${jobId}', '${jobNum}', '${pId}', '${pAmt}', '${pQty}', '${pRate}');`;
    });
  }
  // Save ledger entries if provided
  var blocks = data.voucher_blocks || [];
  var hasLedgers = blocks.some(function(b) {
    return (b.debit || []).some(function(e) { return e.ledger_id; }) || (b.credit || []).some(function(e) { return e.ledger_id; });
  });
  if (hasLedgers) {
    QRY_TO_EXEC += `DELETE FROM job_ledger_entries WHERE job_card_id = '${jobId}';`;
    blocks.forEach(function(block) {
      (block.debit || []).filter(function(e) { return e.ledger_id; }).forEach(function(e) {
        QRY_TO_EXEC += `INSERT INTO job_ledger_entries (job_card_id, job_card_number, ledger_id, amount, entry_type) VALUES ('${jobId}', '${jobNum}', '${e.ledger_id}', '${parseFloat(e.amount)||0}', 'debit');`;
      });
      (block.credit || []).filter(function(e) { return e.ledger_id; }).forEach(function(e) {
        QRY_TO_EXEC += `INSERT INTO job_ledger_entries (job_card_id, job_card_number, ledger_id, amount, entry_type) VALUES ('${jobId}', '${jobNum}', '${e.ledger_id}', '${parseFloat(e.amount)||0}', 'credit');`;
      });
    });
  }
  // Record edit event in approval stages so history timeline shows it
  var editedById   = (data.user_id || '').replace(/'/g, "''");
  var editedByName = (data.user_name || data.user_id || '').replace(/'/g, "''");
  var editReason   = (data.edit_reason || '').replace(/'/g, "''");
  QRY_TO_EXEC += `INSERT INTO job_approval_stages (job_card_id, job_card_number, stage, action, action_by_id, action_by_name, action_at, remarks, d_in) VALUES ('${jobId}', '${jobNum}', 'edit', 'edited', '${editedById}', '${editedByName}', NOW(), '${editReason}', 0);`;

  console.log('[editJobMdl] SQL length:', QRY_TO_EXEC.length, '| executing...');
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, function(err, result) {
    if (err) {
      console.log('[editJobMdl] DB ERROR:', err);
    } else {
      console.log('[editJobMdl] DB SUCCESS for jobId:', jobId);
    }
    callback(err, result);
  });
};

exports.addrepairentryMdl = function (c_id, c_number, data, callback) {
  var cntxtDtls = "addrepairentryMdl";
  var firstRow = (data.job_rows || [])[0] || {};
  var catId = firstRow.category || data.repair_category_id || 0;
  var priority = firstRow.priority || data.priority || 'Medium';
  var technician = firstRow.technician || data.assigned_to || 0;
  var remarks = (firstRow.description || data.remarks || '').replace(/'/g, "''");
  var nextDate = data.next_job_date ? `'${data.next_job_date}'` : 'NULL';
  var jobDate = data.job_date ? `'${data.job_date}'` : 'CURDATE()';
  var createdBy = (data.usr_nm || '').replace(/'/g, "''");
  var sourceReminderId  = data.source_reminder_id ? `'${data.source_reminder_id}'` : 'NULL';
  var sourceReminderRef = data.source_reminder_ref ? `'${String(data.source_reminder_ref).replace(/'/g, "''")}'` : 'NULL';
  var QRY_TO_EXEC = `insert into vehicle_jobs(c_id,job_card_number,vehicle_number,odometer_reading,repair_category_id,priority,reported_driver_id,remarks,assigned_to,state,is_repeated_job,next_job_date,job_date,created_by,source_reminder_id,source_reminder_ref) VALUES('${c_id}','${c_number}','${data.vehicle_number}','${data.odometer_reading || ''}','${catId}','${priority}','${data.reported_driver_id || 0}','${remarks}','${technician}','OPEN','${data.is_repeated_job || 0}',${nextDate},${jobDate},'${createdBy}',${sourceReminderId},${sourceReminderRef});`;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addJobPartsMdl = function (jobId, jobCardNumber, parts, callback) {
  var cntxtDtls = "addJobPartsMdl";
  var values = parts.map(function(p) {
    var amount = (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0);
    return `('${jobId}', '${jobCardNumber}', '${p.part_id}', '${amount}')`;
  }).join(', ');
  var QRY_TO_EXEC = `INSERT INTO job_parts_used (job_card_id, job_card_number, part_id, amount) VALUES ${values}`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};




exports.getpartsentryMdl = function (data, callback) {


  var cntxtDtls = "getpartsentryMdl";
  var QRY_TO_EXEC = `select * from job_parts_used where job_card_id = '${data.id}' and d_in=0;
  select is_repeated_job,next_job_date from vehicle_jobs where id = '${data.id}'
  `;

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.editrepairentryMdl = function (data, callback) {
  var cntxtDtls = "editrepairentryMdl";
  var QRY_TO_EXEC = `insert into vehicle_jobs(c_id,job_card_number,vehicle_number,odometer_reading,repair_category_id,priority,reported_driver_id,remarks,assigned_to,state,updated_at) VALUES('${data.c_id}','${data.job_card_number}','${data.vehicle_number}','${data.odometer_reading}','${data.repair_category_id}','${data.priority}','${data.reported_driver_id}','${data.remarks}','${data.assigned_to}','OPEN',NULL);update vehicle_jobs set d_in=2 where id='${data.id}'`;

  console.log(QRY_TO_EXEC)

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};




exports.submitrepairtrackingMdl = function (data, callback) {

  let cntxtDtls = "submitrepairtrackingMdl";

  // 0️⃣ ENSURE LEDGER ENTRIES TABLE EXISTS
  let QRY_TO_EXEC = `
    CREATE TABLE IF NOT EXISTS job_ledger_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_card_id VARCHAR(100),
      job_card_number VARCHAR(100),
      ledger_id INT,
      amount DECIMAL(12,2),
      entry_type ENUM('debit','credit'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 1️⃣ DELETE OLD PARTS
  QRY_TO_EXEC += `
    UPDATE job_parts_used
    SET d_in = 2
    WHERE job_card_id = '${data.id}';
  `;

  // 2️⃣ INSERT NEW PARTS
  (data.parts || []).forEach(p => {
    QRY_TO_EXEC += `
      INSERT INTO job_parts_used
      (job_card_id, job_card_number, part_id, amount)
      VALUES ('${data.id}', '${data.job_card_number}', '${p.part_id}', '${p.amount}');
    `;
  });

  // 3️⃣ UPDATE VEHICLE JOBS
  var _nextJobDate    = (data.next_job_date && data.next_job_date !== 'null') ? `'${data.next_job_date}'` : 'NULL';
  var _isRepeated     = data.is_job_repeated ? 1 : 0;
  var _targetState    = ['FINISHED','APPROVED','CLOSED'].includes((data.target_state||'').toUpperCase()) ? data.target_state.toUpperCase() : 'CLOSED';
  var _stageLabel     = _targetState === 'CLOSED' ? 'completed' : _targetState.toLowerCase();
  var _stageActor     = _targetState === 'FINISHED' ? 'technician' : (_targetState === 'APPROVED' ? 'manager' : 'accountant');
  var _stageRemarks   = (data.finish_remarks || data.approval_remarks || '').replace(/'/g, "''");
  var _entryBy        = (data.entry_by || '').replace(/'/g, "''");
  var _extraCols      = _targetState === 'FINISHED'
    ? `, finish_remarks='${(data.finish_remarks||'').replace(/'/g,"''")}'`
    : _targetState === 'APPROVED'
    ? `, approval_remarks='${(data.approval_remarks||'').replace(/'/g,"''")}'`
    : '';
  QRY_TO_EXEC += `
    UPDATE vehicle_jobs
    SET amount = '${data.total_amount}',
        is_parts_data_uploaded = ${_targetState === 'CLOSED' ? 1 : 0},
        is_repeated_job = ${_isRepeated},
        next_job_date = ${_nextJobDate},
        current_stage = '${_stageLabel}',
        state = '${_targetState}'${_extraCols}
    WHERE id = '${data.id}';
    INSERT INTO job_approval_stages (job_card_id, job_card_number, stage, action, action_by_id, action_by_name, remarks)
    VALUES ('${data.id}', '${data.job_card_number}', '${_stageActor}', '${_stageLabel}', '${data.user_id || 0}', '${_entryBy}', '${_stageRemarks}');
  `;

  // 4️⃣ LEDGER ENTRIES — clear old then insert new
  QRY_TO_EXEC += `DELETE FROM job_ledger_entries WHERE job_card_id = '${data.id}';`;
  (data.debit_ledgers || []).filter(e => e.ledger_id && e.amount).forEach(e => {
    QRY_TO_EXEC += `
      INSERT INTO job_ledger_entries (job_card_id, job_card_number, ledger_id, amount, entry_type)
      VALUES ('${data.id}', '${data.job_card_number}', '${e.ledger_id}', '${parseFloat(e.amount) || 0}', 'debit');
    `;
  });
  (data.credit_ledgers || []).filter(e => e.ledger_id && e.amount).forEach(e => {
    QRY_TO_EXEC += `
      INSERT INTO job_ledger_entries (job_card_id, job_card_number, ledger_id, amount, entry_type)
      VALUES ('${data.id}', '${data.job_card_number}', '${e.ledger_id}', '${parseFloat(e.amount) || 0}', 'credit');
    `;
  });

  console.log(QRY_TO_EXEC); // for debugging

  let m = [];

  if (callback && typeof callback == "function") {
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
      }
    );
  } else {
    return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls);
  }
};

exports.quickCompleteJobMdl = function (data, callback) {
  const jobId  = (data.id  || '').toString().replace(/'/g, "''");
  const jobNum = (data.job_card_number || '').replace(/'/g, "''");
  const desc   = (data.description || '').replace(/'/g, "''");
  const userId = data.user_id || 0;
  const QRY_TO_EXEC = `
    UPDATE vehicle_jobs
    SET current_stage = 'completed', state = 'CLOSED', approval_remarks = '${desc}'
    WHERE id = '${jobId}';
    INSERT INTO job_approval_stages (job_card_id, job_card_number, stage, action, action_by_id, action_by_name, remarks)
    VALUES ('${jobId}', '${jobNum}', 'accountant', 'quick_completed', '${userId}', '', '${desc}');
  `;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], 'quickCompleteJobMdl', callback);
};

exports.createGarageVouchersMdl = function (data, callback) {
  const moment    = require('moment');
  const curDate   = moment().utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss');
  const vDate     = moment().utcOffset('+05:30').format('YYYY-MM-DD');
  const datePart  = moment().utcOffset('+05:30').format('YYMMDD');

  dbutil.execupdateQuery(sqldb,
    `SELECT COUNT(*) as cnt FROM mainvoucher_t WHERE DATE(i_ts) = CURDATE()`,
    [], 'garageVoucherCount',
    function (err, countRes) {
      if (err) return callback(err, []);
      let baseCount = countRes && countRes[0] ? (parseInt(countRes[0].cnt) || 0) : 0;
      const blocks = data.voucher_blocks || [];
      const voucherNumbers = [];

      const insertBlock = function (idx) {
        if (idx >= blocks.length) return callback(null, voucherNumbers);
        const block    = blocks[idx];
        const c_number = 'V' + datePart + String(baseCount + idx + 1).padStart(3, '0');
        const c_id     = baseCount + idx + 1;
        const totalAmt = (block.debit || []).reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
        const descText = ((block.description || '') + ' [Job: ' + (data.job_card_number || '') + ']').trim();

        const mainRec = {
          description: descText,
          name: data.entry_by || '',
          valueDate: vDate,
          vehicleNo: data.vehicle_number || '',
          creditanddebitamount: totalAmt,
          i_ts: curDate,
          vouchertype: 'Journal',
          voucherdate: vDate,
          c_number: c_number,
          c_id: c_id,
          entry_by: data.entry_by || '',
          user_id: data.user_id || 0,
          d_in: 0,
          status: 0,
          source_type: 'job',
          job_card_number: data.job_card_number || '',
          driver_name: data.driver_name || '',
        };

        dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_t SET ?', mainRec, 'garageVoucherMain', function (err, result) {
          if (err) return callback(err, voucherNumbers);
          const lastId = result.insertId;

          const subRows = [];
          (block.debit || []).filter(function (e) { return e.ledger_id && e.amount; }).forEach(function (e) {
            subRows.push({ lastinsert_id: lastId, account_type: 'Debit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, c_id: c_id, i_ts: curDate, description: descText, vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
          });
          (block.credit || []).filter(function (e) { return e.ledger_id && e.amount; }).forEach(function (e) {
            subRows.push({ lastinsert_id: lastId, account_type: 'Credit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, c_id: c_id, i_ts: curDate, description: descText, vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
          });

          var si = 0;
          var insertSub = function () {
            if (si >= subRows.length) { voucherNumbers.push(c_number); return insertBlock(idx + 1); }
            dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_subt SET ?', subRows[si], 'garageVoucherSub', function (err) {
              if (err) return callback(err, voucherNumbers);
              si++; insertSub();
            });
          };
          insertSub();
        });
      };

      insertBlock(0);
    }
  );
};

exports.updateJobVoucherMdl = function (data, callback) {
  var moment = require('moment');
  var curDate = moment().utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss');
  var vDate   = moment().utcOffset('+05:30').format('YYYY-MM-DD');
  var c_number = data.c_number;
  var block   = (data.voucher_blocks || [])[0] || {};
  var debitEntries  = (block.debit  || []).filter(function (e) { return e.ledger_id && e.amount; });
  var creditEntries = (block.credit || []).filter(function (e) { return e.ledger_id && e.amount; });
  var totalAmt = debitEntries.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
  var descText = (block.description || data.description || '').replace(/'/g, "''");
  var userId   = data.user_id || 0;
  var userName = (data.user_name || '').replace(/'/g, "''");

  // 1. Soft-delete existing sub rows
  dbutil.execupdateQuery(sqldb,
    "UPDATE mainvoucher_subt SET d_in=1 WHERE c_number='" + c_number + "' AND d_in=0",
    [], 'updateJobVoucherDelete',
    function (err) {
      if (err) return callback(err);

      // 2. Get main row's id for lastinsert_id reference
      dbutil.execupdateQuery(sqldb,
        "SELECT id FROM mainvoucher_t WHERE c_number='" + c_number + "' AND d_in=0 LIMIT 1",
        [], 'updateJobVoucherGetMain',
        function (err, rows) {
          if (err) return callback(err);
          var lastId = rows && rows[0] ? rows[0].id : 0;

          // 3. Update mainvoucher_t header
          dbutil.execupdateQuery(sqldb,
            "UPDATE mainvoucher_t SET description='" + descText + "', creditanddebitamount=" + totalAmt + " WHERE c_number='" + c_number + "' AND d_in=0",
            [], 'updateJobVoucherMain',
            function (err) {
              if (err) return callback(err);

              // 4. Insert new subt rows
              var allEntries = [];
              debitEntries.forEach(function (e) {
                allEntries.push({ lastinsert_id: lastId, account_type: 'Debit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, i_ts: curDate, description: descText, creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: userId, d_in: 0 });
              });
              creditEntries.forEach(function (e) {
                allEntries.push({ lastinsert_id: lastId, account_type: 'Credit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, i_ts: curDate, description: descText, creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: userId, d_in: 0 });
              });

              if (allEntries.length === 0) return callback(null, { status: 200 });
              var si = 0;
              var insertNext = function () {
                if (si >= allEntries.length) return callback(null, { status: 200 });
                dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_subt SET ?', allEntries[si], 'updateJobVoucherSub', function (err) {
                  if (err) return callback(err);
                  si++; insertNext();
                });
              };
              insertNext();
            }
          );
        }
      );
    }
  );
};

exports.changeJobSatusMdl = function (data, callback) {
  var cntxtDtls = "changeJobSatusMdl";
  var allowed = ['OPEN', 'FINISHED', 'APPROVED', 'REJECTED', 'CLOSED'];
  var newState = allowed.includes(data.state) ? data.state : 'CLOSED';
  var jobId     = String(data.id || '').replace(/'/g, "''");
  var jobNum    = (data.job_card_number || '').replace(/'/g, "''");
  var totalAmt  = parseFloat(data.total_amount) || 0;
  var QRY_TO_EXEC = `
    CREATE TABLE IF NOT EXISTS job_ledger_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_card_id VARCHAR(100),
      job_card_number VARCHAR(100),
      ledger_id INT,
      amount DECIMAL(12,2),
      entry_type ENUM('debit','credit'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  if (newState === 'FINISHED') {
    var remarks      = (data.finish_remarks || '').replace(/'/g, "''");
    var repeat       = data.is_repeated_job ? 1 : 0;
    var nextDate     = (data.next_job_date && data.next_job_date !== 'null') ? `'${data.next_job_date}'` : 'NULL';
    var finishById   = (data.user_id   || '0').toString().replace(/'/g, "''");
    var finishByName = (data.user_name || '').replace(/'/g, "''");
    QRY_TO_EXEC += `UPDATE vehicle_jobs SET state='FINISHED', current_stage='finished', finish_remarks='${remarks}', is_repeated_job=${repeat}, next_job_date=${nextDate}, amount='${totalAmt}' WHERE id='${jobId}';`;
    QRY_TO_EXEC += `INSERT INTO job_approval_stages (job_card_id, job_card_number, stage, action, action_by_id, action_by_name, action_at, remarks, d_in) VALUES ('${jobId}', '${jobNum}', 'technician', 'finished', '${finishById}', '${finishByName}', NOW(), '${remarks}', 0);`;
  } else if (newState === 'APPROVED') {
    var approvalRemarks  = (data.approval_remarks || '').replace(/'/g, "''");
    var approveById      = (data.user_id   || '0').toString().replace(/'/g, "''");
    var approveByName    = (data.user_name || '').replace(/'/g, "''");
    QRY_TO_EXEC += `UPDATE vehicle_jobs SET state='APPROVED', current_stage='approved', approval_remarks='${approvalRemarks}', amount='${totalAmt}' WHERE id='${jobId}';`;
    QRY_TO_EXEC += `INSERT INTO job_approval_stages (job_card_id, job_card_number, stage, action, action_by_id, action_by_name, action_at, remarks, d_in) VALUES ('${jobId}', '${jobNum}', 'manager', 'approved', '${approveById}', '${approveByName}', NOW(), '${approvalRemarks}', 0);`;
  } else if (newState === 'REJECTED') {
    var rejectRemarks  = (data.remarks || '').replace(/'/g, "''");
    var rejectById     = (data.user_id   || '0').toString().replace(/'/g, "''");
    var rejectByName   = (data.user_name || '').replace(/'/g, "''");
    QRY_TO_EXEC += `UPDATE vehicle_jobs SET state='REJECTED', current_stage='rejected' WHERE id='${jobId}';`;
    QRY_TO_EXEC += `INSERT INTO job_approval_stages (job_card_id, job_card_number, stage, action, action_by_id, action_by_name, action_at, remarks, d_in) VALUES ('${jobId}', '${jobNum}', 'manager', 'rejected', '${rejectById}', '${rejectByName}', NOW(), '${rejectRemarks}', 0);`;
  } else {
    QRY_TO_EXEC += `UPDATE vehicle_jobs SET state='${newState}' WHERE id='${jobId}';`;
  }

  if (newState === 'FINISHED' || newState === 'APPROVED') {
    var partCount = (data.parts || []).filter(function(p) { return p.part_id; }).length;
    var ledgerDebitCount = 0, ledgerCreditCount = 0;
    (data.voucher_blocks || []).forEach(function(b) {
      ledgerDebitCount  += (b.debit  || []).filter(function(e) { return e.ledger_id; }).length;
      ledgerCreditCount += (b.credit || []).filter(function(e) { return e.ledger_id; }).length;
    });
    console.log('[changeJobSatus] saving', newState, '| jobId:', jobId, '| parts:', partCount, '| debit ledgers:', ledgerDebitCount, '| credit ledgers:', ledgerCreditCount);
    // Save parts
    QRY_TO_EXEC += `UPDATE job_parts_used SET d_in = 2 WHERE job_card_id = '${jobId}';`;
    (data.parts || []).filter(function(p) { return p.part_id; }).forEach(function(p) {
      var pId   = String(p.part_id || '').replace(/'/g, "''");
      var pQty  = parseFloat(p.qty)  || 1;
      var pRate = parseFloat(p.rate) || 0;
      var pAmt  = parseFloat(p.amount) || (pQty * pRate);
      QRY_TO_EXEC += `INSERT INTO job_parts_used (job_card_id, job_card_number, part_id, amount, qty, rate) VALUES ('${jobId}', '${jobNum}', '${pId}', '${pAmt}', '${pQty}', '${pRate}');`;
    });
    // Save ledger entries from voucher blocks
    QRY_TO_EXEC += `DELETE FROM job_ledger_entries WHERE job_card_id = '${jobId}';`;
    (data.voucher_blocks || []).forEach(function(block) {
      (block.debit || []).filter(function(e) { return e.ledger_id; }).forEach(function(e) {
        QRY_TO_EXEC += `INSERT INTO job_ledger_entries (job_card_id, job_card_number, ledger_id, amount, entry_type) VALUES ('${jobId}', '${jobNum}', '${e.ledger_id}', '${parseFloat(e.amount)||0}', 'debit');`;
      });
      (block.credit || []).filter(function(e) { return e.ledger_id; }).forEach(function(e) {
        QRY_TO_EXEC += `INSERT INTO job_ledger_entries (job_card_id, job_card_number, ledger_id, amount, entry_type) VALUES ('${jobId}', '${jobNum}', '${e.ledger_id}', '${parseFloat(e.amount)||0}', 'credit');`;
      });
    });
  }

  let m = [];

  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      m,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getJobStageDataMdl = function (data, callback) {
  var jobId = String(data.id || '').replace(/'/g, "''");
  var QRY_TO_EXEC = `
    SELECT jp.part_id, jp.amount, jp.qty, jp.rate, pm.part_name
    FROM job_parts_used jp
    LEFT JOIN parts_master pm ON pm.part_id = jp.part_id
    WHERE jp.job_card_id = '${jobId}' AND COALESCE(jp.d_in, 0) != 2;

    SELECT jle.ledger_id, jle.amount, jle.entry_type, ms.temple_name AS ledger_name
    FROM job_ledger_entries jle
    LEFT JOIN mainmasterssubchildtwo ms ON ms.id = jle.ledger_id
    WHERE jle.job_card_id = '${jobId}';
  `;
  dbutil.execQuery(sqldb, QRY_TO_EXEC, 'getJobStageDataMdl', function (err, results) {
    if (err) return callback(err);
    callback(null, { parts: (results && results[0]) || [], ledgers: (results && results[1]) || [] });
  });
};

exports.getScheduledJobsMdl = function (data, callback) {
  var QRY_TO_EXEC = `
    SELECT vj.*,
      COALESCE(dr.driver_name, dr.nickname, '') AS driver_name,
      rc.name AS repair_category_name,
      (SELECT GROUP_CONCAT(rc2.name ORDER BY jc2.id SEPARATOR ', ')
       FROM job_categories jc2
       JOIN repair_category rc2 ON rc2.id = jc2.category_id
       WHERE jc2.job_card_id = vj.id AND jc2.d_in = 0) AS all_categories,
      DATEDIFF(vj.next_job_date, CURDATE()) AS days_until,
      (SELECT rem.ref_number FROM service_reminders rem WHERE rem.source_job_card_id = vj.id AND rem.d_in = 0 ORDER BY rem.id DESC LIMIT 1) AS generated_reminder_ref,
      (SELECT rem.job_card_number FROM service_reminders rem WHERE rem.source_job_card_id = vj.id AND rem.d_in = 0 ORDER BY rem.id DESC LIMIT 1) AS generated_job_number
    FROM vehicle_jobs vj
    LEFT JOIN driver_register dr ON dr.id = vj.reported_driver_id
    LEFT JOIN repair_category rc ON rc.id = vj.repair_category_id
    WHERE vj.d_in = 0
      AND (
        (vj.is_repeated_job = 1 AND vj.next_job_date IS NOT NULL)
        OR vj.insertion_type = 'Automatic'
      )
    ORDER BY vj.next_job_date ASC, vj.id DESC
  `;
  dbutil.execQuery(sqldb, QRY_TO_EXEC, 'getScheduledJobsMdl', callback);
};

exports.getRepeatJobsMdl = function (data, callback) {
  var QRY_TO_EXEC = `
    SELECT vj.*,
      COALESCE(dr.driver_name, dr.nickname, '') AS driver_name,
      sr.fullName AS staff_name,
      rc.name AS repair_category_name,
      (SELECT GROUP_CONCAT(rc2.name ORDER BY jc2.id SEPARATOR ', ')
       FROM job_categories jc2
       JOIN repair_category rc2 ON rc2.id = jc2.category_id
       WHERE jc2.job_card_id = vj.id AND jc2.d_in = 0) AS all_categories,
      DATEDIFF(vj.next_job_date, CURDATE()) AS days_until,
      COALESCE((SELECT SUM(jp.amount) FROM job_parts_used jp WHERE jp.job_card_id = vj.id AND jp.d_in = 0), vj.amount, 0) AS total_amount,
      (SELECT rem.ref_number FROM service_reminders rem WHERE rem.source_job_card_id = vj.id AND rem.d_in = 0 ORDER BY rem.id DESC LIMIT 1) AS generated_reminder_ref,
      (SELECT rem.status FROM service_reminders rem WHERE rem.source_job_card_id = vj.id AND rem.d_in = 0 ORDER BY rem.id DESC LIMIT 1) AS generated_reminder_status,
      (SELECT rem.job_card_number FROM service_reminders rem WHERE rem.source_job_card_id = vj.id AND rem.d_in = 0 ORDER BY rem.id DESC LIMIT 1) AS generated_job_number
    FROM vehicle_jobs vj
    LEFT JOIN driver_register dr ON dr.id = vj.reported_driver_id
    LEFT JOIN repair_category rc ON rc.id = vj.repair_category_id
    LEFT JOIN staff_register sr ON sr.id = vj.assigned_to
    WHERE vj.d_in = 0 AND vj.is_repeated_job = 1
    ORDER BY
      CASE WHEN vj.next_job_date IS NULL THEN 1 ELSE 0 END,
      vj.next_job_date ASC,
      vj.id DESC
  `;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], 'getRepeatJobsMdl', callback);
};

exports.checkJobPermissionMdl = function (data, callback) {
  var userId   = data.user_id   || 0;
  var roleType = data.role_type != null ? String(data.role_type) : '2';
  if (roleType === '0' || roleType === '1') {
    return callback(null, [{ can_approve: 1, can_complete: 1 }]);
  }
  var QRY_TO_EXEC = `
    SELECT
      MAX(CASE WHEN sm.id = 200 AND p.can_add = 1 THEN 1 ELSE 0 END) AS can_approve,
      MAX(CASE WHEN sm.id = 201 AND p.can_add = 1 THEN 1 ELSE 0 END) AS can_complete
    FROM permissions p
    JOIN sub_modules sm ON sm.id = p.sub_module_id
    WHERE p.user_id = '${userId}' AND sm.module_id = 19 AND p.d_in = 0
  `;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], 'checkJobPermissionMdl', function(err, results) {
    callback(err, results);
  });
};

exports.jobWorkflowActionMdl = function (data, callback) {
  const cntxtDtls = 'jobWorkflowActionMdl';
  const stageMap = { start: 'in_progress', submit: 'pending_manager', approve: 'manager_approved', reject: 'manager_rejected' };
  const actionLabels = { start: 'started', submit: 'submitted', approve: 'approved', reject: 'rejected' };
  const stageLabels  = { start: 'technician', submit: 'technician', approve: 'manager', reject: 'manager' };
  const newStage = stageMap[data.action];
  if (!newStage) return callback(new Error('Invalid action: ' + data.action));
  const safeRemarks = (data.remarks || '').replace(/'/g, "''");
  const safeName    = (data.user_name || '').replace(/'/g, "''");
  const QRY_TO_EXEC = `
    UPDATE vehicle_jobs SET current_stage = '${newStage}' WHERE id = '${data.job_card_id}';
    INSERT INTO job_approval_stages (job_card_id, job_card_number, stage, action, action_by_id, action_by_name, remarks)
    VALUES ('${data.job_card_id}', '${data.job_card_number}', '${stageLabels[data.action]}', '${actionLabels[data.action]}', '${data.user_id || 0}', '${safeName}', '${safeRemarks}');
  `;
  let m = [];
  if (callback && typeof callback === 'function')
    dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls);
};

exports.getJobApprovalHistoryMdl = function (data, callback) {
  const cntxtDtls = 'getJobApprovalHistoryMdl';
  const QRY_TO_EXEC = `SELECT * FROM job_approval_stages WHERE job_card_id = '${data.job_card_id}' AND d_in = 0 ORDER BY action_at ASC;`;
  if (callback && typeof callback === 'function')
    dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls, function (err, results) { callback(err, results); });
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getJobFullHistoryMdl = function (data, callback) {
  var jobId = String(data.id || '').replace(/'/g, "''");
  var QRY_TO_EXEC = `
    SELECT vj.id, vj.job_date, vj.created_at, vj.created_by,
           vj.state, vj.current_stage,
           vj.finish_remarks, vj.approval_remarks,
           vj.amount, vj.vehicle_number, vj.odometer_reading,
           vj.is_repeated_job, vj.next_job_date,
           COALESCE(d.driver_name, d.nickname, '') AS driver_name
    FROM vehicle_jobs vj
    LEFT JOIN driver_register d ON d.id = vj.reported_driver_id
    WHERE vj.id = '${jobId}';

    SELECT s.id, s.stage, s.action, s.action_by_id, s.action_by_name, s.action_at, s.remarks
    FROM job_approval_stages s
    WHERE s.job_card_id = '${jobId}' AND s.d_in = 0
    ORDER BY s.action_at ASC;

    SELECT jp.id, jp.part_id, jp.amount, jp.qty, jp.rate, jp.d_in, pm.part_name
    FROM job_parts_used jp
    LEFT JOIN parts_master pm ON pm.part_id = jp.part_id
    WHERE jp.job_card_id = '${jobId}'
    ORDER BY jp.id ASC;

    SELECT jle.id, jle.ledger_id, jle.amount, jle.entry_type,
           ms.temple_name AS ledger_name
    FROM job_ledger_entries jle
    LEFT JOIN mainmasterssubchildtwo ms ON ms.id = jle.ledger_id
    WHERE jle.job_card_id = '${jobId}'
    ORDER BY jle.id ASC;
  `;
  dbutil.execQuery(sqldb, QRY_TO_EXEC, 'getJobFullHistoryMdl', function (err, results) {
    if (err) return callback(err);
    callback(null, {
      job:     (results[0] || [])[0] || {},
      stages:  results[1] || [],
      parts:   results[2] || [],
      ledgers: results[3] || [],
    });
  });
};

// Garage Extension: Service Reminders, Tyre Management, Battery Management -------------------------------------------------------------------------------

// ── Service Reminders ───────────────────────────────────────────────────────
exports.getServiceRemindersMdl = function (data, callback) {
  var cntxtDtls = "getServiceRemindersMdl";
  // Urgent reminders (< 10,000 km remaining to the due odometer, or due within
  // the next 10 days) are pinned above the rest, which keep the previous
  // nearest-due-date-first ordering.
  var QRY_TO_EXEC = `
    SELECT sr.*,
      (sr.due_odometer - b.odometer) AS km_remaining,
      DATEDIFF(sr.due_date, CURDATE()) AS days_remaining,
      (sr.status != 'Completed' AND (
        (sr.due_odometer IS NOT NULL AND b.odometer IS NOT NULL AND (sr.due_odometer - b.odometer) < 10000)
        OR (sr.due_date IS NOT NULL AND DATEDIFF(sr.due_date, CURDATE()) BETWEEN 0 AND 10)
      )) AS is_urgent
    FROM service_reminders sr
    LEFT JOIN busses b ON b.bus_no = sr.vehicle_number
    WHERE sr.d_in = 0
    ORDER BY is_urgent DESC, sr.due_date IS NULL, sr.due_date ASC, sr.id DESC
  `;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.todayReminderCountMdl = function (callback) {
  var cntxtDtls = "todayReminderCountMdl";
  var QRY_TO_EXEC = `SELECT COUNT(*) as cnt FROM service_reminders WHERE ref_number LIKE CONCAT('S', DATE_FORMAT(CURDATE(), '%y%m%d'), '%')`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.addServiceReminderMdl = function (data, callback) {
  var cntxtDtls = "addServiceReminderMdl";
  var QRY_TO_EXEC = `INSERT INTO service_reminders
    (ref_number, vehicle_number, reminder_type, due_date, due_odometer, last_done_odometer, remarks, is_repeating, repeat_interval, repeat_unit, created_by_id, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  var m = [
    data.ref_number || null, data.vehicle_number, data.reminder_type, data.due_date || null, data.due_odometer || null,
    data.last_done_odometer || null, data.remarks || '', data.is_repeating ? 1 : 0, data.repeat_interval || null, data.repeat_unit || null,
    data.user_id || '', data.usr_nm || '',
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

exports.editServiceReminderMdl = function (data, callback) {
  var cntxtDtls = "editServiceReminderMdl";
  var QRY_TO_EXEC = `UPDATE service_reminders SET vehicle_number=?, reminder_type=?, due_date=?, due_odometer=?, remarks=?, is_repeating=?, repeat_interval=?, repeat_unit=? WHERE id=?`;
  var m = [
    data.vehicle_number, data.reminder_type, data.due_date || null, data.due_odometer || null, data.remarks || '',
    data.is_repeating ? 1 : 0, data.repeat_interval || null, data.repeat_unit || null, data.id,
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

exports.getServiceReminderByIdMdl = function (id, callback) {
  var cntxtDtls = "getServiceReminderByIdMdl";
  var QRY_TO_EXEC = `SELECT * FROM service_reminders WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [id], cntxtDtls, callback);
};

exports.completeServiceReminderMdl = function (data, callback) {
  var cntxtDtls = "completeServiceReminderMdl";
  var QRY_TO_EXEC = `UPDATE service_reminders SET status='Completed', last_done_date=?, last_done_odometer=?, completed_at=NOW() WHERE id=?`;
  var m = [data.last_done_date || null, data.last_done_odometer || null, data.id];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

exports.deleteServiceReminderMdl = function (data, callback) {
  var cntxtDtls = "deleteServiceReminderMdl";
  var QRY_TO_EXEC = `UPDATE service_reminders SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

exports.linkJobCardToReminderMdl = function (data, callback) {
  var cntxtDtls = "linkJobCardToReminderMdl";
  var QRY_TO_EXEC = `UPDATE service_reminders SET job_card_number=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.job_card_number, data.id], cntxtDtls, callback);
};

// ── Tyre Inventory ───────────────────────────────────────────────────────────
exports.getTyreInventoryMdl = function (data, callback) {
  var cntxtDtls = "getTyreInventoryMdl";
  var QRY_TO_EXEC = `
    SELECT tm.*, tv.vendor_name,
      (SELECT GROUP_CONCAT(CONCAT(mvs.account_type, ': ', mvs.expensives, ' ₹', mvs.amount) SEPARATOR ' | ')
       FROM mainvoucher_subt mvs WHERE mvs.c_number = tm.voucher_number AND mvs.d_in=0) AS ledger_summary
    FROM tyre_master tm
    LEFT JOIN tyre_vendors tv ON tv.id = tm.vendor_id
    WHERE tm.d_in=0 ORDER BY tm.id DESC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

// Builds the debit/credit rows for a tyre voucher, dropping incomplete lines
// (mirrors _batteryVoucherRows).
function _tyreVoucherRows(debit, credit) {
  return {
    debit:  (debit  || []).filter(function (e) { return e.ledger_id && e.amount; }),
    credit: (credit || []).filter(function (e) { return e.ledger_id && e.amount; }),
  };
}

// Creates the accounting voucher for a standalone tyre purchase's debit/credit
// ledger entries. Mirrors createBatteryVoucherMdl, tagged source_type='tyre' so
// Voucher Approvals can show it came from Tyre Inventory.
exports.createTyreVoucherMdl = function (data, callback) {
  var moment   = require('moment');
  var curDate  = moment().utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss');
  var vDate    = moment().utcOffset('+05:30').format('YYYY-MM-DD');
  var datePart = moment().utcOffset('+05:30').format('YYMMDD');
  var rows = _tyreVoucherRows(data.debit_ledgers, data.credit_ledgers);
  if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, null);

  dbutil.execupdateQuery(sqldb, `SELECT COUNT(*) as cnt FROM mainvoucher_t WHERE DATE(i_ts) = CURDATE()`, [], 'tyreVoucherCount', function (err, countRes) {
    if (err) return callback(err);
    var baseCount = countRes && countRes[0] ? (parseInt(countRes[0].cnt) || 0) : 0;
    var c_number  = 'V' + datePart + String(baseCount + 1).padStart(3, '0');
    var c_id      = baseCount + 1;
    var totalAmt  = rows.debit.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var descText  = ((data.description || '') + ' [Tyre: ' + (data.tyre_code || '') + ']').trim();

    var mainRec = {
      description: descText, name: data.entry_by || '', valueDate: vDate,
      vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, i_ts: curDate,
      vouchertype: 'Journal', voucherdate: vDate, c_number: c_number, c_id: c_id,
      entry_by: data.entry_by || '', user_id: data.user_id || 0, d_in: 0, status: 0,
      source_type: 'tyre', tyre_code: data.tyre_code || '',
    };

    dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_t SET ?', mainRec, 'tyreVoucherMain', function (err, result) {
      if (err) return callback(err);
      var lastId = result.insertId;
      var subRows = [];
      rows.debit.forEach(function (e) {
        subRows.push({ lastinsert_id: lastId, account_type: 'Debit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, c_id: c_id, i_ts: curDate, description: descText, vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
      });
      rows.credit.forEach(function (e) {
        subRows.push({ lastinsert_id: lastId, account_type: 'Credit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, c_id: c_id, i_ts: curDate, description: descText, vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
      });

      var si = 0;
      var insertNext = function () {
        if (si >= subRows.length) return callback(null, c_number);
        dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_subt SET ?', subRows[si], 'tyreVoucherSub', function (err) {
          if (err) return callback(err);
          si++; insertNext();
        });
      };
      insertNext();
    });
  });
};

exports.addTyreInventoryMdl = function (data, callback) {
  var cntxtDtls = "addTyreInventoryMdl";
  var QRY_TO_EXEC = `INSERT INTO tyre_master
    (tyre_code, brand, size, serial_no, vendor_id, purchase_date, cost, status, remarks, created_by_id, created_by_name)
    VALUES (
      CONCAT('TYR-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(tyre_code, 5) AS UNSIGNED)), 0) + 1 FROM (SELECT tyre_code FROM tyre_master WHERE tyre_code REGEXP '^TYR-[0-9]+$') t), 4, '0')),
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`;
  var m = [
    data.brand || '', data.size || '', data.serial_no || '', data.vendor_id || null, data.purchase_date || null,
    data.cost || 0, data.status || 'In Stock', data.remarks || '',
    data.user_id || '', data.usr_nm || '',
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, result) {
    if (err) return callback(err, result);
    var rows = _tyreVoucherRows(data.debit_ledgers, data.credit_ledgers);
    if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, result);

    var tyreId = result.insertId;
    sqldb.query('SELECT tyre_code FROM tyre_master WHERE id=?', [tyreId], function (selErr, trows) {
      var tyreCode = (!selErr && trows && trows[0]) ? trows[0].tyre_code : '';
      exports.createTyreVoucherMdl({
        tyre_code: tyreCode, description: data.ledger_description,
        debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
        entry_by: data.usr_nm, user_id: data.user_id,
      }, function (vErr, voucherNumber) {
        if (vErr) { console.log('[addTyreInventoryMdl] voucher creation failed:', vErr.message || vErr); return callback(null, result); }
        if (!voucherNumber) return callback(null, result);
        dbutil.execupdateQuery(sqldb, `UPDATE tyre_master SET voucher_number=? WHERE id=?`, [voucherNumber, tyreId], 'addTyreLinkVoucher', function () {
          callback(null, result);
        });
      });
    });
  });
};

// Edits a tyre's core fields. When called with debit_ledgers/credit_ledgers
// (e.g. from the Scrap Tyre flow) it also raises a Journal voucher moving the
// tyre's value into the relevant stock ledger — mirrors addTyreInventoryMdl.
exports.editTyreInventoryMdl = function (data, callback) {
  var cntxtDtls = "editTyreInventoryMdl";
  var QRY_TO_EXEC = `UPDATE tyre_master SET brand=?, size=?, serial_no=?, vendor_id=?, purchase_date=?, cost=?, status=?, remarks=? WHERE id=?`;
  var m = [data.brand || '', data.size || '', data.serial_no || '', data.vendor_id || null, data.purchase_date || null, data.cost || 0, data.status || 'In Stock', data.remarks || '', data.id];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, result) {
    if (err) return callback(err, result);
    var rows = _tyreVoucherRows(data.debit_ledgers, data.credit_ledgers);
    if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, result);
    exports.createTyreVoucherMdl({
      debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
      description: data.ledger_description || 'Tyre scrapped', tyre_code: data.tyre_code || '',
      entry_by: data.usr_nm || '', user_id: data.user_id || 0,
    }, function (vErr) {
      if (vErr) console.log('[editTyreInventoryMdl] voucher creation failed:', vErr.message || vErr);
      callback(null, result);
    });
  });
};

exports.deleteTyreInventoryMdl = function (data, callback) {
  var cntxtDtls = "deleteTyreInventoryMdl";
  var QRY_TO_EXEC = `UPDATE tyre_master SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// Bulk-marks the selected tyres as Sold in one go and, when called with
// debit_ledgers/credit_ledgers, raises a single combined Journal voucher for
// the whole sale — mirrors editTyreInventoryMdl's scrap voucher, but one
// voucher covering every tyre instead of one per tyre.
exports.sellTyresMdl = function (data, callback) {
  var cntxtDtls = "sellTyresMdl";
  var ids = (data.tyre_ids || []).map(function (v) { return parseInt(v, 10); }).filter(function (v) { return !isNaN(v); });
  if (ids.length === 0) return callback(new Error('No tyres selected'));
  var placeholders = ids.map(function () { return '?'; }).join(',');
  var QRY_TO_EXEC = `UPDATE tyre_master SET status='Sold' WHERE id IN (${placeholders})`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, ids, cntxtDtls, function (err, result) {
    if (err) return callback(err, result);
    var rows = _tyreVoucherRows(data.debit_ledgers, data.credit_ledgers);
    if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, result);
    exports.createTyreVoucherMdl({
      debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
      description: data.ledger_description || 'Tyre sale', tyre_code: data.tyre_code || '',
      entry_by: data.usr_nm || '', user_id: data.user_id || 0,
    }, function (vErr) {
      if (vErr) console.log('[sellTyresMdl] voucher creation failed:', vErr.message || vErr);
      callback(null, result);
    });
  });
};

// ── Tyre Vendors ─────────────────────────────────────────────────────────────
exports.getTyreVendorsMdl = function (data, callback) {
  var cntxtDtls = "getTyreVendorsMdl";
  var QRY_TO_EXEC = `SELECT * FROM tyre_vendors WHERE d_in=0 ORDER BY vendor_name ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.addTyreVendorMdl = function (data, callback) {
  var cntxtDtls = "addTyreVendorMdl";
  var QRY_TO_EXEC = `INSERT INTO tyre_vendors (vendor_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.vendor_name], cntxtDtls, callback);
};

exports.editTyreVendorMdl = function (data, callback) {
  var cntxtDtls = "editTyreVendorMdl";
  var QRY_TO_EXEC = `UPDATE tyre_vendors SET vendor_name=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.vendor_name, data.id], cntxtDtls, callback);
};

exports.deleteTyreVendorMdl = function (data, callback) {
  var cntxtDtls = "deleteTyreVendorMdl";
  var QRY_TO_EXEC = `UPDATE tyre_vendors SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Tyre Sizes ───────────────────────────────────────────────────────────────
exports.getTyreSizesMdl = function (data, callback) {
  var cntxtDtls = "getTyreSizesMdl";
  var QRY_TO_EXEC = `SELECT * FROM tyre_sizes WHERE d_in=0 ORDER BY size_name ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.addTyreSizeMdl = function (data, callback) {
  var cntxtDtls = "addTyreSizeMdl";
  var QRY_TO_EXEC = `INSERT INTO tyre_sizes (size_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.size_name], cntxtDtls, callback);
};

exports.editTyreSizeMdl = function (data, callback) {
  var cntxtDtls = "editTyreSizeMdl";
  var QRY_TO_EXEC = `UPDATE tyre_sizes SET size_name=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.size_name, data.id], cntxtDtls, callback);
};

exports.deleteTyreSizeMdl = function (data, callback) {
  var cntxtDtls = "deleteTyreSizeMdl";
  var QRY_TO_EXEC = `UPDATE tyre_sizes SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Tyre Makes ───────────────────────────────────────────────────────────────
exports.getTyreMakesMdl = function (data, callback) {
  var cntxtDtls = "getTyreMakesMdl";
  var QRY_TO_EXEC = `SELECT * FROM tyre_makes WHERE d_in=0 ORDER BY make_name ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.addTyreMakeMdl = function (data, callback) {
  var cntxtDtls = "addTyreMakeMdl";
  var QRY_TO_EXEC = `INSERT INTO tyre_makes (make_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.make_name], cntxtDtls, callback);
};

exports.editTyreMakeMdl = function (data, callback) {
  var cntxtDtls = "editTyreMakeMdl";
  var QRY_TO_EXEC = `UPDATE tyre_makes SET make_name=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.make_name, data.id], cntxtDtls, callback);
};

exports.deleteTyreMakeMdl = function (data, callback) {
  var cntxtDtls = "deleteTyreMakeMdl";
  var QRY_TO_EXEC = `UPDATE tyre_makes SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Tyre Retread Entry ───────────────────────────────────────────────────────
exports.getTyreRetreadsMdl = function (data, callback) {
  var cntxtDtls = "getTyreRetreadsMdl";
  var QRY_TO_EXEC = `
    SELECT trl.*, tm.tyre_code, tm.brand, tm.size, tm.serial_no, tv.vendor_name
    FROM tyre_retread_log trl
    JOIN tyre_master tm ON tm.id = trl.tyre_id
    LEFT JOIN tyre_vendors tv ON tv.id = trl.vendor_id
    WHERE trl.d_in=0
    ORDER BY trl.id DESC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

// Logs the retread and flips the tyre's status. When called with
// debit_ledgers/credit_ledgers it also raises a Journal voucher moving the
// tyre's value from "New Tyres In Stock" into "Retreading Tyres In Stock".
exports.addTyreRetreadMdl = function (data, callback) {
  var cntxtDtls = "addTyreRetreadMdl";
  var QRY_TO_EXEC = `
    INSERT INTO tyre_retread_log (tyre_id, retread_date, vendor_id, cost, remarks, created_by_id, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    UPDATE tyre_master SET status='Retreaded' WHERE id=?;
  `;
  var m = [
    data.tyre_id, data.retread_date || null, data.vendor_id || null, data.cost || 0, data.remarks || '',
    data.user_id || '', data.usr_nm || '', data.tyre_id,
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, result) {
    if (err) return callback(err, result);
    var rows = _tyreVoucherRows(data.debit_ledgers, data.credit_ledgers);
    if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, result);
    exports.createTyreVoucherMdl({
      debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
      description: data.ledger_description || 'Tyre sent for retreading', tyre_code: data.tyre_code || '',
      entry_by: data.usr_nm || '', user_id: data.user_id || 0,
    }, function (vErr) {
      if (vErr) console.log('[addTyreRetreadMdl] voucher creation failed:', vErr.message || vErr);
      callback(null, result);
    });
  });
};

exports.deleteTyreRetreadMdl = function (data, callback) {
  var cntxtDtls = "deleteTyreRetreadMdl";
  var QRY_TO_EXEC = `UPDATE tyre_retread_log SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Tyre Repair ──────────────────────────────────────────────────────────────
exports.getTyreRepairsMdl = function (data, callback) {
  var cntxtDtls = "getTyreRepairsMdl";
  var QRY_TO_EXEC = `
    SELECT trp.*, tm.tyre_code, tm.brand, tv.vendor_name
    FROM tyre_repair_log trp
    JOIN tyre_master tm ON tm.id = trp.tyre_id
    LEFT JOIN tyre_vendors tv ON tv.id = trp.vendor_id
    WHERE trp.d_in=0
    ORDER BY trp.id DESC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

// Logs the repair. When called with debit_ledgers/credit_ledgers it also
// raises a Journal voucher for the repair cost — mirrors addTyreRetreadMdl.
exports.addTyreRepairMdl = function (data, callback) {
  var cntxtDtls = "addTyreRepairMdl";
  var QRY_TO_EXEC = `
    INSERT INTO tyre_repair_log (tyre_id, repair_date, vehicle_number, odometer, repair_type, vendor_id, cost, remarks, created_by_id, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  var m = [
    data.tyre_id, data.repair_date || null, data.vehicle_number || null, data.odometer || null,
    data.repair_type || '', data.vendor_id || null,
    data.cost || 0, data.remarks || '', data.user_id || '', data.usr_nm || '',
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, result) {
    if (err) return callback(err, result);
    var rows = _tyreVoucherRows(data.debit_ledgers, data.credit_ledgers);
    if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, result);
    exports.createTyreVoucherMdl({
      debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
      description: data.ledger_description || 'Tyre repair', tyre_code: data.tyre_code || '',
      vehicle_number: data.vehicle_number || '',
      entry_by: data.usr_nm || '', user_id: data.user_id || 0,
    }, function (vErr) {
      if (vErr) console.log('[addTyreRepairMdl] voucher creation failed:', vErr.message || vErr);
      callback(null, result);
    });
  });
};

exports.deleteTyreRepairMdl = function (data, callback) {
  var cntxtDtls = "deleteTyreRepairMdl";
  var QRY_TO_EXEC = `UPDATE tyre_repair_log SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Tyre Position ────────────────────────────────────────────────────────────
exports.getTyrePositionsMdl = function (data, callback) {
  var cntxtDtls = "getTyrePositionsMdl";
  var QRY_TO_EXEC = `
    SELECT tpl.*, tm.tyre_code, tm.brand, tm.size, tm.serial_no,
      (SELECT GROUP_CONCAT(CONCAT(mvs.account_type, ': ', mvs.expensives, ' ₹', mvs.amount) SEPARATOR ' | ')
       FROM mainvoucher_subt mvs WHERE mvs.c_number = tpl.voucher_number AND mvs.d_in=0) AS ledger_summary
    FROM tyre_position_log tpl
    JOIN tyre_master tm ON tm.id = tpl.tyre_id
    WHERE tpl.d_in=0 AND tpl.removed_date IS NULL
    ORDER BY tpl.id DESC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.assignTyrePositionMdl = function (data, callback) {
  var cntxtDtls = "assignTyrePositionMdl";
  var QRY_TO_EXEC = `
    INSERT INTO tyre_position_log (tyre_id, vehicle_number, position, odometer_at_fitting, fitted_date, remarks, created_by_id, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  var m = [
    data.tyre_id, data.vehicle_number, data.position, data.odometer_at_fitting || null,
    data.fitted_date || null, data.remarks || '', data.user_id || '', data.usr_nm || '',
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, result) {
    if (err) return callback(err, result);
    var positionLogId = result.insertId;

    dbutil.execupdateQuery(
      sqldb,
      `UPDATE tyre_master SET status='In Use', current_vehicle_number=?, current_position=? WHERE id=?`,
      [data.vehicle_number, data.position, data.tyre_id],
      'assignTyrePositionUpdateTyre',
      function (updErr) {
        if (updErr) return callback(updErr, result);

        var rows = _tyreVoucherRows(data.debit_ledgers, data.credit_ledgers);
        if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, result);

        exports.createTyreVoucherMdl({
          tyre_code: data.tyre_code, description: data.ledger_description || 'Tyre fitting',
          vehicle_number: data.vehicle_number,
          debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
          entry_by: data.usr_nm, user_id: data.user_id,
        }, function (vErr, voucherNumber) {
          if (vErr) { console.log('[assignTyrePositionMdl] voucher creation failed:', vErr.message || vErr); return callback(null, result); }
          if (!voucherNumber) return callback(null, result);
          dbutil.execupdateQuery(sqldb, `UPDATE tyre_position_log SET voucher_number=? WHERE id=?`, [voucherNumber, positionLogId], 'assignTyrePositionLinkVoucher', function () {
            callback(null, result);
          });
        });
      }
    );
  });
};

// Unmounts a tyre and puts it back into stock. Defaults to "In Stock", but
// callers (e.g. "Move to Store" on Tyre Movement) can pass new_status to land
// the tyre in a different bucket — "Pending Retread" for a worn tyre pulled
// off a bus, "Scrapped" if it's beyond use, etc.
exports.removeTyrePositionMdl = function (data, callback) {
  var cntxtDtls = "removeTyrePositionMdl";
  var QRY_TO_EXEC = `
    UPDATE tyre_position_log SET removed_date=? WHERE id=?;
    UPDATE tyre_master SET status=?, current_vehicle_number=NULL, current_position=NULL WHERE id=?;
  `;
  var m = [data.removed_date || null, data.id, data.new_status || 'In Stock', data.tyre_id];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

// Reclassifies a tyre that's already off any bus from one stock bucket to
// another (e.g. Pending Retread -> Scrapped) — the Stock-to-Stock leg of
// Tyre Movement, alongside Bus-to-Bus/Bus-to-Stock/Stock-to-Bus. Optionally
// raises a Journal voucher moving the tyre's value between stock ledgers.
exports.moveTyreStockMdl = function (data, callback) {
  var cntxtDtls = "moveTyreStockMdl";
  var QRY_TO_EXEC = `UPDATE tyre_master SET status=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.new_status || 'In Stock', data.tyre_id], cntxtDtls, function (err, result) {
    if (err) return callback(err, result);
    var rows = _tyreVoucherRows(data.debit_ledgers, data.credit_ledgers);
    if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, result);
    exports.createTyreVoucherMdl({
      debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
      description: data.ledger_description || 'Tyre stock reclassification', tyre_code: data.tyre_code || '',
      entry_by: data.usr_nm || '', user_id: data.user_id || 0,
    }, function (vErr) {
      if (vErr) console.log('[moveTyreStockMdl] voucher creation failed:', vErr.message || vErr);
      callback(null, result);
    });
  });
};

// Full mount/unmount history (Tyre Movement report) — same as getTyrePositionsMdl
// but without the "currently mounted only" filter.
exports.getTyrePositionHistoryMdl = function (data, callback) {
  var cntxtDtls = "getTyrePositionHistoryMdl";
  var QRY_TO_EXEC = `
    SELECT tpl.*, tm.tyre_code, tm.brand, tm.size
    FROM tyre_position_log tpl
    JOIN tyre_master tm ON tm.id = tpl.tyre_id
    WHERE tpl.d_in=0
    ORDER BY tpl.id DESC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

// ── Battery Management ───────────────────────────────────────────────────────
exports.getBatteriesMdl = function (data, callback) {
  var cntxtDtls = "getBatteriesMdl";
  // install_date is a native DATE column; re-select it as a plain 'YYYY-MM-DD' string so
  // <input type="date"> can display it (a raw Date object JSON-serializes with a time part).
  var QRY_TO_EXEC = `SELECT *, DATE_FORMAT(install_date, '%Y-%m-%d') as install_date FROM battery_master WHERE d_in=0 ORDER BY id DESC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

function _batteryVoucherRows(debit, credit) {
  return {
    debit:  (debit  || []).filter(function (e) { return e.ledger_id && e.amount; }),
    credit: (credit || []).filter(function (e) { return e.ledger_id && e.amount; }),
  };
}

// Creates the accounting voucher for a battery's debit/credit ledger entries.
// Mirrors createGarageVouchersMdl but for a single non-repeating block, tagged
// source_type='battery' so Voucher Approvals can show it came from Battery Management.
exports.createBatteryVoucherMdl = function (data, callback) {
  var moment   = require('moment');
  var curDate  = moment().utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss');
  var vDate    = moment().utcOffset('+05:30').format('YYYY-MM-DD');
  var datePart = moment().utcOffset('+05:30').format('YYMMDD');
  var rows = _batteryVoucherRows(data.debit_ledgers, data.credit_ledgers);
  if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, null);

  dbutil.execupdateQuery(sqldb, `SELECT COUNT(*) as cnt FROM mainvoucher_t WHERE DATE(i_ts) = CURDATE()`, [], 'batteryVoucherCount', function (err, countRes) {
    if (err) return callback(err);
    var baseCount = countRes && countRes[0] ? (parseInt(countRes[0].cnt) || 0) : 0;
    var c_number  = 'V' + datePart + String(baseCount + 1).padStart(3, '0');
    var c_id      = baseCount + 1;
    var totalAmt  = rows.debit.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var descText  = ((data.description || '') + ' [Battery: ' + (data.battery_code || '') + ']').trim();

    var mainRec = {
      description: descText, name: data.entry_by || '', valueDate: vDate,
      vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, i_ts: curDate,
      vouchertype: 'Journal', voucherdate: vDate, c_number: c_number, c_id: c_id,
      entry_by: data.entry_by || '', user_id: data.user_id || 0, d_in: 0, status: 0,
      source_type: 'battery', battery_code: data.battery_code || '',
    };

    dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_t SET ?', mainRec, 'batteryVoucherMain', function (err, result) {
      if (err) return callback(err);
      var lastId = result.insertId;
      var subRows = [];
      rows.debit.forEach(function (e) {
        subRows.push({ lastinsert_id: lastId, account_type: 'Debit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, c_id: c_id, i_ts: curDate, description: descText, vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
      });
      rows.credit.forEach(function (e) {
        subRows.push({ lastinsert_id: lastId, account_type: 'Credit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, c_id: c_id, i_ts: curDate, description: descText, vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
      });

      var si = 0;
      var insertNext = function () {
        if (si >= subRows.length) return callback(null, c_number);
        dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_subt SET ?', subRows[si], 'batteryVoucherSub', function (err) {
          if (err) return callback(err);
          si++; insertNext();
        });
      };
      insertNext();
    });
  });
};

function _tripVoucherRows(debit, credit) {
  return {
    debit:  (debit  || []).filter(function (e) { return e.ledger_id && e.amount; }),
    credit: (credit || []).filter(function (e) { return e.ledger_id && e.amount; }),
  };
}

// Creates the accounting voucher for a trip's advance/booking amount. Mirrors
// createBatteryVoucherMdl exactly (single non-repeating Journal voucher),
// tagged source_type='trip' so Voucher Approvals can show it came from Trip
// Creation. Bus rows: debit = Paid-To person's ledger, credit = the "Paid From"
// ledger the user picked. Van rows: debit = the hirer's Receivables ledger,
// credit = the "Booking Income Ledger" the user picked.
exports.createTripVoucherMdl = function (data, callback) {
  var moment   = require('moment');
  var curDate  = moment().utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss');
  var vDate    = moment().utcOffset('+05:30').format('YYYY-MM-DD');
  var datePart = moment().utcOffset('+05:30').format('YYMMDD');
  var rows = _tripVoucherRows(data.debit_ledgers, data.credit_ledgers);
  if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, null);

  dbutil.execupdateQuery(sqldb, `SELECT COUNT(*) as cnt FROM mainvoucher_t WHERE DATE(i_ts) = CURDATE()`, [], 'tripVoucherCount', function (err, countRes) {
    if (err) return callback(err);
    var baseCount = countRes && countRes[0] ? (parseInt(countRes[0].cnt) || 0) : 0;
    var c_number  = 'V' + datePart + String(baseCount + 1).padStart(3, '0');
    var c_id      = baseCount + 1;
    var totalAmt  = rows.debit.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var descText  = ((data.description || '') + ' [Trip: ' + (data.trip_c_number || '') + ']').trim();

    var mainRec = {
      description: descText, name: data.entry_by || '', valueDate: vDate,
      vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, i_ts: curDate,
      vouchertype: 'Journal', voucherdate: vDate, c_number: c_number, c_id: c_id,
      entry_by: data.entry_by || '', user_id: data.user_id || 0, d_in: 0, status: 0,
      source_type: 'trip', trip_c_number: data.trip_c_number || null,
    };

    dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_t SET ?', mainRec, 'tripVoucherMain', function (err, result) {
      if (err) return callback(err);
      var lastId = result.insertId;
      var subRows = [];
      rows.debit.forEach(function (e) {
        subRows.push({ lastinsert_id: lastId, account_type: 'Debit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, c_id: c_id, i_ts: curDate, description: descText, vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
      });
      rows.credit.forEach(function (e) {
        subRows.push({ lastinsert_id: lastId, account_type: 'Credit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, c_id: c_id, i_ts: curDate, description: descText, vehicleNo: data.vehicle_number || '', creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
      });

      var si = 0;
      var insertNext = function () {
        if (si >= subRows.length) return callback(null, c_number);
        dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_subt SET ?', subRows[si], 'tripVoucherSub', function (err) {
          if (err) return callback(err);
          si++; insertNext();
        });
      };
      insertNext();
    });
  });
};

exports.setTripVoucherNumberMdl = function (tripCNumber, voucherNumber, callback) {
  // d_in=0 guard: c_number is minted from a count of active rows, so once older
  // rows are soft-deleted the same c_number string can resurface — without this
  // filter the UPDATE would also stamp the stale deleted row sharing it.
  dbutil.execupdateQuery(sqldb, `UPDATE trip_created SET voucher_number = ? WHERE c_number = ? AND d_in = 0`, [voucherNumber, tripCNumber], 'setTripVoucherNumberMdl', function (err) {
    callback(err);
  });
};

exports.getTripVoucherNumberMdl = function (tripCNumber, callback) {
  dbutil.execupdateQuery(sqldb, `SELECT voucher_number FROM trip_created WHERE c_number = ? AND d_in = 0 LIMIT 1`, [tripCNumber], 'getTripVoucherNumberMdl', callback);
};

// Replaces the debit/credit lines of a trip's existing voucher (mirrors
// updateBatteryVoucherMdl) — used when re-filing/editing a Trip Expense that
// already posted a voucher on an earlier filing, so re-filing doesn't pile up
// a fresh voucher every time.
exports.updateTripVoucherMdl = function (data, callback) {
  var moment  = require('moment');
  var curDate = moment().utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss');
  var vDate   = moment().utcOffset('+05:30').format('YYYY-MM-DD');
  var c_number = data.voucher_number;
  var rows     = _tripVoucherRows(data.debit_ledgers, data.credit_ledgers);
  var totalAmt = rows.debit.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
  var descText = ((data.description || '') + ' [Trip: ' + (data.trip_c_number || '') + ']').trim().replace(/'/g, "''");

  dbutil.execupdateQuery(sqldb,
    "UPDATE mainvoucher_subt SET d_in=1 WHERE c_number='" + c_number + "' AND d_in=0",
    [], 'tripVoucherUpdDelete',
    function (err) {
      if (err) return callback(err);
      dbutil.execupdateQuery(sqldb,
        "UPDATE mainvoucher_t SET description='" + descText + "', creditanddebitamount=" + totalAmt + " WHERE c_number='" + c_number + "' AND d_in=0",
        [], 'tripVoucherUpdMain',
        function (err) {
          if (err) return callback(err);
          var allEntries = [];
          rows.debit.forEach(function (e) {
            allEntries.push({ account_type: 'Debit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, i_ts: curDate, description: descText, creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
          });
          rows.credit.forEach(function (e) {
            allEntries.push({ account_type: 'Credit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, i_ts: curDate, description: descText, creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
          });
          if (allEntries.length === 0) return callback(null);
          var si = 0;
          var insertNext = function () {
            if (si >= allEntries.length) return callback(null);
            dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_subt SET ?', allEntries[si], 'tripVoucherUpdSub', function (err) {
              if (err) return callback(err);
              si++; insertNext();
            });
          };
          insertNext();
        }
      );
    }
  );
};

// Replaces the debit/credit lines of a battery's existing voucher (mirrors updateJobVoucherMdl).
exports.updateBatteryVoucherMdl = function (data, callback) {
  var moment  = require('moment');
  var curDate = moment().utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss');
  var vDate   = moment().utcOffset('+05:30').format('YYYY-MM-DD');
  var c_number = data.voucher_number;
  var rows     = _batteryVoucherRows(data.debit_ledgers, data.credit_ledgers);
  var totalAmt = rows.debit.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
  var descText = ((data.description || '') + ' [Battery: ' + (data.battery_code || '') + ']').trim().replace(/'/g, "''");

  dbutil.execupdateQuery(sqldb,
    "UPDATE mainvoucher_subt SET d_in=1 WHERE c_number='" + c_number + "' AND d_in=0",
    [], 'batteryVoucherUpdDelete',
    function (err) {
      if (err) return callback(err);
      dbutil.execupdateQuery(sqldb,
        "UPDATE mainvoucher_t SET description='" + descText + "', creditanddebitamount=" + totalAmt + " WHERE c_number='" + c_number + "' AND d_in=0",
        [], 'batteryVoucherUpdMain',
        function (err) {
          if (err) return callback(err);
          var allEntries = [];
          rows.debit.forEach(function (e) {
            allEntries.push({ account_type: 'Debit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, i_ts: curDate, description: descText, creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
          });
          rows.credit.forEach(function (e) {
            allEntries.push({ account_type: 'Credit Account', amount: parseFloat(e.amount) || 0, ledger_id: e.ledger_id, expensives: e.ledger_name || '', c_number: c_number, i_ts: curDate, description: descText, creditanddebitamount: totalAmt, vouchertype: 'Journal', voucherdate: vDate, user_id: data.user_id || 0, d_in: 0 });
          });
          if (allEntries.length === 0) return callback(null);
          var si = 0;
          var insertNext = function () {
            if (si >= allEntries.length) return callback(null);
            dbutil.sqlinjection(sqldb, 'INSERT INTO mainvoucher_subt SET ?', allEntries[si], 'batteryVoucherUpdSub', function (err) {
              if (err) return callback(err);
              si++; insertNext();
            });
          };
          insertNext();
        }
      );
    }
  );
};

// Reads back the debit/credit lines of a battery's linked voucher (for Edit prefill).
exports.getBatteryLedgersMdl = function (data, callback) {
  var cntxtDtls = "getBatteryLedgersMdl";
  var batteryId = parseInt(data.id) || 0;
  var QRY_TO_EXEC = `
    SELECT s.account_type, s.ledger_id, s.amount, ms.temple_name AS ledger_name
    FROM battery_master b
    JOIN mainvoucher_subt s ON s.c_number = b.voucher_number AND s.d_in = 0
    LEFT JOIN mainmasterssubchildtwo ms ON ms.id = s.ledger_id
    WHERE b.id = ${batteryId}
  `;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.addBatteryMdl = function (data, callback) {
  var cntxtDtls = "addBatteryMdl";
  var QRY_TO_EXEC = `INSERT INTO battery_master
    (battery_code, brand, capacity_ah, vehicle_number, install_date, warranty_months, cost, status, remarks, created_by_id, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  var m = [
    data.battery_code, data.brand || '', data.capacity_ah || '', data.vehicle_number || null,
    data.install_date || null, data.warranty_months || null, data.cost || 0,
    data.status || 'Active', data.remarks || '', data.user_id || '', data.usr_nm || '',
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, result) {
    if (err) return callback(err, result);
    var batteryId = result.insertId;
    exports.createBatteryVoucherMdl({
      battery_code: data.battery_code, vehicle_number: data.vehicle_number, description: data.ledger_description,
      debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
      entry_by: data.usr_nm, user_id: data.user_id,
    }, function (vErr, voucherNumber) {
      if (vErr) { console.log('[addBatteryMdl] voucher creation failed:', vErr.message || vErr); return callback(null, result); }
      if (!voucherNumber) return callback(null, result);
      dbutil.execupdateQuery(sqldb, `UPDATE battery_master SET voucher_number=? WHERE id=?`, [voucherNumber, batteryId], 'addBatteryLinkVoucher', function () {
        callback(null, result);
      });
    });
  });
};

var BATTERY_FIELD_LABELS = {
  battery_code: 'Battery Code', brand: 'Brand', capacity_ah: 'Capacity', vehicle_number: 'Vehicle',
  install_date: 'Install Date', warranty_months: 'Warranty (months)', cost: 'Cost',
  status: 'Status', remarks: 'Remarks',
};

exports.editBatteryMdl = function (data, callback) {
  var cntxtDtls = "editBatteryMdl";
  var batteryId = parseInt(data.id) || 0;
  var esc = function (v) { return String(v == null ? '' : v).replace(/'/g, "''"); };

  var fieldValues = {
    battery_code: data.battery_code, brand: data.brand || '', capacity_ah: data.capacity_ah || '',
    vehicle_number: data.vehicle_number || '', install_date: data.install_date || '',
    warranty_months: data.warranty_months || '', cost: parseFloat(data.cost) || 0,
    status: data.status || 'Active', remarks: data.remarks || '',
  };

  // Re-select install_date as a plain string here too, so it compares equal to
  // fieldValues.install_date when unchanged instead of always logging as edited.
  sqldb.query(`SELECT *, DATE_FORMAT(install_date, '%Y-%m-%d') as install_date FROM battery_master WHERE id = ?`, [batteryId], function (selErr, brows) {
    var before = (!selErr && brows && brows[0]) ? brows[0] : {};

    var QRY_TO_EXEC = `UPDATE battery_master SET battery_code=?, brand=?, capacity_ah=?, vehicle_number=?, install_date=?, warranty_months=?, cost=?, status=?, remarks=? WHERE id=?`;
    var m = [
      fieldValues.battery_code, fieldValues.brand, fieldValues.capacity_ah, fieldValues.vehicle_number || null,
      fieldValues.install_date || null, fieldValues.warranty_months || null, fieldValues.cost,
      fieldValues.status, fieldValues.remarks, batteryId,
    ];
    dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, function (err, result) {
      if (err) return callback(err, result);

      var changes = [];
      Object.keys(fieldValues).forEach(function (k) {
        var oldV = before[k] == null ? '' : String(before[k]);
        var newV = fieldValues[k] == null ? '' : String(fieldValues[k]);
        if (oldV !== newV) changes.push(`${BATTERY_FIELD_LABELS[k] || k}: '${oldV || '—'}' -> '${newV || '—'}'`);
      });
      var logHistory = function (next) {
        if (changes.length === 0) return next();
        var histQ = `INSERT INTO battery_edit_history (battery_id, battery_code, changes_note, changed_by_id, changed_by_name) VALUES ('${batteryId}', '${esc(fieldValues.battery_code)}', '${esc(changes.join('\n'))}', '${esc(data.userid || data.user_id)}', '${esc(data.usrnm)}')`;
        sqldb.query(histQ, function (histErr) {
          if (histErr) console.log('[editBatteryMdl] history log error:', histErr.message);
          next();
        });
      };

      logHistory(function () {
        var rows = _batteryVoucherRows(data.debit_ledgers, data.credit_ledgers);
        if (rows.debit.length === 0 && rows.credit.length === 0) return callback(null, result);

        if (data.voucher_number) {
          exports.updateBatteryVoucherMdl({
            voucher_number: data.voucher_number, battery_code: data.battery_code, description: data.ledger_description,
            debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers, user_id: data.user_id,
          }, function (vErr) {
            if (vErr) console.log('[editBatteryMdl] voucher update failed:', vErr.message || vErr);
            callback(null, result);
          });
        } else {
          exports.createBatteryVoucherMdl({
            battery_code: data.battery_code, vehicle_number: data.vehicle_number, description: data.ledger_description,
            debit_ledgers: data.debit_ledgers, credit_ledgers: data.credit_ledgers,
            entry_by: data.usr_nm, user_id: data.user_id,
          }, function (vErr, voucherNumber) {
            if (vErr || !voucherNumber) { if (vErr) console.log('[editBatteryMdl] voucher creation failed:', vErr.message || vErr); return callback(null, result); }
            dbutil.execupdateQuery(sqldb, `UPDATE battery_master SET voucher_number=? WHERE id=?`, [voucherNumber, batteryId], 'editBatteryLinkVoucher', function () {
              callback(null, result);
            });
          });
        }
      });
    });
  });
};

exports.deleteBatteryMdl = function (data, callback) {
  var cntxtDtls = "deleteBatteryMdl";
  var QRY_TO_EXEC = `UPDATE battery_master SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

exports.getBatteryHistoryMdl = function (data, callback) {
  var cntxtDtls = "getBatteryHistoryMdl";
  var batteryId = parseInt(data.battery_id) || 0;
  var QRY_TO_EXEC = `SELECT * FROM battery_edit_history WHERE battery_id = ${batteryId} ORDER BY changed_at ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

// ── Battery Brands (managed from Main Masters) ──────────────────────────────
exports.getBatteryBrandsMdl = function (callback) {
  var cntxtDtls = "getBatteryBrandsMdl";
  var QRY_TO_EXEC = `SELECT * FROM battery_brands WHERE d_in=0 ORDER BY brand_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addBatteryBrandMdl = function (data, callback) {
  var cntxtDtls = "addBatteryBrandMdl";
  var QRY_TO_EXEC = `INSERT INTO battery_brands (brand_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.brand_name], cntxtDtls, callback);
};
exports.deleteBatteryBrandMdl = function (data, callback) {
  var cntxtDtls = "deleteBatteryBrandMdl";
  var QRY_TO_EXEC = `UPDATE battery_brands SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Battery Capacities (managed from Main Masters) ──────────────────────────
exports.getBatteryCapacitiesMdl = function (callback) {
  var cntxtDtls = "getBatteryCapacitiesMdl";
  var QRY_TO_EXEC = `SELECT * FROM battery_capacities WHERE d_in=0 ORDER BY capacity_ah`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addBatteryCapacityMdl = function (data, callback) {
  var cntxtDtls = "addBatteryCapacityMdl";
  var QRY_TO_EXEC = `INSERT INTO battery_capacities (capacity_ah) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.capacity_ah], cntxtDtls, callback);
};
exports.deleteBatteryCapacityMdl = function (data, callback) {
  var cntxtDtls = "deleteBatteryCapacityMdl";
  var QRY_TO_EXEC = `UPDATE battery_capacities SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Garage Type Masters (managed from Main Masters) ─────────────────────────
exports.getServiceReminderTypesMdl = function (data, callback) {
  var cntxtDtls = "getServiceReminderTypesMdl";
  var QRY_TO_EXEC = `SELECT * FROM service_reminder_types WHERE d_in=0 ORDER BY type_name ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.addServiceReminderTypeMdl = function (data, callback) {
  var cntxtDtls = "addServiceReminderTypeMdl";
  var QRY_TO_EXEC = `INSERT INTO service_reminder_types (type_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.type_name], cntxtDtls, callback);
};

exports.editServiceReminderTypeMdl = function (data, callback) {
  var cntxtDtls = "editServiceReminderTypeMdl";
  var QRY_TO_EXEC = `UPDATE service_reminder_types SET type_name=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.type_name, data.id], cntxtDtls, callback);
};

exports.deleteServiceReminderTypeMdl = function (data, callback) {
  var cntxtDtls = "deleteServiceReminderTypeMdl";
  var QRY_TO_EXEC = `UPDATE service_reminder_types SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Service Schedules ─────────────────────────────────────────────────────────
exports.getServiceSchedulesMdl = function (data, callback) {
  var cntxtDtls = "getServiceSchedulesMdl";
  var QRY_TO_EXEC = `SELECT * FROM service_schedules WHERE d_in=0 ORDER BY company_name, service_type`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addServiceScheduleMdl = function (data, callback) {
  var cntxtDtls = "addServiceScheduleMdl";
  var QRY_TO_EXEC = `INSERT INTO service_schedules (company_name, service_type, sub_type, km_interval, days_interval, free_or_paid) VALUES (?, ?, ?, ?, ?, ?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.company_name, data.service_type, data.sub_type || null, data.km_interval, data.days_interval || null, data.free_or_paid || 'Free'], cntxtDtls, callback);
};
exports.editServiceScheduleMdl = function (data, callback) {
  var cntxtDtls = "editServiceScheduleMdl";
  var QRY_TO_EXEC = `UPDATE service_schedules SET company_name=?, service_type=?, sub_type=?, km_interval=?, days_interval=?, free_or_paid=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.company_name, data.service_type, data.sub_type || null, data.km_interval, data.days_interval || null, data.free_or_paid || 'Free', data.id], cntxtDtls, callback);
};
exports.deleteServiceScheduleMdl = function (data, callback) {
  var cntxtDtls = "deleteServiceScheduleMdl";
  var QRY_TO_EXEC = `UPDATE service_schedules SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

// ── Lubricant / Fluid Schedules ───────────────────────────────────────────────
exports.getLubricantSchedulesMdl = function (data, callback) {
  var cntxtDtls = "getLubricantSchedulesMdl";
  var QRY_TO_EXEC = `SELECT * FROM lubricant_schedules WHERE d_in=0 ORDER BY company_name, aggregate_name`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};
exports.addLubricantScheduleMdl = function (data, callback) {
  var cntxtDtls = "addLubricantScheduleMdl";
  var QRY_TO_EXEC = `INSERT INTO lubricant_schedules (company_name, aggregate_name, quantity, fluid_type, recommended_brand, change_periodicity) VALUES (?, ?, ?, ?, ?, ?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.company_name, data.aggregate_name, data.quantity || null, data.fluid_type || null, data.recommended_brand || null, data.change_periodicity || null], cntxtDtls, callback);
};
exports.editLubricantScheduleMdl = function (data, callback) {
  var cntxtDtls = "editLubricantScheduleMdl";
  var QRY_TO_EXEC = `UPDATE lubricant_schedules SET company_name=?, aggregate_name=?, quantity=?, fluid_type=?, recommended_brand=?, change_periodicity=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.company_name, data.aggregate_name, data.quantity || null, data.fluid_type || null, data.recommended_brand || null, data.change_periodicity || null, data.id], cntxtDtls, callback);
};
exports.deleteLubricantScheduleMdl = function (data, callback) {
  var cntxtDtls = "deleteLubricantScheduleMdl";
  var QRY_TO_EXEC = `UPDATE lubricant_schedules SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};

exports.getTyrePositionsMasterMdl = function (data, callback) {
  var cntxtDtls = "getTyrePositionsMasterMdl";
  var QRY_TO_EXEC = `SELECT * FROM tyre_positions_master WHERE d_in=0 ORDER BY position_name ASC`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [], cntxtDtls, callback);
};

exports.addTyrePositionMasterMdl = function (data, callback) {
  var cntxtDtls = "addTyrePositionMasterMdl";
  var QRY_TO_EXEC = `INSERT INTO tyre_positions_master (position_name) VALUES (?)`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.position_name], cntxtDtls, callback);
};

exports.editTyrePositionMasterMdl = function (data, callback) {
  var cntxtDtls = "editTyrePositionMasterMdl";
  var QRY_TO_EXEC = `UPDATE tyre_positions_master SET position_name=? WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.position_name, data.id], cntxtDtls, callback);
};

exports.deleteTyrePositionMasterMdl = function (data, callback) {
  var cntxtDtls = "deleteTyrePositionMasterMdl";
  var QRY_TO_EXEC = `UPDATE tyre_positions_master SET d_in=1 WHERE id=?`;
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, [data.id], cntxtDtls, callback);
};





exports.getlaundryapproveddataMdl = function (callback) {
  var cntxtDtls = "in getlaundryapproveddataMdl";
  // var QRY_TO_EXEC = `select * from  laundrybill_maint  where  d_in=0 and admin_status=1 ORDER BY laundrybill_maint.voucherdate DESC;`;
  var QRY_TO_EXEC = `  SELECT c_number,name,date,admin_status,SUM(totalamount) AS totalamount FROM laundrybill_maint WHERE d_in = 0 GROUP BY c_number,name,date,admin_status;`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.getlaundrysearchdataMdl = function (data, callback) {
  var cntxtDtls = "in getlaundrysearchdataMdl";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  let check2 = "";

  if (data.fromdate != "" && data.todate != "") {
    check2 = `  AND date BETWEEN '${data.fromdate}' AND '${data.todate}' `;
  }

  let check = "";
  if (data.type == "1") {
    check = " and admin_status=1";
  } else {
    check = " and admin_status=2";
  }

  // var QRY_TO_EXEC = `SELECT * FROM laundrybill_maint WHERE d_in = 0  ${check2}  ${check} ORDER BY laundrybill_maint.voucherdate DESC `;
  var QRY_TO_EXEC = `SELECT c_number,name,date,admin_status,SUM(totalamount) AS totalamount FROM laundrybill_maint WHERE d_in = 0 ${check2} ${check} GROUP BY c_number,name,date,admin_status ORDER BY voucherdate DESC`;

  if (callback && typeof callback == "function")
    dbutil.execQuery(
      sqldb,
      QRY_TO_EXEC,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};

exports.addsparetankbusno = function (data, callback) {
  var cntxtDtls = "in addsparetankbusno";
  var date = moment().utcOffset("+05:30").format("YYYY-MM-DD ");

  var dta = {
    sparetankbusno: data.sparetankbusno,
    ownername:data.ownername,
    cts: date,
    user_id: data.userid,
    usr_nm: data.usrnm,
  };
  var QRY_TO_EXEC = `insert into sparetank set ?;`;
  // var QRY_TO_EXEC = `insert into  service_number (name,cts) VALUES('${data.service_no}','${date}')  `;
  if (callback && typeof callback == "function")
    dbutil.execupdateQuery(
      sqldb,
      QRY_TO_EXEC,
      dta,
      cntxtDtls,
      function (err, results) {
        callback(err, results);
        return;
      }
    );
  else return dbutil.execQuery(sqldb, QRY_TO_EXEC, cntxtDtls);
};



// -------------------------------Cron Jobs Models -----------------------------------------------------

exports.getDueRepeatedJobs = () => {
  return new Promise((resolve, reject) => {
    const Q = `
      SELECT vj.*, rc.name AS repair_category_name
      FROM vehicle_jobs vj
      LEFT JOIN repair_category rc ON rc.id = vj.repair_category_id
      WHERE vj.is_repeated_job = 1
        AND vj.next_job_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
        AND vj.d_in = 0
        AND vj.state IN ('CLOSED','FINISHED','APPROVED')
        AND NOT EXISTS (
          SELECT 1 FROM service_reminders sr
          WHERE sr.source_job_card_id = vj.id AND sr.d_in = 0
        )
    `;
    dbutil.execupdateQuery(sqldb, Q, [], 'getDueRepeatedJobs', (err, results) => {
      if (err) reject(err);
      else resolve(results || []);
    });
  });
};

// Creates a Service Reminder (not a job card) for a repeat job whose next
// service date has arrived — the reminder is then converted into a job card
// manually via the same overdue-reminder flow used everywhere else.
exports.createReminderFromRepeatedJobMdl = function (data, callback) {
  var cntxtDtls = "createReminderFromRepeatedJobMdl";
  var remarks = `Auto-generated from repeat job ${data.source_job_card_number || ''}`.replace(/'/g, "''");
  var QRY_TO_EXEC = `INSERT INTO service_reminders
    (ref_number, vehicle_number, reminder_type, due_date, remarks, is_repeating, source_job_card_id, source_job_card_number, created_by_id, created_by_name)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`;
  var m = [
    data.ref_number, data.vehicle_number, data.reminder_type || 'Repeat Service', data.due_date || null, remarks,
    data.source_job_card_id, data.source_job_card_number, data.user_id || 0, data.usr_nm || 'System',
  ];
  dbutil.execupdateQuery(sqldb, QRY_TO_EXEC, m, cntxtDtls, callback);
};

// ── Bulk Upload — Bus Numbers ─────────────────────────────────────────────────
// Rows whose bus_no matches an existing active bus are REPLACED (UPDATE) rather
// than skipped — the frontend preview modal already lets the user manually tick
// a duplicate row to force it through ("Duplicates are unchecked by default —
// tick to insert anyway"), so only rows the user deliberately selected ever
// reach this function. Blindly skipping them here made that override a no-op.
// Genuinely new bus numbers are still batch-inserted as before.
exports.bulkUploadBusesMdl = function (rows, userId, usrNm, callback) {
  var cntxtDtls = 'in bulkUploadBusesMdl';
  dbutil.execQuery(sqldb, `SELECT bus_no FROM busses WHERE d_in='0'`, cntxtDtls, function (err, existing) {
    if (err) return callback(err, null);
    var date = moment().utcOffset('+05:30').format('YYYY-MM-DD');
    var existingNos = new Set((existing || []).map(function (r) { return String(r.bus_no || '').toLowerCase().trim(); }));
    var toUpdate = [], toInsert = [];
    rows.forEach(function (r) {
      if (!r.bus_no) return;
      var key = String(r.bus_no).toLowerCase().trim();
      if (existingNos.has(key)) { toUpdate.push(r); } else { toInsert.push(r); }
    });

    function doInsert() {
      if (toInsert.length === 0) return callback(null, { inserted: 0, replaced: toUpdate.length, total: rows.length });
      var vals = toInsert.map(function (r) {
        return [
          r.bus_no, r.engine_no || null, r.chassis_no || null,
          r.insurance_validity || null, r.pollution_validity || null,
          r.base_point_validity || null, r.date_of_purchase || null,
          r.atp_validity || null, r.atp_authentication_validity || null,
          r.fc_validity || null, r.home_tax_validity || null,
          r.service_out_date || null, r.remarks || null,
          userId, usrNm, date, r.odometer || null, r.ownername || null,
          r.vehicle_type || null, r.issparetank || 0,
          r.luxury_type || null, r.seating_capacity || null, r.chassis_make || null,
          r.chassis_model || null, r.body_made || null, r.mfg_year || null, r.reg_date || null
        ];
      });
      var QRY = 'INSERT INTO busses (bus_no, engine_no, chassis_no, insurance_validity, pollution_validity, base_point_validity, date_of_purchase, atp_validity, atp_authentication_validity, fc_validity, home_tax_validity, service_out_date, remarks, user_id, usr_nm, i_ts, odometer, ownername, vehicle_type, issparetank, luxury_type, seating_capacity, chassis_make, chassis_model, body_made, mfg_year, reg_date) VALUES ?';
      dbutil.execupdateQuery(sqldb, QRY, [vals], cntxtDtls, function (err) {
        if (err) return callback(err, null);
        callback(null, { inserted: toInsert.length, replaced: toUpdate.length, total: rows.length });
      });
    }

    var ui = 0;
    var updateNext = function () {
      if (ui >= toUpdate.length) return doInsert();
      var r = toUpdate[ui];
      var updateRec = {
        engine_no: r.engine_no || null, chassis_no: r.chassis_no || null,
        insurance_validity: r.insurance_validity || null, pollution_validity: r.pollution_validity || null,
        base_point_validity: r.base_point_validity || null, date_of_purchase: r.date_of_purchase || null,
        atp_validity: r.atp_validity || null, atp_authentication_validity: r.atp_authentication_validity || null,
        fc_validity: r.fc_validity || null, home_tax_validity: r.home_tax_validity || null,
        service_out_date: r.service_out_date || null, remarks: r.remarks || null,
        updated_by: usrNm, updated_userid: userId, odometer: r.odometer || null, ownername: r.ownername || null,
        vehicle_type: r.vehicle_type || null, issparetank: r.issparetank || 0,
        luxury_type: r.luxury_type || null, seating_capacity: r.seating_capacity || null, chassis_make: r.chassis_make || null,
        chassis_model: r.chassis_model || null, body_made: r.body_made || null, mfg_year: r.mfg_year || null, reg_date: r.reg_date || null,
      };
      dbutil.execupdateQuery(sqldb, `UPDATE busses SET ? WHERE bus_no = ? AND d_in = '0'`, [updateRec, r.bus_no], cntxtDtls, function (err) {
        if (err) return callback(err, null);
        ui++; updateNext();
      });
    };
    updateNext();
  });
};

// ── Bulk Upload — Service Routes ──────────────────────────────────────────────
exports.bulkUploadServiceRoutesMdl = function (rows, userId, usrNm, callback) {
  var cntxtDtls = 'in bulkUploadServiceRoutesMdl';
  dbutil.execQuery(sqldb, `SELECT serviceNo FROM driverone WHERE d_in='0'`, cntxtDtls, function (err, existing) {
    if (err) return callback(err, null);
    var date = moment().utcOffset('+05:30').format('YYYY-MM-DD');
    var existingNos = new Set((existing || []).map(function (r) { return String(r.serviceNo || '').toLowerCase().trim(); }));
    var skipped = [], toInsert = [];
    rows.forEach(function (r) {
      if (!r.serviceNo) return;
      var key = String(r.serviceNo).toLowerCase().trim();
      if (existingNos.has(key)) { skipped.push(r.serviceNo); return; }
      toInsert.push(r);
    });
    if (toInsert.length === 0) return callback(null, { inserted: 0, skipped: skipped, total: rows.length });
    var vals = toInsert.map(function (r) {
      return [
        r.serviceFor || null, r.serviceNo || null, r.fromCity || null, r.toCity || null,
        r.viaPlaces || null, r.parkingAmount || 0, r.driverOneBeta || 0, r.driverTwoBeta || 0,
        r.helperBeta || 0, r.conductorBeta || 0, r.distance || 0, r.optDriver || 0, r.optHelper || 0,
        r.optDriverSalary || 0, r.optHelperSalary || 0,
        r.remarks || null, userId, usrNm, date, r.service_for_id || null,
        r.line_code || null, r.route_id || null,
        r.start_boarding_point || null, r.start_boarding_time || null,
        r.end_boarding_point || null, r.end_boarding_time || null,
        // Van sheets carry these instead of the cities/betas above; a Bus sheet
        // leaves them null and the row keeps defaulting to vehicle_type 'bus'.
        r.vehicle_type || 'bus', r.bus_operator_id || null, r.bus_operator_name || null, r.trip_type || null,
      ];
    });
    var QRY = 'INSERT INTO driverone (serviceFor, serviceNo, fromCity, toCity, viaPlaces, parkingAmount, driverOneBeta, driverTwoBeta, helperBeta, conductorBeta, distance, optDriver, optHelper, optDriverSalary, optHelperSalary, remarks, user_id, usr_nm, i_ts, service_for_id, line_code, route_id, start_boarding_point, start_boarding_time, end_boarding_point, end_boarding_time, vehicle_type, bus_operator_id, bus_operator_name, trip_type) VALUES ?';
    dbutil.execupdateQuery(sqldb, QRY, [vals], cntxtDtls, function (err) {
      if (err) return callback(err, null);
      callback(null, { inserted: toInsert.length, skipped: skipped, total: rows.length });
    });
  });
};

// ── Bulk Upload — Staff (Staff / Driver / Helper) ──────────────────────────────
// Excel-imported people need the same Payables ledger that adddriverMdl and its
// siblings create for a person added one at a time — without this an imported
// driver exists in driver_register but never appears under Payables > Drivers,
// so nothing can be paid to them.
//
// Sequential on purpose: ensurePersonLedger dedupes on the ledger name with a
// SELECT-then-INSERT, so firing a batch off in parallel races and lets two rows
// with the same name through. Best-effort per person, matching the single-add
// path — a ledger failure is logged and never fails the import, because the
// people are already committed by the time this runs.
function createLedgersForImport(label, people, tbl, idCol, userId, cntxtDtls, done) {
  var i = 0, made = 0, failed = [];
  (function next() {
    if (i >= people.length) return done(made, failed);
    var p = people[i++];
    module.exports.ensurePersonLedger(label, p.name, p.disambiguator, userId, function (err, ledgerId) {
      if (err || !ledgerId) {
        if (err) {
          console.error('[bulkUpload] ledger failed for ' + label + ' "' + p.name + '":', err.message);
          failed.push(p.name);
        }
        return next();
      }
      made++;
      dbutil.execupdateQuery(sqldb, `UPDATE \`${tbl}\` SET ledger_id = ? WHERE \`${idCol}\` = ?`,
        [ledgerId, p.key], cntxtDtls, function () { next(); });
    });
  })();
}

exports.bulkUploadStaffMdl = function (type, rows, userId, usrNm, callback) {
  var cntxtDtls = 'in bulkUploadStaffMdl';
  var date = moment().utcOffset('+05:30').format('YYYY-MM-DD');

  if (type === 'Staff') {
    dbutil.execQuery(sqldb, `SELECT fullName FROM staff_register WHERE d_in=0`, cntxtDtls, function (err, existing) {
      if (err) return callback(err, null);
      var existingKeys = new Set((existing || []).map(function (r) { return String(r.fullName || '').toLowerCase().trim(); }));
      var skipped = [], toInsert = [];
      rows.forEach(function (r) {
        if (!r.fullName) return;
        var key = r.fullName.toLowerCase().trim();
        if (existingKeys.has(key)) { skipped.push(r.fullName); return; }
        toInsert.push(r);
      });
      if (toInsert.length === 0) return callback(null, { inserted: 0, skipped: skipped, total: rows.length });
      // staff_register declares designation/idNumber/mobile/emergencyContact/
      // aadhaar/accountHolderName/accountNumber/bankName/ifscCode as NOT NULL
      // with no default, unlike driver_register (only `id`) and helper_register
      // (whose id is generated below). idNumber was missing from the column list
      // entirely, so every staff import failed with "Field 'idNumber' doesn't
      // have a default value"; the rest failed for any row that left an optional
      // cell blank, because `|| null` fed NULL into a NOT NULL column.
      // Empty string is what addstaffregisterMdl stores for these, so match it.
      var blank = function (v) { return v == null || v === '' ? '' : v; };
      var vals = toInsert.map(function (r) {
        return [blank(r.designation) || 'Staff', '', r.fullName, r.nickName || null, blank(r.mobile),
          blank(r.emergencyContact), r.alternativemobilenumber || null, r.dateOfJoining || null,
          blank(r.aadhaar), blank(r.accountHolderName), blank(r.accountNumber),
          blank(r.ifscCode), blank(r.bankName), r.referencename || null, r.branchname || null,
          r.upiId || null, r.remarks || null, r.dob || null, r.address || null,
          userId, usrNm, date, 0];
      });
      var QRY = 'INSERT INTO staff_register (designation, idNumber, fullName, nickName, mobile, emergencyContact, alternativemobilenumber, dateOfJoining, aadhaar, accountHolderName, accountNumber, ifscCode, bankName, referencename, branchname, upiId, remarks, dob, address, user_id, usr_nm, i_ts, d_in) VALUES ?';
      dbutil.execupdateQuery(sqldb, QRY, [vals], cntxtDtls, function (err) {
        if (err) return callback(err, null);
        // staff_register has no generated id number, so the ledger is keyed on
        // the name — which is also what the dedupe above guarantees is unique.
        var people = toInsert.map(function (r) {
          return { name: r.fullName, disambiguator: null, key: r.fullName };
        });
        createLedgersForImport('Staff', people, 'staff_register', 'fullName', userId, cntxtDtls, function (made, failed) {
          callback(null, { inserted: toInsert.length, skipped: skipped, total: rows.length, ledgers_created: made, ledgers_failed: failed });
        });
      });
    });

  } else if (type === 'Driver') {
    dbutil.execQuery(sqldb, `SELECT driver_name FROM driver_register WHERE d_in=0`, cntxtDtls, function (err, existing) {
      if (err) return callback(err, null);
      var existingKeys = new Set((existing || []).map(function (r) { return String(r.driver_name || '').toLowerCase().trim(); }));
      var skipped = [], toInsert = [];
      rows.forEach(function (r) {
        if (!r.driver_name) return;
        var key = r.driver_name.toLowerCase().trim();
        if (existingKeys.has(key)) { skipped.push(r.driver_name); return; }
        toInsert.push(r);
      });
      if (toInsert.length === 0) return callback(null, { inserted: 0, skipped: skipped, total: rows.length });
      var genIdQry = `SELECT COALESCE(MAX(CAST(SUBSTRING(driver_id_number, 2) AS UNSIGNED)), 0) + 1 AS nextid FROM driver_register WHERE driver_id_number REGEXP '^D[0-9]+$'`;
      dbutil.execQuery(sqldb, genIdQry, cntxtDtls, function (idErr, idRows) {
        if (idErr) return callback(idErr, null);
        var startId = idRows && idRows[0] ? idRows[0].nextid : 1;
        var vals = toInsert.map(function (r, i) {
          var driverIdNumber = 'D' + String(startId + i).padStart(4, '0');
          return [driverIdNumber, r.driver_name, r.nickname || null, r.dldateofbirth || null, r.mobile_number || null,
            r.alternate_number || null, r.emergency_mobile_number || null, r.aadhar_number || null,
            r.dl_number || null, r.dl_issued_by || null, r.dl_dob || null, r.dl_linked_mobile || null,
            r.dl_expiry_date || null, r.account_holder_name || null,
            r.account_number || null, r.bank_name || null, r.branch_name || null,
            r.ifsc_code || null, r.upi_id || null, r.drivinglicense_joining_date || null,
            r.transportoneissuedate || null, r.transportvalidityfrom || null, r.transportvalidityto || null,
            r.date_of_joining || null, r.reference || null, r.remarks || null, r.address || null,
            userId, usrNm, date, 0];
        });
        var QRY = 'INSERT INTO driver_register (driver_id_number, driver_name, nickname, dldateofbirth, mobile_number, alternate_number, emergency_mobile_number, aadhar_number, dl_number, dl_issued_by, dl_dob, dl_linked_mobile, dl_expiry_date, account_holder_name, account_number, bank_name, branch_name, ifsc_code, upi_id, drivinglicense_joining_date, transportoneissuedate, transportvalidityfrom, transportvalidityto, date_of_joining, reference, remarks, address, user_id, usr_nm, i_ts, d_in) VALUES ?';
        dbutil.execupdateQuery(sqldb, QRY, [vals], cntxtDtls, function (err) {
          if (err) return callback(err, null);
          var people = toInsert.map(function (r, i) {
            var did = 'D' + String(startId + i).padStart(4, '0');
            return { name: r.driver_name, disambiguator: did, key: did };
          });
          createLedgersForImport('Drivers', people, 'driver_register', 'driver_id_number', userId, cntxtDtls, function (made, failed) {
            callback(null, { inserted: toInsert.length, skipped: skipped, total: rows.length, ledgers_created: made, ledgers_failed: failed });
          });
        });
      });
    });

  } else if (type === 'Helper') {
    dbutil.execQuery(sqldb, `SELECT helper_name FROM helper_register WHERE d_in=0`, cntxtDtls, function (err, existing) {
      if (err) return callback(err, null);
      var existingKeys = new Set((existing || []).map(function (r) { return String(r.helper_name || '').toLowerCase().trim(); }));
      var skipped = [], toInsert = [];
      rows.forEach(function (r) {
        if (!r.helper_name) return;
        var key = r.helper_name.toLowerCase().trim();
        if (existingKeys.has(key)) { skipped.push(r.helper_name); return; }
        toInsert.push(r);
      });
      if (toInsert.length === 0) return callback(null, { inserted: 0, skipped: skipped, total: rows.length });
      // helper_id_number is NOT NULL with no default — assign sequential H#### ids for the batch.
      var genIdQry = `SELECT COALESCE(MAX(CAST(SUBSTRING(helper_id_number, 2) AS UNSIGNED)), 0) + 1 AS nextid FROM helper_register WHERE helper_id_number REGEXP '^H[0-9]+$'`;
      dbutil.execQuery(sqldb, genIdQry, cntxtDtls, function (idErr, idRows) {
        if (idErr) return callback(idErr, null);
        var startId = idRows && idRows[0] ? idRows[0].nextid : 1;
        var vals = toInsert.map(function (r, i) {
          var helperIdNumber = 'H' + String(startId + i).padStart(4, '0');
          return [helperIdNumber, r.helper_name, r.nickname || null, r.mobile_number || null, r.alternate_number || null,
            r.emergency_mobile_number || null, r.adhar_number || null, r.account_holder_name || null,
            r.account_number || null, r.bank_name || null, r.branch_name || null,
            r.ifsc_code || null, r.upi_id || null, r.date_of_joining || null,
            r.reference || null, r.remarks || null, r.dob || null, r.address || null,
            userId, usrNm, date, 0];
        });
        var QRY = 'INSERT INTO helper_register (helper_id_number, helper_name, nickname, mobile_number, alternate_number, emergencymobilenumber, adhar_number, account_holder_name, account_number, bank_name, branch_name, ifsc_code, upi_id, date_of_joining, reference, remarks, dob, address, user_id, usr_nm, i_ts, d_in) VALUES ?';
        dbutil.execupdateQuery(sqldb, QRY, [vals], cntxtDtls, function (err) {
          if (err) return callback(err, null);
          var people = toInsert.map(function (r, i) {
            var hid = 'H' + String(startId + i).padStart(4, '0');
            return { name: r.helper_name, disambiguator: hid, key: hid };
          });
          createLedgersForImport('Helpers', people, 'helper_register', 'helper_id_number', userId, cntxtDtls, function (made, failed) {
            callback(null, { inserted: toInsert.length, skipped: skipped, total: rows.length, ledgers_created: made, ledgers_failed: failed });
          });
        });
      });
    });

  } else {
    callback(null, { inserted: 0, skipped: [], total: 0 });
  }
};

