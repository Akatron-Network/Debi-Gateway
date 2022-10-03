const express = require('express');
const cnsl = require('./Libraries/console');
require('dotenv').config()

const app = express()

const host_url = process.env.APIHOST

var server = app.listen(8001, function() {
  cnsl.clean_log(cnsl.colors.FgWhite + "\nDesignable Business Intelligence")
  cnsl.clean_log(cnsl.colors.FgWhite + "By Akatron Network")
  cnsl.clean_log(cnsl.colors.FgYellow + "Gateway on port: 8001\n")
  cnsl.clean_log(cnsl.colors.FgYellow + "Listening API Host")
  cnsl.clean_log(cnsl.colors.FgWhite + host_url + "\n")
})
