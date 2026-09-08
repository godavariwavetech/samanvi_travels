var appmdl = require("../models/mainModel");
var jwt = require("jsonwebtoken");
const axios = require("axios");
var masterVldtr = require("../validators/mstrVldt");
const request = require("request");
var fs = require("fs");
var path = require("path");
var moment = require("moment");

// Driver/Staff/Helper document uploads (Aadhar, DL, UPI scans) are written to
// disk and the DB stores a public URL pointing at them. In production this
// app runs alongside a sibling `public_html` folder served by the live web
// server at samanvitravels.in. Outside production that folder doesn't exist,
// so the write silently failed (or wrote nowhere reachable) while the DB
// still recorded the samanvitravels.in URL — the image could never load.
// Fall back to a local folder this app serves itself so uploads work
// wherever the backend runs, without changing production behavior.
// Resolved against process.cwd() (this app is always launched via `node app.js`
// from inside samanviBackend/), matching the original code's relative-path
// behavior exactly — not __dirname, which would be off by a directory level
// since this file lives in controllers/.
var IMAGE_UPLOAD_DIR_PROD = path.join(process.cwd(), "..", "public_html", "dashboardimages", "images");
var IMAGE_UPLOAD_DIR_LOCAL = path.join(process.cwd(), "uploads", "dashboardimages", "images");
var USE_LOCAL_IMAGE_DIR = !fs.existsSync(IMAGE_UPLOAD_DIR_PROD);
if (USE_LOCAL_IMAGE_DIR) fs.mkdirSync(IMAGE_UPLOAD_DIR_LOCAL, { recursive: true });
var IMAGE_UPLOAD_DIR = USE_LOCAL_IMAGE_DIR ? IMAGE_UPLOAD_DIR_LOCAL : IMAGE_UPLOAD_DIR_PROD;
// Derived per-request from the actual host that was hit, not hardcoded — this
// backend has been deployed under more than one domain (e.g. samanviapi.
// godavariwave.com), and a hardcoded domain here silently breaks every image
// URL the moment the deployment domain doesn't match whatever string was typed
// in at the time: the file saves fine, but the URL returned to the browser
// points at a domain that was never serving it, so the <img> just shows broken.
function getImageBaseUrl(req) {
  var origin = req.protocol + "://" + req.get("host");
  return USE_LOCAL_IMAGE_DIR
    ? origin + "/uploads/dashboardimages/images"
    : origin + "/dashboardimages/images";
}
var unirest = require("unirest");
var JWT_SECRET = "7b4743fec0c12eb2da50be672c3988a4";

const OTP_EXPIRY_MINUTES = 5;
const otpStore = new Map(); // Example in-memory store

const schedulecalendarEvent = require("../utils/index");

const crypto = require("crypto");
const { Console } = require("console");

const fsecretKey = Buffer.from("KUHClb5flJsboviTKv32bjL4hgjt1ADR", "utf8");

//decryption code starts
// Decrypt the payload
function validateSignature(encryptedPayload, signature) {
  const calculatedSignature = crypto
    .createHmac("sha256", fsecretKey)
    .update(encryptedPayload)
    .digest("hex");
  if (calculatedSignature !== signature) {
    throw new Error("Invalid signature: Payload has been tampered with.");
  }
}

function decryptPayload(encryptedPayload) {
  try {
    // Decode the Base64-encrypted payload
    const encryptedBuffer = Buffer.from(encryptedPayload, "base64");

    // Decrypt using AES-256/ECB/No Padding
    const decipher = crypto.createDecipheriv("aes-256-ecb", fsecretKey, null); // No IV needed for ECB
    decipher.setAutoPadding(false); // No Padding mode

    let decrypted = decipher.update(encryptedBuffer, "base64", "utf8");
    decrypted += decipher.final("utf8");

    // Remove the padding manually
    const paddingSize = decrypted.charCodeAt(decrypted.length - 1);
    decrypted = decrypted.slice(0, -paddingSize);

    return JSON.parse(decrypted); // Return the parsed JSON
  } catch (error) {
    console.error("Decryption failed:", error.message);
    throw new Error("Failed to decrypt payload");
  }
}

//decryption code ends

exports.getvouchermodaldataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getvouchermodaldataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getdashotpCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;

  try {
    validateSignature(encryptedPayload, signature);
  } catch (e) {
    console.error("Signature validation failed:", e.message);
    return res.send({ status: 400, msg: "Invalid request signature" });
  }

  let data;
  try {
    data = decryptPayload(encryptedPayload);
  } catch (e) {
    console.error("Decryption failed:", e.message);
    return res.send({ status: 400, msg: "Invalid payload" });
  }

  appmdl.check_user_mobilenoMdl(data, function (err, results) {
    if (err) {
      console.log(err, 75);
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    if (results && results.length > 0) {
      var loginotp = "";
      const characters = "ABCDEFGHJKLMNPQRSTWXYZ"; // No numbers here

      for (let i = 0; i < 6; i++) {
        const randomDigit = Math.floor(Math.random() * 9) + 1; // Digits from 1-9
        loginotp += randomDigit;
      }

      console.log(loginotp, "hi");

      otpStore.set(results[0].number, {
        loginotp,
        expiry: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      });

      var message =
        "Samanvi Travels Dashboard " +
        loginotp +
        " is the OTP to complete your login. It is valid for 5 minutes. Please do not share with anyone. Team Amaravathi.";

      // Whatsapp notification start
      // var req = unirest("POST", "https://live-mt-server.wati.io/6023/api/v1/sendTemplateMessages");
      // req.headers({
      //   "postman-token": "1bd5d6f3-15e6-ffd8-4f3a-39fd50d26819",
      //   "cache-control": "no-cache",
      //   "content-type": "application/json",
      //   "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyMDY1MTFmYy1kMDVjLTRkN2YtODQ4ZS1lNGQ4MTQ0YjdjMzIiLCJ1bmlxdWVfbmFtZSI6InNlb0BhbWFyYXZhdGhpc29mdHdhcmUuY29tIiwibmFtZWlkIjoic2VvQGFtYXJhdmF0aGlzb2Z0d2FyZS5jb20iLCJlbWFpbCI6InNlb0BhbWFyYXZhdGhpc29mdHdhcmUuY29tIiwiYXV0aF90aW1lIjoiMDMvMjAvMjAyNSAwNzoxNTo1NCIsInRlbmFudF9pZCI6IjYwMjMiLCJkYl9uYW1lIjoibXQtcHJvZC1UZW5hbnRzIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbIkJST0FEQ0FTVF9NQU5BR0VSIiwiVEVNUExBVEVfTUFOQUdFUiIsIkNPTlRBQ1RfTUFOQUdFUiIsIk9QRVJBVE9SIiwiREVWRUxPUEVSIiwiQVVUT01BVElPTl9NQU5BR0VSIl0sImV4cCI6MjUzNDAyMzAwODAwLCJpc3MiOiJDbGFyZV9BSSIsImF1ZCI6IkNsYXJlX0FJIn0.vLcS44UYt7E2tO0UGmXOa2IWtZIF3svip14LifPw5bc"
      // });

      // req.type("json");
      // req.send({
      //   "template_name": "otp_new_amvt",
      //   "broadcast_name": "string",
      //   "receivers": [
      //     {
      //       "whatsappNumber": "91" + results[0].number,
      //       "customParams": [
      //         {
      //           "name": "1",
      //           "value": loginotp
      //         }
      //       ]
      //     }
      //   ]
      // });
      // req.end(function (res) {
      //   // console.log(res)
      // });

      // const title = "Samanvi Travels Dashboard ";

      // let config = {
      //   method: 'Get',
      //   maxBodyLength: Infinity,
      //   // url: `https://www.amaravathisoftware.com/apdatacenterSMS/?ph=${phonenumber}&onetime=${otp}&title=${title}`,
      //   url: `https://www.amaravathisoftware.com/apdatacenterSMS/sms_service.php?ph=${results[0].number}&onetime=${loginotp}&title=${title}`,

      //   headers: {
      //     'Content-Type': 'application/json'
      //   }
      // };

      // axios.request(config)
      //   .then((response) => {
      //     console.log(JSON.stringify(response.data, 21));
      //   }).catch((error) => {
      //     console.log(error, 22);
      //   });
      res.send({ status: 200 });
    } else {
      res.send({ status: 202, message: "invalid UserName or Password" });
    }
  });
};

exports.getUserDataCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;

  try {
    validateSignature(encryptedPayload, signature);
  } catch (e) {
    console.error("Signature validation failed:", e.message);
    return res.send({ status: 400, msg: "Invalid request signature" });
  }

  let pdata;
  try {
    pdata = decryptPayload(encryptedPayload);
  } catch (e) {
    console.error("Decryption failed:", e.message);
    return res.send({ status: 400, msg: "Invalid payload" });
  }
  var phone = pdata.phone;
  var usr_pwd = pdata.usr_pwd;

  console.log(phone, 176);
  console.log(usr_pwd, 177);

  appmdl.checkUserExistMdl([phone, usr_pwd], function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    if (results && results.length > 0) {
      var usid = results[0].id;
      var department_id = results[0].department_id;
      var department_name = results[0].department_name;
      var role_type = results[0].role_type;
      appmdl.getUserDataMdl(results[0].id, function (err, usrMenu) {
        if (err) {
          res.send({ status: 500, msg: err });
          return;
        }
        usrMenu[1].map((res) => {
          res.submenu = [];
        });
        usrMenu[0].map((res) => {
          var subdata = usrMenu[1].filter((obj) => {
            return obj.module_id == res.id;
          });
          if (subdata.length) {
            res.submenu = subdata;
          } else {
            res.submenu = [];
          }
        });
        //
        const payload = {
          usid,
          department_id,
          department_name,
          role_type,
        };
        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
        res.send({
          status: 200,
          data: usrMenu[0],
          usr_data: results,
          acstkn: accessToken,
        });
        otpStore.delete(phone);
      });
    } else {
      otpStore.delete(phone);
      res.send({ status: 202, message: "Invalid Credentials" });
    }
  });
};
exports.get_user_moduleslist = function (req, res) {
  // var reqdata = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.get_user_moduleslist(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.houseimageeditCtrl = function (req, res) {
  // var reviewArr = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var reviewArr = payload;
  var reviewImgArr = reviewArr.imagedata;
  var imageupload1 = "";
  var array = reviewImgArr[0].reviewimg.split(",");
  var datetimestamp = Date.now();
  var random_number = Math.floor(100000 + Math.random() * 900000);
  var unicnumber = random_number + "" + datetimestamp;
  var base64Data = array[1];
  var filetype = reviewImgArr[0].filetype;
  fs.writeFile(
    "../public_html/uploadfiles/user_profiles/" + unicnumber + "." + filetype,
    base64Data,
    "base64",
    function (err) { }
  );
  imageupload1 =
    "https://amaravathi.it/uploadfiles/user_profiles/" +
    unicnumber +
    "." +
    filetype;

  appmdl.houseimageeditMdl(imageupload1, reviewArr, function (err, imgresults) {
    if (err) {
      res.send({ status: 500, msg: "Data Submitted Failed" });
      return;
    }

    res.send({ status: 200, data: imgresults });
  });
};

exports.getusermainmodulesCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.getusermainmodulesMdl(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    var usermodules = Object.values(
      results.reduce((r, o) => {
        r[o.module_id] = r[o.module_id] || {
          order_by: o.order_by,
          module_id: o.module_id,
          module_nm: o.module_nm,
          main_icon: o.main_icon,
          class: "",
          path: o.path,
          badge: "",
          badgeClass: "",
          isExternalLink: 0,
          subcollopescnd: false,
          checkallstatus: "Un Check All",
          checkallmodules: true,
          submenu: [],
          reportdata: [],
        };
        r[o.module_id]["submenu"].push(o);
        return r;
      }, {})
    );

    res.send({ status: 200, data: usermodules });
  });
};

exports.createuserpermissionsCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var pdata = payload;
  var userdetails = pdata.userdetails;
  var permissionmodules = pdata.permissionmodules;
  var uploadind = pdata.uploadind;
  var document = pdata.document;
  var imageuploadlao = "";
  appmdl.check_user_mobilenoMdl(userdetails, function (err, checkresults) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    if (checkresults && checkresults.length > 0) {
      res.send({ status: 300, message: "User Already Exist" });
    } else {
      if (uploadind == 1) {
        var image_url = document.reviewimg;
        var image_name = document.filename;
        var filetype = document.imgtype;
        var imgcnt = 0;
        var array = image_url.split(",");
        var datetimestamp = Date.now();
        var random_number = Math.floor(100000 + Math.random() * 900000);
        var unicnumber = random_number + "" + datetimestamp;
        var base64Data = array[1];
        fs.writeFile(
          "../public_html/uploadfiles/user_profiles/" +
          unicnumber +
          "." +
          filetype,
          base64Data,
          "base64",
          function (err) { }
        );
        imageuploadlao =
          "https://amaravathi.it/uploadfiles/user_profiles/" +
          unicnumber +
          "." +
          filetype;
      }
      appmdl.addUsers2Mdl(userdetails, imageuploadlao, function (err, results) {
        if (err) {
          //console.log()err);

          res.send({ status: 500, data: results });
          return;
        }
        res.send({ status: 200, data: results });
        var date = moment().utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
        var user_id = results.insertId;
        permissionmodules = permissionmodules.map((obj) => {
          return [
            user_id,
            obj.module_id,
            obj.id,
            obj.entry_by,
            obj.can_add,
            obj.can_edit,
            obj.can_view,
            obj.can_delete,
          ];
        });
        appmdl.postusermenulistMdl(
          permissionmodules,
          user_id,
          function (err, results2) { }
        );

        var req = unirest(
          "POST",
          "https://live-mt-server.wati.io/421987/api/v1/sendTemplateMessages"
        );

        req.headers({
          "postman-token": "7582f32a-780b-bdb7-dc50-704bff9bd850",
          "cache-control": "no-cache",
          "content-type": "application/json",
          authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NjY5MDQwYS03MDQ0LTRiMGYtYjIyNi0wNTY4OTQ2NmVjNGEiLCJ1bmlxdWVfbmFtZSI6ImluZm9AYW1hcmF2YXRoaXNvZnR3YXJlLmNvbSIsIm5hbWVpZCI6ImluZm9AYW1hcmF2YXRoaXNvZnR3YXJlLmNvbSIsImVtYWlsIjoiaW5mb0BhbWFyYXZhdGhpc29mdHdhcmUuY29tIiwiYXV0aF90aW1lIjoiMDMvMjgvMjAyNSAwODo0NTowNiIsInRlbmFudF9pZCI6IjQyMTk4NyIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.zM-vi6y6KhzfFK5X-Sd_yARC1w1zLqEYCt97afpF0Xo",
        });

        req.type("json");
        req.send({
          template_name: "logn_regstr",
          broadcast_name: "string",
          receivers: [
            {
              whatsappNumber: "91" + userdetails.number,
              customParams: [
                {
                  name: "name",
                  value: userdetails.name,
                },
              ],
            },
          ],
        });

        req.end(function (res) { });
      });
    }
  });
};

exports.geteditusermoduleslistCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;

  // Validate the signature - assuming this throws or returns false on failure
  try {
    validateSignature(encryptedPayload, signature);
  } catch (err) {
    return res.status(400).send({ status: 400, message: "Invalid signature" });
  }

  // Decrypt the payload
  const payload = decryptPayload(encryptedPayload);
  const reqdata = payload;

  // Fetch modules and permissions data
  appmdl.geteditusermoduleslistMdl(reqdata, function (err, results) {
    if (err) {
      return res
        .status(500)
        .send({ status: 500, data: null, error: err.message || err });
    }

    const modules = results[0]; // Array of module objects
    const permissions = results[1]; // Array of permission objects

    // Create a lookup map of permissions keyed by sub_module_id for quick access
    const permissionsMap = {};
    permissions.forEach((perm) => {
      permissionsMap[perm.sub_module_id] = perm;
    });

    // Update each module with matching permissions
    modules.forEach((mod) => {
      const perm = permissionsMap[mod.id];
      if (perm) {
        mod.check_sub_menu = 1;
        mod.can_add = perm.can_add;
        mod.can_view = perm.can_view;
        mod.can_edit = perm.can_edit;
        mod.can_delete = perm.can_delete;
      } else {
        // If no matching permissions, ensure defaults (optional)
        mod.check_sub_menu = 0;
        mod.can_add = 0;
        mod.can_view = 0;
        mod.can_edit = 0;
        mod.can_delete = 0;
      }
    });

    // Send back the updated modules list
    res.status(200).send({ status: 200, data: modules });
  });
};

