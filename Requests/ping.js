const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;

async function ping() {
  let url = 
    "http://" + 
    env.Settings.APIHOST + ":" + 
    env.Settings.APIPORT + "/ping"

  try {
    let ans = await got(url).json()
    if (ans.Success) { return true; }
    else { cnsl.error_log(ans.Data, ans); return false;}
  }
  catch (e) { cnsl.error_log(e.message, e); return false; }
}

module.exports = {ping}