let crud = {};

let data_model = require("./data_model");
var tools = require("./tools");
var sql = require("./sql");

const edited_type_uuid = "1ff12964-4f5c-4be9-8fe3-f3d9a7225300";
const transition_type_uuid = "4d7d3265-806b-492a-b6c1-636e1fa653a9";
const author_field_uuid = "733f669a-9584-4469-a41b-544e25b8d91a";
const name_field_uuid = "c96966ea-a591-47a9-992c-0a2f6443bc80";
const parent_relation_type_uuid = "73b0a22e-4632-453d-903b-09804093ef1b";
const comment_type_uuid = "f53d8ecc-c26e-4909-a070-5c33e6f7a196";

const select_limit = 300;

const atob = require("atob");
const { Console } = require("console");

const uuid_length = edited_type_uuid.length;

crud.json_sql = function (table_name) {
  return (
    "CASE WHEN COUNT(" +
    table_name +
    ") = 0 then '[]' ELSE JSONB_AGG(DISTINCT " +
    table_name +
    ") END"
  );
};

crud.make_read_query_template = function (table_name, num) {
  if (num == undefined) num = 1;
  let select = "'" + table_name + "' AS table_name";
  let join = "";
  let group = "";

  let forein_table_num = 1;

  for (let i in data_model.model[table_name].columns) {
    let column = data_model.model[table_name].columns[i];

    if (group != "") group += ", ";

    group += "t" + num + "." + column.column_name;
    select += ", t" + num + "." + column.column_name;

    if (column.fk != undefined) {
      let forein_table_num_str = num + "" + forein_table_num;

      join +=
        " LEFT JOIN (" +
        crud.make_read_query_template(column.fk, forein_table_num_str) +
        ") f" +
        forein_table_num_str +
        " ON t" +
        num +
        "." +
        column.column_name +
        " = f" +
        forein_table_num_str +
        ".uuid";

      select +=
        ", " +
        crud.json_sql("f" + forein_table_num_str) +
        " AS " +
        column.column_name.replace("_uuid", "");

      forein_table_num++;
    }
  }
  for (let i in data_model.model[table_name]["fk"]) {
    let fk_table_name = data_model.model[table_name]["fk"][i];
    let relations_table_name = table_name + "_to_" + fk_table_name;
    let forein_table_num_str = num + "" + forein_table_num;

    //console.log('lll', fk_table_name, relations_table_name)

    select +=
      ", " +
      crud.json_sql("ff" + forein_table_num_str) +
      " AS " +
      fk_table_name;

    join +=
      " LEFT JOIN " +
      relations_table_name +
      " r" +
      forein_table_num_str +
      " ON " +
      "r" +
      forein_table_num_str +
      "." +
      table_name +
      "_uuid = t" +
      num +
      ".uuid " +
      " LEFT JOIN (" +
      crud.make_read_query_template(fk_table_name, forein_table_num_str) +
      ") ff" +
      forein_table_num_str +
      " ON " +
      "r" +
      forein_table_num_str +
      "." +
      fk_table_name +
      "_uuid = ff" +
      forein_table_num_str +
      ".uuid";
  }
  for (let i in data_model.model[table_name]["fks"]) {
    let fk_table_name = data_model.model[table_name]["fks"][i];
    //    console.log('fk_table_name', table_name, fk_table_name)

    let forein_table_num_str = num + "" + forein_table_num + "_" + i;

    select +=
      ", " + crud.json_sql("f" + forein_table_num_str) + " AS " + fk_table_name;

    join +=
      " LEFT JOIN (" +
      crud.make_read_query_template(fk_table_name, forein_table_num_str) +
      ") f" +
      forein_table_num_str +
      " ON " +
      "f" +
      forein_table_num_str +
      "." +
      table_name +
      "_uuid = t" +
      num +
      ".uuid";
  }

  let and = "";
  let del = "TRUE";
  if (num == 1) {
    and = "$@1 ";
    //del = 't' + num + '.deleted_at IS NULL '
  }
  del = "t" + num + ".deleted_at IS NULL ";

  if (join == "") group = "";
  else group = " GROUP BY " + group;

  let query =
    "SELECT " +
    select +
    " FROM " +
    table_name +
    " t" +
    num +
    " " +
    join +
    " WHERE " +
    del +
    and +
    group;

  // if(num == 1) console.log('q', table_name, query)
  return query;
};

