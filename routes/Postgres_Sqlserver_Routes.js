'use strict'
const router = require('express').Router();
const dbExecute = require('../lib/dbExecute');
const logger = require('kp-cloud4js-logger')();
const statusCodes = require('http-status-codes');

router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// routes to execute the opertaions on a postgres database
router.get('/all', async function(req, res){
    try{
        let dbType = req.baseUrl.split('/')[3];
        let response = await dbExecute.completeHealthCheck(dbType);
        let status = (response.error != undefined) ? statusCodes.INTERNAL_SERVER_ERROR : statusCodes.OK;
        res.status(status).send(response);
    }catch(error){
        logger.error(error.message)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).send({status: 'Complete Health check failed', error: error.message})
    }  
});
  
router.get('/:operationType', async function(req, res){
    try{
        let dbType = req.baseUrl.split('/')[3]
        let operationType = req.path.split('/')[1]
        let skipOperations = dbExecute.getExcludedOperations(operationType);

        if (!skipOperations) {
            return res.status(statusCodes.BAD_REQUEST)
                        .send({error: `invlid operation type.
                                        Currently only insert, update, select, delete are the allowed operations`})    
        }
        
        let response = await dbExecute.comboExecutions(dbType, operationType, skipOperations)
        let status = (response.error != undefined) ? statusCodes.INTERNAL_SERVER_ERROR : statusCodes.OK
        res.status(status).send(response)
    }catch(error){
        logger.error(error.message)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).send({status: `${operationType} Health check failed`, error: error.message})
    }  
});

module.exports = router;