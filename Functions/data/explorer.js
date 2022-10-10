const env = require('../../Libraries/env');
const resp = require('../../Libraries/resp');
const misc = require('../../Libraries/misc')
const connector = require('../../Connectors/connector');

//-- Methods

async function get(req, res, body) {

  var coll_id = body.collection_id
  var Connector = await connector.getConnector(coll_id)
  if (!Connector) { return resp.resp_error(res, "permission denied.")}

  //* Has table name given ?
  if (body.table_name) {

    var relations = false
    var columns = true

    //* Has include options given ?
    if (body.include) {
      if (Object.keys(body.include).includes('relations')) { relations = body.include.relations }
      if (Object.keys(body.include).includes('columns')) { columns = body.include.columns }
    }

    try { var ans = await Connector.get_table_info(body.table_name, columns, relations) }
    catch (e) { return resp.resp_error(res, e) }

    return resp.resp_success(res, ans)
  }
  
  var relations = false
  var columns = false
  var views = false

  //* Has include options given ?
  if (body.include) {
    if (Object.keys(body.include).includes('relations')) { relations = body.include.relations }
    if (Object.keys(body.include).includes('columns')) { columns = body.include.columns }
    if (Object.keys(body.include).includes('views')) { views = body.include.views }
  }
  

  try { var ans = await Connector.get_tables(views, columns, relations) }
  catch (e) { return resp.resp_error(res, e) }
  
  return resp.resp_success(res, ans);

}







//* Function Module Definition
//! Dont forget to register function in onstructor.js
const function_module = {
  
  // Name of the function
  name: "Explorer",
  
  // Url of the function
  url: "explorer",
  
  // Explanation of the function
  explanation: "Data explorer for users",

  // Methods of the function
  //. methods: {
  //.   GET: {
  //.     function: method_func,
  //.     required_keys: ["username", "password"],
  //.     forbidden_keys: []
  //.   }
  //. }
  methods: {
    GET: {
      function: get,
      required_keys: ['collection_id']
    }
  },
}

// Export the module for outer scope
module.exports = {function_module}