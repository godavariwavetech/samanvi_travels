// Dashboard  validations
exports.loginvalidations = {
    "body": {
       'phone_number': {
           notEmpty: true,
           matches: {
               options : [/^[0-9]{10}$/],//one spec chara,one number,must have 6 to 16 characters
               errorMessage: 'Please enter valid Mobile number' // Error message for the parameter
           },
           errorMessage: 'Password is Required'
       }
    }
};

exports.permissiondata = {
    "body": {
       'user_id': {
           notEmpty: true,
           matches: {
               options : [/^[0-9]$/],//one spec chara,one number,must have 6 to 16 characters
               errorMessage: 'Please pass valid user details' // Error message for the parameter
           },
           errorMessage: 'User Id is Required'
       }
    }
};

exports.userSignupValidations = {
    "body": {
       'user_name': {
           notEmpty: true,
           errorMessage: 'Name is Required'
       },
       'usr_phone': {
           notEmpty: true,
           matches: {
               options : [/^[0-9]{10}$/],
               errorMessage: 'Please enter valid Mobile number' // Error message for the parameter
           },
           errorMessage: 'Password is Required'
       },
       'usr_email': {
           notEmpty: true,
           matches: {
               options : [/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/],
               errorMessage: 'Please enter valid Email' // Error message for the parameter
           },
           errorMessage: 'Password is Required'
       },
       
    }
};

//********************************************************* Delete Method ***************************************************
exports.deletemethod = {
    "body": {
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        },
    }
};


exports.gettemplemethod = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

//********************************************************* Delete Method ***************************************************

//********************************************************* Agricultural Lands **********************************************
exports.postagricultureland = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'land_situated_village': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage:'land location Village is Required'
        },
        'land_situated_mandal': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'land location Mandal is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Survey No is Required'
        },
        'extent_ac_cts': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Extent Acres is Required'
        },
        'type_of_land': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Type of Land is Required'
        },
        'lease_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Lease status is Required'
        },
        'date_of_public_auction': {
            notEmpty: true,
            errorMessage: 'Date of Public Auction is Required'
        },
        'lease_period': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Lease Period Only Characters Allowed in this Input'
            },
            errorMessage: 'Lease_period is Required'
        },
        'lease_amount_annum': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Lease Amount Only Numbers Allowed in this Input'
            },
            errorMessage: '	Lease_amount_annum is Required'
        },
        'name_of_highest_bidder': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of Highest Bidder is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Highest Bidder is Required'
        },
        'approval_of_authority': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Approval of Authority is Only Characters Allowed in this Input'
                
            },
            errorMessage: 'approval_of_authority is Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Remarks is Required'
        }
    }
};

exports.editagricultureland = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'land_situated_village': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage:'land location Village is Required'
        },
        'land_situated_mandal': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'land location Mandal is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Survey No is Required'
        },
        'extent_ac_cts': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Extent Acres is Required'
        },
        'type_of_land': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Type of Land is Required'
        },
        'lease_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Lease status is Required'
        },
        'date_of_public_auction': {
            notEmpty: true,
            errorMessage: 'Date of Public Auction is Required'
        },
        'lease_period': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Lease Period Only Characters Allowed in this Input'
            },
            errorMessage: 'Lease_period is Required'
        },
         'lease_amount_annum': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Lease Amount Only Numbers Allowed in this Input'
            },
            errorMessage: '	Lease_amount_annum is Required'
        },
        'name_of_highest_bidder': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of Highest Bidder is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Highest Bidder is Required'
        },
        'approval_of_authority': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Approval of Authority is Only Characters Allowed in this Input'
            },
            errorMessage: 'approval_of_authority is Required'
        },
        'remarks': {
            notEmpty: true,
            errorMessage: 'Remarks is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'ID id Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        }
    }
};

//********************************************************* Urban Proprety Begin ********************************************
exports.submitUrbanprpty = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'details_of_shops_buildings': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'details_of_shops_buildings is Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Details of Shop Building is Required'
        },
        'measurements_in_sqyards': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Measurements in S.q. yards is Required'
        },
        'ts_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'TS No is Required'
        },
        'whether_public_auction_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Whether Public Auction Status is Required'
        },
        'rent_per_month': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Rent Per Month is Required'
        },
        'lease_period': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Lease Period Only Characters Allowed in this Input'
            },
            errorMessage: 'Lease_period is Required'
        },
        'approval_of_authority': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Approval of Authority is Only Characters Allowed in this Input'
            },
            errorMessage: 'approval_of_authority is Required'
        },
        
        'name_of_highest_bidder': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of Highest Bidder is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Highest Bidder is Required'
        },
        
        'remarks': {
            notEmpty: true,
            errorMessage: 'Remarks is Required'
        }
    }
};

exports.editurbanprptys = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'details_of_shops_buildings': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'details_of_shops_buildings is Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Details of Shop Building is Required'
        },
        'measurements_in_sqyards': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Measurements in S.q. yards is Required'
        },
        'ts_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'TS No is Required'
        },
        'whether_public_auction_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Whether Public Auction Status is Required'
        },
        'rent_per_month': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Rent Per Month is Required'
        },
        'lease_period': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Lease Period Only Characters Allowed in this Input'
            },
            errorMessage: 'Lease_period is Required'
        },
        'approval_of_authority': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Approval of Authority is Only Characters Allowed in this Input'
            },
            errorMessage: 'approval_of_authority is Required'
        },
        'name_of_highest_bidder': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of Highest Bidder is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Highest Bidder is Required'
        },
        'remarks': {
            notEmpty: true,
            errorMessage: 'Remarks is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        }
    }
};

//********************************************************* Vacant sites Begin **********************************************
exports.submitVacntdetails = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Survey No is Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Survey No is Required'
        },
        'ts_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'TS No is Required'
        },
        'extent_in_sqyards': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Extent in s.q. yards  is Required'
        },
        'name_of_town_located': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name Of Town Located is Required'
        },
        'present_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Present Status is Only Characters Allowed in this Input'
            },
            errorMessage: 'Present Status is Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Remarks is Required'
        }
    }
};

exports.editvaccantsitesdata = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Survey No is Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Survey No is Required'
        },
        'ts_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'TS No is Required'
        },
        'extent_in_sqyards': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Extent in s.q. yards  is Required'
        },
        'name_of_town_located': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name Of Town Located is Required'
        },
        'present_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Present Status is Only Characters Allowed in this Input'
            },
            errorMessage: 'Present Status is Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Remarks is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        },
    }
};

//********************************************************* Encroachments Begin **********************************************
exports.submitencroachment = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'located_in_village': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Located in Village  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Located in Village  is Required'
        },
        'located_in_town': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Located in town is Only Characters Allowed in this Input'
            },
            errorMessage: 'Located in town  is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Survey No is Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Survey No is Required'
        },
        'ts_no_extent': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'TS No is Required'
        },
        'type_of_encroachment': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Type of Encroachment  is Required'
        },
        'name_of_encroacher': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Encroacher is Required'
        },
        'whether_eviction_petition_filed': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Whether Eviction Petition Filed is Only Characters Allowed in this Input'
            },
            errorMessage: 'Whether Eviction Petition Filed is Required'
        }, 
        'status_of_oa': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Status  of oa is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Status  of oa is Required'
        },
         'eviction_orders_received': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Eviction Orders received is Required'
        },
         'order_and_date_of_endowments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Order and Date of Endowments is Required'
        },
        'present_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Present Status is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Present Status is Required'
        },
         'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Remarks  is Required'
        }
    }
};

exports.editencroachment = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
         'located_in_village': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Located in Village  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Located in Village  is Required'
        },
        'located_in_town': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Located in town is Only Characters Allowed in this Input'
            },
            errorMessage: 'Located in town  is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Survey No is Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Survey No is Required'
        },
        'ts_no_extent': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'TS No is Required'
        },
        'type_of_encroachment': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Type of Encroachment  is Required'
        },
        'name_of_encroacher': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Encroacher is Required'
        },
        'whether_eviction_petition_filed': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Whether Eviction Petition Filed is Only Characters Allowed in this Input'
            },
            errorMessage: 'Whether Eviction Petition Filed is Required'
        }, 
        'status_of_oa': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Status  of oa is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Status  of oa is Required'
        },
         'eviction_orders_received': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Eviction Orders received is Required'
        },
         'order_and_date_of_endowments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Order and Date of Endowments is Required'
        },
        'present_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Present Status is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Present Status is Required'
        },
         'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Remarks  is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        },
    }
};

//********************************************************* inamlands Begin **************************************************
exports.postinamlandsdts = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Numbers Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'located_in_village': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Located in Village  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Located in Village  is Required'
        },
        'located_in_town': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Located in town is Only Characters Allowed in this Input'
            },
            errorMessage: 'Located in town  is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Survey No is Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Survey No is Required'
        },
        'ts_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'TS No is Required'
        },
        'extent_in_sqyards_accts': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Extent In S.q.yards Accts  is Required'
        },
        'nature_of_inam': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Inam is Required'
        },
        'whether_inamdars_rendering_service_in_temple': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Whether Eviction Petition Filed is Only Characters Allowed in this Input'
            },
            errorMessage: 'Whether Eviction Petition Filed is Required'
        }, 
        'whether_lands_under_possession_of_temple_or_private': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'whether_lands_under_possession_of_temple_or_private  is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'whether_lands_under_possession_of_temple_or_private is Required'
        },
         'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Remarks  is Required'
        }
    }
};

