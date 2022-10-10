const env = require('../../Libraries/env');
const resp = require('../../Libraries/resp');
const misc = require('../../Libraries/misc');
const connector = require('../../Connectors/connector');

//-- Methods

async function post(req, res, body) {

  var coll_id = body.collection_id
  var query = body.query

  //* Control is there any defined connector?
  if (!env.ConnectorConfigs.hasOwnProperty(coll_id)) { return resp.resp_error(res, "collection's connector not defined.") }

  //* Get connector
  var Connector = await connector.getConnector(coll_id)

  var ans = await Connector.execute(query) 
  if (!ans[0]) { return resp.resp_error(res, ans[1]) }

  return resp.resp_success(res, ans[1]);

}







//* Function Module Definition
//! Dont forget to register function in onstructor.js
const function_module = {
  
  // Name of the function
  name: "Execution",
  
  // Url of the function
  url: "execute",
  
  // Explanation of the function
  explanation: "Data executioner for users",

  // Methods of the function
  //. methods: {
  //.   GET: {
  //.     function: method_func,
  //.     required_keys: ["username", "password"],
  //.     forbidden_keys: []
  //.   }
  //. }
  methods: {
    POST: {
      function: post,
      required_keys: ["collection_id", "query"],
    }
  },
}

// Export the module for outer scope
module.exports = {function_module}