crud.load = async function () {
  await data_model.load();

  crud.querys = {};

  for (let table_name in data_model.model) {
    crud.querys[table_name] = {
      create: "INSERT INTO " + table_name + "($@1) VALUES ($@2)",
      read: crud.make_read_query_template(table_name),
      update: "UPDATE " + table_name + " SET $@2 WHERE uuid = $@1",
      delete:
        "UPDATE " + table_name + " SET deleted_at = NOW() WHERE uuid = $@1",
      upsert: "",
    };
  }

  crud.querys["issues"]["read"] =
    `SELECT 
    'issues' AS TABLE_NAME,
    T1.UUID,
    T1.NUM,
    T1.TYPE_UUID,
    T11.NAME AS TYPE_NAME,
    T11.WORKFLOW_UUID,
    T1.CREATED_AT,
    ` +
    //T1.UPDATED_AT,
    `MAX(T15.CREATED_AT) AS UPDATED_AT,
    T1.DELETED_AT,
    T1.PROJECT_UUID,
    T12.NAME AS PROJECT_NAME,
    T12.SHORT_NAME AS PROJECT_SHORT_NAME,
    CASE WHEN COUNT(T14) = 0 THEN '[]' ELSE JSONB_AGG(DISTINCT T14) END AS VALUES,
    CASE WHEN COUNT(T15) = 0 THEN '[]' ELSE JSONB_AGG(DISTINCT T15) END AS ACTIONS,
    STATUS_UUID,
    T17.NAME AS STATUS_NAME,
    CASE WHEN COUNT(T18) = 0 THEN '[]' ELSE JSONB_AGG(DISTINCT T18) END AS ATTACHMENTS,
    T1.SPRINT_UUID,
    T19.PARENT_UUID,
    T20.NAME AS SPRINT_NAME
    FROM 
    FILTERED_ISSUES T1
    JOIN
    ISSUE_TYPES T11
    ON 
    T1.TYPE_UUID = T11.UUID
    JOIN
    PROJECTS T12
    ON 
    T1.PROJECT_UUID = T12.UUID
    JOIN ISSUE_STATUSES T17
    ON T1.STATUS_UUID = T17.UUID
	LEFT JOIN LATERAL
	(SELECT 
        'field_values' AS TABLE_NAME,
        FV.UUID AS UUID,
	 	YT.UUID AS ISSUE_TYPE_UUID,
	 	F.NAME AS LABEL,
	 	FT.CODE AS TYPE,
	 	FV.VALUE,
	 	T1.UUID AS ISSUE_UUID,
        F.UUID AS FIELD_UUID
	 FROM ISSUE_TYPES YT
	 JOIN ISSUE_TYPES_TO_FIELDS ITF
	 ON ITF.ISSUE_TYPES_UUID = YT.UUID
	 JOIN FIELDS F
	 ON ITF.FIELDS_UUID = F.UUID
	 JOIN FIELD_TYPES FT
	 ON FT.UUID = F.TYPE_UUID
	 LEFT JOIN FIELD_VALUES FV
	 ON FV.FIELD_UUID = F.UUID  AND T1.UUID = FV.ISSUE_UUID
     ORDER BY F.NAME
	) T14
	ON T1.TYPE_UUID = T14.ISSUE_TYPE_UUID
    LEFT JOIN 
    (SELECT
        A.UUID,
        A.ISSUE_UUID,
        U.NAME AS AUTHOR,
        A.VALUE,
        AT.NAME,
        A.CREATED_AT
    FROM ISSUE_ACTIONS A
    JOIN ISSUE_ACTIONS_TYPES AT
    ON A.TYPE_UUID = AT.UUID
    JOIN USERS U
    ON A.AUTHOR_UUID = U.UUID
    ) T15
    ON T1.UUID = T15.ISSUE_UUID
    LEFT JOIN
    (SELECT 
        'attachments' AS TABLE_NAME,
        UUID,
        NAME,
        EXTENTION,
        ISSUE_UUID
    FROM ATTACHMENTS) T18
    ON T1.UUID = T18.ISSUE_UUID
    LEFT JOIN LATERAL
    (SELECT
        ISSUE0_UUID PARENT_UUID,
        ISSUE1_UUID
        FROM RELATIONS WHERE ISSUE1_UUID = T1.UUID
        AND TYPE_UUID = '` +
    parent_relation_type_uuid +
    `'
        AND DELETED_AT IS NULL
    ) T19
    ON T1.UUID = T19.ISSUE1_UUID
    LEFT JOIN SPRINTS T20
    ON T20.UUID = T1.SPRINT_UUID
    WHERE T1.DELETED_AT IS NULL $@1
    GROUP BY
    T1.UUID,
    T1.NUM,
    T1.TYPE_UUID,
    TYPE_NAME,
    T1.CREATED_AT,
    T1.UPDATED_AT,
    T1.DELETED_AT,
    T1.PROJECT_UUID,
    PROJECT_NAME,
    PROJECT_SHORT_NAME,
    T1.STATUS_UUID,
    T17.NAME,
    T19.PARENT_UUID,
    T20.NAME,
    T1.SPRINT_UUID,
    T11.WORKFLOW_UUID
    $@order
    LIMIT 
    ` +
    select_limit;

  crud.querys["issue"] = {};
  crud.querys["issue"]["read"] = crud.querys["issues"]["read"];
  crud.querys["issue"]["upsert"] = crud.querys["issues"]["upsert"];
  crud.querys["issue"]["create"] = crud.querys["issues"]["create"];
  crud.querys["issue"]["update"] = crud.querys["issues"]["update"];
  crud.querys["issue"]["delete"] = crud.querys["issues"]["delete"];

  crud.querys["issues_count"] = {};
  crud.querys["issues_count"]["read"] = `SELECT COUNT(uuid) FROM filtered_issues WHERE DELETED_AT IS NULL`

  crud.querys["issue_actions"][
    "read"
  ] = `SELECT * FROM issue_actions t1 WHERE deleted_at IS NULL $@1`;

  crud.querys["attachments"]["read"] = `SELECT * FROM attachments T1 WHERE TRUE $@1`;
  crud.querys["attachments"]["delete"] = `DELETE FROM attachments WHERE uuid = $@1`;

  crud.querys["board"] = {};
  crud.querys["board"]["read"] = crud.querys["boards"]["read"];
  crud.querys["board"]["upsert"] = crud.querys["boards"]["upsert"];
  crud.querys["board"]["create"] = crud.querys["boards"]["create"];
  crud.querys["board"]["update"] = crud.querys["boards"]["update"];
  crud.querys["board"]["delete"] = crud.querys["boards"]["delete"];

  crud.querys["dashboard"] = {};
  crud.querys["dashboard"]["upsert"] = crud.querys["dashboards"]["upsert"];
  crud.querys["dashboard"]["create"] = crud.querys["dashboards"]["create"];
  crud.querys["dashboard"]["update"] = crud.querys["dashboards"]["update"];
  crud.querys["dashboard"]["delete"] = crud.querys["dashboards"]["delete"];

  crud.querys["short_issue_info"] = {};
  crud.querys["short_issue_info"]["read"] = 
    `SELECT 
    I.UUID, P.SHORT_NAME || '-' || I.NUM || ' ' || FV.value AS name
    FROM ISSUES I
    JOIN PROJECTS P
    ON P.UUID = I.PROJECT_UUID 
    JOIN FIELD_VALUES FV
    ON FV.FIELD_UUID = '` +
    name_field_uuid +
    `' AND FV.ISSUE_UUID = I.UUID
    WHERE I.DELETED_AT IS NULL 
    AND P.SHORT_NAME || '-' || I.NUM || ' ' || FV.value LIKE '%$@2%'
    LIMIT 20`;

  //used for imp.js
  crud.querys["short_issue_info_for_imort"] = {};
  crud.querys["short_issue_info_for_imort"]["read"] = `SELECT 
    I.UUID, P.SHORT_NAME || '-' || I.NUM AS full_num,
    I.CREATED_AT, 
    I.UUID
    FROM ISSUES I
    JOIN PROJECTS P
    ON P.UUID = I.PROJECT_UUID 
    WHERE I.DELETED_AT IS NULL`;

    crud.querys["issue_uuid"] = {};
    crud.querys["issue_uuid"]["read"] = `SELECT 
    UUID
    FROM ISSUES t1
    WHERE DELETED_AT IS NULL $@1`;

    
    crud.querys["old_issue_uuid"] = {};
    crud.querys["old_issue_uuid"]["read"] = `SELECT 
    ISSUE_UUID AS UUID
    FROM OLD_ISSUES_NUM t1
    WHERE DELETED_AT IS NULL $@1`;
    

  crud.querys["formated_relations"] = {};
  crud.querys["formated_relations"]["read"] =
    `
    SELECT * FROM (
        SELECT 
        R.UUID, 
        R.ISSUE0_UUID CURRENT_UUID,
        R.DELETED_AT,
        RT.NAME TYPE_NAME,
        P.SHORT_NAME || '-' || I.NUM  ID,
        FV.value ISSUE_NAME
        FROM RELATIONS R
        LEFT JOIN RELATION_TYPES RT
        ON RT.UUID = R.TYPE_UUID
        LEFT JOIN ISSUES I 
        ON R.ISSUE1_UUID = I.UUID
        LEFT JOIN PROJECTS P
        ON P.UUID = I.PROJECT_UUID 
        LEFT JOIN FIELD_VALUES FV
        ON FV.FIELD_UUID = '` +
    name_field_uuid +
    `' AND FV.ISSUE_UUID = I.UUID
        UNION
        SELECT 
        R.UUID, 
        R.ISSUE1_UUID CURRENT_UUID,
        R.DELETED_AT,
        RT.REVERT_NAME TYPE_NAME,
        P.SHORT_NAME || '-' || I.NUM  ID,
        FV.value ISSUE_NAME
        FROM RELATIONS R
        LEFT JOIN RELATION_TYPES RT
        ON RT.UUID = R.TYPE_UUID
        LEFT JOIN ISSUES I 
        ON R.ISSUE0_UUID = I.UUID
        LEFT JOIN PROJECTS P
        ON P.UUID = I.PROJECT_UUID 
        LEFT JOIN FIELD_VALUES FV
        ON FV.FIELD_UUID = '` +
    name_field_uuid +
    `' AND FV.ISSUE_UUID = I.UUID
    ) T1 WHERE DELETED_AT IS NULL $@1
    LIMIT 50`;

  crud.querys["dashboard"]["read"] = `
    SELECT 
        t1.uuid,
        t1.name,
        t1.created_at,
        t1.updated_at,
        CASE WHEN COUNT(g) = 0 THEN '[]' ELSE JSONB_AGG(DISTINCT g) END AS gadgets,
        JSONB_AGG(DISTINCT u) AS author
    FROM 
        dashboards t1
    LEFT JOIN
        users u 
    ON
        t1.author_uuid = u.uuid
    LEFT JOIN
    (
        SELECT gd.*, 
        gt.name AS type_name,
        gt.code AS type_code
        FROM 
        gadgets gd
        LEFT JOIN
        gadget_types gt ON
        gt.uuid = gd.type_uuid
    ) g
    ON
        g.dashboard_uuid = t1.uuid
    WHERE 
        t1.deleted_at is NULL  $@1
        GROUP BY 
        t1.uuid,
        t1.name,
        t1.created_at,
        t1.updated_at`;
};

