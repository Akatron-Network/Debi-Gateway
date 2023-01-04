const sql = require('mssql')
const fs = require('fs');
const cnsl = require('../Libraries/console');
const misc = require('../Libraries/misc');
const {get_model} = require('../Requests/data_model');
const {get_union} = require('../Requests/data_union');
const DBTranslate = require('../Requests/translate').DBTranslate;

/* //-- Microsoft SQL Server Connector

. Example use:
.
. var sqlconfig = {
.   user: '',
.   password: '',
.   database: '',
.   server: '',
_   pool: {
_     max: 10,
_     min: 0,
_     idleTimeoutMillis: 30000
_   },
.   options: {
.     encrypt: false, // for azure
.     trustServerCertificate: false // change to true for local dev / self-signed certs
.   }
. }

. var connector = new ConnectorMSSQL(collection_id, sqlconfig)
*/

class ConnectorMSSQL {
  
  //* Construct the class
  constructor(collection, sqlConfig) {
    this.collection = collection
    this.sqlConfig = this.fixconfig(sqlConfig)
    if (this.collection.collection_id) this.sync_path = require('path').join(__dirname, '../Functions/data/explorer_syncs/'+ this.collection.collection_id.toString() + ".json")
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

  //* Connect to the database
  async connect() { return sql.connect(this.sqlConfig) }

  //* Disconnect
  async disconnect() { return sql.close() }

/* //* Run a query
  . Returns [state, answer/error] */
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
    return res
  }



  //---- Executioners ----//

/* //* Execute directly from json query
  .   qjson:    query builder's query
  .   columns:  ['COL1', 'COL2'] */
  async execute(qjson, columns, extra_conditions, extra_order) {
    var source = this.query_build(qjson)
    var cols = (columns) ? columns.join(', ') : "*"
    var conds = (extra_conditions) ? ("\nWHERE " + this.plain_operator_build(extra_conditions)) : ""
    var order = ""
    if (extra_order) {
      let orderlist = []
      for (let ord of Object.keys(extra_order)) orderlist.push(ord + " " + extra_order[ord])
      order = "\nORDER BY " + orderlist.join(', ')
    }

    var tsql = "SELECT " + cols + " FROM (" + source + ") AKA " + conds + order

    //. Get Response from db
    var ans = await this.query(tsql)
    
    //. Fix wrong chars in strings
    let fixedrecords = ans.recordset
    for (let r of fixedrecords) for (let e of Object.keys(r)) { r[e] = this.langfix(r[e]) }

    return [true, fixedrecords]
  }

/* //* Execute directly from union object
  .   union:  union data */
  async raw_union_execute(union) {
    let tsql = await this.union_query_build(union)

    //. Get Response from db
    var ans = await this.query(tsql)
    
    //. Fix wrong chars in strings
    let fixedrecords = ans.recordset
    for (let r of fixedrecords) for (let e of Object.keys(r)) { r[e] = this.langfix(r[e]) }

    return [true, fixedrecords]
  }

/* //* Execute from model
  .   model_id:   saved model's id
  .   columns:    ['COL1', 'COL2'] */
  async model_execute(model_id, columns, extra_conditions, extra_order) {
    var modeldata = await get_model(model_id)
    var qjson = modeldata.query
    return await this.execute(qjson, columns, extra_conditions, extra_order)
  }

/* //* Execute from union
  .   union_id:   saved union's id */
  async union_execute(union_id, columns, extra_conditions, extra_order) {
    var uniondata = await get_union(union_id)
    var source = await this.union_query_build(uniondata)

    var cols = (columns) ? columns.join(', ') : "*"
    var conds = (extra_conditions) ? ("\nWHERE " + this.plain_operator_build(extra_conditions)) : ""
    var order = ""
    if (extra_order) {
      let orderlist = []
      for (let ord of Object.keys(extra_order)) orderlist.push(ord + " " + extra_order[ord])
      order = "\nORDER BY " + orderlist.join(', ')
    }
    
    var tsql = "SELECT " + cols + " FROM (" + source + ") AKA " + conds + order

    //. Get Response from db
    var ans = await this.query(tsql)
    
    //. Fix wrong chars in strings
    let fixedrecords = ans.recordset
    for (let r of fixedrecords) for (let e of Object.keys(r)) { r[e] = this.langfix(r[e]) }

    return [true, fixedrecords]
  }


