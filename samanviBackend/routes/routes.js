var express = require('express');
router = express.Router();
var routcontroller = require('../controllers/mainCtrl');
const { apiRateLimiter } = require('../utils/apiratelimiter'); 
const { verifyToken } = require('../utils/jwtoken');

// Api start
router.post('/getdashotp',routcontroller.getdashotpCtrl);
//------------------------------------------------------------------------------- permissions Started -------------------------------------------------------------------------------//
router.post('/loginuser',apiRateLimiter, routcontroller.getUserDataCtrl);
router.post('/get_user_moduleslist',verifyToken, routcontroller.get_user_moduleslist);
router.post('/houseimageedit',verifyToken, routcontroller.houseimageeditCtrl);
router.post('/getusermainmodules',verifyToken, routcontroller.getusermainmodulesCtrl);
router.post('/createuserpermissions',verifyToken, routcontroller.createuserpermissionsCtrl);
router.post('/geteditusermoduleslist',verifyToken, routcontroller.geteditusermoduleslistCtrl);
router.post('/postusermenulist', verifyToken,routcontroller.postusermenulistCtrl);
router.post('/getusermoduleslist', verifyToken, routcontroller.getusermoduleslistCtrl);

//------------------------------------------------------------------------------- permissions End -------------------------------------------------------------------------------//
//////////////////////////////////////////// help desk /////////////////////////////////////////
router.post('/helpdeskcount',verifyToken, routcontroller.helpdeskcount); //helpdeskcount
router.post('/problemdone',verifyToken, routcontroller.problemdone);
router.post('/submithelpdata', verifyToken,routcontroller.submithelpdata);
router.post('/getdata',verifyToken, routcontroller.getdata);
router.get('/deleteUsers/:ind',verifyToken, routcontroller.deleteUsersCtrl);
router.get('/getallusers', verifyToken, routcontroller.getAllUsersCtrl);


///new code starts
router.post('/getdepartmentData', verifyToken,routcontroller.getdepartmentDataCtrl);
router.post('/addNewbusnum',verifyToken, routcontroller.addNewbusnumCtrl);
router.post('/getbussesdata',verifyToken, routcontroller.getbussesdataCtrl);
router.post('/getbussessparetankdata',verifyToken, routcontroller.getbussessparetankdataCtrl);
router.post('/addservicenumner',verifyToken,routcontroller.addservicenumner);
router.post('/driverone',verifyToken, routcontroller.driverone);
router.post('/getdriveone',verifyToken, routcontroller.getdriveone);
router.post('/addstaffregister',verifyToken, routcontroller.addstaffregisterCtrl);
router.post('/addhelperregister',verifyToken,routcontroller.addhelperregisterCtrl);
router.post('/adddriverregister',verifyToken,routcontroller.adddriverregisterCtrl);
router.post('/getservicenumberdata', verifyToken,routcontroller.getservicenumberdata);
router.post('/getserviceforreportdropdown',verifyToken, routcontroller.getserviceforreportdropdownCtrl);

router.post('/gethelper',verifyToken, routcontroller.gethelperCtrl);
router.post('/deletebusnumber',verifyToken,routcontroller.deletebusnumber);
router.post('/deleteservicenumber',verifyToken, routcontroller.deleteservicenumber);
router.post('/deletedriverone', verifyToken, routcontroller.deleteDriveroneCtrl);

// Staff Types
router.get('/getstafftypes', verifyToken, routcontroller.getStaffTypesCtrl);
router.post('/addstafftype', verifyToken, routcontroller.addStaffTypeCtrl);
router.post('/deletestafftype', verifyToken, routcontroller.deleteStaffTypeCtrl);
// Vehicle Types
router.get('/getvehicletypes', verifyToken, routcontroller.getVehicleTypesCtrl);
router.post('/addvehicletype', verifyToken, routcontroller.addVehicleTypeCtrl);
router.post('/deletevehicletype', verifyToken, routcontroller.deleteVehicleTypeCtrl);