crud.push_query = function (query0, params0, query1, params1, is_revert) {
  //console.log('------------push_query0', '#' + query0 + '#', '##' + query1+ '##')

  if (query1 == "") return [query0, params0];
  let query = [];
  let params = [];

  if (!Array.isArray(query0)) {
    query = query0 != "" ? [query0] : [];
    params = query0 != "" ? [params0] : [];
  } else {
    for (let i = 0; i < query0.length; i++) {
      query.push(query0[i]);
      params.push(params0[i]);
    }
  }

  let q = [];
  let p = [];
  if (!Array.isArray(query1)) {
    q = query1 != "" ? [query1] : [];
    p = query1 != "" ? [params1] : [];
  } else {
    q = query1;
    p = params1;
  }

  for (let i = 0; i < q.length; i++) {
    if (is_revert) {
      query.pop(q[i]);
      params.pop(p[i]);
    } else {
      query.push(q[i]);
      params.push(p[i]);
    }
  }

  // console.log('--------------push_query1',query0 , query1)

  return [query, params];
};

crud.concat_querys = function (query0, params0, query1, params1, middle) {
  // console.log('concstart', query0, params0, query1, params1, middle)

  if (Array.isArray(query0)) return [query0, params0];

  let query = query1;
  let params = [];
  for (let i = 0; i < params0.length; i++) {
    params.push(params0[i]);
  }
  for (let i = 0; i < params1.length; i++) {
    params.push(params1[i]);

    // console.log('$' + (i+1), '$' + params.length, query)
    query = query.replace("$" + (i + 1), "$" + params.length);
  }
  query = query0 + middle + query;

  // console.log('concend', query, params)
  return [query, params];
};

