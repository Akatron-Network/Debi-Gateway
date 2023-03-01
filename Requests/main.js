const env = require("../Libraries/env");
const { getConnectors } = require("./connector");
const { getToken } = require("./token");
const cnsl = require('../Libraries/console');
const { DBTranslate } = require("./translate");
const { getCollections } = require("./collections");
const misc = require('../Libraries/misc');
const { ping } = require('./ping');
const fs = require('fs');
const path = require('path');
const connector = require('./connector');

async function setup() {
  var st_time = misc.getTimestamp()

  var connectable = await ping();

  if (!connectable) { cnsl.error_log('Cannot connect to: ' + env.Settings.APIHOST + ":" + env.Settings.APIPORT); throw "Api Connection Failed"; }

  let ansToken = await getToken();
  if (!ansToken) { throw "Token Error." }

  let ansCollections = await getCollections();
  if (!ansCollections) { throw "Collection Error." }

  let ansConnector = await getConnectors();
  if (!ansConnector) { throw "Connector Error." }

  let ansDBTranslate = await DBTranslate.getDataFromHost();
  if (!ansDBTranslate) { throw "DBTranslate Error."}

  cnsl.clean_log(cnsl.colors.FgYellow + "\nApi Connection setup")
  cnsl.clean_log(cnsl.colors.FgYellow + "[+] " + cnsl.colors.FgWhite + "Token: " + cnsl.colors.Dim + env.Token.substring(0,20) + "...")
  cnsl.clean_log(cnsl.colors.FgYellow + "[+] " + cnsl.colors.FgWhite + "Collections: " + cnsl.colors.Dim + Object.keys(env.Collections).join(", "))
  cnsl.clean_log(cnsl.colors.FgYellow + "[+] " + cnsl.colors.FgWhite + "Connectors: " + cnsl.colors.Dim + Object.keys(env.ConnectorConfigs).join(", "))
  cnsl.clean_log(cnsl.colors.FgYellow + "[+] " + cnsl.colors.FgWhite + "Translates: " + cnsl.colors.Dim + Object.keys(env.DBTranslateData).join(", "))
  cnsl.clean_log(cnsl.colors.FgYellow + cnsl.colors.Dim + "-> " + (Math.floor((misc.getTimestamp() - st_time)*1000)) + " ms \n")

  //* Control syncronizations
  for (let col in env.Collections) {
    let is_gateway = env.Collections[col].connector.gateway_host !== null
    if (is_gateway) {
      let filepath = path.resolve(__dirname, "../Functions/data/explorer_syncs/" + col + ".json")
      if (!fs.existsSync(filepath)) {
        var Connector = await connector.getConnector(col)
        try {
          await Connector.sync_database()
        }
        catch (e) {
          cnsl.error_log(e);
        }
      }
    }
  }


}


module.exports = {
  setup
}