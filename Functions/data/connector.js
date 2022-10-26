const env = require('../../Libraries/env');
const resp = require('../../Libraries/resp');
const cnsl = require('../../Libraries/console');
const misc = require('../../Libraries/misc');
const dbscheme = require('../../Requests/dbscheme');


//-- Control connector
async function put(req, res, body) {
  
  var conn_type = body.connector_type
  var context = body.context

  //* is connector type exists ?
  if (!env.Connectors.hasOwnProperty(conn_type)) { return resp.resp_error(res, "connector type not found.") }

  try { 
    var connector = new env.Connectors[conn_type]({}, context)
    cnsl.clean_log(cnsl.colors.FgWhite + cnsl.colors.Dim + JSON.stringify(context, undefined, 4));

    await connector.connect()
    
    //* Get similarity to schemes
    var tbls = await connector.get_tables()
    var tbl_list = []
    for (let t of tbls) { tbl_list.push(t.table); delete t['priority'] }

    var similarity = await dbscheme.getSimilarity(tbl_list);

    await connector.disconnect()
  }
  catch (e) { console.log(e); return resp.resp_error(res, e.message) }

  var retdata = {
    database_name: context.database,
    table_count: tbl_list.length,
    scheme_similarity: similarity ? similarity : undefined
  }

  return resp.resp_success(res, retdata)
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
      required_keys: ['connector_type', 'context']
    }
  },
}

// Export the module for outer scope
module.exports = {function_module}