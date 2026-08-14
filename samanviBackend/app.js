var express = require('express');
const cron = require("node-cron");
var app = express();
// Behind a reverse proxy (typical cPanel/Apache Node.js app setup) the proxy
// terminates TLS and forwards plain HTTP internally — without this, req.protocol
// always reports 'http' even on the live https:// site, which would make
// getImageBaseUrl() (mainCtrl.js) build http:// image URLs on an https:// page.
app.set('trust proxy', true);
const helmet = require('helmet'); // Security headers
var bodyParser = require('body-parser');
var useragent = require('express-useragent');
var expressValidator = require('express-validator')
util   = require('util');
// ssl
const fs = require("fs");
const https = require("https");
// ssl



// Security headers middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            frameAncestors: ["'self'"],
        }
    }
}));


app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root;
  
      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        fld_nm : formParam,
        msg_tx   : msg,
        spld_vl : value
      };
    }
}));

path = require('path');
appRoot = __dirname;


var routcontroller = require('./controllers/mainCtrl');

// Serves driver/staff/helper document uploads when running outside
// production (see IMAGE_UPLOAD_DIR_LOCAL in controllers/mainCtrl.js) — the
// directory only exists, and only gets served, when the production
// `public_html` sibling folder this app expects isn't present.
// Helmet's default Cross-Origin-Resource-Policy (same-origin, set below)
// blocks the browser from using these images when the frontend runs on a
// different origin/port (e.g. the Vite dev server on :5173 loading images
// from this API on :8945) — the request succeeds but the <img> silently
// fails to render. Loosen it to cross-origin for just this static route.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
}));

app.use(useragent.express());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // support encoded bodies

const allowedOrigins = [
    'http://localhost:4200', //for angular
    // 'https://a.amaravathi.it', 
    'http://localhost:4209',
    'http://localhost:3462',
    'https://localhost',
    'http://localhost:5745',
    'https://samanvitravels.in',
    "https://sprint.samanvitravels.in",
    'https://samanvitravels.org.in',
    'https://www.samanvitravels.org.in'
];
app.use(function(req, res, next) {
    const origin = req.headers.origin;
    // console.log(origin)
    // Website you wish to allow to connect
    // res.setHeader('Access-Control-Allow-Origin', '*');
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);
    }
    // Set security headers
    res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
    res.setHeader('X-XSS-Protection', '1; mode=block'); // XSS protection
    res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME-type sniffing
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'); // Enforce HTTPS
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); // Prevent cross-origin risks
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin'); // Restrict resource sharing 
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none';");

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});
app.use(logErrors);
app.use('/nodeapp', require('./routes/routes'));

function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
}

app.get('/', function(req, res) {
    res.send("Empty Api Server");
});

//for ssl

https.createServer({
    key: fs.readFileSync('./privatekey.pem'),
    cert: fs.readFileSync('./cert.crt'),
    passphrase: '123456'
}, app)
    .listen(8945);
console.log('Empty Api Server is listening at http://%s:%s 8945');

// 4009
//for ssl


// Auto-create voucher audit table if not exists
var sqldb_init = require('./config/dbconnect');
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS mainvoucher_audit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        c_number VARCHAR(50) NOT NULL,
        action ENUM('created','edited','approved','rejected') NOT NULL,
        action_by_id VARCHAR(50),
        action_by_name VARCHAR(200),
        action_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        changes_note TEXT,
        INDEX idx_audit_cnumber (c_number)
    )
`, function(err) {
    if (err) console.error('Failed to create mainvoucher_audit table:', err.message);
    else console.log('mainvoucher_audit table ready');
});

// Ensure rejection_reason column exists in mainvoucher_t
sqldb_init.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'mainvoucher_t' AND COLUMN_NAME = 'rejection_reason'
`, function(err, results) {
    if (!err && results.length === 0) {
        sqldb_init.query("ALTER TABLE mainvoucher_t ADD COLUMN rejection_reason TEXT", function(alterErr) {
            if (alterErr) console.error('Failed to add rejection_reason column:', alterErr.message);
            else console.log('Added rejection_reason column to mainvoucher_t');
        });
    }
});

