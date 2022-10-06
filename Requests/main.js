const env = require("../Libraries/env");
const { getConnectors } = require("./connector");
const { getToken } = require("./token");
const cnsl = require('../Libraries/console');
const { DBTranslate } = require("./translate");
const { getCollections } = require("./collections");
const misc = require('../Libraries/misc');

async function setup() {
  var st_time = misc.getTimestamp()

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
}


module.exports = {
  setup
}