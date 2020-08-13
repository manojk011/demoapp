'use strict'
const dbExecution      = require('./dbExecute');
const logger = require('kp-cloud4js-logger')();

let setup = async () => {
    let postgresExecution = dbExecution.getExectionObj('postgres');
    try{
        await postgresExecution.executeTransaction({queryName: 'postgres_admin.create_status_table.query'});
        await postgresExecution.executeTransaction({queryName: 'postgres.drop_table.query'});
        await postgresExecution.executeTransaction({queryName: 'postgres.create_table.query'});
        
    }catch(error){
        logger.error("Failed to create the required table in postgres")
        throw error;
    }
}


module.exports = {
    setup: setup
}