exports.editinamlanddata = {
    "body": {
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institute is Required'
        },
        'located_in_village': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Located in Village  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Located in Village  is Required'
        },
        'located_in_town': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Located in town is Only Characters Allowed in this Input'
            },
            errorMessage: 'Located in town  is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Survey No is Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Survey No is Required'
        },
        'ts_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'TS No is Required'
        },
        'extent_in_sqyards_accts': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Extent In S.q.yards Accts  is Required'
        },
        'nature_of_inam': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Inam is Required'
        },
        'whether_inamdars_rendering_service_in_temple': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Whether Eviction Petition Filed is Only Characters Allowed in this Input'
            },
            errorMessage: 'Whether Eviction Petition Filed is Required'
        }, 
        'whether_lands_under_possession_of_temple_or_private': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Status  of oa is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Status  of oa is Required'
        },
         'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is  Only Characters and  Allowed in this Input'
            },
            errorMessage: 'Remarks  is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        },
    }
};

//********************************************************* establishment  Begin *********************************************
exports.submitsecularstaff = {
    "body": {
        'name_of_incumbent': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Name of the Incumbent  is Required'
        },
        'designation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Designation  is Required'
        },
        'pay': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Pay is Required'
        },
        'd_a': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'D_A is Required'
        },
        'h_r_a': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'H R A is Required'
        },
        'total_per_month': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Total Per Month Accts  is Required'
        },
        'total_per_year': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Per Year is Required'
        }
    }
};

exports.editssdts = {
    "body": {
        'name_of_incumbent': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Incumbent  is Required'
        },
        'designation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Designation  is Required'
        },
        'pay': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Pay is Required'
        },
        'd_a': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'D_A is Required'
        },
        'h_r_a': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'H R A is Required'
        },
        'total_per_month': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Total Per Month Accts  is Required'
        },
        'total_per_year': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Per Year is Required'
        },
         'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        }
    }
};

//********************************************************* Reconciliationl  Begin *******************************************
exports.postReconciliationlands = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'reconciliation_records': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Reconciliation Records is Required'
        },
        'total_land_as_approved': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Land as Approved is Required'
        },
        'total_land_as_revenue_records': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Total Land As Revenue Records	 is Required'
        }, 
        'variation_per_record': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'Variation Per Record is Required'
        },
        'pattadar_books_deeds_obtained': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Pattadar books deeds Obtained  is Required'
        },
        'whether_land_covered_section': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Whether Land Covered Section is Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Remarks is Required'
        }
    }
};

exports.editreconciliationlands = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
         'reconciliation_records': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Reconciliation Records is Required'
        },
        'total_land_as_approved': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Land as Approved is Required'
        },
        'total_land_as_revenue_records': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Total Land As Revenue Records	 is Required'
        }, 
        'variation_per_record': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'Variation Per Record is Required'
        },
        'pattadar_books_deeds_obtained': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Pattadar books deeds Obtained  is Required'
        },
        'whether_land_covered_section': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Whether Land Covered Section is Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Remarks is Required'
        },
         'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        }
    }
};

//********************************************************* Court Begin ******************************************************
exports.postcourtcasesdts = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'wp_no': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'WP No is Required'
        },
        'name_of_petitioner': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Name of Petitioner is Required'
        }, 
        'name_of_respondent': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Respondent is Required'
        },
        'prayer_of_petition': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Prayer of Petition  is Required'
        },
        'counter_field_or_not': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Counter  Field or Not is Required'
        },
         'any_interim_orders_granted': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Any Interim Orders Granted is Required'
        },
        'present_stage_of_writ': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Present Stage of Write is Required'
        }
    }
};

exports.editccasesdts = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'wp_no': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'WP No is Required'
        },
        'name_of_petitioner': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Name of Petitioner is Required'
        }, 
        'name_of_respondent': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'TS No is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Respondent is Required'
        },
        'prayer_of_petition': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers and Characters of . Allowed in this Input'
            },
            errorMessage: 'Prayer of Petition  is Required'
        },
        'counter_field_or_not': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Counter  Field or Not is Required'
        },
         'any_interim_orders_granted': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Any Interim Orders Granted is Required'
        },
        'present_stage_of_writ': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Present Stage of Write is Required'
        },
         'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'ID is Required'
        },
    }
};

//********************************************************* Status of Work Begin *********************************************
exports.submitstsofworks = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_work': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Work is Required'
        },
        'estimate_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Estimate Amount is Required'
        },
        'work_status': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Work Status is Required'
        }, 
    }
};

exports.updatestsofwrks = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_work': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of Work is Required'
        },
        'estimate_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Estimate Amount is Required'
        },
        'work_status': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Work Status is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        },
    }
};

//********************************************************* templepremises_laq Begin ******************************************
exports.posttempllaqdts = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Numbers in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Survey No is Required'
        },
         'covered_total_extent': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Covered Total Extent is Required'
        },
        'name_of_subtemple': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: ' Name of sub temple is Required'
        }, 
        'details_of_laq': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Details of Laq is Required'
        }, 
        'extent_acquried_laq': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Extent Acquried Laq is Required'
        },
        'whether_eighty_paid': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Whether Eighty Paid is Required'
        }, 
        'total_paid': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Paid is Required'
        }, 
        'amount_recieved_compensation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Amount Recieved Compensation is Required'
        }, 
        'laq_deposited_in_shape_fdrs_bank': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Laq Deposited in Shape Fdrs Bank is Required'
        },
        'interest_acquried_laq': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Interest Acquried Laq  is Required'
        }, 
        'dept_land_acquired': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Department land acquired  is Required'
        }, 
        'procedings_of_la_officer': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Procedings of la Officer is Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Remarks is Required'
        },
    }
};

exports.updatelaqtmpledts = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'survey_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Survey No is Required'
        },
         'covered_total_extent': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Covered Total Extent is Required'
        },
        'name_of_subtemple': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: ' Name of sub temple is Required'
        }, 
        'details_of_laq': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Details of Laq is Required'
        }, 
        'extent_acquried_laq': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Extent Acquried Laq is Required'
        },
        'whether_eighty_paid': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Whether Eighty Paid is Required'
        }, 
        'total_paid': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Paid is Required'
        }, 
        'amount_recieved_compensation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Amount Recieved Compensation is Required'
        }, 
        'laq_deposited_in_shape_fdrs_bank': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Laq Deposited in Shape Fdrs Bank is Required'
        },
        'interest_acquried_laq': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Interest Acquried Laq  is Required'
        }, 
        'dept_land_acquired': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Department land acquired  is Required'
        }, 
        'procedings_of_la_officer': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Procedings of la Officer is Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Remarks is Required'
        },
         'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//********************************************************* statutory_payments Begin ******************************************
exports.poststpaym = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'year': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: '	year is Required'
        },
         'eaf_demand': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'EAF Demand is Required'
        },
        'eaf_collection': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'EAF Collection is Required'
        }, 
        'eaf_balance': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'EAF Balance is Required'
        }, 
        'cgf_demand': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'CGF Demand is Required'
        },
        'cgf_collection': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'CGF Collection is Required'
        }, 
        'cgf_balance': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'CGF Balance  is Required'
        }, 
        'af_demand': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'AF Demand is Required'
        }, 
        'af_collection': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'AF Collection is Required'
        },
        'af_balance': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'AF Balance  is Required'
        }, 
        'awf_demand': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'AWF Demand is Required'
        }, 
        'awf_collection': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'AWF Collection is Required'
        },
        'awf_balance': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'AWF Balance  is Required'
        }
    }
};

exports.updatesstpayments = {
     "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'year': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: '	year is Required'
        },
         'eaf_demand': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'EAF Demand is Required'
        },
        'eaf_collection': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'EAF Collection is Required'
        }, 
        'eaf_balance': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'EAF Balance is Required'
        }, 
        'cgf_demand': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'CGF Demand is Required'
        },
        'cgf_collection': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'CGF Collection is Required'
        }, 
        'cgf_balance': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'CGF Balance  is Required'
        }, 
        'af_demand': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'AF Demand is Required'
        }, 
        'af_collection': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'AF Collection is Required'
        },
        'af_balance': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'AF Balance  is Required'
        }, 
        'awf_demand': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'AWF Demand is Required'
        }, 
        'awf_collection': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'AWF Collection is Required'
        },
        'awf_balance': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'AWF Balance  is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        },
    }
};

//********************************************************* fdrs Begin ********************************************************

exports.submitfdrsdts = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'corpus_sale_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Corpus Sale No is Required'
        },
         'corpus_sale_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Corpus Sale Amount is Required'
        },
        'surplus_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Surplus No is Required'
        }, 
        'surplus_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Surplus Amount is Required'
        }, 
        'ubhayams_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Ubhayams No is Required'
        },
        'ubhayams_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Ubhayams Amount is Required'
        }, 
        'annadanam_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Annadanam No is Required'
        }, 
        'annadanam_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Annadanam Amount is Required'
        }, 
        'total_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Total No is Required'
        },
        'total_amount': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Total Amount  is Required'
        }, 
        'under_custody': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Under Custody is Required'
        }, 
        'remarks': {
            notEmpty: true,
            errorMessage: 'remarks is Required'
        }
    }
};

exports.editfdrsdts = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name_of_the_institutions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name of the Institutions is Required'
        },
        'corpus_sale_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Corpus Sale No is Required'
        },
         'corpus_sale_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Corpus Sale Amount is Required'
        },
        'surplus_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Surplus No is Required'
        }, 
        'surplus_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Surplus Amount is Required'
        }, 
        'ubhayams_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Ubhayams No is Required'
        },
        'ubhayams_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Ubhayams Amount is Required'
        }, 
        'annadanam_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Annadanam No is Required'
        }, 
        'annadanam_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Annadanam Amount is Required'
        }, 
        'total_no': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Total No is Required'
        },
        'total_amount': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters and Numbers Allowed in this Input'
            },
            errorMessage:'Total Amount  is Required'
        }, 
        'under_custody': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Under Custody is Required'
        }, 
        'remarks': {
            notEmpty: true,
            errorMessage: 'remarks is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        },
    }
};


