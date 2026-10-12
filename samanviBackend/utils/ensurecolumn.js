// Adds a column when the schema has not got it yet, and reports whether it is
// actually there, so a model can leave the column out of its SQL instead of
// answering 500 on a database where the ALTER could not run.
//
// Staging is why this exists: on 2026-09-12 the fuel_entry and
// laundrybill_maint `rejection_reason` migrations did not take, and because
// the list query and the approve/reject update both named the column outright,
// the Laundry Bills list and every fuel approval failed with "Unknown column".
// A missing column should cost the feature that needs it, not the page.
//
// Returns a live object: `present` flips to true the moment the column is
// confirmed or added, and `error` holds the last failure for the log.
module.exports = function ensureColumn(db, table, column, definition) {
  var state = { present: false, error: null };
  var tag = '[DB] ' + table + '.' + column;
  var attempts = 0;
  var MAX_ATTEMPTS = 12;
  var RETRY_MS = 5 * 60 * 1000;

  function check(next) {
    db.query(
      'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS' +
      ' WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, column],
      function (err, rows) {
        if (err) {
          state.error = err.message;
          console.error(tag + ' check failed:', err.message);
          return next(false);
        }
        next(!!(rows && rows[0] && Number(rows[0].c) > 0));
      }
    );
  }

  function attempt() {
    attempts++;
    check(function (present) {
      if (present) {
        state.present = true;
        state.error = null;
        console.log(tag + ' is present');
        return;
      }
      db.query('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + definition, function (err) {
        if (!err) {
          state.present = true;
          state.error = null;
          console.log(tag + ' column added');
          return;
        }
        state.error = err.message;
        console.error(tag + ' could NOT be added:', err.message,
          '— queries will leave the column out until it exists');
        // A locked table or a missing privilege is usually fixed without a
        // redeploy, and nothing else would pick the column up afterwards.
        if (attempts < MAX_ATTEMPTS) {
          var t = setTimeout(attempt, RETRY_MS);
          if (t.unref) t.unref();
        }
      });
    });
  }

  attempt();
  return state;
};
