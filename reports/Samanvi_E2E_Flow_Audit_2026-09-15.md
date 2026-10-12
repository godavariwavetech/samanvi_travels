# Samanvi Travels — End-to-End Flow Audit

**Vehicles → Service Numbers → Staff & Ledgers → Trips → Trip Expenses → Vouchers & Approval → Ledger Reports → Payables & Payments**

| | |
|---|---|
| Audit date | 15 September 2026 |
| Code audited | Branch `staging` working tree, including the uncommitted changes made on 15 Sep: export, active/inactive service numbers, validations, popup forms |
| Environment | Local backend `https://localhost:8945/nodeapp`, MariaDB `latest_samanvi_db` (non-strict `sql_mode`) |
| Method | Code reading, plus real HTTP API calls using the same payloads the React pages send, with every result checked in the database |
| Test data | Every record was tagged `ZZTEST1`–`ZZTEST5`, trips used far-future dates, and all test data was hard-deleted afterwards. A final check found 0 test rows left. No real record was changed, and no app code was modified during the audit |

---

## 1. Executive summary

The main business path works when the screens are used as intended:
- vehicles, service numbers and people can be created;
- people get their payable ledgers automatically;
- trips are created with correct duplicate rules;
- every trip-expense voucher built by the Trip Expenses page balanced, and each crew member's ledger was credited with exactly their beta plus any opting salary;
- a driver's payable goes from posted to partly paid to zero correctly in **Ledger Wise**.

Around that path, the audit found problems that put the **books and the data at risk**:

1. **Security.** Several trip and expense endpoints work without a login, and many screens build SQL from raw text. Any apostrophe (D'Souza, O'Brien, "driver's") makes those saves fail, and crafted input can read or change other records.
2. **Accounting integrity.** The server never checks vouchers. It accepted unbalanced vouchers and double submissions, and it lets approved vouchers be edited or deleted.
   - Approving a trip does not approve its voucher.
   - Deleting a trip or its expense leaves the voucher live.
   - Payables View ignores payments made in Voucher Entry, so the same driver can be paid twice.
3. **Reports disagree with each other.**
   - Trial Balance filters on the entry timestamp.
   - Balance Sheet has no brought-forward balances.
   - Day Book shows unapproved entries.
   - Renaming or deleting a ledger breaks Trial Balance, Balance Sheet and voucher editing.
4. **Master data drifts.**
   - Duplicate vehicles, service numbers and people get through Excel import.
   - Import and export round-trips wipe fields.
   - Rates are looked up by service-number text instead of by id.
   - This drift is the root cause of the "Service For showing double entry" issue.
5. **Some pages don't work.** Deleted Trips never lists anything, Trip Reports ignores its filters, Trip Logs shows wrong counts, and Payroll's salary report and salary payment don't function.

### Results by area

| # | Area | Scenarios run | Pass | Bug | Gap | Code review / not tested |
|---|---|---|---|---|---|---|
| 1 | Masters: vehicles & people | 117 + 13 code review | 62 | 41 | 14 | 13 |
| 2 | Service numbers | 98 | 35 | 29 | 24 | 9 / 1 |
| 3 | Trip creation & trip lifecycle | 75 | 36 | 22 | 10 | 5 / 2 |
| 4 | Trip expenses, vouchers & approval | 77 | 52 | 25 (bugs + gaps) | – | 4 |
| 5 | Ledgers, payments & payables | 98 | 45 | 40 | 10 | 2 / 1 |
| | **Total** | **≈ 478** | **≈ 230** | **≈ 157** | **≈ 58** | |

Result meanings:
- **PASS**: ran and behaved correctly.
- **BUG**: ran and misbehaved.
- **GAP**: a validation or feature the screen implies is missing.
- **CODE REVIEW**: concluded from reading the code, not run.

Area 4 records failures as a single count, so its bugs and gaps are combined.

---

## 2. How the whole flow works today

1. **Vehicles** (Masters → Bus Numbers).
   - Normal buses and vans live in `busses`; a van is a normal vehicle whose type is VAN.
   - A hire vehicle is linked to an owner ledger under *Current Liabilities → Payables → Hire Vehicles*.
   - A spare tank is a flag.
   - Sold / Service Out sets `d_in=1`.
   - Excel import updates existing numbers in place.
2. **People** (Masters → Staff Register).
   - Adding a driver, helper or staff member writes the register row and **auto-creates a ledger** under *Payables → Drivers / Helpers / Staff*, named after the person. If that name is taken, the ID is appended, e.g. "Ravi (D0012)".
   - Manual add generates the D#### / H#### ID. Excel import takes the ID from the sheet.
   - Driver edits rename the ledger and write Driver History.
3. **Service numbers** (Masters → Service Numbers).
   - Routes live in `driverone`, with betas, opting salaries, parking, and Up/Down (bus) or pick/drop, operator and line code (van).
   - Halt Beta is one company-wide amount.
   - A route can be switched off from a date (`is_active`, `inactive_from`).
4. **Trip Creation.**
   - The Bus grid has one row per active route for the date; the Van roster works the same way.
   - Saving writes `trip_created` with a T-number (T + yymmdd + nnn).
   - Duplicates are skipped: one trip per service per day, one bus per day.
   - **No voucher is posted at creation.**
5. **Trip Expenses.**
   - Opening a trip prices it from the route's **current** betas, or from Halt Beta for a halted trip.
   - "Pay X" ticks credit each crew member's ledger. The remainder goes to Paid To, and expense ledgers are debited (Betas, Salaries, Parking, Hire vehicle charges).
   - Filing writes `tripexpenses_data`, `expensive_details` and a **Journal voucher numbered with the trip's T-number** (`mainvoucher_t` / `mainvoucher_subt`, status pending).
6. **Approval.**
   - Trip approval (Trip Expenses select / Admin Approvals) sets `admin_status` on the trip and expense rows.
   - **Voucher approval is a separate step** in Accounts → Voucher (Approvals). Only approved voucher lines reach Ledger Wise, Trial Balance and Balance Sheet.
7. **Payables & payments.** There are two different ways to pay:
   - (a) a **Payment voucher** in Voucher Entry: it reduces the ledger balance once approved;
   - (b) **Payables View** settlement: it marks the liability rows paid when submitted.
   - The two paths do not know about each other.
8. **Reports.**
   - Ledger Wise, Balance Sheet, P&L and Group Wise use the voucher date and approved rows.
   - Trial Balance uses the entry timestamp and groups by the stored ledger name.
   - Day Book includes every status.

---

## 3. Priority issues (consolidated across all areas)

Severity reflects business impact. IDs in brackets point to the detailed scenario rows in Reports A–E.

### 3.1 Critical — fix first

| # | Issue | Evidence | Where | Fix |
|---|---|---|---|---|
| C1 | **Trip, expense and people endpoints need no login.** Without a token, the audit created, edited and deleted trips, filed expenses, and read 192 staff/driver/helper records | Rpt C A1, D4, M5; Rpt D S28; Rpt A S01; Rpt B A14 | `samanviBackend/routes/routes.js` lines 156-162, 186, 222-228 (`/tripcreated`, `/bulkcreatetrips`, `/deletetripcreated`, `/gettripceated1`, `/addexpensesdetails`, `/updateexpensesdetails`, `/deleteexpense`, `/getexpenses*`, `/getallstfdrivhelp`), plus `/addsparetankbusno` (505) | Add `verifyToken` to every route, and take the user id from the token |
| C2 | **SQL injection.** One crafted id deleted two trips; one service-number edit updated two routes and overwrote other columns; an Aadhar-name value dumped all 101 drivers' records | Rpt C D3; Rpt B E6, E7; Rpt A P08 | `mainModel.js`: `deletetripcreated` 5539, `updateservicenoMdl` 10426, `checknameMdl` 1431-1480, `terminateStaffMdl` 2139, `updateLedgerNameMdl` 11826, group code 11283/11745, expense filing 5023-5054, `updatetripadminstatusMdl` 6265 and others. The pool has `multipleStatements: true` | Replace string-built SQL with `?` placeholders everywhere, and turn off `multipleStatements` |
| C3 | **Apostrophes break saves.** Anyone named D'Souza / O'Brien / D'Cruz can't be registered. A remark like "driver's" fails trip edits and expense filing, and the expense is never filed. A termination reason "Didn't report" fails. Service-number, Service For, designation, group and ledger names with a quote fail | Rpt A P09, P21, P32, P39, D03; Rpt B E2, E3, M5; Rpt C E1, AP2; Rpt D S26; Rpt E G5, L4b | Same root cause as C2 | Same fix as C2 |
| C4 | **Payables View ignores payments made in Voucher Entry.** A driver at 0 in Ledger Wise still shows 12,000 outstanding in Payables View, so they can be paid twice. Payables View also marks rows paid **before approval**, doesn't re-settle on re-approval, doesn't un-settle on delete, and accepted paying the same liability twice (driver ended 1,000 Dr) | Rpt E R8, R10, PV4, PV7, PV8, D2 | `PayablesViewPage.tsx:1178-1186`, `mainCtrl.js:5466` (`payablesledgerupdate`), 3522-3534 | Work out outstanding from approved ledger postings (allocate payments against liabilities), settle on approval, un-settle on reject/delete, and cap payments at the current balance |
| C5 | **The server accepts any voucher.** Unbalanced (Dr 1650 / Cr 1), negative, empty, same-ledger-both-sides and no-ledger lines were all accepted. With one unbalanced voucher approved, Trial Balance showed Dr 68,050 / Cr 67,950. A double submit of a hired-van expense posted the hire charge twice under the same T-number | Rpt D S25, S27; Rpt E T3-T7, TB1 | `mainCtrl.js:2225-2332` (trip filing), `3297-3371` (voucher entry); `createTripVoucherMdl` `mainModel.js:14583` | Validate on the server: Σ Dr = Σ Cr > 0, positive amounts, valid active ledgers. Wrap header and lines in one transaction, and refuse a second active voucher with the same number |

### 3.2 High

