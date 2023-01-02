const env = require('../../Libraries/env');
const resp = require('../../Libraries/resp');
const misc = require('../../Libraries/misc');
const fs = require('fs');
const path = require('path');
const connector = require('../../Requests/connector');

//-- Methods

async function get(req, res, body) {
  
  let coll_id = body.collection_id
  let fileexists = fs.existsSync(path.join(__dirname, 'explorer_syncs/' + coll_id + '.json'))
  
  if (fileexists) { 
    let syncfile_data = fs.readFileSync(path.join(__dirname, 'explorer_syncs/' + coll_id + '.json'))
    let syncfile_js = JSON.parse(syncfile_data)
    delete syncfile_js['data']
    return resp.resp_success(res, syncfile_js)
  }
  else { return resp.resp_error(res) }
}



async function post(req, res, body) {
  var coll_id = body.collection_id

  var Connector = await connector.getConnector(coll_id)

  try {
    res.set('Content-Type', 'application/json')
    await Connector.sync_database(res)
    res.end()
  }
  catch (e) {
    return res.end()
  }
}



//* Function Module Definition
//! Dont forget to register function in onstructor.js
const function_module = {
  
  // Name of the function
  name: "Explorer Synchronization",
  
  // Url of the function
  url: "explorer_sync",
  
  // Explanation of the function
  explanation: "Database explore synchronization",

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
      requried_keys: ["collection_id"]
    },
    POST: {
      function: post,
      requried_keys: ["collection_id"]
    }
  },
}

// Export the module for outer scope
module.exports = {function_module}