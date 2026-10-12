var mysql = require('mysql2');

var USER = 'root';
var PWD = '';
var DATABASE = 'latest_samanvi_db';
var DB_HOST_NAME = 'localhost';

var MySQLConPool = mysql.createPool({
    host                : DB_HOST_NAME,
    port      		    : 3306,
    user                : USER,
    password            : PWD,
    database            : DATABASE,
    connectTimeout		: 20000,
    connectionLimit	    : 100,
    debug 		        : false,
    multipleStatements  : true,
    // DATE columns (dob, dl_dob, reg_date, due_date, ...) come back as plain
    // 'YYYY-MM-DD' strings instead of JS Date objects. Without this, mysql2
    // builds a Date at local midnight (IST), which JSON-serialises as the
    // previous day at 18:30Z, so every `select *` shipped e.g. a helper's
    // 1990-01-01 dob to the UI as 1989-12-31. DATETIME/TIMESTAMP are untouched.
    dateStrings         : ['DATE']
});



module.exports = MySQLConPool;