//------------------------------------------------------------------------------------  Members Registration Started -------------------------------------------------------------------------------/+

//********************************************************* Member registration Begin *************************************************
exports.submitmemberregistration = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Numbers in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'first_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'First Name is Required'
        },
        'last_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Last Name is Required'
        },
         'date_of_birth': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Birth is Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is Required'
        }, 
        'number': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Number is Required'
        }, 
        'email': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        }, 
        'date_of_joining_the_temple': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Joining the temple is Required'
        }, 
        'area_of_interesting': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Area of Interesting is Required'
        }, 
        'description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        }
    }
};

exports.editmemberregistration = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'first_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'First Name is Required'
        },
        'last_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Last Name is Required'
        },
         'date_of_birth': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Birth is Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is Required'
        }, 
        'number': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Number is Required'
        }, 
        'email': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        }, 
        'date_of_joining_the_temple': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Joining the temple is Required'
        }, 
        'area_of_interesting': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Area of Interesting is Required'
        }, 
        'description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//********************************************************* Member Category Begin *************************************************
exports.submitmembercategory = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'members_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Type is Required'
        },
        'age_group': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Age Group is Required'
        },
         'service_commitee': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Service Commitee is Required'
        },
        'religious_spiritual': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Religious Spiritual is Required'
        }, 
        'cultural_activites': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Cultural Activites is Required'
        }
    }
};

exports.editmembercategory = {
    "body": {
 'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name of the Institute is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'members_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Type is Required'
        },
        'age_group': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Age Group is Required'
        },
         'service_commitee': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Service Commitee is Required'
        },
        'religious_spiritual': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Religious Spiritual is Required'
        }, 
        'cultural_activites': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Cultural Activites is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//********************************************************* Member donation Begin *************************************************
exports.submitmemberdonation = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Temple Id isOnly Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'member_id': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Member Id is Only numbers Allowed in this Input'
            },
            errorMessage: 'member_id is Required'
        },
        'amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Amount is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Amount is Required'
        },
         'payment_method': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Payment Method is Required'
        },
        'type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Types is Required'
        },
        'transaction': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Transaction is Required'
        }, 
        'comments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Comments is Required'
        }, 
        'status': {
            notEmpty: true,
            matches: {
               options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is Required'
        }, 
        'tax_deductible': {
            notEmpty: true,
            matches: {
               options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Tax Deductible is Required'
        }
    }
};

exports.editmemberdonation = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'member_id': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only numbers Allowed in this Input'
            },
            errorMessage: 'member_id is Required'
        },
        'amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Amount is Required'
        },
         'payment_method': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Payment Method is Required'
        },
        'type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Types is Required'
        },
        'transaction': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Transaction is Required'
        }, 
        'comments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Comments is Required'
        }, 
        'status': {
            notEmpty: true,
            matches: {
               options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is Required'
        }, 
        'tax_deductible': {
            notEmpty: true,
            matches: {
               options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Tax Deductible is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//********************************************************* Member Feedbacks Begin *************************************************
exports.submitmemberfeedback = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'feedback_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only numbers Allowed in this Input'
            },
            errorMessage: 'feedback_type is Required'
        },
        'rating': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Amount is Required'
        },
         'comments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Comments is Required'
        },
        'Suggestions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Suggestions is Required'
        },
        'follow_up_action': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Follow up Action is Required'
        }
    }
};

exports.editmemberfeedback = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'feedback_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only numbers Allowed in this Input'
            },
            errorMessage: 'feedback_type is Required'
        },
        'rating': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Amount is Required'
        },
         'comments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Comments is Required'
        },
        'Suggestions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Suggestions is Required'
        },
        'follow_up_action': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Follow up Action is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};
//*------------------------------------------------------------------------------- Members Registration Ended  ------------------------------------------------------------------------------- /+


//*------------------------------------------------------------------------------- Event Management Started  -------------------------------------------------------------------------------------- /+
//*********************************************************  Event calender Begin *************************************************
exports.submiteventcalender = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is Required'
        },
        'event_location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Location is Required'
        },
         'event_attenders': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Contact Number is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Attenders  is  Required'
        },
        'event_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Type is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Date is Required'
        },
        'event_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'event_time is Required'
        },
        'event_budget': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Budget is Required'
        },
        'sponsors': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Sponsors is Required'
        },
        'event_guests': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Guests is Required'
        },
        'required_equipment': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Required Equipment is Required'
        },
        'ticket_price': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Ticket  Price is Required'
        },
        'event_status': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Status is Required'
        }
        ,
        'description': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        }
    }
};

exports.editmembercalender = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is Required'
        },
        'event_location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Location is Required'
        },
         'event_attenders': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Contact Number is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Attenders  is  Required'
        },
        'event_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Type is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Date is Required'
        },
        'event_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'event_time is Required'
        },
        'event_budget': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Budget is Required'
        },
        'sponsors': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Sponsors is Required'
        },
        'event_guests': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Guests is Required'
        },
        'required_equipment': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Required Equipment is Required'
        },
        'ticket_price': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Ticket  Price is Required'
        },
        'event_status': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Status is Required'
        }
        ,
        'description': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        },
         'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'ID id Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        }
    }
};

//*********************************************************  Event member Registration Begin *************************************************
exports.submiteventmemberregistration = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Date is Required'
        },
         'event_time': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Contact Number is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Time  is  Required'
        },
        'event_location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event location is Required'
        },
        'organizer_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Organizer Name is Required'
        },
        'contact_information': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Contact is Required'
        }
    }
};

exports.editeventmemberregistration = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Date is Required'
        },
         'event_time': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Contact Number is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Time  is  Required'
        },
        'event_location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event location is Required'
        },
        'organizer_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Organizer Name is Required'
        },
        'contact_information': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Contact is Required'
        },
        'participant_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Participant Name is Required'
        },
        'participant_email': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Participant Email is Required'
        },
        'participant_number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Participant Number is Required'
        },
        'number_of_tickets': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Number of Tickets is Required'
        },
        'registration_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Registration Date  Price is Required'
        },
        'registration_type': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Registration Type is Required'
        },
        'payment_status': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Payment Status is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//*********************************************************  Event Venue Management Begin *************************************************
exports.submiteventvenue = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'venue_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Venue Name is Required'
        },
        'venue_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Venue type is Required'
        },
         'capacity': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Contact Number is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Capacity  is  Required'
        },
        'availabilty_calendar': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Availabilty Calendar is Required'
        },
        'booking_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Booking Status  is Required'
        },
        'facilities': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Facilities is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'contact_person': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Contact Person is Required'
        },
        'booking_fees': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Booking Fees is Required'
        },
        'parking_facilities': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Parking Facilities is Required'
        },
        'maintenance_history': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Maintenance History is Required'
        },
        'security_measures': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Security Measures is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        }
    }
};

exports.editeventvenue = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'venue_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Venue Name is Required'
        },
        'venue_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Venue type is Required'
        },
         'capacity': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Contact Number is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Capacity  is  Required'
        },
        'availabilty_calendar': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Availabilty Calendar is Required'
        },
        'booking_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Booking Status  is Required'
        },
        'facilities': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Facilities is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'contact_person': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Contact Person is Required'
        },
        'booking_fees': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Booking Fees is Required'
        },
        'parking_facilities': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Parking Facilities is Required'
        },
        'maintenance_history': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Maintenance History is Required'
        },
        'security_measures': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Security Measures is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//*********************************************************  Event resource_planning Begin *************************************************
exports.submiteventresource = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Date is Required'
        },
         'expect_attendance': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Contact Number is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Expect Attendance  is  Required'
        },
        'venue': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Venue is Required'
        },
        'resource_requirement': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Resource Requirement  is Required'
        },
        'volunteer_assign': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Assign is Required'
        },
        'budget_allocation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Budget Allocation is Required'
        },
        'equipement_and_facilities': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Equipement and Facilities is Required'
        },
        'catering_details': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Catering Details is Required'
        },
        'transportation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Transportation is Required'
        },
        'special_requirement': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Special Requirement is Required'
        },
        'event_coordinator': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Co-ordinatoris Required'
        },
        'status': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is Required'
        }
    }
};

exports.editeventresource = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Date is Required'
        },
         'expect_attendance': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Contact Number is Only Numbers Allowed in this Input'
            },
            errorMessage: 'Expect Attendance  is  Required'
        },
        'venue': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Venue is Required'
        },
        'resource_requirement': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Resource Requirement  is Required'
        },
        'volunteer_assign': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Assign is Required'
        },
        'budget_allocation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Budget Allocation is Required'
        },
        'equipement_and_facilities': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Equipement and Facilities is Required'
        },
        'catering_details': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Catering Details is Required'
        },
        'transportation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Transportation is Required'
        },
        'special_requirement': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Special Requirement is Required'
        },
        'event_coordinator': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Co-ordinatoris Required'
        },
        'status': {
            notEmpty: true,
            matches: {
              options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//*********************************************************  Event Volunteer Begin *************************************************
exports.submiteventvolunteer = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:[/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Number is Required'
        },
         'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email  is  Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is Required'
        },
        'role': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'role is Required'
        },
        'shift': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Shift is Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is Required'
        },
        'skills': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Skills is Required'
        },
        'interests': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Interests is Required'
        },
        'type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Type is Required'
        }
    }
};