| # | Issue | Evidence | Where | Fix |
|---|---|---|---|---|
| H1 | **Approving a trip doesn't approve its voucher**, so approved trips never reach Ledger Wise or Trial Balance until someone approves again in Voucher Approvals. **Rejecting** a trip leaves its voucher pending, so it can still be approved and posted | Rpt D A03, A04, A07, R01 | `updatetripadminstatusMdl` `mainModel.js:6265-6274` | Set the voucher status together with the trip status, or keep trip vouchers out of Voucher Approvals |
| H2 | **Deleting an expense deletes the whole trip and leaves its voucher live.** Deleting a trip also leaves the voucher and both lines active and pending. Those orphan vouchers can still be approved into the payables | Rpt D D02-D04; Rpt C D2, D2b | `deleteexpenseMdl` `mainModel.js:3440-3447`; `deletetripcreated` 5539-5546 | On expense delete, return the trip to *Not Filed* and void the voucher. Block deletion of approved items, and void the voucher when a trip is deleted |
| H3 | **Approved vouchers are not locked.** The API edits or deletes them freely. An edit silently resets the voucher to pending (the hire owner went from 0 to 8,000 Dr) and un-settles liabilities that were already paid. Approved or rejected trip expenses can also be edited or deleted through the API | Rpt E ED1, ED2, D1, A4, ED4; Rpt D A09, A10, D04 | `updatevoucherentryCtrl` `mainCtrl.js:3385-3428`, `mainModel.js:8892`, 6214; `updateexpensesdetailsCtrl` 2334 | Return 400 LOCKED unless the voucher is pending, the same way fuel and laundry already do |
| H4 | **Editing a trip in Trip Creation corrupts its filed expense.** The expense's trip date, service number, driver 2 and paid-to type become the text `'undefined'`, so date-filtered reports and payables miss them | Rpt C E7 | `mainCtrl.js:3224` → `updatetripcreated` `mainModel.js:5407-5448` | Update only the fields actually sent (parameterised) |
| H5 | **Ledger rename and delete break the books.** A rename leaves old names in Trial Balance and the approvals list, and editing an old voucher afterwards saves a line with **no ledger** (700 vanished). Ledgers and groups that already have postings can be deleted, after which Balance Sheet, P&L and Group Wise stop balancing | Rpt E RN2-RN7, DL1, DL2, DG1 | `updateLedgerNameMdl` 11826, `deleteLedgerMdl` 11871, `deleteGroupMdl` 11771; `VoucherApprovalsPage.tsx:856`; `TrialBalancePage.tsx:108-116` | Look ledgers up by `ledger_id` (not name), refuse deletes when postings exist, and reject duplicate names |
| H6 | **Service-number data drift.** This is the root cause of **"Service For showing double entry"**: the Trip Creation dropdown removes duplicates by exact text, and that text drifts in three ways: Excel import stores the typed spelling, renaming a Service For doesn't update existing routes, and the master accepts duplicate names. Duplicate service numbers are also accepted, and Trip Expenses looks rates up by **service-number text** and takes the first match, so it can price with another route's or a van's betas. Renaming or deleting a route leaves its trips with "No rates found". 6 real routes (ST-01..ST-05, TESTTRIP01) can't be edited because `service_for_id` is empty | Rpt B SF1-SF4, R6-R10, B3, E4, I4 | `TripCreationPage.tsx:366`; `TripExpensesPage.tsx:871-888`; `getbetaMdl` `mainModel.js:6370`; `updateservicenoMdl` 10426 | Group by `service_for_id` and use the master's name; block duplicate numbers; look rates up by `service_no_id`; one-off data fix for existing routes |
| H7 | **Master duplicates and import data loss.** Excel import creates duplicate vehicles (space variants, same number twice in one sheet) and duplicate people (another driver's mobile/Aadhar/DL, which manual add refuses). A sold-out number can be registered again and then reactivated into **two live rows**. Re-importing an exported Bus sheet turns hire buses into normal buses and wipes the owner ledger, engine number and insurance. A Van sheet import clears home tax, permit and AITP. The Helper export drops the emergency number, so re-importing wipes it | Rpt A B25, B26, B32-B37, X07, X08, X14, P30 | `mainModel.js:15154-15225`, 15300; `BusNoPage.tsx:469-476`; `StaffPage.tsx:599` | Use the manual-add duplicate rules on import (normalised keys, in-sheet dedupe), export every column, update only the columns in that sheet type, and fix the helper export key |
| H8 | **Import links ledgers to the wrong person.** Importing a new driver with a **terminated** driver's ID linked **both** people to the same ledger (511). Staff import does the same by name, and a name collision there gives no ledger at all, silently | Rpt A X09, X10, X16, X17 | `mainModel.js:15275-15276`, 15317, 15379 | Check IDs against all rows, not just active ones; link ledgers by the inserted row id; report ledger failures to the user |
| H9 | **Personal data leaks.** A duplicate refusal returns the other person's full record: Aadhar, bank account, DL, document image links. Full Aadhar and bank payloads are also written to server logs on every add or edit | Rpt A P07, C12 | `mainCtrl.js:895, 1038, 1246`; logs at 1054, 4764, 4846 | Return only the message, and stop logging personal data |
| H10 | **Filed trips appear many times in lists.** 42 rows showed for 16 trips in Trip Expenses, and one trip showed 8 times in Admin Approvals. Counts, totals and Approve buttons are duplicated | Rpt D L8, L9, P03 | `mainModel.js:2952-2953`, 3422-3423, 5480 (debit × credit voucher-line joins) | Join one row per voucher, or drop the join |
| H11 | **Drivers with a blank nickname lose their names.** Filing writes an empty driver1/driver2/paid-to name back to the trip, and the "Pay X" tick disappears for them. 6 active real drivers and 2 staff are affected | Rpt D E00 | `COALESCE(nickname, …)` in `mainModel.js:2921-2928`, 3392-3400, 6419-6431; `??` in `TripExpensesPage.tsx:1768-1816` | Use `COALESCE(NULLIF(nickname,''), driver_name)` in SQL and `\|\|` in the page |

### 3.3 Medium

| # | Issue | Evidence / where |
|---|---|---|
| M1 | Trip vouchers are dated on the **filing date**, not the trip date, so Ledger Wise and Day Book show costs in the wrong period | Rpt D S08, A05; `mainModel.js:14586, 14607, 14671` |
| M2 | **Trial Balance** filters on the entry timestamp, while every other report uses the voucher date. Vouchers dated May 2027 appeared under FY 26-27 | Rpt E R12; `gettrialbalancereportsMdl` 9367-9370 |
| M3 | **Balance Sheet** covers only the selected FY, with no brought-forward balances: a driver showed 2,000 Dr while Ledger Wise showed 0 | Rpt E R11; `BalanceSheetPage.tsx:333-371` |
| M4 | **Day Book** shows pending and rejected vouchers | Rpt E R3; `getdaybookreportsMdl` 9301-9312 |
| M5 | **Duplicate numbers under concurrent saves.** Two trips got T270309002; three parallel voucher saves produced V270518002 twice. `c_number` has no unique index | Rpt C C2; Rpt E N2; `utils/refnumber.js:21-34`, `mainCtrl.js:3301-3310` |
| M6 | **Admin Approvals** lists unfiled trips as Pending and lets them be approved. They then disappear from the default Trip Expenses list, so crew pay is never filed | Rpt D P01, P02; `AdminApprovalsPage.tsx:137-148` |
| M7 | Paid To without a ledger (never created, or a terminated person) silently switches to "No voucher", so crew pay is filed with nothing posted | Rpt D S21, T02; `TripExpensesPage.tsx:1295, 551-556` |
| M8 | Betas and Halt Beta aren't copied onto the trip, so a rate change re-prices every **unfiled** trip, past dates included | Rpt B B1, H6 |
| M9 | `driverone` and `trip_created` are **latin1**: Telugu text and ₹ are stored as `???` and lost for good | Rpt B S2; Rpt C X1 |
| M10 | Editing a bus with a blank registration date or seating writes `0000-00-00` / `0`. 3 live buses already have this | Rpt A B20; `mainModel.js:10275, 10286` |
| M11 | Driver edit has no duplicate check. Re-registering a terminated person creates a second record and ledger, and Rejoin then gives two active copies | Rpt A P16, P17, P25, P26 |
| M12 | Helper import fails whenever the bank cells are blank. Spaced Aadhar numbers and "+91" mobiles are cut short on import | Rpt A X12, X13, X19 |
| M13 | Same service twice in one Trip Creation submit makes two trips. The hired-to-own van move is blocked only in the UI | Rpt C B3, E8 |
| M14 | Halted trips can't be edited in the UI, because Save requires a bus and Driver 1 | Rpt C; `TripCreationPage.tsx:1315, 1320` |
| M15 | **Broken pages:** Deleted Trips never lists deleted trips; Trip Reports ignores its filters and returns only rejected expenses; Trip Logs counts use the wrong data shape and Trip Creation edits and deletes never appear | Rpt C DT1, RP1, LG1, LG2 |
| M16 | **Payroll doesn't work:** `/getsalaryreport` returns 500 because its model function is missing, and the Salary Payment button only shows a message and posts nothing | Rpt E PR1-PR3; `mainCtrl.js:4384`, `SalaryPaymentPage.tsx:93` |
| M17 | An Excel header row with a blank column passes the header check but shifts every later field by one. Excel time cells like 1830 become 00:00 | Rpt B HD5, T5-T7; `lib/utils.ts:103` |
| M18 | Uploaded image extension comes from the client unchecked, so `.html` or `.svg` files can be stored and served | Rpt A C09; `mainCtrl.js:777-802` |

### 3.4 Low / consistency

- **No server-side required-field checks.** A bus with an empty number, a driver with a blank DL name, a route with every field empty, and a hired van with no amount were all accepted. Date limits (≤ today, FY range) exist only in the UI.
- **Required-star markers don't match what Save enforces.** Bus form: 7 starred fields aren't required. Driver form: only DL Name and Aadhar Name are enforced.
- **Terminated people and sold vehicles keep live ledgers**, which stay selectable in every dropdown.
- **Renaming a vehicle number** doesn't carry over its trips, fuel, tyre or job history; the old records stop matching.
- **"Today" is calculated in UTC.** Between 00:00 and 05:30 IST, the Trip Creation grid, Terminate and Service Out default to yesterday.
- **False history entries.** An unchanged trip save logs a conductor change, and every expense save logs a status change.
- **Opening balances.** There is no opening-balance field on ledgers.
- **Staff and Helper editing.** There is no edit screen for staff or helpers, and their edit endpoints would wipe saved document images.
- **Halt trips still charge parking.** This needs a business decision.
- **Server restart retires duplicates silently.** On every restart, a startup script sets extra copies of a duplicate vehicle number to deleted, with no history.

---

## 4. What works well (verified)

- **Vehicles:** add/edit with a duplicate-number check that ignores case and spaces; hire vehicles with an owner ledger; spare tanks; Service Out and Reactivate; edit history; Vehicle Validations inline dates.
- **Driver, helper and staff registration:** manual add refuses duplicate mobile, Aadhar, DL and name. The payable ledger is created automatically, and collisions get a "(D####)" suffix. Driver edits rename the ledger and write history. Excel ID checks (missing, repeated, belongs to another person) work.
- **Service numbers:** bus and van add; Active/Inactive from a date works end to end, including the server check (trips before the date go through; that date and later are skipped). Halt Beta read and save; Excel time cells convert correctly.
- **Trip Creation:** every kind of bus and van row; resubmitting a sheet is skipped; one bus per day; a van on several services a day; trip numbers aren't reused after a delete; the bus-conflict check on edit (409); no voucher at creation; the list returns Pick/Drop and Up/Down.
- **Trip Expenses:** every voucher built by the page balanced across 16 test trips.
  - Each crew member's ledger was credited with exactly beta plus opting salary.
  - Expense ledgers were debited correctly.
  - The voucher is a Journal carrying the trip's T-number.
  - Editing replaces voucher lines rather than duplicating them.
  - Reject, then On Review, then re-file works.
- **Ledgers and payments:** the driver payable went 12,000 Cr → 8,000 Cr → 0 in Ledger Wise. Pending and rejected entries stay out of Ledger Wise. The hire-owner payable and hirer receivable both net to zero.

---

## 5. Recommended fix order

1. **Week 1 – security and data safety.**
   - Add `verifyToken` to all routes (C1).
   - Parameterise every string-built SQL query and turn off `multipleStatements` (C2, C3).
   - Stop returning and logging personal data (H9).
   - Validate uploaded image types (M18).
2. **Week 2 – accounting integrity.**
   - Server-side voucher validation and a one-voucher-per-number rule (C5).
   - Lock approved vouchers and expenses (H3).
   - Sync trip approve/reject with the voucher (H1).
   - Fix expense and trip delete so they void vouchers and keep the trip (H2).
   - Unique, locked numbering for T and V numbers (M5).
   - Date trip vouchers on the trip date (M1).
3. **Week 3 – payables and reports.**
   - Unify Payables View with ledger balances and settle on approval (C4).
   - Refer to ledgers by id; block deleting ledgers that have postings (H5).
   - Trial Balance by voucher date (M2), Balance Sheet brought-forward (M3), Day Book approved only (M4).
4. **Week 4 – master data.**
   - Duplicate rules and in-sheet dedupe on import (H7).
   - ID and ledger linking on import (H8).
   - Service For by id, and rates by `service_no_id` (H6); one-off data clean-up of existing routes and trips.
   - Blank-nickname names (H11) and duplicate list rows (H10).
   - Convert tables to utf8mb4 (M9).
5. **Then:** repair the broken pages (M15, M16), add server-side required-field validation, and clear the remaining medium and low items.

---

## 6. How to read the detailed reports

Reports A–E are the auditors' full reports:
- **Flow summary:** how the flow works, step by step, and which tables and ledgers are written.
- **Scenario results:** every scenario with steps, expected result, actual result (API response or DB value) and the outcome.
- **Bugs & risks:** severity, evidence, code location and suggested fix.
- **Gaps / inconsistencies.**
- **Cleanup confirmation.**

Scenario IDs in Reports A–E (e.g. B25, SF1, E7) match the references in section 3.



---

# Report A — Masters: Vehicles & People

Audit date 2026-09-15, branch `staging` (working tree with uncommitted edits), local backend `https://localhost:8945/nodeapp`, DB `latest_samanvi_db` (MariaDB 10.4.32, global `sql_mode = NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION`, so **not strict**. Some results below would be hard errors on a strict server). Every scenario was run over the real HTTP API with a minted JWT and the payload shape the React page sends, then checked in MySQL. Scripts are in `scratchpad/audit/s1/` (`bus.js`, `people.js`, `supp.js`; raw results in `*-results.json`).

## Flow summary

### Bus Numbers master (`samanviReact/src/pages/masters/BusNoPage.tsx`)
1. **List**: `POST /getbussesdata` → `getbussesdataMdl` (`SELECT * ... FROM busses WHERE d_in=0`, with `reg_date` re-selected as `YYYY-MM-DD`). The Type badge is worked out on the client: `issparetank=1` → Spare Tank, `bus_category='hire'` → Hire Bus, otherwise Normal. Buses and vans are told apart only by the free-text `vehicle_type` (`/\bVAN\b/i`).
2. **Add** (one popup with 3 tabs: Normal Bus / Hire Bus / Spare Tank): `POST /addNewbusnum` (encrypted). The controller calls `findLiveBusByNumberMdl`, which ignores spaces and case but only looks at **live (d_in=0)** rows. A match returns 422. Otherwise it runs `INSERT INTO busses SET ?`. No other server-side validation. Nothing is written to history on add.
   - *Normal*: every column. There is no separate Van tab: a van is a Normal-form vehicle whose Vehicle Type is `VAN`.
   - *Hire*: `bus_category='hire'`, `owner_ledger_id` = an id from `mainmasterssubchildtwo` under Payables > Hire Vehicles (subchild 10). The "Create owner ledger" box calls `POST /addledgerdata` (plain JSON, `addledgerdataMdl`), which refuses any name already used by a live ledger.
   - *Spare*: `issparetank=1`, `bus_category='spare'`, owner name only.
3. **Edit**: `POST /updatebusnumber`. The duplicate-number check excludes the row's own id. The client sends only the fields the open tab owns (Hire and Spare send a subset). `updatebusnumber` builds `UPDATE busses SET col='<escaped>'` from the keys it received, diffs them against the row before the update, and writes one `bus_edit_history` row when something changed. `GET` history uses `POST /getbushistory`.
4. **Sold / Service Out**: `POST /markbusserviceout` sets `d_in=1`, `service_out_date` and `service_out_reason`, and adds a history row. `ServiceOutBusesPage` lists `d_in=1 AND service_out_date<>''`. **Reactivate** (`/reactivatebus`) sets `d_in=0`, clears the date and reason, and adds a history row. Nothing checks trips, fuel entries or anything else that references the vehicle, all of which store `bus_no` as text.
5. **Excel**: a Bus/Van toggle picks the template, export columns and import parser. The client checks the header row (`headerRowMismatch`), maps columns by position, converts dates with `excelCellToISODate`, marks rows already in the list as duplicates (ticked by default), and sends `POST /bulkuploadbuses`. `bulkUploadBusesMdl` compares `lower(trim(bus_no))` against live rows. It **replaces every column** on a duplicate (`UPDATE ... WHERE bus_no=? AND d_in=0`; a blank cell becomes NULL) and bulk-inserts the rest. It writes no history and does no validation.
6. **Vehicle Validations** (`pages/validations/VehicleValidationsPage.tsx`): live, non-spare, non-hire buses with 7 validity columns. Picking a date calls `/updatebusvaliditydate` with a whitelisted field and adds a history row.
7. **Boot migration** (`models/mainModel.js:704-723`): at every server start, if two live rows share a number (ignoring spaces and case), all but one are set to `d_in=1`. It keeps the newest row that has a vehicle type. This is silent: no history row and no service-out date, so the retired rows appear on no screen.

### Staff Register (`samanviReact/src/pages/masters/StaffPage.tsx`)
1. **Lists**: Driver `POST /getalldrivers`; Staff and Helper `POST /gethelper {staffreports}`; Terminated `GET /getterminatedstaff` (a UNION of the three tables where `d_in=1`).
2. **Add Driver**: `POST /adddriverregister` (plain JSON; images go as base64 `{reviewimg, imgtype}` and are written to `IMAGE_UPLOAD_DIR` using the extension the client gave). `checknameMdl` builds a **string-interpolated** `SELECT` over live drivers matching DL name OR Aadhar name OR mobile OR alternate OR Aadhar OR DL number. A hit returns 422 with a message **and the full matching rows**. Otherwise the next ID is `D` + (MAX numeric part + 1), zero-padded to 4 digits, followed by `INSERT` and then `ensurePersonLedger('Drivers', driver_name, D####)`.
3. **Add Helper / Staff**: same pattern (`checkhelpername` / `checksaffnameMdl`). Helpers get `H####`. Staff has no id number; the ledger disambiguator is `#<row id>`.
4. **`ensurePersonLedger`** (`mainModel.js:11472`): finds the container `mainmasterssubchild` with that name under subgroup 5 (Payables): Drivers=13, Helpers=16, Staff=12. If no live ledger anywhere has the name, it inserts `mainmasterssubchildtwo` with `temple_name=<name>`. If one does, it tries `"<name> (<disambiguator>)"`. If that name is also taken, or the container is missing, it returns an error that is only `console.error`'d: the person is saved with `ledger_id=NULL` and the user is told nothing. On success the new id goes into `<register>.ledger_id`.
5. **Edit**: only **Driver** has an edit UI. It sends plain JSON to `POST /adddriveredit` → `adddrivereditMdl`, which does `UPDATE ... SET ?` on every field (including `i_ts` and `user_id`), diffs the fields into `driver_edit_history`, and then calls `renamePersonLedger(ledger_id, driver_name, D####)`, or backfills a ledger if the driver has none. There is **no duplicate check on edit**. Staff and Helper edit endpoints exist (`/addstaffedit`, `/edithelperregister`, both reading plain `req.body`), but the page has no edit button and `masters.service.ts` would send them an encrypted payload they never decrypt.
6. **Terminate / Rejoin**: `POST /terminatestaff` / `/rejoinstaff` build interpolated `UPDATE <table> SET d_in=1|0, date_of_leaving, termination_reason`. **Ledgers are not touched.**
7. **Excel import** (`POST /bulkuploadstaff` → `bulkUploadStaffMdl`): Driver and Helper rows need an ID from the sheet. The whole batch is refused if an ID is missing, repeated in the sheet, or held by a different **live** person. Rows whose name matches a live person (case- and space-insensitive) update that person in place (blank cells clear fields; a changed ID renames the ledger; driver updates are logged to `driver_edit_history`). Other rows are inserted, then `createLedgersForImport` creates ledgers one at a time and links them with `UPDATE <table> SET ledger_id WHERE driver_id_number|helper_id_number|fullName = ?`. There is no check on mobile, Aadhar or DL number.
8. **Designation master**: `/addstafftype`, `/updatestafftype`, `/deletestafftype` (all interpolated SQL, no uniqueness check).
9. **Driver Validations** (`DriverValidationsPage.tsx`): live drivers × `dl_expiry_date`, `transportvalidityto`, `medical_validity` → `/updatedrivervaliditydate` (whitelisted field, parameterised, adds a `driver_edit_history` row).

## Scenario results

Legend: PASS = ran and behaved correctly; BUG = ran and misbehaved; GAP = ran, and a validation or feature the UI implies is missing; CODE REVIEW = concluded from reading the code, not run.

| ID | Scenario | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| B01 | Add normal bus (full form payload) | HTTP API + DB query | 200, one busses row, category normal, reg_date kept | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":95,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} | rows=1 cat=normal reg=2024-01-20 i_ts=2026-09-15  | PASS |
| B02 | New bus appears in list (getbussesdata) with reg_date as YYYY-MM-DD | HTTP API + DB query | row present, reg_date 2024-01-20 | reg_date=2024-01-20 seating=36 | PASS |
| B03 | Add same bus number again | HTTP API + DB query | 422 already registered | {"status":422,"message":"Vehicle ZZTEST1-BUS01 is already registered - edit it from the list instead"} | PASS |
| B04 | Add same number different case + spaces ("zztest1 -bus01") | HTTP API + DB query | 422 (normalised match) | {"status":422,"message":"Vehicle ZZTEST1-BUS01 is already registered - edit it from the list instead"} | PASS |
| B05 | Server-side: add bus with EMPTY bus number | HTTP API + DB query | refused (400/422) | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":96,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} | rows inserted=1 ids=96 | BUG |
| B06 | Server-side: add bus with no vehicle type / odometer / fitness (UI marks required) | HTTP API + DB query | refused | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":97,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} | GAP |
| B07 | Add bus with apostrophe in owner/remarks | HTTP API + DB query | 200, stored verbatim | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":98,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} owner=ZZTEST1 O'Brien | PASS |
| B08 | Add van (Normal form, vehicle type VAN) | HTTP API + DB query | 200, vehicle_type VAN | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":99,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} vt=VAN | PASS |
| B09 | Hire form "Create owner ledger" (addledgerdata under Payables > Hire Vehicles) | HTTP API + DB query | 200, ledger under subchild 10 | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":485,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} ledger=485 sub=10 child=Payables | PASS |
| B10 | Create owner ledger with a name that already exists | HTTP API + DB query | clear 4xx message the form can show | HTTP 500 body="Server Error" | BUG |
| B11 | Add hire vehicle with owner ledger | HTTP API + DB query | 200, bus_category hire, owner_ledger_id set | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":100,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} cat=hire led=485 reg_date=null seat=null | PASS |
| B12 | Add hire vehicle with NO owner ledger (UI marks Owner Ledger required) | HTTP API + DB query | refused | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":101,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} | GAP |
| B13 | Add hire vehicle with a non-existent owner_ledger_id | HTTP API + DB query | refused | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":102,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} | GAP |
| B14 | Add spare tank | HTTP API + DB query | 200, issparetank 1, category spare | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":103,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} spare=1 cat=spare | PASS |
| B15 | Spare tank appears in getbussessparetankdata | HTTP API + DB query | present | 1 spare rows | PASS |
| B16 | Edit normal bus (odometer, remarks with apostrophe) | HTTP API + DB query | 200, persisted, 1 history row listing both changes | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":0,"info":"Rows matched: 1  Changed: 1  Warnings: 0","serverStatus":2,"warningStatus":0,"changedRows":1}} odo=1500 hist=["Odometer: '1000' -> '1500'\nRemarks: 'audit' -> 'edited it's'"] | PASS |
| B17 | Save edit with nothing changed | HTTP API + DB query | 200, no new history row (reg_date not falsely diffed) | hist rows=1 last=Odometer: '1000' -> '1500' Remarks: 'audit' -> 'edited it's' | PASS |
| B18 | Edit History modal (getbushistory) | HTTP API + DB query | returns the history row | 1 rows | PASS |
| B19 | Edit: rename bus onto another live vehicle number | HTTP API + DB query | 422 | {"status":422,"message":"Vehicle ZZTEST1-VAN01 is already registered - use that entry instead"} | PASS |
| B20 | Edit normal bus clearing optional Registration Date and Seating Capacity | HTTP API + DB query | reg_date NULL/blank, seating blank | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":0,"info":"Rows matched: 1  Changed: 1  Warnings: 2","serverStatus":2,"warningStatus":2,"changedRows":1}} DB reg_date=0000-00-00 seating=0; API list reg_date=0000-00-00 seating=0 | BUG |
| B21 | Edit hire vehicle (form sends only its own fields) - other columns kept | HTTP API + DB query | engine_no/insurance kept, vehicle_type VAN | eng=ZZENG ins=2027-01-01 vt=VAN | PASS |
| B22 | Vehicle Validations inline date change | HTTP API + DB query | 200, fc_validity updated, history logged | fc=2027-03-31 hist=Fitness Validity: '2026-12-31' -> '2027-03-31' | PASS |
| B23 | Validity update with a non-whitelisted field (bus_no) | HTTP API + DB query | refused, bus_no unchanged | {"status":500,"data":null} | PASS |
| B24 | Mark van Sold/Service Out (reason with apostrophe) | HTTP API + DB query | d_in=1, reason stored, history row, on Service Out list, off active list | d_in=1 reason=Sold to Ravi's travels hist=Marked Sold/Out of Service: Sold to Ravi's travels (effective 2026-09-10) activeListed=false | PASS |
| B25 | Add a NEW vehicle with the number of a sold-out vehicle | HTTP API + DB query | refused or warned (vehicle exists in Service Out list) | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":104,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} rows with that number=2 (d_in: 1,0) | BUG |
| B26 | Reactivate the sold-out vehicle after a new one took its number | HTTP API + DB query | refused (number now live) - no two live rows | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":0,"info":"Rows matched: 1  Changed: 1  Warnings: 0","serverStatus":2,"warningStatus":0,"changedRows":1}} live rows=2 | BUG |
| B27 | Service Out with a future date via API (UI max=today) | HTTP API + DB query | refused server-side | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":0,"info":"Rows matched: 1  Changed: 1  Warnings: 0","serverStatus":2,"warningStatus":0,"changedRows":1}} d_in=1 date=2030-01-01 | GAP |
| B28 | Service Out with blank date & reason via API | HTTP API + DB query | refused; otherwise vehicle vanishes from both lists | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":0,"info":"Rows matched: 1  Changed: 1  Warnings: 0","serverStatus":2,"warningStatus":0,"changedRows":1}} d_in=1 onServiceOutList=false | BUG |
| B29 | Bus sheet import: 2 new rows | HTTP API + DB query | inserted 2 | {"status":200,"data":{"inserted":2,"replaced":0,"total":2}} rows=2 | PASS |
| B30 | Bus sheet import: duplicate number updates in place (blank cells clear) | HTTP API + DB query | replaced 1, seating 45, home_tax cleared, single row | {"status":200,"data":{"inserted":0,"replaced":1,"total":1}} rows=1 seat=45 hometax=null | PASS |
| B31 | Bus import update writes Edit History | HTTP API + DB query | history row for the import change | bus_edit_history rows=0 | GAP |
| B32 | Import "ZZTEST1 -IMP02" (space variant of an existing number) | HTTP API + DB query | matched as duplicate (manual add treats it as same vehicle) | {"status":200,"data":{"inserted":3,"replaced":0,"total":3}} live rows=2 [{"id":106,"bus_no":"ZZTEST1-IMP02"},{"id":107,"bus_no":"ZZTEST1 -IMP02"}] | BUG |
| B33 | Import the same new bus number twice in one sheet | HTTP API + DB query | one row (or refused) | live rows for ZZTEST1-IMP03=2 | BUG |
| B34 | Re-import a hire vehicle from the Bus sheet Export (export has no Category/Owner Ledger cells) | HTTP API + DB query | stays hire with owner ledger | after import: cat=normal owner_ledger_id=null engine=null ins=null | BUG |
| B35 | Van sheet import over existing vans (sheet has no Home Tax/Permit/AITP columns) | HTTP API + DB query | columns not on the Van sheet are left alone | {"status":200,"data":{"inserted":0,"replaced":1,"total":1}} after: [[99,null,null,null,null],[104,null,null,null,null]] | BUG |
| B36 | Import UPDATE targets "WHERE bus_no=? AND d_in=0" when two live rows share the number (from B25/B26) | HTTP API + DB query | one vehicle updated | rows updated=2 | BUG |
| B37 | Import a number that is currently Sold/Service Out | HTTP API + DB query | refused or flagged | {"status":200,"data":{"inserted":1,"replaced":0,"total":1}} rows=2 d_in=1,0 | GAP |
| B38 | Import with invalid date text / non-numeric odometer & seats | HTTP API + DB query | rejected row or cleaned | {"status":200,"data":{"inserted":1,"replaced":0,"total":1}} fc=31.12.2026 ins=next year odo=abc seat=0 | GAP |
| B39 | Unauthenticated POST /addsparetankbusno (no JWT) | HTTP API + DB query | 401 | HTTP 500 "Server Error" - route has no verifyToken; it reaches the model, which fails only because the legacy sparetank table no longer exists | BUG |
| D01 | Designation master: add | HTTP API + DB query | 200, row | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":14,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} rows=1 | PASS |
| D02 | Designation master: add duplicate name | HTTP API + DB query | refused | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":15,"info":"","serverStatus":2,"warningStatus":0,"changedRows":0}} active rows=2 | GAP |
| D03 | Designation master: add name with apostrophe | HTTP API + DB query | 200, stored | {"status":500,"data":null} rows=0 | BUG |
| D04 | Designation master: rename + level | HTTP API + DB query | 200, renamed | ZZTEST1 Designation2 lvl=2 | PASS |
| P01 | Add driver (manual form payload, plain JSON) | HTTP API + DB query | 200, D#### id = max+1, ledger under Payables>Drivers named DL Name, ledger_id linked | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":121,"info":""," id=D22688 (expected D22688) ledger={"id":497,"temple_name":"ZZTEST1 Ravi Kumar","parent_subchild_id":13,"subchildtwo":"Drivers","child":"Payables","d_in":0} | PASS |
| P02 | Driver appears in active driver list | HTTP API + DB query | present | 101 drivers | PASS |
| P03 | Add driver with same mobile as existing driver | HTTP API + DB query | 422 naming the clashing field | 422 Mobile Number is already registered to another record | PASS |
| P04 | Add driver with same Aadhar as existing driver | HTTP API + DB query | 422 naming the clashing field | 422 Aadhar Number is already registered to another record | PASS |
| P05 | Add driver with same DL number as existing driver | HTTP API + DB query | 422 naming the clashing field | 422 DL Number is already registered to another record | PASS |
| P06 | Add driver with same DL name (different person, all numbers different) as existing driver | HTTP API + DB query | 422 naming the clashing field | 422 DL Name is already registered to another record | PASS |
| P07 | Duplicate-refusal response body contents | HTTP API + DB query | only a message - no other person's record | 422 data carries 1 full row(s) incl keys: mobile_number,aadhar_number,account_holder_name,account_number,ifsc_code,aadhar_card_front,aadhar_card_back,emergency_mobile_number,dl_number,dl_linked_mobile | BUG |
| P08 | SQL injection via Aadhar Name ' OR '1'='1 on add driver | HTTP API + DB query | treated as text (no dump) | status=422 rows returned=101 of 101 active drivers; msg=A matching record already exists | BUG |
| P09 | Add driver with apostrophe in name (D'Souza) | HTTP API + DB query | 200, saved with ledger | HTTP 200 {"status":500,"msg":"Server Error"} rows=0 | BUG |
| P10 | Server-side: add driver with blank DL name/mobile/DL/Aadhar | HTTP API + DB query | refused | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"inser rows=1 ledger_id=null id=D22689 | GAP |
| P11 | Add driver whose name equals an existing ledger (in another group) | HTTP API + DB query | ledger "Name (D####)" created under Drivers | pre=200 ledger={"id":499,"temple_name":"ZZTEST1 Collide (D22690)","parent_subchild_id":13,"subchildtwo":"Drivers","child":"Payables","d_in":0} | PASS |
| P12 | Add 2nd driver with same DL name as existing driver | HTTP API + DB query | 422 (DL Name is a duplicate key) | 422 DL Name is already registered to another record | PASS |
| P13 | Edit driver DL name (with apostrophe) | HTTP API + DB query | 200, ledger renamed in place, history row | ledger=ZZTEST1 Ravi O'Kumar hist=["DL Name: 'ZZTEST1 Ravi Kumar' -> 'ZZTEST1 Ravi O'Kumar'"] | PASS |
| P14 | Edit driver keeps created-by / created date | HTTP API + DB query | i_ts and user_id unchanged | i_ts 2026-09-15 -> 2026-09-15; user_id 1 -> 2 | BUG |
| P15 | Driver Edit History modal (getdriverhistory) | HTTP API + DB query | returns rows | 1 rows | PASS |
| P16 | Edit driver to another driver's mobile / Aadhar / DL number | HTTP API + DB query | 422 duplicate | 200; now {"mobile_number":"9000001001","aadhar_number":"999900010001","dl_number":"ZZT1DL001"} | BUG |
| P17 | Edit driver's DL name to the same name as another active driver | HTTP API + DB query | refused (add path treats DL name as unique) | status=200; active drivers named that=2; ledger now "ZZTEST1 Collide (D22688)" | BUG |
| P18 | Edit driver without picking new images keeps saved image URLs | HTTP API + DB query | dl_front unchanged | dl_front=https://x/zztest1-dl.png | PASS |
| P19 | Driver Validations inline date (medical_validity) | HTTP API + DB query | 200, stored, history | mv=2027-01-31 hist=Medical Fitness Validity: '—' -> '2027-01-31' | PASS |
| P20 | Driver validity update with non-whitelisted field | HTTP API + DB query | refused | {"status":500,"data":null} | PASS |
| P21 | Terminate driver with apostrophe in reason ("Didn't report") | HTTP API + DB query | 200, d_in=1 | {"status":500,"data":null} d_in=0 | BUG |
| P22 | Terminate driver (plain reason) | HTTP API + DB query | d_in=1, date_of_leaving set, on Terminated list, off active & paid-to lists | leaving=2026-09-14 termListed=true active=false paidTo=false | PASS |
| P23 | Terminated driver's ledger | HTTP API + DB query | ledger retained (balance history) - flagged/inactive for new postings | ledger ZZTEST1 Collide (D22690) d_in=0 still selectable in every ledger dropdown | GAP |
| P24 | Terminate with an unknown staff_type ("drivers") via API (id 999999999, so nothing real touched) | HTTP API + DB query | refused | {status:500} - refused, but only because the staff_register fallback uses column date_of_leaving which staff_register lacks (it has dateOfLeaving); the unknown staff_type is never validated | PASS |
| P25 | Re-register a terminated driver (same name/mobile/DL/Aadhar) instead of Rejoin | HTTP API + DB query | warned to rejoin; otherwise a second record + second ledger | status=200; rows=[{"id":123,"driver_id_number":"D22690","d_in":1,"ledger_id":499},{"id":124,"driver_id_number":"D22691","d_in":0,"ledger_id":null}]; new ledger=undefined | GAP |
| P25b | Driver saved when both "Name" and "Name (D####)" ledgers already exist (re-registered D22691 in P25) | HTTP API + DB query | save refused or user told no ledger was made | 200 "Driver added"; driver_register.ledger_id NULL; no ledger, no message (console.error only) | BUG |
| P26 | Rejoin the old terminated record while a re-registered copy is active | HTTP API + DB query | refused - one active person per mobile/DL | status=200; active rows with that mobile=2 | BUG |
| P27 | Rejoin clears leaving date & reason | HTTP API + DB query | d_in 0, NULLs | {"d_in":0,"date_of_leaving":null,"termination_reason":null} | PASS |
| P28 | Two drivers saved at the same moment | HTTP API + DB query | distinct D#### ids | 200/200 ids=D22692,D22693 | PASS |
| P29 | Add helper (manual) | HTTP API + DB query | 200, H#### id, ledger under Payables>Helpers, emergency number stored | id=H54627 ledger={"id":503,"temple_name":"ZZTEST1 Suresh","parent_subchild_id":16,"subchildtwo":"Helpers","child":"Payables","d_in":0} emerg=9000001199 dob=1992-02-02 | PASS |
| P30 | Helper list row: keys the Staff page export reads | HTTP API + DB query | row has emergency_mobile_number (export column) | row keys include emergencymobilenumber=true, emergency_mobile_number=false; dob=1992-02-02 | BUG |
| P31 | Add helper with an existing helper's mobile | HTTP API + DB query | 422 | 422 Mobile Number is already registered to another record | PASS |
| P32 | Add helper with apostrophe in name | HTTP API + DB query | 200 | HTTP 200 {"status":500,"msg":"Server Error"} | BUG |
| P33 | Add helper with the same name as an existing driver ledger | HTTP API + DB query | helper saved; ledger "Name (H####)" under Helpers | ledger={"id":504,"temple_name":"ZZTEST1 Ravi Kumar (H54628)","parent_subchild_id":16,"subchildtwo":"Helpers","child":"Payables","d_in":0} | PASS |
| P34 | masters.service editHelper (securePayload) against /edithelperregister (reads plain req.body) | HTTP API + DB query | edit applied | status=200; name still "ZZTEST1 Suresh" (payload never decrypted); ledger rows +0 | BUG |
| P35 | Helper edit (plain JSON) renames ledger | HTTP API + DB query | ledger renamed | ledger=ZZTEST1 Suresh Edited | PASS |
| P36 | Helper edit without re-sending images | HTTP API + DB query | saved image URL kept | adhar_card_front=null nickname= | BUG |
| P37 | Add staff (manual) | HTTP API + DB query | 200, ledger under Payables>Staff (subchild 12, not Loans>Staff 4) | ledger={"id":505,"temple_name":"ZZTEST1 Lakshmi","parent_subchild_id":12,"subchildtwo":"Staff","child":"Payables","d_in":0} dob=null | PASS |
| P38 | Add staff with existing Aadhar | HTTP API + DB query | 422 | 422 Aadhar Number is already registered to another record | PASS |
| P39 | Add staff with apostrophe in name | HTTP API + DB query | 200 | HTTP 200 {"status":500,"msg":"Server Error"} | BUG |
| P40 | Add staff whose name equals a helper ledger | HTTP API + DB query | ledger "Name (#rowid)" | ledger={"id":506,"temple_name":"ZZTEST1 Suresh Edited (#20)","parent_subchild_id":12,"subchildtwo":"Staff","child":"Payables","d_in":0} | PASS |
| P41 | Add staff with designation/emergency omitted (NOT NULL columns) | HTTP API + DB query | refused with message or defaulted | HTTP 500 {"status":500} rows=[] (local sql_mode non-strict) | PASS |
| P42 | masters.service editStaff (securePayload) against /addstaffedit (reads plain req.body) | HTTP API + DB query | edit applied | status=200 name="ZZTEST1 Lakshmi" | BUG |
| P43 | Staff edit (plain JSON) renames ledger | HTTP API + DB query | renamed | ledger=ZZTEST1 Lakshmi E | PASS |
| P44 | Staff edit without re-sending images | HTTP API + DB query | saved image kept | aadhaarCardFront=null | BUG |
| P45 | Terminate helper | HTTP API + DB query | d_in=1, date_of_leaving | {"d_in":1,"date_of_leaving":"2026-09-14"} | PASS |
| P46 | Rejoin helper | HTTP API + DB query | d_in=0 | {"status":200,"data":{"fieldCount":0,"affectedRows":1,"insertId":0,"info":"Rows matched: 1  Changed: 1  Warnings: 0","serverStatus":2,"warningStatus":0,"changedRows":1}} | PASS |
| X01 | Driver import: new row, ID from sheet | HTTP API + DB query | inserted 1, ID kept, ledger under Drivers | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} ledger=ZZTEST1 Imp Driver | PASS |
| X02 | Driver import: row without ID (API) | HTTP API + DB query | whole batch refused | {"status":200,"data":{"inserted":0,"updated":0,"skipped":[],"total":1,"error":"Driver ID is required for ZZTEST1 Imp Driver"}} | PASS |
| X03 | Driver import: same ID on two rows (case-insensitive) | HTTP API + DB query | refused | {"status":200,"data":{"inserted":0,"updated":0,"skipped":[],"total":2,"error":"Driver ID zzt1d050 is given to more than one row in the sheet"}} | PASS |
| X04 | Driver import: ID already belongs to another active driver | HTTP API + DB query | refused | {"status":200,"data":{"inserted":0,"updated":0,"skipped":[],"total":1,"error":"Driver ID D22688 already belongs to ZZTEST1 Ravi Kumar"}} | PASS |
| X05 | Driver import: existing name -> update in place, ID changed, blank Aadhar clears | HTTP API + DB query | updated 1, one row, ledger renamed to "(ZZT1D002)" only if needed, history "Excel import" | {"status":200,"data":{"inserted":0,"updated":1,"skipped":[],"total":1}} id=ZZT1D002 aadhar=null ledger=ZZTEST1 Imp Driver hist=["Excel import\nDriver ID: 'ZZT1D001' -> 'ZZT1D002'\nMobile Number: '9000001301' -> '9000001399'\nAadhar Number: '999900013001' -> '—'\nRemarks: '—' - | PASS |
| X06 | Driver import ID change: ledger name | HTTP API + DB query | ledger name stays the plain person name (no collision) | ledger now "ZZTEST1 Imp Driver" | PASS |
| X07 | Driver import: new person with an existing driver's mobile/Aadhar/DL | HTTP API + DB query | refused like manual add (P03-P05) | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} inserted rows=1 | BUG |
| X08 | Driver import: same name twice in one sheet (different IDs) | HTTP API + DB query | refused or merged (name is the duplicate key) | {"status":200,"data":{"inserted":2,"updated":0,"skipped":[],"total":2,"ledgers_created":2,"ledgers_failed":[]}} rows=2 ledgers=ZZTEST1 Twin,zztest1 twin (ZZT1D011) | BUG |
| X09 | Driver import: reuse a terminated driver's ID for a new person | HTTP API + DB query | refused (IDs unique across register) | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} rows=[{"id":129,"driver_name":"ZZTEST1 Twin","d_in":1,"ledger_id":511},{"id":131,"driver_name":"ZZTEST1 Reuse","d_in":0,"ledger_id":511}] | BUG |
| X10 | Ledger link after X09 (UPDATE ... WHERE driver_id_number=?) | HTTP API + DB query | terminated driver keeps its own ledger | terminated row ledger 509 -> 511 | BUG |
| X11 | Driver import: apostrophe in name | HTTP API + DB query | inserted with ledger | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} | PASS |
| X12 | Helper import: new row with blank bank cells (Account Holder/Number/Bank/IFSC) | HTTP API + DB query | inserted (or row-level message) | {"status":500,"msg":"Server Error"} rows=0 (helper_register bank columns are NOT NULL; model sends NULL) | BUG |
| X12b | Helper import: new row with all required cells filled | HTTP API + DB query | inserted, ledger under Helpers | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} ledger_id=515 | PASS |
| X13 | Helper import: Aadhar typed with spaces "9999 0001 4002" | HTTP API + DB query | stored as 999900014002 or refused | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} stored="9999 0001 40" (varchar(12), non-strict truncation) | BUG |
| X14 | Helper import update: blank Mobile (required) and blank Emergency (what the Helper Export produces - it reads a key the row does not have) | HTTP API + DB query | mobile kept / row refused; emergency kept | {"status":200,"data":{"inserted":0,"updated":1,"skipped":[],"total":1}} after: [{"mobile_number":"","emergencymobilenumber":null}] | BUG |
| X15 | Staff import: new row | HTTP API + DB query | inserted, ledger under Staff | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} ledger={"id":513,"temple_name":"ZZTEST1 Imp Staff","parent_subchild_id":12,"subchildtwo":"Staff","child":"Payables","d_in":0} | PASS |
| X16 | Staff import: name equals an existing (driver) ledger | HTTP API + DB query | staff saved with ledger "Name (#id)" like manual add (P40) | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":0,"ledgers_failed":["ZZTEST1 Ravi Kumar"]}} ledger_id=null | BUG |
| X17 | Staff import: re-import a terminated staff name (new row) | HTTP API + DB query | terminated row keeps its own ledger link | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} rows=[{"id":21,"d_in":1,"ledger_id":514},{"id":23,"d_in":0,"ledger_id":514}] old ledger=513 | BUG |
| X18 | Import with unknown type | HTTP API + DB query | error | {"status":200,"data":{"inserted":0,"updated":0,"skipped":[],"total":0}} | PASS |
| X19 | Staff import: "+91 9000001503" mobile, spaced Aadhar, blank designation | HTTP API + DB query | validated / normalised | {"status":200,"data":{"inserted":1,"updated":0,"skipped":[],"total":1,"ledgers_created":1,"ledgers_failed":[]}} stored=[{"designation":"Staff","aadhaar":"9999 0001 50","mobile":"+91 900000","dateOfJoining":"15/09/2026"}] | BUG |
| X20 | Driver import via API with lower-case / padded ID | HTTP API + DB query | normalised to upper-case | {"status":200,"data":{"inserted":2,"updated":0,"skipped":[],"total":2,"ledgers_created":2,"ledgers_failed":[]}} ids=[{"driver_id_number":"ZZT1D200"},{"driver_id_number":"zzt1d201"}] | GAP |
| E01 | Excel date cell (real date 31-Dec-2026, serial) parsed by excelCellToISODate | HTTP API + DB query | 2026-12-31 (no IST off-by-one) | [46387.22928240741,"2026-12-31"] serial46022->2025-12-31 | PASS |
| E02 | Excel text "15/09/2026" (dd/mm/yyyy) | HTTP API + DB query | 2026-09-15 | ["15/09/2026","2026-09-15"] | PASS |
| E03 | Excel text "2026-9-5" (ISO without zero padding) | HTTP API + DB query | 2026-09-05 | ["2026-9-5","2026-9-5"] | BUG |
| E04 | Excel text "15/09/26" (2-digit year) / "31.12.2026" (dots) | HTTP API + DB query | converted or rejected | [["15/09/26","15/09/26"],["31.12.2026","31.12.2026"]] | GAP |
| E05 | Excel text "2026-02-30" (impossible date) | HTTP API + DB query | rejected | ["2026-02-30","2026-02-30"] | GAP |
| S01 | Unauthenticated POST /getallstfdrivhelp (no JWT) | HTTP API + DB query | 401 | HTTP 200, 192 people returned with ids + ledger ids | BUG |

