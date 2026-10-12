# Van Flow — Cases Covered & Results

**Van vehicle → Van service number → Van trip → Van trip expense → Voucher → Ledgers → Payment**

| | |
|---|---|
| Source | Round 1: extracted from the full audit of 15 Sep 2026 (`Samanvi_E2E_Flow_Audit_2026-09-15.docx`, Reports A–E). Round 2: 32 extra van cases (sections 2.6–2.7). Round 3: independent re-run of 22 cases (section 5) |
| How it was tested | Real HTTP API calls using the payloads the pages send, every result checked in the database. Test data was tagged `ZZTEST` and deleted afterwards |
| Not done | Nobody clicked through the screens in a browser |

---

## 1. How a van flows through the system today

1. **Van master** (Masters → Bus Numbers).
   - There is no separate Van form. A van is a normal vehicle whose **Vehicle Type = VAN**; buses and vans are told apart only by that text.
   - A **hired van** uses the Hire tab: `bus_category = hire`, linked to an **owner ledger** under *Current Liabilities → Payables → Hire Vehicles*. The "Create owner ledger" box creates that ledger.
2. **Van service number** (Masters → Service Numbers → Van tab).
   - Required: Service For, Service No and Bus Operator.
   - Also holds pick-up/drop, line code, boarding points and times. It has no betas.
   - Can be switched off from a date.
3. **Van trip** (Trip Creation → Van tab): one row per active van service for the date.
   - **Own van + registered driver:** pick van and driver.
   - **Own van + opting driver:** opting driver's name, a valid mobile and an Amount are required.
   - **Hired van:** driver is not applicable; hirer name and Amount are required.
   - **Halt:** nothing else required.
   - **Several services a day:** the same van may run them.
   - **At save:** writes `trip_created` with a T-number. **No voucher and no ledger** are created at this stage.
4. **Van trip expense** (Trip Expenses → Van tab). The voucher is a Journal numbered with the trip's T-number:

| Van case | Debit | Credit |
|---|---|---|
| Own van, registered driver | – (no voucher, amount 0) | – |
| Own van, opting driver (Amount = opting pay) | Salaries | Opting Driver ledger |
| Hired van (Amount = hire charge) | Hire vehicle charges | The van's owner ledger (Payables → Hire Vehicles) |

5. **Approval.** Trip approval and voucher approval are separate steps. Only an approved voucher reaches Ledger Wise, Trial Balance and Balance Sheet.
6. **Payment.** The owner's payable is cleared with a Payment voucher (Voucher Entry) or through Payables View.

---

## 2. Cases covered and results

Result meanings:
- **PASS**: ran and behaved correctly.
- **BUG**: ran and misbehaved.
- **GAP**: a check or feature the screen implies is missing.
- **CODE REVIEW**: concluded from reading the code, not run.

### 2.1 Van master (vehicles & owner ledger)

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| A-B08 | Add a van (Normal form, Vehicle Type VAN) | Saved as VAN | Saved, `vehicle_type=VAN` | PASS |
| A-B09 | Hire form "Create owner ledger" | Ledger under Payables → Hire Vehicles | Created (Payables → Hire Vehicles) | PASS |
| A-B10 | Create owner ledger with a name that already exists | Clear "already exists" message | Server returns HTTP 500 "Server Error"; the screen shows nothing | BUG |
| A-B11 | Add hired vehicle with an owner ledger | `bus_category=hire`, owner ledger linked | As expected | PASS |
| A-B12 | Add hired vehicle with **no** owner ledger (screen marks it required) | Refused | Saved without an owner ledger | GAP |
| A-B13 | Add hired vehicle with a non-existent owner ledger id | Refused | Saved | GAP |
| A-B19 | Rename a vehicle onto an existing van number | Refused | Refused: "Vehicle ZZTEST1-VAN01 is already registered" | PASS |
| A-B21 | Edit a hired van (Hire tab sends only its own fields) | Engine no., insurance and VAN type kept | Kept | PASS |
| A-B24 | Mark van Sold / Service Out (reason with apostrophe) | Off active list, on Service Out list, history row | As expected | PASS |
| A-B25 | Add a new vehicle with the number of a sold-out van | Refused or warned | Saved, giving 2 rows with the same number | BUG |
| A-B26 | Reactivate the sold-out van after the new one took its number | Refused | Reactivated, giving **2 live vans with one number** | BUG |
| A-B35 | Van Excel sheet import over existing vans | Columns not on the Van sheet left alone | Home tax, permit, AITP and luxury type **wiped to empty** | BUG |
| A-B36 | Van import when 2 live rows share the number | One vehicle updated | Both rows updated | BUG |
| A-B34 | Re-import a hired vehicle from the exported sheet | Stays hired with owner ledger | Became a normal vehicle; owner ledger, engine no. and insurance wiped | BUG |
| A-C03 | Server restart with duplicate van numbers | Duplicates shown to the user | Startup script silently retires all but one, possibly the row with the owner ledger | CODE REVIEW (BUG) |
| A-GAP | Selling a hired van | Owner ledger flagged | Owner ledger stays live and selectable | GAP |

