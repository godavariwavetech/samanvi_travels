//Database Connection Establishment
exports.execQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => {
      if (err) {
        return reject(err);
      }

      conn.query(query, params, (err, rows) => {
        conn.release();
        if (err) return reject(err);
        resolve(rows);
      });
    });
  });
};

exports.execinsertQuerys = function (ConPool, Qry, data, cntxtDtls, callback) {
  console.log(Qry);
  console.log(data);
  if (callback && typeof callback == "function") {
    ConPool.getConnection(function (err, connection) {
      // get connection from Connection Pool
      if (err) {
        console.log(err);
        callback(err, null);
        return err;
      }

      // Execute the query
      connection.query(Qry, [data], function (err, rows) {
        connection.release(); // Release connection back to Pool
        if (err) {
          console.log(err);
          callback(true, null);
          return;
        } // Handle Query Errors
        callback(false, rows); // Send the results back
        return;
      });
    });
  } else {
    return new Promise(function (resolve, reject) {
      ConPool.getConnection(function (err, connection) {
        // get connection from Connection Pool
        if (err) {
          // log.db.conError(cntxtDtls,Qry,err.code,err.fatal);
          reject({ err_status: 500, err_message: "internel server" });
        } else {
          // Execute the query

          connection.query(Qry, [data], function (err, rows) {
            connection.release(); // Release connection back to Pool
            if (err) {
              // log.db.qryError(cntxtDtls,Qry,err.code,err.fatal);
              reject({ err_status: 500, err_message: "internal server" });
            } // Handle Query Errors
            else {
              resolve(rows); // Send the results back
            }
          }); // End of Qry Execuiton
        }
      }); // End of get Connection
    }); // End of Promise
  } // End of Else
};

exports.execQuerys = function (ConPool, Qry, data, cntxtDtls, callback) {
  console.log(data);
  if (callback && typeof callback == "function") {
    ConPool.getConnection(function (err, connection) {
      // get connection from Connection Pool
      if (err) {
        console.log(err);
        callback(err, null);
        return err;
      }

      // Execute the query
      connection.query(Qry, [data.number, data.d_in], function (err, rows) {
        connection.release(); // Release connection back to Pool
        if (err) {
          console.log(err);
          callback(true, null);
          return;
        } // Handle Query Errors
        callback(false, rows); // Send the results back
        return;
      });
    });
  } else {
    return new Promise(function (resolve, reject) {
      ConPool.getConnection(function (err, connection) {
        // get connection from Connection Pool
        if (err) {
          // log.db.conError(cntxtDtls,Qry,err.code,err.fatal);
          reject({ err_status: 500, err_message: "internel server" });
        } else {
          // Execute the query

          cconnection.query(
            Qry,
            [data.number, data.d_in],
            function (err, rows) {
              connection.release(); // Release connection back to Pool
              if (err) {
                // log.db.qryError(cntxtDtls,Qry,err.code,err.fatal);
                reject({ err_status: 500, err_message: "internal server" });
              } // Handle Query Errors
              else {
                resolve(rows); // Send the results back
              }
            }
          ); // End of Qry Execuiton
        }
      }); // End of get Connection
    }); // End of Promise
  } // End of Else
};
