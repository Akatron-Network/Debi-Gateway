const FunctionConstructor = require('./Functions/constructor');
const ConnectorConstructor = require('./Connectors/constructor');

function construct(app) {

  FunctionConstructor.construct_functions();
  FunctionConstructor.construct_routes(app);
  ConnectorConstructor.construct_connectors();
}


module.exports = {
  construct
}