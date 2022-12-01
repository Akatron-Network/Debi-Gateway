const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const collections = require('./collections');
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


async function getConnector(coll_id) {
  let url = 
    "http://" + 
    env.Settings.APIHOST + 
    ":" + env.Settings.APIPORT + 
    env.Settings.APIGATEPATH_CONNECTOR

  let ans = await got(url, {
    headers: {"Token": env.Token}, 
    searchParams: {"collection_id": coll_id}
  }).json()

  if (!ans.Success) return null 

  let con_info = ans.Data
  let coll_info = await collections.getCollection(coll_id)

  return new env.Connectors[con_info.connector_type](coll_info, con_info.context)
}

module.exports = {
  getConnectors,
  getConnector
}