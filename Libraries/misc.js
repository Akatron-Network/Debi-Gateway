
//* Get the body from request
// Returns JSON

//. when its get request it gives query as body
function reqBody(req) {
  var method = req.method

  if (method === 'GET') { 
    if (req.query.body) { return JSON.parse(req.query.body) }
    else if (Object.keys(req.query).length > 0) { return req.query }
   }
  return req.body
}



//* Gives the timestamp in seconds
// Returns integer
function getTimestamp () {
  return (Date.now() / 1000)
}


//* Gives Date as yyyy-mm-dd
// Returns string
function getDateString () {
  var now = new Date();
  var dd = String(now.getDate()).padStart(2, '0');
  var mm = String(now.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = now.getFullYear();

  return yyyy + "-" + mm + "-" + dd
}


//* Control the body keys
// Returns [state, data]
function controlBody(body = {}, required_keys, forbidden_keys) {
  for (var r in required_keys) {
    var req_key = required_keys[r]
    if (!Object.keys(body).includes(req_key)) {
      return [false, req_key + " not found in request body!"]
    }
  }
  for (var f in forbidden_keys) {
    var forb_key = forbidden_keys[f]
    if (Object.keys(body).includes(forb_key)) {
      return [false, forb_key + " can not be used in request body!"]
    }
  }
  return [true]
}



//* Gives Time as hh:mm:ss
// Returns string
function getTimeString () {
  var now = new Date();
  var hour = String(now.getHours()).padStart(2, '0')
  var min = String(now.getMinutes()).padStart(2, '0')
  var sec = String(now.getSeconds()).padStart(2, '0')

  return hour + ":" + min + ":" + sec
}

//* Gives The Memory Size of an Object
//. Returns float as kilobytes
function roughSizeOfObject (object) {

  var objectList = [];
  var stack = [ object ];
  var bytes = 0;

  while ( stack.length ) {
      var value = stack.pop();

      if ( typeof value === 'boolean' ) {
          bytes += 4;
      }
      else if ( typeof value === 'string' ) {
          bytes += value.length * 2;
      }
      else if ( typeof value === 'number' ) {
          bytes += 8;
      }
      else if
      (
          typeof value === 'object'
          && objectList.indexOf( value ) === -1
      )
      {
          objectList.push( value );

          for( var i in value ) {
              stack.push( value[ i ] );
          }
      }
  }
  return (bytes / 1024);
}


function sizeOfJson(obj = {}) {
  return (Buffer.byteLength(JSON.stringify(obj), "utf8") / 1024)
}


//* Gives a random alias
function getAlias(notinclude = []) {
  var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  var alias = 'A'
  var index = 1
  var secindex = 0

  while (notinclude.includes(alias)) {
    alias = alphabet[index]

    if (index >= alphabet.length) {
      alias = alphabet[index] + alphabet[secindex]
      secindex++
    }

    index++
  }

  return alias
}

//* Sort the array of jsons by key
function arraySortByKey(array, key) {
 return array.sort(function(a, b)
 {
  var x = a[key]; var y = b[key];
  return ((x < y) ? -1 : ((x > y) ? 1 : 0));
 });
}

//* DESC Sort the array of jsons by key
function descArraySortByKey(array, key) {
  return array.sort(function(a, b)
  {
   var x = a[key]; var y = b[key];
   return ((x > y) ? -1 : ((x < y) ? 1 : 0));
  });
}


//* Control an object is array
//  Returns boolean
function isArray(object) {
  return object.constructor === [].constructor
}

//* Control an object is JSON
//  Returns boolean
function isJson(object) {
  return object.constructor === ({}).constructor
}


module.exports = {
  reqBody,
  controlBody,
  getTimestamp,
  getDateString,
  getTimeString,
  roughSizeOfObject,
  sizeOfJson,
  getAlias,
  arraySortByKey,
  descArraySortByKey,
  isArray,
  isJson,
}