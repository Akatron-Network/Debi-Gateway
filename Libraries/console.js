const misc = require('../Libraries/misc');

//* Console log function with date and time stamp
// log('test')
// log('test', false) / no datestamp
// log('test', false, false) / no datestamp and no timestamp
function log(text, datestamp = true, timestamp = true) {
  log_msg = ""

  if (datestamp) { log_msg += "[" + misc.getDateString() + "] " }
  if (timestamp) { log_msg += "[" + misc.getTimeString() + "] " }
  
  return console.log(log_msg + text);
}

//* Clean log
// stamps not included
function clean_log(text) {
  return log(text + colors.Reset, false, false);
}

//* Error Log
function error_log(text) {
  return log(colors.FgRed + "[ERROR] " + colors.Dim + text + colors.Reset)
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
  colors
}