exports.postusermenulistCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var dataarr = payload;

  var user_id = dataarr[0].user_id;
  dataarr = dataarr.map((obj) => {
    return [
      obj.user_id,
      obj.module_id,
      obj.id,
      obj.entry_by,
      obj.can_add,
      obj.can_edit,
      obj.can_view,
      obj.can_delete,
    ];
  });
  appmdl.postusermenulistMdl(dataarr, user_id, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getusermoduleslistCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.getusermoduleslistMdl(reqdata, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.helpdeskcount = function (req, res) {
  appmdl.helpdeskcount(req.body, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.problemdone = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.problemdone(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.submithelpdata = function (req, res) {
  appmdl.submithelpdata(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getdata = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var dataarr = payload;
  appmdl.getdata(dataarr, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getAllUsersCtrl = function (req, res) {
  appmdl.getAllUsersMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

exports.deleteUsersCtrl = function (req, res) {
  var ind = req.params.ind;
  appmdl.deleteUsersMdl(ind, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }

    res.send({ status: 200, data: results });
  });
};

//analysis

exports.getdepartmentDataCtrl = function (req, res) {
  appmdl.getdepartmentDataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.addNewbusnumCtrl = function (req, res) {
  //   var data = req.body;
  //   //console.log()data,491);
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  // //console.log()reqdata,497)
  appmdl.addNewbusnumMdl(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getbussesdataCtrl = function (req, res) {
  appmdl.getbussesdataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getBusHistoryCtrl = function (req, res) {
  var data = req.body;
  appmdl.getBusHistoryMdl(data, function (err, results) {
    if (err) { console.log('[getBusHistory] error:', err); return res.send({ status: 500, data: [] }); }
    res.send({ status: 200, data: results });
  });
};
exports.getTripHistoryCtrl = function (req, res) {
  var data = req.body;
  appmdl.getTripHistoryMdl(data, function (err, results) {
    if (err) { console.log('[getTripHistory] error:', err); return res.send({ status: 500, data: [] }); }
    res.send({ status: 200, data: results });
  });
};
exports.getDriverHistoryCtrl = function (req, res) {
  var data = req.body;
  appmdl.getDriverHistoryMdl(data, function (err, results) {
    if (err) { console.log('[getDriverHistory] error:', err); return res.send({ status: 500, data: [] }); }
    res.send({ status: 200, data: results });
  });
};
exports.getbussessparetankdataCtrl = function (req, res) {
  appmdl.getbussessparetankdataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addservicenumner = function (req, res) {
  //   var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.addservicenumner(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.driverone = function (req, res) {
  //   var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.driverone(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getdriveone = function (req, res) {
  appmdl.getdriveone(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// Builds a human-readable "X already exists" message by comparing the
// submitted data against whichever existing row(s) the check*Mdl duplicate
// query matched, so the frontend can show exactly which field collided
// instead of a generic "already exists".
function buildDuplicateMessage(dupRows, data, fieldMap) {
  var reasons = [];
  dupRows.forEach(function (row) {
    fieldMap.forEach(function (f) {
      var submitted = data[f.dataKey];
      if (submitted && String(row[f.dbKey]) === String(submitted) && reasons.indexOf(f.label) === -1) {
        reasons.push(f.label);
      }
    });
  });
  if (reasons.length === 0) return "A matching record already exists";
  return reasons.join(", ") + (reasons.length > 1 ? " are" : " is") + " already registered to another record";
}

exports.addstaffregisterCtrl = function (req, res) {
  var imageuploadlao = null;
  var imageuploadlaotwo = null;
  var imageuploadlaothree = null;
  var data = req.body;

  // Aadhaar Card Front
  if (data.aadhaarCardFront && data.aadhaarCardFront.reviewimg) {
    var image_url = data.aadhaarCardFront.reviewimg;
    var filetype =
      data.aadhaarCardFront.imgtype == "jfif" ||
        data.aadhaarCardFront.imgtype == "jpg"
        ? "jpeg"
        : data.aadhaarCardFront.imgtype;
    var array = image_url.split(",");
    var datetimestamp = Date.now();
    var random_number = Math.floor(100000 + Math.random() * 900000);
    var unicnumber = random_number + "" + datetimestamp;
    var base64Data = array[1];
    fs.writeFile(
      IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
      base64Data,
      "base64",
      function (err) {
        if (err) {
        }
      }
    );
    imageuploadlao =
      getImageBaseUrl(req) + "/" +
      unicnumber +
      "." +
      filetype;
  }

  // Aadhaar Card Back
  if (data.aadhaarCardBack && data.aadhaarCardBack.reviewimg) {
    var image_url = data.aadhaarCardBack.reviewimg;
    var filetype =
      data.aadhaarCardBack.imgtype == "jfif" ||
        data.aadhaarCardBack.imgtype == "jpg"
        ? "jpeg"
        : data.aadhaarCardBack.imgtype;
    var array = image_url.split(",");
    var datetimestamp = Date.now();
    var random_number = Math.floor(100000 + Math.random() * 900000);
    var unicnumber = random_number + "" + datetimestamp;
    var base64Data = array[1];
    fs.writeFile(
      IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
      base64Data,
      "base64",
      function (err) {
        if (err) {
          //console.log()"Error saving Aadhaar Back image:", err);
        }
      }
    );
    imageuploadlaotwo =
      getImageBaseUrl(req) + "/" +
      unicnumber +
      "." +
      filetype;
  }

  // UPI Scanner
  if (data.upiScanner && data.upiScanner.reviewimg) {
    var image_url = data.upiScanner.reviewimg;
    var filetype =
      data.upiScanner.imgtype == "jfif" || data.upiScanner.imgtype == "jpg"
        ? "jpeg"
        : data.upiScanner.imgtype;
    var array = image_url.split(",");
    var datetimestamp = Date.now();
    var random_number = Math.floor(100000 + Math.random() * 900000);
    var unicnumber = random_number + "" + datetimestamp;
    var base64Data = array[1];
    fs.writeFile(
      IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
      base64Data,
      "base64",
      function (err) {
        if (err) {
          //console.log()"Error saving UPI Scanner image:", err);
        }
      }
    );
    imageuploadlaothree =
      getImageBaseUrl(req) + "/" +
      unicnumber +
      "." +
      filetype;
  }

  console.log(imageuploadlao, imageuploadlaotwo, imageuploadlaothree);

  appmdl.checksaffnameMdl(data, function (err, results1) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }

    if (results1.length == 0) {
      appmdl.addstaffregisterMdl(
        data,
        imageuploadlao,
        imageuploadlaotwo,
        imageuploadlaothree,
        function (err, results) {
          if (err) {
            console.log(err);
            // res.send(500, "Server Error");
            res.status(500).send({ status: 500 });
            return;
          }
          res.send({ status: 200, data: results });
        }
      );
    } else {
      var msg = buildDuplicateMessage(results1, data, [
        { dataKey: "fullName", dbKey: "fullName", label: "Aadhar Name" },
        { dataKey: "mobile", dbKey: "mobile", label: "Mobile Number" },
        { dataKey: "alternativemobilenumber", dbKey: "alternativemobilenumber", label: "Alternate Mobile Number" },
        { dataKey: "aadhaar", dbKey: "aadhaar", label: "Aadhar Number" },
      ]);
      res.send({ status: 422, message: msg, data: results1 });
    }
  });
};

exports.addhelperregisterCtrl = function (req, res) {
  // var data = req.body;
  // //console.log()data, 555);

  var imageuploadlao = null; // For aadhaarCardFront
  var imageuploadlaotwo = null; // For aadhaarCardBack
  var imageuploadlaothree = null; // For upiScanner

  //   const { encryptedPayload, signature } = req.body;
  //   validateSignature(encryptedPayload, signature);
  //   const payload = decryptPayload(encryptedPayload);
  var data = req.body;

  try {
    //   console.log(data, 666)
    // Aadhaar Card Front

    if (data.adharcardfront && data.adharcardfront.reviewimg) {
      var image_url = data.adharcardfront.reviewimg;
      var filetype =
        data.adharcardfront.imgtype == "jfif" ||
          data.adharcardfront.imgtype == "jpg"
          ? "jpeg"
          : data.adharcardfront.imgtype;
      var array = image_url.split(",");
      var datetimestamp = Date.now();
      var random_number = Math.floor(100000 + Math.random() * 900000);
      var unicnumber = random_number + "" + datetimestamp;
      var base64Data = array[1];
      fs.writeFile(
        IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
        base64Data,
        "base64",
        function (err) {
          if (err) {
            //console.log()"Error saving Aadhaar Front image:", err);
          }
        }
      );
      imageuploadlao =
        getImageBaseUrl(req) + "/" +
        unicnumber +
        "." +
        filetype;
    }

    // Aadhaar Card Back
    if (data.adharcardback && data.adharcardback.reviewimg) {
      var image_url = data.adharcardback.reviewimg;
      var filetype =
        data.adharcardback.imgtype == "jfif" ||
          data.adharcardback.imgtype == "jpg"
          ? "jpeg"
          : data.adharcardback.imgtype;
      var array = image_url.split(",");
      var datetimestamp = Date.now();
      var random_number = Math.floor(100000 + Math.random() * 900000);
      var unicnumber = random_number + "" + datetimestamp;
      var base64Data = array[1];
      fs.writeFile(
        IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
        base64Data,
        "base64",
        function (err) {
          if (err) {
            //console.log()"Error saving Aadhaar Back image:", err);
          }
        }
      );
      imageuploadlaotwo =
        getImageBaseUrl(req) + "/" +
        unicnumber +
        "." +
        filetype;
    }

    // UPI Scanner
    if (data.upiscanner && data.upiscanner.reviewimg) {
      var image_url = data.upiscanner.reviewimg;
      var filetype =
        data.upiscanner.imgtype == "jfif" || data.upiscanner.imgtype == "jpg"
          ? "jpeg"
          : data.upiscanner.imgtype;
      var array = image_url.split(",");
      var datetimestamp = Date.now();
      var random_number = Math.floor(100000 + Math.random() * 900000);
      var unicnumber = random_number + "" + datetimestamp;
      var base64Data = array[1];
      fs.writeFile(
        IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
        base64Data,
        "base64",
        function (err) {
          if (err) {
            //console.log()"Error saving UPI Scanner image:", err);
          }
        }
      );
      imageuploadlaothree =
        getImageBaseUrl(req) + "/" +
        unicnumber +
        "." +
        filetype;
    }

    console.log(imageuploadlao, imageuploadlaotwo, imageuploadlaothree);

    appmdl.checkhelpername(data, function (err, results1) {
      if (err) {
        console.log("first  Modal errr");
        res.send({ status: 500, msg: "Server Error" });
        return;
      }
      console.log(results1, 755);
      if (results1.length == 0) {
        console.log("second Modal 757");
        appmdl.addhelperregisterMdl(
          data,
          imageuploadlao,
          imageuploadlaotwo,
          imageuploadlaothree,
          function (err, results) {
            if (err) {
              // res.send(500, "Server Error");
              console.log(err);
              res.status(500).send({ status: 500 });
              return;
            }
            res.send({ status: 200, data: results });
          }
        );
      } else {
        var msg = buildDuplicateMessage(results1, data, [
          { dataKey: "helper_name", dbKey: "helper_name", label: "Aadhar Name" },
          { dataKey: "mobile_number", dbKey: "mobile_number", label: "Mobile Number" },
          { dataKey: "alternate_number", dbKey: "alternate_number", label: "Alternate Mobile Number" },
          { dataKey: "adhar_number", dbKey: "adhar_number", label: "Aadhar Number" },
        ]);
        res.send({ status: 422, message: msg, data: results1 });
      }
    });
  } catch (err) {
    console.log(err);
  }
};

exports.adddriverregisterCtrl = function (req, res) {
  // var data = req.body;
  // //console.log()data, 555);
  //   const { encryptedPayload, signature } = req.body;
  //   validateSignature(encryptedPayload, signature);
  const payload = req.body;

  var data = payload;
  console.log(data, 879);
  var imageuploadlao = null; // For aadhaarCardFront
  var imageuploadlaotwo = null; // For aadhaarCardBack
  var imageuploadlaothree = null;
  var imageuploadlaofour = null;
  var imageuploadlaofive = null;

  // Aadhaar Card Front
  if (data.aadharcardfront && data.aadharcardfront.reviewimg) {
    var image_url = data.aadharcardfront.reviewimg;
    var filetype =
      data.aadharcardfront.imgtype == "jfif" ||
        data.aadharcardfront.imgtype == "jpg"
        ? "jpeg"
        : data.aadharcardfront.imgtype;
    var array = image_url.split(",");
    var datetimestamp = Date.now();
    var random_number = Math.floor(100000 + Math.random() * 900000);
    var unicnumber = random_number + "" + datetimestamp;
    var base64Data = array[1];
    fs.writeFile(
      IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
      base64Data,
      "base64",
      function (err) {
        if (err) {
          //console.log()"Error saving Aadhaar Front image:", err);
        }
      }
    );
    imageuploadlao =
      getImageBaseUrl(req) + "/" +
      unicnumber +
      "." +
      filetype;
  }

  // Aadhaar Card Back
  if (data.aadharcardback && data.aadharcardback.reviewimg) {
    var image_url = data.aadharcardback.reviewimg;
    var filetype =
      data.aadharcardback.imgtype == "jfif" ||
        data.aadharcardback.imgtype == "jpg"
        ? "jpeg"
        : data.aadharcardback.imgtype;
    var array = image_url.split(",");
    var datetimestamp = Date.now();
    var random_number = Math.floor(100000 + Math.random() * 900000);
    var unicnumber = random_number + "" + datetimestamp;
    var base64Data = array[1];
    fs.writeFile(
      IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
      base64Data,
      "base64",
      function (err) {
        if (err) {
          //console.log()"Error saving Aadhaar Back image:", err);
        }
      }
    );
    imageuploadlaotwo =
      getImageBaseUrl(req) + "/" +
      unicnumber +
      "." +
      filetype;
  }

  //dl front
  if (data.dlfront && data.dlfront.reviewimg) {
    var image_url = data.dlfront.reviewimg;
    var filetype =
      data.dlfront.imgtype == "jfif" || data.dlfront.imgtype == "jpg"
        ? "jpeg"
        : data.dlfront.imgtype;
    var array = image_url.split(",");
    var datetimestamp = Date.now();
    var random_number = Math.floor(100000 + Math.random() * 900000);
    var unicnumber = random_number + "" + datetimestamp;
    var base64Data = array[1];
    fs.writeFile(
      IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
      base64Data,
      "base64",
      function (err) {
        if (err) {
          //console.log()"Error saving UPI Scanner image:", err);
        }
      }
    );
    imageuploadlaothree =
      getImageBaseUrl(req) + "/" +
      unicnumber +
      "." +
      filetype;
  }

  if (data.dlback && data.dlback.reviewimg) {
    var image_url = data.dlback.reviewimg;
    var filetype =
      data.dlback.imgtype == "jfif" || data.dlback.imgtype == "jpg"
        ? "jpeg"
        : data.dlback.imgtype;
    var array = image_url.split(",");
    var datetimestamp = Date.now();
    var random_number = Math.floor(100000 + Math.random() * 900000);
    var unicnumber = random_number + "" + datetimestamp;
    var base64Data = array[1];
    fs.writeFile(
      IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
      base64Data,
      "base64",
      function (err) {
        if (err) {
          //console.log()"Error saving UPI Scanner image:", err);
        }
      }
    );
    imageuploadlaofour =
      getImageBaseUrl(req) + "/" +
      unicnumber +
      "." +
      filetype;
  }

  if (data.upiscanner && data.upiscanner.reviewimg) {
    var image_url = data.upiscanner.reviewimg;
    var filetype =
      data.upiscanner.imgtype == "jfif" || data.upiscanner.imgtype == "jpg"
        ? "jpeg"
        : data.upiscanner.imgtype;
    var array = image_url.split(",");
    var datetimestamp = Date.now();
    var random_number = Math.floor(100000 + Math.random() * 900000);
    var unicnumber = random_number + "" + datetimestamp;
    var base64Data = array[1];
    fs.writeFile(
      IMAGE_UPLOAD_DIR + "/" + unicnumber + "." + filetype,
      base64Data,
      "base64",
      function (err) {
        if (err) {
          //console.log()"Error saving UPI Scanner image:", err);
        }
      }
    );
    imageuploadlaofive =
      getImageBaseUrl(req) + "/" +
      unicnumber +
      "." +
      filetype;
  }

  console.log(
    imageuploadlao,
    imageuploadlaotwo,
    imageuploadlaothree,
    imageuploadlaofour,
    imageuploadlaofive,
    875
  );

  appmdl.checknameMdl(data, function (err, results1) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    if (results1.length == 0) {
      appmdl.adddriverregisterMdl(
        data,
        imageuploadlao,
        imageuploadlaotwo,
        imageuploadlaothree,
        imageuploadlaofour,
        imageuploadlaofive,
        function (err, results) {
          if (err) {
            // res.send(500, "Server Error");
            res.status(500).send({ status: 500 });
            return;
          }
          res.send({ status: 200, data: results });
        }
      );
    } else {
      var msg = buildDuplicateMessage(results1, data, [
        { dataKey: "driver_name", dbKey: "driver_name", label: "DL Name" },
        { dataKey: "nickname", dbKey: "nickname", label: "Aadhar Name" },
        { dataKey: "mobile_number", dbKey: "mobile_number", label: "Mobile Number" },
        { dataKey: "alternate_number", dbKey: "alternate_number", label: "Alternate Mobile Number" },
        { dataKey: "aadhar_number", dbKey: "aadhar_number", label: "Aadhar Number" },
        { dataKey: "dl_number", dbKey: "dl_number", label: "DL Number" },
      ]);
      res.send({ status: 422, message: msg, data: results1 });
    }
  });
};

exports.getservicenumberdata = function (req, res) {
  appmdl.getservicenumberdata(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getserviceforreportdropdownCtrl = function (req, res) {
  appmdl.getserviceforreportdropdownMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gethelperCtrl = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.gethelperMdl(reqdata, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
// ── Sold Out / Service Out ────────────────────────────────────────────────────
exports.markBusServiceOutCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.markBusServiceOutMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: results }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.reactivateBusCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.reactivateBusMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: results }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.getServiceOutBusesCtrl = function (req, res) {
  appmdl.getServiceOutBusesMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
// ── Staff Types ──────────────────────────────────────────────────────────────
exports.getStaffTypesCtrl = function (req, res) {
  appmdl.getStaffTypesMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addStaffTypeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addStaffTypeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteStaffTypeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteStaffTypeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.updateStaffTypeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.updateStaffTypeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Vehicle Types ────────────────────────────────────────────────────────────
exports.getVehicleTypesCtrl = function (req, res) {
  appmdl.getVehicleTypesMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addVehicleTypeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addVehicleTypeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteVehicleTypeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteVehicleTypeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Vehicle Companies ────────────────────────────────────────────────────────
exports.getVehicleCompaniesCtrl = function (req, res) {
  appmdl.getVehicleCompaniesMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addVehicleCompanyCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addVehicleCompanyMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteVehicleCompanyCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteVehicleCompanyMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Seating Capacities ────────────────────────────────────────────────────────
exports.getSeatingCapacitiesCtrl = function (req, res) {
  appmdl.getSeatingCapacitiesMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addSeatingCapacityCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addSeatingCapacityMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteSeatingCapacityCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteSeatingCapacityMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Chassis Models ─────────────────────────────────────────────────────────────
exports.getChassisModelsCtrl = function (req, res) {
  appmdl.getChassisModelsMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addChassisModelCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addChassisModelMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteChassisModelCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteChassisModelMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Body Builders ─────────────────────────────────────────────────────────────
exports.getBodyBuildersCtrl = function (req, res) {
  appmdl.getBodyBuildersMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addBodyBuilderCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addBodyBuilderMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteBodyBuilderCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteBodyBuilderMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Luxury Types ─────────────────────────────────────────────────────────────
exports.getLuxuryTypesCtrl = function (req, res) {
  appmdl.getLuxuryTypesMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addLuxuryTypeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addLuxuryTypeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteLuxuryTypeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteLuxuryTypeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Mfg Years ────────────────────────────────────────────────────────────────
exports.getMfgYearsCtrl = function (req, res) {
  appmdl.getMfgYearsMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addMfgYearCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addMfgYearMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteMfgYearCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteMfgYearMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── City List ────────────────────────────────────────────────────────────────
exports.getCityListCtrl = function (req, res) {
  appmdl.getCityListMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addCityListCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addCityListMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteCityListCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteCityListMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Boarding Points ──────────────────────────────────────────────────────────
exports.getBoardingPointsCtrl = function (req, res) {
  appmdl.getBoardingPointsMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addBoardingPointCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addBoardingPointMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteBoardingPointCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteBoardingPointMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Bus Operators ────────────────────────────────────────────────────────────
exports.getBusOperatorsCtrl = function (req, res) {
  appmdl.getBusOperatorsMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addBusOperatorCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addBusOperatorMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteBusOperatorCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteBusOperatorMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Line Codes ───────────────────────────────────────────────────────────────
exports.getLineCodesCtrl = function (req, res) {
  appmdl.getLineCodesMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addLineCodeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addLineCodeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteLineCodeCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteLineCodeMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Route IDs ────────────────────────────────────────────────────────────────
exports.getRouteIdsCtrl = function (req, res) {
  appmdl.getRouteIdsMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addRouteIdCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.addRouteIdMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.deleteRouteIdCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.deleteRouteIdMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Terminate / Rejoin ───────────────────────────────────────────────────────
exports.terminateStaffCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.terminateStaffMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.rejoinStaffCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const data = decryptPayload(encryptedPayload);
  appmdl.rejoinStaffMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.getTerminatedStaffCtrl = function (req, res) {
  appmdl.getTerminatedStaffMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};

exports.deleteDriveroneCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  appmdl.deletedriveoneMdl(payload, function (err, results) {
    if (err) { res.send({ status: 500, data: results }); return; }
    res.send({ status: 200, data: results });
  });
};

exports.deleteservicenumber = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.deleteservicenumber(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.deletedriverdata = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.deletedriverdata(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.deletehelperdata = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.deletehelperdata(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.deletestaffdataCtrl = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  appmdl.deletestaffdataMdl(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

////booking module starts
exports.getaccountantsdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getaccountantsdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.accounttantscleardataCtrl = function (req, res) {
  var data = req.body;
  appmdl.accounttantscleardataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.expensessubmitCtrl = function (req, res) {
  var data = req.body;
  appmdl.expensessubmitMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.cashreceiptsubmit = function (req, res) {
  var data = req.body;
  appmdl.cashreceiptsubmit(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addtoaccountentagentCtrl = function (req, res) {
  var data = req.body;
  appmdl.addtoaccountentagentMdlInsert(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    appmdl.addtoaccountentagentMdlUpdate(data, function (err, results) {
      if (err) {
        res.send({ status: 500, data: results });
        return;
      }
      res.send({ status: 200, data: results });
    });
  });
};

exports.getaccountantanalysisdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getaccountantanalysisdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getcollectionagentCtrl = function (req, res) {
  var data = req.body;
  appmdl.getcollectionagentMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.accountanthistdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.accountanthistdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getvendordataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getvendordataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.accountanthistcheckdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.accountanthistcheckdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.totalincomesourcedataCtrl = function (req, res) {
  var data = req.body;
  appmdl.totalincomesourcedataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.chechwithadditioncountsCtrl = function (req, res) {
  var data = req.body;
  appmdl.chechwithadditioncountsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.totalexpensesdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.totalexpensesdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.chechwithexpenescountsCtrl = function (req, res) {
  var data = req.body;
  appmdl.chechwithexpenescountsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getexpensestochairmanshistoryCtrl = function (req, res) {
  appmdl.getexpensestochairmanshistoryMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.deleteincomsorcedataCtrl = function (req, res) {
  var data = req.body;
  appmdl.deleteincomsorcedataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.aditionalincomesourceCtrl = function (req, res) {
  var data = req.body;
  appmdl.aditionalincomesourceMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getincomesourceCtrl = function (req, res) {
  var data = req.body;
  appmdl.getincomesourceMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.submiteditincomesrcCtrl = function (req, res) {
  var data = req.body;
  appmdl.submiteditincomesrcMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getexpenseslist = function (req, res) {
  appmdl.getexpenseslist(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getbookingsdataCtrl = function (req, res) {
  appmdl.getbookingsdataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.assigntoagentCtrl = function (req, res) {
  var data = req.body;
  appmdl.assigntoagentMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.assigntoamountsCtrl = function (req, res) {
  var data = req.body;
  appmdl.assigntoamountsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.deletedataCtrl = function (req, res) {
  var data = req.body;
  appmdl.deletedataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.uploadexceldataCtrl = function (req, res) {
  var main_data = req.body;
  var data = main_data.masterdata;
  var cnt = 0;
  for (i = 0; i < data.length; i++) {
    appmdl.uploadexceldataMdl(data[i], function (err, results) {
      if (err) {
        res.send(500, "Server Error");
        return;
      }
      cnt++;
      if (cnt == data.length) {
        res.send({ status: 200, data: results });
      }
    });
  }
};
exports.editthedataofadminCtrl = function (req, res) {
  var data = req.body;
  appmdl.editthedataofadminMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.addSamanvidataCntrl = function (req, res) {
  var data = req.body;
  appmdl.checkAlreadyDatedatexts(data, function (err, results) {
    if (err) {
      return res.status(500).send({ status: 500, message: "Database Error" });
    }

    if (!results || results.length !== 0) {
      return res
        .status(400)
        .send({ status: 400, message: "Duplicate entry found" });
    }

    appmdl.addSamanvidataMdl(data, function (err, results) {
      if (err) {
        return res.status(500).send("Server Error / Invalid request type");
      }
      res.status(200).send({ status: 200, data: results });
    });
  });
};
exports.getbookingsdatahisdatewiseCtrl = function (req, res) {
  appmdl.getbookingsdatahisdatewiseMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getbookingselecteddateswiseCtrl = function (req, res) {
  var data = req.body;
  appmdl.getbookingselecteddateswiseMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getcollectionagentdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getcollectionagentdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getaccountantsnamesCtrl = function (req, res) {
  appmdl.getaccountantsnamesMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getcollectionagenanalysisdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getcollectionagenanalysisdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getcollectiondatadatewiseCtrl = function (req, res) {
  var data = req.body;

  appmdl.getcollectiondatadatewiseMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getcollectiondataondatesCtrl = function (req, res) {
  var data = req.body;
  appmdl.getcollectiondataondatesMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getexpensesCtrl = function (req, res) {
  var data = req.body;
  appmdl.getexpensesMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getexpensesreportCtrl = function (req, res) {
  var data = req.body;
  appmdl.getexpensesreportMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.deleteexpensesdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.deleteexpensesdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// exports.addexpensesdetails = function (req, res) {
//   appmdl.adddiagnoptntDtsmmdl(req.body, function (err, results) {
//     if (err || !results || !results.insertId) {
//       return res.status(500).send({
//         status: 500,
//         message: "Failed to add diagnostic patient details.",
//       });
//     }
//     appmdl.adddiagnoptntTstdtsmmdl(
//       results.insertId,
//       req.body,
//       function (err, testDetails) {
//         if (err || !testDetails) {
//           return res.status(500).send({
//             status: 500,
//             message: "Failed to add diagnostic test details.",
//           });
//         }
//         appmdl.adddingcreditmmdl(
//       results.insertId,
//       req.body,
//       function (err, testDetails) {
//         if (err || !testDetails) {
//           return res.status(500).send({
//             status: 500,
//             message: "Failed to add diagnostic test details.",
//           });
//         }
//         appmdl.updatefunction(req.body, function (err, updateResult) {
//           if (err || !updateResult) {
//             return res
//               .status(500)
//               .send({ status: 500, message: "Failed to update function." });
//           }
//           // Send final success response
//           return res.status(200).send({
//             status: 200,
//             message: "Successfully added and updated expenses.",
//             data: updateResult,
//           });
//         });
//       }
//     );
//   });
//     });
// };

// Debit/credit rows arrive shaped for expensive_details (d_test_name/credit_name
// carrying the full ledger object) — reshape into the {ledger_id, ledger_name,
// amount} pairs createTripVoucherMdl/updateTripVoucherMdl expect.
function buildTripVoucherLedgers(body) {
  var debit_ledgers = (body.patientsTstdts || []).map(function (r) {
    var l = r.d_test_name || {};
    return { ledger_id: l.ledger_id, ledger_name: l.temple_name || l.expensives || '', amount: r.d_test_amount };
  });
  var credit_ledgers = (body.credit || []).map(function (r) {
    var l = r.credit_name || {};
    return { ledger_id: l.ledger_id, ledger_name: l.temple_name || l.expensives || '', amount: r.credit_amount };
  });
  return { debit_ledgers: debit_ledgers, credit_ledgers: credit_ledgers };
}

exports.addexpensesdetails = function (req, res) {
  // appmdl.maintripexpenseuniquenoMdl(async function (err, cresults1) {
  //   if (err) {
  //     //console.log()"err " + err);
  //     res.status(500).send("Server Error");
  //     return;
  //   }
  //   let c_id = cresults1[0] ? cresults1[0].c_id : 0;
  //   c_id = c_id * 1 + 1;
  //   const c_number = "TRIP00" + c_id;
  var data = req.body;
  let c_id = data.c_id;
  const c_number = data.c_number;
  console.log(data, c_id, c_number, "addc_number");
  appmdl.adddiagnoptntDtsmmdl(
    c_id,
    c_number,
    req.body,
    function (err, results) {
      if (err || !results || !results.insertId) {
        // The cause used to be swallowed entirely, so a failed filing gave the
        // user (and the log) nothing but "Failed to add...". Surface it.
        console.error('[addexpensesdetails] tripexpenses_data insert failed for ' + c_number + ':', err && (err.sqlMessage || err.message));
        return res.status(500).send({
          status: 500,
          message: "Failed to add diagnostic patient details.",
          detail: err && (err.sqlMessage || err.message) || 'no insertId returned',
        });
      }
      appmdl.adddiagnoptntTstdtsmmdl(
        c_id,
        c_number,
        results.insertId,
        req.body,
        function (err, testDetails) {
          if (err || !testDetails) {
            console.error('[addexpensesdetails] debit rows failed for ' + c_number + ':', err && (err.sqlMessage || err.message));
            return res.status(500).send({
              status: 500,
              message: "Failed to add diagnostic test details.",
              detail: err && (err.sqlMessage || err.message) || 'no result returned',
            });
          }
          appmdl.adddingcreditmmdl(
            c_id,
            c_number,
            results.insertId,
            req.body,
            function (err, testDetails) {
              if (err || !testDetails) {
                console.error('[addexpensesdetails] credit rows failed for ' + c_number + ':', err && (err.sqlMessage || err.message));
                return res.status(500).send({
                  status: 500,
                  message: "Failed to add diagnostic test details.",
                  detail: err && (err.sqlMessage || err.message) || 'no result returned',
                });
              }
              appmdl.updatefunction(
                c_id,
                c_number,
                req.body,
                function (err, updateResult) {
                  if (err || !updateResult) {
                    console.error('[addexpensesdetails] trip_created update failed for ' + c_number + ':', err && (err.sqlMessage || err.message));
                    return res
                      .status(500)
                      .send({
                        status: 500,
                        message: "Failed to update function.",
                        detail: err && (err.sqlMessage || err.message) || 'no result returned',
                      });
                  }
                  var finish = function () {
                    return res.status(200).send({
                      status: 200,
                      message: "Successfully added and updated expenses.",
                      data: updateResult,
                    });
                  };
                  // Post the accounting voucher for this trip's debit/credit
                  // lines, then link it back onto trip_created.voucher_number.
                  // The expense itself already saved fine above, so a voucher
                  // failure here is logged and swallowed rather than failing
                  // the whole request.
                  var ledgers = buildTripVoucherLedgers(req.body);
                  appmdl.createTripVoucherMdl({
                    debit_ledgers: ledgers.debit_ledgers, credit_ledgers: ledgers.credit_ledgers,
                    trip_c_number: c_number,
                    entry_by: (req.body.expensedetails && req.body.expensedetails.named) || '',
                    user_id: (req.body.expensedetails && req.body.expensedetails.user_id) || 0,
                  }, function (voucherErr, voucherNumber) {
                    if (voucherErr) {
                      console.error('[createTripVoucherMdl] failed for trip ' + c_number + ':', voucherErr.message);
                      return finish();
                    }
                    if (!voucherNumber) return finish();
                    appmdl.setTripVoucherNumberMdl(c_number, voucherNumber, finish);
                  });
                }
              );
            }
          );
        }
      );
    }
  );
  // });
};

exports.updateexpensesdetailsCtrl = function (req, res) {
  appmdl.deletetripexpensesMdl(req.body, function (err, cresults1) {
    if (err) {
      //console.log()"err " + err);
      res.status(500).send("Server Error");
      return;
    }
    let c_id = cresults1[0] ? cresults1[0].c_id : 0;
    c_id = c_id * 1 + 1;
    const c_number = "TRIP00" + c_id;
    appmdl.updateadddiagnoptntDtsmmdl(
      c_id,
      c_number,
      req.body,
      function (err, results) {
        if (err || !results || !results.insertId) {
          return res.status(500).send({
            status: 500,
            message: "Failed to add diagnostic patient details.",
          });
        }
        appmdl.updateadddiagnoptntTstdtsmmdl(
          c_id,
          c_number,
          results.insertId,
          req.body,
          function (err, testDetails) {
            if (err || !testDetails) {
              return res.status(500).send({
                status: 500,
                message: "Failed to add diagnostic test details.",
              });
            }
            appmdl.updateadddingcreditmmdl(
              c_id,
              c_number,
              results.insertId,
              req.body,
              function (err, testDetails) {
                if (err || !testDetails) {
                  return res.status(500).send({
                    status: 500,
                    message: "Failed to add diagnostic test details.",
                  });
                }
                appmdl.editupdatefunction(
                  c_id,
                  c_number,
                  req.body,
                  function (err, updateResult) {
                    if (err || !updateResult) {
                      return res
                        .status(500)
                        .send({
                          status: 500,
                          message: "Failed to update function.",
                        });
                    }
                    var finish = function () {
                      return res.status(200).send({
                        status: 200,
                        message: "Successfully added and updated expenses.",
                        data: updateResult,
                      });
                    };
                    // The trip's own c_number is stable across edits (it's what
                    // deletetripexpensesMdl above superseded the old row by) —
                    // NOT the `c_number` in this closure, which is freshly minted
                    // for the new tripexpenses_data row on every edit. Re-filing
                    // replaces an existing voucher's lines instead of piling up
                    // a new voucher each time.
                    var tripCNumber = req.body.c_number;
                    var ledgers = buildTripVoucherLedgers(req.body);
                    appmdl.getTripVoucherNumberMdl(tripCNumber, function (vErr, vRows) {
                      var existingVoucher = (!vErr && vRows && vRows[0] && vRows[0].voucher_number) || null;
                      // Re-filed with nobody paid through the books: the
                      // expense is saved above and no voucher is posted. One
                      // from an earlier filing is retired rather than left
                      // standing with no lines.
                      if (ledgers.debit_ledgers.length === 0 && ledgers.credit_ledgers.length === 0) {
                        if (!existingVoucher) return finish();
                        return appmdl.voidTripVoucherMdl(existingVoucher, tripCNumber, function (vdErr) {
                          if (vdErr) console.error('[voidTripVoucherMdl] failed for trip ' + tripCNumber + ':', vdErr.message);
                          finish();
                        });
                      }
                      if (existingVoucher) {
                        appmdl.updateTripVoucherMdl({
                          voucher_number: existingVoucher, trip_c_number: tripCNumber,
                          debit_ledgers: ledgers.debit_ledgers, credit_ledgers: ledgers.credit_ledgers,
                          user_id: req.body.updatedby_id || 0,
                        }, function (uErr) {
                          if (uErr) console.error('[updateTripVoucherMdl] failed for trip ' + tripCNumber + ':', uErr.message);
                          finish();
                        });
                        return;
                      }
                      appmdl.createTripVoucherMdl({
                        debit_ledgers: ledgers.debit_ledgers, credit_ledgers: ledgers.credit_ledgers,
                        trip_c_number: tripCNumber,
                        entry_by: req.body.updatedby_nm || '', user_id: req.body.updatedby_id || 0,
                      }, function (cErr, voucherNumber) {
                        if (cErr) {
                          console.error('[createTripVoucherMdl] failed for trip ' + tripCNumber + ':', cErr.message);
                          return finish();
                        }
                        if (!voucherNumber) return finish();
                        appmdl.setTripVoucherNumberMdl(tripCNumber, voucherNumber, finish);
                      });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

exports.deleteexpenseCtrl = function (req, res) {
  var data = req.body;
  appmdl.deleteexpenseMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getexpensesfiltere = function (req, res) {
  var data = req.body;
  appmdl.getexpensesfiltere(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getexpensesreportsfiltereCtrl = function (req, res) {
  var data = req.body;
  appmdl.getexpensesreportsfiltereMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelentrysearchdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getfuelentrysearchdataMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getbusseraching = function (req, res) {
  var data = req.body;
  appmdl.getbusseraching(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getaccountantanalysisdatas = function (req, res) {
  var data = req.body;
  appmdl.getaccountantanalysisdatas(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getserviceseraching = function (req, res) {
  var data = req.body;
  appmdl.getserviceseraching(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getpatientDiagnosticTestsCtrl = function (req, res) {
  appmdl.getpatientDiagnosticTestsmmdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addledgerpostdataCtrl = function (req, res) {
  var data = req.body;
  //console.log()data, 1319);
  // const { encryptedPayload, signature } = req.body;
  // validateSignature(encryptedPayload, signature);
  // const payload = decryptPayload(encryptedPayload);
  // var reqdata = payload;
  // //console.log()reqdata,497)
  appmdl.addledgerpostmaindataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    var p_id = results.insertId;
    appmdl.addledgerpostsubdataMdl(data, p_id, function (err, results) {
      if (err) {
        res.send({ status: 500, data: results });
        return;
      }
      res.send({ status: 200, data: results });
    });
  });
};
exports.addprofitlosspostdataCtrl = function (req, res) {
  var data = req.body;
  //console.log()data, 1375);

  // Check if childdata is NULL or undefined or empty
  if (
    data.childdata === "NULL" ||
    data.childdata === "null" ||
    data.childdata === "" ||
    data.childdata === "undefined" ||
    data.childdata === undefined
  ) {
    // If no child data, proceed with the main data insertion
    //console.log()data, 1319);

    // Add main profit loss data
    appmdl.addprofitlosspostmaindataMdl(data, function (err, results) {
      if (err) {
        res.send({ status: 500, data: err });
        return;
      }

      // On successful insertion, retrieve the inserted main ID (p_id)
      var p_id = results.insertId;

      // Insert the sub data related to the main data
      appmdl.addprofitlosspostsubdataMdl(data, p_id, function (err, results) {
        if (err) {
          res.send({ status: 500, data: err });
          return;
        }

        // Respond with a success status and the inserted sub-data results
        res.send({ status: 200, data: results });
      });
    });
  } else {
    // If childdata is provided, insert sub data first
    var p_id = data.main_id || null; // Retrieve p_id from main_id or set to null if not present
    // Insert child data after sub data is inserted
    appmdl.addprofitlosspostsubdatachildMdl(
      data,
      p_id,
      function (err, results) {
        if (err) {
          res.send({ status: 500, data: err });
          return;
        }
        // Send the success response for child data insertion
        res.send({ status: 200, data: results });
      }
    );
  }
};

exports.getassetsdropdownCtrl = function (req, res) {
  var data = req.body;
  appmdl.getassetsdropdownMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addassetpostdataCtrl = function (req, res) {
  //   var data = req.body;
  //   //console.log()data,491);
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  // //console.log()reqdata,497)
  appmdl.addassetpostdataMdl(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.selectedassetdropdowndataCtrl = function (req, res) {
  var data = req.body;
  appmdl.selectedassetdropdowndataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getliablitiesdropdownCtrl = function (req, res) {
  appmdl.getliablitiesdropdownMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addliablitypostdataCtrl = function (req, res) {
  //   var data = req.body;
  //   //console.log()data,491);
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  // //console.log()reqdata,497)
  appmdl.addliablitypostdataMdl(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.addincomepostdataCtrl = function (req, res) {
  //   var data = req.body;
  //   //console.log()data,491);
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  // //console.log()reqdata,497)
  appmdl.addincomepostdataMdl(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.addexpensepostdataCtrl = function (req, res) {
  //   var data = req.body;
  //   //console.log()data,491);
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var reqdata = payload;
  // //console.log()reqdata,497)
  appmdl.addexpensepostdataMdl(reqdata, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getincomedropdownCtrl = function (req, res) {
  var data = req.body;
  appmdl.getincomedropdownMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.selectedprofitsdropdowndataCtrl = function (req, res) {
  var data = req.body;
  appmdl.selectedprofitsdropdowndataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.selectedprofitsdropdownmaindatagetchildCtrl = function (req, res) {
  var data = req.body;
  appmdl.selectedprofitsdropdownmaindatagetchildMdl(
    data,
    function (err, results) {
      if (err) {
        res.send({ status: 500, data: results });
        return;
      }
      res.send({ status: 200, data: results });
    }
  );
};
exports.subchildselectedprofitsdropdownmaindatagetchildCtrl = function (
  req,
  res
) {
  var data = req.body;
  appmdl.subchildselectedprofitsdropdownmaindatagetchildMdl(
    data,
    function (err, results) {
      if (err) {
        res.send({ status: 500, data: results });
        return;
      }
      res.send({ status: 200, data: results });
    }
  );
};
exports.getexpensesdropdownCtrl = function (req, res) {
  appmdl.getexpensesdropdownMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getallstfdrivhelpCtrl = function (req, res) {
  appmdl.getallstfdrivhelpMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.alldistrictsgetctrl = function (req, res) {
  appmdl.alldistrictsgetmdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.postdistrictsdatactrl = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.Duplicatecheckdistrictsmdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    if (results.length == 0) {
      appmdl.postdistrictsdatamdl(data, function (err, results) {
        if (err) {
          res.send({ status: 500, data: results });
          return;
        }
        res.send({ status: 200, data: results });
      });
    } else {
      res.send({ status: 250, message: "This Master Name Already Existed" });
    }
  });
};

exports.dltdistrictsdatactrl = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.dltdistrictsdatamdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.editdistrictsdatactrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try { validateSignature(encryptedPayload, signature); } catch (e) {
    return res.send({ status: 400, msg: "Invalid request signature" });
  }
  let data;
  try { data = decryptPayload(encryptedPayload); } catch (e) {
    return res.send({ status: 400, msg: "Invalid payload" });
  }
  appmdl.editdistrictsdatamdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.submitMandalsDataCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.DuplicatecheckMandalsmdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    if (results.length == 0) {
      appmdl.submitMandalsDataMdl(data, function (err, results) {
        if (err) {
          res.send({ status: 500, msg: "Server Error" });
          return;
        }
        res.send({ status: 200, data: results });
      });
    } else {
      res.send({ status: 250, message: "This Master Group Already Existed" });
    }
  });
};
exports.getallmandaldataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getallmandaldataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.editmandalsctrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.editmandalsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.deletemandalsCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.deletemandalsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getallchilddatadataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getallchilddatadataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
//Villages

exports.submitVillagesDataCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.Duplicatecheckvillagesmdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    if (results.length == 0) {
      appmdl.submitVillagesDataMdl(data, function (err, results) {
        if (err) {
          res.send({ status: 500, msg: "Server Error" });
          return;
        }
        res.send({ status: 200, data: results });
      });
    } else {
      res.send({
        status: 250,
        message: "This Master Sub Type Already Existed",
      });
    }
  });
};
exports.getallvillagedataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getallvillagedataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.editvillagesctrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.editvillagesmdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.deletevillagesCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.deletevillagesMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getallTemplesdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getallTemplesdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.editTemplesCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.editTemplesMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.submitTemplesCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.Duplicatechecktemplesmdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    if (results.length == 0) {
      appmdl.submitTemplesMdl(data, function (err, results) {
        if (err) {
          res.send({ status: 500, msg: "Server Error" });
          return;
        }
        res.send({ status: 200, data: results });
      });
    } else {
      res.send({
        status: 250,
        message: "This Master Sub Child Already Existed",
      });
    }
  });
};

exports.deletetempleCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.deletetempleMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.submitfinaldataCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.submitfinaldataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getmainallchilddatadataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getmainallchilddatadataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getmainmasterchildsubseconddataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getmainmasterchildsubseconddataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.submitsubchildtwomainmastersCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.Duplicatechecksubchildtwomainmastermdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    if (results.length == 0) {
      appmdl.submitsubchildtwomainmastersMdl(data, function (err, results) {
        if (err) {
          res.send({ status: 500, msg: "Server Error" });
          return;
        }
        res.send({ status: 200, data: results });
      });
    } else {
      res.send({ status: 250, message: "This Ledger Name Already Existed" });
    }
  });
};
exports.getsubchildtworeportdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getsubchildtworeportdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getledgerdatadropdownCtrl = function (req, res) {
  appmdl.getledgerdatadropdownMdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getexpensetripledgerdataCtrl = function (req, res) {
  appmdl.getexpensetripledgerdataMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.SelectdatagetfinaltranscationsreportCtrl = function (req, res) {
  // The app sends this report's filter encrypted (securePayload). The wrapper
  // used to be handed to the model as-is, so fromdate / todate were never
  // seen and every caller - Balance Sheet, Group Wise, Profit & Loss - got
  // all-time totals whatever range it asked for. Decrypt when the wrapper is
  // present; a plain body is accepted as before.
  var data = req.body;
  if (data && data.encryptedPayload) {
    try {
      validateSignature(data.encryptedPayload, data.signature);
      data = decryptPayload(data.encryptedPayload);
    } catch (e) {
      console.error('[transactions report] bad payload:', e.message);
      return res.send({ status: 400, msg: 'Invalid request payload' });
    }
  }
  appmdl.SelectdatagetfinaltranscationsreportMdl(data, function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getLedgerWiseReportCtrl = function (req, res) {
  var data = req.body;
  appmdl.getLedgerWiseReportMdl(data, function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getallemployeesdropdownvoucherentryCtrl = function (req, res) {
  appmdl.getallemployeesdropdownvoucherentryMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

///sudheer code starts
exports.driverdata = function (req, res) {
  appmdl.driverdata(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.tripcreated = function (req, res) {
  var data = req.body;
  console.log(data, data.id, "id check");

  appmdl.maintripexpenseuniquenoMdl(async function (err, cresults1) {
    if (err) {
      //console.log()"err " + err);
      res.status(500).send("Server Error");
      return;
    }
    let c_id = cresults1[0] ? cresults1[0].c_id : 0;
    c_id = c_id * 1 + 1;
    const c_number = "TRIP00" + c_id;

    appmdl.tripcreated(c_id, c_number, data, function (err, results) {
      if (err) {
        console.log(err);
        res.send({ status: 500, data: results });
        return;
      }
      // The model answers a bus already out that day as a conflict, not an
      // error, and nothing was written, so the expense-row cascade below must
      // not run either; the screen names the trip that has the bus.
      if (results && results.conflict) { res.send({ status: 409, msg: results.conflict }); return; }
      if (data.type == "edit") {
        console.log("edited Stareted");
        appmdl.updatetripcreated(data, function (err, results) {
          if (err) {
            // res.send(500, "Server Error");
            res.status(500).send(err);
            return;
          }
          res.send({ status: 200, data: results });
        });
      } else {
        res.send({ status: 200, data: results });
      }
    });
  });
};

exports.bulkCreateTripsCtrl = function (req, res) {
  var data = req.body;
  appmdl.bulkCreateTripsMdl(data.trip_date, data.rows, data.user_id, data.usr_nm, function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, data: null });
      return;
    }

    var candidates = (results && results.voucherCandidates) || [];
    if (candidates.length === 0) {
      res.send({ status: 200, data: results });
      return;
    }

    // Post one Journal voucher per qualifying row, sequentially (createTripVoucherMdl
    // mints c_number from today's mainvoucher_t count, so overlapping calls could
    // collide) — mirrors the Garage/Battery "create record, then conditionally post
    // voucher, then link it back" sequence. Each candidate carries its own
    // debit AND credit ledger now (both pickable per row on the frontend).
    var ci = 0;
    var postNext = function () {
      if (ci >= candidates.length) { res.send({ status: 200, data: results }); return; }
      var cand = candidates[ci];
      appmdl.createTripVoucherMdl({
        debit_ledgers: [{ ledger_id: cand.debit_ledger_id, ledger_name: cand.debit_ledger_name, amount: cand.amount }],
        credit_ledgers: [{ ledger_id: cand.credit_ledger_id, ledger_name: cand.credit_ledger_name, amount: cand.amount }],
        trip_c_number: cand.c_number, entry_by: data.usr_nm, user_id: data.user_id,
      }, function (voucherErr, voucherNumber) {
        if (voucherErr) {
          console.error('[createTripVoucherMdl] failed for trip ' + cand.c_number + ':', voucherErr.message);
          ci++; postNext();
          return;
        }
        appmdl.setTripVoucherNumberMdl(cand.c_number, voucherNumber, function () {
          ci++; postNext();
        });
      });
    };
    postNext();
  });
};

exports.deletetripcreatedCtrl = function (req, res) {
  appmdl.deletetripcreatedMdl(req.body, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettripceated = function (req, res) {
  appmdl.gettripceated(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettripceated1Ctrl = function (req, res) {
  appmdl.gettripceated1Mdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getvoucherentrydataCtrl = function (req, res) {
  appmdl.getvoucherentrydataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.submitvoucherentrydataCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  const data = decryptPayload(encryptedPayload);
  const voucherDate = data.expensedetails?.voucherdate || moment().format('YYYY-MM-DD');
  appmdl.voucherCountByDateMdl(voucherDate, async function (err, cresults1) {
    if (err) {
      //console.log()"err " + err);
      res.status(500).send("Server Error");
      return;
    }
    const todayCount = cresults1[0] ? cresults1[0].cnt * 1 : 0;
    const datePart = moment(voucherDate, 'YYYY-MM-DD').format('YYMMDD');
    const c_number = `V${datePart}${String(todayCount + 1).padStart(3, '0')}`;
    const c_id = todayCount + 1;
    // Step 1: Insert into main table
    appmdl.submitvoucherentrymaindata(
      c_number,
      c_id,
      data,
      function (err, results) {
        if (err) {
          console.error("Main insert failed:", err);
          return res
            .status(500)
            .json({ status: false, message: "Failed to insert main data" });
        }
        var p_id = results.insertId;
        // Step 2: Insert into sub table
        //for adding credit rows of data
        appmdl.submitvoucherentrysubtable(
          c_number,
          c_id,
          data,
          p_id,
          function (err, results) {
            if (err) {
              console.error("Sub insert failed:", err);
              return res
                .status(500)
                .json({ status: false, message: "Failed to insert sub data" });
            }
            //for adding debit rows of data
            appmdl.submitvoucherentrysubtableseconddata(
              c_number,
              c_id,
              data,
              p_id,
              function (err, results) {
                if (err) {
                  console.error("Sub insert failed:", err);
                  return res
                    .status(500)
                    .json({
                      status: false,
                      message: "Failed to insert sub data",
                    });
                }
                appmdl.insertVoucherAuditMdl({
                  c_number: c_number,
                  action: 'created',
                  action_by_id: data.user_id || '',
                  action_by_name: data.named || '',
                  changes_note: `Voucher created: ${data.expensedetails?.vouchertype?.voucher_type || ''}, Date: ${data.expensedetails?.voucherdate || ''}`
                }, function() {});
                res.send({ status: 200, data: results });
              }
            );
          }
        );
      }
    );
  });
  //   });
  // });
};

exports.deletevoucherentryCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  const data = decryptPayload(encryptedPayload);
  appmdl.deletevouchertypebill2(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.updatevoucherentryCtrl = function (req, res) {
  try {
    const { encryptedPayload, signature } = req.body;
    const data = decryptPayload(encryptedPayload);
    const c_number = data.c_number;
    const c_id = parseInt((c_number || '').replace(/\D/g, '')) || 0;
    console.log('[updatevoucherentry] c_number:', c_number, '| vouchertype:', data.expensedetails?.vouchertype?.voucher_type);
    appmdl.deletevouchertypebill(data, function (err) {
      if (err) {
        console.error('[updatevoucherentry] deletevouchertypebill failed:', err);
        return res.status(500).json({ status: 500, message: err.message || 'Delete step failed' });
      }
      appmdl.updatesubmitvoucherentrymaindata(c_number, c_id, data, function (err, results) {
        if (err) {
          console.error('[updatevoucherentry] main insert failed:', err);
          return res.status(500).json({ status: 500, message: err.message || 'Main insert failed' });
        }
        var p_id = results.insertId;
        appmdl.updatesubmitvoucherentrysubtable(c_number, c_id, data, p_id, function (err) {
          if (err) {
            console.error('[updatevoucherentry] sub table failed:', err);
            return res.status(500).json({ status: 500, message: err.message || 'Sub table insert failed' });
          }
          appmdl.updatesubmitvoucherentrysubtableseconddata(c_number, c_id, data, p_id, function (err, results) {
            if (err) {
              console.error('[updatevoucherentry] sub table 2 failed:', err);
              return res.status(500).json({ status: 500, message: err.message || 'Sub table 2 insert failed' });
            }
            const changesNote = data.changes_note || `Voucher updated by ${data.named || ''}`;
            appmdl.insertVoucherAuditMdl({
              c_number, action: 'edited',
              action_by_id: data.user_id || '', action_by_name: data.named || '',
              changes_note: changesNote
            }, function () {});
            res.send({ status: 200, data: results });
          });
        });
      });
    });
  } catch (e) {
    console.error('[updatevoucherentry] exception:', e.message);
    res.status(500).json({ status: 500, message: e.message });
  }
};

exports.getvouchertypedatactrl = function (req, res) {
  appmdl.getvouchertypedatamdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.submitvouchertypectrl = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  // appmdl.Duplicatecheckdistrictsmdl(data, function (err, results) {
  //   if (err) {
  //     res.send({ status: 500, data: results });
  //     return;
  //   }
  //   if (results.length == 0) {
  appmdl.submitvouchertypemdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
  // } else {
  //   res.send({ status: 250, message: "This Master Name Already Existed" });
  // }

  // });
};

exports.editvouchernamectrl = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.editvouchernamemdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.deletevouchernamectrl = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.deletevouchernamemdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.updatevoucherentrystatusCtrl = function (req, res) {
  try {
    const { encryptedPayload, signature } = req.body;
    const data = decryptPayload(encryptedPayload);
    if (!data.voucherdata || !data.voucherdata.c_number) {
      return res.status(400).json({ status: 400, message: 'Missing voucherdata.c_number' });
    }
    appmdl.updatevoucherentrystatusMdl(data, function (err, results) {
      if (err) {
        console.error('updatevoucherentrystatusMdl db error:', err);
        return res.status(500).json({ status: 500, message: 'DB error' });
      }
      const action = data.vouchervalue == '1' ? 'approved' : data.vouchervalue == '0' ? 'reopened' : 'rejected';
      const changesNote = action === 'rejected' && data.rejection_reason
        ? `Rejection reason: ${data.rejection_reason}`
        : '';
      const finish = () => {
        appmdl.insertVoucherAuditMdl({
          c_number: data.voucherdata.c_number,
          action: action,
          action_by_id: data.admin_status_by_id || '',
          action_by_name: data.admin_status_by_name || '',
          changes_note: changesNote
        }, function() {});
        res.send({ status: 200, data: results });
      };
      if (action === 'rejected') {
        // A rejected voucher never took effect, so any payables transactions
        // it had settled (payment/balance/payables_settled_by) need to revert
        // to unpaid — otherwise those amounts stay marked as paid forever even
        // though the payment voucher that "paid" them was rejected. No-ops
        // harmlessly for non-payables vouchers (nothing to match).
        appmdl.unsettlePayablesRowsMdl(data.voucherdata.c_number, data.admin_status_by_id, data.admin_status_by_name, function (err) {
          if (err) console.error('[updatevoucherentrystatus] unsettlePayablesRowsMdl failed:', err);
          finish();
        });
      } else {
        finish();
      }
    });
  } catch (e) {
    console.error('updatevoucherentrystatusCtrl exception:', e.message);
    res.status(500).json({ status: 500, message: e.message });
  }
};

exports.getVoucherAuditCtrl = function (req, res) {
  const c_number = req.params.c_number;
  appmdl.getVoucherAuditMdl(c_number, function (err, results) {
    if (err) {
      return res.status(500).json({ status: 500, message: 'DB error' });
    }
    res.send({ status: 200, data: results });
  });
};

exports.updatelaundrybillCtrl = function (req, res) {
  const data = req.body;
  console.log(data, data[0].c_number, "data");
  const c_number = data[0].c_number;
  const c_id = data[0].c_id;

  // Step 1: Set d_in = 1 for all matching main records
  appmdl.setLaundrybillMainInactive(c_number, function (err, mainUpdateResult) {
    if (err)
      return res
        .status(500)
        .json({ status: false, message: "Failed to update main d_in" });

    // Step 2: Set d_in = 1 for all matching sub records
    appmdl.setLaundrySubbillMainInactive(
      c_number,
      function (err, subUpdateResult) {
        if (err)
          return res
            .status(500)
            .json({ status: false, message: "Failed to update sub d_in" });

        // Step 3: Insert new records (like submit)
        appmdl.updatelaundrybillmaindata(
          c_number,
          c_id,
          data,
          function (err, insertMainRes) {
            if (err)
              return res
                .status(500)
                .json({ status: false, message: "Failed to insert main data" });
            var p_id = insertMainRes.insertId;

            appmdl.updatelaundrybillsubtable(
              c_number,
              c_id,
              data,
              p_id,
              function (err, insertSubRes) {
                if (err)
                  return res
                    .status(500)
                    .json({
                      status: false,
                      message: "Failed to insert sub data",
                    });

                appmdl.updatelaundrysubtableseconddata(
                  c_number,
                  c_id,
                  data,
                  p_id,
                  function (err, insertSecSubRes) {
                    if (err)
                      return res
                        .status(500)
                        .json({
                          status: false,
                          message: "Failed to insert second sub data",
                        });
                    res.send({ status: 200, data: insertSecSubRes });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

exports.updatetripadminstatusCtrl = function (req, res) {
  appmdl.updatetripadminstatusMdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.updatefueladminstatusCtrl = function (req, res) {
  appmdl.updatefueladminstatusMdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.updatelaundryadminstatusCtrl = function (req, res) {
  appmdl.updatelaundryadminstatusMdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.deletelaundrybillCtrl = function (req, res) {
  appmdl.deletelaundrybillMdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getbetaCtrl = function (req, res) {
  var data = req.body;
  appmdl.getbetaMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// Halt Beta is one company-wide amount (app_settings.halt_beta), applied to
// every crew member on any service marked Halt.
exports.gethaltbetaCtrl = function (req, res) {
  appmdl.gethaltbetaMdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: { halt_beta: (results && results[0] && results[0].setting_value) || "" } });
  });
};

exports.savehaltbetaCtrl = function (req, res) {
  appmdl.savehaltbetaMdl(req.body, function (err) {
    if (err) {
      res.send({ status: 500, msg: err.message || "Server Error" });
      return;
    }
    res.send({ status: 200, msg: "Halt beta saved" });
  });
};

exports.getmodaldataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getmodaldataMdl(data, function (err, results) {
    if (err) {
      console.log(err, "err");

      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettripdeletedmodaldataCtrl = function (req, res) {
  var data = req.body;
  appmdl.gettripdeletedmodaldataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.submitlaundrytypemainmastersCtrl = function (req, res) {
  // var data = req.body;
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);
  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.submitlaundrytypemainmastersMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getlaundrytypemainmastersCtrl = function (req, res) {
  appmdl.getlaundrytypemainmastersMdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.deletefueldataCtrl1 = function (req, res) {
  // console.log(req.body,2570)
  appmdl.deletefueldataMdl1(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.submitlaundrydataCtrl = function (req, res) {
  var data = req.body;
  appmdl.submitlaundrydataMdlreferencenumber(async function (err, cresults1) {
    if (err) {
      //console.log()"err " + err);
      res.status(500).send("Server Error");
      return;
    }
    let c_id = cresults1[0] ? cresults1[0].c_id : 0;
    c_id = c_id * 1 + 1;
    const c_number = "REF00" + c_id;
    // Step 1: Insert into main table
    appmdl.submitlaundrymaindata(c_number, c_id, data, function (err, results) {
      if (err) {
        console.error("Main insert failed:", err);
        return res
          .status(500)
          .json({ status: false, message: "Failed to insert main data" });
      }
      var p_id = results.insertId;
      // Step 2: Insert into sub table
      appmdl.submitlaundrysubtable(
        c_number,
        c_id,
        data,
        p_id,
        function (err, results) {
          if (err) {
            console.error("Sub insert failed:", err);
            return res
              .status(500)
              .json({ status: false, message: "Failed to insert sub data" });
          }

          res.send({ status: 200, data: results });
        }
      );
    });
  });
  // });
  //   });
  // });
};

exports.submitfuelentrydataCtrl = function (req, res) {
  var data = req.body;
  appmdl.mainfuelticketMdl(async function (err, cresults1) {
    if (err) {
      //console.log()"err " + err);
      res.status(500).send("Server Error");
      return;
    }
    let c_id = cresults1[0] ? cresults1[0].c_id : 0;
    c_id = c_id * 1 + 1;
    const c_number = "FUEL00" + c_id;
    // Step 1: Insert into main table
    appmdl.submitfuelentrymaindata(
      c_number,
      c_id,
      data,
      function (err, results) {
        if (err) {
          console.error("Main insert failed:", err);
          return res
            .status(500)
            .json({ status: false, message: "Failed to insert main data" });
        }
        var p_id = results.insertId;
        // Step 2: Insert into sub table
        appmdl.submitfuelentrysubtable(
          c_number,
          c_id,
          data,
          p_id,
          function (err, results) {
            if (err) {
              console.error("Sub insert failed:", err);
              return res
                .status(500)
                .json({ status: false, message: "Failed to insert sub data" });
            }
            appmdl.submitfuelentrysubtableseconddata(
              c_number,
              c_id,
              data,
              p_id,
              function (err, results) {
                if (err) {
                  console.error("Sub insert failed:", err);
                  return res
                    .status(500)
                    .json({
                      status: false,
                      message: "Failed to insert sub data",
                    });
                }
                // appmdl.updatemaintablesubtableMdl(c_number, c_id, data, function (err, results) {
                //   if (err) {
                //     console.error("Main insert failed:", err);
                //     return res.status(500).json({ status: false, message: "Failed to insert main data" });
                //   }
                appmdl.setpreviousodometerMdl(
                  data,
                  async function (err, cresults1) {
                    if (err) {
                      //console.log()"err " + err);
                      res.status(500).send("Server Error");
                      return;
                    }
                    res.send({ status: 200, data: results });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
  //   });
};

exports.updatefuelenterydataCtrl = function (req, res) {
  const data = req.body;

  //   console.log(data,2)
  appmdl.updatemaintablesubtableMdl(data, function (err, cresults1) {
    if (err) {
      console.error("Error in mainfuelticketMdl:", err);
      return res
        .status(500)
        .send({
          status: false,
          message: "Error fetching fuel ticket ID",
          error: err,
        });
    }
    // let c_id = cresults1[0] ? cresults1[0].c_id : 0;
    // c_id = Number(c_id) + 1;
    // const c_number = "REF00" + c_id;
 let c_id =data.refid
 const c_number=data.c_number
    // Step 2: Insert into main table
    appmdl.submitfuelentryupdatemaindata(
      c_number,
      c_id,
      data,
      function (err, mainResults) {
        if (err) {
          console.error("Error in submitfuelentryupdatemaindata:", err);
          return res
            .status(500)
            .json({
              status: false,
              message: "Failed to insert main fuel entry",
              error: err,
            });
        }
        const p_id = mainResults.insertId;
        // Step 3: Insert into first sub table
        appmdl.editsubmitfuelentrysubtable(
          c_number,
          c_id,
          data,
          p_id,
          function (err, sub1Results) {
            if (err) {
              console.error("Error in submitfuelentrysubtable:", err);
              return res
                .status(500)
                .json({
                  status: false,
                  message: "Failed to insert first subtable",
                  error: err,
                });
            }
            // Step 4: Insert into second sub table
            appmdl.editsubmitfuelentrysubtableseconddata(
              c_number,
              c_id,
              data,
              p_id,
              function (err, sub2Results) {
                if (err) {
                  console.error(
                    "Error in submitfuelentrysubtableseconddata:",
                    err
                  );
                  return res
                    .status(500)
                    .json({
                      status: false,
                      message: "Failed to insert second subtable",
                      error: err,
                    });
                }
                appmdl.setpreviousodometerMdl(data, function (err, odoResults) {
                  if (err) {
                    console.error("Error in setpreviousodometerMdl:", err);
                    return res
                      .status(500)
                      .send({
                        status: false,
                        message: "Failed to update previous odometer",
                        error: err,
                      });
                  }
                  //console.log()"Previous Odometer Updated");
                  return res
                    .status(200)
                    .json({
                      status: 200,
                      message: "Fuel entry submitted successfully",
                      data: odoResults,
                    });
                });
              }
            );
          }
        );
      }
    );
  });
};

exports.getVehicleDetailsCtrl = function (req, res) {
  var data = req.body;
  appmdl.getVehicleDetailsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.Selectdatagetfinaltranscationsreport1Ctrl = function (req, res) {
  var data = req.body;
  appmdl.Selectdatagetfinaltranscationsreport1Mdl(
    data,
    function (err, results) {
      if (err) {
        res.send({ status: 500, msg: "Server Error" });
        return;
      }
      res.send({ status: 200, data: results });
    }
  );
};

exports.getlaundryreportdataCtrl = function (req, res) {
  appmdl.getlaundryreportdataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getvendorlistlaundrydropdownCtrl = function (req, res) {
  appmdl.getvendorlistlaundrydropdownMdl(function (err, results) {
    if (err) {
      console.log(err,results,111111111111111111)
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.SelectedvendordropdownoptionCtrl = function (req, res) {
  var data = req.body;
  appmdl.SelectedvendordropdownoptionMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.updateLaundryDataCtrl = function (req, res) {
  var data = req.body;

  // console.log(data)

  appmdl.updateLaundryDataMdl(data, function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    const c_id = results[0].c_id;
    const c_number = results[0].c_number;
    appmdl.updateLaundryDataMdl1(
      data,
      c_id,
      c_number,
      function (err, results1) {
        if (err) {
          console.log(err);
          res.send({ status: 500, msg: "Server Error" });
          return;
        }
        res.send({ status: 200, data: results1 });
      }
    );
  });
};

exports.getsearchdataCtrl = function (req, res) {
  var data = req.body;
  //
  appmdl.getsearchdataMdl(data, function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// exports.submitlaundryaddbillCtrl = function (req, res) {
//   var data = req.body;
//   appmdl.laundrybillrefMdl(async function (err, cresults1) {
//     if (err) {
//       //console.log()"err " + err);
//       res.status(500).send("Server Error");
//       return;
//     }
//     let c_id = cresults1[0] ? cresults1[0].c_id : 0;
//     c_id = c_id * 1 + 1;
//     const c_number = "REF00" + c_id;
//     // Step 1: Insert into main table
//     appmdl.submitlaundrybillmaindata(c_number, c_id, data, function (err, results) {
//       if (err) {
//         console.error("Main insert failed:", err);
//         return res.status(500).json({ status: false, message: "Failed to insert main data" });
//       }
//       var p_id = results.insertId;
//       // Step 2: Insert into sub table
//       appmdl.submitlaundrybillsubtable(c_number, c_id, data, p_id, function (err, results) {
//         if (err) {
//           console.error("Sub insert failed:", err);
//           return res.status(500).json({ status: false, message: "Failed to insert sub data" });
//         }
//         appmdl.submitlaundrysubtableseconddata(c_number, c_id, data, p_id, function (err, results) {
//           if (err) {
//             console.error("Sub insert failed:", err);
//             return res.status(500).json({ status: false, message: "Failed to insert sub data" });
//           }
//           res.send({ status: 200, data: results });
//         });
//       });
//     });
//   });
// };

exports.submitlaundryaddbillCtrl = function (req, res) {
  var data = req.body;
  console.log(data, "service number", data.service_no, 2739);
  appmdl.laundrybillrefMdl(function (err, cresults1) {
    if (err) {
      //console.log()"err " + err);
      res.status(500).send("Server Error");
      return;
    }
    console.log(cresults1);
    let c_id = cresults1.length > 0 ? cresults1[0].c_id : 0;
    c_id = c_id * 1 + 1;
    const c_number = "LAUN00" + c_id;

    // Step 1: Insert into main table
    appmdl.submitlaundrybillmaindata(
      c_number,
      c_id,
      data,
      function (err, results) {
        if (err) {
          console.error("Main insert failed:", err);
          return res
            .status(500)
            .json({ status: false, message: "Failed to insert main data" });
        }
        var p_id = results.insertId;
        // Step 2: Insert into sub table
        appmdl.submitlaundrybillsubtable(
          c_number,
          c_id,
          data,
          p_id,
          function (err, results) {
            if (err) {
              console.error("Sub insert failed:", err);
              return res
                .status(500)
                .json({ status: false, message: "Failed to insert sub data" });
            }
            appmdl.submitlaundrysubtableseconddata(
              c_number,
              c_id,
              data,
              p_id,
              function (err, results) {
                if (err) {
                  console.error("Sub insert failed:", err);
                  return res
                    .status(500)
                    .json({
                      status: false,
                      message: "Failed to insert sub data",
                    });
                }
                res.send({ status: 200, data: results });
              }
            );
          }
        );
      }
    );
  });
};

exports.getledgernameCtrl = function (req, res) {
  appmdl.getledgernameMdl(function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    // console.log(results,2795)
    res.send({ status: 200, data: results });
  });
};

exports.getmainmasterssubgroupCtrl = function (req, res) {
  appmdl.getmainmasterssubgroupMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getmainmasterssubchildCtrl = function (req, res) {
  appmdl.getmainmasterssubchildMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelledgernameCtrl = function (req, res) {
  appmdl.getfuelledgernameMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// july 24
exports.submittargetCtrl = function (req, res) {
  var data = req.body;

  appmdl.checktargetMdl(data, function (err, results1) {
    //console.log()results1,2345);

    if (results1.length == 0) {
      appmdl.submittargetMdl(data, function (err, results) {
        if (err) {
          return res.status(500).json({ status: false, message: "DB Error" });
        }
        res.send({ status: 200, data: results });
      });
    } else {
      res.send({ status: 202, message: "Servie Number Already Exist" });
    }
  });
};

exports.gettargetdataCtrl = function (req, res) {
  appmdl.gettargetdataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// Get Daywise Report
exports.getdaywisereportCtrl = function (req, res) {
  var data = req.body;
  appmdl.getdaywisereportMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// Get Station Wise
exports.getstationwisereportCtrl = function (req, res) {
  var data = req.body;
  appmdl.getstationwisereportMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// busnumber
exports.getbusnumberCtrl = function (req, res) {
  appmdl.getbusnumberMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getbuswisewisereportsCtrl = function (req, res) {
  var data = req.body;
  appmdl.getbuswisewisereportsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getbusperormancereportsCtrl = function (req, res) {
  var data = req.body;
  appmdl.getbusperormancereportsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// july 25 get driver name
exports.getdrivernameCtrl = function (req, res) {
  appmdl.getdrivernameMdl(function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getdriverperormancereportsCtrl = function (req, res) {
  var data = req.body;
  appmdl.getdriverperormancereportsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettargetreportsCtrl = function (req, res) {
  var data = req.body;
  appmdl.gettargetreportsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettopperormancereportsCtrl = function (req, res) {
  var data = req.body;
  appmdl.gettopperormancereportsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getfueltargetdatactrl = function (req, res) {
  appmdl.getfueltargetdatamdl(req.body, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getdaybookreportsCtrl = function (req, res) {
  var data = req.body;
  appmdl.getdaybookreportsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.gettrialbalancereportsCtrl = function (req, res) {
  var data = req.body;
  appmdl.gettrialbalancereportsMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getsalaryreportCtrl = function (req, res) {
  var data = req.body;
  appmdl.getsalaryreportMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
// salary payment
// exports.savePaymentsCtrl = function (req, res) {
//   appmdl.mainsalaryuniquenoMdl(async function (err, cresults1) {
//     if (err) {
//       //console.log()"err " + err);
//       res.status(500).send("Server Error");
//       return;
//     }
//     let c_id = cresults1[0] ? cresults1[0].c_id : 0;
//     c_id = c_id * 1 + 1;
//     const c_number = "SAL00" + c_id;
//     appmdl.addsalarypaymentmdl(c_id, c_number, req.body, function (err, results) {
//       if (err || !results || !results.insertId) {
//         return res.status(500).send({
//           status: 500,
//           message: "Failed to add diagnostic patient details.",
//         });
//       }

//       appmdl.addsalarydebitmdl(c_id, c_number,
//         results.insertId,
//         req.body,
//         function (err, testDetails) {
//           if (err || !testDetails) {
//             return res.status(500).send({
//               status: 500,
//               message: "Failed to add diagnostic1 test details.",
//             });
//           }

//             appmdl.updatepaymentadvanceMdl(c_id, c_number,
//             results.insertId,
//             req.body,
//             function (err, testDetails) {
//               if (err || !testDetails) {
//                 return res.status(500).send({
//                   status: 500,
//                   message: "Failed to add diagnostic1 test details.",
//                 });
//               }
//           appmdl.adddsalarycreditmdl(c_id, c_number,
//             results.insertId,
//             req.body,
//             function (err, testDetails) {
//               if (err || !testDetails) {
//                 return res.status(500).send({
//                   status: 500,
//                   message: "Failed to add diagnostic2 test details.",
//                 });
//               }
//               // appmdl.updatefunction(c_id,c_number,req.body, function (err, updateResult) {
//               //   if (err || !updateResult) {
//               //     return res
//               //       .status(500)
//               //       .send({ status: 500, message: "Failed to update function." });
//               //   }
//                 // Send final success response
//                 return res.status(200).send({
//                   status: 200,
//                   message: "Successfully added and updated expenses.",

//                 });
//               });
//             }
//           );
//         });
//     // });
//   });
//   });
// };

exports.savePaymentsCtrl = function (req, res) {
  appmdl.mainsalaryuniquenoMdl(async function (err, cresults1) {
    if (err) {
      //console.log()"err " + err);
      res.status(500).send("Server Error");
      return;
    }
    let c_id = cresults1[0] ? cresults1[0].c_id : 0;
    c_id = c_id * 1 + 1;
    const c_number = "SAL00" + c_id;
    appmdl.addsalarypaymentmdl(
      c_id,
      c_number,
      req.body,
      function (err, results) {
        if (err || !results || !results.insertId) {
          return res.status(500).send({
            status: 500,
            message: "Failed to add diagnostic patient details.",
          });
        }

        appmdl.addsalarydebitmdl(
          c_id,
          c_number,
          results.insertId,
          req.body,
          function (err, testDetails) {
            if (err || !testDetails) {
              return res.status(500).send({
                status: 500,
                message: "Failed to add diagnostic1 test details.",
              });
            }
            // appmdl.updatepaymentadvanceMdl(c_id, c_number,
            //   results.insertId,
            //   req.body,
            //   function (err, testDetails) {
            //     if (err || !testDetails) {
            //       return res.status(500).send({
            //         status: 500,
            //         message: "Failed to Update Advance details.",
            //       });
            //     }

            appmdl.updatepaymentadvanceMdl(
              c_id,
              c_number,
              results.insertId,
              req.body,
              function (err, testDetails) {
                if (err || !testDetails) {
                  return res.status(500).send({
                    status: 500,
                    message: "Failed to Update Payment Advance test details.",
                  });
                }
                appmdl.updatesalarypaidtowhom(
                  c_id,
                  c_number,
                  results.insertId,
                  req.body,
                  function (err, testDetails) {
                    if (err || !testDetails) {
                      return res.status(500).send({
                        status: 500,
                        message: "Failed to Update Advance details.",
                      });
                    }

                    appmdl.adddsalarycreditmdl(
                      c_id,
                      c_number,
                      results.insertId,
                      req.body,
                      function (err, testDetails) {
                        if (err || !testDetails) {
                          return res.status(500).send({
                            status: 500,
                            message: "Failed to add diagnostic2 test details.",
                          });
                        }
                        // appmdl.updatefunction(c_id,c_number,req.body, function (err, updateResult) {
                        //   if (err || !updateResult) {
                        //     return res
                        //       .status(500)
                        //       .send({ status: 500, message: "Failed to update function." });
                        //   }
                        // Send final success response
                        return res.status(200).send({
                          status: 200,
                          message: "Successfully added and updated expenses.",
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

exports.getoldBalanceCtrl = function (req, res) {
  var data = req.body;
  //console.log()data,2622);

  appmdl.getoldBalanceMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getadvanceCtrl = function (req, res) {
  var data = req.body;
  //console.log()data,2622);

  appmdl.getadvanceMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.sudCtrl = function (req, res) {
  var data = req.body;
  //console.log()data,2622);

  appmdl.sudMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelentrydataCtrl = function (req, res) {
  appmdl.getfuelentrydataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelentryapproveddataCtrl = function (req, res) {
  appmdl.getfuelentryapproveddataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getfuelaccountsdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getfuelaccountsdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getlaundrybilldataCtrl = function (req, res) {
  appmdl.getlaundrybilldataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getlaundrybillsubdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getlaundrybillsubdataMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, msg: "Server Error" });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.updatebusnumber = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try {
    validateSignature(encryptedPayload, signature);
  } catch (e) {
    res.send({ status: 400, msg: "Invalid request signature" });
    return;
  }
  let data;
  try {
    data = decryptPayload(encryptedPayload);
  } catch (e) {
    res.send({ status: 400, msg: "Invalid payload" });
    return;
  }
  appmdl.updatebusnumber(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.updateBusValidityDateCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try {
    validateSignature(encryptedPayload, signature);
  } catch (e) {
    res.send({ status: 400, msg: "Invalid request signature" });
    return;
  }
  let data;
  try {
    data = decryptPayload(encryptedPayload);
  } catch (e) {
    res.send({ status: 400, msg: "Invalid payload" });
    return;
  }
  appmdl.updateBusValidityDateMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.updateservicenumber = function (req, res) {
  var data = req.body;
  appmdl.updateservicenumber(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.updateservicenoCtrl = function (req, res) {
  var data = req.body;
  appmdl.updateservicenoMdl(data, function (err, results) {
    if (err) {
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.adddrivereditCtrl = function (req, res) {
  try {
    // const { encryptedPayload, signature } = req.body;

    // // Your signature validation & payload decryption functions
    // validateSignature(encryptedPayload, signature);
    const data = req.body;

    console.log(data, 3258);

    // Hold URLs for new images, or fallback to existing ones
    let imageuploadlao =
      data.aadharcardfront && data.aadharcardfront.reviewimg
        ? saveImage(data.aadharcardfront, req)
        : data.aadharcardfront || null;

    let imageuploadlaotwo =
      data.aadharcardback && data.aadharcardback.reviewimg
        ? saveImage(data.aadharcardback, req)
        : data.aadharcardback || null;

    let imageuploadlaothree =
      data.dlfront && data.dlfront.reviewimg
        ? saveImage(data.dlfront, req)
        : data.dlfront || null;

    let imageuploadlaofour =
      data.dlback && data.dlback.reviewimg
        ? saveImage(data.dlback, req)
        : data.dlback || null;

    let imageuploadlaofive =
      data.upiscanner && data.upiscanner.reviewimg
        ? saveImage(data.upiscanner, req)
        : data.upiscanner || null;

    // Call model to update driver info
    appmdl.adddrivereditMdl(
      data,
      imageuploadlao,
      imageuploadlaotwo,
      imageuploadlaothree,
      imageuploadlaofour,
      imageuploadlaofive,
      function (err, results) {
        if (err) {
          console.error("DB Error:", err);
          return res.status(500).send({ status: 500, message: "Server Error" });
        }
        return res.send({ status: 200, data: results });
      }
    );
  } catch (error) {
    console.error("Unexpected Error:", error);
    res.status(500).send({ status: 500, message: "Internal Server Error" });
  }
};

// Helper function to save base64 image and return public URL
function saveImage(fileObj, req) {
  const image_url = fileObj.reviewimg;
  const imgTypeRaw = fileObj.imgtype.toLowerCase();
  const filetype =
    imgTypeRaw === "jfif" || imgTypeRaw === "jpg" ? "jpeg" : imgTypeRaw;
  const base64Data = image_url.split(",")[1];

  const datetimestamp = Date.now();
  const random_number = Math.floor(100000 + Math.random() * 900000);
  const unicnumber = `${random_number}${datetimestamp}`;
  const filename = `${unicnumber}.${filetype}`;
  const filepath = `${IMAGE_UPLOAD_DIR}/${filename}`;

  // Write file synchronously to avoid race conditions in this example
  try {
    fs.writeFileSync(filepath, base64Data, "base64");
    //console.log()`Image saved: ${filename}`);
  } catch (err) {
    console.error("Error saving image:", err);
  }

  return `${getImageBaseUrl(req)}/${filename}`;
}

exports.edithelperregisterCtrl = function (req, res) {
  //   const { encryptedPayload, signature } = req.body;

  //   validateSignature(encryptedPayload, signature);
  //   const payload = decryptPayload(encryptedPayload);
  const data = req.body;

  console.log(data, 3347);

  const processImage = (imgData) => {
    if (!imgData || !imgData.reviewimg) return null;

    if (imgData.reviewimg.startsWith("data")) {
      const base64 = imgData.reviewimg;
      const filetype =
        imgData.imgtype === "jfif" || imgData.imgtype === "jpg"
          ? "jpeg"
          : imgData.imgtype;
      const base64Content = base64.split(",")[1];
      const filename = `${Math.floor(
        100000 + Math.random() * 900000
      )}${Date.now()}.${filetype}`;
      const filepath = `${IMAGE_UPLOAD_DIR}/${filename}`;
      const fullurl = `${getImageBaseUrl(req)}/${filename}`;

      fs.writeFile(filepath, base64Content, "base64", (err) => {
        if (err) {
          console.error(`Error saving image ${filename}:`, err);
        }
      });

      return fullurl;
    } else {
      return imgData.reviewimg;
    }
  };

  const adharFrontImage = processImage(data.adharcardfront);
  const adharBackImage = processImage(data.adharcardback);
  const upiScannerImage = processImage(data.upiscanner);

  appmdl.edithelperregisterMdl(
    data,
    adharFrontImage,
    adharBackImage,
    upiScannerImage,
    function (err, results) {
      if (err) {
        return res.status(500).send({ status: 500 });
      }
      res.send({ status: 200, data: results });
    }
  );
};

// Util to check if string is base64 image
function isBase64Image(str) {
  return typeof str === "string" && str.startsWith("data:image/");
}

exports.addstaffeditCtrl = function (req, res) {
  try {
    // const { encryptedPayload, signature } = req.body;

    // // Security: Validate + Decrypt
    // validateSignature(encryptedPayload, signature);
    // const payload = decryptPayload(encryptedPayload);
    const data = req.body;

    // Default image URLs — either existing or to be updated
    let imageuploadlao = data.aadhaarCardFront?.reviewimg || null; // Aadhaar Front
    let imageuploadlaotwo = data.aadhaarCardBack?.reviewimg || null; // Aadhaar Back
    let imageuploadlaothree = data.upiScanner?.reviewimg || null; // UPI Scanner

    // Aadhaar Front
    if (
      data.aadhaarCardFront &&
      isBase64Image(data.aadhaarCardFront.reviewimg)
    ) {
      const [meta, base64Data] = data.aadhaarCardFront.reviewimg.split(",");
      const filetype =
        data.aadhaarCardFront.imgtype === "jfif" ||
          data.aadhaarCardFront.imgtype === "jpg"
          ? "jpeg"
          : data.aadhaarCardFront.imgtype;
      const filename = `${Math.floor(
        100000 + Math.random() * 900000
      )}${Date.now()}.${filetype}`;
      const filepath = `${IMAGE_UPLOAD_DIR}/${filename}`;
      fs.writeFile(filepath, base64Data, "base64", function (err) {
        if (err) console.error("Error saving Aadhaar Front image:", err);
      });
      imageuploadlao = `${getImageBaseUrl(req)}/${filename}`;
    }

    // Aadhaar Back
    if (data.aadhaarCardBack && isBase64Image(data.aadhaarCardBack.reviewimg)) {
      const [meta, base64Data] = data.aadhaarCardBack.reviewimg.split(",");
      const filetype =
        data.aadhaarCardBack.imgtype === "jfif" ||
          data.aadhaarCardBack.imgtype === "jpg"
          ? "jpeg"
          : data.aadhaarCardBack.imgtype;
      const filename = `${Math.floor(
        100000 + Math.random() * 900000
      )}${Date.now()}.${filetype}`;
      const filepath = `${IMAGE_UPLOAD_DIR}/${filename}`;
      fs.writeFile(filepath, base64Data, "base64", function (err) {
        if (err) console.error("Error saving Aadhaar Back image:", err);
      });
      imageuploadlaotwo = `${getImageBaseUrl(req)}/${filename}`;
    }

    // UPI Scanner
    if (data.upiScanner && isBase64Image(data.upiScanner.reviewimg)) {
      const [meta, base64Data] = data.upiScanner.reviewimg.split(",");
      const filetype =
        data.upiScanner.imgtype === "jfif" || data.upiScanner.imgtype === "jpg"
          ? "jpeg"
          : data.upiScanner.imgtype;
      const filename = `${Math.floor(
        100000 + Math.random() * 900000
      )}${Date.now()}.${filetype}`;
      const filepath = `${IMAGE_UPLOAD_DIR}/${filename}`;
      fs.writeFile(filepath, base64Data, "base64", function (err) {
        if (err) console.error("Error saving UPI Scanner image:", err);
      });
      imageuploadlaothree = `${getImageBaseUrl(req)}/${filename}`;
    }

    // Call model to update DB
    appmdl.addstaffeditMdl(
      data,
      imageuploadlao,
      imageuploadlaotwo,
      imageuploadlaothree,
      function (err, results) {
        if (err) {
          console.error("DB Error:", err);
          return res.status(500).send({ status: 500, error: "Server Error" });
        }
        res.send({ status: 200, data: results });
      }
    );
  } catch (e) {
    console.error("Unexpected Error in addstaffeditCtrl:", e);
    res.status(500).send({ status: 500, error: "Unexpected Error" });
  }
};

exports.AddledgersingleinbalancesheetCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.Duplicatechecksubchildtwomainmastermdlbalancesheet(
    data,
    function (err, results) {
      if (err) {
        res.send({ status: 500, data: results });
        return;
      }
      if (results.length == 0) {
        appmdl.AddledgersingleinbalancesheetMdl(data, function (err, results) {
          if (err) {
            res.send({ status: 500, msg: "Server Error" });
            return;
          }
          res.send({ status: 200, data: results });
        });
      } else {
        res.send({ status: 250, message: "This Ledger Name Already Existed" });
      }
    }
  );
};
exports.equilitiessingleinbalancesheetCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.Duplicatechecksubchildtwomainmastermdlequlilties(
    data,
    function (err, results) {
      if (err) {
        res.send({ status: 500, data: results });
        return;
      }
      if (results.length == 0) {
        appmdl.equilitiessingleinbalancesheetMdl(data, function (err, results) {
          if (err) {
            res.send({ status: 500, msg: "Server Error" });
            return;
          }
          res.send({ status: 200, data: results });
        });
      } else {
        res.send({ status: 250, message: "This Ledger Name Already Existed" });
      }
    }
  );
};

exports.AddledgersingleinprofitandlossCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.Duplicatechecksubchildtwomainmastermdlprofitandloss(
    data,
    function (err, results) {
      if (err) {
        res.send({ status: 500, data: results });
        return;
      }
      if (results.length == 0) {
        appmdl.AddledgersingleinprofitandlossMdl(data, function (err, results) {
          if (err) {
            res.send({ status: 500, msg: "Server Error" });
            return;
          }
          res.send({ status: 200, data: results });
        });
      } else {
        res.send({ status: 250, message: "This Ledger Name Already Existed" });
      }
    }
  );
};
exports.incomesingleinprofitandlossCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  validateSignature(encryptedPayload, signature);

  const payload = decryptPayload(encryptedPayload);
  var data = payload;
  appmdl.Duplicatechecksubchildtwomainmastermdlexpenses(
    data,
    function (err, results) {
      if (err) {
        res.send({ status: 500, data: results });
        return;
      }
      if (results.length == 0) {
        appmdl.incomesingleinprofitandlossMdl(data, function (err, results) {
          if (err) {
            res.send({ status: 500, msg: "Server Error" });
            return;
          }
          res.send({ status: 200, data: results });
        });
      } else {
        res.send({ status: 250, message: "This Ledger Name Already Existed" });
      }
    }
  );
};

exports.editfueltargetCtrl = function (req, res) {
  var data = req.body;
  appmdl.editfueltargetMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addmastergroupdataCtrl = function (req, res) {
  var data = req.body;
  // console.log(data,3679)
  appmdl.addmastergroupdataMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send({ status: 500, msg: err });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addsubgroupdataCtrl = function (req, res) {
  var data = req.body;
  // console.log(data, 3679)
  appmdl.addsubgroupdataMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send({ status: 500, msg: err });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addchilddataCtrl = function (req, res) {
  var data = req.body;
  // console.log(data, 3679)
  appmdl.addchilddataMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send({ status: 500, msg: err });
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addInfiniteGroupCtrl = function (req, res) {
  var data = req.body;
  // console.log(data, 3679)
  appmdl.addInfiniteGroupMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.updateGroupNameCtrl = function (req, res) {
  var data = req.body;
  // console.log(data, 3679)
  appmdl.updateGroupNameMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.deleteGroupCtrl = function (req, res) {
  var data = req.body;
  // console.log(data, 3679)
  appmdl.deleteGroupMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.updateLedgerNameCtrl = function (req, res) {
  var data = req.body;
  // console.log(data, 3679)
  appmdl.updateLedgerNameMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.moveLedgerCtrl = function (req, res) {
  var data = req.body;
  appmdl.moveLedgerMdl(data, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};

exports.deleteLedgerCtrl = function (req, res) {
  var data = req.body;
  // console.log(data, 3679)
  appmdl.deleteLedgerMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.updateGroupFlagsCtrl = function (req, res) {
  var data = req.body;
  appmdl.updateGroupFlagsMdl(data, function (err, results) {
    if (err) { res.send({ status: 500, msg: err }); return; }
    res.send({ status: 200, data: results });
  });
};

exports.getRefDetailsCtrl = function (req, res) {
  var data = req.body;
  appmdl.getRefDetailsMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addledgerdataCtrl = function (req, res) {
  var data = req.body;
  // console.log(data, 3679)
  appmdl.addledgerdataMdl(data, function (err, results) {
    if (err) {
      //console.log()"err " + err);
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
    // if (data.parent_level == 2 || data.parent_level == 1) {
    //   appmdl.updateledgerflagMdl2(data, function (err, results) {
    //     if (err) {
    //       console.log(err)
    //       res.send(500, "Server Error");
    //       return;
    //     }
    //     res.send({ "status": 200, "data": results });
    //   });
    // }
    // else if (data.parent_level == 3) {
    //   appmdl.updateledgerflagMdl(data, function (err, results) {
    //     if (err) {
    //       console.log(err)
    //       res.send(500, "Server Error");
    //       return;
    //     }
    //     res.send({ "status": 200, "data": results });
    //   });
    // }
    // else {
    //   appmdl.updateledgerflagMdl1(data, function (err, results) {
    //     if (err) {
    //       console.log(err)
    //       res.send(500, "Server Error");
    //       return;
    //     }
    //     res.send({ "status": 200, "data": results });
    //   });
    // }
  });
};

exports.getalldrivers = function (req, res) {
  appmdl.getalldrivers(function (err, results) {
    if (err) {
      console.error("Error in getalldrivers controller:", err);
      res.status(500).send("Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettriplogscountCtrl = function (req, res) {
  var data = req.body;
  appmdl.gettriplogscountMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettripupdatedmodaldataCtrl = function (req, res) {
  var data = req.body;
  appmdl.gettripupdatedmodaldataMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettripupdatedlogsCtrl = function (req, res) {
  var data = req.body;
  appmdl.gettripupdatedlogsMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.gettripdeletedlogsCtrl = function (req, res) {
  var data = req.body;
  appmdl.gettripdeletedlogsMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// admin approval

exports.getadminstatuscountCtrl = function (req, res) {
  var data = req.body;
  appmdl.getadminstatuscountMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getadminapprovedCtrl = function (req, res) {
  var data = req.body;
  appmdl.getadminapprovedMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getadminrejectedCtrl = function (req, res) {
  var data = req.body;
  appmdl.getadminrejectedMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getservicenumCtrl = function (req, res) {
  var data = req.body;
  appmdl.getservicenumMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
exports.getpdfpatchdata1Ctrl = function (req, res) {
  var data = req.body;
  appmdl.getpdfpatchdata1Mdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getbetadataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getbetadataMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};
//payables ctrls---------------

exports.submitpayablesvoucherentryCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  const data = decryptPayload(encryptedPayload);

  appmdl.todayVoucherCountMdl(async function (err, cresults1) {
    if (err) {
      //console.log()"err " + err);
      res.status(500).send("Server Error");
      return;
    }
    const todayCount = cresults1[0] ? cresults1[0].cnt * 1 : 0;
    const c_number = `V${moment().format('YYMMDD')}${String(todayCount + 1).padStart(3, '0')}`;
    const c_id = todayCount + 1;
    console.log(c_id,c_number,11111111)
    // Step 1: Insert into main table
    appmdl.payablessubmitvoucherentrymaindata(
      c_number,
      c_id,
      data,
      function (err, results) {
        if (err) {
          console.error("Main insert failed:", err);
          return res
            .status(500)
            .json({ status: false, message: "Failed to insert main data" });
        }
        var p_id = results.insertId;
        // Step 2: Insert into sub table
        //for adding credit rows of data
        appmdl.payablessubmitvoucherentrysubtable(
          c_number,
          c_id,
          data,
          p_id,
          function (err, results) {
            if (err) {
              console.error("Sub insert failed:", err);
              return res
                .status(500)
                .json({ status: false, message: "Failed to insert sub data" });
            }
            //for adding debit rows of data
            appmdl.payablessubmitvoucherentrysubtableseconddata(
              c_number,
              c_id,
              data,
              p_id,
              function (err, results) {
                if (err) {
                  console.error("Sub insert failed:", err);
                  return res
                    .status(500)
                    .json({
                      status: false,
                      message: "Failed to insert sub data",
                    });
                }
                appmdl.payablesledgerupdate(data, c_number,
                  function (err, results) {
                    if (err) {
                      console.error("ledger update insert failed:", err);
                      return res
                        .status(500)
                        .json({
                          status: false,
                          message: "Failed to update ledger",
                        });
                    }

                    const historyEntries = (data.selectedledgerdata || []).map(r => ({
                      source_table: r.source_table, source_id: r.id, c_number,
                      payment: r.payment, balance_after: r.balance, action: 'settled',
                      actor_id: data.user_id, actor_name: data.named,
                    }));
                    appmdl.insertPayablesPaymentHistoryMdl(historyEntries, function () {});

                    res.send({ status: 200, data: results });
                  });
              });
          });
      });
  });
};

// Edits an existing payables voucher in place — same soft-versioning pattern
// as updatevoucherentryCtrl (old mainvoucher_t/mainvoucher_subt rows marked
// d_in=2, a fresh row inserted under the SAME c_number) instead of
// submitpayablesvoucherentryCtrl's always-new-c_number insert, which was
// creating a duplicate voucher on every edit. Also re-settles the (possibly
// changed) selected transactions and writes a voucher_audit 'edited' entry
// so the edit shows up in the same history trail as ordinary voucher edits.
exports.updatepayablesvoucherentryCtrl = function (req, res) {
  try {
    const { encryptedPayload, signature } = req.body;
    const data = decryptPayload(encryptedPayload);
    const c_number = data.c_number;
    if (!c_number) {
      return res.status(400).json({ status: 400, message: 'Missing c_number' });
    }
    const c_id = parseInt((c_number || '').replace(/\D/g, '')) || 0;
    // updatesubmitvoucherentrymaindata/updatesubmitvoucherentrysubtable(seconddata)
    // all read c_id/c_number/is_payable off `data` directly (the c_number/c_id
    // function params are unused) — without these, c_id comes through NULL
    // (insert fails) and is_payable comes through 0 (voucher silently loses
    // its Payable classification on every edit).
    data.c_id = c_id;
    data.c_number = c_number;
    data.is_payable = 1;

    appmdl.deletevouchertypebill(data, function (err) {
      if (err) {
        console.error('[updatepayablesvoucherentry] deletevouchertypebill failed:', err);
        return res.status(500).json({ status: 500, message: err.message || 'Delete step failed' });
      }
      appmdl.unsettlePayablesRowsMdl(c_number, data.user_id, data.named, function (err) {
        if (err) {
          console.error('[updatepayablesvoucherentry] unsettlePayablesRowsMdl failed:', err);
          return res.status(500).json({ status: 500, message: err.message || 'Unsettle step failed' });
        }
        appmdl.updatesubmitvoucherentrymaindata(c_number, c_id, data, function (err, results) {
          if (err) {
            console.error('[updatepayablesvoucherentry] main insert failed:', err);
            return res.status(500).json({ status: 500, message: err.message || 'Main insert failed' });
          }
          var p_id = results.insertId;
          appmdl.updatesubmitvoucherentrysubtable(c_number, c_id, data, p_id, function (err) {
            if (err) {
              console.error('[updatepayablesvoucherentry] sub table failed:', err);
              return res.status(500).json({ status: 500, message: err.message || 'Sub table insert failed' });
            }
            appmdl.updatesubmitvoucherentrysubtableseconddata(c_number, c_id, data, p_id, function (err) {
              if (err) {
                console.error('[updatepayablesvoucherentry] sub table 2 failed:', err);
                return res.status(500).json({ status: 500, message: err.message || 'Sub table 2 insert failed' });
              }
              appmdl.payablesledgerupdate(data, c_number, function (err, results) {
                if (err) {
                  console.error('[updatepayablesvoucherentry] ledger update failed:', err);
                  return res.status(500).json({ status: 500, message: err.message || 'Failed to update ledger' });
                }
                const historyEntries = (data.selectedledgerdata || []).map(r => ({
                  source_table: r.source_table, source_id: r.id, c_number,
                  payment: r.payment, balance_after: r.balance, action: 'settled',
                  actor_id: data.user_id, actor_name: data.named,
                }));
                appmdl.insertPayablesPaymentHistoryMdl(historyEntries, function () {});

                const changesNote = data.changes_note || `Payables voucher updated by ${data.named || ''}`;
                appmdl.insertVoucherAuditMdl({
                  c_number, action: 'edited',
                  action_by_id: data.user_id || '', action_by_name: data.named || '',
                  changes_note: changesNote
                }, function () {});
                res.send({ status: 200, data: results });
              });
            });
          });
        });
      });
    });
  } catch (e) {
    console.error('[updatepayablesvoucherentry] exception:', e.message);
    res.status(500).json({ status: 500, message: e.message });
  }
};

exports.getpayablessettledrowsCtrl = function (req, res) {
  var data = req.body;
  appmdl.getpayablessettledrowsMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getPayablesPaymentHistoryCtrl = function (req, res) {
  var data = req.body;
  if (!data.source_table || !data.source_id) {
    return res.status(400).json({ status: 400, message: 'Missing source_table or source_id' });
  }
  appmdl.getPayablesPaymentHistoryMdl(data.source_table, data.source_id, function (err, results) {
    if (err) {
      return res.status(500).json({ status: 500, message: 'DB error' });
    }
    res.send({ status: 200, data: results });
  });
};

exports.getvouchersearchdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getvouchersearchdataMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getvoucherapproveddataCtrl= function (req, res) {
  appmdl.getvoucherapproveddataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};


// Garage  Modules Controllers ------------------------------------------------------------------------------------------------------------------------


exports.getrepairentryCtrl = function (req, res) {
  var data = req.body;
  appmdl.getrepairentryMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.postrepairentryCtrl = function (req, res) {
  var data = req.body;
  appmdl.postrepairentryMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getstaffdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getstaffdataMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getallrepairCategoryCtrl = function (req, res) {
  var data = req.body;
  appmdl.getallrepairCategoryMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addrepaircategoryCtrl = function (req, res) { decryptedBody(req, res, appmdl.addrepaircategoryMdl); };
exports.editrepaircategoryCtrl = function (req, res) { decryptedBody(req, res, appmdl.editrepaircategoryMdl); };
exports.deleterepaircategoryCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleterepaircategoryMdl); };

exports.getallrepairpartsCtrl = function (req, res) {
  var data = req.body;
  // console.log(data)
  appmdl.getallrepairpartsMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.addrepairpartsCtrl = function (req, res) { decryptedBody(req, res, appmdl.addrepairpaMdl); };
exports.editrepairpartsCtrl = function (req, res) { decryptedBody(req, res, appmdl.editrepairpartsMdl); };
exports.deleterepairpartsCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleterepairpartsMdl); };
exports.editPartPriceCtrl = function (req, res) { decryptedBody(req, res, appmdl.editPartPriceMdl); };
exports.getPartPriceHistoryCtrl = function (req, res) { decryptedBody(req, res, appmdl.getPartPriceHistoryMdl); };

exports.addrepairentryCtrl = function (req, res) {
  var data;
  try { data = decryptPayload(req.body.encryptedPayload); } catch (e) { data = req.body; }

  const jobRows = (data.job_rows || []).filter(function(r) { return r.category; });
  if (!jobRows.length) {
    return res.send({ status: 400, msg: 'No category provided' });
  }

  appmdl.todayJobCountMdl(function (err, cresults1) {
    if (err) { res.status(500).send("Server Error"); return; }
    const todayCount = cresults1[0] ? cresults1[0].cnt * 1 : 0;

    const createdJobs = [];
    let idx = 0;

    function insertNext() {
      if (idx >= jobRows.length) {
        return res.send({ status: 200, data: createdJobs });
      }
      const row = jobRows[idx];
      const seqNum = todayCount + idx + 1;
      const c_number = `J${moment().format('YYMMDD')}${String(seqNum).padStart(3, '0')}`;
      const c_id = seqNum;
      const rowData = Object.assign({}, data, { job_rows: [row] });

      appmdl.addrepairentryMdl(c_id, c_number, rowData, function (err2, result2) {
        if (err2) {
          console.log(err2);
          return res.send({ status: 500, data: null });
        }
        createdJobs.push({ job_card_number: c_number, id: result2.insertId });
        idx++;
        insertNext();
      });
    }

    insertNext();
  });
};

exports.editrepairentryCtrl = function (req, res) {
  var data = req.body;
  appmdl.editrepairentryMdl(data, function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};




exports.getpartsentryCtrl = function (req, res) {
  var data = req.body;
  appmdl.getpartsentryMdl(data, function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
};




exports.getJobCategoriesCtrl = function (req, res) { decryptedBody(req, res, appmdl.getJobCategoriesMdl); };
exports.editJobCtrl = function (req, res) { decryptedBody(req, res, appmdl.editJobMdl); };

exports.submitrepairtrackingCtrl = function (req, res) {
  var data;
  try { data = decryptPayload(req.body.encryptedPayload); } catch (e) { data = req.body; }

  if (data.quick_complete) {
    appmdl.quickCompleteJobMdl(data, function (err) {
      if (err) { console.log(err); return res.send({ status: 500 }); }
      res.send({ status: 200, voucher_numbers: [] });
    });
    return;
  }

  appmdl.submitrepairtrackingMdl(data, function (err) {
    if (err) { console.log(err); return res.send({ status: 500 }); }
    var blocks = data.voucher_blocks || [];
    var targetState = (data.target_state || 'CLOSED').toUpperCase();
    // Only create accounting vouchers when closing the job
    if (targetState !== 'CLOSED' || blocks.length === 0) {
      return res.send({ status: 200, voucher_numbers: [] });
    }
    appmdl.createGarageVouchersMdl(data, function (err2, voucherNumbers) {
      if (err2) { console.log(err2); return res.send({ status: 200, voucher_numbers: [] }); }
      res.send({ status: 200, voucher_numbers: voucherNumbers || [] });
    });
  });
};



exports.getScheduledJobsCtrl = function (req, res) {
  var data = {};
  appmdl.getScheduledJobsMdl(data, function (err, results) {
    if (err) { console.log(err); return res.send({ status: 500, data: [] }); }
    res.send({ status: 200, data: results });
  });
};

exports.getRepeatJobsCtrl = function (req, res) {
  appmdl.getRepeatJobsMdl({}, function (err, results) {
    if (err) { console.log('[getRepeatJobs] error:', err); return res.send({ status: 500, data: [] }); }
    res.send({ status: 200, data: results });
  });
};

exports.updateJobVoucherCtrl = function (req, res) {
  try {
    var data = decryptPayload(req.body.encryptedPayload);
    appmdl.updateJobVoucherMdl(data, function (err) {
      if (err) { console.error('[updateJobVoucher] error:', err); return res.status(500).json({ status: 500 }); }
      res.send({ status: 200 });
    });
  } catch (e) {
    res.status(500).json({ status: 500, message: e.message });
  }
};

exports.changeJobSatusCtrl = function (req, res) {
  var data;
  try { data = decryptPayload(req.body.encryptedPayload); } catch (e) { data = req.body; }
  console.log('[changeJobSatus] id:', data.id, '| state:', data.state);
  appmdl.changeJobSatusMdl(data, function (err, results) {
    if (err) {
      console.log('[changeJobSatus] DB error:', err);
      res.send({ status: 500, data: results });
      return;
    }
    console.log('[changeJobSatus] affectedRows:', results && results.affectedRows);
    res.send({ status: 200, data: results });
  });
};

exports.getJobStageDataCtrl = function (req, res) {
  var data;
  try { data = decryptPayload(req.body.encryptedPayload); } catch (e) { data = req.body; }
  console.log('[getJobStageData] job id:', data.id);
  appmdl.getJobStageDataMdl(data, function (err, result) {
    if (err) { console.log('[getJobStageData] error:', err); return res.send({ status: 500 }); }
    console.log('[getJobStageData] parts found:', result.parts.length, '| ledgers found:', result.ledgers.length);
    res.send({ status: 200, parts: result.parts, ledgers: result.ledgers });
  });
};

exports.checkJobPermissionCtrl = function (req, res) {
  var data;
  try { data = decryptPayload(req.body.encryptedPayload); } catch (e) { data = req.body; }
  appmdl.checkJobPermissionMdl(data, function (err, results) {
    if (err) { console.log(err); res.send({ status: 500 }); return; }
    var row = (results && results[0]) || { can_approve: 0, can_complete: 0 };
    res.send({ status: 200, can_approve: row.can_approve ? 1 : 0, can_complete: row.can_complete ? 1 : 0 });
  });
};

exports.jobWorkflowActionCtrl = function (req, res) {
  var data;
  try { data = decryptPayload(req.body.encryptedPayload); } catch (e) { data = req.body; }
  appmdl.jobWorkflowActionMdl(data, function (err, results) {
    if (err) { console.log(err); res.send({ status: 500 }); return; }
    res.send({ status: 200, data: results });
  });
};

exports.getJobApprovalHistoryCtrl = function (req, res) {
  var data;
  try { data = decryptPayload(req.body.encryptedPayload); } catch (e) { data = req.body; }
  appmdl.getJobApprovalHistoryMdl(data, function (err, results) {
    if (err) { console.log(err); res.send({ status: 500 }); return; }
    res.send({ status: 200, data: results });
  });
};

exports.getJobFullHistoryCtrl = function (req, res) {
  var data;
  try { data = decryptPayload(req.body.encryptedPayload); } catch (e) { data = req.body; }
  appmdl.getJobFullHistoryMdl(data, function (err, result) {
    if (err) { console.log('[getJobFullHistory] error:', err); res.send({ status: 500 }); return; }
    res.send({ status: 200, job: result.job, stages: result.stages, parts: result.parts, ledgers: result.ledgers });
  });
};

// Garage Extension Controllers: Service Reminders, Tyre Management, Battery Management -------------------------------------------------------------------

function decryptedBody(req, res, modelFn) {
  const { encryptedPayload, signature } = req.body;
  try {
    validateSignature(encryptedPayload, signature);
  } catch (e) {
    res.send({ status: 400, msg: "Invalid request signature" });
    return;
  }
  let data;
  try {
    data = decryptPayload(encryptedPayload);
  } catch (e) {
    res.send({ status: 400, msg: "Invalid payload" });
    return;
  }
  modelFn(data, function (err, results) {
    if (err) {
      console.log(err);
      res.send({ status: 500, data: results });
      return;
    }
    res.send({ status: 200, data: results });
  });
}

// ── Service Reminders ───────────────────────────────────────────────────────

// Generates `count` sequential "S<YYMMDD><3-digit seq>" reference numbers,
// mirroring the J/V numbering scheme used for job cards & vouchers.
function genReminderRefNumbers(count, callback) {
  appmdl.todayReminderCountMdl(function (err, cresults) {
    if (err) { callback(err); return; }
    var todayCount = cresults[0] ? cresults[0].cnt * 1 : 0;
    var datePart = moment().format('YYMMDD');
    var refs = [];
    for (var i = 0; i < count; i++) {
      refs.push('S' + datePart + String(todayCount + i + 1).padStart(3, '0'));
    }
    callback(null, refs);
  });
}

exports.getServiceRemindersCtrl = function (req, res) {
  appmdl.getServiceRemindersMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addServiceReminderCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try { validateSignature(encryptedPayload, signature); } catch (e) {
    return res.send({ status: 400, msg: "Invalid request signature" });
  }
  let data;
  try { data = decryptPayload(encryptedPayload); } catch (e) {
    return res.send({ status: 400, msg: "Invalid payload" });
  }
  genReminderRefNumbers(1, function (err, refs) {
    if (err) { res.send({ status: 500, data: null }); return; }
    appmdl.addServiceReminderMdl(Object.assign({}, data, { ref_number: refs[0] }), function (err2, results) {
      if (err2) { console.log(err2); res.send({ status: 500, data: results }); return; }
      res.send({ status: 200, data: results, ref_number: refs[0] });
    });
  });
};

// Creates one reminder per row in `reminders`, with race-free sequential ref
// numbers computed from a single count query (same pattern as addrepairentryCtrl).
exports.addServiceRemindersBulkCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try { validateSignature(encryptedPayload, signature); } catch (e) {
    return res.send({ status: 400, msg: "Invalid request signature" });
  }
  let data;
  try { data = decryptPayload(encryptedPayload); } catch (e) {
    return res.send({ status: 400, msg: "Invalid payload" });
  }

  const rows = data.reminders || [];
  if (!rows.length) return res.send({ status: 400, msg: 'No reminders provided' });

  genReminderRefNumbers(rows.length, function (err, refs) {
    if (err) { res.send({ status: 500, data: null }); return; }

    const created = [];
    let idx = 0;

    function insertNext() {
      if (idx >= rows.length) {
        return res.send({ status: 200, data: created });
      }
      const row = rows[idx];
      appmdl.addServiceReminderMdl(Object.assign({}, row, {
        ref_number: refs[idx],
        user_id: data.user_id,
        usr_nm: data.usr_nm,
      }), function (err2, result2) {
        if (err2) { console.log(err2); return res.send({ status: 500, data: null }); }
        created.push({ ref_number: refs[idx], id: result2.insertId });
        idx++;
        insertNext();
      });
    }
    insertNext();
  });
};

exports.editServiceReminderCtrl = function (req, res) { decryptedBody(req, res, appmdl.editServiceReminderMdl); };

const REPEAT_UNIT_TO_MOMENT = { Days: 'days', Weeks: 'weeks', Months: 'months', Years: 'years' };

exports.completeServiceReminderCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try { validateSignature(encryptedPayload, signature); } catch (e) {
    return res.send({ status: 400, msg: "Invalid request signature" });
  }
  let data;
  try { data = decryptPayload(encryptedPayload); } catch (e) {
    return res.send({ status: 400, msg: "Invalid payload" });
  }

  appmdl.getServiceReminderByIdMdl(data.id, function (err, rows) {
    if (err) { res.send({ status: 500, data: null }); return; }
    var reminder = rows && rows[0];

    appmdl.completeServiceReminderMdl(data, function (err2, results) {
      if (err2) { res.send({ status: 500, data: results }); return; }

      if (reminder && reminder.is_repeating) {
        var unit = REPEAT_UNIT_TO_MOMENT[reminder.repeat_unit] || 'months';
        var nextDue = moment(data.last_done_date || new Date()).add(reminder.repeat_interval || 1, unit).format('YYYY-MM-DD');
        genReminderRefNumbers(1, function (refErr, refs) {
          appmdl.addServiceReminderMdl({
            ref_number: refErr ? null : refs[0],
            vehicle_number: reminder.vehicle_number,
            reminder_type: reminder.reminder_type,
            due_date: nextDue,
            due_odometer: null,
            remarks: reminder.remarks,
            is_repeating: 1,
            repeat_interval: reminder.repeat_interval,
            repeat_unit: reminder.repeat_unit,
            user_id: reminder.created_by_id,
            usr_nm: reminder.created_by_name,
          }, function () {
            res.send({ status: 200, data: results });
          });
        });
      } else {
        res.send({ status: 200, data: results });
      }
    });
  });
};

exports.deleteServiceReminderCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteServiceReminderMdl); };
exports.linkJobCardToReminderCtrl = function (req, res) { decryptedBody(req, res, appmdl.linkJobCardToReminderMdl); };

// ── Tyre Inventory ───────────────────────────────────────────────────────────
exports.getTyreInventoryCtrl = function (req, res) {
  appmdl.getTyreInventoryMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addTyreInventoryCtrl = function (req, res) { decryptedBody(req, res, appmdl.addTyreInventoryMdl); };
exports.editTyreInventoryCtrl = function (req, res) { decryptedBody(req, res, appmdl.editTyreInventoryMdl); };
exports.deleteTyreInventoryCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteTyreInventoryMdl); };
exports.sellTyresCtrl = function (req, res) { decryptedBody(req, res, appmdl.sellTyresMdl); };

// ── Tyre Position ────────────────────────────────────────────────────────────
exports.getTyrePositionsCtrl = function (req, res) {
  appmdl.getTyrePositionsMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.assignTyrePositionCtrl = function (req, res) { decryptedBody(req, res, appmdl.assignTyrePositionMdl); };
exports.removeTyrePositionCtrl = function (req, res) { decryptedBody(req, res, appmdl.removeTyrePositionMdl); };
exports.moveTyreStockCtrl = function (req, res) { decryptedBody(req, res, appmdl.moveTyreStockMdl); };
exports.getTyrePositionHistoryCtrl = function (req, res) {
  appmdl.getTyrePositionHistoryMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};

// ── Tyre Vendors ─────────────────────────────────────────────────────────────
exports.getTyreVendorsCtrl = function (req, res) {
  appmdl.getTyreVendorsMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addTyreVendorCtrl = function (req, res) { decryptedBody(req, res, appmdl.addTyreVendorMdl); };
exports.editTyreVendorCtrl = function (req, res) { decryptedBody(req, res, appmdl.editTyreVendorMdl); };
exports.deleteTyreVendorCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteTyreVendorMdl); };

// ── Tyre Sizes ───────────────────────────────────────────────────────────────
exports.getTyreSizesCtrl = function (req, res) {
  appmdl.getTyreSizesMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addTyreSizeCtrl = function (req, res) { decryptedBody(req, res, appmdl.addTyreSizeMdl); };
exports.editTyreSizeCtrl = function (req, res) { decryptedBody(req, res, appmdl.editTyreSizeMdl); };
exports.deleteTyreSizeCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteTyreSizeMdl); };

// ── Tyre Makes ─────────────────────────────────────────────────────────────
exports.getTyreMakesCtrl = function (req, res) {
  appmdl.getTyreMakesMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addTyreMakeCtrl = function (req, res) { decryptedBody(req, res, appmdl.addTyreMakeMdl); };
exports.editTyreMakeCtrl = function (req, res) { decryptedBody(req, res, appmdl.editTyreMakeMdl); };
exports.deleteTyreMakeCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteTyreMakeMdl); };

// ── Tyre Retread Entry ───────────────────────────────────────────────────────
exports.getTyreRetreadsCtrl = function (req, res) {
  appmdl.getTyreRetreadsMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addTyreRetreadCtrl = function (req, res) { decryptedBody(req, res, appmdl.addTyreRetreadMdl); };
exports.deleteTyreRetreadCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteTyreRetreadMdl); };

// ── Tyre Repair ──────────────────────────────────────────────────────────────
exports.getTyreRepairsCtrl = function (req, res) {
  appmdl.getTyreRepairsMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addTyreRepairCtrl = function (req, res) { decryptedBody(req, res, appmdl.addTyreRepairMdl); };
exports.deleteTyreRepairCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteTyreRepairMdl); };

// ── Battery Management ───────────────────────────────────────────────────────
exports.getBatteriesCtrl = function (req, res) {
  appmdl.getBatteriesMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addBatteryCtrl = function (req, res) { decryptedBody(req, res, appmdl.addBatteryMdl); };
exports.editBatteryCtrl = function (req, res) { decryptedBody(req, res, appmdl.editBatteryMdl); };
exports.deleteBatteryCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteBatteryMdl); };
exports.getBatteryLedgersCtrl = function (req, res) { decryptedBody(req, res, appmdl.getBatteryLedgersMdl); };
exports.getBatteryHistoryCtrl = function (req, res) { decryptedBody(req, res, appmdl.getBatteryHistoryMdl); };

// ── Battery Brands (Main Masters) ───────────────────────────────────────────
exports.getBatteryBrandsCtrl = function (req, res) {
  appmdl.getBatteryBrandsMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addBatteryBrandCtrl = function (req, res) { decryptedBody(req, res, appmdl.addBatteryBrandMdl); };
exports.deleteBatteryBrandCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteBatteryBrandMdl); };

// ── Battery Capacities (Main Masters) ───────────────────────────────────────
exports.getBatteryCapacitiesCtrl = function (req, res) {
  appmdl.getBatteryCapacitiesMdl(function (err, results) {
    if (err) { res.send({ status: 500, data: null }); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addBatteryCapacityCtrl = function (req, res) { decryptedBody(req, res, appmdl.addBatteryCapacityMdl); };
exports.deleteBatteryCapacityCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteBatteryCapacityMdl); };

// ── Garage Type Masters (managed from Main Masters) ──────────────────────────
exports.getServiceReminderTypesCtrl = function (req, res) {
  appmdl.getServiceReminderTypesMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addServiceReminderTypeCtrl = function (req, res) { decryptedBody(req, res, appmdl.addServiceReminderTypeMdl); };
exports.editServiceReminderTypeCtrl = function (req, res) { decryptedBody(req, res, appmdl.editServiceReminderTypeMdl); };
exports.deleteServiceReminderTypeCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteServiceReminderTypeMdl); };

// ── Service Schedules ─────────────────────────────────────────────────────────
exports.getServiceSchedulesCtrl = function (req, res) {
  appmdl.getServiceSchedulesMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addServiceScheduleCtrl = function (req, res) { decryptedBody(req, res, appmdl.addServiceScheduleMdl); };
exports.editServiceScheduleCtrl = function (req, res) { decryptedBody(req, res, appmdl.editServiceScheduleMdl); };
exports.deleteServiceScheduleCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteServiceScheduleMdl); };

// ── Lubricant / Fluid Schedules ───────────────────────────────────────────────
exports.getLubricantSchedulesCtrl = function (req, res) {
  appmdl.getLubricantSchedulesMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addLubricantScheduleCtrl = function (req, res) { decryptedBody(req, res, appmdl.addLubricantScheduleMdl); };
exports.editLubricantScheduleCtrl = function (req, res) { decryptedBody(req, res, appmdl.editLubricantScheduleMdl); };
exports.deleteLubricantScheduleCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteLubricantScheduleMdl); };

exports.getTyrePositionsMasterCtrl = function (req, res) {
  appmdl.getTyrePositionsMasterMdl(req.body, function (err, results) {
    if (err) { res.send(500, "Server Error"); return; }
    res.send({ status: 200, data: results });
  });
};
exports.addTyrePositionMasterCtrl = function (req, res) { decryptedBody(req, res, appmdl.addTyrePositionMasterMdl); };
exports.editTyrePositionMasterCtrl = function (req, res) { decryptedBody(req, res, appmdl.editTyrePositionMasterMdl); };
exports.deleteTyrePositionMasterCtrl = function (req, res) { decryptedBody(req, res, appmdl.deleteTyrePositionMasterMdl); };


exports.getlaundryapproveddataCtrl = function (req, res) {
  appmdl.getlaundryapproveddataMdl(function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

exports.getlaundrysearchdataCtrl = function (req, res) {
  var data = req.body;
  appmdl.getlaundrysearchdataMdl(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};

// exports.addsparetankbusno = function (req, res) {
//   //   var data = req.body;
//   const { encryptedPayload, signature } = req.body;
//   validateSignature(encryptedPayload, signature);
//   const payload = decryptPayload(encryptedPayload);
//   var reqdata = payload;
//   appmdl.addsparetankbusno(reqdata, function (err, results) {
//     if (err) {
//       res.send({ status: 500, data: results });
//       return;
//     }
//     res.send({ status: 200, data: results });
//   });
// };

exports.addsparetankbusno = function (req, res) {
  var data = req.body;
  appmdl.addsparetankbusno(data, function (err, results) {
    if (err) {
      res.send(500, "Server Error");
      return;
    }
    res.send({ status: 200, data: results });
  });
};



// ---------------------------------------------------------------Cron Jobs Code --------------------------------------------

exports.handleRepeatedJobs = async () => {
  console.log("[RepeatJobs] Checking repeat jobs due in next 2 days...");
  try {
    const jobs = await appmdl.getDueRepeatedJobs();
    if (!jobs || jobs.length === 0) {
      console.log("[RepeatJobs] No repeat jobs pending.");
      return { created: 0 };
    }
    console.log(`[RepeatJobs] Found ${jobs.length} job(s) needing a Service Reminder.`);

    const refs = await new Promise((resolve, reject) => {
      genReminderRefNumbers(jobs.length, (err, r) => { if (err) reject(err); else resolve(r); });
    });

    const created = [];
    for (let i = 0; i < jobs.length; i++) {
      try {
        await new Promise((resolve, reject) => {
          appmdl.createReminderFromRepeatedJobMdl({
            ref_number: refs[i],
            vehicle_number: jobs[i].vehicle_number,
            reminder_type: jobs[i].repair_category_name ? `${jobs[i].repair_category_name} - Repeat Service` : 'Repeat Service',
            due_date: jobs[i].next_job_date,
            source_job_card_id: jobs[i].id,
            source_job_card_number: jobs[i].job_card_number,
          }, (err) => { if (err) reject(err); else resolve(); });
        });
        created.push(refs[i]);
        console.log(`[RepeatJobs] Created reminder ${refs[i]} from parent ${jobs[i].job_card_number}`);
      } catch (jobErr) {
        console.log(`[RepeatJobs] Failed to create reminder for ${jobs[i].job_card_number}:`, jobErr.message);
      }
    }
    console.log(`[RepeatJobs] Done. Created ${created.length} new reminder(s).`);
    return { created: created.length, reminders: created };
  } catch (error) {
    console.log("[RepeatJobs] Error:", error.message);
    return { created: 0, error: error.message };
  }
};

exports.triggerRepeatJobsCtrl = async (req, res) => {
  try {
    const result = await exports.handleRepeatedJobs();
    res.send({ status: 200, data: result });
  } catch (e) {
    res.send({ status: 500, msg: e.message });
  }
};

// ── Bulk Upload Controllers ────────────────────────────────────────────────────
exports.bulkUploadBusesCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try {
    validateSignature(encryptedPayload, signature);
    const payload = decryptPayload(encryptedPayload);
    appmdl.bulkUploadBusesMdl(payload.rows, payload.user_id, payload.usr_nm, function (err, result) {
      if (err) return res.send({ status: 500, msg: 'Server Error' });
      res.send({ status: 200, data: result });
    });
  } catch (e) {
    res.send({ status: 400, msg: 'Invalid request' });
  }
};

exports.bulkUploadServiceRoutesCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try {
    validateSignature(encryptedPayload, signature);
    const payload = decryptPayload(encryptedPayload);
    appmdl.bulkUploadServiceRoutesMdl(payload.rows, payload.user_id, payload.usr_nm, function (err, result) {
      if (err) return res.send({ status: 500, msg: 'Server Error' });
      res.send({ status: 200, data: result });
    });
  } catch (e) {
    res.send({ status: 400, msg: 'Invalid request' });
  }
};

exports.bulkUploadStaffCtrl = function (req, res) {
  const { encryptedPayload, signature } = req.body;
  try {
    validateSignature(encryptedPayload, signature);
    const payload = decryptPayload(encryptedPayload);
    appmdl.bulkUploadStaffMdl(payload.type, payload.rows, payload.user_id, payload.usr_nm, function (err, result) {
      if (err) return res.send({ status: 500, msg: 'Server Error' });
      res.send({ status: 200, data: result });
    });
  } catch (e) {
    res.send({ status: 400, msg: 'Invalid request' });
  }
};