crud.make_query = {
  read: function (table_name, params) {
    if (table_name == undefined) return ["", []];
    let query = crud.querys[table_name]["read"];

    if (
      (table_name == "issues"  &&
      params["query"] != undefined &&
      params["query"] != "") || table_name == "issues_count")
     {
      let user_query = ' TRUE '
      if (params["query"]) user_query = decodeURIComponent(atob(params["query"]));

      //console.log('user_query', user_query)

      let uuids_query = `WITH filtered_issues AS (
                SELECT * FROM
                (
                SELECT 
                ISS.UUID,
                ISS.NUM,
                ISS.TYPE_UUID,
                ISS.CREATED_AT,
                MAX(IA.CREATED_AT) AS UPDATED_AT,
                ISS.DELETED_AT,
                ISS.PROJECT_UUID,
                ISS.STATUS_UUID,
                ISS.SPRINT_UUID,
                STRING_AGG(IT.issue_tags_uuid::text, ',') AS TAGS
                FROM issues ISS
                LEFT JOIN issue_actions IA
                ON IA.ISSUE_UUID = ISS.UUID
                LEFT JOIN issue_tags_selected IT
                ON IT.ISSUE_UUID = ISS.UUID AND IT.DELETED_AT IS NULL
                GROUP BY 
                ISS.UUID,
                ISS.NUM,
                ISS.TYPE_UUID,
                ISS.CREATED_AT,
                ISS.DELETED_AT,
                ISS.PROJECT_UUID,
                ISS.STATUS_UUID,
                ISS.SPRINT_UUID
                ) I
                WHERE `;

      let f1 = `EXISTS (SELECT 1 FROM field_values FV WHERE FV.issue_uuid = I.uuid AND FV.field_uuid = '`;

      let f2 = `' AND FV.value `;

      let q_resolved_uuids = `(SELECT UUID FROM ISSUE_STATUSES WHERE IS_END)`;
      user_query = user_query.replaceAll(
        "!='(resolved)'",
        "!=ALL " + q_resolved_uuids
      );

      
      //user_query = user_query.replaceAll("='(resolved)'", '=ANY '  + q_resolved_uuids )

      while (user_query.indexOf("attr#") > -1) {
        let start = user_query.indexOf("attr#");
        user_query = user_query.replaceFrom("attr#", "I.", start);
        user_query = user_query.replaceFrom("#", "", start);
        user_query = user_query.replaceFrom("#", "", start);
        user_query = user_query.replaceFrom("like'", " like '", start);
        
      }
      while (user_query.indexOf("fields#") > -1) {
        let start = user_query.indexOf("fields#");
        user_query = user_query.replaceFrom("fields#", f1, start);
        user_query = user_query.replaceFrom("#", f2, start);
        user_query = user_query.replaceFrom("#", ")", start);
        user_query = user_query.replaceFrom("like'", " like '", start);
      }

      user_query = user_query.replaceAll(
        "I.tags=",
        "I.tags~"
      );

      user_query = user_query.replaceAll(
        "' '",
        "' '"
      );
      

      //user_query = user_query.replaceAll("I.updated_at", "MAX(IA.CREATED_AT)")

      let order_start = user_query.indexOf("order by ");
      if (order_start > -1) {
        let order_by = user_query.substring(order_start);
        user_query = user_query.replace(order_by, "");
        query = query.replace("$@order", order_by);
      } else query = query.replace("$@order", "");

      query = uuids_query + user_query + ")" + query;

      delete params["query"];
    } else if (table_name == "issues" || table_name == "issue") {
      query = `WITH filtered_issues AS (SELECT * FROM ISSUES) ` + query;
      query = query.replace("$@order", "");
    }

    if (!params || params.length == 0) return [query.replace("$@1", ""), []];

    //console.log(params)

    let pg_params = [];

    let where = "";
    for (let i in params) {
      if (i == "offset") {
        query += " OFFSET " + params[i];
        continue;
      } else if (i == "like") {
        query = query.replace("$@2", params[i]);
      } else {
        pg_params.push(params[i]);
        where += " AND t1." + i + "=$" + pg_params.length;
      }
    }
    return [query.replaceAll("$@1", where), pg_params];
  },

  delete: function (table_name, params) {

    console.log('table_name', table_name)
    let query = crud.querys[table_name]["delete"];

    return [query.replace("$@1", "'" + params.uuid + "'"), []];
  },

  create: function (table_name, params) {
    //console.log('tn', table_name)

    if (table_name == undefined) return ["", []];

    let query = crud.querys[table_name]["create"];

    let keys = "",
      values = "";

    let columns = data_model.model[table_name].columns;

    params.updated_at = "NOW()";

    let pg_params = [];

    for (let i in params) {
      if (
        columns[i] === undefined ||
        i === "deleted_at" || //|| i === 'created_at'
        i === "password" ||
        i === "token" ||
        i === "token_created_at"
      )
        continue;

      if (data_model.model[table_name].columns[i] == undefined) continue;

      if (keys != "") {
        keys += ", ";
        values += ", ";
      }

      keys += i;
      let val = params[i];
      //if(val == null || val == 'null') val = 'NULL'
      pg_params.push(val);
      values += "$" + pg_params.length;
    }

    query = query.replace("$@1", keys);
    query = query.replace("$@2", values);

    return [query, pg_params];
  },

  update: function (table_name, params) {
    if (table_name == undefined) return ["", []];
    if (table_name == 'field_values' && params.field_uuid == author_field_uuid) return ["", []];
    let read_query = crud.querys[table_name]["read"];

    let query = crud.querys[table_name]["update"];

    query = query.replace("$@1", "'" + params.uuid + "'");

    let set = "";

    let columns = data_model.model[table_name].columns;

    params.updated_at = "NOW()";

    // for(let i in params){
    //      if(params[i] == author_field_uuid) return [ 'NOTHING', []]
    //  }

    let pg_params = [];

    for (let i in params) {
      if (
        columns[i] === undefined ||
        i === "deleted_at" || //|| i === 'created_at'
        i === "password" ||
        i === "token" ||
        i === "token_created_at" ||
        i == "author_uuid"
      )
        continue;

      if (data_model.model[table_name].columns[i] == undefined) continue;

      if (set != "") set += ", ";

      let val = params[i];
      //if(val == null || val == 'null') val = 'NULL'
      pg_params.push(val);
      //if(val != null && val.length > 50) val += '123321.aeraeraeraebaerbjrejfejjnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn...................................................'
      set = set.concat(i, "=$", pg_params.length);
    }

    // if(set.indexOf('SELECT x.* FROM integration_1c.messages x') > 0)console.log('aaaaaleeeertttt0', set)

    query = query.replace("$@2", set);

    return [query, pg_params];
  },

  upsert: function (table_name, params) {
    if (table_name == undefined) return ["", []];
    let [query_create, params_create] = crud.make_query.create(
      table_name,
      params
    );

    let upd = crud.make_query.update;
    // console.log(upd)

    let [query_update, params_update] = upd(table_name, params);

    query_update = query_update.replace(table_name, "").split("WHERE")[0];

    if(query_update == '') query_update = 'NOTHING'
    let [query, pg_params] = crud.concat_querys(
      query_create,
      params_create,
      query_update,
      params_update,
      " ON CONFLICT(uuid) DO "
    );

    //query += ';'

    if (table_name == "issues" && params.num == undefined) {
      let [q, p] = crud.push_query(
        query,
        pg_params,
        `UPDATE issues SET num = 
          (SELECT COALESCE(MAX(num), 0) + 1 FROM
           ((SELECT uuid, project_uuid, num FROM issues)
            UNION 
           (SELECT uuid, project_uuid, num FROM old_issues_num)) t
          WHERE project_uuid = $1 and uuid != $2) 
        WHERE uuid = $3`,
        [params.project_uuid, params.uuid, params.uuid]
      );

      query = q;
      pg_params = p;

      let [q1, p1] = crud.push_query(
        query,
        pg_params,
        `UPDATE issues SET status_uuid = (
                    SELECT IST.uuid 
                    FROM issue_types IT
                    JOIN workflow_nodes WN
                    ON WN.workflows_uuid = IT.workflow_uuid
                    JOIN issue_statuses IST
                    ON IST.uuid = WN.issue_statuses_uuid AND IST.is_start = TRUE
                    WHERE IT.uuid = $1
                    LIMIT 1
                    ) WHERE uuid = $2`,
        [params.type_uuid, params.uuid]
      );

      query = q1;
      pg_params = p1;
    }

    let subquerys = "";
    let subparams = [];

    for (let i in params) {
      // console.log('ccc1', params[i], typeof params[i])

      if (
        !params[i] ||
        params[i][0] === undefined ||
        typeof params[i][0] !== "object"
      ) {
        // for(let j in params[i]){
        //     let child =  params[i][j]
        // if(data_model.has_fk(table_name, j)) console.log('chiiiild', child)//subquerys += '\r\n' + 'INSERT INTO ' table_name + '_to_'
        // }
        continue;
      }

      // console.log(typeof params[i])
      for (let j in params[i]) {
        let child = params[i][j];

        let [new_subqyery, new_subparams] = crud.make_query.upsert(
          child.table_name,
          child
        );

        //   console.log('_________0', new_subqyery)
        //   console.log('_________00')
        let [q, p] = crud.push_query(
          subquerys,
          subparams,
          new_subqyery,
          new_subparams
        );

        subquerys = q;
        subparams = p;
      }
    }

    //  console.log('tntntntnttntnt', table_name)

    // console.log('_________1', subquerys)
    //  console.log('_________11')
    return crud.push_query(query, pg_params, subquerys, subparams);
  },
};

