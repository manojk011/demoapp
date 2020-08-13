'use strict'
const logger = require('kp-cloud4js-logger')();
const axios = require('axios');

let fetchConfiguration = async function(){
    let appConfig
    if (process.env.local_config_path ){
        let localConfig = require(process.env.local_config_path);
        appConfig = localConfig.propertySources[0].source;
        global["azureConfig"] = appConfig;
        return;
    }
    try{
      let kpconfigResponse = await fetch_from_kp_config();
      if (typeof(kpconfigResponse.data) === "object" && Object.keys(kpconfigResponse.data).length != 0){
        appConfig = kpconfigResponse.data.propertySources[0].source;
      }else{
        throw new Error("unrecognised response from kpconfig");
      }
    }catch(error){
      logger.error("failed to fetch the app config");
      throw error;
    }
    
    
    
    global["azureConfig"] = appConfig;
    return;
    
  };
  
  let fetch_from_kp_config = function(fileName){
    if (process.env.configService == undefined || process.env.serviceName === undefined || process.env.profile === undefined || process.env.configLabel === undefined
       || process.env.configUser == undefined || process.env.configToken == undefined || process.env.accessToken == undefined){
      throw new Error("Please check that the configService, serviceName, profile, configLabel, configUser, configToken has been properly set in the environment")
    }
    // KP Config Service URL is provided in a specific format based on the repo and file name
    let url = `${process.env.configService}/${process.env.serviceName}/${process.env.profile}/${process.env.configLabel}`  
    
    if (fileName != undefined){
      url = url + `/${fileName}`
    } else if (process.env.jsonfileName != undefined) {
      url = url + `/${process.env.jsonfileName}`
    }
    
    return axios.get(url, {
            headers: {
              Authorization: 'Basic ' + Buffer.from(process.env.configUser + ':' + process.env.configToken).toString('base64'),
              access_token: process.env.accessToken
            }
          })
  };

  module.exports = {
    fetchConfiguration,
    fetch_from_kp_config 
  }