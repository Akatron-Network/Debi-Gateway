const env = require('../Libraries/env');
const resp = require('../Libraries/resp');
const misc = require('../Libraries/misc');
const cnsl = require('../Libraries/console');

//* Connectors
const mssql = require('./mssql').connector_module;


//-- Connector Registration

//* Add connector's connector_module to the list

const Connector_registry = [
  mssql
]


//* Construct connectors to the Environment variables
// Returns nothing
//. use directly construct_connectors()
//. It converts Connector_registry variable to env.Connectors variable
function construct_connectors() {
  cnsl.clean_log(cnsl.colors.FgYellow + "\nConnector Registration")
  var st_time = misc.getTimestamp()

  // Clear the environment variable
  env.Connectors = {}

  for (var c in Connector_registry) {
    var connector = Connector_registry[c]

    env.Connectors[connector.connector_type] = connector.class

    cnsl.clean_log(cnsl.colors.FgYellow + "[+] " + cnsl.colors.FgWhite + connector.connector_type + " / " + connector.name + cnsl.colors.Dim)
  }

  cnsl.clean_log(cnsl.colors.FgYellow + cnsl.colors.Dim + "-> " + (Math.floor((misc.getTimestamp() - st_time)*1000)) + " ms  -  " +
    misc.roughSizeOfObject(env.Connectors).toFixed(4) + " KBytes")

}



module.exports = {
  construct_connectors
}