// Terminate / Rejoin
router.post('/terminatestaff', verifyToken, routcontroller.terminateStaffCtrl);
router.post('/rejoinstaff', verifyToken, routcontroller.rejoinStaffCtrl);
router.get('/getterminatedstaff', verifyToken, routcontroller.getTerminatedStaffCtrl);
router.post('/deletedriverdata',verifyToken, routcontroller.deletedriverdata);
router.post('/deletehelperdata',verifyToken, routcontroller.deletehelperdata);
router.post('/deletestaffdata',verifyToken, routcontroller.deletestaffdataCtrl);

////booking module starts
router.post('/getaccountantsdata', routcontroller.getaccountantsdataCtrl);
router.post('/accounttantscleardata', routcontroller.accounttantscleardataCtrl);
router.post('/expensessubmit', routcontroller.expensessubmitCtrl);
router.post('/cashreceiptsubmit', routcontroller.cashreceiptsubmit);
router.post('/addtoaccountentagent', routcontroller.addtoaccountentagentCtrl);

router.post('/getaccountantanalysisdata', routcontroller.getaccountantanalysisdataCtrl);
router.post('/accountanthistdata', routcontroller.accountanthistdataCtrl);
router.post('/getvendordata', routcontroller.getvendordataCtrl);

router.post('/accountanthistcheckdata', routcontroller.accountanthistcheckdataCtrl);
router.post('/totalincomesourcedata', routcontroller.totalincomesourcedataCtrl);
router.post('/chechwithadditioncounts', routcontroller.chechwithadditioncountsCtrl);
router.post('/totalexpensesdata', routcontroller.totalexpensesdataCtrl);
router.post('/chechwithexpenescounts', routcontroller.chechwithexpenescountsCtrl);
router.get('/getexpensestochairmanshistory', routcontroller.getexpensestochairmanshistoryCtrl);
router.post('/deleteincomsorcedata', routcontroller.deleteincomsorcedataCtrl);
router.post('/aditionalincomesource', routcontroller.aditionalincomesourceCtrl);
router.post('/getincomesource', routcontroller.getincomesourceCtrl);
router.post('/submiteditincomesrc', routcontroller.submiteditincomesrcCtrl);
router.get('/getexpenseslist', routcontroller.getexpenseslist);
router.get('/getbookingsdata', routcontroller.getbookingsdataCtrl);
router.post('/assigntoagent', routcontroller.assigntoagentCtrl);
router.post('/assigntoamounts', routcontroller.assigntoamountsCtrl);
router.post('/deletedata', routcontroller.deletedataCtrl);
router.post('/uploadexceldata', routcontroller.uploadexceldataCtrl);
router.post('/editthedataofadmin', routcontroller.editthedataofadminCtrl);
router.post('/addSamanvidata', routcontroller.addSamanvidataCntrl);
router.get('/getbookingsdatahisdatewise', routcontroller.getbookingsdatahisdatewiseCtrl);
router.post('/getbookingselecteddateswise', routcontroller.getbookingselecteddateswiseCtrl);
router.post('/getcollectionagentdata', routcontroller.getcollectionagentdataCtrl);
router.get('/getaccountantsnames', routcontroller.getaccountantsnamesCtrl);
router.post('/getcollectionagenanalysisdata', routcontroller.getcollectionagenanalysisdataCtrl);
router.post('/getcollectiondatadatewise', routcontroller.getcollectiondatadatewiseCtrl);
router.post('/getcollectiondataondates', routcontroller.getcollectiondataondatesCtrl);
router.post('/getexpenses', routcontroller.getexpensesCtrl);
router.post('/getexpensesreport', routcontroller.getexpensesreportCtrl);
router.post('/deleteexpensesdata', routcontroller.deleteexpensesdataCtrl);
router.post('/addexpensesdetails', routcontroller.addexpensesdetails);
router.post('/updateexpensesdetails', routcontroller.updateexpensesdetailsCtrl);
router.post('/deleteexpense', routcontroller.deleteexpenseCtrl);
router.post('/getexpensesfiltere', routcontroller.getexpensesfiltere);
router.post('/getexpensesreportsfiltere', routcontroller.getexpensesreportsfiltereCtrl);
router.post('/getfuelentrysearchdata', routcontroller.getfuelentrysearchdataCtrl);

router.post('/getbusseraching', routcontroller.getbusseraching);
router.post('/getaccountantanalysisdatas', routcontroller.getaccountantanalysisdatas);
router.post('/getserviceseraching', routcontroller.getserviceseraching);
router.post('/getpatientDiagnosticTests', routcontroller.getpatientDiagnosticTestsCtrl);

