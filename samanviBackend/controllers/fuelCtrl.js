var fuelmdl = require('../models/fuelModel');
var crypto = require('crypto');

// Same shared secret + AES-256-ECB / HMAC-SHA256 scheme used by
// submitvoucherentrydataCtrl (mainCtrl.js). Kept local rather than
// re-exported from mainCtrl to avoid a require cycle — the crypto helpers
// there aren't exported. If we ever centralize them, this can drop.
var fsecretKey = Buffer.from('KUHClb5flJsboviTKv32bjL4hgjt1ADR', 'utf8');
function decryptPayload(encryptedPayload) {
  var encryptedBuffer = Buffer.from(encryptedPayload, 'base64');
  var decipher = crypto.createDecipheriv('aes-256-ecb', fsecretKey, null);
  decipher.setAutoPadding(false);
  var decrypted = decipher.update(encryptedBuffer, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  var paddingSize = decrypted.charCodeAt(decrypted.length - 1);
  decrypted = decrypted.slice(0, -paddingSize);
  return JSON.parse(decrypted);
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

// Debit total must equal credit total AND both must equal the fuel bill.
// Enforced server-side even though the UI blocks unbalanced saves — the old
// module let unbalanced entries through and every fuel report drifted.
function validateBalance(data) {
  var debitSum = (data.patientsTstdts || []).reduce(function (s, r) { return s + Number(r.d_test_amount || 0); }, 0);
  var creditSum = (data.creditaddrowdts || []).reduce(function (s, r) { return s + Number(r.creditamount || 0); }, 0);
  var totalBill = Number(data.totalBill || 0);
  if (!(data.patientsTstdts || []).length) return 'At least one debit ledger is required';
  if (!(data.creditaddrowdts || []).length) return 'At least one credit ledger is required';
  if (Math.abs(debitSum - creditSum) > 0.01) return 'Debit total must equal credit total';
  if (Math.abs(debitSum - totalBill) > 0.01) return 'Ledger total must equal fuel bill amount';
  return null;
}

exports.submitfuelentrydataCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  var err = validateBalance(data);
  if (err) return res.send({ status: 400, message: err });
  if (!data.date || !data.vehicleNumber) return res.send({ status: 400, message: 'Date and vehicle number are required' });
  fuelmdl.createFuelEntryMdl(data, function (err, results) {
    if (err) { console.error('createFuelEntry failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.updatefuelenterydataCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.id) return res.send({ status: 400, message: 'id is required' });
  var err = validateBalance(data);
  if (err) return res.send({ status: 400, message: err });
  fuelmdl.updateFuelEntryMdl(data, function (err, results) {
    if (err) { console.error('updateFuelEntry failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.deletefueldataCtrl1 = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.id) return res.send({ status: 400, message: 'id is required' });
  fuelmdl.deleteFuelEntryMdl(data, function (err, results) {
    if (err) { console.error('deleteFuelEntry failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelentrydataCtrl = function (req, res) {
  fuelmdl.listFuelEntriesMdl(function (err, results) {
    if (err) { console.error('listFuelEntries failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelentrysearchdataCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.fromdate || !data.todate) return res.send({ status: 400, message: 'fromdate and todate are required' });
  fuelmdl.searchFuelEntriesMdl(data, function (err, results) {
    if (err) { console.error('searchFuelEntries failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.updatefueladminstatusCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.id || data.admin_status === undefined) return res.send({ status: 400, message: 'id and admin_status are required' });
  fuelmdl.updateFuelAdminStatusMdl(data, function (err, results) {
    if (err) { console.error('updateFuelAdminStatus failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelaccountsdataCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.id) return res.send({ status: 400, message: 'id is required' });
  fuelmdl.getFuelAccountsMdl(data, function (err, results) {
    if (err) { console.error('getFuelAccounts failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

// ── Fuel Target (per-bus) ─────────────────────────────────────────────────
exports.gettargetdataCtrl = function (req, res) {
  fuelmdl.listFuelTargetsMdl(function (err, results) {
    if (err) { console.error('listFuelTargets failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.submittargetCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.bus_no) return res.send({ status: 400, message: 'bus_no is required' });
  if (!data.target_liters || Number(data.target_liters) <= 0) return res.send({ status: 400, message: 'target_liters must be greater than 0' });
  fuelmdl.submitFuelTargetMdl(data, function (err, results) {
    if (err) { console.error('submitFuelTarget failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.editfueltargetCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.id) return res.send({ status: 400, message: 'id is required' });
  if (!data.bus_no) return res.send({ status: 400, message: 'bus_no is required' });
  if (!data.target_liters || Number(data.target_liters) <= 0) return res.send({ status: 400, message: 'target_liters must be greater than 0' });
  fuelmdl.updateFuelTargetMdl(data, function (err, results) {
    if (err) { console.error('updateFuelTarget failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelledgernameCtrl = function (req, res) {
  fuelmdl.listFuelStationsMdl(function (err, results) {
    if (err) { console.error('listFuelStations failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.gettopperormancereportsCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.fromdate || !data.todate) return res.send({ status: 400, message: 'fromdate and todate are required' });
  fuelmdl.listTopPerformersReportMdl(data, function (err, results) {
    if (err) { console.error('listTopPerformersReport failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.gettargetreportsCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.fromdate || !data.todate) return res.send({ status: 400, message: 'fromdate and todate are required' });
  fuelmdl.listTargetReportMdl(data, function (err, results) {
    if (err) { console.error('listTargetReport failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getdrivernameCtrl = function (req, res) {
  fuelmdl.listDriversMdl(function (err, results) {
    if (err) { console.error('listDrivers failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getdriverperormancereportsCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.fromdate || !data.todate) return res.send({ status: 400, message: 'fromdate and todate are required' });
  fuelmdl.listDriverWiseReportMdl(data, function (err, results) {
    if (err) { console.error('listDriverWiseReport failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getbuswisewisereportsCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.fromdate || !data.todate) return res.send({ status: 400, message: 'fromdate and todate are required' });
  fuelmdl.listBusWiseReportMdl(data, function (err, results) {
    if (err) { console.error('listBusWiseReport failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getstationwisereportCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.fromdate || !data.todate) return res.send({ status: 400, message: 'fromdate and todate are required' });
  fuelmdl.listStationWiseReportMdl(data, function (err, results) {
    if (err) { console.error('listStationWiseReport failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.getdaywisereportCtrl = function (req, res) {
  var data = req.body || {};
  if (!data.fromdate) return res.send({ status: 400, message: 'fromdate is required' });
  fuelmdl.listDayWiseReportMdl(data, function (err, results) {
    if (err) { console.error('listDayWiseReport failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};

exports.deletefueltargetCtrl = function (req, res) {
  var data;
  try { data = readBody(req); } catch (e) { return res.status(400).send({ status: 400, message: e.message }); }
  if (!data.id) return res.send({ status: 400, message: 'id is required' });
  fuelmdl.deleteFuelTargetMdl(data, function (err, results) {
    if (err) { console.error('deleteFuelTarget failed:', err); return res.status(500).send({ status: 500, message: err.message }); }
    res.send({ status: 200, data: results });
  });
};
