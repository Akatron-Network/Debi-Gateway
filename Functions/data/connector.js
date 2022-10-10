const env = require('../../Libraries/env');
const resp = require('../../Libraries/resp');
const cnsl = require('../../Libraries/console');
const misc = require('../../Libraries/misc')


//-- Control connector
async function put(req, res, body) {
  
  var coll_id = body.collection_id
  var conn_type = body.connector_type
  var context = body.context

  //* Control permission for this collection (editable)
  if (!env.Collections.hasOwnProperty(coll_id)) { return resp.resp_error(res, "permission denied.") }

  //todo control connector change functions to gateway

  //* is connector type exists ?
  if (!env.Connectors.hasOwnProperty(conn_type)) { return resp.resp_error(res, "connector type not found.") }

  try { 
    var connector = new env.Connectors[conn_type](coll_id, context)
    cnsl.clean_log(cnsl.colors.FgWhite + JSON.stringify(context, undefined, 4));

    await connector.connect()
    await connector.disconnect()
  }
  catch (e) { console.log(e); return resp.resp_error(res, e.message) }

  return resp.resp_success(res)
}






//* Function Module Definition
//! Dont forget to register function in onstructor.js
const function_module = {
  
  // Name of the function
  name: "Connectors",
  
  // Url of the function
  url: "connector",
  
  // Explanation of the function
  explanation: "Data connector controller for users",

  // Methods of the function
  //. methods: {
  //.   GET: {
  //.     function: method_func,
  //.     required_keys: ["username", "password"],
  //.     forbidden_keys: []
  //.   }
  //. }
  methods: {
    PUT: {
      function: put,
      required_keys: ['collection_id', 'connector_type', 'context']
    }
  },
}

// Export the module for outer scope
module.exports = {function_module}