'use strict'

const logger = require('kp-cloud4js-logger')();
const statusCodes = require('http-status-codes');
const pgdb = require('kp-cloud4js-pg');

let getOperations = function (operationType){
    return {'insert': 'pending', 'update': 'pending', 'delete': 'pending','select': 'pending'};
}

let updateOperations = function(skipOperaions, operations){
    for (let each in skipOperaions){
        delete operations[skipOperaions[each]];
    }
    return operations
}

let getExectionObj = function(dbType){
    let dbExecution
    let buff = Buffer.from(azureConfig["nodesqlStatements"], 'base64');  
    let sqlStatements = JSON.parse(buff.toString('utf-8'));
    let config;
    switch(dbType) {
        case 'postgres':
            config = {"host": azureConfig["postgres.host"],
                         "user": azureConfig["postgres.user"], 
                         "password": azureConfig["postgres.password"],
                         "database": azureConfig["postgres.database"]}
            dbExecution = new pgdb({config: config, ssl: true, sqlStatements: sqlStatements})
            //dbExecution = new postgresBuilder(null, sqlStatements);//'../helper/sqlStatements.json')
            break;
        default:
            throw new Error('invlid db type. Contact the administrator')
    }
    return dbExecution
}

let completeHealthCheck = async function(dbType){
    let dbExecution, connection, transaction, response
    let errors = []
    let operations = getOperations("all")
    try {
       
        dbExecution = getExectionObj(dbType)
        
        connection = await dbExecution.getConnection();
        transaction = await dbExecution.beginTransaction(connection);
        
        await dbOperation(dbExecution, transaction, connection, dbType, 'insert')
            .then(() => operations['insert'] = 'success')
            .catch((error) => {
                operations['insert'] = 'failed'
                errors.push(error.message)
            })
        await dbOperation(dbExecution, transaction, connection, dbType, 'update')
            .then(() => operations['update'] = 'success')
            .catch((error) => {
                operations['update'] = 'failed'
                errors.push(error.message)
            })        

        await dbOperation(dbExecution, transaction, connection, dbType, 'select')
        .then(() => operations['select'] = 'success')
        .catch((error) => {
            operations['select'] = 'failed'
            errors.push(error.message)
        })

        //await dbExecution.commit(transaction);
        
        // Delete, Drop operation
        //transaction = await dbExecution.beginTransaction(connection);
        await dbOperation(dbExecution, transaction, connection, dbType, 'delete')
        .then(() => operations['delete'] = 'success')
        .catch((error) => {
            operations['delete'] = 'failed'
            errors.push(error.message)
        })

        await dbExecution.commit(transaction);

        errors = (errors.length > 0)?errors:undefined
        response = {'status': 'CRUD operations successful', operations: operations, error: errors}
    } catch (error) {
        logger.error(`Rolling back transaction due to the following error: ${error.message}`);
        if (transaction && !transaction._rollbackRequested) dbExecution.rollback(transaction);
        let failed_operation = error.message.split(' ')[0]
        operations[failed_operation] = 'failed'
        response =  {status: 'Complete Health check failed', operations: operations, error: error}
    }
    finally {
        await dbExecution.releaseConnection(connection);
        return response;
    }
}


let getExcludedOperations = (operationType) => {
    switch(operationType) {
        case 'insert':
        case 'delete':
            return ["update", "select"];
        case 'update':
            return ["select"];
        case 'select':
            return ["update"];
        
        default:
            return undefined;
    }
 
}

let comboExecutions = async function(dbType, operationType, skipOperaions){
    let dbExecution, connection, transaction, response
    let errors = []
    let operations = getOperations()
    try {
        operations = updateOperations(skipOperaions, operations)
        
        dbExecution = getExectionObj(dbType)
        connection = await dbExecution.getConnection();
        transaction = await dbExecution.beginTransaction(connection);

        if (!skipOperaions.includes('insert')) {
            await dbOperation(dbExecution, transaction, connection, dbType, 'insert')
            .then(() => operations['insert'] = 'success')
            .catch((error) => {
                operations['insert'] = 'failed'
                errors.push(error.message)
            })
        }
        

        if (!skipOperaions.includes('update')) {
            await dbOperation(dbExecution, transaction, connection, dbType, 'update')
            .then(() => operations['update'] = 'success')
            .catch((error) => {
                operations['update'] = 'failed'
                errors.push(error.message)
            })        
        } 
        
        if (!skipOperaions.includes('select')){
            await dbOperation(dbExecution, transaction, connection, dbType, 'select')
                .then(() => operations['select'] = 'success')
                .catch((error) => {
                    operations['select'] = 'failed'
                    errors.push(error.message)
                })
        } 
        
        
        if (!skipOperaions.includes('delete')){
            await dbOperation(dbExecution, transaction, connection, dbType, 'delete')
                .then(() => operations['delete'] = 'success')
                .catch((error) => {
                    operations['delete'] = 'failed'
                    errors.push(error.message)
                })
        } 
        
        

        await dbExecution.commit(transaction);
        let status = (errors.length > 0) ? statusCodes.INTERNAL_SERVER_ERROR : statusCodes.OK
        errors = (errors.length > 0)?errors:undefined
        response = {'status': `${operationType} operation successful`,  operations: operations, error: errors}
    
    } catch (error) {
        logger.error(`Rolling back transaction due to the following error: ${error.message}`);
        if (transaction && !transaction._rollbackRequested) dbExecution.rollback(transaction);
        let failed_operation = error.message.split(' ')[0]
        operations[failed_operation] = 'failed'
        response = {status: `${operationType} Health check failed`, operations: operations, error: errors, dberror: error}
    }
    finally {
        if(connection) await dbExecution.releaseConnection(connection);
        return response;
    }
}

let dbOperation = async function(dbExecutionObj, transaction, connection, dbType, queryKey){
    let queryName = `${dbType}.${queryKey}.query`
    let bindings = dbExecutionObj.sqlStatements.sqlserver[queryKey].bindings
    let randomVal = Math.floor(1000 + Math.random() * 9000);
    // adding a random value to avoid conflict of names for the requests fired at the same time
    let mockedBindings = {}
    for (let each in bindings){
        let bindingValue = bindings[each]
        if (queryKey == 'insert') bindingValue = bindings[each] + randomVal
        mockedBindings[each] = bindingValue
    }
    await dbExecutionObj.executeTransaction({queryName: queryName, bindings: mockedBindings, connection: connection, transaction: transaction})
                    .catch(async (error) => {
                        if (dbType == 'postgres') transaction = await dbExecutionObj.beginTransaction(connection);
                        throw error;
                    })
                    .then((result) => {
                        return result;
                    })    
                    
}



module.exports = {
    getExcludedOperations   : getExcludedOperations,
    completeHealthCheck     : completeHealthCheck,
    comboExecutions         : comboExecutions,
    getExectionObj          : getExectionObj,
    dbOperation             : dbOperation,
    getOperations           : getOperations
}