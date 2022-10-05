const fs = require('fs');
const misc = require('./misc');

async function handleError(e) {
  console.log("ERROR HANDLING");

  let emsg = misc.getDateString() + " " + misc.getTimeString() + "\n"

  if (e.message) { emsg += e.message + "\n" }
  try {emsg += "\n" + e + "\n"}
  catch (e) {}

  if (e.Data) { emsg += e.Data + "\n"}

  fs.writeFileSync('lasterror', emsg)
}

module.exports = {handleError}