// Ensure the Payables feature's columns exist — added after initial deploy,
// so a fresh/older database (e.g. live) won't have them without this.
function ensureColumn(table, column, ddl) {
    sqldb_init.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
    `, function(err, results) {
        if (!err && results.length === 0) {
            sqldb_init.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`, function(alterErr) {
                if (alterErr) console.error(`Failed to add ${column} column to ${table}:`, alterErr.message);
                else console.log(`Added ${column} column to ${table}`);
            });
        }
    });
}
ensureColumn('mainvoucher_t', 'is_payable', '`is_payable` tinyint(1) NOT NULL DEFAULT 0');
ensureColumn('mainvoucher_subt', 'payables_settled_by', '`payables_settled_by` varchar(50) DEFAULT NULL');
ensureColumn('tyre_master', 'serial_no', '`serial_no` VARCHAR(100) NULL');
ensureColumn('tyre_master', 'vendor_id', '`vendor_id` INT NULL');
ensureColumn('tyre_repair_log', 'vehicle_number', '`vehicle_number` VARCHAR(50) NULL');
ensureColumn('tyre_repair_log', 'odometer', '`odometer` INT NULL');
ensureColumn('tyre_retread_log', 'cost', '`cost` DECIMAL(10,2) DEFAULT 0');
ensureColumn('tyre_position_log', 'voucher_number', '`voucher_number` VARCHAR(30) DEFAULT NULL');
ensureColumn('staff_register', 'dob', '`dob` DATE NULL');
ensureColumn('staff_register', 'address', '`address` TEXT NULL');
ensureColumn('driver_register', 'address', '`address` TEXT NULL');
ensureColumn('driver_register', 'dl_issued_by', '`dl_issued_by` VARCHAR(150) NULL');
ensureColumn('driver_register', 'dl_dob', '`dl_dob` DATE NULL');
ensureColumn('driver_register', 'dl_linked_mobile', '`dl_linked_mobile` VARCHAR(15) NULL');
ensureColumn('helper_register', 'dob', '`dob` DATE NULL');
ensureColumn('helper_register', 'address', '`address` TEXT NULL');
ensureColumn('fuelentry_subt', 'payables_settled_by', '`payables_settled_by` varchar(50) DEFAULT NULL');
ensureColumn('laundrybill_subt', 'payables_settled_by', '`payables_settled_by` varchar(50) DEFAULT NULL');
ensureColumn('parts_master', 'part_number', '`part_number` varchar(50) DEFAULT NULL');
ensureColumn('job_parts_used', 'qty',  '`qty`  DECIMAL(10,2) DEFAULT 1');
ensureColumn('job_parts_used', 'rate', '`rate` DECIMAL(10,2) DEFAULT 0');
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS job_ledger_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_card_id VARCHAR(100),
        job_card_number VARCHAR(100),
        ledger_id INT,
        amount DECIMAL(12,2),
        entry_type ENUM('debit','credit'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) console.error('Failed to create job_ledger_entries table:', err.message);
    else console.log('job_ledger_entries table ready');
});
ensureColumn('service_reminders', 'is_repeating', '`is_repeating` tinyint(1) NOT NULL DEFAULT 0');
ensureColumn('service_reminders', 'repeat_interval', '`repeat_interval` int DEFAULT NULL');
ensureColumn('service_reminders', 'repeat_unit', '`repeat_unit` varchar(10) DEFAULT NULL');
ensureColumn('busses', 'company', '`company` varchar(100) DEFAULT NULL');
ensureColumn('service_reminders', 'ref_number', '`ref_number` varchar(30) DEFAULT NULL');
ensureColumn('service_reminders', 'job_card_number', '`job_card_number` varchar(30) DEFAULT NULL');
ensureColumn('service_reminders', 'source_job_card_id', '`source_job_card_id` int DEFAULT NULL');
ensureColumn('service_reminders', 'source_job_card_number', '`source_job_card_number` varchar(30) DEFAULT NULL');
ensureColumn('vehicle_jobs', 'source_reminder_id', '`source_reminder_id` int DEFAULT NULL');
ensureColumn('vehicle_jobs', 'source_reminder_ref', '`source_reminder_ref` varchar(30) DEFAULT NULL');
ensureColumn('service_schedules', 'days_interval', '`days_interval` int DEFAULT NULL');
ensureColumn('service_schedules', 'free_or_paid', "`free_or_paid` varchar(10) DEFAULT 'Free'");
ensureColumn('driverone', 'optDriverSalary', '`optDriverSalary` VARCHAR(50) DEFAULT NULL');
ensureColumn('driverone', 'optHelperSalary', '`optHelperSalary` VARCHAR(50) DEFAULT NULL');
// Up/Down — manual per-route classification (Up = local Hyderabad buses, Down =
// everything else), set once when the service number is created/edited, never
// derived from fromCity/toCity.
ensureColumn('driverone', 'up_down', "`up_down` VARCHAR(10) DEFAULT NULL");