### 2.2 Van service numbers

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| B-R2 | Add a van route (operator, pick-up) | Van row saved | `vehicle_type=van`, operator id and name, pick-up saved | PASS |
| B-R4 | Van route with no Bus Operator (through the API) | Refused | Saved (only the screen enforces it) | GAP |
| B-R8 | Van route with the same number as a bus route | Refused, or allowed on purpose | Saved | BUG |
| B-R10 | Rate lookup when a bus and a van share a number | The right route's rates | 4 rows returned (3 bus, 1 van); Trip Expenses takes the first, so it can use the wrong route's rates | BUG |
| B-E10 | Save a van route without changes | Unchanged | Unchanged (only Up/Down empty→blank) | PASS |
| B-I7 | Van Excel import, number already exists | Skipped | Skipped | PASS |
| B-I8 | Van import, number equal to an existing bus route | Same rule as the form | Skipped (import and form disagree, see B-R8) | GAP |
| B-I9 | Van import, operator not in master / trip type "pick up" | Rejected | Saved with no operator id and trip type "pick up" | GAP |
| B-HD1/HD2 | Van sheet on Van tab / Bus sheet on Van tab | Accept / reject | Accepted / rejected with a clear column message | PASS |
| B-A1–A8 | Switch a van route off from today, trips on earlier and later dates, switch back on | Earlier dates allowed; that date and later skipped | As expected | PASS |
| B-A15 | Future-dated van trip through the API | Refused (screen caps at today) | Saved | GAP |
| B-C1 | Service For filter on the Van tab | Van names only | Shows names from bus routes too | CODE REVIEW |

### 2.3 Van trip creation

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| C-V1 | One sheet: own van + registered driver; the **same van** on a 2nd service with opting driver + mobile + amount 750; hired van with hirer "O'Neil", phone, 2500 | 3 trips | 3 trips created | PASS |
| C-V1a | Van fields stored | Line code, opting name/mobile, hirer, phone, amount | All stored as sent; apostrophe stored fine | PASS |
| C-V1b | Same van service submitted again that day | Skipped | Skipped | PASS |
| C-V1c | Halted van row with no van | Saved | Saved with no van | PASS |
| C-V1d | Hirer ledger at creation | None created | None created | PASS |
| C-L1b | Van records list fields | Line code, pick/drop, driver, opting name + mobile, hirer, amount | All present; pick/drop "drop" | PASS |
| C-B5b | Hired van with no hirer and no amount (through the API) | Refused | Saved (only the screen checks) | GAP |
| C-B5c | Van number sent on a bus row | Refused | Saved | GAP |
| C-E6 | File the hired-van expense and check the link | Voucher numbered with the trip number | Journal T270303003 created and linked to the trip | PASS |
| C-E6b | Records show the voucher ledgers | Debit and credit names | "Hire Charges → Van Owner O'Neil" | PASS |
| C-E7 | Edit the van trip in Trip Creation **after** its expense was filed (phone only) | Expense rows untouched | Expense trip date, service no., driver 2 and paid-to type became the text **'undefined'** | BUG (High) |
| C-E8 | Move a filed hired-van trip onto an own van | Refused while the hire voucher exists | Server accepted; the hire voucher (2500 to owner) stays live on an own-van trip. Only the screen blocks it | BUG |
| C-E8b | Screen clears the hire amount when switching hired ↔ own van | Amount cleared; Save blocked if voucher exists | As expected | CODE REVIEW (PASS) |
| C-E9 | Own van: opting driver → registered driver | Opting name, mobile and amount cleared | Cleared; history logs only the driver change, not the amount | PASS |
| C-E5 | Edit a halted van trip on screen | Editable | Save is disabled (van and Driver 1 required even for Halt) | BUG (CODE REVIEW) |
| C-D2b | Delete a hired-van trip that has a voucher | Voucher voided | Voucher T270303003 (2500 to owner) **still pending** for a deleted trip | BUG |

