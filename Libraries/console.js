const fs = require('fs');
const env = require('../Libraries/env');
const misc = require('../Libraries/misc');
const { handleError } = require('./errorhandler');

//* Console log function with date and time stamp
// log('test')
// log('test', false) / no datestamp
// log('test', false, false) / no datestamp and no timestamp
function log(text, datestamp = true, timestamp = true) {
  log_msg = ""

  if (datestamp) { log_msg += colors.FgYellow + "[" + misc.getDateString() + "] " + colors.Reset }
  if (timestamp) { log_msg += colors.FgYellow + "[" + misc.getTimeString() + "] " + colors.Reset }
  
  return console.log(log_msg + text + colors.Reset);
}

//* Clean log
// stamps not included
function clean_log(text) {
  return log(text + colors.Reset, false, false);
}

//* Error Log
function error_log(text, error = undefined) {
  log(colors.FgRed + "[ERROR] " + colors.Dim + text + colors.Reset)
  write_file('error', text)
}

//* Information log
function info_log(text) {
  log(text)
  write_file('common', text)
}

//* Response Log
function resp_log(text) {
  log(text)
  write_file('common', text)
}

//* Get Latest Log Files
//. Returns {error: error_log_file_path, common: common_log_file_path}
async function get_latest_file(is_opening) {
  let retcontent = {
    error: null,
    common: null
  }
  
  let error_logs = fs.readdirSync(env.Logs_Path + "/error/")
  if (!error_logs.includes(misc.getDateString() + ".log")) {
    fs.appendFileSync(
      env.Logs_Path + "/error/" + misc.getDateString() + ".log", 
      "\n[" + misc.getDateString() + " " + misc.getTimeString() + "] " +
      'Debi: Start of logging.'
    )
  }
  retcontent.error = env.Logs_Path + "/error/" + misc.getDateString() + ".log"

  let common_logs = fs.readdirSync(env.Logs_Path + "/common/")
  if (!common_logs.includes(misc.getDateString() + ".log")) {
    fs.appendFileSync(
      env.Logs_Path + "/common/" + misc.getDateString() + ".log", 
      "\n[" + misc.getDateString() + " " + misc.getTimeString() + "] " +
      'Debi: Start of logging.'
    )
  }
  retcontent.common = env.Logs_Path + "/common/" + misc.getDateString() + ".log"

  if (is_opening) {
    write_file('common', '\nServer Start\n------------');
    write_file('error', '\nServer Start\n------------');
  }

  return retcontent
}

async function write_file(logtype, message = "") {
  let dirs = await get_latest_file()
  if (!Object.keys(dirs).includes(logtype)) { return false }

  for (var n of Object.values(colors)) { message = message.replaceAll(n, '')}
  
  let content = fs.readFileSync(dirs[logtype], 'utf-8')
  content += "\n[" + misc.getDateString() + " " + misc.getTimeString() + "] " + message

  fs.writeFileSync(dirs[logtype], content)
}




//* Console font styles

const colors = {
  Reset : "\x1b[0m",
  Bright : "\x1b[1m",
  Dim : "\x1b[2m",
  Underscore : "\x1b[4m",
  Blink : "\x1b[5m",
  Reverse : "\x1b[7m",
  Hidden : "\x1b[8m",

  FgBlack : "\x1b[30m",
  FgRed : "\x1b[31m",
  FgGreen : "\x1b[32m",
  FgYellow : "\x1b[33m",
  FgBlue : "\x1b[34m",
  FgMagenta : "\x1b[35m",
  FgCyan : "\x1b[36m",
  FgWhite : "\x1b[37m",

  BgBlack : "\x1b[40m",
  BgRed : "\x1b[41m",
  BgGreen : "\x1b[42m",
  BgYellow : "\x1b[43m",
  BgBlue : "\x1b[44m",
  BgMagenta : "\x1b[45m",
  BgCyan : "\x1b[46m",
  BgWhite : "\x1b[47m"
}


module.exports = {
  log,
  clean_log,
  error_log,
  info_log,
  resp_log,
  get_latest_file,
  colors
}