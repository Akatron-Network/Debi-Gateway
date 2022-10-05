
//* ---- Functions

// Functions global variable
//. env.Functions['sevice'][0]
var Functions = {}

// Functions Url Settings
class Function_Settings {
  static Function_Url = "/fn/:funcname/"
}


//--- Connector Configs

// Connector configurations for this user
//. env.ConnectorConfigs['collection_id']
var ConnectorConfigs = {}


//--- Gate Token

var Token = ""

var User = {}
var Settings = {}

module.exports = {
  Functions,
  Function_Settings,
  ConnectorConfigs,
  Token,
  User,
  Settings
}