exports.editeventvolunteer = {
    "body": {
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:[/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Number is Required'
        },
         'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email  is  Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is Required'
        },
        'role': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'role is Required'
        },
        'shift': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Shift is Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is Required'
        },
        'skills': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Skills is Required'
        },
        'interests': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Interests is Required'
        },
        'type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Type is Required'
        }
        ,
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};
//*********************************************************  Event Analytics Begin *************************************************
exports.submiteventanalytics = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'event_id': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Id is Required'
        },
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
         'event_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Date  is  Required'
        },
        'event_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Time is Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Location is Required'
        },
        'organiser': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Organiser is Required'
        },
        'attendes': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Attendes is Required'
        },
        'register_count': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Register Count is Required'
        },
        'revenues': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Revenues is Required'
        },
        'expenses': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Expenses is Required'
        },
        'profit_loss': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Profit Loss is Required'
        },
        'feeding_rating': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'FeedBacks Rating  is Required'
        },
        'feedbacks_comments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedbacks Comments is Required'
        },
        'event_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Status is Required'
        }
    }
};

exports.editeventanalytics = {
    "body": {
        'organiser': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Organiser is Required'
        },
        'attendes': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Attendes is Required'
        },
        'register_count': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Register Count is Required'
        },
        'revenues': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Revenues is Required'
        },
        'expenses': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Expenses is Required'
        },
        'profit_loss': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Profit Loss is Required'
        },
        'feeding_rating': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'FeedBacks Rating  is Required'
        },
        'feedbacks_comments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedbacks Comments is Required'
        },
        'event_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Status is Required'
        }
    }
};

//*********************************************************  Event timeline Begin *************************************************
exports.submiteventtimeline = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'temple_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Temple Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Name is Required'
        },
        'event_start_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Start Date is Required'
        },
         'event_end_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Event End Date  is  Required'
        },
        'start_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Time is Required'
        }, 
        'end_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'End Time is Required'
        },
        'speaker': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Speaker is Required'
        },
        'breaks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Breaks is Required'
        },
        'parallel_session': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Parallel Session is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        }
    }
};

exports.editeventtimeline = {
    "body": {
        'temple_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Temple Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Temple Name is Required'
        },
        'event_start_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Start Date is Required'
        },
         'event_end_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Event End Date  is  Required'
        },
        'start_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Time is Required'
        }, 
        'end_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'End Time is Required'
        },
        'speaker': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Speaker is Required'
        },
        'breaks': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Breaks is Required'
        },
        'parallel_session': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Parallel Session is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        }
    }
};

//*********************************************************  Event Speaker Begin *************************************************
exports.submiteventspeaker = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Temple Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event  Date is Required'
        },
        'event_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Time is Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Location is Required'
        },
        'speaker': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Speaker is Required'
        },
        'perfromance': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Perfromance  is Required'
        }
    }
};

exports.editeventspeaker = {
    "body": {
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Temple Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event  Date is Required'
        },
        'event_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Time is Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Location is Required'
        },
        'speaker': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Speaker is Required'
        },
        'perfromance': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Perfromance  is Required'
        }
    }
};

//*********************************************************  Event Speaker Begin *************************************************
exports.submiteventfeedback = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: ' Name is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event  Date is Required'
        },
        'participant': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Participant is Required'
        },
        'feedback': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback is Required'
        },
        'feedback_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Date is Required'
        },
        'rating': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Rating  is Required'
        },
        'comments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Comments  is Required'
        }
    }
};

exports.editeventfeedback = {
    "body": {
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: ' Name is Required'
        },
        'event_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event  Date is Required'
        },
        'participant': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Participant is Required'
        },
        'feedback': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback is Required'
        },
        'feedback_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Date is Required'
        },
        'rating': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Rating  is Required'
        },
        'comments': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Comments  is Required'
        }
    }
};

//*********************************************************  Event budget Begin *************************************************
exports.submiteventbudget = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Event Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'budget_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Budget Amount is Required'
        },
        'allocated_funds': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Allocated Funds is Required'
        },
        'expenses': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Expenses is Required'
        },
        'actual_expenses': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Actual Expenses  is Required'
        },
        'remaining_budget': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Remaining Budget  is Required'
        },
        'expense_categories': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Expense Categories  is Required'
        },
        'date_of_budget_approval': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date_of_Budget_Approval  is Required'
        },
        'budget_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Budget Status  is Required'
        },
        'notes': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Notes  is Required'
        }
        
    }
};

//*********************************************************  Donation  Types Begin *************************************************
exports.submitdonationtype = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'donation_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Name is Required'
        }
    }
};

exports.editdonationtype = {
    "body": {
        'donation_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Name is Required'
        },
        'donation_price': {
            notEmpty: true,
            matches: {
                options:[/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Donation Price is Required'
        },
         'donation_for': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation for  is  Required'
        },
        'donation_description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Description is Required'
        },
        'donation_god': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation God is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//*********************************************************  Donation  Donar Begin *************************************************
exports.submitdonationdonar= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: ' Name is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:[/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Numberis Required'
        },
         'gender': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is  Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'payment_method': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'payment Method is Required'
        },
        'transaction_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Transaction Date is Required'
        },
        'purpose': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Purpose is Required'
        },
        // 'tax_id': {
        //     notEmpty: true,
        //     matches: {
        //         options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
        //         errorMessage: 'Only Characters Allowed in this Input'
        //     },
        //     errorMessage: 'Tax Id is Required'
        // },
        // 'tax_deductible': {
        //     notEmpty: true,
        //     matches: {
        //         options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
        //         errorMessage: 'Only Characters Allowed in this Input'
        //     },
        //     errorMessage: 'Tax Deductible is Required'
        // },
        // 'notes': {
        //     notEmpty: true,
        //     matches: {
        //         options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
        //         errorMessage: 'Only Characters Allowed in this Input'
        //     },
        //     errorMessage: 'Notes is Required'
        // }
    }
};

exports.editdonationdonar= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: ' Name is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:[/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Numberis Required'
        },
         'gender': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is  Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        // 'currnecy': {
        //     notEmpty: true,
        //     matches: {
        //         options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
        //         errorMessage: 'Only Characters Allowed in this Input'
        //     },
        //     errorMessage: 'Currnecy is Required'
        // },
        'payment_method': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'payment Method is Required'
        },
        'transaction_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Transaction Date is Required'
        },
        'purpose': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Purpose is Required'
        },
        'tax_id': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Tax Id is Required'
        },
        'tax_deductible': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Tax Deductible is Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is Required'
        },
        'notes': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Notes is Required'
        },
        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Id is Required'
        }
    }
};

//*********************************************************  Donation  specific  Begin *************************************************
exports.submitdonationspecific= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'event_description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Description is  Required'
        },
         'event_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Date is  Required'
        },
        'donar_message': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar Message is Required'
        },
        'event_category': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Category is Required'
        },
        'event_coordinator': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Coordinator is Required'
        },
        'donar_attendence': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar Attendence is Required'
        },
        'event_location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Location is Required'
        },
        'event_budget': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Budget Id is Required'
        }
    }
};

exports.editdonationspecific= {
    "body": {

        'event_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Name is Required'
        },
        'event_description': {
            notEmpty: true,
            matches: {
               options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Event Description is  Required'
        },
         'event_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Date is  Required'
        },
        'donar_message': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar Message is Required'
        },
        'event_category': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Category is Required'
        },
        'event_coordinator': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Coordinator is Required'
        },
        'donar_attendence': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar Attendence is Required'
        },
        'event_location': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Location is Required'
        },
        'event_budget': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Event Budget Id is Required'
        }
    }
};

//*********************************************************  Donation  recoginition  Begin *************************************************
exports.submitdonationrecognition= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'title': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Title is Required'
        },
        'first_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'First Name is  Required'
        },
         'last_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Last Name is  Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Number is Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is Required'
        },
        'donation_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Amount is Required'
        },
        'donation_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Date is Required'
        },
        'donation_method': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage:' Donation Method is Required'
        },
        'donation_purpose': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Purpose is Required'
        },
        'recognition_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Type is Required'
        },
        'tax_id': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Tax Id is Required'
        },
        'tax_deductible': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Tax Deductible is Required'
        },
        'special_instructions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Special Instructions is Required'
        },
        'member_of_the_temple': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Member Of the Temple is Required'
        } ,
        'volunteer': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer is Required'
        }
    }
};

exports.editdonationrecognition= {
    "body": {
        'title': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Title is Required'
        },
        'first_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'First Name is  Required'
        },
         'last_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Last Name is  Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Number is Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is Required'
        },
        'donation_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Amount is Required'
        },
        'donation_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Date is Required'
        },
        'donation_method': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage:' Donation Method is Required'
        },
        'donation_purpose': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Purpose is Required'
        },
        'recognition_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Type is Required'
        },
        'tax_id': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Tax Id is Required'
        },
        'tax_deductible': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Tax Deductible is Required'
        },
        'special_instructions': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Special Instructions is Required'
        },
        'member_of_the_temple': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Member Of the Temple is Required'
        } ,
        'volunteer': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer is Required'
        }
    }
};