crud.get_query = function (method, table_name, params) {
  //console.log( method, 'bb', table_name)
  if (table_name == undefined) return ["", []];

  let [query, pg_params] = crud.make_query[method](table_name, params);

  if (method == "update" || method == "create" || method == "upsert") {
    let [read_query, read_params] = crud.make_query.read(table_name, {
      uuid: params.uuid,
    });

    //console.log('reeeeeeeeeeeeeeeeeeeeeeeeeeeeead_query', read_query + '###' + query, pg_params)

    //   console.log('_________2')
    let [q, p] = crud.push_query(query, pg_params, read_query, read_params);
    query = q;
    pg_params = p;
  }

  return [query, pg_params];
};

crud.get_uuids = function (obj) {
  let ans = {};
  if (obj.uuid !== undefined) ans[obj.uuid] = obj.table_name;
  for (let i in obj) {
    if (
      obj[i] === undefined ||
      obj[i] === null ||
      obj[i][0] === undefined ||
      obj[i][0].uuid === undefined
    )
      continue;

    let fk = data_model.model[obj.table_name]["fk"];
    if (fk !== undefined) {
      // console.log('fk', obj.table_name, fk)

      for (let k in fk) {
        for (let j in obj[fk[k]]) {
          if (obj[fk[k]][j].uuid == undefined) ans[obj[fk[k]][j]] = fk[k];
          else ans[obj[fk[k]][j].uuid] = fk[k];
        }
      }
    }

    let fks = data_model.model[obj.table_name]["fks"];
    // console.log(obj.table_name, 'fff', fks, 'fdfdfd', obj[i][0].table_name, obj[i][0])

    if (fks == undefined || !fks.includes(obj[i][0].table_name)) continue;
    // console.log('fff2', fks, 'fdfdfd', obj[i][0].table_name)

    for (let j in obj[i]) {
      ans = tools.obj_join(ans, crud.get_uuids(obj[i][j]));
    }
  }

  //  console.log('aaaaaaaaaans uuids', ans)
  return ans;
};

