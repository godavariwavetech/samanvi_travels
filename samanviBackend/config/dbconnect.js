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
    multipleStatements  : true
});



module.exports = MySQLConPool;
