const sql = require('mssql')
const cnsl = require('../Libraries/console');
const misc = require('../Libraries/misc');
const DBTranslate = require('../Requests/translate').DBTranslate;

//* Microsoft SQL Server Connector
//. Example use:
//.
//. var sqlconfig = {
//.   user: '',
//.   password: '',
//.   database: '',
//.   server: '',
//   pool: {
//     max: 10,
//     min: 0,
//     idleTimeoutMillis: 30000
//   },
//.   options: {
//.     encrypt: false, // for azure
//.     trustServerCertificate: false // change to true for local dev / self-signed certs
//.   }
//. }
//. var mssqladap = new MssqlAdapter(sqlconfig)

class ConnectorMSSQL {
  
  //. Construct the class
  constructor(collection, sqlConfig) {
    this.collection = collection
    this.sqlConfig = this.fixconfig(sqlConfig)

    //todo Change collection variable to db scheme id
  }

  fixconfig(sqlConfig) {
    if (sqlConfig.options.encrypt) {
      if (typeof(sqlConfig.options.encrypt) == 'string') {
        sqlConfig.options.encrypt = (sqlConfig.options.encrypt == 'true') ? true : false;
      }
    }
    if (sqlConfig.options.trustServerCertificate) {
      if (typeof(sqlConfig.options.trustServerCertificate) == 'string') {
        sqlConfig.options.trustServerCertificate = (sqlConfig.options.trustServerCertificate == 'true') ? true : false;
      }
    }
    return sqlConfig
  }

  //. Connect to the database
  async connect() { return sql.connect(this.sqlConfig) }

  //. Disconnect
  async disconnect() { return sql.close() }

  //* Run a query
  //. Returns [state, answer/error]
  async query(tsql) {    
    try {
      await this.connect()
      var res = await sql.query(tsql)
      this.disconnect()
    }
    catch (e) {
      cnsl.error_log("T-SQL:\n" + tsql)
      throw e
    }
    return [true, res]
  }


  //* Execute directly from json query
  async execute(qjson) {
    var tsql = this.query_build(qjson)
    var ans = await this.query(tsql)
    
    //* Fix the recordset tag
    if (ans[0]) {
      //. Fix wrong chars in strings
      let fixedrecords = ans[1].recordset
      for (let r of fixedrecords) {
        for (let e of Object.keys(r)) { r[e] = this.langfix(r[e]) }
      }
      
      return [ans[0], ans[1].recordset]
    }
    else { return ans }
  }

  //* Language fixer for NETSIS
  langfix(str) {
    if (typeof(str) !== 'string') { return str }
    return str
      .replaceAll("Ý", "İ")
      .replaceAll("Þ", "Ş")
      .replaceAll("Ð", "Ğ")
      .replaceAll("ý", "ı")
  }