### Code-review-only scenarios (not executed)

| ID | Scenario | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| C01 | Rename a bus number that already has trips / fuel / laundry / tyre records | Read `updatebusnumber` + schema | History follows the vehicle | `trip_created.bus_no`, `fuel_entry.vehicle_number`, `tyre_master.current_vehicle_number`, `vehicle_jobs.vehicle_number` etc. are text copies of the number and are never updated. Old records stop matching the vehicle in bus-wise reports | CODE REVIEW (BUG) |
| C02 | Sell or service-out a vehicle that has future trips, open job cards, or fitted tyres | `markBusServiceOutMdl` | Warn or block | Sets `d_in=1` with no checks | CODE REVIEW (GAP) |
| C03 | Server restart after duplicate live numbers exist (B25/B26/B32/B33 all create them) | `mainModel.js:704-723` | Duplicates shown to the user | Boot migration silently sets `d_in=1` on all but one row (no history, no service-out date), so the retired row vanishes from every screen, possibly the one holding the owner ledger or validity dates | CODE REVIEW (BUG) |
| C04 | Staff / Helper edit from the UI | `StaffPage.tsx:1099` | Edit like Driver | Actions for Staff/Helper are `['view']` only. A typo in a helper's or staff member's name or bank details cannot be fixed, and neither can their ledger name | CODE REVIEW (GAP) |
| C05 | "Create owner ledger" with a name that already exists (UI) | `BusNoPage.tsx:259-281` + B10 | Toast "already exists" | Backend returns HTTP 500 text; axios rejects; `try/finally` has no `catch`, so the rejection is unhandled and the user sees nothing | CODE REVIEW (BUG) |
| C06 | Required-field markers on forms | `BusNoPage.tsx:430-434`, `StaffPage.tsx:1052-1062` | Save disabled until the starred fields are filled | Bus: only vehicle type + number checked (odometer, 5 validity dates and hire owner ledger are starred but not checked). Driver: only DL name + Aadhar name. Staff/Helper: only name. `isValidMobile` (`lib/utils.ts:126`) is never used here | CODE REVIEW (GAP) |
| C07 | Import toast when ledgers fail | `StaffPage.tsx:763` | Warn "N ledgers not created" | `ledgers_failed` in the response is ignored; the toast says success | CODE REVIEW (GAP) |
| C08 | Bus import header-mismatch toast text | `BusNoPage.tsx:503` | "the Bus sheet" | Template literal has a stray brace: `the ${sheetType}} sheet` → "the Bus} sheet" | CODE REVIEW (BUG, Low) |
| C09 | Image upload type | `mainCtrl.js:777-802` (and each image block), `saveImage` 4815 | Only image types saved | `imgtype` comes from the client and is used as the file extension unchecked (`.html`, `.svg`, or a string with `..\` on Windows), so a stored-XSS file can be served from the upload host | CODE REVIEW (BUG) |
| C10 | "Today" default / max on Terminate, Service Out and date pickers | `StaffPage.tsx:101,375`, `BusNoPage.tsx:21,160` | IST today | `new Date().toISOString()` is UTC, so between 00:00 and 05:30 IST the default and `max` are yesterday and today cannot be picked | CODE REVIEW (BUG, Low) |
| C11 | Missing ledger container (Drivers / Helpers / Staff renamed or deleted) | `ensurePersonLedger` 11485 | Save warns | Person saved, ledger silently skipped (console only). Not run, because it would mean changing live chart-of-accounts rows | CODE REVIEW (GAP) |
| C12 | PII in server logs | `mainCtrl.js:1054, 4764, 4846`; `mainModel.js:1244, 10249` | No PII logged | Full driver/helper payloads (Aadhar, bank account, base64 images) and bus payloads are `console.log`'d on every add/edit | CODE REVIEW (Low) |
| C13 | Driver Validations: clear a wrongly entered date | `validity.tsx` MiniDatePicker | Clear option | `onChange` only delivers a picked ISO date, so a date cannot be removed | CODE REVIEW (GAP) |

## Bugs & risks

### High

**H1. SQL injection + apostrophe breakage on every Staff Register add, terminate and designation save.**
- Evidence: P08. Aadhar name `ZZTEST1' OR '1'='1` on `/adddriverregister` → `{"status":422,"message":"A matching record already exists"}` with **all 101 of 101 active driver rows** in `data`. P09, P32 and P39: names `D'Souza`, `O'Reilly`, `D'Cruz` → `{"status":500,"msg":"Server Error"}`, nothing saved. P21: termination reason `Didn't report` → `{"status":500}`, driver not terminated. D03: designation `Driver's Mate` → 500.
- Code: `samanviBackend/models/mainModel.js:1431-1438` (`checknameMdl`), `1453-1458` (`checkhelpername`), `1473-1478` (`checksaffnameMdl`), `2139` (`terminateStaffMdl`), `2149` (`rejoinStaffMdl`), `1902`/`1917` (staff types), `1859/1875/2170` (delete*). `/adddriverregister`, `/addhelperregister` and `/addstaffregister` take **plain, unsigned JSON**, so any logged-in user can dump the whole register (Aadhar, bank, DL).
- Impact: anyone named O'Brien, D'Souza and so on cannot be registered at all (the UI only says "Failed"). Full PII exfiltration is possible.
- Fix: use `?` placeholders in all of these queries.

**H2. The duplicate-refusal response leaks another person's full record.**
- Evidence: P07. A 422 on a duplicate mobile returns `data` = the complete clashing driver row (`aadhar_number, account_number, ifsc_code, dl_number, aadhar_card_front/back` URLs ...).
- Code: `mainCtrl.js:895, 1038, 1246` (`res.send({status:422, message, data: results1})`).
- Fix: drop `data` from the 422 response; the message is enough.

**H3. Driver import links a new ledger to terminated people too, and reuses terminated IDs.**
- Evidence: X09/X10. Terminated driver `ZZT1D010` (ledger 509). An import of a new person with the same ID was accepted, and afterwards **both** rows had `ledger_id=511`: `[{"id":129,"d_in":1,"ledger_id":511},{"id":131,"d_in":0,"ledger_id":511}]`. X17 is the same for Staff, linked by `fullName`: terminated staff 21 moved from ledger 513 to 514.
- Code: `mainModel.js:15317` (`checkIds` only sees live rows), `15275-15276` (`UPDATE ... SET ledger_id WHERE driver_id_number|fullName = ?`, no `d_in`/id filter), `15470`, `15381`.
- Impact: the terminated person's payable history now points at a different person's ledger. Rejoining gives two people one ledger, and IDs stop being unique.
- Fix: check IDs against all rows, and link by the inserted primary keys (`insertId` + row offset, or `INSERT` one row at a time).

**H4. Excel imports create duplicate vehicles and people that manual add would refuse.**
- Evidence: B32: importing `ZZTEST1 -IMP02` next to `ZZTEST1-IMP02` gave 2 live rows. B33: same number twice in one sheet gave 2 live rows. X08: `ZZTEST1 Twin` and `zztest1 twin ` in one sheet gave 2 drivers plus ledgers `ZZTEST1 Twin` and `zztest1 twin (ZZT1D011)`. X07: an import with another driver's mobile, Aadhar and DL number was inserted (manual add refuses these: P03-P05).
- Code: `mainModel.js:15154-15160` (lower/trim only, no space normalisation, no in-sheet dedupe); `15300-15308` (`split` checks existing rows only); nothing in the import checks mobile, Aadhar or DL.
- Impact: duplicates show in every dropdown. On the next server restart the boot migration (C03) silently retires one of the duplicate vehicles.
- Fix: normalise with the same `UPPER(REPLACE(bus_no,' ',''))` key as `findLiveBusByNumberMdl`, dedupe within the sheet, and run the same duplicate check as the manual add.

**H5. A bus/van Excel round-trip destroys data.**
- Evidence: B34: re-importing a hire vehicle from the Bus sheet turned it into `cat=normal owner_ledger_id=null`, and engine and insurance were wiped as well. B35: a Van sheet import set `home_tax_validity`, `base_point_validity`, `atp_validity` and `luxury_type` to NULL on every live row with that number.
- Code: `BusNoPage.tsx:469-476` (the Bus export writes 24 cells against 26 headers: Category and Owner Ledger are missing, so the parser at `:582-583` reads `normal`/`null`). `mainModel.js:15190-15202` writes **every** column, including ones the Van sheet does not have.
- Fix: export the two missing columns, and have the import update only the columns present in that sheet type (as `updatebusnumber` already does).

**H6. Sold-out vehicle numbers can be re-registered, then reactivated into duplicates.**
- Evidence: B25: while `ZZTEST1-VAN01` was service-out, adding it again returned 200 (rows d_in 1,0). B26: reactivating the old one returned 200, giving **2 live rows**. B36: the next Van import updated both. B37: import does the same.
- Code: `mainModel.js:1234` (`d_in = 0` filter), `1801-1813` (`reactivateBusMdl` has no duplicate check).
- Fix: check sold-out rows in `addNewbusnum` (offer Reactivate), and refuse reactivation while the number is live.

**H7. Unauthenticated endpoints.**
- Evidence: S01: `POST /getallstfdrivhelp` with no token returned HTTP 200 and 192 people (ids, names, ledger ids). B39: `/addsparetankbusno` with no token reaches the model (500 only because table `sparetank` no longer exists).
- Code: `samanviBackend/routes/routes.js:186` and `:505` (no `verifyToken`).
- Fix: add `verifyToken`, and delete the dead spare-tank route.

### Medium

**M1. Editing a bus with blank Registration Date / Seating Capacity writes `0000-00-00` / `0`.**
- Evidence: B20: `Warnings: 2`, DB `reg_date=0000-00-00 seating=0`, and the API list returns `reg_date=0000-00-00`. Three live buses already have `reg_date='0000-00-00'` (ids 1, 46, 83) and one has `seating_capacity=0`, so this has already happened in the data.
- Code: `mainModel.js:10275` (`null → ''`) and `10286` (`col=''` into DATE/INT columns).
- Impact: the date input and reports show garbage. On a strict-mode MariaDB every such edit fails with 500.
- Fix: write `NULL` for empty values of `reg_date` / `seating_capacity` (and `owner_ledger_id`).

**M2. Driver edit has no duplicate check.**
- Evidence: P16: a driver was edited to another driver's mobile, Aadhar and DL number (200). P17: DL name changed to another active driver's name (200; 2 active drivers with that name; ledger became `ZZTEST1 Collide (D22688)`).
- Code: `mainCtrl.js:4756-4812` (no `checknameMdl` call).
- Fix: run the check excluding the driver's own id.

**M3. Re-registering a terminated person makes a second record and ledger; Rejoin then gives two active copies; sometimes no ledger at all.**
- Evidence: P25: the re-add returned 200, giving D22690 (terminated, ledger 499) and D22691 (new). P26: rejoining D22690 left **2 active drivers with mobile 9000001003**. P25b: the new record got `ledger_id NULL` because both `ZZTEST1 Collide` and `ZZTEST1 Collide (D22691)` were taken, and the user was told nothing.
- Code: `mainModel.js:1440/1460/1480` (`d_in=0` only), `2144` (rejoin with no check), `11503/11512` (silent failure).
- Fix: on add, find terminated matches and offer Rejoin; check duplicates on rejoin; report ledger failure in the response.

**M4. Staff import: a name collision gives no ledger (manual add gives "(#id)").**
- Evidence: X16: `ledgers_created:0, ledgers_failed:["ZZTEST1 Ravi Kumar"]`, staff `ledger_id=null`, and the UI toast ignores it (C07).
- Code: `mainModel.js:15379` (`disambiguator: null`).
- Fix: insert staff rows one at a time and use `#<insertId>`.

**M5. Helper import fails outright when bank cells are blank, and truncates spaced Aadhar or "+91" mobiles.**
- Evidence: X12: a single row with blank Account Holder/Number/Bank/IFSC → `{"status":500,"msg":"Server Error"}` (these columns are NOT NULL and the model sends `NULL`; the page shows "Upload failed" with no reason). X13: `9999 0001 4002` stored as `9999 0001 40`. X19 (staff): mobile `+91 9000001503` stored as `+91 900000`, Aadhar `9999 0001 50`. X14: an update with a blank mobile stored `""` in a required column.
- Code: `mainModel.js:15515-15517`, `15489-15497`; `StaffPage.tsx:685-733` (no digit stripping in the import, although the manual form strips non-digits).
- Fix: use `blank()` as the Staff branch does; strip non-digits and validate the length of mobile and Aadhar on import.

**M6. Helper export drops the Emergency Mobile, so re-importing it wipes the column.**
- Evidence: P30: the helper row from `/gethelper` has `emergencymobilenumber`, not `emergency_mobile_number`. X14 shows the import then sets `emergencymobilenumber = NULL`.
- Code: `StaffPage.tsx:599` (`r.emergency_mobile_number`).
- Fix: read `r.emergencymobilenumber`.

**M7. Staff and Helper edit endpoints wipe saved document images; the service sends a payload they cannot read.**
- Evidence: P36: helper edit without images gave `adhar_card_front=null`, and `nickname` was blanked. P44: staff edit gave `aadhaarCardFront=null`. P34/P42: `masters.service.ts` `editHelper`/`editStaff` wrap the payload with `securePayload`, and the controllers read `req.body` directly, so the result is 200 with nothing changed.
- Code: `mainCtrl.js:4848-4878`, `4909-4911`; `mainModel.js:10724-10727`, `10796-10798`; `samanviReact/src/services/masters.service.ts:100,127`.
- Impact: latent today (there is no UI), but any future edit screen would lose documents.
- Fix: keep existing values when no new image is sent, and align the encryption.

**M8. Service Out via the API accepts a blank date/reason or a future date.**
- Evidence: B28: blank date and reason → `d_in=1` and `onServiceOutList=false`, so the vehicle disappears from both lists and can only be recovered in the DB. B27: date `2030-01-01` accepted.
- Code: `mainModel.js:1786-1799`, `1817`.
- Fix: validate on the server.

**M9. Duplicate hire-owner ledger name returns HTTP 500 text.**
- Evidence: B10: `HTTP 500 body="Server Error"`; the UI shows nothing (C05).
- Code: `mainCtrl.js:5249` (`res.send(500, ...)` swallows `DUPLICATE_TEMPLE`).
- Fix: return 422 with a message, and add a `catch` in `createOwnerLedger`.

### Low

- **L1** Driver edit overwrites `i_ts` (created date) and `user_id` (creator) with the editor's. P14: `user_id 1 -> 2`. `mainModel.js:10491-10493`.
- **L2** No server-side required-field validation. B05: a bus with an **empty bus number** was saved (id 96). B06: no type, odometer or fitness. B12/B13: hire with no or non-existent owner ledger. P10: a driver with blank DL name, mobile and Aadhar was saved with `ledger_id NULL`.
- **L3** Designation master allows duplicate names (D02: 2 active `ZZTEST1 Designation`).
- **L4** Bus import writes no `bus_edit_history` (B31), and neither does helper import. Invalid values (`31.12.2026`, `next year`, `abc`) are stored raw (B38).
- **L5** `excelCellToISODate` passes `2026-9-5`, `15/09/26`, `31.12.2026` and `2026-02-30` through unchanged (E03-E05). These land in varchar date columns and then show as "Date not entered" or wrong dates on the Validations pages. Real Excel date cells and `dd/mm/yyyy` text convert correctly with no IST off-by-one (E01, E02).
- **L6** Driver import via the API keeps a lower-case or padded ID (`zzt1d201`, X20). The page upper-cases it, the server does not.
- **L7** A terminate call with an unknown `staff_type` falls back to `staff_register` (`mainModel.js:2138`). It only fails today because the date column name differs (P24).
- **L8** Legacy data evidence: `driver_register` ids 13/14 have `dl_expiry_date='CHK-AcctNumber-C/D'` (column-shifted import), and the D-sequence has jumped to `D22681+` (the manual generator uses MAX+1, so an import of a large ID moves every later auto-ID). A race on parallel adds was **not** reproduced (P28 got distinct IDs), but there is no unique index on `driver_id_number` / `helper_id_number` / `busses.bus_no`.

## Gaps / missing validations / inconsistencies

- Manual add vs Excel import disagree on duplicates. Manual add refuses the same mobile, Aadhar, DL, DL name or Aadhar name. Import matches on name only, updates in place, and never checks the numbers (X07, X08).
- Ledger creation is best-effort and silent in 4 places: missing container, both name variants taken (P25b), staff import collision (X16), and a blank name (P10). The user is always told "added".
- Terminating a person or selling a vehicle leaves the person's ledger live and selectable, and the vehicle's hire-owner ledger untouched (P23). There is no "inactive" flag for postings.
- No Staff/Helper edit UI and no Staff/Helper edit history (C04).
- Renaming a vehicle number does not carry its trips, fuel, tyres or jobs with it (C01). Selling a vehicle does not check future trips (C02).
- Required-star fields are not enforced on the client or the server (C06, L2). Mobile numbers are not validated as Indian mobiles anywhere on this page.
- Validations pages cannot clear a date (C13). Vehicle Validations hides hire and spare vehicles, which is intentional.
- `bus_no`, `driver_id_number` and `helper_id_number` have no unique DB index, so the application checks are the only guard, and the import and reactivate paths bypass them.
- The boot-time duplicate-vehicle retirement is silent and irreversible from the UI (C03).
- Test environment note: other auditors were writing to the same DB at the same time (ZZTEST4/ZZTEST5 rows seen), so the active driver and bus counts moved during the run (drivers 96-101, buses 42-48). None of their rows were touched.

## Cleanup confirmation

Every row created by this slice was hard-deleted by primary key (and tag) on 2026-09-15:
- `busses` ids 95-111 (17 rows, including the untitled empty-number bus 96) and their `bus_edit_history` rows (ids 6-16)
- `driver_register` ids 121-134 (14) and `driver_edit_history` ids 4-10
- `helper_register` ids 107-110 (4)
- `staff_register` ids 19-24 (6)
- `staff_types` ids 14-15
- `mainmasterssubchildtwo` ledgers ids 485 and 497-519 (24 rows, all `ZZTEST1%`)

No images were uploaded (no files written), and no non-test row was modified: all edits in the tests targeted test ids only, and the unknown-type terminate used id 999999999.

Verification query after cleanup (all 0):
```
busses 0 | bus_edit_history 0 | driver_register 0 | driver_edit_history 0 | helper_register 0 | staff_register 0 | staff_types 0 | ledgers (temple_name LIKE 'ZZTEST1%') 0
```
(matched on `ZZTEST1%` names/owners/usr_nm, `ZZT1%` ids, `9000001%` mobiles, and the deleted id ranges.)



---

# Report B — Service Numbers

Scope: Masters > Service Numbers (`samanviReact/src/pages/masters/ServiceNoPage.tsx`), the Service For master (`ServiceForPage.tsx`, table `service_number`), the City List, Boarding Point, Bus Operator, Line Code and Route ID masters, the Halt Beta setting, and where service numbers are used: Trip Creation, Trip Expenses betas, Trip Reports and Laundry Bill.

How it was tested: I called the real HTTPS API at `https://localhost:8945/nodeapp` with a minted JWT and the same AES and HMAC `securePayload` wrapping the pages use. Every payload has the shape the page builds, and every result was checked in MariaDB `latest_samanvi_db`. I tested Excel parsing with the page's own code path: the `xlsx` package from `samanviReact/node_modules`, a copy of `parseExcelTime` and a copy of `headerRowMismatch`. Scripts are in `scratchpad/audit/s2/` (`h.js`, `t1.js`, `t2.js`, `t3.js`). All test data used the `ZZTEST2` prefix and has been hard-deleted.

## Flow summary (step by step, plain language, tables written)

1. **Service For master** (`ServiceForPage`). Add goes through `POST /addservicenumner` (encrypted) and runs `INSERT service_number SET ?`. Rename goes through `POST /updateservicenumber` as plain JSON, and the UPDATE is built by string interpolation. Delete goes through `POST /deleteservicenumber` and sets `service_number.d_in=1`. There are no unique keys and no duplicate check.
2. **Feeder masters** (City / Boarding Point / Bus Operator / Line Code / Route ID). Each has `GET /get…` plus `POST /add…` and `POST /delete…`, all parameterised and all soft-deleted. Tables: `city_list`, `boarding_points`, `bus_operators`, `line_codes`, `route_ids` (utf8mb4, no unique keys). The route form only copies the **name text** from these masters into `driverone`. The one exception is Bus Operator, which also copies the id.
3. **Add service number** (Bus or Van tab). The Submit button is enabled as long as Bus has Service For, Service No, From and To, or Van has Service For, Service No and Bus Operator. It sends `POST /driverone` (encrypted) with `{...form, id:null, userid, usrnm}`, which runs `INSERT driverone SET ?`. `serviceFor` (the name), `service_for_id`, betas, distance, boarding points and times, `vehicle_type`, `bus_operator_id/name`, `trip_type` and `up_down` all go to **`driverone`**. That table is latin1 and has no unique keys. The server does no validation and no duplicate check.
4. **List.** `POST /getdriveone` returns `SELECT * FROM driverone WHERE d_in=0`, inactive rows included. The page splits the result by the Bus/Van tab.
5. **Edit.** `handleEdit` copies the row into the form. `POST /updateserviceno` sends **plain JSON** to `updateservicenoMdl`, which builds `UPDATE driverone SET distance='${…}', … service_for_id = ${data.service_for_id} … WHERE id='${data.id}'` by string interpolation, on a pool opened with `multipleStatements: true`.
6. **Delete.** DataTable shows a confirm modal, then `POST /deletedriverone` runs `UPDATE driverone SET d_in=1`. It does not check for trips.
7. **Active/Inactive toggle.** `POST /setservicenoactive` (parameterised) sets `is_active`. When switching off it sets `inactive_from` to today in IST; switching back on sets it to NULL.
8. **Halt tab.** `POST /gethaltbeta` and `POST /savehaltbeta` (plain JSON) read and upsert `app_settings('halt_beta')`. It is one amount for the whole company.
9. **Excel import.** The page reads the first sheet with `sheet_to_json(header:1)` and checks the header row against the Bus or Van template. Rows are mapped by position and times go through `parseExcelTime`. A preview follows, then `POST /bulkuploadserviceroutes` (encrypted) runs `bulkUploadServiceRoutesMdl`. That function skips a row whose `serviceNo` (lowercased and trimmed) already exists **in the DB**, whatever its vehicle type, then multi-row INSERTs the rest into `driverone`.
10. **Trip Creation.** `getdriveone` is filtered by `offeredOn(route, tripDate)`: a route is shown if it is active, or if `tripDate < inactive_from`. The Bus grid lists non-van routes and can be filtered by the **Service For text**. The Van roster lists van routes. Submit calls `POST /bulkcreatetrips`, and `bulkCreateTripsMdl` drops three kinds of row: an inactive route on or after `inactive_from`, a service that already has a trip that date, and a bus that is already out that date. The rest are inserted into **`trip_created`**. No beta amounts are copied: `optreg/optreg1/optreg2` are left NULL.
11. **Trip Expenses.** Opening an unfiled trip calls `POST /getbeta {serviceNo: trip.service_no}` (interpolated) and takes `data[0]`. Seat betas, OPT salaries and parking are seeded from the **current** `driverone` row, or from the current Halt Beta when the trip was halted. Filing writes `tripexpenses_data` and the voucher tables; editing a filed expense reloads the saved values.
12. **Trip Reports** lists every `driverone` row as a Service No option. **Laundry Bill** offers only routes marked `up_down='Up'` and fills Vehicle No from that day's trip, matched on the `service_no` text.

## Scenario results

| ID | Scenario | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| M1 | Add Service For | `/addservicenumner` "ZZTEST2 Co" | Row created | 200, id 5 | PASS |
| M2 | Duplicate Service For | Add "ZZTEST2 Co" again | Refused | 200, second row (id 6). Both show in the route form's Service For dropdown | BUG |
| M3 | Empty Service For via API | serviceno "" | Refused | 200, blank row (UI trims and disables Submit, API does not check) | GAP |
| M4 | Service For with apostrophe (add) | "ZZTEST2 O'Brien" | Saved | 200, stored correctly (parameterised) | PASS |
| M5 | Rename Service For with apostrophe | `/updateservicenumber` "ZZTEST2 Co's" | Saved | `{status:500}`, SQL syntax error, UI shows "Failed to save" | BUG |
| M6 | Auth on plain-JSON / toggle / halt endpoints | Call without Bearer token | 401 | 401 for `/updateservicenumber`, `/updateserviceno`, `/setservicenoactive`, `/savehaltbeta` | PASS |
| M7 | Feeder masters add + list (City, Boarding Pt, Operator, Line Code, Route ID) | add, then GET list | Listed | All 5: 200 and listed | PASS |
| M8 | Feeder masters duplicate name | Add the same name twice | Refused | All 5 accept duplicates | GAP |
| M9 | Feeder masters empty name | Add "" | Refused | All 5 accept a blank entry, which then shows as an empty option | GAP |
| M10 | Feeder masters apostrophe + Telugu | "ZZTEST2 O'Brien విజయవాడ" | Saved | Stored intact (utf8mb4, hex verified) | PASS |
| R1 | Add bus route (full page payload) | `/driverone` with every Bus field, Up | Row with all fields | 200; every field persisted, `vehicle_type=bus`, `is_active=1` | PASS |
| R2 | Add van route | Van payload with operator id/name, pickup | Van row | 200; `vehicle_type=van`, operator id 6 + name, trip_type pickup, `up_down` NULL | PASS |
| R3 | Required fields at API | `/driverone` with every field empty | Refused | 200, blank bus route inserted (it would appear as an empty row on the Trip Creation grid) | GAP |
| R4 | Van without Bus Operator at API | Van payload, no operator | Refused | 200 | GAP |
| R5 | UI required markers vs Submit button | Code review, ServiceNoPage.tsx:295-299 vs 605-616 | Starred fields required | Parking, Driver 1/2, Helper and Conductor Beta and Distance are starred but `canSave` ignores them, so the form saves with them blank | CODE REVIEW (BUG) |
| R6 | Duplicate service no, same Service For | Add ZZTEST2-ST01 twice | Refused | 200, two identical routes | BUG |
| R7 | Duplicate service no, different Service For | ST01 under "ZZTEST2 O'Brien" | Refused, or allowed on purpose | 200 | BUG |
| R8 | Van with the same number as a bus route | Van ZZTEST2-ST01 | Refused, or allowed on purpose | 200 (the Excel import would **skip** this, see I8) | BUG |
| R9 | Case/space variant duplicate | " zztest2-st01 " | Refused | 200 | BUG |
| R10 | Beta lookup with duplicate numbers | `/getbeta {serviceNo:'ZZTEST2-ST01'}` | One row | 4 rows (3 bus, 1 van). Trip Expenses takes `data[0]`, the lowest id, so it can apply another route's or a van's rates | BUG |
| S1 | Add with apostrophe, quotes, backslash | `/driverone` serviceNo `ZZTEST2-ST'02`, remarks `O'Brien "quoted" back\slash` | Stored | Stored correctly (INSERT is parameterised) | PASS |
| S2 | Add with Telugu city / ₹ | fromCity "విజయవాడ", remarks "₹500" | Stored | Stored as `???????` and `?500` (hex 3F). `driverone` is latin1, so the data is lost for good. A Telugu name picked from City List (utf8mb4) is corrupted when copied into a route | BUG |
| S3 | Beta lookup for a service no containing an apostrophe | `/getbeta {serviceNo:"ZZTEST2-ST'02"}` | Rates | `{status:500}`. Trip Expenses would warn "No rates found" on every trip of that route | BUG |
| E1 | Edit betas | `/updateserviceno`, Driver 1 Beta 900 | Saved | 200; 900 saved, updated_by/userid set | PASS |
| E2 | Edit remarks "ZZTEST2 O'Brien" | plain JSON edit | Saved | `{status:500}`, nothing saved | BUG |
| E3 | Edit From City "Kodad's" | plain JSON edit | Saved | `{status:500}` | BUG |
| E4 | Edit a route whose service_for_id is NULL | `service_for_id:''`, as `handleEdit` sends for such rows | Saved | `{status:500}`: the SQL becomes `service_for_id = ,`. 6 real rows (ST-01..ST-05, TESTTRIP01) cannot be edited unless the user picks Service For again, and imported rows with an unknown Service For (I5) hit the same problem | BUG |
| E5 | Edit with backslash | remarks `back\slash` | Saved as typed | Stored as `backslash`: MySQL treated the backslash as an escape | BUG |
| E6 | SQL injection through a field | remarks `ZZTEST2',distance='99999` | Literal text | 200; **distance overwritten to 99999** | BUG |
| E7 | SQL injection through id | id `0' OR serviceNo LIKE 'ZZTEST2-INJ%` | One row at most | 200, `affectedRows:2`, both rows renamed. Any logged-in user can mass-update or corrupt `driverone`, and `multipleStatements:true` also allows stacked queries | BUG |
| E8 | Edit with localStorage user missing | userid/usrnm null | NULL or refused | `updated_by='null'` (string), `updated_userid=0` | GAP |
| E9 | Edit with non-numeric beta / negative distance | driverOneBeta "abc", distance "-5" | Refused | Saved as is (varchar columns) | GAP |
| E10 | Edit a van route without changing anything | Round-trip of the van row | Unchanged | 200; only `up_down` NULL→'' | PASS |
| X1 | Tampered signature on `/driverone` | Bad HMAC | JSON 400 | HTTP 500 with an Express HTML stack page: `validateSignature` throws outside try (mainCtrl.js:730). The backend stayed up | BUG |
| A1 | Deactivate | `/setservicenoactive is_active:0` | is_active 0, from today | is_active 0, `inactive_from='2026-09-15'`, returned as a plain string | PASS |
| A2 | Page's `offeredOn` for yesterday / today / tomorrow | Page function run on the API row | show / hide / hide | true / false / false | PASS |
| A3 | Bulk create, inactive route, **yesterday** | `/bulkcreatetrips` 2026-09-14 | Inserted | inserted 1 | PASS |
| A4 | Bulk create, inactive route, **today = inactive_from** | 2026-09-15 | Skipped | skipped_inactive 1 | PASS |
| A5 | Bulk create, inactive route, **tomorrow** | 2026-09-16 | Skipped | skipped_inactive 1 | PASS |
| A6 | Halt row (no bus) on inactive route today | trip_run_status Halt | Skipped | skipped_inactive 1 | PASS |
| A7 | Re-activate | is_active 1 | Active, date cleared | is_active 1, inactive_from NULL | PASS |
| A8 | Trip after re-activation today | bulk create | Inserted | inserted 1 | PASS |
| A9 | Second trip, same service, same day | bulk create again | Skipped | skipped 1 | PASS |
| A10 | Deactivate a route that already has trips | toggle off, query trips | Past trips untouched | Both trips (14th and 15th) still live | PASS |
| A11 | Toggle payload with is_active missing | `{id}` only | Refused | Switched **on** (anything that is not 0/false counts as active) | GAP |
| A12 | Legacy row: is_active 0 with NULL inactive_from | set in DB, bulk create yesterday | Consistent with UI | Backend skips it and UI hides it for every date: consistent | PASS |
| A13 | Deactivate from a chosen date (back-dated or future) | Code review | – | Not possible: the date is always "today IST", so switching off by mistake a day late cannot be corrected without SQL | GAP |
| A14 | `/bulkcreatetrips` **without a token** | POST, no Authorization header | 401 | **200**, handler ran (routes.js:223 has no `verifyToken`). `/gettripceated1` (228) and `/getexpensesfiltere` (162) are also unauthenticated | BUG |
| A15 | Future-dated trip via API | active van route, 2026-09-16 | Refused (UI `max=today`) | inserted 1 | GAP |
| A16 | Trip for a service_no_id that does not exist | id 99999999 | Refused | inserted 1 | GAP |
| D1 | Delete a route that has trips | `/deletedriverone` | Warn or block, or keep trips working | 200, `d_in=1`; the trip stays live and listed, but `/getbeta` now returns 0 rows, so Trip Expenses for unfiled trips opens with no rates | GAP |
| D2 | Trip on a deleted route (stale screen), other date | bulk create with the deleted id | Refused | inserted 1: `bulkCreateTripsMdl` never checks `driverone.d_in` | BUG |
| D3 | Delete confirmation | Code review, DataTable.tsx:313, 559-592 | Confirm | "Delete Record?" modal shown first | CODE REVIEW (PASS) |
| B1 | Betas changed after a trip exists | trip on ST01, edit Driver 1 Beta 800→1111, Parking 50→77, `/getbeta` | Decision needed: snapshot or live | Live: `/getbeta` now returns 1111/77, and `trip_created.optreg*` is NULL (no snapshot). Every **unfiled** trip, including past dates, is seeded with the new rates when opened in Trip Expenses | GAP |
| B2 | Filed trip expenses after a beta change | Code review, TripExpensesPage.tsx:1100-1131 | Unchanged | The edit modal loads the saved `tripexpenses_data` values; the fetched rate only seeds a seat filled during that edit | CODE REVIEW (PASS) |
| B3 | Service no renamed after trips exist | edit serviceNo → ZZTEST2-ST01R | Trips still priced | `trip_created.service_no` keeps the old text and `/getbeta(old)` returns 0 rows, so the trips show "No rates found — enter the betas by hand". The lookup uses the name, not `service_no_id` | BUG |
| B4 | Trips appear in the Trip Expenses / Laundry day filter | `/getexpensesfiltere` 14–15 Sep | Listed | 3 ZZTEST2 trips listed | PASS |
| H1 | Halt Beta read | `/gethaltbeta` | 2500 | `{halt_beta:"2500"}` | PASS |
| H2 | Halt Beta save + read back | save 3100 | 3100 | 3100 | PASS |
| H3 | Halt Beta non-numeric via API | "abc" | Refused | Saved "abc", which Trip Expenses would read as 0 | GAP |
| H4 | Halt Beta negative | "-100" | Refused | Saved | GAP |
| H5 | Halt Beta key missing | `{userid,usrnm}` only | Refused | Saved "" (halt beta wiped) | GAP |
| H6 | Halt Beta change vs existing halted trips | Code review, TripExpensesPage.tsx:903-909 | – | Not snapshotted: every unfiled halted trip picks up the new amount, filed ones keep theirs | CODE REVIEW |
| I1 | Bus import, new row | bulk payload shaped like the page's | Inserted | inserted | PASS |
| I2 | Bus import, number already in DB | ZZTEST2-ST01 | Skipped | skipped `["ZZTEST2-ST01"]` | PASS |
| I3 | Bus import, same number twice in one sheet | IMP02 × 2 | Second skipped | **Both inserted** (ids 85, 86). The DB set is not updated while looping (mainModel.js:15220-15225), and the page preview only flags DB duplicates | BUG |
| I4 | Import with Service For typed in different case | "zztest2 co" | Stored as master name | Stored as `zztest2 co` with id 5. The Trip Creation Service For dropdown then shows **"ZZTEST2 Co" and "zztest2 co"** | BUG |
| I5 | Import with a Service For that is not in the master | "ZZTEST2 Unknown" | Rejected in preview | Inserted with `service_for_id=NULL`, and the row then cannot be edited (E4) | BUG |
| I6 | Import with bad time/beta text | time "evening 6.30pm", beta "eight hundred" | Rejected | Time silently cut to `evening 6.` (varchar(10), non-strict sql_mode) and beta stored as text | GAP |
| I7 | Van import, number already in DB | ZZTEST2-VN01 | Skipped | skipped | PASS |
| I8 | Van import, number equal to an existing **bus** route | van ZZTEST2-IMP01 | Same rule as the form | Skipped (import dedupes across types), while the form allows it (R8): the two paths disagree | GAP |
| I9 | Van import, operator not in master / trip type "pick up" | – | Rejected | Inserted with `bus_operator_id=NULL`, trip_type "pick up". The form treats that operator as required | GAP |
| I10 | Import with blank Service For via API | – | Rejected | Inserted with serviceFor NULL. The page filters these rows out; the API does not | GAP |
| I11 | Up/Down in the Excel template / import / export | Code review, ServiceNoPage.tsx:99-112, 398-422 | Round-trips | No Up/Down column, so every imported bus route has `up_down=NULL` and **never appears on the Laundry Bill**, which lists Up routes only (LaundryBillPage.tsx:502-507) | GAP |
| T1 | Real time-formatted cell (hh:mm, h:mm AM/PM) | xlsx cell 0.7708 | 18:30 | 18:30 | PASS |
| T2 | Text "6:30 PM", "18:30", "18:30:45", "12:15 AM" | – | 18:30, 18:30, 18:30, 00:15 | as expected | PASS |
| T3 | Date+time cell (46280.25) | – | 06:00 | 06:00 | PASS |
| T4 | "6.30 PM" / "0630" | – | 18:30 / 06:30, or an error | Stored raw as "6.30 PM" / "0630" | GAP |
| T5 | "25:99" | – | Rejected | "23:99" (hour clamped, minutes not checked) | BUG |
| T6 | Number cell 1830 (typed without the colon) | – | 18:30 or an error | **"00:00"** without any warning | BUG |
| T7 | 0.99999 (23:59:59.9) | – | 23:59 | "00:00" (rounding wraps to midnight) | BUG |
| HD1 | Bus sheet on Bus tab / Van sheet on Van tab | headerRowMismatch | OK | null (accepted) | PASS |
| HD2 | Bus sheet on Van tab and the reverse | – | Rejected | "Column 3 should be …" | PASS |
| HD3 | Headers in upper case, without * | – | Accepted | Accepted | PASS |
| HD4 | Old 16-column template | – | Rejected | "Column 17 should be Line Code" | PASS |
| HD5 | Blank-header column inserted in the middle | blank column before Remarks | Rejected | **Accepted**: `filter(Boolean)` drops the blank header (utils.ts:103), but the data rows are still mapped by position, so every later column lands one field off | BUG |
| HD6 | Typo in the header error toast | Code review, ServiceNoPage.tsx:363 | "…Bus Service Route sheet" | Reads "…Bus Service Route} sheet" (stray `}`) | CODE REVIEW (BUG) |
| SF1 | **"Service For showing double entry" on Trip Creation**: case variant | Bus import stored "zztest2 co"; options built the way the page builds them | One entry per Service For | `["ZZTEST2 Co","zztest2 co",…]` | BUG |
| SF2 | Double entry: Service For renamed | rename id 5 "ZZTEST2 Co" → "ZZTEST2 Company", then add a route | One entry | Existing routes keep the old text and new routes carry the new one, so there are 3 texts for id 5: "ZZTEST2 Co", "zztest2 co", "ZZTEST2 Company" | BUG |
| SF3 | Double entry: duplicate master rows | Route form's Service For dropdown after M2 | One | "ZZTEST2 Co" listed twice | BUG |
| SF4 | Local real data | Built from live `getdriveone` | – | `["Samanvi","HALT","Flix"]`: not reproducible on the local copy, so the reported case must come from data like SF1–SF3 on the live DB | PASS |
| SF5 | Delete a Service For that routes use | `/deleteservicenumber` | Blocked or warned | 200; routes keep the dangling name | GAP |
| SF6 | trip_for_id quality on real trips | DB query | Filled | 12 trips `NULL` and 4 trips `''` for Samanvi, left by the 6 routes with a NULL `service_for_id` | GAP |
| C1 | Service Numbers page Service For filter | Code review, ServiceNoPage.tsx:178 | Names for the current tab | Built from every route, so van-only names show on the Bus tab | CODE REVIEW |
| C2 | Trip Creation default date | Code review, TripCreationPage.tsx:14 | Today IST | `new Date().toISOString()` is UTC, so from 00:00 to 05:30 IST the grid opens on yesterday, and the inactive check compares against the wrong date | CODE REVIEW (BUG) |
| C3 | Laundry vehicle fill with duplicate service nos | Code review, LaundryBillPage.tsx:484-494 | Correct bus | Matched on the `service_no` text, first trip wins, so duplicate numbers (R6–R9) can fill the wrong vehicle | CODE REVIEW |
| C4 | Trip Reports Service No dropdown | Code review, TripReportsPage.tsx:53 | Unique | One option per `driverone` row, so duplicate numbers show twice | CODE REVIEW |
| N1 | Clicking through the pages in a real browser | – | – | Not run: every check went through the HTTP API, plus DB queries and the page's own parsing functions | NOT TESTED |

## Bugs & risks

1. **Critical: SQL injection and apostrophe failure in route edit.** Evidence: E2, E3, E6, E7. `samanviBackend/models/mainModel.js:10426` (`updateservicenoMdl`) builds the UPDATE by interpolating `req.body`, and the pool has `multipleStatements:true` (config/dbconnect.js:17).
   - **Impact:** any value containing `'` (O'Brien, Kodad's) makes the edit fail with "Failed to save".
   - **Impact:** a crafted value can rewrite other columns, or every row via `id`. In the test, `affectedRows:2` came from a single edit.
   - **Impact:** backslashes are silently stripped (E5).
   - **Same pattern elsewhere:** `updateservicenumber` (10409), `getbetaMdl` (6370, see S3), `getbetadataMdl` (12414) and `deletedriveoneMdl` / `deleteservicenumber` (1834, 1844).
   - **Fix:** switch to `execupdateQuery` with `?` placeholders, as `driverone` and `setServiceNoActiveMdl` already do. Send the edit through `securePayload` like add does.
2. **High: `/bulkcreatetrips` requires no login.** Evidence: A14. `samanviBackend/routes/routes.js:223`, and the same for `/gettripceated1` (228) and `/getexpensesfiltere` (162).
   - **Impact:** anyone who can reach the API can create trips for any date or service, or read every trip.
   - **Fix:** add `verifyToken`.
3. **High: editing a route with an empty `service_for_id` always fails.** Evidence: E4. `mainModel.js:10426` has `service_for_id = ${data.service_for_id}` unquoted.
   - **Impact:** 6 real routes (ST-01..ST-05, TESTTRIP01) and every import row whose Service For does not match the master cannot be saved unless the user re-selects Service For.
   - **Fix:** parameterise and send NULL when blank. On load, also resolve `service_for_id` from the name.
4. **High: root cause of "Service For showing double entry".** Evidence: SF1, SF2, SF3, I4, M2.
   - The Trip Creation dropdown is `[...new Set(routes.map(r => r.serviceFor))]` (`TripCreationPage.tsx:366`). It removes duplicates by the **exact text** stored on each route, and that text drifts from the master in three ways:
     - (a) The Excel import stores the Service For exactly as typed in the sheet, not the master's spelling (`ServiceNoPage.tsx:371-380`), so "samanvi" and "Samanvi" become two entries.
     - (b) Renaming a Service For (`updateservicenumber`) does not update `driverone.serviceFor`, so old and new names both appear.
     - (c) The master accepts duplicate names, so the route form's dropdown itself shows a name twice.
   - Trailing spaces or case differences on the live DB would give the same symptom.
   - **Fix:** group and filter by `service_for_id` and label the option with the master's current name. Store the master's own spelling on import. Refuse duplicate master names (case-insensitive, trimmed). One-off data fix: `UPDATE driverone d JOIN service_number s ON s.id=d.service_for_id SET d.serviceFor=s.name`, and backfill the NULL/'' ids.
5. **High: duplicate service numbers are accepted, and rates are looked up by the service number text.** Evidence: R6–R10, B3, S3, C3, C4.
   - `driverone` insert (mainModel.js:1361) has no duplicate check. Trip Expenses gets rates with `getbeta` by `serviceNo` and takes `data[0]` (`TripExpensesPage.tsx:871-888`, `mainModel.js:6370`).
   - **Impact:** duplicates price trips with the wrong route's (or a van's) betas.
   - **Impact:** renaming a service number, deleting it, or having an apostrophe in it leaves its trips with "No rates found".
   - **Fix:** block duplicates, at least per vehicle type and case-insensitive, on add, edit and import (and decide whether bus and van may share a number). Look rates up by `trip.service_no_id`, including soft-deleted rows.
