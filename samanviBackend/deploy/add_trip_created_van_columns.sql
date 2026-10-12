-- Adds the trip_created columns that came with the Van work.
--
-- Symptom this fixes: editing a trip in Trip Creation answered
-- {"status":500,"data":null}. The edit sends trip_run_status, opt_driver1_id and
-- opt_driver1_name on every save (and hirer_name / line_code / booking_amount /
-- opt_driver1_mobile for a van), so against a trip_created that predates the Van
-- work the UPDATE failed on "Unknown column".
--
-- The backend runs the same ALTERs at start-up (ensureColumn in app.js), so this
-- is only needed when you cannot restart the Node process right now. Idempotent:
-- each statement is skipped when the column already exists, in the same
-- IF(... 'DO 0') + PREPARE shape deploy/staging_reset.sql already uses.
--
-- Check first (no rows = table is current):
--   SELECT COLUMN_NAME FROM information_schema.columns
--    WHERE table_schema = DATABASE() AND table_name = 'trip_created'
--      AND column_name IN ('vehicle_type','trip_run_status','hirer_name','line_code','booking_amount','opt_driver1_id','opt_driver1_name','opt_driver1_mobile','opt_driver2_id','opt_driver2_name','opt_helper_id','opt_helper_name','driver1_paid_direct','driver2_paid_direct','helper_paid_direct','conductor_paid_direct');

SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'vehicle_type') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `vehicle_type` varchar(10) DEFAULT ''bus''', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'trip_run_status') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `trip_run_status` varchar(20) DEFAULT ''Running''', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'hirer_name') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `hirer_name` varchar(255) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'line_code') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `line_code` varchar(50) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'booking_amount') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `booking_amount` decimal(12,2) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'opt_driver1_id') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `opt_driver1_id` int(11) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'opt_driver1_name') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `opt_driver1_name` varchar(255) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'opt_driver1_mobile') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `opt_driver1_mobile` varchar(15) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'opt_driver2_id') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `opt_driver2_id` int(11) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'opt_driver2_name') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `opt_driver2_name` varchar(255) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'opt_helper_id') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `opt_helper_id` int(11) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'opt_helper_name') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `opt_helper_name` varchar(255) DEFAULT NULL', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'driver1_paid_direct') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `driver1_paid_direct` tinyint(1) DEFAULT 0', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'driver2_paid_direct') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `driver2_paid_direct` tinyint(1) DEFAULT 0', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'helper_paid_direct') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `helper_paid_direct` tinyint(1) DEFAULT 0', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'trip_created' AND column_name = 'conductor_paid_direct') = 0, 'ALTER TABLE `trip_created` ADD COLUMN `conductor_paid_direct` tinyint(1) DEFAULT 0', 'DO 0'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