  //* Query Builder
  /*
. Query Json Example
  {
    table: "TBLCAHAR",
    select: {
      "CARI_KOD": true,
      "ALACAK": "SUM",
      "BORC": "SUM",
      "{Bakiye}": "ALACAK - BORC"
    },
    "where": {
      "AND": [
        { "RAPOR_KODU5": { "equals": "BURSA" } },
        { "OR": [ 
          { "CARI_IL": { "not": "BURSA"} }, 
          { "CARI_IL": { "not": "IZMIR" } } 
        ]}
      ]
    },
*   Easy to use where conditions  //! (if used where_plan, where is dismissed)
    "where_plain": [
      { "RAPOR_KODU5": { "equals": "BURSA" } },
      "OR",
      { "RAPOR_KODU5": { "equals": "BURSA" } },
      "AND",
      { "RAPOR_KODU5": { "equals": "BURSA" } }
    ],
*   --------------------------------------------
    includes: [
      {
        "table": "TBLCASABIT",
        "type": "INNER",
        "on": {
          "CARI_KOD": "CARI_KOD"
        },
        "select": {
          "CARI_ISIM": true
        },
        "where": {
          "AND": [
            { "TARIH": { "bte": "2022-09-01" } }
          ]
        }
      },
      {
        "table": "TBLCASABITEK",
        "type": "INNER",
        "on": {
          "CARI_KOD": "CARI_KOD"
        },
        "select": {
          "TCKIMLIKNO": true
        }
      }
    ],
    order: {
      "CARI_KOD": "ASC"
    },
    limit: 100,
    offset: 0,
  }
  . Returns string
  */
  query_build(qjson) {
    // Create aliases for tables
    qjson = this.query_alias_generator(qjson)

    var select = []
    var groupby = []
    var where = []

    //* Generate select section
    if (qjson.select && Object.keys(qjson.select).length > 0) {
      for (var s in qjson.select) {               //* Main table's columns (loop the select list)
        if (qjson.select[s] === true) {           // if selecting directly: select: { 'CARI_KOD': true }
          select.push(qjson.alias + "." + s)      // add to select list: 'A.CARI_KOD'
          groupby.push(qjson.alias + "." + s)     // add to group by list: 'A.CARI_KOD'
        }
        else if (s.startsWith("{") && s.endsWith("}")) {                    // if custom select: select: { '{NET}': 'SUM(B.BORC) - SUM(B.ALACAK)' }
          let customcol = s.substring(1, s.length - 1)                      // add directly to: '(SUM(B.BORC) - SUM(B.ALACAK)) as NET'
          select.push("(" + qjson.select[s] + ") AS " + customcol)
        }
        else {                                                              // if not selecting directly: select: { 'BORC': 'SUM' }
          select.push(                                                      // add to select list: 'SUM(A.CARI_KOD) AS CARI_KOD_SUM'
            qjson.select[s] + "(" + qjson.alias + "." + s + ")" + 
            " AS " + s + "_" + qjson.select[s]
          )
        }
      }
      
      for (var ic in qjson.includes) {                   //* Including columns (loop the includes list)
        if (!qjson.includes[ic].select) { continue; }    // if there is no select, pass

        for (var ics in qjson.includes[ic].select) {    // loop the selects in includes
          var icselm = qjson.includes[ic].select[ics]   // The value in include's select { "select": { "CARI_ISIM": true } } icselm = true
          
          if (icselm === true) {                                  // if selecting directly: select: { 'CARI_KOD': true }
            select.push(qjson.includes[ic].alias + "." + ics)     // add to select list: 'A.CARI_KOD'
            groupby.push(qjson.includes[ic].alias + "." + ics)    // add to group by list: 'A.CARI_KOD'
          }
          else if (ics.startsWith("{") && ics.endsWith("}")) {                    // if custom select: select: { '{NET}': 'SUM(B.BORC) - SUM(B.ALACAK)' }
            let customcol = ics.substring(1, ics.length - 1)                      // add directly to: '(SUM(B.BORC) - SUM(B.ALACAK)) as NET'
            select.push("(" + icselm + ") AS " + customcol)
          }
          else {                                                                      // if not selecting directly: select: { 'BORC': 'SUM' }
            select.push(                                                              // add to select list: 'SUM(A.CARI_KOD) AS CARI_KOD_SUM'
              icselm + "(" + qjson.includes[ic].alias + "." + ics + 
              ") AS " + ics + "_" + icselm
            )
          }
        }
      }
    }
    else select.push('*')

    if (qjson.where_plain && qjson.where_plain.length > 0) { where.push(this.plain_operator_build(qjson.where_plain, qjson.alias)); console.log(this.plain_operator_build(qjson.where_plain, qjson.alias)); }
    else if (qjson.where) { where.push(this.operator_build(qjson.where, qjson.alias)) }

    var from = qjson.table + " " + qjson.alias

    var joins = []

    if (qjson.includes) {
      for (var ic in qjson.includes) {
        var ict = qjson.includes[ic]
        var joinstr = ict.type + " JOIN " + ict.table + " " + ict.alias + " ON "
        
        var conds = []
        for (var n in ict.on) {
          conds.push(qjson.alias + "." + n + " = " + ict.alias + "." + ict.on[n])
        }

        joinstr += conds.join(' AND ')

        if (ict.where_plain && ict.where_plain.length > 0) { 
          try { where.push(this.plain_operator_build(ict.where_plain, ict.alias)) }
          catch (e) { console.error(e) }
        }
        else if (ict.where) { where.push(this.operator_build(ict.where, ict.alias)) }


        joins.push(joinstr)
      }
    }

    var order = []
    
    if (qjson.order) {
      for (var col in qjson.order) {
        var fullCollName = ''

        for (var s in qjson.select) { 
          if (col === s) { 
            if (qjson.select[s] === true) { fullCollName = qjson.alias + "." + col }
            else { fullCollName = qjson.select[s] + "(" + qjson.alias + "." + col + ")" }
            break; 
          } 
        }
        for (var ic in qjson.includes) {
          for (var ics in qjson.includes[ic].select) { 
            if (col === ics) {
              if (qjson.includes[ic].select[ics] === true) { fullCollName = qjson.includes[ic].alias + "." + col }
              else { fullCollName = qjson.includes[ic].select[ics] + "(" + qjson.includes[ic].alias + "." + col + ")" }
              break; 
            } 
          }
        }

        order.push(fullCollName + " " + qjson.order[col])

      }
    }

    if (order.length === 0) { order.push(select[0].substring(select[0].indexOf('AS') + 3) + " ASC") }

    var tab = "    "
    var qstr =  "SELECT \n" + tab + select.join(', \n' + tab) + " \n"
      qstr += "FROM " + from + "\n" + tab + joins.join(' \n' + tab) + " \n"
      qstr += (where.length > 0) ? " WHERE \n" + tab + where.join(" AND \n" + tab) + " \n" : ""
      qstr += "GROUP BY \n" + tab + groupby.join(', \n' + tab) + " \n"
      qstr += "ORDER BY \n" + tab + order.join(', \n' + tab) + " \n"
      qstr += "OFFSET " + ((qjson.offset) ? qjson.offset : 0) + " ROWS \n"
      qstr += "FETCH FIRST " + ((qjson.limit) ? qjson.limit : 200) + " ROWS ONLY"

    return qstr
  }

