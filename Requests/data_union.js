const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;

async function get_union(union_id) {

  let url = 
    "http://" + 
    env.Settings.APIHOST + 
    ":" + env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_DATAUNION

  let ans = await got(url, {headers: {"Token": env.Token}, searchParams: {"union_id": union_id}}).json()
  if (ans.Success) {
    return ans.Data
  }
  else { cnsl.error_log(ans.Data, ans); throw ans;}
}

module.exports = {
  get_union
}