  //---- Query Builders ----//

/* //* Union Query Builder
  . ujson: {
  .   "columns": []
  .     "Cari_Kod",
  .     "Cari_Isim"
  .   ],
  .   "childs": [
  .     {
  .       "union_child_id": 4,
  .       "union_id": 3,
  .       "child_id": 20,
  .       "child_type": "model",
  .       "child_name": "IZMIR SUBE",
  .       "columns": [
  .         "CARI_KOD",
  .         "CARI_ISIM"
  .       ]
  .     },
  .     {
  .       "union_child_id": 5,
  .       "union_id": 3,
  .       "child_id": 21,
  .       "child_type": "model",
  .       "child_name": "MANISA SUBE",
  .       "columns": [
  .         "CARI_KOD",
  .         "CARI_ISIM"
  .       ]
  .     }
  .   ]
  . }
*/
  async union_query_build(ujson) {
    let query_list = []                               //. list of queries
    let main_columns = ujson.columns     //. list of main columns

    for (let child of ujson.childs) {                                             //? Loop for childs

      if (child.columns.length !== main_columns.length) {                         //! error: columns length not match
        throw "Union column count is not match this child: " + child.child_name   //. throw the error
      }

      let alt_query = ""

      if (child.child_type === "model") {                                           //? child is model
        let modeldata = await get_model(child.child_id)   //. Get the model's data
        let qjson = modeldata.query                                                 //. Get the model's query

        alt_query = this.query_build(qjson)                         //. push to the main list of queries
      }

      if (child.child_type === "union") {                                                           //? child is union
        var childunion = await get_union(child.child_id)  //. Get the union data
        alt_query = await this.union_query_build(childunion)                                        //. call itself to get query
      }

      let selection = []
      for (let c in child.columns) {
        selection.push(child.columns[c] + " AS " + main_columns[c])
      }

      let query =                                           //. create a query for selected coluns
        "SELECT '" + child.child_name + "' as CATEGORY, " +
        selection.join(', ') + 
        " FROM (" + alt_query + ") " + 
        child.child_name.replaceAll(' ', '_')

      query_list.push(query)   

    }

    return query_list.join('\n\nUNION ALL\n\n')
  }
  

/* Query Builder
  . Query Json Example
  {
    table: "TBLCAHAR",
    select: {
      "CARI_KOD": true,
      "ALACAK": "SUM",
      "BORC": "SUM",
      "{Bakiye}": "ALACAK - BORC",
      "GRUP_ISIM|RAPOR_KODU1": true,
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
      for (var s in qjson.select) {                                 //* Main table's columns (loop the select list)
        if (qjson.select[s] === true) {                             //? if selecting directly: select: { 'CARI_KOD': true }

          if (s.includes('|')) {                                    //? if renamed column
            let col = s.substring(0, s.indexOf('|'))                // get col name
            let alias = s.substring(s.indexOf('|') + 1)             // get alias
            select.push(qjson.alias + "." + col + " AS " + alias)   // send select list
            groupby.push(qjson.alias + "." + col)                   // add to group by list: 'A.CARI_KOD'
          }
          else {
            select.push(qjson.alias + "." + s)                      // add to select list: 'A.CARI_KOD'
            groupby.push(qjson.alias + "." + s)                     // add to group by list: 'A.CARI_KOD'
          }

        }
        else if (s.startsWith("{") && s.endsWith("}")) {            //? if custom select: select: { '{NET}': 'SUM(B.BORC) - SUM(B.ALACAK)' }
          let customcol = s.substring(1, s.length - 1)              // add directly to: '(SUM(B.BORC) - SUM(B.ALACAK)) as NET'
          select.push("(" + qjson.select[s] + ") AS " + customcol)

          if (qjson.select[s].includes('DATEPART')) {               //? if custom col is datepart
            groupby.push(qjson.select[s])                           // add it to groupby array
          }
        }

        else {                                                      //? if not selecting directly: select: { 'BORC': 'SUM' }
          if (s.includes('|')) {                                    //? if renamed column
            let col = s.substring(0, s.indexOf('|'))                // get col name
            let alias = s.substring(s.indexOf('|') + 1)             // get alias
            select.push(                                            // add to select list: 'SUM(A.CARI_KOD) AS CARI_KOD_SUM'
              qjson.select[s] + "(" + qjson.alias + "." + col + ")" + 
              " AS " + alias
            )
          }
          else {
            select.push(                                              // add to select list: 'SUM(A.CARI_KOD) AS CARI_KOD_SUM'
              qjson.select[s] + "(" + qjson.alias + "." + s + ")" + 
              " AS " + s + "_" + qjson.select[s]
            )
          }
        }
      }
      
      for (var ic in qjson.includes) {                              //* Including columns (loop the includes list)
        let inc_obj = qjson.includes[ic]
        if (!inc_obj.select) { continue; }                          //? if there is no select, pass

        for (var ics in inc_obj.select) {                           // loop the selects in includes
          var icselm = inc_obj.select[ics]                          // The value in include's select { "select": { "CARI_ISIM": true } } icselm = true
          
          if (icselm === true) {                                        //? if selecting directly: select: { 'CARI_KOD': true }
            if (ics.includes('|')) {                                    //? if renamed column
              let col = ics.substring(0, ics.indexOf('|'))                // get col name
              let alias = ics.substring(ics.indexOf('|') + 1)             // get alias
              select.push(inc_obj.alias + "." + col + " AS " + alias)     // send select list
              groupby.push(inc_obj.alias + "." + col)                     // add to group by list: 'A.CARI_KOD'
            }
            else {
              select.push(inc_obj.alias + "." + ics)                // add to select list: 'A.CARI_KOD'
              groupby.push(inc_obj.alias + "." + ics)               // add to group by list: 'A.CARI_KOD'
            }
          }
          else if (ics.startsWith("{") && ics.endsWith("}")) {      //? if custom select: select: { '{NET}': 'SUM(B.BORC) - SUM(B.ALACAK)' }
            let customcol = ics.substring(1, ics.length - 1)        // add directly to: '(SUM(B.BORC) - SUM(B.ALACAK)) as NET'
            select.push("(" + icselm + ") AS " + customcol)

            if (icselm.includes('DATEPART')) {                      //? if custom col is datepart
              groupby.push(icselm)                                  // add it to groupby array
            }

          }
          else {                                                    //? if not selecting directly: select: { 'BORC': 'SUM' }
            if (ics.includes('|')) { 
              let col = ics.substring(0, ics.indexOf('|'))                // get col name
              let alias = ics.substring(ics.indexOf('|') + 1)             // get alias
              select.push(                                            // add to select list: 'SUM(A.CARI_KOD) AS ALIAS'
                icselm + "(" + inc_obj.alias + "." + col + 
                ") AS " + alias
              )
            }
            else {
              select.push(                                            // add to select list: 'SUM(A.CARI_KOD) AS CARI_KOD_SUM'
                icselm + "(" + inc_obj.alias + "." + ics + 
                ") AS " + ics + "_" + icselm
              )
            }
          }
        }
      }
    }
    else select.push('*')

    if (qjson.where_plain && qjson.where_plain.length > 0) { 
      where.push(this.plain_operator_build(qjson.where_plain, qjson.alias));
    }
    else if (qjson.where) { 
      where.push(this.operator_build(qjson.where, qjson.alias)) 
    }

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

    var tab = "    "
    var qstr =  "SELECT \n" + tab + select.join(', \n' + tab) + " \n"
      qstr += "FROM " + from + "\n" + tab + joins.join(' \n' + tab) + " \n"
      qstr += (where.length > 0) ? " WHERE \n" + tab + where.join(" AND \n" + tab) + " \n" : ""
      qstr += "GROUP BY \n" + tab + groupby.join(', \n' + tab) + " \n"

      if (order.length > 0) qstr += "ORDER BY \n" + tab + order.join(', \n' + tab) + " \n" 

      if (qjson.limit) {
        if (order.length === 0) { 
          if (select[0].includes(' AS')) {
            order.push(select[0].substring(0, select[0].indexOf(' AS')) + " ASC")
          }
          else { order.push(select[0] + " ASC") }
        }

        qstr += "ORDER BY \n" + tab + order.join(', \n' + tab) + " \n" 
        qstr += "OFFSET " + ((qjson.offset) ? qjson.offset : 0) + " ROWS \n"
        qstr += "FETCH FIRST " + qjson.limit + " ROWS ONLY"
      }

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

/* //* Root operators build
  . object = {
  .   "AND": [
  .     { "RAPOR_KODU5": { "equals": "BURSA" } },
  .     { "OR": [ 
  .         { "CARI_IL": { "not": "BURSA"} }, 
  .         { "CARI_IL": { "not": "IZMIR" } } 
  .       ] 
  .     }
  .   ],
  .   "OR" [
  .     { "CARI_IL": { "not": "ANKARA"} },
  .     { "CARI_IL": { "not": "KONYA"} }
  .   ]
  . }
  
  ? Example Return: 
  . '(RAPOR_KODU5 = BURSA AND (CARI_IL != BURSA OR CARI_IL != IZMIR)) AND (CARI_IL != ANKARA OR CARI_IL != KONYA)' */
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


/* //* Single condition builder
  ? Returns string
  . Example object: { "CARI_IL": { "not": "BURSA"} }
  . Example return: CARI_IL != 'BURSA' */
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


