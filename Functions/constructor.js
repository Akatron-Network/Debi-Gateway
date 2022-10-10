const env = require('../Libraries/env');
const resp = require('../Libraries/resp');
const misc = require('../Libraries/misc');
const cnsl = require('../Libraries/console');

//--- Data Functions
const explorer = require('./data/explorer').function_module;
const execute = require('./data/execute').function_module;
const conector = require('./data/connector').function_module;

//* Function Registration

//. var Functions_registry = {
//.   category: [function1, function2]
//. }

var Functions_registry = {
  data: [explorer, execute, conector]
}




//* Construct Functions to the Environment Variables
// Returns nothing
//. use directly construct_tables()
//. It converts Functions_registry variable to env.Functions variable
function construct_functions() {
  cnsl.clean_log(cnsl.colors.FgYellow + "\nFunction Registration")
  var st_time = misc.getTimestamp()
  //. Clear the environment variable
  env.Functions = {}

  //. Loop the categories
  for (var category in Functions_registry) {

    //. Create the category in env.
    env.Functions[category] = {}

    //. Loop the funcs in category
    for (var f in Functions_registry[category]) {

      //. Register category with url to the env.
      var func = Functions_registry[category][f]
      env.Functions[category][func.url] = func

      cnsl.clean_log(cnsl.colors.FgYellow + "[+] " + cnsl.colors.FgWhite + category + " / " + func.url + cnsl.colors.Dim + " // " + func.explanation)
    }
  }
  cnsl.clean_log(cnsl.colors.FgYellow + cnsl.colors.Dim + "-> " + (Math.floor((misc.getTimestamp() - st_time)*1000)) + " ms  -  " +
    misc.roughSizeOfObject(env.Functions).toFixed(4) + " KBytes")
}



//* Construct Function Routes
// Returns nothing
//! Must be used after construct_functions()
//. use directly construct_routes(app)
function construct_routes(app) {
  app.use(env.Function_Settings.Function_Url, async function(req, res) {
    var category = req.params.category
    var func_name = req.params.funcname

    //. Control the category
    if (!Object.keys(env.Functions).includes(category)) {return resp.resp_error(res, "can not find the category. use: " + env.Function_Settings.Function_Url)}

    //. Control the function
    if (!env.Functions[category].hasOwnProperty(func_name)) {return resp.resp_error(res, "can not find the function in this category.")}

    var func = env.Functions[category][func_name]
    var method = req.method
    var body = misc.reqBody(req)

    var ip = req.ip
    
    cnsl.log(method + ": " + "(" + (misc.sizeOfJson(body).toFixed(2)) + "KB" + ") " + req.baseUrl + cnsl.colors.Dim + " // " + JSON.stringify(body) + " -> " + ip)
    

    //. Control is the method acceptable
    if (!func.methods.hasOwnProperty(method)) { return resp.resp_error(res, "method is not allowed!") }

    //. Control body keys are acceptable
    var bodyControl = misc.controlBody(body, func.methods[method].required_keys, func.methods[method].forbidden_keys)
    if (!bodyControl[0]) { return resp.resp_error(res, bodyControl[1]) }
    
    //. Execute the method
    return func.methods[method].function(req, res, body)
    
  })
  cnsl.clean_log(cnsl.colors.FgYellow + cnsl.colors.Dim + "Function Routes Integrated")
}




module.exports = {
  construct_functions,
  construct_routes
}