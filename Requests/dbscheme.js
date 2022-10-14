const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;

async function getSimilarity(tablelist) {
  
  let url = 
    "http://" + 
    env.Settings.APIHOST + ":" + 
    env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_DBSCHEME

  let body = {tables: tablelist}

  try {
    let ans = await got.post(url, { json: body, headers: {"Token": env.Token} }).json()
    if (ans.Success) { return ans.Data.scheme_similarity }
    else { cnsl.error_log(ans.Data, ans); return false;}
  }
  catch (e) { cnsl.error_log(e.message, e); return false; }

}

//todo add DBSCHEME path to manager !!!

module.exports = {getSimilarity}