// Lubricants & Fluids — per-company change periodicities for engine oil,
// coolant, gear oil etc., managed from Main Masters alongside Service Schedules.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS lubricant_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(100) NOT NULL,
        aggregate_name VARCHAR(100) NOT NULL,
        quantity VARCHAR(100) DEFAULT NULL,
        fluid_type VARCHAR(150) DEFAULT NULL,
        recommended_brand VARCHAR(150) DEFAULT NULL,
        change_periodicity VARCHAR(100) DEFAULT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ls_company (company_name)
    )
`, function(err) {
    if (err) console.error('Failed to create lubricant_schedules table:', err.message);
    else console.log('lubricant_schedules table ready');
});

// Bus master edit-history log — records a note of what changed on every
// update so the Bus Number Master table can show a per-bus audit trail.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS bus_edit_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bus_id INT NOT NULL,
        bus_no VARCHAR(50),
        changes_note TEXT,
        changed_by_id VARCHAR(50),
        changed_by_name VARCHAR(200),
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_beh_bus (bus_id)
    )
`, function(err) {
    if (err) console.error('Failed to create bus_edit_history table:', err.message);
    else console.log('bus_edit_history table ready');
});

// Trip master edit-history log — records a note of what changed (bus/driver/
// helper/conductor reassignment) on every trip_created update, mirroring
// bus_edit_history above so Trip Expenses' edit modal can show an audit trail.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS trip_edit_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id INT NOT NULL,
        c_number VARCHAR(50),
        changes_note TEXT,
        changed_by_id VARCHAR(50),
        changed_by_name VARCHAR(200),
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_teh_trip (trip_id)
    )
`, function(err) {
    if (err) console.error('Failed to create trip_edit_history table:', err.message);
    else console.log('trip_edit_history table ready');
});

// Driver Register edit-history log — same shape as bus_edit_history/
// trip_edit_history above, records what changed on every driver profile edit.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS driver_edit_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        driver_id_number VARCHAR(50),
        changes_note TEXT,
        changed_by_id VARCHAR(50),
        changed_by_name VARCHAR(200),
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_deh_driver (driver_id)
    )
`, function(err) {
    if (err) console.error('Failed to create driver_edit_history table:', err.message);
    else console.log('driver_edit_history table ready');
});

// Auto-create the payables payment-history table if not exists — logs every
// settle/reverse event against a payable transaction row, so the full
// payment history (not just the most recent settling voucher) is queryable.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS payables_payment_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source_table VARCHAR(50) NOT NULL,
        source_id INT NOT NULL,
        c_number VARCHAR(50) NOT NULL,
        payment DECIMAL(12,2) NOT NULL DEFAULT 0,
        balance_after DECIMAL(12,2) NOT NULL DEFAULT 0,
        action ENUM('settled','reversed') NOT NULL DEFAULT 'settled',
        created_by_id VARCHAR(50),
        created_by_name VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pph_source (source_table, source_id)
    )
`, function(err) {
    if (err) console.error('Failed to create payables_payment_history table:', err.message);
    else console.log('payables_payment_history table ready');
});

// expensive_details can't carry an inline payables_settled_by column like
// mainvoucher_subt/fuelentry_subt/laundrybill_subt do — it's already at
// MariaDB's max row size. This side table is the substitute: it's how a
// payables voucher's settlement of a trip-expense row gets tracked, so
// rejecting/editing that voucher can still find and unsettle the row instead
// of leaving it stuck marked "paid" forever.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS payables_settled_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source_table VARCHAR(50) NOT NULL,
        source_id INT NOT NULL,
        c_number VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_psl_source (source_table, source_id)
    )
`, function(err) {
    if (err) console.error('Failed to create payables_settled_links table:', err.message);
    else console.log('payables_settled_links table ready');
});

// Garage extension: service reminders, tyre inventory/position, battery management
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS service_reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_number VARCHAR(50) NOT NULL,
        reminder_type VARCHAR(100) NOT NULL,
        due_date DATE NULL,
        due_odometer INT NULL,
        last_done_date DATE NULL,
        last_done_odometer INT NULL,
        status ENUM('Pending','Completed') NOT NULL DEFAULT 'Pending',
        remarks TEXT,
        created_by_id VARCHAR(50),
        created_by_name VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        INDEX idx_sr_vehicle (vehicle_number)
    )