router.post('/addledgerpostdata',routcontroller.addledgerpostdataCtrl);
router.post('/addprofitlosspostdata',routcontroller.addprofitlosspostdataCtrl);
router.get('/getassetsdropdown', routcontroller.getassetsdropdownCtrl);
router.post('/addassetpostdata',verifyToken, routcontroller.addassetpostdataCtrl);
router.post('/selectedassetdropdowndata', routcontroller.selectedassetdropdowndataCtrl);

router.get('/getliablitiesdropdown', routcontroller.getliablitiesdropdownCtrl);
router.post('/addliablitypostdata',verifyToken, routcontroller.addliablitypostdataCtrl);
router.post('/addincomepostdata',verifyToken, routcontroller.addincomepostdataCtrl);
router.post('/addexpensepostdata',verifyToken, routcontroller.addexpensepostdataCtrl);
router.get('/getincomedropdown', routcontroller.getincomedropdownCtrl);
router.post('/selectedprofitsdropdowndata', routcontroller.selectedprofitsdropdowndataCtrl);
router.post('/selectedprofitsdropdownmaindatagetchild', routcontroller.selectedprofitsdropdownmaindatagetchildCtrl);
router.post('/subchildselectedprofitsdropdownmaindatagetchild', routcontroller.subchildselectedprofitsdropdownmaindatagetchildCtrl);
router.get('/getexpensesdropdown', routcontroller.getexpensesdropdownCtrl);
router.post('/getallstfdrivhelp', routcontroller.getallstfdrivhelpCtrl);
//courtcases start

router.post("/alldistrictsget", verifyToken, routcontroller.alldistrictsgetctrl);
router.post("/postdistrictsdata", verifyToken, routcontroller.postdistrictsdatactrl);
router.post("/dltdistrictsdata", verifyToken, routcontroller.dltdistrictsdatactrl);
router.post("/editdistrictsdata", verifyToken, routcontroller.editdistrictsdatactrl);

router.post('/submitMandalsData',verifyToken, routcontroller.submitMandalsDataCtrl);
router.post('/getallmandaldata',verifyToken, routcontroller.getallmandaldataCtrl);
router.post("/editmandals", verifyToken, routcontroller.editmandalsctrl);
router.post('/deletemandals',verifyToken, routcontroller.deletemandalsCtrl);
router.post('/getallchilddatadata',verifyToken, routcontroller.getallchilddatadataCtrl);
//Villages
router.post('/submitVillagesData',verifyToken, routcontroller.submitVillagesDataCtrl);
router.post('/getallvillagedata',verifyToken, routcontroller.getallvillagedataCtrl);
router.post("/editvillages", verifyToken, routcontroller.editvillagesctrl);
router.post('/deletevillages',verifyToken, routcontroller.deletevillagesCtrl);

router.post("/getallTemplesdata", verifyToken, routcontroller.getallTemplesdataCtrl);
router.post("/editTemples", verifyToken, routcontroller.editTemplesCtrl);
router.post("/submitTemples", verifyToken, routcontroller.submitTemplesCtrl);
router.post("/deletetemple", verifyToken, routcontroller.deletetempleCtrl);
router.post("/submitfinaldata", verifyToken, routcontroller.submitfinaldataCtrl);
router.post('/getmainallchilddatadata',verifyToken, routcontroller.getmainallchilddatadataCtrl);
router.post('/getmainmasterchildsubseconddata',verifyToken, routcontroller.getmainmasterchildsubseconddataCtrl);
router.post("/submitsubchildtwomainmasters", verifyToken, routcontroller.submitsubchildtwomainmastersCtrl);
router.post("/getsubchildtworeportdata", verifyToken, routcontroller.getsubchildtworeportdataCtrl);
router.post("/getledgerdatadropdown", verifyToken, routcontroller.getledgerdatadropdownCtrl);
router.post('/getexpensetripledgerdata',verifyToken, routcontroller.getexpensetripledgerdataCtrl);
router.post('/Selectdatagetfinaltranscationsreport',verifyToken, routcontroller.SelectdatagetfinaltranscationsreportCtrl);
router.post('/getallemployeesdropdownvoucherentry',verifyToken, routcontroller.getallemployeesdropdownvoucherentryCtrl);
router.post('/getLedgerWiseReport', verifyToken, routcontroller.getLedgerWiseReportCtrl);