6. **Medium: `driverone` is latin1, so Telugu and ₹ text is lost for good.** Evidence: S2 (hex `3F3F…`). Masters such as `city_list` are utf8mb4, so picking a Telugu city from the master corrupts the route.
   - **Fix:** `ALTER TABLE driverone CONVERT TO CHARACTER SET utf8mb4` (and `trip_created` if it is also latin1).
7. **Medium: the Excel import inserts both copies of a number repeated inside one sheet.** Evidence: I3. `mainModel.js:15220-15225`.
   - **Fix:** add each key to `existingNos` as it is accepted, and flag in-sheet duplicates in the preview.
8. **Medium: a blank header column passes the header check but shifts every later field.** Evidence: HD5. `samanviReact/src/lib/utils.ts:103` (`.filter(Boolean)`).
   - **Fix:** compare headers by position without filtering, or map columns by header name.
9. **Medium: trips can still be created on a deleted route.** Evidence: D2. `bulkCreateTripsMdl` checks `is_active` but not `d_in` (mainModel.js:5279).
   - **Fix:** add `d_in=1` to the "off" query.
10. **Medium: betas and Halt Beta are not snapshotted on the trip.** Evidence: B1, H6. A beta or Halt Beta change silently re-prices every unfiled trip, including past dates.
    - **Fix:** copy the rates onto `trip_created` at creation (the `optreg*` columns already exist and are NULL), or show the rates' effective date. At minimum, warn on edit when unfiled trips exist.
