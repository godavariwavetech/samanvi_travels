exports.execQuery = function (ConPool, Qry, cntxtDtls, callback) {

      if (!ConPool || typeof ConPool.getConnection !== "function") {
            console.error("DATABASE POOL IS UNDEFINED! Fix your pool import.");
            if (callback) {
                  callback({ message: "Database connection failed (Pool undefined)" }, null);
            }
            return;
      }

      if (callback && typeof callback == "function") {
            ConPool.getConnection(function (err, connection) {
                  if (err) {
                        callback(err, null);
                        return;
                  }

                  connection.query(Qry, function (err, rows) {
                        connection.release();
                        if (err) {
                              console.error('execQuery error [' + cntxtDtls + ']:', err.message);
                              callback(err, null);
                              return;
                        }
                        callback(false, rows);
                  });
            });
      } else {
            return new Promise(function (resolve, reject) {
                  ConPool.getConnection(function (err, connection) {
                        if (err) {
                              reject({ err_status: 500, err_message: "internal server" });
                        } else {
                              connection.query(Qry, function (err, rows) {
                                    connection.release();
                                    if (err) {
                                          reject({ err_status: 500, err_message: err });
                                    } else {
                                          resolve(rows);
                                    }
                              });
                        }
                  });
            });
      }
};




exports.sqlinjection = function (ConPool, Qry, data, cntxtDtls, callback) {

      if (callback && typeof callback == "function") {
            ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                  if (err) {
                        console.log(err)
                         callback(err, null); 
                         return err; 
                        }

                  // Execute the query
                  connection.query(Qry, [data], function (err, rows) {

                        connection.release();                  // Release connection back to Pool  
                        if (err) {console.log(err); callback(true, null); return; } // Handle Query Errors          
                        callback(false, rows);                 // Send the results back  
                        return;
                  });
            });
      } else {
            return new Promise(function (resolve, reject) {
                  ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                        if (err) {
                              // log.db.conError(cntxtDtls,Qry,err.code,err.fatal); 
                              reject({ "err_status": 500, "err_message": "internel server" });
                        } else {   // Execute the query
                              connection.query(Qry, [data], function (err, rows) {
                                    connection.release();                  // Release connection back to Pool  
                                    if (err) {
                                          // log.db.qryError(cntxtDtls,Qry,err.code,err.fatal); 
                                          reject({ "err_status": 500, "err_message": "internal server" });
                                    } // Handle Query Errors 
                                    else {
                                          resolve(rows);                 // Send the results back  
                                    }
                              }); // End of Qry Execuiton
                        }

                  }); // End of get Connection

            }); // End of Promise
      } // End of Else
};

exports.onecheckQuery = function (ConPool, Qry, data, cntxtDtls, callback) {
      if (callback && typeof callback == "function") {
            ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                  if (err) { callback(err, null); return err; }

                  // Execute the query
                  connection.query(Qry, [data.check1], function (err, rows) {
                        connection.release();                  // Release connection back to Pool  
                        if (err) { callback(true, null); return; } // Handle Query Errors          
                        callback(false, rows);                 // Send the results back  
                        return;
                  });
            });
      } else {
            return new Promise(function (resolve, reject) {
                  ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                        if (err) {
                              // log.db.conError(cntxtDtls,Qry,err.code,err.fatal); 
                              reject({ "err_status": 500, "err_message": "internel server" });
                        } else {   // Execute the query
                              connection.query(Qry, [data.check1], function (err, rows) {
                                    connection.release();                  // Release connection back to Pool  
                                    if (err) {
                                          // log.db.qryError(cntxtDtls,Qry,err.code,err.fatal); 
                                          reject({ "err_status": 500, "err_message": "internal server" });
                                    } // Handle Query Errors 
                                    else {
                                          resolve(rows);                 // Send the results back  
                                    }
                              }); // End of Qry Execuiton
                        }
                  }); // End of get Connection
            }); // End of Promise
      } // End of Else
};

exports.twocheckQuery = function (ConPool, Qry, data, cntxtDtls, callback) {
      if (callback && typeof callback == "function") {
            ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                  if (err) { callback(err, null); return err; }
                  // Execute the query
                  connection.query(Qry, [data.check1, data.check2], function (err, rows) {
                        connection.release();                  // Release connection back to Pool  
                        if (err) { callback(true, null); return; } // Handle Query Errors          
                        callback(false, rows);                 // Send the results back  
                        return;
                  });
            });
      } else {
            return new Promise(function (resolve, reject) {
                  ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                        if (err) {
                              // log.db.conError(cntxtDtls,Qry,err.code,err.fatal); 
                              reject({ "err_status": 500, "err_message": "internel server" });
                        } else {   // Execute the query
                              connection.query(Qry, [data.check1, data.check2], function (err, rows) {
                                    connection.release();                  // Release connection back to Pool  
                                    if (err) {
                                          // log.db.qryError(cntxtDtls,Qry,err.code,err.fatal); 
                                          reject({ "err_status": 500, "err_message": "internal server" });
                                    } // Handle Query Errors 
                                    else {
                                          resolve(rows);                 // Send the results back  
                                    }
                              }); // End of Qry Execuiton
                        }
                  }); // End of get Connection
            }); // End of Promise
      } // End of Else

};