///sudheer code starts
router.post("/driverdata", verifyToken, routcontroller.driverdata);
router.post("/tripcreated", routcontroller.tripcreated);
router.post("/deletetripcreated", routcontroller.deletetripcreatedCtrl);
router.get("/gettripceated", routcontroller.gettripceated);

router.post("/gettripceated1", routcontroller.gettripceated1Ctrl);

router.get("/getvoucherentrydata", routcontroller.getvoucherentrydataCtrl);
router.post('/submitvoucherentrydata',verifyToken, routcontroller.submitvoucherentrydataCtrl);
router.post('/updatevoucherentry',verifyToken, routcontroller.updatevoucherentryCtrl);
router.post('/deletevoucherentry',verifyToken, routcontroller.deletevoucherentryCtrl);


//courtcases end
///booking module ends
router.post("/getvouchermodaldata",verifyToken,routcontroller.getvouchermodaldataCtrl);

router.post("/getvouchertypedata",verifyToken,routcontroller.getvouchertypedatactrl);
router.post("/submitvouchertype",verifyToken,routcontroller.submitvouchertypectrl);
router.post("/editvouchername",verifyToken,routcontroller.editvouchernamectrl);
router.post("/deletevouchername",verifyToken,routcontroller.deletevouchernamectrl);

router.post("/updatevoucherentrystatus",verifyToken,routcontroller.updatevoucherentrystatusCtrl);
router.get("/getvoucheraudit/:c_number",verifyToken,routcontroller.getVoucherAuditCtrl);
router.post("/updatetripadminstatus",verifyToken,routcontroller.updatetripadminstatusCtrl);
router.post("/updatefueladminstatus",verifyToken,routcontroller.updatefueladminstatusCtrl);
router.post("/updatelaundryadminstatus",verifyToken,routcontroller.updatelaundryadminstatusCtrl);
router.post("/deletelaundrybill",verifyToken,routcontroller.deletelaundrybillCtrl);
router.post("/getbeta",verifyToken,routcontroller.getbetaCtrl);
router.post("/getmodaldata",verifyToken,routcontroller.getmodaldataCtrl);
router.post("/gettripdeletedmodaldata",verifyToken,routcontroller.gettripdeletedmodaldataCtrl);
router.post("/submitlaundrytypemainmasters",verifyToken,routcontroller.submitlaundrytypemainmastersCtrl);
router.post("/getlaundrytypemainmasters",verifyToken,routcontroller.getlaundrytypemainmastersCtrl);
router.post('/submitlaundrydata',verifyToken, routcontroller.submitlaundrydataCtrl);
router.post('/submitfuelentery',verifyToken, routcontroller.submitfuelentrydataCtrl);
router.post('/updatefuelenterydata',verifyToken, routcontroller.updatefuelenterydataCtrl);
router.post(
  "/getVehicleDetails",
  verifyToken,
  routcontroller.getVehicleDetailsCtrl
);

router.post('/getalldrivers', verifyToken, routcontroller.getalldrivers);

router.post('/deletefueldata', verifyToken, routcontroller.deletefueldataCtrl1);
router.post('/Selectdatagetfinaltranscationsreport1',verifyToken, routcontroller.Selectdatagetfinaltranscationsreport1Ctrl);
router.post('/getledgername',verifyToken, routcontroller.getledgernameCtrl);
router.post('/getmainmasterssubgroup',verifyToken, routcontroller.getmainmasterssubgroupCtrl);

router.post('/getmainmasterssubchild',verifyToken, routcontroller.getmainmasterssubchildCtrl);

router.get("/getlaundryreportdata", routcontroller.getlaundryreportdataCtrl);
router.post('/getvendorlistlaundrydropdown',verifyToken, routcontroller.getvendorlistlaundrydropdownCtrl);
router.post('/Selectedvendordropdownoption',verifyToken, routcontroller.SelectedvendordropdownoptionCtrl);