`, function(err) {
    if (err) console.error('Failed to create service_reminders table:', err.message);
    else console.log('service_reminders table ready');
});

sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS tyre_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tyre_code VARCHAR(50) NOT NULL UNIQUE,
        brand VARCHAR(100),
        size VARCHAR(50),
        purchase_date DATE NULL,
        cost DECIMAL(10,2) DEFAULT 0,
        status ENUM('In Stock','In Use','Retreaded','Scrapped') NOT NULL DEFAULT 'In Stock',
        current_vehicle_number VARCHAR(50) NULL,
        current_position VARCHAR(20) NULL,
        remarks TEXT,
        created_by_id VARCHAR(50),
        created_by_name VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        d_in TINYINT NOT NULL DEFAULT 0
    )
`, function(err) {
    if (err) console.error('Failed to create tyre_master table:', err.message);
    else console.log('tyre_master table ready');
});

// Adds the 'Sold' and 'Pending Retread' statuses alongside In Stock/In
// Use/Retreaded/Scrapped — safe to re-run on every boot since it's just a
// superset of the existing enum. "Pending Retread" covers a worn tyre pulled
// off a bus and sent to store awaiting retreading, before it's actually
// retreaded (which is when it becomes "Retreaded").
sqldb_init.query(`
    ALTER TABLE tyre_master MODIFY COLUMN status ENUM('In Stock','In Use','Retreaded','Scrapped','Sold','Pending Retread') NOT NULL DEFAULT 'In Stock'
`, function(err) {
    if (err) console.error('Failed to update tyre_master status enum:', err.message);
    else console.log('tyre_master.status includes Sold and Pending Retread');
});

sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS tyre_position_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tyre_id INT NOT NULL,
        vehicle_number VARCHAR(50) NOT NULL,
        position VARCHAR(20) NOT NULL,
        odometer_at_fitting INT NULL,
        fitted_date DATE NULL,
        removed_date DATE NULL,
        remarks TEXT,
        created_by_id VARCHAR(50),
        created_by_name VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        d_in TINYINT NOT NULL DEFAULT 0,
        INDEX idx_tpl_tyre (tyre_id),
        INDEX idx_tpl_vehicle (vehicle_number)
    )
`, function(err) {
    if (err) console.error('Failed to create tyre_position_log table:', err.message);
    else console.log('tyre_position_log table ready');
});

sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS tyre_retread_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tyre_id INT NOT NULL,
        retread_date DATE NULL,
        vendor_id INT NULL,
        remarks TEXT,
        created_by_id VARCHAR(50),
        created_by_name VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        d_in TINYINT NOT NULL DEFAULT 0,
        INDEX idx_trl_tyre (tyre_id)
    )
`, function(err) {
    if (err) console.error('Failed to create tyre_retread_log table:', err.message);
    else console.log('tyre_retread_log table ready');
});

sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS tyre_repair_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tyre_id INT NOT NULL,
        repair_date DATE NULL,
        vehicle_number VARCHAR(50) NULL,
        odometer INT NULL,
        repair_type VARCHAR(100),
        vendor_id INT NULL,
        cost DECIMAL(10,2) DEFAULT 0,
        remarks TEXT,
        created_by_id VARCHAR(50),
        created_by_name VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        d_in TINYINT NOT NULL DEFAULT 0,
        INDEX idx_trp_tyre (tyre_id)
    )
`, function(err) {
    if (err) console.error('Failed to create tyre_repair_log table:', err.message);
    else console.log('tyre_repair_log table ready');
});

sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS battery_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        battery_code VARCHAR(50) NOT NULL UNIQUE,
        brand VARCHAR(100),
        capacity_ah VARCHAR(20),
        vehicle_number VARCHAR(50) NULL,
        install_date DATE NULL,
        warranty_months INT NULL,
        cost DECIMAL(10,2) DEFAULT 0,
        status ENUM('Active','Replaced','Scrapped') NOT NULL DEFAULT 'Active',
        remarks TEXT,
        created_by_id VARCHAR(50),
        created_by_name VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        d_in TINYINT NOT NULL DEFAULT 0
    )
`, function(err) {
    if (err) console.error('Failed to create battery_master table:', err.message);
    else console.log('battery_master table ready');
});