11. **Medium: imported routes never reach the Laundry Bill.** Evidence: I11. The template, export and import have no Up/Down column, and the Laundry Bill lists `up_down='Up'` routes only.
    - **Fix:** add an Up/Down column to the Bus template, export and import.
12. **Low: the required-field markers do not match what Submit enforces.** Evidence: R5 (`ServiceNoPage.tsx:295-299`). Seven Bus fields are starred but can be left blank, and the API validates nothing (R3, R4, I10).
13. **Low: Excel time parsing edge cases.** Evidence: T4–T7 (`ServiceNoPage.tsx:33-56`). Values like 1830 → 00:00, 23:59:59.9 → 00:00 and 25:99 → 23:99 are stored silently, and long text is cut to 10 characters (I6).
    - **Fix:** validate HH (0-23) and MM (0-59), and show invalid cells as errors in the preview.
14. **Low: Halt Beta and edit fields take non-numeric, negative or missing values.** Evidence: H3–H5, E9 (`savehaltbetaMdl` 6403).
15. **Low: a tampered signature returns an HTML 500 page instead of JSON.** Evidence: X1 (mainCtrl.js:729-731, and the same in every controller that calls `validateSignature` outside try).
16. **Low: Trip Creation's "today" is the UTC date.** Evidence: C2 (TripCreationPage.tsx:14). Between 00:00 and 05:30 IST the default date and the inactive check are a day behind.
17. **Low: the toggle API treats a missing `is_active` as "activate"** (A11). Separately, the header error toast has a stray `}` (HD6).

## Gaps / inconsistencies

- **Duplicate rules differ by path:** the form accepts a bus and a van with the same number (R8), but the import skips it (I8). Neither path checks for duplicates inside the same vehicle type correctly.
- **Deactivation date:** it is always "today IST" (A13). You cannot deactivate from a future date or correct a late switch-off.
- **Delete and trips:** deleting a service number with trips is allowed with no warning (D1). Deleting a Service For that routes use is also allowed (SF5). Every master delete is soft, and the route keeps copied text.
- **Future dates:** the API accepts future-dated trips (A15) and trips for non-existent service ids (A16), although the UI date input caps at today.
- **Feeder masters:** all 5 accept duplicate and blank names (M8, M9). The route stores names, not ids, apart from Bus Operator. Renaming or deleting a master entry is not reflected in routes.
- **Missing trip_for_id on real trips:** 16 real trips have a NULL or blank `trip_for_id` (SF6), because 6 legacy routes have a NULL `service_for_id`.
- **Unused columns:** `driverone.halt_beta` is unused, since Halt Beta is global. The `optDriver` / `optHelper` fields are in the form state and the Excel template but have no form input.
- **Service For filter:** on the Service Numbers page it is not scoped to the Bus/Van tab (C1).
- **Edit sends plain JSON** while add, delete and toggle are encrypted. Same for the Halt Beta save.

## Cleanup confirmation

- **Created during the test:**
  - `service_number` ids 5–8.
  - City List 9–12, Boarding Points 9–12, Bus Operators 6–9, Line Codes 7–10, Route IDs 5–8.
  - `driverone` ids 60–70 and 83–92.
  - `trip_created` ids 134–139.
- **Halt Beta:** changed during H2–H5, then restored to its original row exactly: `2500`, updated_by `e2e`, userid 1, u_ts 2026-09-08 17:24:45.
- **Deleted:** every row above was hard-deleted with DELETE statements scoped to both the ids and the ZZTEST2 pattern.
- **Verification query** (after cleanup), counts of rows matching `%ZZTEST2%` or the ids above: `driverone` 0, `trip_created` 0, `service_number` 0, `city_list` 0, `boarding_points` 0, `bus_operators` 0, `line_codes` 0, `route_ids` 0, `tripexpenses_data` 0. `app_settings.halt_beta` = 2500 (original).
- **Real data:** no real service number was toggled, edited or deleted. The `ZZTEST3-*` rows belong to another auditor and were not touched.



---

# Report C — Trip Creation & Trip Lifecycle

Scope: Trip Creation (`samanviReact/src/pages/trips/TripCreationPage.tsx`), Admin Approvals, Deleted Trips, Trip Logs, Trip Reports, and the backend trip lifecycle (`/bulkcreatetrips`, `/tripcreated` add/edit, `/gettripceated1`, `/deletetripcreated`, `/gettriphistory`, `/updatetripadminstatus`, logs/deleted endpoints, `utils/refnumber.js`).

Method: I read the page and service code. Then I called the real HTTP API on `https://localhost:8945/nodeapp` with the payloads the page builds (the edit payload was rebuilt line by line from `openEdit` and `saveEdit`), and checked the results in MariaDB `latest_samanvi_db`. Fixtures were tagged ZZTEST3 and inserted straight into the DB (6 vehicles, 2 ledgers, 2 drivers, 1 helper, 1 staff, 9 service numbers), so no person ledgers were auto-created. Trip dates: 2027-03-01..11 and one past date, 2026-01-07 (2026-01-05 already has a real trip, TRIP0010). Scripts: `scratchpad/audit/s3/{lib,setup,test1,test2,probe,cleanup}.js`, raw output in `out1.txt` and `out2.txt`.

## Flow summary (step by step, plain language, tables written)

1. **Opening the page.** It loads trips (`POST /gettripceated1`), vehicles (`/getbussesdata`), service numbers (`/getdriveone`), drivers (`/getalldrivers`), helpers and staff (`/gethelper`, encrypted), and the Paid-To list (`/getallstfdrivhelp`). The Trip Date picker has `max={today}`, so the UI cannot pick a future date.
2. **Bus tab (roster).**
   * There is one row for each active bus service number. A service marked inactive is hidden from its `inactive_from` date onward.
   * A service that already has a trip on that date shows as a read-only "Created" row with an Edit button.
   * The bus list leaves out buses already used that day and buses picked on other rows.
   * Each row has: Status (Running / Full Trip / Halt), Bus, Driver 1, Driver 2, Helper and Conductor (each with a "paid direct" tick and an "Opting X" entry), Paid To (driver, helper or staff, or a "no Paid To" tick), and Remarks.
   * A Running row needs a bus and Driver 1 before it can be submitted. A Halt row is submitted with no bus.