router.post('/updateLaundryData',verifyToken, routcontroller.updateLaundryDataCtrl);


router.post('/submitlaundryaddbill',verifyToken, routcontroller.submitlaundryaddbillCtrl);
router.post('/updateLaundryBill',verifyToken, routcontroller.updatelaundrybillCtrl);

///////fuel api starts
router.post('/getledgername',verifyToken, routcontroller.getledgernameCtrl);
router.post('/getfuelledgername',verifyToken, routcontroller.getfuelledgernameCtrl);
router.post('/getsearchdata',verifyToken, routcontroller.getsearchdataCtrl);
router.post('/submittarget',verifyToken, routcontroller.submittargetCtrl);
router.post('/gettargetdata',verifyToken, routcontroller.gettargetdataCtrl);
router.post("/getdaywisereport",verifyToken,routcontroller.getdaywisereportCtrl);
router.post("/getstationwisereport",verifyToken,routcontroller.getstationwisereportCtrl);
router.post('/getbusnumber',verifyToken, routcontroller.getbusnumberCtrl);
router.post("/getbuswisewisereports",verifyToken,routcontroller.getbuswisewisereportsCtrl);
router.post("/getbusperormancereports",verifyToken,routcontroller.getbusperormancereportsCtrl);
router.post('/getdrivername',verifyToken, routcontroller.getdrivernameCtrl);
router.post("/getdriverperormancereports",verifyToken,routcontroller.getdriverperormancereportsCtrl);
router.post("/gettargetreports",verifyToken,routcontroller.gettargetreportsCtrl);
router.post("/gettopperormancereports",verifyToken,routcontroller.gettopperormancereportsCtrl);
router.post("/getfueltargetdata", verifyToken, routcontroller.getfueltargetdatactrl);
router.post("/getdaybookreports",verifyToken,routcontroller.getdaybookreportsCtrl);
router.post("/gettrialbalancereports",verifyToken,routcontroller.gettrialbalancereportsCtrl);



router.post("/getsalaryreport",verifyToken,routcontroller.getsalaryreportCtrl);
router.post("/getoldBalance",verifyToken,routcontroller.getoldBalanceCtrl);
router.post("/getadvance",verifyToken,routcontroller.getadvanceCtrl);
router.post("/sud",verifyToken,routcontroller.sudCtrl);


router.get("/getfuelentrydata", routcontroller.getfuelentrydataCtrl);
router.get("/getfuelentryapproveddata", routcontroller.getfuelentryapproveddataCtrl);

router.post("/getfuelaccountsdata",verifyToken,routcontroller.getfuelaccountsdataCtrl);
router.get("/getlaundrybilldata", routcontroller.getlaundrybilldataCtrl);
router.post("/getlaundrybillsubdata",verifyToken,routcontroller.getlaundrybillsubdataCtrl);
router.post('/updatebusnumber',verifyToken,routcontroller.updatebusnumber);
router.post('/updateservicenumber',verifyToken, routcontroller.updateservicenumber);
router.post('/updateserviceno',verifyToken,routcontroller.updateservicenoCtrl);
router.post('/adddriveredit',verifyToken,routcontroller.adddrivereditCtrl);
router.post('/edithelperregister',verifyToken,routcontroller.edithelperregisterCtrl);

router.post('/addstaffedit',verifyToken, routcontroller.addstaffeditCtrl);
router.post('/Addledgersingleinbalancesheet', verifyToken,routcontroller.AddledgersingleinbalancesheetCtrl);
router.post('/equilitiessingleinbalancesheet', verifyToken,routcontroller.equilitiessingleinbalancesheetCtrl);

router.post('/Addledgersingleinprofitandloss', verifyToken,routcontroller.AddledgersingleinprofitandlossCtrl);
router.post('/incomesingleinprofitandloss', verifyToken,routcontroller.incomesingleinprofitandlossCtrl);
router.post('/editfueltarget', verifyToken,routcontroller.editfueltargetCtrl);


