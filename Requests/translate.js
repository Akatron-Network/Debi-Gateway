const env = require('../Libraries/env');
const cnsl = require('../Libraries/console');
const got = require('got-cjs').got;



class DBTranslate {
  constructor(db_scheme_id, language) {
    this.db_scheme_id = db_scheme_id
    this.language = language
  }


  static async getDataFromHost() {
    let url = 
      "http://" + 
      env.Settings.APIHOST + ":" + 
      env.Settings.APIPORT + 
      env.Settings.APIGATEPATH_DBTRANSLATE

    let body = {language: env.Settings.LANGUAGE}

    try {
      let ans = await got(url, {searchParams: body, headers: {"Token": env.Token}}).json()
      if (ans.Success) { env.DBTranslateData = ans.Data }
      else { cnsl.error_log(ans.Data, ans); return false; }
    }
    catch (e) { cnsl.error_log(e.message, e); return false; }

    return true
  }

  //* STATIC
  //* Get All Translations as json list
  // Returns Array
  static async get_complete_translations(db_scheme_id, language = 'TR') {
    return env.DBTranslateData[db_scheme_id + "||" + language]
  }

  
  static async find_from_translate_list(translate_list, table_name, column_name) {
    if (!table_name && !column_name) { return {} }

    for (var t = 0; t < translate_list.length; t++) {
      var t_obj = translate_list[t]

      // if table name is not correct continue
      if (t_obj.table !== table_name) { continue; }

      // if column name not given, return the table object
      if (!column_name) { return t_obj }

      for (var c = 0; c < t_obj.translate_columns.length; c++) {
        var c_obj = t_obj.translate_columns[c]

        if (c_obj.column === column_name) { return c_obj }

      }

    }

    
    
    return {}
  }
}



module.exports = {DBTranslate}