exports.threecheckQuery = function (ConPool, Qry, data, cntxtDtls, callback) {
      if (callback && typeof callback == "function") {
            ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                  if (err) { callback(err, null); return err; }
                  // Execute the query
                  connection.query(Qry, [data.check1, data.check2, data.check3], function (err, rows) {
                        connection.release();                  // Release connection back to Pool  
                        if (err) { callback(true, null); return; } // Handle Query Errors          
                        callback(false, rows);                 // Send the results back  
                        return;
                  });
            });
      } else {
            return new Promise(function (resolve, reject) {
                  ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                        if (err) {
                              // log.db.conError(cntxtDtls,Qry,err.code,err.fatal); 
                              reject({ "err_status": 500, "err_message": "internel server" });
                        } else {   // Execute the query
                              connection.query(Qry, [data.check1, data.check2, data.check3], function (err, rows) {
                                    connection.release();                  // Release connection back to Pool  
                                    if (err) {
                                          // log.db.qryError(cntxtDtls,Qry,err.code,err.fatal); 
                                          reject({ "err_status": 500, "err_message": "internal server" });
                                    } // Handle Query Errors 
                                    else {
                                          resolve(rows);                 // Send the results back  
                                    }
                              }); // End of Qry Execuiton
                        }
                  }); // End of get Connection
            }); // End of Promise
      } // End of Else

};

exports.allcheckQuery = function (ConPool, Qry, data, cntxtDtls, callback) {
      if (callback && typeof callback == "function") {
            ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                  if (err) { callback(err, null); return err; }
                  // Execute the query
                  connection.query(Qry, data, function (err, rows) {
                        connection.release();                  // Release connection back to Pool  
                        if (err) { callback(true, null); return; } // Handle Query Errors          
                        callback(false, rows);                 // Send the results back  
                        return;
                  });
            });
      } else {
            return new Promise(function (resolve, reject) {
                  ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                        if (err) {
                              // log.db.conError(cntxtDtls,Qry,err.code,err.fatal); 
                              reject({ "err_status": 500, "err_message": "internel server" });
                        } else {   // Execute the query
                              connection.query(Qry, data, function (err, rows) {
                                    connection.release();                  // Release connection back to Pool  
                                    if (err) {
                                          // log.db.qryError(cntxtDtls,Qry,err.code,err.fatal); 
                                          reject({ "err_status": 500, "err_message": "internal server" });
                                    } // Handle Query Errors 
                                    else {
                                          resolve(rows);                 // Send the results back  
                                    }
                              }); // End of Qry Execuiton
                        }
                  }); // End of get Connection
            }); // End of Promise
      } // End of Else

};


// *****************************task management start**************************** //

exports.execupdateQuery = function (ConPool, Qry, data, cntxtDtls, callback) {

      if (callback && typeof callback == "function") {
            ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool
                  if (err) { console.error('execupdateQuery connection error [' + cntxtDtls + ']:', err.message); callback(err, null); return err; }

                  // Execute the query
                  connection.query(Qry, data, function (err, rows) {
                        connection.release();                  // Release connection back to Pool
                        if (err) { console.error('execupdateQuery query error [' + cntxtDtls + ']:', err.message, '| Query:', Qry); callback(err, null); return; } // Handle Query Errors
                        callback(false, rows);                 // Send the results back
                        return;
                  });
            });

      } else {
            return new Promise(function (resolve, reject) {
                  ConPool.getConnection(function (err, connection) {    // get connection from Connection Pool 
                        if (err) {
                              // log.db.conError(cntxtDtls,Qry,err.code,err.fatal); 
                              reject({ "err_status": 500, "err_message": "internel server" });
                        } else {   // Execute the query

                              connection.query(Qry, data, function (err, rows) {
                                    connection.release();                  // Release connection back to Pool  
                                    if (err) {
                                          // log.db.qryError(cntxtDtls,Qry,err.code,err.fatal); 
                                          reject({ "err_status": 500, "err_message": "internal server" });
                                    } // Handle Query Errors 
                                    else {
                                          resolve(rows);                 // Send the results back  
                                    }
                              }); // End of Qry Execuiton
                        }

                  }); // End of get Connection

            }); // End of Promise
      } // End of Else

};


// *****************************task management end **************************** //
