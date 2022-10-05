const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;

async function getToken() {
  let body = {
    ...env.User,
    "hashed_password": true
  }

  let url = 
    "http://" + 
    env.Settings.APIHOST + ":" + 
    env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_AUTH


  try {
    let ans = await got(url, {searchParams: body}).json()
    if (ans.Success) {
      env.Token = ans.Token
    }
    else { cnsl.error_log(ans.Data, ans); return false;}
  }
  catch (e) { cnsl.error_log(e.message, e); return false; }

  return true;
}


module.exports = {
  getToken
}