  //---- Database Based Functions ----//

/* //* Get all tables in database
  . Returns Array
    Views, columns and relations can be included
  ! including columns and relations may cause long time to execute */
  async get_tables(views = false, columns = false, relations = false) {

    var translate_list = []
    if (this.collection.db_scheme_id) { 
      translate_list = await DBTranslate.get_complete_translations(this.collection.db_scheme_id)
    }

    //* If has sync file
    if (fs.existsSync(this.sync_path)) {
      let tables_list = JSON.parse(fs.readFileSync(this.sync_path)).data
      let ret_tables = []

      for (let tbl of tables_list) {

        if (!views && tbl.type === 'VIEW') continue
        if (!columns) delete tbl.columns
        if (!relations) delete tbl.relations

        var trnsl_table = await DBTranslate.find_from_translate_list(translate_list, tbl.table)
        ret_tables.push({
          ...tbl,
          name: trnsl_table.name,
          details: trnsl_table.details,
          category: trnsl_table.category,
          priority: trnsl_table.priority ? trnsl_table.priority : 0
        })
      }

      return misc.descArraySortByKey(ret_tables, 'priority')
    }

    let tables_sql = "SELECT TABLE_NAME as table_id, TABLE_TYPE as type FROM INFORMATION_SCHEMA.TABLES"
    if (!views) { tables_sql += " WHERE TABLE_TYPE != 'VIEW'"}
    tables_sql += " ORDER BY TABLE_TYPE, TABLE_NAME"

    var tables_list = await this.query(tables_sql)
    
    tables_list = tables_list.recordset

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


  //---- Table Based Functions ----//

/* //* Get table's detailed information
  . Returns JSON
    columns and relations can be included */
  async get_table_info(tablename, columns = true, relations = false) {
    
    var translate_list = []

    if (this.collection.db_scheme_id) { 
      translate_list = await DBTranslate.get_complete_translations(this.collection.db_scheme_id)
    }

    var trnsl_table = await DBTranslate.find_from_translate_list(translate_list, tablename)

    //* If has sync file
    if (fs.existsSync(this.sync_path)) {
      let tables_list = JSON.parse(fs.readFileSync(this.sync_path)).data
      let ret_table = {}

      for (let tbl of tables_list) {
        if (tbl.table !== tablename) continue

        if (relations) {
          for (let irel of tbl.relations.inner) {
            let trnsl = await DBTranslate.find_from_translate_list(translate_list, irel.table)

            irel.name = trnsl.name
            irel.details = trnsl.details
            irel.category = trnsl.category
            irel.priority = trnsl.priority ? trnsl.priority : -3
          }
          for (let orel of tbl.relations.outer) {
            let trnsl = await DBTranslate.find_from_translate_list(translate_list, orel.table)

            orel.name = trnsl.name
            orel.details = trnsl.details
            orel.category = trnsl.category
            orel.priority = trnsl.priority ? trnsl.priority : -3
          }

          tbl.relations.inner = misc.descArraySortByKey(tbl.relations.inner, 'priority')
          tbl.relations.outer = misc.descArraySortByKey(tbl.relations.outer, 'priority')

        }

        ret_table.source_table = {
          table: tbl.table,
          type: tbl.type,
          name: trnsl_table.name,
          details: trnsl_table.details,
          category: trnsl_table.category,
          priority: trnsl_table.priority ? trnsl_table.priority : -3,
          columns: columns ? tbl.columns : undefined,
          relations: relations ? tbl.relations : undefined
        }

        return ret_table

      }
    }


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

/* //* Get specified table's columns 
  . Returns Array */
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

    var cols = columns_resp.recordset

    for (var c = 0; c < cols.length; c++) {
      var trnsl_col = await DBTranslate.find_from_translate_list(translate_list, tablename, cols[c].name)

      cols[c] = {
        ...cols[c],
        details: trnsl_col.details,
        priority: trnsl_col.priority ? trnsl_col.priority : 0
      }
    }

    return columns_resp.recordset

  }

/* //* Get specified table's inner or outer relations
  . Returns Array */
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

        var inner_rels = inner_rel_resp.recordset
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

        var outer_rels = outer_rel_resp.recordset
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


  //--- Synchronizations ---//

  async sync_database(res) {
    res.write('{')

    let tables_sql = "SELECT TABLE_NAME as table_id, TABLE_TYPE as type FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_TYPE, TABLE_NAME"
    let tables_data = (await this.query(tables_sql)).recordset

    res.write('"tables_length": ' + (tables_data.length).toString())

    let columns_sql = 
      "SELECT TABLE_NAME, COLUMN_NAME as name, DATA_TYPE as type, " + 
      "	(CASE WHEN " + 
      "		(SELECT TOP 1 OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey') " + 
      "			FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku " + 
      "			WHERE ku.TABLE_NAME = cl.TABLE_NAME AND ku.COLUMN_NAME = cl.COLUMN_NAME " + 
      "     ORDER BY OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey') DESC) = 1 " + 
      "	THEN 1 ELSE 0 END) as primary_key " + 
      "FROM INFORMATION_SCHEMA.COLUMNS cl"
    let columns_data = (await this.query(columns_sql)).recordset

    res.write(',"columns_length": ' + (columns_data.length).toString())

    for (let t of tables_data) {
      t.table = t.table_id
      delete t.table_id
    }

    for (let c of columns_data) {
      let tbl_name = c.TABLE_NAME
      let colobj = {name: c.name, type: c.type, primary_key: c.primary_key}

      for (let t of tables_data) {
        if (t.table === tbl_name) {
          if (t.columns) { t.columns.push(colobj) }
          else { t.columns = [ colobj ] }
          break;
        }
      }
    }

    let relations_sql = 
      "SELECT " +
      "    f.name AS foreign_key_name, " +
      "   OBJECT_NAME(f.parent_object_id) AS table_name, " +
      "   COL_NAME(fc.parent_object_id, fc.parent_column_id) AS constraint_column_name, " +
      "   (CASE WHEN " +
      "		(SELECT SUM(OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey')) " +
      "			FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku " +
      "			WHERE ku.TABLE_NAME = OBJECT_NAME(f.parent_object_id) AND ku.COLUMN_NAME = COL_NAME(fc.parent_object_id, fc.parent_column_id)) = 1 " +
      "	  THEN 1 ELSE 0 END) as constcol_isPK, " +
      "   OBJECT_NAME (f.referenced_object_id) AS referenced_object, " +
      "   COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS referenced_column_name, " +
      "   (CASE WHEN " +
      "		(SELECT SUM(OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey')) " +
      "			FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku " +
      "			WHERE ku.TABLE_NAME = OBJECT_NAME (f.referenced_object_id) AND ku.COLUMN_NAME = COL_NAME(fc.referenced_object_id, fc.referenced_column_id)) = 1 " +
      "		THEN 1 ELSE 0 END) as refcol_isPK, " +
      "   f.is_disabled, f.is_not_trusted, " +
      "   f.delete_referential_action_desc, " +
      "   f.update_referential_action_desc " +
      "FROM sys.foreign_keys AS f " +
      "   INNER JOIN sys.foreign_key_columns AS fc ON f.object_id = fc.constraint_object_id"
    let relations_data = (await this.query(relations_sql)).recordset

    res.write(',"relations_length": ' + (relations_data.length).toString())

    for (let r of relations_data) {
      let in_tbl = r.table_name
      let in_obj = {
        "table": r.referenced_object,
        "relation_definition": {
          "source_column": r.constraint_column_name,
          "referenced_column": r.referenced_column_name,
          "single_record": (r.refcol_isPK === 1)
        }
      }

      let out_tbl = r.referenced_object
      let out_obj = {
        "table": r.table_name,
        "relation_definition": {
          "source_column": r.constraint_column_name,
          "referenced_column": r.referenced_column_name,
          "single_record": (r.refcol_isPK === 1)
        }
      }

      for (let t of tables_data) {
        if (!t.relations) { t.relations = {inner: [], outer:[] }}
        if (t.table === in_tbl) {
          t.relations.inner.push(in_obj)
        }
        if (t.table === out_tbl) {
          t.relations.outer.push(out_obj)
        }
      }
    }

    res.write(',"Success": true }')

    let sync_content = {
      sync_date: misc.getDateString(),
      collection_id: this.collection.collection_id,
      data: tables_data
    }

    fs.writeFileSync(this.sync_path, JSON.stringify(sync_content), 'utf-8')

    cnsl.log('Syncronization saved. Collection: ' + this.collection.collection_id)

    return true

  }

  
  //---- Miscellaneous ----//
  
  //* Language fixer for NETSIS
  langfix(str) {
    if (typeof(str) !== 'string') { return str }
    return str
      .replaceAll("Ý", "İ")
      .replaceAll("Þ", "Ş")
      .replaceAll("Ð", "Ğ")
      .replaceAll("ý", "ı")
  }


}


const connector_module = {
  "name": "Microsoft SQL Server Connector",
  "connector_type": "MSSQL",
  "class": ConnectorMSSQL
}



module.exports = {connector_module}