'use strict'
const logger = require('kp-cloud4js-logger')();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const api = 'api';
const version = 'v1';
// since redis rejects with unable_to_verify_leaf_signature
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// if (process.env.isLocal != "true") {
  // Enable reverse proxy support in Express. This causes the
  // the "X-Forwarded-Proto" header field to be trusted so its
  // value can be used to determine the protocol. See 
  // http://expressjs.com/api#app-settings for more details.
  app.enable('trust proxy');
  
  // Enable cors
  // const whitelist = azureConfig["whitelist_domains"];
  // const corsOptions = {
  //   origin: azureConfig["whitelist_domains"]
  // }
  app.use(cors());
  
  
  // Add a handler to inspect the req.secure flag (see 
  // http://expressjs.com/api#req.secure). This allows us 
  // to know whether the request was via http or https.
  app.use(function (req, res, next) {
    if (req.secure || req.hostname == 'localhost' || process.env.NODE_ENV == 'test') {
      // request was via https, so do no special handling
      next();
    } else {
      // request was via http, so redirect to https
      res.status(400).send({"error": "Trying to access an unsafe URL. Try HTTPS instead"});
    }
  });
// }

// This enables to read the body of the post request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());


(async function () {
  try {
    let getConfig = require('./lib/getConfig')
    await getConfig.fetchConfiguration()
    //global["azureConfig"] = require('./.vscode/config.json');
    let port = process.env.PORT || 6666;

    let Postgres_Sqlserver_Routes = require('./routes/Postgres_Sqlserver_Routes');
   
    // set up the routes
    app.use(`/${api}/${version}/postgres`, Postgres_Sqlserver_Routes);
    
    // creates the table required to perform CRUD operations for postgres, sql server
    let table_setup = require('./lib/table_setup');
    await table_setup.setup();

    app.listen(port, async function () {
      logger.info(`listening on port: ${port}`);
    });

  } catch (error) {
    console.log(error)
    let errorMessage = (error.hasOwnProperty('message')) ? error.message : error;
    logger.error(errorMessage);
    process.exit();
  }
})();


module.exports = app;
