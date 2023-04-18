const env = require('../../Libraries/env');
const resp = require('../../Libraries/resp');
const misc = require('../../Libraries/misc')

//-- Methods

async function get(req, res, body) {

  return resp.resp_success(res);

}







//* Function Module Definition
//! Dont forget to register function in onstructor.js
const function_module = {
  
  // Name of the function
  name: "Ping",
  
  // Url of the function
  url: "ping",
  
  // Explanation of the function
  explanation: "Test the gateway is accesible",

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