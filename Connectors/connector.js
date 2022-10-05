const env = require('../Libraries/env');




//* Create a connector class by collection id
// return Connector()
async function getConnector(coll_id) {
  let con_info = env.ConnectorConfigs[coll_id]
  console.log(con_info);
  return new env.Connectors[con_info.connector_type](con_info, con_info.context)
}


module.exports = {getConnector}