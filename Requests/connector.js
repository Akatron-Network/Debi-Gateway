const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;

async function getConnectors() {

  let url = 
    "http://" + 
    env.Settings.APIHOST + 
    ":" + env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_CONNECTOR

  try {
    let ans = await got(url, {headers: {"Token": env.Token}}).json()
    if (ans.Success) {
      env.ConnectorConfigs = ans.Data
    }
    else { cnsl.error_log(ans.Data, ans); return false;}
  }
  catch (e) { cnsl.error_log(e.message, e); return false; }

  return true;
}

module.exports = {
  getConnectors
}