// Garage type masters — managed from the Main Masters module
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS service_reminder_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_name VARCHAR(100) NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) { console.error('Failed to create service_reminder_types table:', err.message); return; }
    console.log('service_reminder_types table ready');
    sqldb_init.query('SELECT COUNT(*) AS c FROM service_reminder_types', function(cErr, rows) {
        if (!cErr && rows[0].c === 0) {
            const defaults = ['Oil Change', 'General Service', 'Insurance Renewal', 'Permit Renewal', 'Fitness Certificate', 'Tyre Rotation', 'Battery Check', 'Other'];
            sqldb_init.query('INSERT INTO service_reminder_types (type_name) VALUES ' + defaults.map(() => '(?)').join(','), defaults, function(iErr) {
                if (iErr) console.error('Failed to seed service_reminder_types:', iErr.message);
                else console.log('Seeded default service reminder types');
            });
        }
    });
});

sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS tyre_positions_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        position_name VARCHAR(50) NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) { console.error('Failed to create tyre_positions_master table:', err.message); return; }
    console.log('tyre_positions_master table ready');
    sqldb_init.query('SELECT COUNT(*) AS c FROM tyre_positions_master', function(cErr, rows) {
        if (!cErr && rows[0].c === 0) {
            const defaults = ['Front Left', 'Front Right', 'Rear Left Outer', 'Rear Left Inner', 'Rear Right Outer', 'Rear Right Inner', 'Spare 1', 'Spare 2'];
            sqldb_init.query('INSERT INTO tyre_positions_master (position_name) VALUES ' + defaults.map(() => '(?)').join(','), defaults, function(iErr) {
                if (iErr) console.error('Failed to seed tyre_positions_master:', iErr.message);
                else console.log('Seeded default tyre positions');
            });
        }
    });
});

sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS tyre_vendors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_name VARCHAR(150) NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) console.error('Failed to create tyre_vendors table:', err.message);
    else console.log('tyre_vendors table ready');
});

// Tyre Sizes — master list so "Size of Tyre" on the New Tyre Entry form is
// picked from Garage Masters instead of freehand text.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS tyre_sizes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        size_name VARCHAR(50) NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) { console.error('Failed to create tyre_sizes table:', err.message); return; }
    console.log('tyre_sizes table ready');
    sqldb_init.query('SELECT COUNT(*) AS c FROM tyre_sizes', function(cErr, rows) {
        if (!cErr && rows[0].c === 0) {
            const defaults = ['295/80 R22.5', '10.00-20', '9.00-20', '235/75 R17.5', '7.50-16', '215/75 R17.5'];
            sqldb_init.query('INSERT INTO tyre_sizes (size_name) VALUES ' + defaults.map(() => '(?)').join(','), defaults, function(iErr) {
                if (iErr) console.error('Failed to seed tyre_sizes:', iErr.message);
                else console.log('Seeded default tyre sizes');
            });
        }
    });
});

// Tyre Makes — manufacturer/brand master so "Make" on the New Tyre Entry form is
// picked from Tyre Masters instead of freehand text.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS tyre_makes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        make_name VARCHAR(100) NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) { console.error('Failed to create tyre_makes table:', err.message); return; }
    console.log('tyre_makes table ready');
    sqldb_init.query('SELECT COUNT(*) AS c FROM tyre_makes', function(cErr, rows) {
        if (!cErr && rows[0].c === 0) {
            const defaults = ['MRF', 'CEAT', 'JK Tyre', 'Apollo', 'Bridgestone', 'Goodyear'];
            sqldb_init.query('INSERT INTO tyre_makes (make_name) VALUES ' + defaults.map(() => '(?)').join(','), defaults, function(iErr) {
                if (iErr) console.error('Failed to seed tyre_makes:', iErr.message);
                else console.log('Seeded default tyre makes');
            });
        }
    });
});

// Vehicle Companies — manufacturer/brand master used by the Bus master and Service Schedules
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS vehicle_companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(100) NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) { console.error('Failed to create vehicle_companies table:', err.message); return; }
    console.log('vehicle_companies table ready');
    sqldb_init.query('SELECT COUNT(*) AS c FROM vehicle_companies', function(cErr, rows) {
        if (!cErr && rows[0].c === 0) {
            const defaults = ['Ashok Leyland', 'Tata', 'Volvo', 'Scania', 'Eicher', 'Mahindra', 'BharatBenz', 'Other'];
            sqldb_init.query('INSERT INTO vehicle_companies (company_name) VALUES ' + defaults.map(() => '(?)').join(','), defaults, function(iErr) {
                if (iErr) console.error('Failed to seed vehicle_companies:', iErr.message);
                else console.log('Seeded default vehicle companies');
            });
        }
    });
});

