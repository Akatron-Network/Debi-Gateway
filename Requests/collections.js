const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;

async function getCollections() {

  let url = 
    "http://" + 
    env.Settings.APIHOST + 
    ":" + env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_COLLECTIONS

  try {
    let ans = await got(url, {headers: {"Token": env.Token}}).json()
    if (ans.Success) {
      for (var c of ans.Data) {
        env.Collections[c.collection_id] = c
      }
    }
    else { cnsl.error_log(ans.Data, ans); return false;}
  }
  catch (e) { cnsl.error_log(e.message, e); return false; }

  return true;
}

async function getCollection(collection_id) {
  let url = 
    "http://" + 
    env.Settings.APIHOST + 
    ":" + env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_COLLECTIONS

  let ans = await got(url, {
    headers: {"Token": env.Token}, 
    searchParams: {"collection_id": collection_id}
  }).json()
  
  if (ans.Success) return ans.Data
  else return null
}

module.exports = {
  getCollections,
  getCollection
}