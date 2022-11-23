
//* ---- Functions

// Functions global variable
//. env.Functions['sevice'][0]
var Functions = {}

// Functions Url Settings
class Function_Settings {
  static Function_Url = "/fn/:category/:funcname/"
}

//--- Collections

var Collections = {}


//--- Connectors

var Connectors = {}

// Connector configurations for this user
//. env.ConnectorConfigs['collection_id']
var ConnectorConfigs = {}


//--- DBTranslate

var DBTranslateData = {}



//--- Gate Token

// Debi Gate Token
//. Taken from api host
var Token = ""


// User.ini parameters
//. Example:
//. {
//.   username: "Admin",
//.   password: "8asd6f5dsdfe54fe1ef"
//. }
var User = {}

// Settings.ini parameters
//. Example:
//.   {
//.     APIHOST: 'localhost',
//.     APIPORT: '8000',
//.     APIGATEPATH_AUTH: '/api/functions/gateway/auth/',
//.     APIGATEPATH_CONNECTOR: '/api/functions/gateway/connector/',
//.     APIGATEPATH_DBTRANSLATE: '/api/functions/gateway/dbtranslates/',
//.     LANGUAGE: 'TR'
//.   }
var Settings = {}



var Logs_Path = require('path').resolve(__dirname, '../logs')

module.exports = {
  Functions,
  Function_Settings,
  Collections,
  Connectors,
  ConnectorConfigs,
  DBTranslateData,
  Token,
  User,
  Settings,
  Logs_Path
}