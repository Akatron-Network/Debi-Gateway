const {handleError} = require('./Libraries/errorhandler');



function main() {
  const express = require('express');
  const loadIniFile = require('read-ini-file');
  const path = require('path');

  //* Internal Imports
  const router = require('./router');
  const cnsl = require('./Libraries/console');
  const connector = require('./Requests/connector');
  const token = require('./Requests/token');
  const env = require('./Libraries/env');
  const reqmain = require('./Requests/main');

  const app = express()

  router.construct(app);

  const fixture = path.join(__dirname, 'user.ini')
  const user = loadIniFile.sync(fixture)
  env.User = user.DebiGateWay

  const fixture2 = path.join(__dirname, 'settings.ini')
  const settings = loadIniFile.sync(fixture2)
  env.Settings = settings.ServiceSettings

  var server = app.listen(8001, function() {
    cnsl.clean_log(cnsl.colors.FgWhite + "\nDesignable Business Intelligence")
    cnsl.clean_log(cnsl.colors.FgWhite + "By Akatron Network")
    cnsl.clean_log(cnsl.colors.FgYellow + "Listening API")
    cnsl.clean_log(
      cnsl.colors.FgYellow + "Host: " +
      cnsl.colors.FgWhite + env.Settings.APIHOST + "\n" +
      cnsl.colors.FgYellow + "Port: " +
      cnsl.colors.FgWhite + env.Settings.APIPORT + "\n")
      cnsl.clean_log(cnsl.colors.FgYellow + "Gateway on port: 8001")
  })

  reqmain.setup();
}


try { main(); }
catch (e) { handleError(e); }