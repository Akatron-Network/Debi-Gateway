const env = require('../Libraries/env');




//* Create a connector class by collection id
// return Connector()
async function getConnector(coll_id) {
  let con_info = env.ConnectorConfigs[coll_id]
  let coll_info = env.Collections[coll_id]
  console.log(con_info);
  return new env.Connectors[con_info.connector_type](coll_info, con_info.context)
}


module.exports = {getConnector}