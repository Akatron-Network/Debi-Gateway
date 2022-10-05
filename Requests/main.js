const env = require("../Libraries/env");
const { getConnectors } = require("./connector");
const { getToken } = require("./token");
const cnsl = require('../Libraries/console');

async function setup() {
  
  let ansToken = await getToken();

  if (!ansToken) { throw "Token error." }

  let ansConnector = await getConnectors();

  if (!ansConnector) { throw "Connector error." }

  cnsl.clean_log(cnsl.colors.FgYellow + "Api Connection setup complated. \n")
}


module.exports = {
  setup
}