//*********************************************************  Donation  campaign  Begin *************************************************
exports.submitdonationcampaign= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'campaign_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Campaign Name is Required'
        },
        'temple_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Name is  Required'
        },
         'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
        'start_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Date is Required'
        },
        'end_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'End date is Required'
        },
        'target_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Target Amount is Required'
        },
        'current_raised_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Current Raised Amount  is Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage:'Status is Required'
        },
        'donation_deadline': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Deadline is Required'
        },
        'campaign_organizer': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Campaign Organizer is Required'
        },
        'donation_category': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Category is Required'
        },
        'campaign_participant': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Campaign Participant is Required'
        }
       
    }
};

exports.editdonationcampaign= {
    "body": {
        'campaign_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Campaign Name is Required'
        },
        'temple_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Name is  Required'
        },
         'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
        'start_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Date is Required'
        },
        'end_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'End date is Required'
        },
        'target_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Target Amount is Required'
        },
        'current_raised_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Current Raised Amount  is Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage:'Status is Required'
        },
        'donation_deadline': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Deadline is Required'
        },
        'campaign_organizer': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Campaign Organizer is Required'
        },
        'donation_category': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donation Category is Required'
        },
        'campaign_participant': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Campaign Participant is Required'
        }
    }
};

//*********************************************************  Donation  Anaoymous  Begin *************************************************
exports.submitdonationanonymous= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'donor_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Donor Name is Required'
        },
        'donor_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Donor Type is  Required'
        },
         'donar_mail': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar mail is  Required'
        },
        'donar_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar Amount is Required'
        },
        'donar_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar Date is Required'
        },
        'payment_method': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Payment Method  is Required'
        },
        'purpose': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage:'Purpose is Required'
        },
    }
};

exports.editdonationanonymous= {
    "body": {
        'donor_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Donor Name is Required'
        },
        'donor_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Donor Type is  Required'
        },
         'donar_mail': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar mail is  Required'
        },
        'donar_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar Amount is Required'
        },
        'donar_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Donar Date is Required'
        },
        'payment_method': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Payment Method  is Required'
        },
        'purpose': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage:'Purpose is Required'
        },
    }
};

//*********************************************************  Pooja Type  Begin *************************************************
exports.submitpoojatype= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'pooja_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Pooja Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
         'price': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Price is  Required'
        },
    }
};

exports.editpoojatype= {
    "body": {
        'pooja_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Pooja Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
         'price': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Price is  Required'
        },
    }
};

//*********************************************************  Pooja Schedule  Begin *************************************************
exports.submitpoojaschedule= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'pooja_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Pooja Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is Required'
        },
        'pooja_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Pooja  Date is  Required'
        },
         'pooja_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Time is  Required'
        },'pooja_priest': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja priest is  Required'
        },'special_instrution': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Special Instrution is  Required'
        }
        ,'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        }
    }
};

exports.editpoojaschedule= {
    "body": {
        'pooja_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Pooja Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is Required'
        },
        'pooja_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Pooja  Date is  Required'
        },
         'pooja_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Time is  Required'
        },'pooja_priest': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja priest is  Required'
        },'special_instrution': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Special Instrution is  Required'
        }
        ,'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        }
    }
};

//*********************************************************  Priest Schedule  Begin *************************************************
exports.submitpoojapriest= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'full_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=% ]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name is Required'
        },
        'mobile_number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Number is  Required'
        },
         'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is  Required'
        },'dob': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Birth is  Required'
        },'date_joining': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date Joining is  Required'
        } ,
        'role': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Role is  Required'
        },
        'qualification': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Qualification is  Required'
        },
        'specialization': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Specialization is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
    }
};

exports.editpoojapriest= {
    "body": {
        'full_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name is Required'
        },
        'mobile_number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Number is  Required'
        },
         'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is  Required'
        },'dob': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Birth is  Required'
        },'date_joining': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date Joining is  Required'
        } ,
        'role': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Role is  Required'
        },
        'qualification': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Qualification is  Required'
        },
        'specialization': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Specialization is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        }
    }
};

//*********************************************************  pooja participant Registration  Begin **********************************
exports.submitpoojaparticipantregistration= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'fullname': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name is Required'
        },
        'email_address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Email Address is  Required'
        },
         'phone_number': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Phone Number is  Required'
        },
        'dob': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Birth is  Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is  Required'
        },
        'occupation': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Occupation is  Required'
        },
        'pooja_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is  Required'
        },
        'pooja_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Date is  Required'
        },
        'price': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Price is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
    }
};

exports.editpoojaparticipantregistration= {
    "body": {
        'fullname': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name is Required'
        },
        'email_address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Email Address is  Required'
        },
         'phone_number': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Phone Number is  Required'
        },
        'dob': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Birth is  Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is  Required'
        },
        'occupation': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Occupation is  Required'
        },
        'pooja_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is  Required'
        },
        'pooja_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Date is  Required'
        },
        'price': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Price is  Required'
        }
    }
};

//*********************************************************  pooja Pooja Space Reservation   Begin **********************************
exports.submitpoojaspace= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'pooja_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is Required'
        },
        'pooja_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Pooja Date  is  Required'
        },
         'pooja_time': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Time is  Required'
        },
        'pooja_area': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Area is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
    }
};

exports.editpoojaspace= {
    "body": {
        'pooja_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is Required'
        },
        'pooja_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Pooja Date  is  Required'
        },
         'pooja_time': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Time is  Required'
        },
        'pooja_area': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Area is  Required'
        }
    }
};

//*********************************************************  pooja  Festiva;    Begin **********************************
exports.submitpoojafestival= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'pooja_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is Required'
        },
        'pooja_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Pooja Date  is  Required'
        },
         'pooja_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Time is  Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Location is  Required'
        },
        'type_of_pooja': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Type Of Pooja is  Required'
        },
        'pooja_rituals': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Rituals is  Required'
        },
        'materials_required': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Materials Required is  Required'
        },
        'assigned_officer': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Assigned Officer is  Required'
        },
        'participants': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Participants  is  Required'
        },
        'special_instructions': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Special Instructions is  Required'
        },
        'budget': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Budget is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
    }
};

exports.editpoojafestival= {
    "body": {
        'pooja_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Name is Required'
        },
        'pooja_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Pooja Date  is  Required'
        },
         'pooja_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Time is  Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Location is  Required'
        },
        'type_of_pooja': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Type Of Pooja is  Required'
        },
        'pooja_rituals': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Pooja Rituals is  Required'
        },
        'materials_required': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Materials Required is  Required'
        },
        'assigned_officer': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Assigned Officer is  Required'
        },
        'participants': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Participants  is  Required'
        },
        'special_instructions': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Special Instructions is  Required'
        },
        'budget': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Budget is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
    }
};


//*********************************************************  pooja  Offfering    Begin **********************************
exports.submitpoojaooffering = {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'offering_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Offering Type is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Date  is  Required'
        },
         'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is  Required'
        },
        'contact_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Contact Number is  Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is  Required'
        },
        'payment_method': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Payment Method  is  Required'
        },
        'offering_purpose': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Offering Purpose is  Required'
        },
        'offering_status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Offering  Status is  Required'
        },
        'offering_location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Offering Location  is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
    }
};

exports.editpoojaoffering= {
    "body": {
        'offering_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Offering Type is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Date  is  Required'
        },
         'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is  Required'
        },
        'contact_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Contact Number is  Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is  Required'
        },
        'payment_method': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Payment Method  is  Required'
        },
        'offering_purpose': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Offering Purpose is  Required'
        },
        'offering_status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Offering  Status is  Required'
        },
        'offering_location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Offering Location  is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        }
    }
};

//*********************************************************  pooja  material    Begin **********************************
exports.submitpoojamaterial= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'item_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Item Name is Required'
        },
        'category': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Category  is  Required'
        },
          'quantity_stock': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: ' Only Numbers Allowed in this Input'
            },
            errorMessage: 'Quantity Stock is  Required'
        },
        'unit_measurement': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Unit Measurement is  Required'
        },
        'per_unit': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[.]*$/],
                errorMessage: ' Only Numbers Allowed in this Input'
            },
            errorMessage: 'Per unit is  Required'
        },
        'total_cost': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[.]*$/],
                errorMessage: ' Only Numbers Allowed in this Input'
            },
            errorMessage: 'Total Cost  is  Required'
        },
        'supplier': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Supplier is  Required'
        },
        'purchase_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Purchase Date is  Required'
        },
        'expiry_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Expiry Date  is  Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Location is  Required'
        }
    }
};

exports.editpoojamaterial= {
    "body": {
        'item_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Item Name is Required'
        },
        'category': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Category  is  Required'
        },
         'quantity_stock': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: ' Only Numbers Allowed in this Input'
            },
            errorMessage: 'Quantity Stock is  Required'
        },
        'unit_measurement': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Unit Measurement is  Required'
        },
        'per_unit': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Per unit is  Required'
        },
        'total_cost': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Cost  is  Required'
        },
        'supplier': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Supplier is  Required'
        },
        'purchase_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Purchase Date is  Required'
        },
        'expiry_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Expiry Date  is  Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Location is  Required'
        }
    }
};
//*********************************************************  pooja  material    Begin **********************************
exports.submitpoojaaccessbility= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'full_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name  is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Number  is  Required'
        },
         'desgination': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Desgination is  Required'
        },
        'accessbility': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Accessbility is  Required'
        },
        'duty_schedule': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Duty Schedule is  Required'
        },
        'language': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Language  is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
        
    }
};

exports.editpoojaaccessbility= {
    "body": {
        'full_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name  is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Number  is  Required'
        },
         'desgination': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Desgination is  Required'
        },
        'accessbility': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Accessbility is  Required'
        },
        'duty_schedule': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Duty Schedule is  Required'
        },
        'language': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Language  is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        }
    }
};