// Service Schedules — per-company service intervals (used to auto-fill Service Reminders)
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS service_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(100) NOT NULL,
        service_type VARCHAR(100) NOT NULL,
        sub_type VARCHAR(100) DEFAULT NULL,
        km_interval INT NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ss_company (company_name)
    )
`, function(err) {
    if (err) console.error('Failed to create service_schedules table:', err.message);
    else console.log('service_schedules table ready');
});

// Battery Brand — type master used by Battery Management, managed from Main Masters
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS battery_brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand_name VARCHAR(100) NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) { console.error('Failed to create battery_brands table:', err.message); return; }
    console.log('battery_brands table ready');
    sqldb_init.query('SELECT COUNT(*) AS c FROM battery_brands', function(cErr, rows) {
        if (!cErr && rows[0].c === 0) {
            const defaults = ['Exide', 'Amaron', 'Amco', 'SF Sonic', 'Luminous', 'Okaya', 'Livguard', 'Other'];
            sqldb_init.query('INSERT INTO battery_brands (brand_name) VALUES ' + defaults.map(() => '(?)').join(','), defaults, function(iErr) {
                if (iErr) console.error('Failed to seed battery_brands:', iErr.message);
                else console.log('Seeded default battery brands');
            });
        }
    });
});

// Battery Capacity — type master used by Battery Management, managed from Main Masters
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS battery_capacities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        capacity_ah VARCHAR(20) NOT NULL,
        d_in TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, function(err) {
    if (err) { console.error('Failed to create battery_capacities table:', err.message); return; }
    console.log('battery_capacities table ready');
    sqldb_init.query('SELECT COUNT(*) AS c FROM battery_capacities', function(cErr, rows) {
        if (!cErr && rows[0].c === 0) {
            const defaults = ['100Ah', '120Ah', '135Ah', '150Ah', '165Ah', '180Ah', '200Ah'];
            sqldb_init.query('INSERT INTO battery_capacities (capacity_ah) VALUES ' + defaults.map(() => '(?)').join(','), defaults, function(iErr) {
                if (iErr) console.error('Failed to seed battery_capacities:', iErr.message);
                else console.log('Seeded default battery capacities');
            });
        }
    });
});

// Battery edit history — logs a human-readable diff on every edit, same shape as
// bus_edit_history, so Battery Management can show a per-battery audit trail.
sqldb_init.query(`
    CREATE TABLE IF NOT EXISTS battery_edit_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        battery_id INT NOT NULL,
        battery_code VARCHAR(50),
        changes_note TEXT,
        changed_by_id VARCHAR(50),
        changed_by_name VARCHAR(200),
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_beh_battery (battery_id)
    )
`, function(err) {
    if (err) console.error('Failed to create battery_edit_history table:', err.message);
    else console.log('battery_edit_history table ready');
});

// Battery Management ↔ Accounting integration columns
ensureColumn('battery_master', 'voucher_number', '`voucher_number` varchar(30) DEFAULT NULL');
ensureColumn('mainvoucher_t', 'battery_code', '`battery_code` varchar(50) DEFAULT NULL');

// Tyre Inventory ↔ Accounting integration columns (standalone tyre purchases)
ensureColumn('tyre_master', 'voucher_number', '`voucher_number` varchar(30) DEFAULT NULL');
ensureColumn('mainvoucher_t', 'tyre_code', '`tyre_code` varchar(50) DEFAULT NULL');

//for local — superseded by the https.createServer listener above, which is
// what production actually needs (the frontend hits https://…:8945 directly,
// not through a reverse proxy). Both can't bind to :8945 at once.
// var server = app.listen(8945, function() {
//     var host = server.address().address;
//     var port = server.address().port;
//     console.log('8975 Empty API Server is listening at http://%s:%s', host, port);
// });

// cron.schedule("0 7 * * *", () => {
//   console.log("7 AM Cron Started");
//   routcontroller.handleRepeatedJobs();
// }, {
//   timezone: "Asia/Kolkata"
// });

cron.schedule("26 7 * * *", () => {
  console.log("7:26 AM Cron Started");
  routcontroller.handleRepeatedJobs();
}, {
  timezone: "Asia/Kolkata"
});

//for local