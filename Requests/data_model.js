const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;

async function get_model(model_id) {

  let url = 
    "http://" + 
    env.Settings.APIHOST + 
    ":" + env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_DATAMODEL

  let ans = await got(url, {headers: {"Token": env.Token}, searchParams: {"model_id": model_id}}).json()
  if (ans.Success) {
    return ans.Data
  }
  else { cnsl.error_log(ans.Data, ans); throw ans;}
}

module.exports = {
  get_model
}