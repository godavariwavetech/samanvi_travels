var lndmdl = require('../models/laundryModel');
var crypto = require('crypto');

// Same secret + AES-256-ECB / HMAC-SHA256 scheme as fuel + main voucher — this
// endpoint set is called by React's laundryService which wraps writes in
// securePayload. Kept local rather than shared to avoid a cross-module require
// cycle; centralise if a third controller ends up needing it.
var fsecretKey = Buffer.from('KUHClb5flJsboviTKv32bjL4hgjt1ADR', 'utf8');
function decryptPayload(encryptedPayload) {
  var buf = Buffer.from(encryptedPayload, 'base64');
  var decipher = crypto.createDecipheriv('aes-256-ecb', fsecretKey, null);
  decipher.setAutoPadding(false);
  var decrypted = decipher.update(buf, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  var pad = decrypted.charCodeAt(decrypted.length - 1);
  return JSON.parse(decrypted.slice(0, -pad));
}
function validateSignature(encryptedPayload, signature) {
  var calc = crypto.createHmac('sha256', fsecretKey).update(encryptedPayload).digest('hex');
  if (calc !== signature) throw new Error('Invalid signature');
}
function readBody(req) {
  if (req.body && req.body.encryptedPayload) {
    validateSignature(req.body.encryptedPayload, req.body.signature);
    return decryptPayload(req.body.encryptedPayload);
  }
  return req.body || {};
}

function validateVendor(data) {
  var det = data.expensedetails || {};
  if (!det.voucherdate) return 'Contract Date is required';
  var ledger = det.selectedledger;
  if (!ledger || !ledger.id) return 'Vendor Name (ledger) is required';
  if (!det.fromdate) return 'Contract From Date is required';
  if (!det.todate) return 'Contract To Date is required';
  if (new Date(det.fromdate) >= new Date(det.todate)) return 'To Date must be after From Date';
  var products = data.patientsTstdts || [];
  if (products.length === 0) return 'Add at least one product with rate';
  var seen = {};
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    if (!p.d_test_name || !p.d_test_name.product_name) return 'Product name is required for all rows';
    if (p.d_test_amount === undefined || p.d_test_amount === null || p.d_test_amount === '' || Number(p.d_test_amount) < 0) {
      return 'Rate must be zero or greater for all rows';
    }
    // Duplicate product names on the same vendor cause the report grouping to
    // silently overwrite rates — reject here so the client can't sneak past
    // its own duplicate check.
    var key = String(p.d_test_name.product_name).trim().toLowerCase();
    if (seen[key]) return 'Duplicate product: ' + p.d_test_name.product_name + ' — each product can only appear once per vendor';
    seen[key] = true;
  }
  return null;
}

