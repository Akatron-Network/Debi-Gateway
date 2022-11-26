const misc = require('../Libraries/misc');
const cnsl = require('../Libraries/console');

//* Success response
//. Example Use:
//. return resp_success(res) // without any data
//. return resp_success(res, {'aa': 'b'}) // with data
//. return resp_success(res, {'aa': 'b'}, 404) // with status code
function resp_success (res, data, extra = undefined, status = 200) {
  return resp(res, true, data, status, extra)
}


//* Error response
//. Example Use:
//. return resp_error(res) // without any data
//. return resp_error(res, {'aa': 'b'}) // with data
//. return resp_error(res, {'aa': 'b'}, 404) // with status code
function resp_error (res, data, extra = undefined, status = 406) {
  return resp(res, false, data, status, extra)
}


//* Answer response
//. Example use:
//. return resp_ans(res, [false, "error details"])
function resp_answ (res, ans) {
  if (ans[0]) { return resp_success(res, ans[1]) }
  else { return resp_error(res, ans[1]) }
}



//* General response
function resp (res, succ, data, status, extra = undefined) {
  // Calculate the size of data
  if (data) { cnsl.resp_log(cnsl.colors.FgGreen + "Response: (" + misc.sizeOfJson(data).toFixed(2) + " KB) " + cnsl.colors.Dim + JSON.stringify(data).substring(0,50) + "...") }

  if (data === undefined) {
    return res.status(status).json( {"Success": succ, ...extra} )
  }
  else {
    return res.status(status).json( {"Success": succ, ...extra, "Data": data} )
  }
}


module.exports = {
  resp_success,
  resp_error,
  resp_answ,
  resp
}