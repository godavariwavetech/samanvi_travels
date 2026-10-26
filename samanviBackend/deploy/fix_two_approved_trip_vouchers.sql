-- Select the LIVE application database before running this whole file.
-- Repairs only T261021021 (1250) and T261021049 (1350).
-- Copies the existing trip approval to its hidden voucher. No amounts, ledger
-- IDs, dates of accounting entries, deleted rows or unrelated trips are changed.
-- Safe to rerun. Rejected vouchers and trips no longer approved are skipped.

START TRANSACTION;

UPDATE trip_created AS t
JOIN tripexpenses_data AS e
  ON e.c_number = t.c_number AND e.d_in = 0
JOIN mainvoucher_t AS v
  ON v.c_number = t.voucher_number AND v.d_in = 0 AND v.source_type = 'trip'
JOIN mainvoucher_subt AS s
  ON s.c_number = v.c_number AND s.d_in = 0
SET v.status = 1,
    v.admin_status_by_id = e.admin_action_by,
    v.admin_status_by_name = e.action_by_name,
    v.admin_status_by_date = e.admin_action_date,
    s.status = 1
WHERE t.c_number IN ('T261021021', 'T261021049')
  AND t.d_in = 0 AND t.status = 1 AND t.admin_status = 1
  AND e.admin_status = 1
  AND v.status IN (0, 1) AND s.status IN (0, 1);

COMMIT;

-- Expected: both vouchers approved (1), with 2 active approved lines each.
-- T261021021: debit 1250, credit 1250.
-- T261021049: debit 1350, credit 1350 (old deleted 1250 lines stay untouched).
SELECT t.c_number AS trip_reference, t.admin_status AS trip_status,
       v.status AS voucher_status,
       COUNT(s.id) AS active_lines,
       SUM(CASE WHEN s.status = 1 THEN 1 ELSE 0 END) AS approved_lines,
       SUM(CASE WHEN s.account_type = 'Debit Account' THEN s.amount ELSE 0 END) AS debit_total,
       SUM(CASE WHEN s.account_type = 'Credit Account' THEN s.amount ELSE 0 END) AS credit_total
FROM trip_created AS t
JOIN mainvoucher_t AS v ON v.c_number = t.voucher_number AND v.d_in = 0
LEFT JOIN mainvoucher_subt AS s ON s.c_number = v.c_number AND s.d_in = 0
WHERE t.c_number IN ('T261021021', 'T261021049') AND t.d_in = 0
GROUP BY t.c_number, t.admin_status, v.status;
