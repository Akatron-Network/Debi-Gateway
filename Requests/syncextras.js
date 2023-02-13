const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;

async function syncext(db_scheme_id) {
  let url = 
    "http://" + 
    env.Settings.APIHOST + ":" + 
    env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_SYNCEXT

  let ans = await got(url, {
    headers: {"Token": env.Token}, 
    searchParams: {db_scheme_id}
  }).json()
  if (ans.Success) { 
    return ans.Data; 
  }
  else { throw new Error('Sync Extras failed')}
}

module.exports = {syncext}