  //* Create alias for tables
  query_alias_generator(qjson) {
    var aliaslist = []
    if (qjson.alias) { aliaslist.push(qjson.alias) }
    else { 
      qjson.alias = misc.getAlias(aliaslist); 
      aliaslist.push(qjson.alias);
    }

    if (qjson.includes) {
      for (var ic in qjson.includes) {
        if (qjson.includes[ic].alias) { aliaslist.push(qjson.includes[ic].alias) }
        else {
          qjson.includes[ic].alias = misc.getAlias(aliaslist)
          aliaslist.push(qjson.includes[ic].alias)
        }
      }
    }

    return qjson
  }

  //* Root operators build
  //. object = {
  //.   "AND": [
  //.     { "RAPOR_KODU5": { "equals": "BURSA" } },
  //.     { "OR": [ 
  //.         { "CARI_IL": { "not": "BURSA"} }, 
  //.         { "CARI_IL": { "not": "IZMIR" } } 
  //.       ] 
  //.     }
  //.   ],
  //.   "OR" [
  //.     { "CARI_IL": { "not": "ANKARA"} },
  //.     { "CARI_IL": { "not": "KONYA"} }
  //.   ]
  //. }
  // Example Return: '(RAPOR_KODU5 = BURSA AND (CARI_IL != BURSA OR CARI_IL != IZMIR)) AND (CARI_IL != ANKARA OR CARI_IL != KONYA)'
  operator_build(object, alias) {
    var general_conditions = []
    
    for (var op in object) {    // Loop for first keys (Just OR, AND)
      var o_list = []           // Their list

      for (var n in object[op]) {           // Get inside of the object
        var obj = object[op][n]             // Get the object
        var fk_obj = Object.keys(obj)[0]    // Get the first key

        if (fk_obj === 'AND' || fk_obj === 'OR') {    // is first key AND OR 
          o_list.push(this.operator_build(obj, alias))       // then call itself
        }
        else {                                        // is the object condition
          o_list.push(this.condition_build(obj, alias))      // generate the condition string
        }

      }
      general_conditions.push("(" + o_list.join(" " + op + " ") + ")")    // join the conditions with operator
    }

    return general_conditions.join(' AND ')     // connect all operators with AND
  }

  //* Plain operators build
  plain_operator_build(object, alias) {
    var general_conditions = []

    for (var op of object) {
      if (typeof(op) === 'string') {
        general_conditions.push(op)
      }
      else if (typeof(op) === 'object') {
        if (Object.keys(op) === 0) { continue; }
        general_conditions.push(this.condition_build(op, alias))
      }
    }

    return general_conditions.join(' ')
  }


  //* Single condition builder
  // Returns string
  //. Example object: { "CARI_IL": { "not": "BURSA"} }
  //. Example return: CARI_IL != 'BURSA'
  condition_build(object, alias) {
    let key = Object.keys(object)[0]
    const operant = Object.keys(object[key])[0]
    const val = object[key][operant]

    if (alias) {
      key = alias + "." + key
    }

    return key + " " + this.operant_dictionary[operant] + " '" + val + "'"
  }