3. **Van tab (roster of van service numbers).**
   * Columns: Line Code (defaults to the service's code), Pick/Drop and From (read-only), Status, Van (the same van may be used on several services), Driver, Name/Mobile, Amount, Remarks.
   * On a hired van (`busses.bus_category='hire'`) the driver is not applicable, and the hirer name and Amount are required.
   * On an own van with "Opting Driver", the opting driver's name, a valid mobile and Amount are required.
   * A halted van row needs nothing else.
4. **Submit.** Both tabs call `POST /bulkcreatetrips {trip_date, rows[], user_id, usr_nm}` as plain JSON with no token check. `bulkCreateTripsMdl` then:
   * keeps rows that have a bus or are Halt;
   * drops rows whose service is inactive on that date (`skipped_inactive`);
   * drops rows whose service already has a live trip that date (`skipped`);
   * drops bus rows whose bus is already on a live bus trip that date, or appears twice in the batch (`skipped_bus`);
   * mints `T<yymmdd><nnn>` numbers from `MAX(nnn)` over all rows for that date, deleted rows included;
   * inserts everything in one multi-row INSERT into **`trip_created`** (`vehicle_type`, `trip_run_status`, `*_paid_direct` flags, van `line_code` / `hirer_name` / `phone_number` / `booking_amount` / `opt_driver1_*`).

   **No voucher, ledger or expense row is written at creation.** Verified: 0 `mainvoucher_t` rows and no hirer ledger.
5. **Records table.** The same list, split by `vehicle_type` per tab. The list query joins the driver, helper and staff registers (COALESCE on names), `mainvoucher_subt` (debit and credit ledger names through `trip_created.voucher_number`) and `driverone` (`up_down`, and `trip_type` as `pick_drop`).
6. **Edit.** `POST /tripcreated {…, type:'edit'}`. The model:
   * reads the old values;
   * refuses to move a bus trip onto a bus already out that day (409);
   * updates only the whitelisted keys it receives (escaped);
   * compares seven tracked fields (bus, D1, D2, helper, conductor, status, hirer) and writes **`trip_edit_history`**.

   The controller then **always** runs `updatetripcreated`, a string-interpolated UPDATE of **`tripexpenses_data`** and **`expensive_details`** keyed by `trip_creation_id`.
7. **Expense / voucher (Trip Expenses, out of this slice, used here for linkage).**
   * `/addexpensesdetails` writes `tripexpenses_data`, `expensive_details` (debit and credit rows) and `trip_created.status=1`.
   * It also posts a Journal voucher in `mainvoucher_t` / `mainvoucher_subt`. The voucher's c_number is the trip's own T-number, and `trip_created.voucher_number` is set to it.
8. **Delete.** `POST /deletetripcreated {id}` has no token check and no UI button anywhere. It sets `d_in=1` on `trip_created`, `tripexpenses_data` and `expensive_details`. **Vouchers are not touched.**
9. **Admin Approvals.** `/updatetripadminstatus` sets `admin_status` on `tripexpenses_data`, `expensive_details` and `trip_created`. **Deleted Trips, Trip Logs and Trip Reports** read `tripexpenses_data` / `expensive_details`, not `trip_created` or `trip_edit_history` (see bugs).

## Scenario results

| ID | Scenario | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| M1 | Vehicles list for the grids | POST /getbussesdata | Fixtures with vehicle_type, bus_category, owner_ledger_id | All 6 returned, hire rows carry owner_ledger_id 476 | PASS |
| M2 | Service numbers list | POST /getdriveone | is_active, inactive_from (string), trip_type, line_code | Returned; inactive_from "2027-03-05" as a string | PASS |
| M3 | Drivers / helpers / active staff lists | /getalldrivers, /gethelper (encrypted) Helper and Staff | Fixture people present | Present; staff has fullName and nickName | PASS |
| M4 | Paid-To list | /getallstfdrivhelp | driver/helper/staff with ledger_id | Returned (ledger_id null for DB-inserted fixtures, expected) | PASS |
| M5 | Paid-To list without token | same, no Authorization header | 401 | 200, 171 rows with names of all staff, drivers and helpers | BUG |
| B1 | Bus sheet, 5 rows: full crew; D1 only; all-opting; Halt with no bus; Full Trip on hired bus | /bulkcreatetrips 2027-03-01 | inserted 5 | inserted 5, skipped 0 | PASS |
| B1a | Ref numbers | DB | T270301001..005 in row order | T270301001..005 | PASS |
| B1b | Full crew row stored | DB | ids, names, paid_to_type=driver, flags D1=1, Cond=1, created_name | All stored as sent (apostrophe in D'Souza OK) | PASS |
| B1c | Opting seats (bus) | DB | Opting person identifiable | driver1/driver2/helper/conductor_name = "Opting …", opt_*_name NULL; the real name exists only in free-text remarks | GAP |
| B1d | Halt row, no bus, no crew | DB | Saved with bus NULL, status Halt | bus_no NULL, Halt | PASS |
| B1e | Full Trip on a hired bus | DB | Saved; hire cost captured somewhere | Saved Full Trip; no amount or owner ledger on the Bus grid for a hired bus | PASS (GAP: no hire amount on bus) |
| B1f | No voucher at creation | mainvoucher_t by trip_c_number / description | 0 | 0 | PASS |
| B2 | Resubmit same sheet (double click / stale tab) | same payload again | all skipped | inserted 0, skipped 5 | PASS |
| B3 | Same service twice in one batch | 2 rows ST01 with BUS01 and BUS02, 2027-03-02 | 1 inserted, 1 skipped | **Both inserted** (T270302001, T270302002) | BUG |
| B4 | Same bus on two services in one batch | ST02 and ST03 both BUS03 | 1 inserted, skipped_bus 1 | inserted 1, skipped_bus 1 | PASS |
| B4b | Bus already on a saved trip that day | ST04 with BUS03 in a later submit | skipped_bus 1 | skipped_bus 1 | PASS |
| B4c | Two Halt rows (no bus) same day | ST04 and ST05 Halt | both inserted | inserted 2 | PASS |
| B5 | Running bus row with no Driver 1 | API row with bus, no driver | Server rejects (UI requires D1) | Accepted | GAP (UI-only validation) |
| B5b | Hired van with no hirer and no amount | API | Rejected | Accepted | GAP |
| B5c | Van number sent on a bus row (vehicle_type bus) | API | Rejected | Accepted | GAP |
| B5d | Rows with empty service_no_id | 2 rows, no service id | Rejected, or deduped | Both inserted; service dedupe and inactive check are skipped | GAP |
| V1 | Van sheet: own van + driver; **same van** on a 2nd service with Opting driver + mobile + amount 750; hired van with hirer O'Neil, phone, 2500 | /bulkcreatetrips 2027-03-03 | 3 inserted | 3 inserted | PASS |
| V1a | Van fields stored | DB | line_code, opt_driver1_name/mobile, hirer, phone, booking_amount; hirer_ledger_id NULL | All as sent; apostrophes stored fine | PASS |
| V1b | Van service already booked that day | resubmit VT01 | skipped | skipped 1 | PASS |
| V1c | Halted van row with no van | VT01 Halt 2027-03-09 | inserted | inserted, bus_no NULL | PASS |
| V1d | No hirer ledger minted | mainmasterssubchildtwo | none | none | PASS |
| I1 | Inactive service after inactive_from | ST06 (inactive from 2027-03-05) on 03-06 | skipped_inactive | skipped_inactive 1 | PASS |
| I1b | Inactive service ON inactive_from | 03-05 | skipped | skipped_inactive 1 | PASS |
| I2 | Inactive service before inactive_from | 03-04 | inserted | inserted 1 | PASS |
| P1 | Past date | 2026-01-07 | inserted, number from trip date | T260107001 | PASS |
| F1 | Future date from the UI | code review line 746 | Allowed for advance planning, or blocked on purpose | UI blocks (max=today); backend accepts any date (all tests used 2027) | CODE REVIEW (inconsistent) |
| T1 | Today's date sheet | — | — | Not run, to avoid bumping today's real sequence (N1 shows today's numbering works) | NOT TESTED |
| X1 | Apostrophe / SQL text / Telugu in remarks on bulk insert | remarks `it's O'Brien; ' OR '1'='1 -- తెలుగు` | Stored verbatim | Apostrophes safe (parameterised); **Telugu stored as `??????`** (latin1 table) | BUG (data loss) |
| N1 | Bulk submit with no trip_date | API | 400 | Inserted with trip_date NULL and today's number T260915001 | BUG |
| A1 | Create trips without token | /bulkcreatetrips, no Authorization | 401 | Trip T270310002 created, created_id/created_name blank | BUG (critical) |
| A2 | Trip list without token | /gettripceated1, no header | 401 | 200, full list | BUG |
| L1 | Bus record fields for columns | /gettripceated1 | Sl/Ref/Date/Status/Bus/Service/D1/D2/Helper/Conductor/PaidTo/Amount/Debit/Credit/Remarks | All present; up_down "Up" returned but no column; Amount/Debit/Credit null until an expense voucher exists; **conductor shows fullName although nickName was saved** | PASS (see E1) |
| L1b | Van record fields | same | line_code, pick_drop, driver, opt name+mobile, hirer, amount | pick_drop "drop", all present | PASS |
| L1c | Record order | index of rows | Newest trip date first | Sorted by `CAST(SUBSTRING(c_number,6))` = day+seq: T260915001 at 0, T270310002 at 4, T270301001 at 26, T260107001 at 12 | BUG (low) |
| E1 | Open Edit on the full-crew bus trip and save without changes | payload from openEdit/saveEdit | No change, no history, 200 | (a) History row `Conductor: 'ZZTEST3 Cond' -> 'ZZTEST3 Conductor Fullname'` and stored conductor_name overwritten; (b) HTTP **500** (ER_PARSE_ERROR from `D'Souza` in updatetripcreated), yet trip_created was updated | BUG |
| E2 | Edit Driver 2, Conductor, Status, Paid To, remarks | edit trip 002 | 200, row updated, history | 200; history `Driver 2 … / Conductor … / Status Running -> Full Trip`; Paid To and remarks change not in history | PASS (GAP: paid_to/remarks/amount not tracked) |
| E3 | Edit bus onto a bus already out that day | bus -> BUS01 | 409 with trip named, no change | 409 "Bus ZZTEST3-BUS01 is already on trip T270301001 that day", unchanged | PASS |
| E4 | Edit remark containing an apostrophe | remarks "driver's remark" | 200 | **HTTP 500** ER_PARSE_ERROR, but the remark **was saved**; the user sees "Server error" | BUG |
| E5 | Edit a Halt bus trip (no bus) | code review line 1315; API | Editable | Server OK (200). **UI Save is disabled** because Bus No is required and Driver 1 is required even for Halt/van Halt, so a halted trip cannot be edited on screen | BUG (CODE REVIEW) |
| E6 | File expense + voucher on hired van trip (linkage check) | /addexpensesdetails with 2 ledgers, 2500 | voucher = trip number, trip.voucher_number set | Journal T270303003 (status 0), trip.voucher_number set, trip.status 1 | PASS |
| E6b | Records show voucher ledgers | /gettripceated1 | debit/credit names | "ZZTEST3 Hire Charges" -> "ZZTEST3 Van Owner O'Neil" | PASS |
| E7 | Edit the van trip from Trip Creation after its expense was filed (phone only) | payload from page | Expense rows untouched or kept consistent | tripexpenses_data trip_date, service_no, service_no_id, driver2_name, paid_to_type became the literal **'undefined'**; expensive_details trip_date/service_no also 'undefined' | BUG (high) |
| E8 | Move a filed hired van trip onto an own van (commit 10aa5a9 scenario) | API edit bus HVAN01 -> VAN01, driver, amount '' | Server refuses while the hire voucher exists | 200. Trip is now own van with booking_amount '', but voucher T270303003 (Hire 2500 -> owner) stays live and linked. History logged the bus/driver/hirer change. The guard exists only in the UI (`hirePostedConflict`). | BUG (medium) |
| E8b | Frontend hire->own amount clearing (10aa5a9) | code review 1176-1185 | booking_amount cleared on vehicle switch | Cleared both ways; Save blocked when voucher exists | CODE REVIEW PASS |
| E9 | Own van: Opting driver -> registered driver | edit | amount and mobile cleared | driver1 set; opt name, mobile, booking_amount ''; history only `Driver 1` (amount change not logged) | PASS |
| H1 | Trip history endpoint | /gettriphistory {trip_id} | rows | 2 rows returned | PASS |
| H2 | Where is trip history visible | code review | Trip Creation / Trip Logs | Only TripExpensesPage shows it; Trip Creation has no history view; Trip Logs never reads trip_edit_history | GAP |
| AP1 | Approve a trip (Admin Approvals payload) | /updatetripadminstatus plain JSON | admin_status 1; action by/date on trip | admin_status 1 (number, so `=== 0` filters work); `admin_status_by_name` and `status_date` on trip_created never set, so the view modal's "Action By/Date" is always empty | PASS (GAP) |
| AP2 | Edit after Approve / Reject | edit approved trip 002 and rejected 001 | Locked, or needs re-approval | Both edited (200 / 500-but-saved); admin_status unchanged | GAP |
| AP3 | Approving a trip does not approve its voucher | code review 6265 | — | Voucher stays pending in Voucher Approvals | CODE REVIEW |
| RP1 | Trip Reports page payload | /getexpensesreport {bus_no, service_no, from_date, to_date} | Filtered expenses | Filters ignored; `type` missing so the query returns only **admin_status=2 (rejected)** rows (0 rows). Columns `date`, `driver_name`, `income` do not exist in tripexpenses_data | BUG |
| LG1 | Trip Logs counts | /gettriplogscount | {total, updated, deleted, active} | `[{"d_in":2,"d_in_count":6}]`, so the cards show "—" and fallbacks | BUG |
| LG2 | Trip Logs "Updated" tab after Trip Creation edits | /gettripupdatedlogs | Our edits listed | Not listed (reads tripexpenses_data d_in=2, i.e. expense re-filings only) | GAP |
| D1 | Delete trip without expense | /deletetripcreated {id} | Soft delete, who and when recorded | d_in=1, hidden from list; no deleted_by/date columns written; **no delete button in any page** | PASS (GAP) |
| D2 | Delete trip with filed expense + voucher | same on T270303003 | Voucher voided or delete refused | trip, tripexpenses_data, expensive_details set d_in=1; **mainvoucher_t and 2 subt lines stay d_in=0**; voucher_number kept | BUG (high) |
| D2b | Orphan voucher visible | GET /getvoucherentrydata | — | T270303003 Hire Charges -> Owner 2500 still pending, for a deleted trip | BUG (evidence) |
| D3 | SQL injection in delete id | id = `"<A>' OR id='<B>"` (own fixtures) | Only numeric id accepted | Both trips deleted | BUG (critical) |
| D4 | Delete without token | no Authorization | 401 | 200, trip deleted | BUG (critical) |
| DT1 | Deleted Trips page API | /gettripdeletedmodaldata {} (page payload) | Deleted trip list | `[[],[]]`: the page shows "2 records" of blank rows, never real deletions | BUG |
| DT2 | Deleted logs (Trip Logs tab) | /gettripdeletedlogs | Deleted trips with who/when | Only trips that had an expense (T270303003); delete_by_name null (deletetripcreated never sets it); D1/D3/D4 deletions absent | GAP |
| DT3 | Restore deleted trip | page code + probe /restoretrip | Restore action | No restore in UI or API (404); page text says "Contact admin" | GAP |
| R1 | Ref number after delete | delete T270301004, then create on 03-01 | T270301006 (no reuse) | T270301006 | PASS |
| C1 | Two identical bulk submits in parallel | Promise.all x2 (and x5 in probe) | No duplicates | No duplicates reproduced (second saw skipped_bus/skipped) | PASS (race window remains, see risk) |
| C2 | Two parallel submits, different services, same date | ST03 and ST04 on 2027-03-09 | Distinct numbers | **Both got T270309002** (duplicate c_number) | BUG |
| LEG1 | Legacy `/tripcreated type=add` with apostrophe | API (not used by the React UI) | Error surfaced | HTTP 200 wrapping `{status:500}` | BUG (low) |
| LEG2 | Legacy add without apostrophe | API | Dedupe, defaults | Inserted T270310003 bypassing bus/service dedupe; optreg/conductor_name stored as 'undefined' | BUG (low) |
| XD1 | Delete expense in Trip Expenses (the path the edit modal tells users to take) | code review mainModel.js 3440 | Removes the expense only | `deleteexpenseMdl` also sets **trip_created d_in=1** by c_number and leaves the voucher, so the trip disappears too | CODE REVIEW (BUG) |
| XV1 | Voucher date of trip voucher | E6 observation | Trip date | voucherdate = filing day (2026-09-15) for a 2027-03-03 trip | CODE REVIEW (slice 4) |
| XE1 | Edit success check | code review line 655 | Only 200 is success | `res.status === undefined` also counts as success | CODE REVIEW (low) |
| XP1 | Paid-To balance under picker | — | — | Not exercised | NOT TESTED |

Counts: 75 rows.

| Result | Rows | Notes |
|---|---|---|
| PASS | 35 | Run and observed; 5 of these carry a GAP/remark note |
| CODE REVIEW PASS | 1 | E8b |
| BUG | 22 | Includes 1 found by code review (E5) |
| GAP | 10 | |
| CODE REVIEW | 5 | XD1 is a real bug; F1, AP3, XV1, XE1 are observations |
| NOT TESTED | 2 | |

## Bugs & risks

1. **CRITICAL: trip write and delete endpoints have no authentication.**
   * **Evidence:** A1, D4, A2, M5 all returned 200 with no Authorization header.
   * **Where:** `samanviBackend/routes/routes.js:222-228` (`/tripcreated`, `/bulkcreatetrips`, `/deletetripcreated`, `/gettriphistory`, `/gettripceated`, `/gettripceated1`) and `:186` (`/getallstfdrivhelp`) have no `verifyToken`.
   * **Impact:** Anyone who can reach the API can create, edit or delete trips and read staff/driver PII.
   * **Fix:** Add `verifyToken`. Take user id/name from the token, not the body.
2. **CRITICAL: SQL injection in delete.**
   * **Evidence:** D3 deleted two trips with one id string.
   * **Where:** `models/mainModel.js:5539-5546` (`'${reqdata.id}'` in three statements).
   * **Also affected:** `updatetripadminstatusMdl` (6265), `gettripdeletedmodaldataMdl` (6466) and the legacy add (5121) interpolate too.
   * **Fix:** Use parameterised queries and `Number(id)`.
3. **HIGH: editing a trip from Trip Creation corrupts its filed expense rows.**
   * **Evidence:** E7. `tripexpenses_data.trip_date / service_no / service_no_id / driver2_name / paid_to_type` and `expensive_details.trip_date / service_no` became `'undefined'`.
   * **Where:** `controllers/mainCtrl.js:3224` always calls `updatetripcreated`. `models/mainModel.js:5407-5448` writes every column from `data.*`, but the Trip Creation edit payload (`TripCreationPage.tsx:626-652`) sends only the displayed keys. Van edits also omit driver2/helper/paid_to.
   * **Impact:** Trip Expenses and reports lose the date and service of filed trips. Date-filtered payables and reports miss them.
   * **Fix:** Cascade only the keys present (same whitelist as the main update), parameterised. Or skip the cascade when the payload lacks them.
4. **HIGH: deleting a trip leaves its voucher live.**
   * **Evidence:** D2 and D2b. The voucher and both lines stayed `d_in=0` and pending in Voucher Entry for a deleted trip.
   * **Where:** `mainModel.js:5539-5546`. The same happens in `deleteexpenseMdl` (3440), which also deletes the trip itself.
   * **Impact:** Once the voucher is approved, the books carry expenses and payables for trips that no longer exist.
   * **Fix:** Void the linked voucher in the same transaction (reuse `voidTripVoucherMdl`), or refuse to delete while `voucher_number` is set. Record who deleted and when.
5. **HIGH: a successful edit returns HTTP 500 when any text contains an apostrophe.**
   * **Evidence:** E1, E4, AP2, P1. The trip_created update and history were saved, then `updatetripcreated` failed with ER_PARSE_ERROR.
   * **Where:** `mainModel.js:5412-5447`.
   * **Impact:** The user sees "Server error" and retries. In Trip Expenses, `updateTripMutate` fails, so the expense is **never filed** for any trip whose remarks or crew name contain `'` (e.g. D'Souza).
   * **Fix:** Parameterise, and run both statements in one transaction with the main update.
6. **MEDIUM: duplicate trip numbers under concurrent submits.**
   * **Evidence:** C2. Two parallel submits for different services both got T270309002.
   * **Where:** `utils/refnumber.js:21-34` (SELECT MAX, then insert, no lock); `trip_created` has no unique index on c_number.
   * **Impact:** Two trips share one number. Voucher numbers equal trip numbers, and `setTripVoucherNumberMdl` / `updatefunction` update by c_number, so an expense or voucher can attach to both trips.
   * **Fix:** Mint inside a transaction with `SELECT … FOR UPDATE` on a counter row, or add a UNIQUE index on c_number and retry.
   * **Same race:** Service and bus dedupe (`mainModel.js:5246-5291`) are read-then-insert without a lock. Not reproduced in 5 parallel tries, but possible.
7. **MEDIUM: same service twice in one batch is not deduped.**
   * **Evidence:** B3, 2 trips for ST01 on one date.
   * **Where:** `mainModel.js:5247-5258` (`byService` checks the DB only; `byBus` does track in-batch duplicates).
   * **Fix:** Add each accepted `service_no_id` to `taken` while filtering.
8. **MEDIUM: hire->own van move is guarded only in the UI.**
   * **Evidence:** E8. The server accepted it and the hire voucher stayed for an own-van trip.
   * **Where:** `TripCreationPage.tsx:619-620`; no check in `mainModel.js:5141-5201`.
   * **Fix:** Enforce server-side (voucher_number set and old bus hired and new bus not hired, return 409).
9. **MEDIUM: an unchanged Save rewrites the conductor and logs a false history entry.**
   * **Evidence:** E1.
   * **Where:** The list returns `COALESCE(s.fullName, t.conductor_name)` (`mainModel.js:5493`), but the grid saves `nickName ?? fullName` (`TripCreationPage.tsx:1051`). `openEdit` seeds the form from the list value.
   * **Fix:** Use the same name rule in both places (`COALESCE(s.nickName, s.fullName, …)`), or compare ids in the diff.
10. **MEDIUM: halted trips cannot be edited in the UI.**
    * **Where:** `TripCreationPage.tsx:1315` disables Save when `!editForm.bus_no`. For bus trips it also requires Driver 1 (`:1320`), even when the status is Halt.
    * **Fix:** Skip the bus and driver requirements when the status is Halt.
11. **MEDIUM: the Deleted Trips page never shows deleted trips.**
    * **Evidence:** DT1 returns `[[],[]]` (2 phantom records).
    * **Where:** `DeletedTripsPage.tsx:23-26` calls `gettripdeletedmodaldata({})`, a per-expense modal query (`mainModel.js:6465-6470`).
    * **Fix:** A real endpoint listing `trip_created WHERE d_in=1` with deleted_by/at (columns to add).
12. **MEDIUM: Trip Reports is broken.**
    * **Evidence:** RP1. Filters are ignored, only rejected expenses are returned, and the columns reference missing fields.
    * **Where:** `TripReportsPage.tsx:26-29` against `mainModel.js:2973-3000`.
13. **LOW/MEDIUM: Trip Logs.**
    * The counts shape is wrong (LG1, `mainModel.js:12095-12097` vs `TripLogsPage.tsx:69-73`).
    * Updated/Deleted tabs read expense tables only (LG2, DT2), so Trip Creation edits and deletes are invisible.
    * `trip_edit_history` is not surfaced.
14. **LOW: text and date issues.**
    * Non-Latin text is lost (X1): `trip_created` is `latin1`, so Telugu names and remarks become `?`.
    * A missing `trip_date` is accepted (N1): NULL date plus today's number.
    * Records are sorted by day+seq, not date (L1c, `mainModel.js:5523`); use `ORDER BY trip_date DESC, c_number DESC`.
15. **LOW: legacy `/tripcreated type=add`.**
    * String-interpolated, stores `'undefined'`, bypasses dedupe, and returns HTTP 200 with body status 500 on error (`mainModel.js:5120-5133`, `mainCtrl.js:3212-3217`).
    * Unused by the React UI but exposed without auth. Remove it or harden it.
16. **LOW: Admin approval leaves gaps.**
    * It does not stamp `trip_created.admin_status_by_name` / `status_date`, so the view modal is always blank.
    * It does not lock edits (AP2) or approve the voucher.

## Gaps / inconsistencies

* **Server-side validation is absent.**
  * Running bus rows with no Driver 1 (B5).
  * Hired vans with no hirer or amount (B5b).
  * A van number on a bus row (B5c).
  * Rows without service_no_id, which bypass service and inactive checks (B5d).
  * Every rule lives only in `vanRowReady` / `incompleteRoutes`.
* **Future dates:** the UI blocks them (`max={today}`, line 746), but the backend happily accepts them. Decide whether advance trip sheets are allowed.
* **Bus opting seats** keep only "Opting Driver/Helper/Conductor". The actual person's name is only in free-text remarks (opt_*_name stays NULL). Van opting captures name + mobile, so the two tabs are inconsistent.
* **Hired buses** on the Bus grid have no amount or owner ledger capture (the van tab has them).
* **History tracks only 7 fields.** Paid To, remarks, booking_amount, opting names/mobile, line_code and the paid-direct flags change silently (E2, E9).
* **No delete or restore UI.** The `deleteTrip` service is unused, and trip deletion only happens through Trip Expenses' "delete expense", which removes the trip as a side effect (XD1). No `deleted_by` / `deleted_at` is stored on `trip_created`.
* **Records columns:**
  * The Bus tab's Amount / Debit / Credit columns are always empty until an expense voucher is filed (bus rows never carry `booking_amount`).
  * `up_down` is returned by the API but no column shows it.
  * Both tabs also carry Vehicle Type and Voucher columns beyond the specified list.
* **Voucher link:** the trip voucher uses the trip's T-number as its c_number, but the voucher date is the filing date, not the trip date (XV1). A T-number with more than 999 trips a day no longer matches `^T\d{9}$` and falls back to a V-number.
* **Trip Approvals** work on `trip_created.admin_status`, while Trip Logs and Reports count `tripexpenses_data.admin_status`. Two sources of truth for "approved".

## Cleanup confirmation

`cleanup.js` hard-deleted all ZZTEST3 data:

| What | Rows deleted |
|---|---|
| trip_created | 31 |
| trip_edit_history | 7 |
| tripexpenses_data | 1 |
| expensive_details | 2 |
| mainvoucher_t / mainvoucher_subt | 1 / 2 |
| ledgers | 2 |
| busses | 6 |
| drivers | 2 |
| helpers | 1 |
| staff | 1 |
| service numbers | 9 |

The final check query returned **0** for every table: trips, tripexpenses, expensive_details, mainvoucher_t, mainvoucher_subt, ledgers, busses, drivers, helpers, staff, driverone, history. Also 0 `mainvoucher_t` rows with `T2703%`, and no `T260915%` trip (the no-date row was removed).

Future-dated trips still in the DB (ids 146-161, `ZZTEST4-*`, T2704xx) belong to auditor #4 and were not touched. No non-test data was modified, and the backend was not restarted.



---

# Report D — Trip Expenses, Vouchers & Approval

Audit date 2026-09-15, branch `staging` working tree, local backend `https://localhost:8945/nodeapp`, DB `latest_samanvi_db`.
Method: read `TripExpensesPage.tsx` (all 2283 lines), `AdminApprovalsPage.tsx`, the expense and voucher controllers and models. Then ran the real HTTP API with payloads built by `pagemodel.js`. That file copies the page's logic line for line: openAdd/openEdit seeding, the "Pay X" ticks, the Paid To leftover, debit derivation, `validate()`, `mergeSameLedgerRows`, and `buildAddPayload`/`buildEditPayload`/`buildUpdateTripPayload`. Results were checked in MariaDB.
Scripts: `scratchpad/audit/s4/` (`lib.js`, `pagemodel.js`, `fixtures.js`, `trips.js`, `run1.js`, `run2.js`, `run3.js`, `cleanup.js`). Raw results are in `out1.json`, `out2.json` and `out3.json`.
Fixtures (all tagged ZZTEST4):
- People, created through the API so they got auto-ledgers: 4 drivers, 1 helper, 2 staff. One driver's ledger was then removed on purpose.
- 1 owner ledger, created through `/addledgerdata`.
- 3 buses, 1 own van and 1 hired van.
- 3 service numbers:
  - ST1: betas 500 / 450 / 300 / 250, OPT driver 700, OPT helper 400, parking 150
  - ST2: decimal betas 525.5 / 410.25 / 300.75, conductor 0, parking 99.5
  - STV1: a van service
- 16 trips on 2027-04-01..15, created with `/bulkcreatetrips`.

Totals: **77 automated checks: 52 passed, 25 failed.** Some passing checks record behaviour that is itself a gap; the table labels those GAP.

---

## Flow summary

1. **Trip Creation** (`/bulkcreatetrips`) writes `trip_created` with a T-number `T<yymmdd><nnn>` (for example `T270401001`), `status=0` (not filed) and `admin_status=0`. No voucher is posted at creation.
2. **Trip Expenses list:**
   - With no date filter it calls `/getexpenses`, which returns every live trip with `admin_status != 1`.
   - With a date filter it calls `/getexpensesfiltere`, which returns every live trip in the range, approved ones included.
   - Tabs Bus/Van split on `vehicle_type`. Tabs All/Not Filed/Filed split on `trip_created.status`.
3. **Open a Not Filed trip (openAdd):**
   - It fetches `/getbeta` (the service-number rates) and `/gethaltbeta`.
   - Each **occupied** seat is seeded with its running beta. On a `Halt` trip every seat gets the company-wide Halt Beta (2500 locally) instead.
   - An **opting** seat (name "Opting …", no id) also gets the OPT Driver/Helper salary, except on a halted trip.
   - Parking is seeded from `driverone.parkingAmount`.
4. **Debit side** (worked out automatically, one row per category):
   - **Betas** gets every seat's beta.
   - **Salaries** gets the opting premiums.
   - **Parking** gets the parking amount.
   - Van extras:
     - Hired van: Hire vehicle charges is debited with `booking_amount`.
     - Own van with an opting driver: Salaries is debited with `booking_amount`.
5. **Credit side:**
   - Every ticked "Pay X" credits that person's own ledger (Payables > Drivers/Helpers/Staff) with their beta.
   - An opting seat is paid through the shared **Opting Driver / Opting Helper / Opting Conductor** ledger, for beta plus opting salary.
   - Everything not ticked, plus parking, becomes the **Paid To** row on the Paid To person's ledger.
   - If a ticked person is also Paid To, the two rows are merged into one credit on post.
   - Van extras:
     - Hired van: the owner ledger (`busses.owner_ledger_id`) is credited.
     - Own van with an opting driver: Opting Driver is credited.
6. **Nothing to post:** if nobody is ticked and there is no Paid To row, the page shows "No voucher". Submit then files the expense with no ledger lines.
7. **Submit** makes two separate requests, with no transaction:
   1. `/tripcreated` (`type:'edit'`) writes the crew back to `trip_created` and cascades into `tripexpenses_data` and `expensive_details`.
   2. `/addexpensesdetails`:
      - inserts `tripexpenses_data`, the debit and credit `expensive_details` rows, and sets `trip_created.status=1, grantotal, total_amount`;
      - then runs `createTripVoucherMdl`, which writes `mainvoucher_t` and `mainvoucher_subt` (Journal, `source_type='trip'`, `c_number` = trip T-number, `status=0`);
      - then sets `trip_created.voucher_number`.
8. **Edit** (`/updateexpensesdetails`):
   - Old `tripexpenses_data` and `expensive_details` rows are set to `d_in=2` and new ones are inserted.
   - The voucher lines are replaced: old `_subt` rows go to `d_in=1`, new lines are inserted and the header total is updated.
   - Re-filing with no ledgers voids the voucher.
9. **Approval** (the Approvals select on the page, or Admin Approvals → `/updatetripadminstatus`):
   - Sets `admin_status` on `tripexpenses_data`, `expensive_details` and `trip_created`.
   - It does **not** touch `mainvoucher_t` or `mainvoucher_subt`.
   - Ledger Wise, Trial Balance and similar reports skip `expensive_details` for any trip that has a voucher. They read `mainvoucher_subt` with `status='1'`, which is set only by **Voucher Approvals** (`/updatevoucherentrystatus`).
10. **Delete** (`/deleteexpense`) soft-deletes `tripexpenses_data`, `expensive_details` **and the trip row itself**. The voucher is left in place.

### Worked example: T1, a running bus trip on ST1

Crew: Driver1 A, Driver2 B, Helper HA, Conductor CA. Paid To = Driver A. Nobody ticked.

| Side | Ledger | Amount |
|---|---|---|
| Dr | Betas (207) | 500 + 450 + 300 + 250 = **1500** |
| Dr | Parking (206) | **150** |
| Cr | ZZTEST4 DRV A (Payables > Drivers) | Paid To leftover 1500 + 150 = **1650** |

Voucher `T270401001` (Journal), Dr 1650 = Cr 1650. `trip_created.grantotal = 1650`.

If D1, D2 and Helper are ticked and Paid To is staff X (T2), the credits become A 500, B 450, HA 300 and X 400 (conductor 250 + parking 150).

Opting example (T4): D1, D2 and Helper all opting.
- Debit: Betas 1250, Salaries 700 + 700 + 400 = 1800, Parking 150.
- Credit: Opting Driver (500 + 700) + (450 + 700) = 2350 (one row for both seats), Paid To X 300 + 400 + 150 = 850.

---

## Scenario results

| ID | Scenario | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| L1 | Driver list has ledger ids | `/getalldrivers` | ledger_id present | 477 for DRV A | PASS |
| L2 | Staff list has ledger ids | `/gethelper` Staff | ledger_id | present | PASS |
| L3 | Helper list has ledger ids | `/gethelper` Helper | ledger_id | present | PASS |
| L4 | Hired van master | `/getbussesdata` | bus_category=hire, owner_ledger_id | as expected | PASS |
| L5 | Filtered list before filing | `/getexpensesfiltere` 2027-04-01..15 | 16 rows | 16 | PASS |
| L6 | Bus/Van tab split | vehicle_type | 3 van trips | 3 | PASS |
| L7 | Not Filed tab | status before filing | all 0 | all 0 | PASS |
| L8 | List after filing | `/getexpensesfiltere` | 1 row per trip | **42 rows for 16 trips**: T2 ×8, T4 ×6, T10 ×4, T3 ×4, others ×2 | BUG |
| L9 | Default list after filing | `/getexpenses` | 1 row per trip | 42 rows / 16 trips | BUG |
| S01 | Bus Running, full crew, Paid To = Driver1, no ticks | openAdd seed | Dr Betas 1500 + Parking 150; Cr A 1650 | as expected | PASS |
| S02 | Submit | `/tripcreated` edit + `/addexpensesdetails` | 200/200 | 200/200 | PASS |
| S03 | T-number voucher numbering | DB | voucher c_number = trip T-number, Journal, source trip | `T270401001`, Journal, trip; `trip_created.voucher_number` set | PASS |
| S04 | Balance and per-ledger postings | DB | Dr=Cr=1650; Betas 1500, Parking 150, A 1650 | exact | PASS |
| S05 | Trip header | DB | status 1, grantotal 1650 | exact | PASS |
| S06 | Expense rows | DB | 3 expensive_details rows with ledger_id, 1 tripexpenses_data row | exact | PASS |
| S07 | Voucher lines carry parent_grp_level | DB | set, as manual vouchers do | NULL on every trip voucher line | GAP |
| S08 | Voucher date | DB | trip date 2027-04-01 | **2026-09-15 (filing date)** | BUG |
| S09 | Full Trip; tick D1, D2, Helper; Paid To = other staff X | submit | A 500, B 450, HA 300, X 400; Dr=Cr=1650 | exact | PASS |
| S10 | Halt trip, D1 + D2 only | openAdd | each seat at Halt Beta 2500; no Salaries | Betas 5000, no Salaries | PASS |
| S11 | Halt trip parking | openAdd | parking arguably not due when the service did not run | Parking 150 still seeded and posted | GAP |
| S12 | Halt voucher | DB | balanced; A 2500, B 2650 | exact, 5150/5150 | PASS |
| S13 | Opting D1, D2, Helper — debit side | DB | Betas 1250, Salaries 1800, Parking 150 | exact | PASS |
| S14 | Opting — credit side | DB | Opting Driver 2350 on one row; X 850 | exact | PASS |
| S15 | No Paid To, nobody ticked | submit | expense filed, no voucher | status 1, no voucher, no expensive_details | PASS |
| S16 | Decimal service, no voucher | DB | grantotal 1236.5 + 99.5 = 1336 | 1336 | PASS |
| S17 | Decimal amounts in a voucher | DB | Betas 1236.5, Parking 99.5, A 1336 | exact | PASS |
| S18 | Paid To unticked, only D1 ticked | validate | blocked as unbalanced | "Debit (1650) and Credit (500) totals must match" | PASS |
| S19 | Manual leftover placement (Paid To off, remainder typed on X) | submit | posted, balanced | A 500, X 1150, 1650/1650 | PASS |
| S20 | Tick a driver who has no ledger | tick D1 | toast, no row added | "No ledger found…", no row | PASS |
| S21 | Paid To (and D1) has no ledger | open, nothing tickable, submit | page should force someone to be paid | page quietly switches to **No voucher**; 1100 of crew pay filed with nothing posted | GAP |
| S22 | Own van, registered driver | submit | no beta, no voucher, grantotal 0 | exact | PASS |
| S23 | Own van, opting driver, booking 800 | submit | Dr Salaries 800 / Cr Opting Driver 800; no hire line | exact | PASS |
| S24 | Hired van, booking 1200 | submit | Dr Hire vehicle charges 1200 / Cr owner ledger 1200 | exact | PASS |
| S25 | Double submit (second POST of the same add) | POST twice | second refused | **accepted**: 2 tripexpenses_data rows, **2 voucher headers with the same T-number**, Dr/Cr 2400 | BUG |
| S26 | Remarks with an apostrophe ("driver's note") | submit | files | `/tripcreated` 500 and `/addexpensesdetails` 500; nothing filed, but trip remarks and crew already overwritten | BUG |
| S27 | Unbalanced payload sent to the server | Cr amount = 1 | server refuses | **accepted**: voucher Dr 1650 / Cr 1 | BUG |
| S28 | No JWT on `/addexpensesdetails` | no Authorization header | 401 | **200, expense and voucher posted**; unauthenticated `/getexpensesfiltere` also returns data | BUG (security) |
| E00 | Driver with an empty-string nickname (6 active real drivers) | page picks `nickname ?? driver_name` | real name | `''`. Filing blanks `trip_created.driver1_name`/`driver2_name`/`paid_to_name` (seen on every test trip). Page hides the "Pay X" tick when the name is empty | BUG |
| E01 | Edit modal data | `/getmodaldata` sudId 3 | ledger rows + crew ledger ids | 6 rows, driver1/2 ledger ids | PASS |
| E02 | Edit: D1 beta 500→600, D2 B→C | re-derive | Dr 1600 + 150; Cr A 600, C 450, HA 300, X 400 | exact | PASS |
| E03 | Edit submit | two calls | 200/200 | 200/200 | PASS |
| E04 | Edit: tripexpenses_data | DB | 1 active row, old one d_in=2 | exact | PASS |
| E05 | Edit: expensive_details | DB | 6 active, 6 superseded | exact | PASS |
| E06 | Edit: voucher lines replaced, not duplicated | DB | 1 header, 6 active lines, 1750/1750 | exact | PASS |
| E07 | Edit: crew change moves the credit | DB | B 0, C 450 | exact | PASS |
| E08 | Edit: headers updated | DB | trip driver2 = C, grantotal 1750, voucher total 1750 | exact | PASS |
| E09 | Edit: replacement lines | DB | lastinsert_id / c_id kept | `lastinsert_id NULL`, `c_id 0` on every replacement line | GAP |
| E10 | Edit history | trip_edit_history | crew change logged | logged, plus a false "Status: 'Full Trip' -> '—'" and "Driver 1: 'A' -> '—'" on every save | BUG (minor) |
| A01 | Ledger Wise before approval | `/getsearchdata` | pending voucher hidden | hidden | PASS |
| A02 | Approve T1 (Approvals select / Admin Approvals) | `/updatetripadminstatus` 1 | admin_status 1 on te / ed / trip | exact | PASS |
| A03 | Approval reaches the voucher | DB | mainvoucher_t/_subt status 1 | **stays 0** | BUG |
| A04 | Approved trip in Ledger Wise | `/getsearchdata` for A's ledger | shown | not shown for either the trip date or the filing date | BUG |
| A05 | Day Book date | `/getdaybookreports` 2027-04-01..15 | trip vouchers under the trip date | 0 rows; they appear under 2026-09-15 | BUG |
| A06 | Day Book only approved | Day Book today | pending T2 excluded | pending T2 (6 lines) shown; Day Book has no status filter | GAP |
| A07 | Second approval in Voucher Approvals | `/updatevoucherentrystatus` | — | only now T1 reaches Ledger Wise, and under the filing date, not the trip date | BUG (double approval) |
| A08 | Approved trip visibility | default vs filtered list | consistent | default list hides it (`admin_status != '1'`); filtered list shows it (twice) | GAP |
| A09 | Edit after approval (API) | `/updateexpensesdetails` on approved T1 | refused | **200**; amounts changed to 2149 | BUG (UI blocks via canActOnExpense) |
| A10 | Approval state after that edit | DB | consistent | tripexpenses_data admin_status reset to 0 while trip_created stays 1; voucher header stays status 1 but lines are status 0, so it silently drops out of Ledger Wise | BUG |
| R01 | Reject T3 | `/updatetripadminstatus` 2 | voucher withdrawn | voucher still active and pending in Voucher Approvals; could be approved and posted | BUG |
| R02 | Edit/delete a rejected expense in the UI | canActOnExpense | blocked | blocked | PASS |
| R03 | Reject → On Review → edit re-file | status 0 then `/updateexpensesdetails` | 1 voucher, balanced | 5250/5250, 1 header, status 0 | PASS |
| R04 | Re-filed row admin_status | DB | 0 | 0 | PASS |
| D01 | Delete expense T6 | `/deleteexpense` | te / ed soft-deleted | d_in=1 | PASS |
| D02 | Trip after delete | DB | back to **Not Filed** | **trip_created.d_in=1**: the trip itself is deleted and vanishes from every list; status still 1 | BUG |
| D03 | Voucher after delete | DB | voucher lines removed | header and 4 lines still active; still listed in Voucher Approvals (`T270407001`) | BUG |
| D04 | Delete an approved expense (API) | approve T5b, then delete | refused | 200; trip deleted, voucher orphaned (UI blocks) | BUG |
| P01 | Admin Approvals Pending tab | `/gettripceated1` | only filed trips | unfiled trips listed as Pending with Approve/Reject | BUG |
| P02 | Approve an unfiled trip | `/updatetripadminstatus` on T12 | refused | accepted: admin_status 1, status 0; the trip disappears from the default Trip Expenses list and can only be filed from the date-filtered view | BUG |
| P03 | Admin Approvals rows | `/gettripceated1` | 1 row per trip | T2 returned **8 times** (voucher JOIN) | BUG |
| T01 | Terminated driver, reopen | driver d_in=1, `/getmodaldata` | driver ledger id still resolves | 479 resolved; driver not in the live list | PASS |
| T02 | Terminated driver who is also Paid To, edit parking | re-derive | balanced | Paid To ledger comes from the live list only, so the leftover is dropped: Dr 625.5 vs Cr 525.5, Submit blocked | BUG |
| V01 | Conductor present, conductor beta 0 on the service | validate | must type a beta | blocked with a message | PASS |
| V02 | Halt row from the trip sheet with no bus | validate | fileable | "Bus Number is required"; a halted service without a bus cannot be filed until a bus is picked | GAP |
| V03 | Opting seat on a service with no OPT salary | validate | blocked | blocked | PASS |
| V04 | Float rounding 100.1 + 0.2 | balance check | balanced | 100.3 = 100.3 | PASS |
| V05 | Crew member who is also Paid To | merge | one credit row | A 1100 on one row | PASS |
| V06 | Same ledger on both sides | validate | blocked | blocked | PASS |
| C01 | Double click on Submit | Button `disabled={submitting}` | one request | UI guard only; server not idempotent (see S25) | CODE REVIEW |
| C02 | Submit is two requests | handleSubmit → updateTrip then add | atomic | if add fails (S26), the trip crew/remarks are already changed | CODE REVIEW / BUG |
| C03 | Voucher failure after the expense saves | ctrl 2316-2319 | error surfaced | logged and swallowed; user sees success with no voucher | CODE REVIEW / GAP |
| C04 | Duplicate trip creation | bulk create same date and service twice | skipped | skipped=1 | PASS |
| C05 | Opting ledgers | DB | Opting Driver/Helper/Conductor under Payables | 413 / 411 / 412 present; stray "Opting" (410) also under Drivers | CODE REVIEW |
| C06 | Voucher type for trip vouchers | createTripVoucherMdl | Journal | Journal (hard-coded) | PASS |

---

## Accounting checks

Voucher `c_number` is the trip T-number in every case. "Final" means state after all scenarios, before cleanup.

| Trip | Case | Dr total | Cr total | Per-ledger postings | Notes |
|---|---|---|---|---|---|
| T270401001 (T1) | Running, Paid To D1 | 1650 → **2149** | 1650 → 2149 | Dr Betas 1500 (→1999), Parking 150; Cr DRV A 1650 (→2149) | Approved, then edited over the API: header status 1, lines status 0 |
| T270402001 (T2) | Full Trip, 3 ticks, Paid To staff | 1650 → 1750 | 1650 → 1750 | Dr Betas 1600, Parking 150; Cr A 600, C 450, HLP A 300, PAY X 400 | Edit replaced lines (6 active, 6 voided) |
| T270403001 (T3) | Halt, tick D1 | 5150 → 5250 | 5150 → 5250 | Dr Betas 5000 (→5100), Parking 150; Cr A 2500, B 2650 (→2750) | Rejected, then re-filed |
| T270404001 (T4) | Opting D1/D2/Helper | 3200 | 3200 | Dr Betas 1250, Salaries 1800, Parking 150; Cr Opting Driver 2350, PAY X 850 | Opting Helper correctly left in Paid To |
| T270405001 (T5) | No Paid To, no ticks | 0 | 0 | none | grantotal 1336, no voucher |
| T270406001 (T5b) | Decimals, Paid To D1 | 1336 | 1336 | Dr Betas 1236.5, Parking 99.5; Cr A 1336 | Approved then deleted: **trip d_in=1, voucher still active** |
| T270407001 (T6) | Manual leftover | 1650 | 1650 | Dr Betas 1500, Parking 150; Cr A 500, PAY X 1150 | Deleted: **orphan voucher** |
| T270408001 (T7) | Paid To without ledger | 0 | 0 | none | grantotal 1100 never posted |
| T270409001 (T8) | Own van, registered driver | 0 | 0 | none | grantotal 0 |
| T270410001 (T9) | Own van, opting driver 800 | 800 | 800 | Dr Salaries 800; Cr Opting Driver 800 | correct |
| T270411001 (T10) | Hired van 1200 | **2400** | **2400** | Dr Hire vehicle charges 1200 ×2; Cr ZZTEST4 Van Owner 1200 ×2 | Double submit: 2 headers with the same number |
| T270412001 (T12) | Unfiled | — | — | none | admin_status 1 with status 0 |
| T270413001 (T13) | Apostrophe in remarks | — | — | none | filing failed with 500 |
| T270414001 (T14) | Unbalanced API payload | 1650 | **1** | Dr Betas 1500, Parking 150; Cr A 1 | Server accepted |
| T270415001 (T15) | No JWT | 1650 | 1650 | Dr Betas 1500, Parking 150; Cr A 1650 | Posted without authentication |
| T270415002 (T16) | ST2, D1 = C = Paid To | 625 | 625 | Dr Betas 525.5, Parking 99.5; Cr DRV C 625 | Used for the terminated-driver test |

Summary:
- **Balanced by construction when filed through the page:** every page-built voucher had Dr = Cr.
- **Person ledgers credited with exactly beta + opting:** correct in every case.
- **Expense ledgers:** Betas, Salaries, Parking and Hire vehicle charges were debited correctly.
- **Approval does not reach the voucher lines.**
- **Trip vouchers are dated on the filing date, not the trip date.**
- **Posted twice:** once in T10 (double submit).
- **Orphan vouchers left live:** two (T5b, T6).
- **Unbalanced voucher accepted:** one (T14).

---

## Bugs & risks

1. **HIGH: Approving a trip never approves its voucher, so approved trips never reach the ledger reports.**
   - Evidence: A03 and A04 (voucher `status` stays 0). A07: a separate approval in Voucher Approvals was needed.
   - Where: `samanviBackend/models/mainModel.js:6265-6274` (`updatetripadminstatusMdl` updates only `tripexpenses_data`, `expensive_details` and `trip_created`). Ledger Wise and Trial Balance only count `mainvoucher_subt.status='1'` for trips that have a voucher (`mainModel.js:24-29` `tripRowsWithoutVoucher`, `:6021`, `getsearchdataMdl` `:8491`).
   - Impact: approvers must approve twice on two screens. A trip can be Approved while its voucher is pending, or Rejected while its voucher is approved.
   - Fix: in `updatetripadminstatusMdl` also run `UPDATE mainvoucher_t / mainvoucher_subt SET status=? WHERE c_number=(trip voucher_number)`. Alternatively, hide `source_type='trip'` vouchers from Voucher Approvals.

2. **HIGH: Deleting an expense deletes the trip and leaves its voucher live.**
   - Evidence: D02, D03, D04. After the delete, `trip_created.d_in=1` with status still 1, and the `T270407001` header and lines stay active and still show in `/getvoucherentrydata`.
   - Where: `mainModel.js:3440-3447` (`deleteexpenseMdl` sets `trip_created.d_in='1'` and never touches `mainvoucher_*` or `voucher_number`).
   - Impact: the trip vanishes instead of going back to Not Filed. The orphan voucher can still be approved and posted to Payables.
   - Fix:
     - Set `trip_created.status=0, grantotal=0, total_amount=0, voucher_number=NULL` and do not set `d_in`.
     - Call `voidTripVoucherMdl(voucher_number)`.
     - Refuse when `admin_status=1`.

3. **HIGH: No server-side integrity checks on filing (unbalanced, unauthenticated, not idempotent).**
   - Evidence: S27 (Dr 1650 / Cr 1 accepted), S28 (no JWT accepted), S25 (double POST gives 2 expense rows and 2 voucher headers with the same T-number, posting 2400).
   - Where:
     - `routes/routes.js:156-162, 222-223` have no `verifyToken` on `/getexpenses`, `/addexpensesdetails`, `/updateexpensesdetails`, `/deleteexpense`, `/getexpensesfiltere`, `/tripcreated`, `/bulkcreatetrips`.
     - `controllers/mainCtrl.js:2225-2332` has no balance check, no "already filed" guard and no transaction.
     - `createTripVoucherMdl` at `mainModel.js:14583` has no duplicate check.
   - Fix:
     - Add `verifyToken`.
     - Reject when `trip_created.status=1` on add.
     - Validate `round(sum Dr,2) === round(sum Cr,2)`.
     - Wrap the chain in a transaction.
     - Refuse to create a voucher when an active header with that `c_number` exists.

4. **HIGH: Expense list and Admin Approvals return duplicate rows once a voucher exists.**
   - Evidence: L8, L9 (42 rows for 16 trips; T2 ×8), P03.
   - Where: `mainModel.js:2952-2953` and `:3422-3423` do `LEFT JOIN mainvoucher_subt vd … 'Debit Account'` and `LEFT JOIN … vc … 'Credit Account'`, which returns every debit line times every credit line. `gettripceated1Mdl` (`:5480`) uses the same pattern.
   - Impact: every filed trip shows up N×M times. Tab counts and totals are inflated, and Approve buttons are duplicated.
   - Fix: take one row per voucher (a `MIN(id)` subquery or `GROUP BY t.id`), or drop the join; the hire notice only needs `voucher_number`.

5. **HIGH: Drivers with an empty-string nickname are blanked on filing and cannot be ticked.**
   - Evidence: E00 and the DB dump. After filing, `trip_created.driver1_name`, `driver2_name` and `paid_to_name` were `''` on all test trips. 6 active real drivers and 2 staff have `nickname=''`.
   - Where:
     - SQL `COALESCE(d1.nickname, d1.driver_name, …)` does not skip `''` (`mainModel.js:2921-2928`, `:3392-3400`, `:6419-6431`).
     - The page uses `d?.nickname ?? d?.driver_name` (`TripExpensesPage.tsx:1768, 1772, 1786, 1790, 1812, 1816`).
     - `payTick` returns null when the name is empty (`:803-804`).
     - The page's `/tripcreated` edit then writes the blank name back.
   - Impact: crew names disappear from trips, Trip Records and history. The "Pay X" checkbox is missing for those drivers, so their pay can only go through Paid To.
   - Fix: `COALESCE(NULLIF(nickname,''), driver_name, …)`, and use `||` instead of `??` in the page.

6. **MEDIUM: Trip vouchers are dated on the filing date, not the trip date.**
   - Evidence: S08, A05, A07.
   - Where: `mainModel.js:14586, 14607` (`voucherdate = today`) and `updateTripVoucherMdl :14671`.
   - Impact: Ledger Wise, Day Book and period reports put trip costs in the month the expense was keyed, not the month the trip ran. That contradicts the comment at `:6028-6034` and the `expensive_details` rows, which use `trip_date`.
   - Fix: pass `trip_date` into `createTripVoucherMdl` and `updateTripVoucherMdl` and use it as `voucherdate` and `valueDate`.

7. **MEDIUM: Rejecting a trip leaves its voucher pending.**
   - Evidence: R01.
   - Where: `mainModel.js:6265`.
   - Impact: someone in Voucher Approvals can still approve and post a rejected expense.
   - Fix: void or reject the voucher on reject, and restore it on re-file (re-file already recreates or updates it).

8. **MEDIUM: Server lets approved or rejected expenses be edited or deleted, and editing corrupts approval state.**
   - Evidence: A09, A10, D04.
   - Where:
     - `updateexpensesdetailsCtrl` at `mainCtrl.js:2334` has no lock.
     - `updateTripVoucherMdl` at `mainModel.js:14668-14708` re-inserts lines with `status` defaulting to 0 while the header keeps `status=1`.
     - The new `tripexpenses_data` row gets `admin_status` 0 while `trip_created` stays 1.
   - Impact: bypassing the UI (the UI blocks this through `canActOnExpense`, `TripExpensesPage.tsx:158`) leaves an "approved" trip whose ledger lines are invisible. This is the same class of issue already fixed for fuel and laundry (400 LOCKED).
   - Fix: return 400 when `trip_created.admin_status IN (1,2)` in update and delete.

9. **MEDIUM: A single apostrophe breaks filing, and the query is injectable.**
   - Evidence: S26 (both calls 500; remarks and crew already written).
   - Where:
     - `adddiagnoptntDtsmmdl` / `updateadddiagnoptntDtsmmdl` (`mainModel.js:5023-5054`), `updatetripcreated` (`:5412-5447`), `updatefunction` (`:3350`), `deleteexpenseMdl`, `updatetripadminstatusMdl` and `getexpensesfiltere` (`:3425`) all interpolate raw strings.
   - Fix: use parameterised queries, as `tripcreated` edit already does with `esc()`.

10. **MEDIUM: Admin Approvals can approve trips that were never filed.**
    - Evidence: P01, P02.
    - Where: `AdminApprovalsPage.tsx:137-148` filters only on `admin_status`; `updatetripadminstatusMdl` has no `status=1` guard.
    - Impact: an unfiled trip becomes "Approved" and disappears from the default Trip Expenses list (`getexpensesMdl` `admin_status != '1'`, `mainModel.js:2956`), so its crew pay is never filed.
    - Fix: list only `status=1` in Pending, and refuse approval when `status=0`.

11. **MEDIUM: Paid To without a ledger (never created, or a terminated person) quietly drops the crew pay.**
    - Evidence: S21 (1100 filed with no voucher); T02.
    - Where:
      - `noVoucher` at `TripExpensesPage.tsx:1295`.
      - `paidToLedgerId` and `savedPaidToLedgerId` look only in the active drivers/helpers/staff lists (`:551-556`, `:1174-1179`); terminated people are filtered out server-side.
    - Fix:
      - Block Submit when crew pay is greater than 0 and not placed (require an explicit "file without voucher" confirmation).
      - Resolve Paid To's ledger from the saved expense row (LEFT JOIN with no `d_in` filter, as `driverX_ledger_id` already does).

12. **LOW: Non-atomic two-step submit.** `handleSubmit` calls `/tripcreated` first, then add or edit (`TripExpensesPage.tsx:1432-1441`). A failed second step leaves the trip already changed (seen in S26).

13. **LOW: Voucher creation errors are swallowed.** `mainCtrl.js:2316-2319, 2427, 2437-2439` return 200 "Successfully added" even when no voucher was posted.

14. **LOW: False edit-history entries.** Every expense save logs `Status: '<x>' -> '—'` because `trip_run_status` and `hirer_name` are diffed but not sent (`mainModel.js:5139, 5186-5191`).

15. **LOW: Replacement voucher lines lose `lastinsert_id` and `c_id`, and trip voucher lines never carry `parent_grp_level`** (E09, S07; `mainModel.js:14617-14620, 14689-14692`). Nothing in the current reports joins on these fields, but manual vouchers set them.

---

## Gaps / inconsistencies

- **Halt trips still charge parking** (S11). `openAdd` seeds `parking_amt` from the rate on a halted service (`TripExpensesPage.tsx:922`). It needs a business decision.
- **Halt rows saved without a bus cannot be filed** (V02). This is legitimate per Trip Creation, but the modal requires a bus.
- **Day Book lists pending (unapproved) trip vouchers, but Ledger Wise and Trial Balance do not** (A06).
- **The default Trip Expenses list hides approved trips; the date-filtered list shows them** with a live Approvals select (A08). An approved row can be set back to On Review from there, which then re-enables edit and delete.
- **Approvals select has no confirmation or reason** for Reject, unlike Voucher Approvals (`rejection_reason`).
- **Two approval columns exist** (Trip Expenses select and Admin Approvals page) plus Voucher Approvals, and none of them is synchronised with the others.
- **Stray "Opting" ledger** (id 410) still sits under Payables > Drivers next to "Opting Driver" (413).
- **Minor copy bug:** the Driver2 opting option label uses `optingNameForSeat('driver1')` (`TripExpensesPage.tsx:1789`). It is harmless because both resolve to "Opting Driver".
- **`firstOfMonth` and the `qc` query client are unused** in TripExpensesPage.
- **Date inputs are capped at today** (`max={today}`), so future-dated trips (like the test trips) cannot be filtered by date in the UI.
- **Pre-existing DB issue:** table `tyre_master` "doesn't exist in engine" (seen during the leftover scan). Not caused by this audit.

---

## Cleanup confirmation

Test data was removed by `cleanup.js --scan`. Hard-deleted row counts:

| Table | Rows deleted |
|---|---|
| `expensive_details` | 53 |
| `tripexpenses_data` | 18 |
| `mainvoucher_subt` | 53 |
| `mainvoucher_t` | 12 |
| `mainvoucher_audit` | 1 |
| `trip_edit_history` | 16 |
| `trip_created` | 16 |
| person and owner ledgers in `mainmasterssubchildtwo` | 7 (the NOLEDGER driver's ledger was already deleted during fixture setup) |
| `driver_register` | 4 |
| `helper_register` | 1 |
| `staff_register` | 2 |
| `busses` | 5 |
| `driverone` | 3 |

Post-cleanup checks:
- A scan of every text column in every base table for `%ZZTEST4%` found **0 leftovers**. `tyre_master` could not be read (engine error) and was skipped.
- `T2704%` rows in `trip_created`, `mainvoucher_t`, `mainvoucher_subt`, `tripexpenses_data` and `expensive_details`: all **0**.
- `mainmasterssubchildtwo` ids 477-484: 0 rows.
- `mainvoucher_audit` and `trip_edit_history` for `T2704%`: 0.

No app source code was modified, the backend was not restarted, and nothing was staged or committed. The driver `d_in` was set to 1 temporarily for the terminated-driver test, then restored before deletion.



---

# Report E — Ledgers, Payments & Payables

Audit date 2026-09-15, run against the live local backend (https://localhost:8945/nodeapp) and `latest_samanvi_db`. I sent the same payloads the pages send (GroupPage, TripExpenses quick-add shape, StaffPage driver add, VoucherEntryPage, VoucherApprovalsPage edit/status, PayablesViewPage submit) and checked the results in the DB. I rebuilt each report's math in the harness from the page code: Ledger Wise running balance, Payables View `displayAmt`, Trial Balance keyed by name, Balance Sheet keyed by `ledger_id`.
Scripts: `scratchpad/audit/s5/` (`lib.js`, `p1_setup.js`…`p6_editsettled.js`, `cleanup.js`, `state.json`). I didn't change any app code.

## Flow summary (step by step, with a worked example of a driver payable from posting to zero)

**How the pieces connect**

1. **Ledger master.** Ledgers are rows in `mainmasterssubchildtwo`. GroupPage, Balance Sheet, P&L, Trip Expenses "+ New Ledger" and BusNoPage all POST `/addledgerdata` (raw JSON). `addledgerdataMdl` refuses a name that already exists among active ledgers, anywhere in the tree, and ignores the `amount` field, so there are no opening balances. Groups use `/addchilddata` (level 4) and `/addInfiniteGroup`. Rename, delete and move are `/updateLedgerName`, `/deleteLedger` and `/moveLedger`, all string-interpolated SQL.
2. **Person ledgers.** `/adddriverregister` calls `ensurePersonLedger("Drivers", …)`. That creates a ledger under EQUITIES AND LIABILITIES > 3) CURRENT LIABILITIES > Payables > Drivers and writes `driver_register.ledger_id`. If the name collides with an existing ledger, the new one becomes `"<name> (Dxxxx)"`. Editing the driver renames the ledger. Deleting the driver leaves the ledger alone.
3. **Voucher Entry.** `/submitvoucherentrydata` (encrypted) writes one `mainvoucher_t` header (status 0) and one `mainvoucher_subt` row per line. Each line stores `ledger_id` plus a *copy* of the ledger name (`expensives`). The number is `V` + YYMMDD of the voucher date + (COUNT of existing `V<date>%` headers + 1). The server doesn't validate balance, amounts, ledgers or voucher type.
4. **Approval.** `/updatevoucherentrystatus` sets `status` to 1 (approve), 2 (reject) or 0 (reopen) on the header and every sub row with that c_number. On reject it also calls `unsettlePayablesRowsMdl`. There are no state-transition rules and no `d_in` filter.
5. **Payables View (settlement flow).** This is a different posting path. `/submitpayablesvoucherentry` writes a Payment voucher (`is_payable=1`). At **submit time**, not at approval, it stamps the selected liability rows with `payment/balance/isedited/payables_settled_by` and logs `payables_payment_history`. The page lists a ledger's approved rows where `isedited ∈ {0,1}` and the type isn't `Payment`, and shows each credit row's amount (or its balance, if partly settled) as outstanding.
6. **Reports.**
   - **Ledger Wise:** `/getsearchdata` with approved rows only, dated by `voucherdate`, with an opening balance from before the From date.
   - **Balance Sheet, P&L and Group Wise:** `/Selectdatagetfinaltranscationsreport`, approved rows only, `voucherdate` within the **selected FY only**, and joined to *active* ledgers.
   - **Trial Balance:** `/gettrialbalancereports`, approved rows only, but filtered on **`DATE(i_ts)` (entry timestamp)** and grouped by the stored ledger **name**.
   - **Day Book:** `/getdaybookreports`, **no status filter**.

**Worked example (all over HTTP, then checked in the DB)**

| Step | Action | Ledger Wise "ZZTEST5 Driver A" (FY 27-28) | Payables View |
|---|---|---|---|
| 0 | StaffPage add driver "ZZTEST5 Driver A" | Ledger 493 auto-created under Payables > Drivers | – |
| 1 | J0 Journal 2027-03-25 (prev FY): Dr ZZTEST5 Driver Bata Exp 2000 / Cr Driver A 2000, approved | opening 2000 Cr | 2000 |
| 2 | J1 Journal 2027-05-01: Dr Exp 10000 / Cr Driver A 10000, **pending** (V270501001) | 2000 Cr (pending excluded ✔) | 2000 (excluded ✔) |
| 3 | Approve J1 | **12000 Cr** ✔ | 12000 ✔ |
| 4 | P1 Payment 2027-05-05: Dr Driver A 4000 / Cr ZZTEST5 Cash, pending | 12000 Cr ✔ | 12000 |
| 5 | Approve P1 | **8000 Cr** ✔ | **12000 ✘** (a manual payment never reaches Payables View) |
| 6 | P2 Payment 2027-05-10 8000, approved | **0** ✔ | **12000 ✘** (driver still looks owed) |
| 7 | Balance Sheet FY 27-28 for the same ledger | – | **2000 Dr ✘** (prev-FY liability not carried; ledger shows a debit) |
| 8 | Trial Balance FY 27-28 | – | **no rows ✘**. All 2027 vouchers sit in FY 26-27 because TB filters on the entry timestamp (2026-09-15) |

## Scenario results

| ID | Scenario | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| L1 | Create ledgers from GroupPage | `/addledgerdata` ×7 (Cash, Bank under Cash/Banks; Exp and Income at level 2; Hire Owner under Payables>Hire Vehicles; Hirer under Receivables>Hirers; "Driver B") | 200 + insertId | All 200 (ids 486–492) | PASS |
| L2 | Ledger usable in dropdowns | `/getledgername` | row with ledger_id = id and hierarchy fields | ledger_id 490 = id, district 2, child Payables, subchildtwo Hire Vehicles | PASS |
| L2b | Level-2 ledger (EXPENSES > 2) Operating) | inspect row | parent_grp_level 2 | 2, staticname EXPENSES | PASS |
| L3 | Duplicate ledger name | add "ZZTEST5 Cash" again | refused | HTTP 500 body `"Server Error"`, still 1 active row. The UI only toasts "Server error", with no "name exists" message | PASS |
| L3b | Near duplicate "zztest5 cash " | add | refused | refused (collation is case/space-insensitive) | PASS |
| L3c | Same name under a different parent | add "ZZTEST5 Hire Owner" under Drivers | refused (names are global) | refused | PASS |
| L4 | Ledger name containing `"` | add `ZZTEST5 O"Neil Owner` | saves | saves (parameterised insert) | PASS |
| L4b | Rename ledger to a name containing `"` | `/updateLedgerName` | saves | HTTP 500: SQL built with `"${name}"`, which is also injectable | BUG |
| P1 | Driver auto ledger | `/adddriverregister` "ZZTEST5 Driver A" | ledger under Payables>Drivers, linked | ledger 493, parent_subchild 13, `driver_register.ledger_id=493` | PASS |
| P2 | Driver name collides with a ledger | ledger "ZZTEST5 Driver B" exists, then add driver B | `"ZZTEST5 Driver B (D22687)"` | exactly that | PASS |
| P3 | Duplicate driver name | add "ZZTEST5 Driver A" again | 422 | 422 "DL Name is already registered" | PASS |
| P4 | Auto ledger offered on Payables / Trip Expenses | `/getexpensetripledgerdata` | contains 493 | yes | PASS |
| P5 | Driver rename syncs ledger | `/adddriveredit` driver_name → "ZZTEST5 Driver A2" | ledger renamed | ledger 493 = "ZZTEST5 Driver A2" | PASS |
| P5b | Renamed driver in Trial Balance | TB after rename | new name | old postings still under "ZZTEST5 Driver A" (TB groups by stored name) | BUG |
| P6 | Delete a driver whose ledger has a balance | `/deletedriverdata` driver B (ledger balance 2000 Cr) | blocked, or ledger handled | driver deleted, ledger left active with 2000 Cr | GAP |
| G1 | Add sub-group under Payables | `/addchilddata` GroupPage payload | created | id 21 | PASS |
| G1b | Sub-group carries hierarchy labels | inspect row | mandal_name/child set | both NULL (GroupPage.tsx:702 never sends them; already known) | GAP |
| G2 | Ledger inside the new group | `/addledgerdata` level 4 | created | id 495 | PASS |
| G3 | Rename group | `/updateGroupName` level 4 | renamed | renamed | PASS |
| G3b | Group rename reaches its ledgers | inspect ledger.subchildtwo | new group name | still "ZZTEST5 Group". Ledger dropdown subtitles and TB group column show the stale name | BUG |
| G4 | Duplicate group name | `/addchilddata` same name elsewhere | refused | refused. The check ignores `d_in`, so a *deleted* group's name can never be reused | PASS |
| G5 | Group name with an apostrophe | `/addchilddata` "ZZTEST5 O'Brien Grp" | saves | `{"status":500,"msg":true}`: the dup-check SQL is interpolated (mainmodel.js:11283-11287), so this is SQL injection | BUG |
| V1 | Journal storage | J1 | 1 Dr + 1 Cr sub row with ledger_id, status 0 | as expected | PASS |
| V2 | Voucher numbering | J1 dated 2027-05-01 | V270501NNN | V270501001 | PASS |
| A1 | Pending list | `/getvoucherentrydata` | J1 listed | listed | PASS |
| A2 | Approve | status 1 | 200, sub rows status 1 | yes | PASS |
| R1 | Ledger Wise hides unapproved | LW driver A with J1 pending | only opening 2000 Cr | 2000 Cr | PASS |
| R1b | Opening balance across FY | LW 2027-04-01.. with J0 on 2027-03-25 | opening 2000 Cr | 2000 Cr | PASS |
| R2 | Payables View hides unapproved | PV driver A | J1 not listed | not listed | PASS |
| R3 | Day Book hides unapproved | `/getdaybookreports` 2027-05 | J1 absent (other reports are approved-only) | J1's 2 pending rows listed; the page has no status filter or column | BUG |
| R4 | Credit balance after approval | LW | 12000 Cr | 12000 Cr | PASS |
| R5 | Payables View after approval | PV | 12000 | 12000 | PASS |
| R6 | Pending payment | P1 pending | LW unchanged | 12000 Cr | PASS |
| R7 | Partial payment approved | approve P1 | LW 8000 Cr | 8000 Cr | PASS |
| R8 | Payables View after a Voucher-Entry payment | PV | 8000 | **12000**. Payment vouchers are filtered out and liability rows are never settled | BUG |
| R9 | Full payment | P2 8000 approved | LW 0 | 0 | PASS |
| R10 | Payables View shows cleared | PV | 0 | **12000** outstanding across 2 rows | BUG |
| R11 | Balance Sheet agrees with Ledger Wise | BS FY 27-28, ledger 493 | 0 | **2000 Dr**: BS only sums the selected FY, with no brought-forward balance | BUG |
| R12 | Trial Balance covers the FY of the vouchers | TB 2027-04-01..2028-03-31 | 2027-05 vouchers | **0 rows**. They show under FY 26-27 because the filter is `DATE(i_ts)` | BUG |
| E1 | Payment before the liability is approved | JB pending, PB payment 5000 approved | warn/block | allowed; driver B at 5000 **Dr** until JB approved | GAP |
| E1b | Liability approved later | approve JB | 0 | 0 | PASS |
| E2 | Rejected payment | P3 1500 rejected with reason | balance unchanged | unchanged (0) | PASS |
| E2b | Rejected tab | `/getvouchersearchdata` type 2 | P3 listed | listed | PASS |
| E2c | Day Book hides rejected | Day Book 2027-05-11 | P3 absent | P3's 2 rows listed | BUG |
| E3 | Overpayment | P4 700 when balance 0 | warn/block | accepted; 700 Dr on a payable; Payables View offers no warning either | GAP |
| E4 | Payment dated before the liability | P4 2027-05-12, then J5 700 on 2027-05-20 | math correct | running balance goes Dr then back to 0 | PASS |
| PV1 | Payables View lists approved liability | JB2 3000 approved | row 3000 | row 3000 (plus JB 5000 already paid by manual voucher, still shown) | PASS |
| PV2 | Payables settlement voucher | `/submitpayablesvoucherentry` PAYA 1000 | 200 | 200 | PASS |
| PV3 | Payables voucher numbering | voucherdate 2027-05-14 | V270514… | **V260915001**: numbered by *today* with today's count (mainCtrl.js:5413-5420), unlike Voucher Entry | BUG |
| PV4 | Settlement timing | inspect liability row while PAYA pending | untouched until approved | already isedited=1, payment 1000, balance 2000 | BUG |
| PV5 | Payables View vs Ledger Wise while pending | compare | agree | PV 7000 vs LW 3000 Cr | BUG |
| PV6 | Reject a payables voucher | status 2 | liability row restored | restored to 3000, isedited 0 | PASS |
| PV7 | Reopen and approve the rejected payables voucher | status 0 then 1 | settlement re-applied | **not re-applied**: LW 2000 Cr but PV 8000, and the 3000 row is shown unpaid | BUG |
| PV8 | Double settlement | after PV7, PAYB settles the same row for 3000, approved | refused (only 2000 owed) | accepted; driver B **1000 Dr** (overpaid) | BUG |
| D1 | Delete an approved voucher | `/deletevoucherentry` PAYB (approved) | refused/locked | 200, soft-deleted (there's no delete button in the UI, but the API is open) | BUG |
| D2 | Deleting a payables voucher undoes its settlement | inspect row | row back to unpaid | row stays isedited=2, settled_by=deleted voucher. LW 2000 Cr, PV omits the row | BUG |
| A4 | Status change on a deleted voucher | approve deleted PAYB | refused | 200 (updates every row with that c_number, including d_in 1/2) | BUG |
| H1 | Hire owner payable | HO1 Dr Exp / Cr ZZTEST5 Hire Owner 8000, approved | 8000 Cr | 8000 Cr | PASS |
| H2 | Pay hire owner | HO2 Payment 8000 approved | 0 | 0 | PASS |
| H3 | Hirer receivable | HR1 Dr Hirer / Cr Hire Income 5000 | 5000 Dr | 5000 Dr | PASS |
| H4 | Hirer receipt | HR2 Receipt Dr Cash / Cr Hirer 5000 | 0 | 0 | PASS |
| H5 | Payables View on a receivable ledger | PV for hirer | receivable-aware view | treats the Receipt credit (5000) as "outstanding", invoice debit shows 0 | GAP |
| H6 | Balance Sheet placement | BS map by ledger_id | owner under Liabilities>Payables>Hire Vehicles, hirer under Assets>Receivables>Hirers, both net 0 | owner dr 8000/cr 8000 (district 2), hirer 5000/5000 (district 1) | PASS |
| ED1 | Edit an approved voucher | `/updatevoucherentry` HO1 (VoucherApprovals payload) | refused/locked | 200. The Edit button also shows on approved vouchers (VoucherApprovalsPage.tsx:1882) | BUG |
| ED2 | Effect of that edit | inspect versions and LW | stays approved | new version status **0**: hire-owner LW 0 → **8000 Dr** with no warning | BUG |
| ED3 | Audit trail | `/getvoucheraudit` | created/approved/edited | created, approved, edited | PASS |
| ED4 | Edit a liability already settled in Payables | JE 900, settle 900 (PAYE), approve both, edit JE, re-approve | stays settled | re-inserted sub rows get isedited 0; liability shows unpaid again in PV (double-pay risk) | BUG |
| N1 | Number after an edit | new voucher on 2027-05-06 after editing V270506001 | V270506002 | **V270506003**: COUNT(*) includes superseded d_in=2 versions, so numbers skip | GAP |
| N2 | Concurrent numbering | 3 parallel submits, 2027-05-18 | unique | **V270518001, V270518002, V270518002** (duplicate) | BUG |
| RN1 | Rename a ledger with postings | rename Exp → "…Exp R" | Ledger Wise by id keeps history | 5 rows kept | PASS |
| RN2 | Rename reflected in Trial Balance | TB | new name | old name only | BUG |
| RN3 | Rename reflected in Voucher Approvals list | `/getvoucherapproveddata` | new name | old name (copied `expensives`) | BUG |
| RN4 | Approvals edit of an old voucher after rename | build payload the way `toEditItem` does (match by name) | ledger resolved | debit ledger = **null** | BUG |
| RN5 | Server validates voucher lines | submit that edit | refused | 200; sub row saved with `ledger_id NULL, expensives NULL` | BUG |
| RN6 | Consequence of RN5 | LW expense ledger | unchanged | 28700 Dr → 28000 Dr: 700 orphaned, missing from LW/BS and shown as a nameless TB row | BUG |
| RN7 | Rename to an existing ledger name | owner → "ZZTEST5 Cash" | refused | accepted; 2 active "ZZTEST5 Cash" | BUG |
| T1 | Contra / Debit Note / Credit Note | submit and approve one of each | stored with type id | V270508001-003 with ids 2/11/12 | PASS |
| T2 | Multi-line journal | 2 Dr + 1 Cr | 3 rows | 3 rows | PASS |
| T3 | Unbalanced voucher via API | Dr 1000 / Cr 900 | refused | saved and approvable | BUG |
| T4 | Negative amounts | Dr −500 / Cr −500 | refused | saved | BUG |
| T5 | Voucher with no lines | empty arrays | refused | header saved with 0 lines | BUG |
| T6 | Same ledger on both sides | Dr Cash / Cr Cash | refused (UI blocks) | saved | BUG |
| T7 | Unknown voucher type | "ZZTEST5Bogus" | refused | saved with null type id | BUG |
| TB1 | Trial Balance Dr = Cr | approve unbalanced T3 | server keeps books balanced | TB Dr 68050 / Cr 67950 | BUG |
| TB2 | Trial Balance Dr = Cr (valid vouchers) | reject T3, re-sum all test vouchers | equal | 67050 / 67050 | PASS |
| DL1 | Delete a ledger with approved postings | `/deleteLedger` ZZTEST5 Bank (1000 Dr) | blocked | 200, soft-deleted. The GroupPage toast says "may have children or transactions", but the server never checks | BUG |
| DL2 | Reports after deleting a ledger | LW / BS / dropdown | consistent | LW by id still 1000 Dr; BS drops it (joins `mm.d_in=0`) while Cash keeps its 1000 Cr, so BS no longer balances; ledger gone from dropdowns | BUG |
| DG1 | Delete a group whose ledger has postings | GL 400 posted, `/deleteGroup` level 4 | blocked | 200; cascades a soft delete to the ledger; 400 Cr vanishes from BS | BUG |
| PR1 | Salary Generation / Statement data | `/getsalaryreport` | 200 | **HTTP 500** `TypeError: appmdl.getsalaryreportMdl is not a function` (model function doesn't exist) | BUG |
| PR2 | Salary Payment posts to person ledger | SalaryPaymentPage.tsx:93 | voucher Dr driver/staff ledger | button only does `toast.success('…processed!')`: no API call, no posting | BUG (CODE REVIEW) |
| PR3 | Payroll uses the same payable ledgers | code search | salary liability/payment on person ledgers | nothing in payroll touches `mainvoucher_*` or person ledgers | GAP (CODE REVIEW) |
| OB1 | Opening balances for ledgers | addledgerdataMdl (mainmodel.js:11369-11386) | opening amount stored | `amount` ignored; no opening-balance column or UI. Carry-in only possible via a dated journal | GAP (CODE REVIEW) |
| UI1 | Bulk approve/reject errors | VoucherApprovalsPage.tsx:1085-1098, 1118-1131 | failures reported | each call `.catch(() => {})`; toast always "N vouchers approved" | BUG (CODE REVIEW) |
| UI2 | Voucher delete from UI | accounting.service.ts:50 | a delete action | `deleteVoucher` is never used by any page; the API is still open (D1) | GAP (CODE REVIEW) |
| UI3 | FY selector / future dates | VoucherEntryPage.tsx:913-917 | server enforces dates | UI limits the date to the selected FY and ≤ today; API accepted 2027 dates without complaint | GAP (CODE REVIEW) |
| UI4 | "+ New Ledger" quick-add (Trip Expenses) | TripExpensesPage.tsx:1455-1468 | same rules as GroupPage | same `/addledgerdata` level-4 payload (shape exercised in L1). Duplicate → generic toast "Server error" | CODE REVIEW |
| UI5 | P&L / Group Wise | ProfitAndLossPage.tsx:353, GroupWisePage.tsx:166 | same basis as BS | same FY-only, active-ledger-only final report, so they inherit R11 and DL2 | CODE REVIEW |
| NT1 | BusNoPage owner-ledger auto-create; booking hirer auto ledger (`ensureHirerLedger`) | – | – | not driven end-to-end (other slices); ledgers were created by hand in the same containers | NOT TESTED |

**Counts (98 rows):** PASS 45 · BUG 40 (2 by code review) · GAP 10 (4 by code review) · CODE REVIEW 2 · NOT TESTED 1.

## Report reconciliation

Driver A (ledger 493). In the table, LW = Ledger Wise, PV = Payables View outstanding, TB = Trial Balance, BS = Balance Sheet.

| Step | LW FY 27-28 closing (opening) | LW all-time | PV | TB FY 26-27 (by entry timestamp) | TB FY 27-28 | BS FY 27-28 |
|---|---|---|---|---|---|---|
| J1 pending (J0 2000 approved) | 2000 Cr (2000 Cr) | 2000 Cr | 2000 | 2000 Cr | 0 rows | 0 |
| J1 approved | 12000 Cr | 12000 Cr | 12000 | 12000 Cr | 0 rows | 10000 Cr |
| P1 4000 pending | 12000 Cr | 12000 Cr | 12000 | 12000 Cr | 0 rows | 10000 Cr |
| P1 approved | 8000 Cr | 8000 Cr | **12000** | 8000 Cr | 0 rows | 6000 Cr |
| P2 8000 approved | **0** | 0 | **12000** | 0 | 0 rows | **2000 Dr** |
| P4 overpay 700 approved | 700 Dr | – | 12000 | – | – | – |
| J5 700 approved | 0 | 0 | 12700 | 0 | 0 rows | 2000 Dr |

Driver B (ledger 494), Payables-View settlement path:

| Step | LW FY 27-28 | PV |
|---|---|---|
| JB 5000 + PB 5000 (payment approved before liability) | 5000 Dr → 0 after JB approved | 5000 (JB never settled) |
| JB2 3000 approved, PAYA 1000 **pending** | 3000 Cr | 7000 (settled at submit) |
| PAYA rejected → reopened → approved | 2000 Cr | 8000 (settlement lost) |
| PAYB 3000 full settle approved | **1000 Dr** (overpaid) | 5000 |
| PAYB deleted | 2000 Cr | 5000 (row still marked paid) |

Final state of every test ledger, just before cleanup:

| Ledger | LW FY opening | LW FY closing | LW all-time | PV | TB (FY 26-27, by timestamp) | BS FY 27-28 |
|---|---|---|---|---|---|---|
| Driver A (renamed A2) | 2000 Cr | 0 | 0 | 12700 | 0 | **2000 Dr** |
| Driver B | 0 | 2000 Cr | 2000 Cr | 5000 | 2000 Cr | 2000 Cr |
| Driver Bata Exp (renamed R) | 2000 Dr | 28600 Dr | 28600 Dr | 100 | 28600 Dr (under **old** name) | **26600 Dr** |
| Cash | 0 | 23200 Cr | 23200 Cr | 1500 | 23200 Cr | 23200 Cr |
| Bank (deleted, has postings) | 0 | 1000 Dr | 1000 Dr | 0 | 1000 Dr | **0** |
| Hire Owner | 0 | 300 Dr | 300 Dr | 8000 | 300 Dr | 300 Dr |
| Hirer | 0 | 50 Cr | 50 Cr | 5050 | 50 Cr | 50 Cr |
| Hire Income | 0 | 4950 Cr | 4950 Cr | 5000 | 4950 Cr | 4950 Cr |
| Group Ledger (group deleted) | 0 | 400 Cr | 400 Cr | 400 | 400 Cr | **0** |
| (orphan line, ledger_id NULL, from RN5) | – | – | – | – | 700 Dr (name null) | – |

**Totals**
- **Trial Balance, all approved test vouchers:** Dr 67050 = Cr 67050, but only because the orphan line still counts by name. With the unbalanced T3 voucher approved it was 68050 / 67950.
- **Balance Sheet, test ledgers only, FY 27-28:** Dr 63750 vs Cr 65050, off by 1300:
  - −1000: deleted bank ledger
  - +400: deleted group ledger
  - −700: orphan line
  - J0's 2000 falls in the previous FY, but both of its sides drop out together, so it doesn't affect the difference.

## Bugs & risks

1. **HIGH – Payables View ignores payments made in Voucher Entry.** Evidence: R8, R10, and the tables above. A driver fully paid in Ledger Wise (0) still shows 12000 outstanding.
   - **Where:** PayablesViewPage.tsx:1178-1186 keeps any approved row with `isedited` 0/1 and drops `vouchertype==='Payment'` rows. Only `/submitpayablesvoucherentry` (mainCtrl.js:5466, `payablesledgerupdate`) marks liability rows paid.
   - **Impact:** people get paid twice; the two screens disagree.
   - **Fix:** derive outstanding from the ledger balance (FIFO-allocate approved debits against credit rows), or block/redirect manual Payment vouchers on payable ledgers to the Payables flow.
2. **HIGH – Approved vouchers are not locked.** Evidence: ED1, ED2, D1, A4, ED4.
   - **Edit:** `updatevoucherentryCtrl` (mainCtrl.js:3385-3428) re-inserts with `status: 0` (mainmodel.js:8892). An approved voucher silently drops out of every report; hire owner went from 0 to 8000 Dr.
   - **Delete:** `deletevoucherentryCtrl` (3373) and `updatevoucherentrystatusMdl` (mainmodel.js:6214-6217) have no status or `d_in` guard.
   - **Settled rows:** re-inserted sub rows reset `payment/balance/isedited`, so a liability already settled comes back unpaid.
   - **UI:** the Edit button shows for approved vouchers (VoucherApprovalsPage.tsx:1882).
   - **Fix:** return 400 LOCKED unless status = 0 (as fuel/laundry already do), require an explicit reopen, and carry settlement columns across edits.
3. **HIGH – No server-side validation of vouchers.** Evidence: T3–T7, RN5, TB1.
   - **What gets through:** unbalanced, negative, empty, same ledger on both sides, unknown type, and lines with a null ledger (ledger_id NULL).
   - **Where:** mainCtrl.js:3297-3371; mainmodel.js:5612-5646 and 5816-5851.
   - **Impact:** the Trial Balance can go out of balance, and amounts become invisible to Ledger Wise and the Balance Sheet.
   - **Real UI trigger:** the Approvals edit after a ledger rename (below).
   - **Fix:** validate Σ Dr = Σ Cr > 0, each amount > 0, each `ledger_id` exists and is active, type id exists, no ledger on both sides, and wrap the header and lines in one transaction.
4. **HIGH – Ledger rename breaks Approvals edit, Trial Balance and lists.**
   - **Rename itself:** `updateLedgerNameMdl` (mainmodel.js:11826-11828) only updates the master row, doesn't check for duplicates (RN7), and builds SQL with `"${temple_name}"` (injection; fails on `"`, L4b).
   - **Stale names:** sub rows keep the old `expensives`. Trial Balance groups by it (TrialBalancePage.tsx:108-116; RN2, P5b) and the Approvals list shows it (RN3).
   - **Approvals edit:** it re-resolves ledgers **by name** (VoucherApprovalsPage.tsx:856), so after a rename, editing an old voucher saves a line with ledger_id NULL and the money disappears (RN4–RN6).
   - **Fix:** key TB and edit resolution by `ledger_id`, and join the current name at read time. Use parameterised SQL with a dup check.
5. **HIGH – Ledgers and groups with postings can be deleted.**
   - **Where:** `deleteLedgerMdl` (11871-11873) and `deleteGroupMdl` (11771-11824, cascades) have no posting check; GroupPage's failure toast implies one exists.
   - **Impact:** the final-transactions report joins `mm.d_in='0'` (mainmodel.js:6048-6062), so the Balance Sheet, P&L and Group Wise lose one side of every voucher and stop balancing. Ledger Wise and TB still show them (DL1, DL2, DG1).
   - **Fix:** refuse when any `*_subt`/`expensive_details` row references the ledger (or any ledger in the group).
6. **HIGH – Payables settlement lifecycle is inconsistent.**
   - **PV4:** settlement is applied at submit, before approval.
   - **PV7:** reject un-settles, but reopen/approve doesn't re-settle. The path is mainCtrl.js:3522-3534 with no approve branch.
   - **D2:** delete (`deletevouchertypebill2`) never un-settles.
   - **PV8:** nothing checks the ledger balance, so the same liability was paid twice → 1000 Dr.
   - **Fix:** settle on approval (and un-settle on reject/reopen/delete) inside `updatevoucherentrystatusCtrl`/delete, and cap payments server-side at the row's current balance.
7. **MEDIUM – Trial Balance dated by entry timestamp.** Evidence: R12. `gettrialbalancereportsMdl` filters `DATE(i_ts)` (mainmodel.js:9367-9370), while Ledger Wise, Balance Sheet and Payables use `voucherdate`. A back-dated or forward-dated voucher lands in the wrong FY (all the 2027-05 vouchers appeared in FY 26-27, none in FY 27-28), and the TB opening balance is wrong too. Fix: `COALESCE(voucherdate, DATE(i_ts))`, as `SelectdatagetfinaltranscationsreportMdl` does.
8. **MEDIUM – Balance Sheet has no brought-forward balances.**
   - **Evidence:** R11: the driver shows 2000 Dr in BS vs 0 in Ledger Wise.
   - **Where:** BalanceSheetPage.tsx:333-371 queries only `fyMin..fyMax`.
   - **Impact:** asset and liability balances from earlier years vanish.
   - **Fix:** for balance-sheet heads (ASSETS / EQUITIES AND LIABILITIES), query from inception (or add an opening query as Ledger Wise and TB do). Keep FY-only for P&L.
9. **MEDIUM – Day Book includes pending and rejected vouchers.** Evidence: R3, E2c. `getdaybookreportsMdl` has no status filter (mainmodel.js:9301-9312), and the page neither filters nor shows status. Trip expenses and fuel there are also dated by `i_ts`. Fix: filter `status='1'`/`admin_status='1'`, or show a status column.
10. **MEDIUM – Voucher numbers can duplicate, and Payables vouchers get the wrong date prefix.**
    - **Duplicates:** numbering is `COUNT(*)+1` with no lock or unique key (mainCtrl.js:3301-3310, mainmodel.js:8771-8774). N2 produced a duplicate V270518002. `mainvoucher_t.c_number` isn't unique, and approve/edit/delete all act *by c_number*, so both vouchers get affected together.
    - **Gaps:** the count includes superseded edit versions, so numbers skip (N1).
    - **Wrong date:** Payables vouchers use today's date and count (5413-5420; PV3).
    - **Fix:** MAX suffix + 1 per voucher date inside a transaction, with a UNIQUE index on (c_number, active version) — the `utils/refnumber.js` approach already used for T/F numbers.
11. **MEDIUM – Payroll is non-functional.**
    - **Report endpoint:** `/getsalaryreport` throws, because `getsalaryreportMdl` doesn't exist (mainCtrl.js:4384), so Salary Generation and Statement always fail (PR1).
    - **Salary Payment page:** it's a mock (SalaryPaymentPage.tsx:93, toast only) and nothing posts salary to person ledgers (PR2, PR3).
12. **LOW – SQL built by string interpolation in group code.**
    - **Where:** `addchilddataMdl` dup-check (mainmodel.js:11283-11287) and `updateGroupNameMdl` (11745-11751).
    - **Impact:** an apostrophe breaks them (G5) and they're injectable. The dup check also ignores `d_in`, so deleted names can't be reused.
13. **LOW – Group rename doesn't reach the ledgers' `subchildtwo` label (G3b).** Duplicate-ledger errors come back as a bare 500 "Server Error" (mainCtrl.js:5247-5250), so the UI can't say "name already exists".
14. **LOW – Bulk approve/reject swallows errors** and always toasts success (VoucherApprovalsPage.tsx:1093, 1126).

## Gaps / inconsistencies

- **No opening balances.** Ledgers have no opening-balance field (OB1). Carrying in a balance means a dated journal against some suspense ledger.
- **Deleting a person doesn't touch their ledger** (P6): no block, no warning, and the ledger stays in pickers with its balance.
- **Payment before liability approval and overpayment** (E1, E3) are allowed silently. Neither Voucher Entry nor the server shows the payee's current balance or warns on a debit balance for a Payables ledger.
- **Payables View has no receivable mode.** On a hirer (receivable) ledger it treats receipts as "outstanding" (H5). It also lists one ledger at a time with no grouping or summary by container (Drivers / Helpers / Hire Vehicles).
- **Three different date bases for the same voucher.**
  - Ledger Wise, Balance Sheet, P&L and Payables: `voucherdate`.
  - Trial Balance: `i_ts`.
  - Day Book: mixed — `i_ts` for trips, fuel and laundry, `voucherdate` for vouchers.
- **Date limits are UI-only.** Voucher Entry limits the date to the selected FY and ≤ today, but the API accepts any date, including future FYs.
- **No UI to delete a voucher** (the service method exists, unused), while the API allows deleting even approved ones.
- **Stale stored names.** Voucher lists and Trial Balance show the ledger name as it was at entry; Ledger Wise and Balance Sheet use `ledger_id`. After a rename, the reports name the same ledger differently.
- **Hierarchy labels:** UI-created groups have NULL `mandal_name`/`child` (G1b). Container rows 1/2 have `mandal_name` "CURRENT ASSETS" instead of "2) CURRENT ASSETS", so ledgers quick-added from Trip Expenses under Cash/Banks inherit the inconsistent label.
- **Existing non-test leftovers** noticed and left untouched: ledger 414 "E2E Hire Hirer" (Receivables > Hirers) and ledger 410 "Opting" under Drivers.

## Cleanup confirmation

`cleanup.js` hard-deleted, selecting by `description LIKE 'ZZTEST5%'`, main ids, and ledger ids with a name guard:

| Table | Rows deleted |
|---|---|
| `mainvoucher_t` | 35 (all versions, incl. edit copies and the concurrent duplicates) |
| `mainvoucher_subt` | 69 |
| `mainvoucher_audit` | 63 |
| `payables_payment_history` | 4 |
| `payables_settled_links` | 0 |
| `mainmasterssubchildtwo` | 11 (ids 486-496) |
| `mainmasterssubchild` | 1 (group 21) |
| `driver_register` | 2 (ids 119, 120) |

Before deleting, I confirmed no non-test voucher shared any test c_number (incl. V260915001-003) or the V2705… / V270325… ranges.

Post-check, all zero:
- `mainvoucher_t`/`_subt`/`_audit`, `payables_payment_history`, `mainmasterssubchildtwo`, `mainmasterssubchild`, `driver_register` rows matching ZZTEST5 or the test c_numbers;
- vouchers numbered V2705%, V270325% or V260915%;
- sub rows on ledger ids 486-496.

**No ZZTEST5 rows remain.** No app source was modified and the backend was not restarted.