//*********************************************************  Volunteer Register Begin **********************************
exports.submitvolunteerregister= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name  is Required'
        },
        'date_of_birth': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Date of Birth  is  Required'
        },
         'gender': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is  Required'
        },
        'age': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Age is  Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Number is  Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email  is  Required'
        },
        'volunteer_role': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Role is  Required'
        },
        'availbility': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Availbility is  Required'
        },
        'relevant_skills': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Relevant Skills  is  Required'
        },
        'volunteer_experience': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Experience  is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
        
    }
};

exports.editvolunteerregister= {
    "body": {
        
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name  is Required'
        },
        'date_of_birth': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Date of Birth  is  Required'
        },
         'gender': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is  Required'
        },
        'age': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Age is  Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Number is  Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email  is  Required'
        },
        'volunteer_role': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Role is  Required'
        },
        'availbility': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Availbility is  Required'
        },
        'relevant_skills': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Relevant Skills  is  Required'
        },
        'volunteer_experience': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Experience  is  Required'
        }
    }
};

//*********************************************************  Volunteer Register Begin **********************************
exports.submitvolunteerrole= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name  is Required'
        },
        'role': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Role  is  Required'
        },
         'role_description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Role Description is  Required'
        },
        'start_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Date is  Required'
        },
        'end_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'End Date is  Required'
        },
        'shift_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Shift Name  is  Required'
        },
        'coordinator': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Coordinator  is  Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Number is  Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
        
    }
};

exports.editvolunteerrole= {
    "body": {
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name  is Required'
        },
        'role': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Role  is  Required'
        },
         'role_description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Role Description is  Required'
        },
        'start_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Date is  Required'
        },
        'end_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'End Date is  Required'
        },
        'shift_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Shift Name  is  Required'
        },
        'coordinator': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Coordinator  is  Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Number is  Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is  Required'
        }
        
    }
};

//*********************************************************  Volunteer Schedule Begin **********************************
exports.submitvolunteershiftschedule= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'shift_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'shift Name  is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date  is  Required'
        },
         'start_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Time is  Required'
        },
        'end_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'End Time  is  Required'
        },
        'role_responsibility': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Role Responsibility  is  Required'
        },
        'volunteer_group': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Group  is  Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
        
    }
};

exports.editvolunteershiftschedule= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'shift_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'shift Name  is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date  is  Required'
        },
         'start_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Time is  Required'
        },
        'end_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'End Time  is  Required'
        },
        'role_responsibility': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Role Responsibility  is  Required'
        },
        'volunteer_group': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Group  is  Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Status is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
        
    }
};

//*********************************************************  Volunteer Schedule Begin **********************************
exports.submitvolunteertrackinghour= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name  is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date  is  Required'
        },
         'start_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Time is  Required'
        },
        'end_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'End Time  is  Required'
        },
        'total_hours': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Hours  is  Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Location  is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
        
    }
};

exports.editvolunteertrackinghour= {
    "body": {
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name  is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Date  is  Required'
        },
         'start_time': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Time is  Required'
        },
        'end_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'End Time  is  Required'
        },
        'total_hours': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Total Hours  is  Required'
        },
        'location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Location  is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
        
    }
};

//*********************************************************  Volunteer Schedule Begin **********************************
exports.submitvolunteerrewards= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'volunteer_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' volunteer name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Name  is Required'
        },
        'recognition_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Type  is  Required'
        },
         'recognition_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'recognition_date is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description   is  Required'
        },
        'reward_type': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Reward Type  is  Required'
        },
        'reward_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Reward Date  is  Required'
        },
        'recognition_status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Status is  Required'
        },
        'recognition_level': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Level is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
        
    }
};

exports.editvolunteerrewards= {
    "body": {
        'volunteer_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' volunteer name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Volunteer Name  is Required'
        },
        'recognition_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Type  is  Required'
        },
         'recognition_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'recognition_date is  Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Description   is  Required'
        },
        'reward_type': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Reward Type  is  Required'
        },
        'reward_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Reward Date  is  Required'
        },
        'recognition_status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Status is  Required'
        },
        'recognition_level': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Level is  Required'
        }
    }
};

//*********************************************************  Volunteer Schedule Begin **********************************
exports.submitvolunteertraining= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name  is Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender  is  Required'
        },
         'date_of_birth': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Birth is  Required'
        },
        'phone': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Phone   is  Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'training_program_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Training Program Name  is  Required'
        },
        'trainer_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Trainer  Name is  Required'
        },
        'trianing_location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Trianing Location  is  Required'
        },
        'skill_expertise': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'skill Expertise is  Required'
        },
        'frequency_availability': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Frequency Availability is  Required'
        },
        'date_of_boarding': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Boarding is  Required'
        },
        'role_of_responsibility': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Role of Responsibility is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
    }
};

exports.editvolunteertraining= {
    "body": {
        
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name  is Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender  is  Required'
        },
         'date_of_birth': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Birth is  Required'
        },
        'phone': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Phone   is  Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'training_program_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Training Program Name  is  Required'
        },
        'trainer_name': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Trainer  Name is  Required'
        },
        'trianing_location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Trianing Location  is  Required'
        },
        'skill_expertise': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'skill Expertise is  Required'
        },
        'frequency_availability': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Frequency Availability is  Required'
        },
        'date_of_boarding': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Boarding is Required'
        },
        'role_of_responsibility': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Role of Responsibility is Required'
        }
    }
};

//*********************************************************  Volunteer feedback Begin **********************************
exports.submitvolunteerfeedbacks= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name  is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only number Allowed in this Input'
            },
            errorMessage: 'Phone Number is  Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'feedback_type': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Type  is  Required'
        },
        'feedback_description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Description is  Required'
        },
        'feedback_source': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Source  is  Required'
        },
        'feedback_volunteer': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Volunteer is  Required'
        },
        'performance': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Performance is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is  Required'
        }
    }
};

exports.editvolunteerfeedbacks= {
    "body": {
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name  is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only number Allowed in this Input'
            },
            errorMessage: 'Phone Number is  Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'feedback_type': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Type  is  Required'
        },
        'feedback_description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Description is  Required'
        },
        'feedback_source': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Source  is  Required'
        },
        'feedback_volunteer': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Feedback Volunteer is  Required'
        },
        'performance': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Performance is  Required'
        }
    }
};



//*********************************************************  Education registration Begin **********************************
exports.submiteducationregistration= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'full_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'full_name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name  is Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Gender Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is  Required'
        },
        'age': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Date of birth is ` Only Characters Allowed in this Input'
            },
            errorMessage: 'Age is Required'
        },
        'address': {
            notEmpty: true,
            // matches: {
            //     options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
            //     errorMessage: 'Only Characters Allowed in this Input'
            // },
            errorMessage: 'Address is Required'
        },
        'contact_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: '1 Only Characters Allowed in this Input'
            },
            errorMessage: 'Contact Number is  Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' 2Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is  Required'
        },
        'previous_education_details': {
            notEmpty: true,
            // matches: {
            //     options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
            //     errorMessage: '3Only Characters Allowed in this Input'
            // },
            errorMessage: 'Previous education details is Required'
        },
        'choosed_program': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' 4Only Characters Allowed in this Input'
            },
            errorMessage: 'Choosed Program Volunteer is  Required'
        },
        'schedule_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: '5Only Characters Allowed in this Input'
            },
            errorMessage: 'Schedule Time is Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' 6Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is Required'
        }
    }
};

exports.editeducationregistration= {
    "body": {
        'full_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'full_name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name  is Required'
        },
        'gender': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Gender Only Characters Allowed in this Input'
            },
            errorMessage: 'Gender is  Required'
        },
        'age': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Date of birth is ` Only Characters Allowed in this Input'
            },
            errorMessage: 'Age is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'contact_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Contact Number is  Required'
        },
        'email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Email is  Required'
        },
        'previous_education_details': {
            notEmpty: true,
            // matches: {
            //     options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
            //     errorMessage: ' Only Characters Allowed in this Input'
            // },
            errorMessage: 'Previous education details  is  Required'
        },
        'choosed_program': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Choosed Program Volunteer is  Required'
        },
        'schedule_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Schedule Time is Required'
        }
    }
};
//*********************************************************  Education teacher profile Begin **********************************
exports.submitteacherprofile= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'mentor_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Mentor Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Mentor Name is Required'
        },
        'mentor_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Mentor Number Only Characters Allowed in this Input'
            },
            errorMessage: 'Mentor Number is  Required'
        },
        'mentor_email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'mentor_email is Only Characters Allowed in this Input'
            },
            errorMessage: 'Mentor Email is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'qualifications': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Qualifications is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Qualifications is  Required'
        },
        'experience': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Experience is Only Characters Allowed in this Input'
            },
            errorMessage: 'Experience  is  Required'
        },
        'certifications': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Certifications is Only Characters Allowed in this Input'
            },
            errorMessage: 'Certifications is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is Required'
        }
    }
};