### 2.4 Van trip expenses, vouchers & ledgers

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| D-L4 | Hired-van master data seen by Trip Expenses | `bus_category=hire`, owner ledger id | As expected | PASS |
| D-L6 | Bus / Van tab split | 3 van trips on the Van tab | 3 | PASS |
| D-S22 | Own van, registered driver | No beta, no voucher, amount 0 | Exactly that | PASS |
| D-S23 | Own van, opting driver, amount 800 | Dr Salaries 800 / Cr Opting Driver 800 | Exactly that | PASS |
| D-S24 | Hired van, hire charge 1200 | Dr Hire vehicle charges 1200 / Cr owner ledger 1200 | Exactly that | PASS |
| D-S25 | Hired van expense submitted **twice** | One voucher | **2 vouchers with the same T-number**: hire charge posted twice (2400) | BUG |
| D-A03/A04 | Approve the van trip | Voucher approved too | Voucher stays pending; must be approved again in Voucher Approvals | BUG |
| D-D02–D04 | Delete the van trip expense | Trip back to Not Filed, voucher voided | Trip itself deleted; voucher stays live | BUG |
| D-S08 | Van voucher date | Trip date | Filing date (costs land in the wrong period) | BUG |
| D-C05 | Opting ledgers exist | Opting Driver / Helper / Conductor under Payables | Present; stray extra "Opting" ledger also under Drivers | CODE REVIEW |