exports.submitlaundrydataCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  var err = validateVendor(data);
  if (err) return res.send({ status: 400, message: err });
  lndmdl.createVendorMdl(data, function (err, results) {
    if (err) { console.error('createVendor failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.updateLaundryDataCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.id) return res.send({ status: 400, message: 'id is required' });
  var err = validateVendor(data);
  if (err) return res.send({ status: 400, message: err });
  lndmdl.updateVendorMdl(data, function (err, results) {
    if (err) { console.error('updateVendor failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.deletelaundryvendorCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.id) return res.send({ status: 400, message: 'id is required' });
  lndmdl.deleteVendorMdl(data, function (err, results) {
    if (err) { console.error('deleteVendor failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getlaundryreportdataCtrl = function (req, res) {
  lndmdl.listVendorsMdl(function (err, results) {
    if (err) { console.error('listVendors failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getlaundrytypemainmastersCtrl = function (req, res) {
  lndmdl.listLaundryProductsMdl(function (err, results) {
    if (err) { console.error('listLaundryProducts failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

// ── Laundry Bill handlers ─────────────────────────────────────────────────

exports.getvendorlistlaundryCtrl = function (req, res) {
  lndmdl.listVendorsForBillMdl(function (err, results) {
    if (err) { console.error('listVendorsForBill failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.SelectedvendordropdownoptionCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.vendor_id) return res.send({ status: 400, message: 'vendor_id is required' });
  lndmdl.getVendorRatesMdl(data, function (err, results) {
    if (err) { console.error('getVendorRates failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

function validateBill(data) {
  var det = data.expensedetails || {};
  if (!det.voucherdate) return 'Bill Date is required';
  if (!data.vendor || !data.vendor.id) return 'Vendor is required';
  var vehicles = data.vehicles || [];
  if (vehicles.length === 0) return 'Add at least one vehicle row';
  var seenVehicles = {};
  var vehicleTotal = 0;
  for (var i = 0; i < vehicles.length; i++) {
    var v = vehicles[i];
    if (!v.vehicle_no) return 'Vehicle is required on all rows';
    // A vehicle can appear at most once per bill — a duplicate silently
    // overwrites in reports; block explicitly at the boundary.
    if (seenVehicles[v.vehicle_no]) return 'Duplicate vehicle: ' + v.vehicle_no + ' — each vehicle can only appear once per bill';
    seenVehicles[v.vehicle_no] = true;
    var rowQty = (v.products || []).reduce(function (s, p) { return s + Number(p.qty || 0); }, 0);
    if (rowQty <= 0) return 'Vehicle ' + v.vehicle_no + ' has no product quantity — enter at least one qty > 0';
    vehicleTotal += (v.products || []).reduce(function (s, p) { return s + Number(p.amount || 0); }, 0);
  }
  var debitSum = (data.patientsTstdts || []).reduce(function (s, r) { return s + Number(r.amount || 0); }, 0);
  var creditSum = (data.creditaddrowdts || []).reduce(function (s, r) { return s + Number(r.amount || 0); }, 0);
  if ((data.patientsTstdts || []).length === 0) return 'Add at least one debit ledger';
  if ((data.creditaddrowdts || []).length === 0) return 'Add at least one credit ledger';
  if (Math.abs(debitSum - creditSum) > 0.01) return 'Debit total (₹' + debitSum.toFixed(2) + ') must equal credit total (₹' + creditSum.toFixed(2) + ')';
  if (Math.abs(debitSum - vehicleTotal) > 0.01) return 'Ledger total (₹' + debitSum.toFixed(2) + ') must equal vehicle bill total (₹' + vehicleTotal.toFixed(2) + ')';
  return null;
}

exports.submitlaundryaddbillCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  var err = validateBill(data);
  if (err) return res.send({ status: 400, message: err });
  lndmdl.createLaundryBillMdl(data, function (err, results) {
    if (err) { console.error('createLaundryBill failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.updateLaundryBillCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.c_number) return res.send({ status: 400, message: 'c_number is required' });
  var err = validateBill(data);
  if (err) return res.send({ status: 400, message: err });
  lndmdl.updateLaundryBillMdl(data, function (err, results) {
    if (err && err.code === 'LOCKED') return res.send({ status: 400, message: err.message });
    if (err) { console.error('updateLaundryBill failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.deletelaundrybillCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.c_number) return res.send({ status: 400, message: 'c_number is required' });
  lndmdl.deleteLaundryBillMdl(data, function (err, results) {
    if (err && err.code === 'LOCKED') return res.send({ status: 400, message: err.message });
    if (err) { console.error('deleteLaundryBill failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getlaundrybilldataCtrl = function (req, res) {
  lndmdl.listLaundryBillsMdl(function (err, results) {
    if (err) { console.error('listLaundryBills failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getlaundrybillsubdataCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.c_number) return res.send({ status: 400, message: 'c_number is required' });
  lndmdl.getLaundryBillDetailsMdl(data, function (err, results) {
    if (err) { console.error('getLaundryBillDetails failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.updatelaundryadminstatusCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.c_number || data.admin_status === undefined) return res.send({ status: 400, message: 'c_number and admin_status are required' });
  lndmdl.updateLaundryBillAdminStatusMdl(data, function (err, results) {
    if (err) { console.error('updateLaundryBillAdminStatus failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};