exports.editteacherprofile= {
    "body": {
        'mentor_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Mentor Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Mentor Name is Required'
        },
        'mentor_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Mentor Number Only Characters Allowed in this Input'
            },
            errorMessage: 'Mentor Number is  Required'
        },
        'mentor_email': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'mentor_email is Only Characters Allowed in this Input'
            },
            errorMessage: 'Mentor Email is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'qualifications': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Qualifications is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Qualifications is  Required'
        },
        'experience': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Experience is Only Characters Allowed in this Input'
            },
            errorMessage: 'Experience  is  Required'
        },
        'certifications': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Certifications is Only Characters Allowed in this Input'
            },
            errorMessage: 'Certifications is  Required'
        }
    }
};
//*********************************************************  Education Attendence Tracking Begin **********************************
exports.submiteduattendencetracking= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'student_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Student Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Student name is Required'
        },
        'enrolled_program': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Enrolled Program Only Characters Allowed in this Input'
            },
            errorMessage: 'Enrolled Program is  Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Date is Only Characters Allowed in this Input'
            },
            errorMessage: 'Date is Required'
        },
        'in_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'In Time is Only Characters Allowed in this Input'
            },
            errorMessage: 'In Time is Required'
        },
        'out_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Out Time is  Required'
        },
        'mentor_assigned': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Mentor Assigned is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Mentor Assigned is  Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is Only Characters Allowed in this Input'
            },
            errorMessage: 'Remarks  is  Required'
        },
        'attendance_status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Attendance Status is Only Characters Allowed in this Input'
            },
            errorMessage: 'Attendance Status is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is Required'
        }
    }
};

exports.editeduattendencetracking= {
    "body": {
        'student_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Student Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Student name is Required'
        },
        'enrolled_program': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Enrolled Program Only Characters Allowed in this Input'
            },
            errorMessage: 'Enrolled Program is  Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Date is Only Characters Allowed in this Input'
            },
            errorMessage: 'Date is Required'
        },
        'in_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'In Time is Only Characters Allowed in this Input'
            },
            errorMessage: 'In Time is Required'
        },
        'out_time': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Out Time is  Required'
        },
        'mentor_assigned': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Mentor Assigned is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Mentor Assigned is  Required'
        },
        'remarks': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Remarks is Only Characters Allowed in this Input'
            },
            errorMessage: 'Remarks  is  Required'
        },
        'attendance_status': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Attendance Status is Only Characters Allowed in this Input'
            },
            errorMessage: 'Attendance Status is  Required'
        }
    }
};
//*********************************************************  Education  workshop Begin **********************************
exports.submiteduworkshop= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'workshop_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'workshop Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'workshop name is Required'
        },
        'workshop_location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop Location is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop Location is  Required'
        },
        'workshop_start_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop Start Date is Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop Start Date is Required'
        },
        'workshop_end_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop End Date is Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop End Date is Required'
        },
        'workshop_purpose': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop Purpose is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop Purpose is  Required'
        },
        'workshop_eligibilty': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop eligibilty is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop eligibilty is  Required'
        },
        'workshop_outcome': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop Outcome is Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop Outcome  is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is Required'
        }
    }
};

exports.editeduworkshop= {
    "body": {
        'workshop_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'workshop Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'workshop name is Required'
        },
        'workshop_location': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop Location is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop Location is  Required'
        },
        'workshop_start_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop Start Date is Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop Start Date is Required'
        },
        'workshop_end_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop End Date is Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop End Date is Required'
        },
        'workshop_purpose': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop Purpose is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop Purpose is  Required'
        },
        'workshop_eligibilty': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop eligibilty is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop eligibilty is  Required'
        },
        'workshop_outcome': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Workshop Outcome is Only Characters Allowed in this Input'
            },
            errorMessage: 'Workshop Outcome is  Required'
        }
    }
};
//*********************************************************  Education  certification  Begin **********************************
exports.submiteducertification= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'recognition_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Recognition Type is Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Type is Required'
        },
        'recognition_title': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Recognition Title is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Title is  Required'
        },
        'date_of_recognition': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Date of Recognition is Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Recognition is Required'
        },
        'certificate_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Certificate Number is Only Characters Allowed in this Input'
            },
            errorMessage: 'Certificate Number is Required'
        },
        'certificate_issue_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Certificate Issue Date is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Certificate Issue Date is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is Required'
        }
    }
};

exports.editeducertification= {
    "body": {
        'recognition_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Recognition Type is Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Type is Required'
        },
        'recognition_title': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Recognition Title is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Recognition Title is  Required'
        },
        'date_of_recognition': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Date of Recognition is Only Characters Allowed in this Input'
            },
            errorMessage: 'Date of Recognition is Required'
        },
        'certificate_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Certificate Number is Only Characters Allowed in this Input'
            },
            errorMessage: 'Certificate Number is Required'
        },
        'certificate_issue_date': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Certificate Issue Date is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Certificate Issue Date is  Required'
        }
    }
};
//*********************************************************  Education  currciclum  Begin **********************************
exports.submiteducurriculum= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'course_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Name  is Required'
        },
        'start_duration': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Start Duration is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Duration  is  Required'
        },
        'end_duration': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'End Duration is Only Characters Allowed in this Input'
            },
            errorMessage: 'End Duration is Required'
        },
        'course_instructor': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Instructor is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Instructor is Required'
        },
        'instructor_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Instructor Number is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Instructor Number is Required'
        },
        'course_enrollment_count': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course enrollment Count is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Course enrollment Count is  Required'
        },
        'course_fee': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Fee is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Fee is  Required'
        },
        'course_grading': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Grading is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Grading is  Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: ' Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is Required'
        }
    }
};

exports.editeducurriculum = {
    "body": {
        'course_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Name  is Required'
        },
        'start_duration': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Start Duration is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Duration  is  Required'
        },
        'end_duration': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'End Duration is Only Characters Allowed in this Input'
            },
            errorMessage: 'End Duration is Required'
        },
        'course_instructor': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Instructor is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Instructor is Required'
        },
        'instructor_number': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Instructor Number is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Instructor Number is Required'
        },
        'course_enrollment_count': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course enrollment Count is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Course enrollment Count is  Required'
        },
        'course_fee': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Fee is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Fee is  Required'
        },
        'course_grading': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Grading is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Grading is  Required'
        }
    }
};
//*********************************************************  Education  currciclum  Begin **********************************
exports.submitedufeedback= {
    "body": {
         'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'course_specific_feedback': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Specific Feedback is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Specific Feedback  is Required'
        },
        'course_instructor': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Instructor is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Instructor  is  Required'
        },
        'course_topics': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Topics is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Topics is Required'
        },
        'course_enrolled_count': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Enrolled Count is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Enrolled Count is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Description is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        },
        'entry_by': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Entry By is Required'
        }
    }
};

exports.editedufeedback= {
    "body": {
        'course_specific_feedback': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Specific Feedback is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Specific Feedback  is Required'
        },
        'course_instructor': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Instructor is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Instructor  is  Required'
        },
        'course_topics': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Topics is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Topics is Required'
        },
        'course_enrolled_count': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Course Enrolled Count is Only Characters Allowed in this Input'
            },
            errorMessage: 'Course Enrolled Count is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options:  [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Description is  Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        }
    }
};



//*------------------------------------------------------------------------------- addroomtype  -------------------------------------------------------------------------------------- /+

exports.postaddroomtype = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'addroom_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Room Type is Required'
        }

    }
};
exports.editaddroomtype = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'addroom_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is Required'
        },

        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'ID id Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        }
    }
};



//*------------------------------------------------------------------------------- postaddroomtype  -------------------------------------------------------------------------------------- /+

//*------------------------------------------------------------------------------- Block Create  -------------------------------------------------------------------------------------- /+

exports.postblock = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'block_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Room Type is Required'
        }

    }
};
exports.editblock = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'block_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is Required'
        },

        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'ID id Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        }
    }
};


//*------------------------------------------------------------------------------- Block Create  -------------------------------------------------------------------------------------- /+

//*------------------------------------------------------------------------------- Stage Create  -------------------------------------------------------------------------------------- /+

exports.poststage = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'rooms_stage': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Room Type is Required'
        }

    }
};
exports.updatestage = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'rooms_stage': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Name is Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is Required'
        },

        'id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'ID id Only Numbers Allowed in this Input'
            },
            errorMessage: 'id is Required'
        }
    }
};


//*------------------------------------------------------------------------------- Stage Create  -------------------------------------------------------------------------------------- /+
exports.finalroomadding = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'room_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Room Type is Required'
        },
        'block_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Block Type is Required'
        },
        'stage_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Stage Type is Required'
        },
        'room_number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Room No is Required'
        },
        'description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Description is Required'
        },
      'room_price': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[.]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Room Price is Required'
        },
    }
};

exports.geteminities = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

exports.getroomview = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};


exports.postroombooking = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'member_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Member Type is Required'
        },
        'room_number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Room Number is Required'
        },
        'room_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Room Type is Required'
        },
        'block_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Block Type is Required'
        },
        'stage_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Stage Type is Required'
        },
        'room_price': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Room Price is Required'
        },
        'sure_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Sure Name is Required'
        },
        'full_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Full Name is Required'
        },
        'adults': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Adults is Required'
        },
        'childerns': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Childerns is Required'
        },
   
        'mobile_number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Mobile Number is Required'
        },
        'address': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Address is Required'
        },
        'id_proof': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Id Proof is Required'
        },
        'proof_number': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Full Name  is Only Characters Allowed in this Input'
            },
            errorMessage: 'Proof Number is Required'
        },
   
        'total_amount': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Characters Allowed in this Input'
            },
            errorMessage: 'Total Amount is Required'
        },
     
        'arrive_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Arrive Date is Required'
            },
            errorMessage: 'Arrive Date is Required'
        },
        'depart_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Departure Date is Required'
            },
            errorMessage: 'Departure Date is Required'
        },
        'checkin_time':{
            notEmpty:true,
            matches:{
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage:'CheckIn Time is Required'
            },
            errorMessage:'CheckIn Time is Required'
        },
         'checkout_time':{
            notEmpty:true,
            matches:{
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage:'CheckOut Time is Required'
            },
            errorMessage:'CheckOut Time is Required'
        },
        'total_days':{
            notEmpty:true,
            matches:{
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage:'Total days is Required'
            },
            errorMessage:'Total days is Required'
        },
    }
};
////////////////////// room proof types 
exports.postroomprofftypes = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'proof_types': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Proof Type is Required'
        }

    }
};