### 2.5 Hire owner & hirer ledgers — payment to zero

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| E-L1/L2 | Create a hire-owner ledger (Payables → Hire Vehicles) and a hirer ledger (Receivables → Hirers); appear in ledger dropdowns | Created and selectable | As expected | PASS |
| E-L4 | Owner ledger name with a quote (O"Neil) | Saved | Saved | PASS |
| E-H1 | Post hire payable 8000, approve | Owner 8000 Cr | 8000 Cr | PASS |
| E-H2 | Payment 8000 to owner, approve | Owner 0 | 0 | PASS |
| E-H3 | Hirer receivable 5000 (Dr Hirer / Cr Hire Income) | 5000 Dr | 5000 Dr | PASS |
| E-H4 | Receipt 5000 from hirer | 0 | 0 | PASS |
| E-H5 | Payables View on the hirer (receivable) ledger | Receivable-aware view | Treats the receipt as "outstanding"; invoice shows 0 | GAP |
| E-H6 | Balance Sheet placement | Owner under Liabilities → Hire Vehicles, hirer under Assets → Hirers, both net 0 | As expected | PASS |
| E-ED2 | Edit an **approved** payment to the owner | Stays approved or is refused | Silently reset to pending: owner went from 0 to **8000 Dr** | BUG |
| E-RN7 | Rename the owner ledger to an existing ledger's name | Refused | Accepted: 2 ledgers with the same name | BUG |
| E-NT1 | Automatic hirer ledger from bookings (`ensureHirerLedger`) and the owner ledger created from the Bus Numbers page, end to end | – | Not driven end to end; the ledgers were created by hand in the same groups | NOT TESTED |

### 2.6 Round 2 — van trip creation & edits (driver variations)

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| A1 | Own van with **no driver** (not hired, not halted) | Blocked | Screen blocks it (Submit skips the row). Server **accepts** it: trip saved with no driver | UI PASS / server GAP |
| A2a | Opting driver with invalid mobile "12345" | Blocked | Screen blocks. Server accepts and stores "12345" | UI PASS / server GAP |
| A2b | Opting driver with **no opting name** | Blocked | Screen blocks. Server accepts: opting pay to an unnamed person | UI PASS / server GAP |
| A2c | Opting driver with **no amount** | Blocked | Screen blocks. Server accepts with no amount | UI PASS / server GAP |
| A3 | Own van + registered driver whose nickname is blank | Driver selectable, name shown | Driver shows as a blank option. After picking, the row never becomes ready, so **the trip can't be created from the Van tab**. Through the API: name stored empty, lists show blank | BUG |
| A3b | Same driver, name stored correctly | Lists show the name | Trip Creation and Trip Expenses lists still show "—" (`COALESCE` stops at the blank nickname) | BUG |
| A4 | Van trip, then the driver is **terminated** | Past trip keeps the name | Name still shown in both lists | PASS |
| A4b | Edit that trip after termination | Driver shown | Driver box shows "Select" (looks unassigned); Save keeps the original driver | GAP (low) |
| A5 | Same van on 2–3 services in one day; same service twice | Allowed; duplicate service skipped | 3 trips on one van; duplicate skipped | PASS |
| A6 | Halted van row with no van | Saved, leftovers dropped | Saved with no van, driver, opting details or amount | PASS |
| A6b | Edit the halted van trip | Editable | Save disabled (van required) | BUG |
| B1 | Edit: registered driver → **opting driver** (name + mobile + 700) | Stored and logged | Stored correctly; history logs only "Driver 1 → Opting Driver" (not name, mobile or amount) | PASS (history gap) |
| B2 | Edit: own van → **hired van** (hirer + 1500) | Driver cleared, hirer and amount stored | As expected; Trip Expenses would post Hire 1500 / Owner 1500 | PASS |
| B2b | Own → hired van with **no hirer and no amount** (API) | Refused | Accepted, so the hire charge is **never raised** in Trip Expenses | GAP |
| B3 | Edit: hired van → own van + registered driver | Hirer, phone and amount cleared | As expected | PASS |
| B3b | Edit picking the blank-nickname driver | Can save | Save stays disabled | BUG |
| F1 | Opting driver name and mobile in the lists | Shown | Shown in both Trip Creation and Trip Expenses lists | PASS |
| N1 | Opting-driver id after any Trip Creation edit | Stays empty | Becomes **0** on every edited trip; Trip Expenses treats "0" as an opting seat | BUG (new) |
| H1 | Edit history for amount, opting name/mobile, phone | Logged | Not logged | GAP |

### 2.7 Round 2 — van expenses, ledgers & payments

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| C1 | **Halted van** expense | Filed with no cost | Blocked ("Bus Number is required"). Picking a van lets it file at 0, but writes that van onto a trip that didn't run | GAP |
| C2 | Own van + **registered driver** | 0, no voucher | 0, no voucher. By design a van **never pays a driver** beta, salary or "Pay" tick; paying a registered van driver needs ledger rows typed by hand | PASS (design note) |
| C3 | Own van, driver with blank nickname | Name kept | Name blank on the trip and the expense; no Pay tick | BUG |
| C4 | **Hired van 1200 → edited to 1500** in Trip Expenses | Lines replaced, 1500 = 1500 | Correct: Dr Hire 1500 / Cr Owner 1500, one voucher, old lines retired. Trip's own amount stays 1200 | PASS (see issue 10) |
| C5 | **Opting driver 800 → 950** | Dr Salaries / Cr Opting Driver 950 | Correct, one voucher. Trip's amount stays 800 | PASS (see issue 10) |
| C6 | **Reject → On Review → re-file** | Reject withdraws the voucher | Voucher stays **active and pending** while rejected (can still be approved). Re-file replaced lines correctly (1100) | BUG |
| C7 | **Approve** the trip, then the voucher | Owner 1500 Cr, Opting Driver 950 Cr | After trip approval: nothing in Ledger Wise. After a **second** approval in Voucher Approvals: owner 1500 Cr, Opting Driver 950 Cr. Voucher dated the filing day, not the trip date | BUG |
| C8 | Driver **terminated** after filing, expense reopened | Ledger and name resolve | Ledger and name kept; save OK. Driver box shows "— Select —" | PASS |
| C9 | **Hire amount changed in Trip Creation after filing** (1200 → 1500) | Blocked or voucher follows | Trip shows 1500 but the voucher stays **1200**; Trip Expenses says "₹1,500 already on the books" and re-saves 1200. No warning, no history | BUG (new, High) |
| C10 | **Hired → own van after filing** | Refused or voucher withdrawn | Trip Expenses' van dropdown allows it (no guard); the API allows it too. Owner stays credited 900 for an own-van trip | BUG |
| D1 | Pay hire owner 1500 via **Voucher Entry** | Ledger Wise 0, Payables View clear | Ledger Wise **0** ✔; Payables View still shows **1500 owed** | BUG |
| D2 | Second hire 1200 paid **500 + 700 via Payables View** | Screens agree; settle after approval | Rows marked paid while payments were still **pending**; screens disagree until approved. Ledger Wise ends 0 for this trip. Vouchers numbered by today's date, not the voucher date | BUG |
| D3 | Pay **Opting Driver** 950 via Voucher Entry | Own rows net 0 | Ledger Wise **0** ✔; Payables View still shows 950. The shared "Opting Driver" row shows only the trip number, not the opting person's name | BUG |
| E1 | **Hired van** Van-sheet export → re-import | Stays hired with owner ledger | Unchanged, stays hired with owner ✔. Code review: import renames any van type to "VAN"; an owner ledger outside Hire Vehicles is dropped silently | PASS |

**Accounting.** Every van voucher balanced (Dr = Cr) at every step, with exactly one active voucher per trip:
- hired van: Dr Hire vehicle charges / Cr van owner;
- opting driver: Dr Salaries / Cr Opting Driver;
- own van + registered driver: no voucher.

---

## 3. Van issues to fix (priority order, both rounds)

1. **Hire amount changed after filing never reaches the voucher** (C9, High). The owner is owed or paid the wrong amount with no warning. Lock the amount in Trip Creation once filed, or re-seed or warn in Trip Expenses.
2. **Filed van trip corrupted by a later Trip Creation edit** (C-E7, High). The expense date and service become 'undefined'.
3. **Payables View ignores Voucher Entry payments** (D1, D3). The owner and opting driver still show as owed after being paid, so there's a risk of paying twice.
4. **Double submit posts the hire charge twice** (D-S25).
5. **Approval and reject don't reach the voucher** (C7, C6). The payable appears only after a second approval, and a rejected expense can still be posted.
6. **Hired → own van after filing is still possible** from Trip Expenses and the API (C10, C-E8). The owner stays credited.
7. **Deleting a van trip or expense leaves the hire voucher live** (C-D2b, D-D02).
8. **Drivers with a blank nickname can't be put on a van** and show blank everywhere (A3, A3b, B3b, C3). This affects 6 real drivers.
9. **Opting-driver id becomes 0 on every Trip Creation edit** (N1). Trip Expenses reads it as an opting seat. On bus trips this can block the expense or pay an empty seat.
10. **Trip amount goes stale when the expense amount is edited** (C4, C5, C6).
11. **Payables View settles before approval** (D2), and payables vouchers are numbered by today's date.
12. **Server accepts incomplete van rows** (A1, A2a–c, B2b, C-B5b). No driver, bad mobile, unnamed opting driver, or hired van with no hirer or amount.
13. **Halted van can't be edited, and can only be filed by giving it a van** (A6b, C1).
14. **Master and import issues** (A-B25, B26, B35, B36, B-R8, B-R10): van numbers can exist twice, the Van sheet import wipes permit and tax dates, and bus and van can share a service number.
15. **Smaller items**:
    - vouchers dated the filing day;
    - edit history misses amount, opting name and mobile, and logs false Status/Hirer changes;
    - a terminated driver shows "Select" in edit boxes;
    - Payables View has no receivable mode for hirers;
    - the shared Opting Driver ledger doesn't show who was paid.

---

## 4. Coverage

All van cases listed as "not covered" after round 1 have now been run:
- own van without a driver;
- invalid or unnamed opting driver;
- blank nickname;
- terminated driver (trip and expense);
- registered ↔ opting and own ↔ hired edits, before and after filing;
- hire and opting amount changes;
- halted van expense;
- reject and re-file;
- approval;
- paying the hire owner and the Opting Driver to zero (Voucher Entry and Payables View);
- Van-sheet round trip.

**Still not done:** clicking through the Van screens in a browser. All results come from real API calls built exactly as the pages build them, replays of the page logic, and database checks.

**Test data:** round 2 used tags `ZZTEST6A` / `ZZTEST6B` (July/August 2027 trip dates). All of it was deleted and verified gone. Balances on real ledgers were checked unchanged.

---

## 5. Round 3 — independent re-run (22 cases, extra findings)

A third tester re-ran the same van cases independently (tag `ZZTEST6`, June 2027 dates): **11 PASS, 9 BUG, 3 GAP**. It confirmed the round-2 results and found three more problems, all serious.

| ID | Case | Expected | Actual | Result |
|---|---|---|---|---|
| R3-B3 | **Opting expense filed** (Salaries 800 / Opting Driver 800), then Trip Creation edit → **registered driver** | Blocked, or voucher withdrawn | Allowed. Trip shows the registered driver, but the voucher **still pays Opting Driver 800**. The edit also wrote 'undefined' into the expense rows | BUG (new) |
| R3-B4 | **Opting expense filed**, then Trip Creation edit **own van → hired van** (1200) | Blocked, or voucher replaced by hire 1200 → owner | Allowed. Voucher still pays Opting Driver 800 on a hired van, so **the owner is never credited**. Reopening and saving the expense then wrote **'undefined' into the trip itself**: date, service no., trip for, driver 2, helper, conductor, paid-to type. **The trip disappears from every date-filtered list and report** | BUG (new, High) |
| R3-B5 | Hire amount changed after filing (1200 → 1500), then expense reopened and saved | Voucher follows, or mismatch flagged | Voucher stays 1200 (same as round-2 C9), **and** the re-save corrupted the trip to 'undefined' | BUG (High) |
| R3-C9 | Voucher **approved** in Voucher Approvals while the trip is still pending, then the expense is edited 900 → 950 | Stays approved, or the edit is refused | Edit allowed. Header still says approved, but the new lines are saved as **pending**: the owner's payable dropped from **900 Cr to 0** in Ledger Wise. It looks approved, so nobody re-approves it | BUG (new, High) |
| R3-D2 | Hire owner 2000 paid 500 + 1500 via Payables View | Screens agree | Ends at Ledger Wise 0 / Payables View 0. While pending, Payables View already showed 1500 against Ledger Wise 2000 (settles before approval) | PASS (known pending-settle bug) |
| R3-V1 | Trip Expenses **View** popup for an opting-driver van trip | Opting name and mobile shown | Not shown (code review) | GAP |

### Added to the fix list (insert at the top)

- **0a. Any Trip Creation edit of a van trip after filing must be blocked** until the expense is edited or removed. Today only hired → own is blocked, but these all leave a wrong voucher in the books:
  - opting → registered driver;
  - own → hired van;
  - changing the amount.
- **0b. Saving a corrupted expense corrupts the trip.** The 'undefined' cascade reaches `trip_created`, and the trip vanishes from reports. Fix the cascade: only write the fields actually sent, and never store 'undefined'.
- **0c. An expense whose voucher is already approved must be locked.** Today Trip Expenses checks only the trip's approval, and an edit silently hides the approved payable.
