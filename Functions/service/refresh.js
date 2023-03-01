const env = require('../../Libraries/env');
const resp = require('../../Libraries/resp');
const misc = require('../../Libraries/misc')
const reqmain = require('../../Requests/main');

//-- Methods

async function get(req, res, body) {

  await reqmain.setup()
  return resp.resp_success(res);
}







//* Function Module Definition
//! Dont forget to register function in onstructor.js
const function_module = {
  
  // Name of the function
  name: "Refresh API Connection",
  
  // Url of the function
  url: "refresh",
  
  // Explanation of the function
  explanation: "Refresh api connection for gateway",

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
    }
  },
}

// Export the module for outer scope
module.exports = {function_module}