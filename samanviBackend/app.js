var express = require('express');
const cron = require("node-cron");
var app = express();
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
    "https://sprint.samanvitravels.in"
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

// https.createServer({
//     key: fs.readFileSync('./privatekey.pem'),
//     cert: fs.readFileSync('./cert.crt'),
//     passphrase: '123456'
// }, app)
//     .listen(8945);
// console.log('Empty Api Server is listening at http://%s:%s 8945');

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

//for local
var server = app.listen(8945, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('8975 Empty API Server is listening at http://%s:%s', host, port);
});

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