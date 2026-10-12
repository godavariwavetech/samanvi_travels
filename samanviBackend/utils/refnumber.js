// Reference numbers in the voucher style: <prefix><YYMMDD><NNN>.
//
// The date part is the entry's own date (the trip date, the fuel date), the
// same way a voucher number carries its voucher date, and NNN restarts at 001
// for each date. The series are V for vouchers keyed in by hand, T for trips
// (a trip's voucher carries the trip's own number), F for fuel entries.
//
// NNN is one past the highest number already used for that date, deleted rows
// included, so a number is never reissued after a delete. `conn` is anything
// with .query(sql, params, cb) - the pool, or a transaction connection - so a
// caller inside a transaction mints on the same connection.
var moment = require('moment');

function datePart(dateYMD) {
  var m = dateYMD ? moment(String(dateYMD).slice(0, 10), 'YYYY-MM-DD', true) : null;
  if (!m || !m.isValid()) m = moment().utcOffset('+05:30');
  return m.format('YYMMDD');
}

function nextRefNumbers(conn, table, prefix, dateYMD, count, cb) {
  var head = prefix + datePart(dateYMD);
  conn.query(
    'SELECT MAX(CAST(SUBSTRING(c_number, ?) AS UNSIGNED)) AS last FROM ' + table + ' WHERE c_number LIKE ?',
    [head.length + 1, head + '%'],
    function (err, rows) {
      if (err) return cb(err);
      var last = (rows && rows[0] && Number(rows[0].last)) || 0;
      var out = [];
      for (var i = 1; i <= count; i++) out.push(head + String(last + i).padStart(3, '0'));
      cb(null, out);
    }
  );
}

function nextRefNumber(conn, table, prefix, dateYMD, cb) {
  nextRefNumbers(conn, table, prefix, dateYMD, 1, function (err, list) { cb(err, list && list[0]); });
}

module.exports = { datePart: datePart, nextRefNumber: nextRefNumber, nextRefNumbers: nextRefNumbers };