  //* Operant dictionary
  operant_dictionary = {
    "equals": "=",
    "not": "!=",
    "bt": ">",
    "bte": ">=",
    "lt": "<",
    "lte": "<=",
    "like": "LIKE"
  }


  //-- Database Based Functions

  //* Get all tables in database
  //. Returns Array
  //  Views, columns and relations can be included
  //! including columns and relations may cause long time to execute
  async get_tables(views = false, columns = false, relations = false) {
    let tables_sql = "SELECT TABLE_NAME as table_id, TABLE_TYPE as type FROM INFORMATION_SCHEMA.TABLES"
    if (!views) { tables_sql += " WHERE TABLE_TYPE != 'VIEW'"}
    tables_sql += " ORDER BY TABLE_TYPE, TABLE_NAME"

    var tables_list = await this.query(tables_sql)
    if (!tables_list[0]) { throw tables_list[1] }
    
    tables_list = tables_list[1].recordset

    var translate_list = []
    if (this.collection.db_scheme_id) { 
      translate_list = await DBTranslate.get_complete_translations(this.collection.db_scheme_id)
    }

    for (var t = 0; t < tables_list.length; t++) {

      tables_list[t].table = tables_list[t].table_id
      delete tables_list[t].table_id

      var trnsl_table = await DBTranslate.find_from_translate_list(translate_list, tables_list[t].table)

      tables_list[t] = {
        ...tables_list[t],
        name: trnsl_table.name,
        details: trnsl_table.details,
        category: trnsl_table.category,
        priority: trnsl_table.priority ? trnsl_table.priority : 0
      }

      if (columns) {
        var colls = await this.get_table_columns(tables_list[t].table, translate_list)
        tables_list[t] = {
          ...tables_list[t],
          columns: colls
        }
      }

      if (relations && tables_list[t].type === 'BASE TABLE') {
        const rel_inner = await this.get_relations(tables_list[t].table, true, translate_list)
        const rel_outer = await this.get_relations(tables_list[t].table, false, translate_list)
        tables_list[t] = {
          ...tables_list[t],
          relations: {
            inner: rel_inner,
            outer: rel_outer
          }
        }
      }
    }

    return misc.descArraySortByKey(tables_list, 'priority')

    
  }


  //-- Table Based Functions

  //* Get table's detailed information
  //. Returns JSON
  //  columns and relations can be included
  async get_table_info(tablename, columns = true, relations = false) {
    
    var translate_list = []

    if (this.collection.db_scheme_id) { 
      translate_list = await DBTranslate.get_complete_translations(this.collection.db_scheme_id)
    }

    var trnsl_table = await DBTranslate.find_from_translate_list(translate_list, tablename)

    var rels = undefined

    if (relations) {
      const rel_inner = await this.get_relations(tablename, true, translate_list)
      const rel_outer = await this.get_relations(tablename, false, translate_list)

      rels = {
        inner: rel_inner,
        outer: rel_outer
      }
    }

    var source_colls = undefined

    if (columns) {
      source_colls = await this.get_table_columns(tablename, translate_list)
    }

    let source_table = {
      table: tablename,
      name: trnsl_table.name,
      details: trnsl_table.details,
      category: trnsl_table.category,
      priority: trnsl_table.priority ? trnsl_table.priority : 0
    }

    return {
      source_table: {...source_table, columns: source_colls},
      relations: rels
    }

  }

  //* Get specified table's columns 
  //. Returns Array
  async get_table_columns(tablename, translate_list = []) {
    const columns_sql = [
      "SELECT COLUMN_NAME as name, DATA_TYPE as type,",
      "	(CASE WHEN ",
      "		(SELECT TOP 1 OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey')",
      "			FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ",
      "			WHERE ku.TABLE_NAME = cl.TABLE_NAME AND ku.COLUMN_NAME = cl.COLUMN_NAME", 
      "     ORDER BY OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey') DESC) = 1",
      "	THEN 1 ELSE 0 END) as primary_key",
      "FROM INFORMATION_SCHEMA.COLUMNS cl WHERE TABLE_NAME = '" + tablename + "'"
    ]

    var columns_resp = await this.query(columns_sql.join("\n"))

    if (!columns_resp[0]) { throw columns_resp[1] }

    var cols = columns_resp[1].recordset

    for (var c = 0; c < cols.length; c++) {
      var trnsl_col = await DBTranslate.find_from_translate_list(translate_list, tablename, cols[c].name)

      cols[c] = {
        ...cols[c],
        details: trnsl_col.details,
        priority: trnsl_col.priority ? trnsl_col.priority : 0
      }
    }

    return columns_resp[1].recordset

  }

