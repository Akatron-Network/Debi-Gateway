const FunctionConstructor = require('./Functions/constructor');

function construct(app) {

  FunctionConstructor.construct_functions();
  FunctionConstructor.construct_routes(app);
}


module.exports = {
  construct
}