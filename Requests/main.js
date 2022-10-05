const env = require("../Libraries/env");
const { getConnectors } = require("./connector");
const { getToken } = require("./token");
const cnsl = require('../Libraries/console');
const { DBTranslate } = require("./translate");

async function setup() {
  
  let ansToken = await getToken();
  if (!ansToken) { throw "Token Error." }

  let ansConnector = await getConnectors();
  if (!ansConnector) { throw "Connector Error." }

  let ansDBTranslate = await DBTranslate.getDataFromHost();
  if (!ansDBTranslate) { throw "DBTranslate Error."}

  cnsl.clean_log(cnsl.colors.FgYellow + "\nApi Connection setup complated.")
  cnsl.clean_log(cnsl.colors.FgYellow + "Token: " + cnsl.colors.Dim + env.Token)
  cnsl.clean_log(cnsl.colors.FgYellow + "Connectors: " + cnsl.colors.Dim + Object.keys(env.ConnectorConfigs).join(", "))
  cnsl.clean_log(cnsl.colors.FgYellow + "Translates: " + cnsl.colors.Dim + Object.keys(env.DBTranslateData).join(", ") + "\n")
}


module.exports = {
  setup
}