//sai routes
router.post('/addmastergroupdata', verifyToken,routcontroller.addmastergroupdataCtrl);
router.post('/addsubgroupdata', verifyToken,routcontroller.addsubgroupdataCtrl);
router.post('/addchilddata', verifyToken,routcontroller.addchilddataCtrl);
router.post('/addInfiniteGroup', verifyToken,routcontroller.addInfiniteGroupCtrl);
router.post('/addledgerdata', verifyToken,routcontroller.addledgerdataCtrl);
router.post('/updateGroupName', verifyToken,routcontroller.updateGroupNameCtrl);
router.post('/updateLedgerName', verifyToken,routcontroller.updateLedgerNameCtrl);
router.post('/deleteGroup', verifyToken,routcontroller.deleteGroupCtrl);
router.post('/deleteLedger', verifyToken,routcontroller.deleteLedgerCtrl);
router.post('/moveLedger', verifyToken,routcontroller.moveLedgerCtrl);
router.post('/updateGroupFlags', verifyToken,routcontroller.updateGroupFlagsCtrl);

router.post('/getRefDetails', verifyToken,routcontroller.getRefDetailsCtrl);



router.post('/gettriplogscount', verifyToken,routcontroller.gettriplogscountCtrl);
router.post('/gettripupdatedmodaldata', verifyToken,routcontroller.gettripupdatedmodaldataCtrl);


router.post('/gettripupdatedlogs', verifyToken,routcontroller.gettripupdatedlogsCtrl);
router.post('/gettripdeletedlogs', verifyToken,routcontroller.gettripdeletedlogsCtrl);

router.post('/getadminstatuscount', verifyToken,routcontroller.getadminstatuscountCtrl);
router.post('/getadminrejected', verifyToken,routcontroller.getadminrejectedCtrl);
router.post('/getadminapproved', verifyToken,routcontroller.getadminapprovedCtrl);

router.post('/getservicenum', verifyToken,routcontroller.getservicenumCtrl);
router.post('/getpdfpatchdata1', verifyToken,routcontroller.getpdfpatchdata1Ctrl);
router.post('/getbetadata', verifyToken,routcontroller.getbetadataCtrl);
router.post('/submitpayablesvoucherentry',verifyToken, routcontroller.submitpayablesvoucherentryCtrl);

router.get("/getvoucherapproveddata", routcontroller.getvoucherapproveddataCtrl);
router.post('/getvouchersearchdata', routcontroller.getvouchersearchdataCtrl);




//garage modulee -----------------------------------------------------------

router.post('/getrepairentry',verifyToken,routcontroller.getrepairentryCtrl);
router.post('/postrepairentry',verifyToken,routcontroller.postrepairentryCtrl);
router.post('/getstaffdata',verifyToken,routcontroller.getstaffdataCtrl)
router.get('/repair-category/getall',verifyToken,routcontroller.getallrepairCategoryCtrl);
router.post('/repair-category/add',verifyToken,routcontroller.addrepaircategoryCtrl);
router.post('/repair-category/edit',verifyToken,routcontroller.editrepaircategoryCtrl);
router.post('/repair-category/delete',verifyToken,routcontroller.deleterepaircategoryCtrl)



router.get('/getallrepairparts',verifyToken,routcontroller.getallrepairpartsCtrl);
router.post('/addrepairparts',verifyToken,routcontroller.addrepairpartsCtrl);
router.post('/editrepairparts',verifyToken,routcontroller.editrepairpartsCtrl);
router.post('/deleterepairparts',verifyToken,routcontroller.deleterepairpartsCtrl);


router.post('/addrepairentry',verifyToken,routcontroller.addrepairentryCtrl);
router.post('/editrepairentry',verifyToken,routcontroller.editrepairentryCtrl);
router.post('/getpartsentry',verifyToken,routcontroller.getpartsentryCtrl);
router.post('/submitrepairtracking',verifyToken,routcontroller.submitrepairtrackingCtrl);

//new 
router.post('/changeJobSatus',verifyToken,routcontroller.changeJobSatusCtrl)


router.get("/getlaundryapproveddata", routcontroller.getlaundryapproveddataCtrl);
router.post('/getlaundrysearchdata', routcontroller.getlaundrysearchdataCtrl);

router.post('/addsparetankbusno', routcontroller.addsparetankbusno);

// router.post('/addsparetankbusno',verifyToken,routcontroller.addsparetankbusno);



module.exports = router;
// const url = `https://samv.samanvitravels.com/api/get_branch_online_agent_cash_collection.json`;