crud.do = async function (subdomain, method, table_name, params) {
  if (table_name == "issue") table_name = "issues";
  else if (table_name == "board") table_name = "boards";
  //else if(table_name == 'dashboard') table_name = 'dashboards'
  let [query, pg_params] = crud.get_query(method, table_name, params);

  // console.log('paraaaaaaaaaaaaaaaaaaaaaams', params)

  if (method != "read") {
    let [read_query, read_params] = crud.make_query.read(table_name, {
      uuid: params.uuid,
    });

    //    console.log('rqrqrqrqrq0', read_query)

    let data = await sql.query(subdomain, read_query, read_params);

    //  console.log('rqrqrqrqrq', read_query, data)

    if (data.rows.length > 0) {
      if (
        table_name == "issues" &&
        data.rows[0].status_uuid != params.status_uuid
      ) {
        let status_text = data.rows[0].status_name + "->" + params.status_name;

        let action_options = {
          value: status_text,
          issue_uuid: params.uuid,
          author_uuid: params.author_uuid,
          type_uuid: transition_type_uuid,
          uuid: tools.uuidv4(),
        };

        let [ia_query, ia_params] = crud.make_query.create(
          "issue_actions",
          action_options
        );

        let [q, p] = crud.push_query(query, pg_params, ia_query, ia_params);

        query = q;
        pg_params = p;
      } else if (table_name == "issues") {
        let action_options = {
          value: "",
          issue_uuid: params.uuid,
          author_uuid: params.author_uuid,
          type_uuid: edited_type_uuid,
          uuid: tools.uuidv4(),
        };

        let [ia_query, ia_params] = crud.make_query.create(
          "issue_actions",
          action_options
        );

        let [q, p] = crud.push_query(query, pg_params, ia_query, ia_params);

        query = q;
        pg_params = p;
      }

      let old_uuids = crud.get_uuids(data.rows[0]);

      //    console.log('old_uuids', old_uuids)

      let new_uuids = crud.get_uuids(params);

      //   console.log('new_uuids', new_uuids)

      let del_query = "";
      for (let i in old_uuids) {
        if (new_uuids[i] != undefined) continue;
        //   console.log('del', old_uuids[i], JSON.stringify(i))
        if (data_model.has_fk(table_name, old_uuids[i]))
          del_query +=
            "delete from " +
            table_name +
            "_to_" +
            old_uuids[i] +
            " where " +
            old_uuids[i] +
            "_uuid = '" +
            i +
            "';";
        else
          del_query +=
            crud.get_query("delete", old_uuids[i], { uuid: i })[0] +
            ";" +
            del_query;

        //    console.log('del2', del_query)
      }

      for (let i in new_uuids) {
        if (old_uuids[i] != undefined) continue;
        if (!data_model.has_fk(table_name, new_uuids[i])) continue;
        del_query +=
          "insert into " +
          table_name +
          "_to_" +
          new_uuids[i] +
          "(" +
          new_uuids[i] +
          "_uuid, " +
          table_name +
          "_uuid) VALUES('" +
          i +
          "', '" +
          params.uuid +
          "');";

        //  console.log('addddd', del_query)
      }

      if (del_query != "") {
        let [q, p] = crud.push_query([query, pg_params, del_query], [[]], true);

        query = q;
        pg_params = p;
      }
    }
  }

  //  console.log('before while')
  //  while(query.indexOf("'null'") > -1) query = query.replace("'null'", 'NULL')
  //  while(query.indexOf('null') > -1) query = query.replace('null', 'NULL')

  //console.log('qqqqq', subdomain, query)

  // console.log('###################################################################################')
  // console.log(query)

  //  console.log('###################################################################################')

  //   console.log(pg_params)
  //  console.log('###################################################################################')

  let ans = await sql.query(subdomain, query, pg_params);

  if (ans != null && ans[1] != undefined) ans = ans[ans.length - 1];

  return ans;
};

module.exports = crud;