  //* Get specified table's inner or outer relations
  //. Returns Array
  async get_relations(tablename, inner = true, translate_list = []) {    
    const relation_sql = [
      "SELECT",
      "    f.name AS foreign_key_name,",
      "   OBJECT_NAME(f.parent_object_id) AS table_name,",
      "   COL_NAME(fc.parent_object_id, fc.parent_column_id) AS constraint_column_name,",
      "   (CASE WHEN ",
      "		(SELECT SUM(OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey'))",
      "			FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ",
      "			WHERE ku.TABLE_NAME = OBJECT_NAME(f.parent_object_id) AND ku.COLUMN_NAME = COL_NAME(fc.parent_object_id, fc.parent_column_id)) = 1",
      "	  THEN 1 ELSE 0 END) as constcol_isPK,",
      "   OBJECT_NAME (f.referenced_object_id) AS referenced_object,",
      "   COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS referenced_column_name,",
      "   (CASE WHEN ",
      "		(SELECT SUM(OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey'))",
      "			FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ",
      "			WHERE ku.TABLE_NAME = OBJECT_NAME (f.referenced_object_id) AND ku.COLUMN_NAME = COL_NAME(fc.referenced_object_id, fc.referenced_column_id)) = 1",
      "		THEN 1 ELSE 0 END) as refcol_isPK,",
      "   f.is_disabled, f.is_not_trusted,",
      "   f.delete_referential_action_desc,",
      "   f.update_referential_action_desc",
      "FROM sys.foreign_keys AS f",
      "   INNER JOIN sys.foreign_key_columns AS fc ON f.object_id = fc.constraint_object_id"]

      const relation_view = "(" + relation_sql.join("\n") + ") RV"

      //-- INNER TABLES --
      if (inner) {
        const inner_rel_sql = "SELECT * FROM " + relation_view + " WHERE RV.table_name = '" + tablename + "'"
        const inner_rel_resp = await this.query(inner_rel_sql) 

        if (!inner_rel_resp[0]) { throw inner_rel_resp[1] }

        var inner_rels = inner_rel_resp[1].recordset
        var inner_tables = []

        for (let ir = 0; ir < inner_rels.length; ir++) {
          var elm = inner_rels[ir]

          var trnsl_table = await DBTranslate.find_from_translate_list(translate_list, elm.referenced_object)

          var elm_to_push = {
            "table": elm.referenced_object,
            "relation_definition": {
              "source_column": elm.constraint_column_name,
              "referenced_column": elm.referenced_column_name,
              "single_record": (elm.refcol_isPK === 1)
            },
            name: trnsl_table.name,
            details: trnsl_table.details,
            category: trnsl_table.category,
            priority: trnsl_table.priority ? trnsl_table.priority : 0
          }

          inner_tables.push(elm_to_push)

        }

        return inner_tables
      }

      //-- OUTER TABLES --
      else {
        const outer_rel_sql = "SELECT * FROM " + relation_view + " WHERE RV.referenced_object = '" + tablename + "'"
        const outer_rel_resp = await this.query(outer_rel_sql) 

        if (!outer_rel_resp[0]) { throw outer_rel_resp[1] }

        var outer_rels = outer_rel_resp[1].recordset
        var outer_tables = []

        for (let or = 0; or < outer_rels.length; or++) {
          var elm = outer_rels[or]

          var trnsl_table = await DBTranslate.find_from_translate_list(translate_list, elm.table_name)

          var elm_to_push = {
            "table": elm.table_name,
            "relation_definition": {
              "source_column": elm.constraint_column_name,
              "referenced_column": elm.referenced_column_name,
              "single_record": (elm.constcol_isPK === 1)
            },
            name: trnsl_table.name,
            details: trnsl_table.details,
            category: trnsl_table.category,
            priority: trnsl_table.priority ? trnsl_table.priority : 0
          }


          outer_tables.push(elm_to_push)

        }

        return outer_tables
      }
      
  }


}


const connector_module = {
  "name": "Microsoft SQL Server Connector",
  "connector_type": "MSSQL",
  "class": ConnectorMSSQL
}



module.exports = {connector_module}