exports.getprooftypes = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};
/////////////////////////////////////////////////////////////////////////  rooms search Dates 

exports.getRoomNnphno = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

//************************************************************************   Pilgrim Live Streaming   ********************************************************** */




exports.submitYLink = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple Id is Required'
        },
        'type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Type is Required'
        },
        // 'link': {
        //     notEmpty: true,
        //     matches: {
        //         options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
        //         errorMessage: 'Only CharactersS Allowed in this Input'
        //     },
        //     errorMessage: 'Link is Required'
        // },
    }
};


exports.Getmbrlynkdata = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

//************************************************************************   Pilgrim Live Streaming end   ********************************************************** */


//************************************************************************   rooms checkout count   ********************************************************** */



exports.gettChckoutsCurnt = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

exports.eachRoomAvailaility = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'room_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Room ID is Required'
        },
    }
};
//////////////////////////////////////////////////////////////// start today april 1st

exports.AldatesdataVldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'fromdate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Fromdate is Required'
        },

        'todate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Todate is Required'
        },
    }
};

exports.AlsurveyfilterVldts = {
    "body": {
        'survey': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Survey NO is Required'
        },
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Templeid ID is Required'
        },
    }
};

//////////////////////////////////////////////////////////////////////////// 

exports.UrbandatesdataVldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'fromdate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },

        'todate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'To Date is Required'
        },
    }
};



exports.UrbantsnumberVldts = {
    "body": {
        'tsnumber': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'TS NO is Required'
        },
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

//////////////////////////////////////////// 

exports.VaccantdatesVldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'fromdate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },

        'todate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'To Date is Required'
        },
    }
};



exports.VaccantSurveyVldts = {
    "body": {
        'Survey': {
            notEmpty: true,
            matches: {
                options:  [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Survey NO is Required'
        },
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

///////////////////////


exports.EncrodatesdataVldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'fromdate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },

        'todate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.EncroSrvyNoVldts = {
    "body": {
        'survey_no': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Survey NO is Required'
        },
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

/////////////////////////////// 


exports.InamdatesdataVldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'fromdate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },

        'todate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.InamSrvyNoVldts = {
    "body": {
        'survey_no': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Survey NO is Required'
        },
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
    }
};

////////////////////////////////////////////

exports.staffnameVldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Name is Required'
        },
    }
};


exports.staffdatesdataVldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'fromdate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },

        'todate': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

//////////////////////  

exports.stsofWrkschck = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'work_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'work status is Required'
        },
    }
};


exports.courtsCntrsts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'counter_field_or_not': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Counter status is Required'
        },
    }
};

////////////////////////////////////////////////

exports.chckdtsDnrRegstrtn = {
      "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'To Date is Required'
        },
    }
}


exports.RgstDntIDVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'donation_id': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Donation ID is Required'
            },
            errorMessage: 'Donation ID is Required'
        },
    }
};

exports.RgstDntCardTypeVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'card_type': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Card Type is Required'
            },
            errorMessage: 'Card Type is Required'
        },
    }
};


exports.TrakingdatesdataVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.TrakingDntIDVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'donation_id': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Donation ID is Allowed in this Input'
            },
            errorMessage: 'Donation ID is Required'
        },
    }
};
/////////////////////////////////////////// 

exports.CampigndatesdataVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'start_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Start Date is Required'
        },

        'end_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'End Date is Required'
        },
    }
};

exports.CampignNameVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'campaign_name': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Campaign Name is Required'
        },
    }
};
///////////////////////////////////////////


exports.AnonyusdatesdataVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.AnonyusPaymentVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'payment_method': {
            notEmpty: true,
            matches: {
                options:[/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Payment Method is Required'
        },
    }
};
//////////////////////////////////////// event

exports.checkeventnamevldts = {
    "body": {
        'temple': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'Date is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed'
            },
            errorMessage: 'Name is Required'
        },

    }

};

exports.checknamevldts = {
    "body": {
        'temple': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'Date is Required'
        },
        'name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed'
            },
            errorMessage: 'Name is Required'
        },

    }
};
exports.checkresourcevldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'fromdate': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'Date is Required'
        },
        'eventname': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed'
            },
            errorMessage: 'Event Name is Required'
        },

    }
};
exports.checkvolunteervldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'number': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Number is Required'
        },

    }
};
////////////////////////// pilgrim 

exports.pilgrimdatesdataVldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },

    }
};


exports.pilgrmMbileNOVldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'mobile_number': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Mobile Number is Required'
        },
    }
};



//************************************************************************  pooja priest    filter   ********************************************************** */

exports.checkpriestdatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkpriestrolevldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'role': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Role is Required'
        },
    }
};

//************************************************************************pooja space reservation filter************************************************************************//\

exports.checkspceResrvtndatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkspceResrvtnvldts = {
    "body": {
        'templeid': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'mobile_number': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Mobile Number is Required'
        },
    }
};

//************************************************************************pooja offering filter ************************************************************************//\

exports.checkofferingdatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkofferingStatusvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'offering_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Offering Status is Required'
        },
    }
};

//************************************************************************pooja accessbility filter ************************************************************************//

exports.checkaccessbilityvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'duty_schedule': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Duty Schedule  is Required'
        },
    }
};

//************************************************************************pooja material filter ************************************************************************//\

exports.checkmaterialdatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkmaterialcategoryvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'category': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Category  is Required'
        },
    }
};

//************************************************************************ volunteer registration   filter   ********************************************************** */

exports.checkvolunteerexperiencevldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'volunteer_experience': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Volunteer Experience is Required'
        },
    }
};
//************************************************************************    role assignment  filter   ********************************************************** */

exports.roledatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkroleshiftvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'shift_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Shift Name is Required'
        },
    }
};

//************************************************************************   shift scheduling filter   ********************************************************** */

exports.checkshiftdatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkshiftnamevldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Status is Required'
        },
    }
};

//************************************************************************  tracking -onboarding filter   ********************************************************** */

exports.checktrackingdatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkfrequencyavailabilityvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'frequency_availability': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Frequency Availability is Required'
        },
    }
};

//************************************************************************ Feedback filter   ********************************************************** */

exports.checkfeedbackdescriptionvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'feedback_description': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Feedback Description  is Required'
        },
    }
};



//***********************************  edu-student registration filter      ********************************************************** */

exports.checkstudentregistrationvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'choosed_program': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Choosed Program  is Required'
        },
    }
};

//***********************************  edu-teacher-profile filter      ********************************************************** */

exports.checkqualificationsvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'qualifications': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Qualifications  is Required'
        },
    }
};

//*********************************** edu-attendance-tracking filter      ********************************************************** */

exports.checkattendancedatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkattendancevldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'attendance_status': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Attendance Status is Required'
        },
    }
};

//************************************************************************  edu- work shop  filter   ********************************************************** */

exports.checkworkshopdatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkworkshopoutcomevldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'workshop_outcome': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Workshop Outcome is Required'
        },
    }
};

//*********************************** edu-recognition filter       ********************************************************** */

exports.checkrecognitiondatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkrecognitionvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'recognition_type': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Recognition Type is Required'
        },
    }
};

//************************************************************************  edu-curriculum   filter   ********************************************************** */

exports.checkcurriculumdatesdatavldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },

        'from_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'From Date is Required'
        },

        'to_date': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'To Date is Required'
        },
    }
};

exports.checkgradingvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'course_grading': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Course Grading is Required'
        },
    }
};

//***********************************edu-feedback filter       ********************************************************** */

exports.checkfeedbackvldts = {
    "body": {
        'temple_id': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Temple ID is Required'
        },
        'course_specific_feedback': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed '
            },
            errorMessage: 'Course Specific Feedback  is Required'
        },
    }
};

// *****************************task management start  **************************** //
exports.departmntcrtn = {
    "body": {
        'department_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Department Name is Required'
        },

        'designation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Designation is Required'
        },
    }
};

exports.editmemberregistration = {
    "body": {
        'department_name': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Department Name is Required'
        },

        'designation': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Designation is Required'
        }
    }
};
//upload task
exports.uploadtaskmethod = {
    "body": {
        'rcvd_from': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Whom Received is Required'
        },

        'subject': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'Subject is Required'
        },
    }
};
// *****************************task management end  **************************** //

// ******************************Vip/vipRegistrationForm*******************************
exports.checkpostVipDetailsCntrl = {
    "body": {
        'vipName': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed'
            },
            errorMessage: 'Vip Name is Required'
        },
        'cntctPersn': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed'
            },
            errorMessage: 'Contact Person  is Required'
        },
        'visitDate': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Allowed -/ 0-9'
            },
            errorMessage: 'Visting Date is Required'
        },
        'cntctNumbr': {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed'
            },
            errorMessage: 'Contact Number is Required'
        },
    }
};


exports.chckDateFiltr = {
    "body": {
        "temple_id": {
            notEmpty: true,
            matches: {
                options: [/^[0-9]*$/],
                errorMessage: 'Only Numbers Allowed in this Input'
            },
            errorMessage: 'Temple ID is Required'
        },
        'date': {
            notEmpty: true,
            matches: {
                options: [/^[a-zA-Z0-9]+[^'"<>=%]*$/],
                errorMessage: 'Only Characters Allowed in this Input'
            },
            errorMessage: 'From Date is Required'
        },
    }
}