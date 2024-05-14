import data_model from "./data_model";
import tools from "../tools";
import sql from "./sql";

import Memcached from 'memcached';

const memcached = new Memcached('memcached:11211');

const CONSTANTS = {
  editedTypeUUID: "1ff12964-4f5c-4be9-8fe3-f3d9a7225300",
  transitionTypeUUID: "4d7d3265-806b-492a-b6c1-636e1fa653a9",
  authorFieldUUID: "733f669a-9584-4469-a41b-544e25b8d91a",
  nameFieldUUID: "c96966ea-a591-47a9-992c-0a2f6443bc80",
  parentRelationTypeUUID: "73b0a22e-4632-453d-903b-09804093ef1b",
  commentTypeUUID: "f53d8ecc-c26e-4909-a070-5c33e6f7a196",
  reqIssueTypesFields: [
    "c96966ea-a591-47a9-992c-0a2f6443bc80",
    "4a095ff5-c1c4-4349-9038-e3c35a2328b9",
    "733f669a-9584-4469-a41b-544e25b8d91a"
  ],
  selectLimit: 1000
};

async function getMemcachedValue(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    memcached.get(key, (err: any, data: any) => {
      err ? reject(err) : resolve(data);
    });
  });
}

async function cacheGet(key: string) {
  try {
    const data = await getMemcachedValue(key);
    if (data) {
      console.log('Retrieved value from Memcached:', data);
      return data;
    } else {
      console.log('Key not found:', key);
    }
  } catch (err) {
    console.error('Memcached get error:', err);
  }
}

const crud: any = {
  jsonSql: (tableName: string) => `CASE WHEN COUNT(${tableName}) = 0 then '[]' ELSE JSONB_AGG(DISTINCT ${tableName}) END`,

  make_read_query_template: function (tableName: string, num: number = 1): string {
    let select = `'${tableName}' AS table_name`;
    let join = "";
    let group = "";
    let foreinTableNum = 1;

    for (const column of data_model.model[tableName].columns) {
      if (group) group += ", ";
      group += `t${num}.${column.column_name}`;
      select += `, t${num}.${column.column_name}`;

      if (column.fk) {
        const foreinTableNumStr = `${num}${foreinTableNum}`;
        join += ` LEFT JOIN (${crud.make_read_query_template(column.fk, parseInt(foreinTableNumStr))}) f${foreinTableNumStr} ON t${num}.${column.column_name} = f${foreinTableNumStr}.uuid`;
        select += `, ${crud.jsonSql(`f${foreinTableNumStr}`)} AS ${column.column_name.replace("_uuid", "")}`;
        foreinTableNum++;
      }
    }

    for (const fkTableName of data_model.model[tableName].fk) {
      const relationsTableName = `${tableName}_to_${fkTableName}`;
      const foreinTableNumStr = `${num}${foreinTableNum}`;
      select += `, ${crud.jsonSql(`ff${foreinTableNumStr}`)} AS ${fkTableName}`;
      join += ` LEFT JOIN ${relationsTableName} r${foreinTableNumStr} ON r${foreinTableNumStr}.${tableName}_uuid = t${num}.uuid LEFT JOIN (${crud.make_read_query_template(fkTableName, parseInt(foreinTableNumStr))}) ff${foreinTableNumStr} ON r${foreinTableNumStr}.${fkTableName}_uuid = ff${foreinTableNumStr}.uuid`;
    }

    for (const fkTableName of data_model.model[tableName].fks) {
      const foreinTableNumStr = `${num}${foreinTableNum}_${fkTableName}`;
      select += `, ${crud.jsonSql(`f${foreinTableNumStr}`)} AS ${fkTableName}`;
      join += ` LEFT JOIN (${crud.make_read_query_template(fkTableName, parseInt(foreinTableNumStr))}) f${foreinTableNumStr} ON f${foreinTableNumStr}.${tableName}_uuid = t${num}.uuid`;
    }

    const whereCondition = `t${num}.deleted_at IS NULL `;
    group = join ? ` GROUP BY ${group}` : "";

    return `SELECT ${select} FROM ${tableName} t${num} ${join} WHERE ${whereCondition} $@1 ${group}`;
  },

  load: async function () {
    await data_model.load();

    crud.querys = {};

    for (const tableName in data_model.model) {
      crud.querys[tableName] = {
        create: `INSERT INTO ${tableName}($@1) VALUES ($@2)`,
        read: crud.make_read_query_template(tableName),
        update: `UPDATE ${tableName} SET $@2 WHERE uuid = $@1`,
        delete: `UPDATE ${tableName} SET deleted_at = NOW() WHERE uuid = $@1`,
        upsert: "",
      };
    }

    crud.querys["issues"]["read"] = `SELECT 
    'issues' AS TABLE_NAME,
    T1.UUID,
    T1.NUM,
    T1.TITLE,
    T1.DESCRIPTION,
    T1.SPENT_TIME,
    T1.TYPE_UUID,
    T11.NAME AS TYPE_NAME,
    T11.WORKFLOW_UUID,
    T1.CREATED_AT,
    T1.UPDATED_AT,
    T1.DELETED_AT,
    T1.RESOLVED_AT,
    T1.PROJECT_UUID,
    T12.NAME AS PROJECT_NAME,
    T12.SHORT_NAME AS PROJECT_SHORT_NAME,
    ${crud.jsonSql("T14")} AS VALUES,
    STATUS_UUID,
    T17.NAME AS STATUS_NAME,
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
     ON ITF.FIELDS_UUID = F.UUID OR NOT F.IS_CUSTOM
     JOIN FIELD_TYPES FT
     ON FT.UUID = F.TYPE_UUID
     LEFT JOIN FIELD_VALUES FV
     ON FV.FIELD_UUID = F.UUID  AND T1.UUID = FV.ISSUE_UUID
     ORDER BY F.NAME
    ) T14
    ON T1.TYPE_UUID = T14.ISSUE_TYPE_UUID
    LEFT JOIN LATERAL
    (SELECT
        ISSUE0_UUID PARENT_UUID,
        ISSUE1_UUID
        FROM RELATIONS WHERE ISSUE1_UUID = T1.UUID
        AND TYPE_UUID = '${CONSTANTS.parentRelationTypeUUID}'
        AND DELETED_AT IS NULL
    ) T19
    ON T1.UUID = T19.ISSUE1_UUID
    LEFT JOIN SPRINTS T20
    ON T20.UUID = T1.SPRINT_UUID
    WHERE T1.DELETED_AT IS NULL $@1
    GROUP BY
    T1.UUID,
    T1.NUM,
    T1.TITLE,
    T1.DESCRIPTION,
    T1.SPENT_TIME,
    T1.TYPE_UUID,
    TYPE_NAME,
    T1.CREATED_AT,
    T1.UPDATED_AT,
    T1.DELETED_AT,
    T1.RESOLVED_AT,
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
    LIMIT ${CONSTANTS.selectLimit}`;

    crud.querys["issue"] = crud.querys["issues"];
    crud.querys["issues_count"] = {
      read: `SELECT COUNT(uuid) FROM filtered_issues WHERE DELETED_AT IS NULL`
    };
    crud.querys["issue_actions"] = {
      read: `SELECT * FROM issue_actions t1 WHERE deleted_at IS NULL $@1`,
      delete: `UPDATE issue_actions SET archived_at = now() WHERE uuid = $@1`
    };
    crud.querys["attachments"] = {
      read: `SELECT * FROM attachments T1 WHERE TRUE $@1`,
      delete: `DELETE FROM attachments WHERE uuid = $@1`
    };
    crud.querys["board"] = crud.querys["boards"];
    crud.querys["dashboard"] = crud.querys["dashboards"];
    crud.querys["short_issue_info"] = {
      read: `SELECT 
      I.UUID, P.SHORT_NAME || '-' || I.NUM || ' ' || FV.value AS name
      FROM ISSUES I
      JOIN PROJECTS P
      ON P.UUID = I.PROJECT_UUID 
      JOIN FIELD_VALUES FV
      ON FV.FIELD_UUID = '${CONSTANTS.nameFieldUUID}'
      AND FV.ISSUE_UUID = I.UUID
      WHERE I.DELETED_AT IS NULL 
      AND P.SHORT_NAME || '-' || I.NUM || ' ' || FV.value LIKE '%$@2%'
      LIMIT 20`
    };
    crud.querys["short_issue_info_for_imort"] = {
      read: `SELECT 
      I.UUID, P.SHORT_NAME || '-' || I.NUM AS full_num,
      I.CREATED_AT, 
      I.UUID
      FROM ISSUES I
      JOIN PROJECTS P
      ON P.UUID = I.PROJECT_UUID 
      WHERE I.DELETED_AT IS NULL`
    };
    crud.querys["issue_uuid"] = {
      read: `SELECT 
      UUID
      FROM ISSUES t1
      WHERE DELETED_AT IS NULL $@1`
    };
    crud.querys["old_issue_uuid"] = {
      read: `SELECT 
      ISSUE_UUID AS UUID
      FROM OLD_ISSUES_NUM t1
      WHERE DELETED_AT IS NULL $@1`
    };
    crud.querys["formated_relations"] = {
      read: `
      SELECT * FROM (
          SELECT 
          R.UUID, 
          R.ISSUE0_UUID CURRENT_UUID,
          R.DELETED_AT,
          RT.NAME TYPE_NAME,
          P.SHORT_NAME || '-' || I.NUM  ID,
          FV.value ISSUE_NAME,
          IST.IS_END ISSUE_RESOLVED
          FROM RELATIONS R
          LEFT JOIN RELATION_TYPES RT
          ON RT.UUID = R.TYPE_UUID
          LEFT JOIN ISSUES I 
          ON R.ISSUE1_UUID = I.UUID
          LEFT JOIN ISSUE_STATUSES IST
          ON I.STATUS_UUID = IST.UUID
          LEFT JOIN PROJECTS P
          ON P.UUID = I.PROJECT_UUID 
          LEFT JOIN FIELD_VALUES FV
          ON FV.FIELD_UUID = '${CONSTANTS.nameFieldUUID}'
          AND FV.ISSUE_UUID = I.UUID
          UNION
          SELECT 
          R.UUID, 
          R.ISSUE1_UUID CURRENT_UUID,
          R.DELETED_AT,
          RT.REVERT_NAME TYPE_NAME,
          P.SHORT_NAME || '-' || I.NUM  ID,
          FV.value ISSUE_NAME,
          IST.IS_END ISSUE_RESOLVED
          FROM RELATIONS R
          LEFT JOIN RELATION_TYPES RT
          ON RT.UUID = R.TYPE_UUID
          LEFT JOIN ISSUES I 
          ON R.ISSUE0_UUID = I.UUID
          LEFT JOIN ISSUE_STATUSES IST
          ON I.STATUS_UUID = IST.UUID
          LEFT JOIN PROJECTS P
          ON P.UUID = I.PROJECT_UUID 
          LEFT JOIN FIELD_VALUES FV
          ON FV.FIELD_UUID = '${CONSTANTS.nameFieldUUID}'
          AND FV.ISSUE_UUID = I.UUID
      ) T1 WHERE DELETED_AT IS NULL $@1
      LIMIT 50`
    };
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
    crud.querys["time_report"] = {
      read: `
        SELECT 
          T1.WORK_DATE,
          T1.DURATION,
          T1.COMMENT,
          I.NUM,
          P.SHORT_NAME,
          T1.CREATED_AT
        FROM TIME_ENTRIES T1
        JOIN ISSUES I
        ON I.UUID = T1.ISSUE_UUID
        JOIN PROJECTS P
        ON P.UUID = I.PROJECT_UUID
        WHERE T1.DELETED_AT IS NULL $@1`
    };
    crud.querys["issue_formated_actions"] = {
      read: `
        SELECT
        T1.UUID,
        T1.ISSUE_UUID,
        U.NAME AS AUTHOR,
        U.UUID AS AUTHOR_UUID,
        T1.VALUE,
        IAT.NAME,
        T1.CREATED_AT,
        T1.ARCHIVED_AT
      FROM ISSUE_ACTIONS T1
      JOIN ISSUE_ACTIONS_TYPES IAT
      ON T1.TYPE_UUID = IAT.UUID
      JOIN USERS U
      ON T1.AUTHOR_UUID = U.UUID
      WHERE T1.DELETED_AT IS NULL $@1`
    };
  },

  push_query: function (query0: any, params0: any, query1: any, params1: any, isRevert: boolean) {
    if (!query1) return [query0, params0];
    let query = Array.isArray(query0) ? [...query0] : (query0 ? [query0] : []);
    let params = Array.isArray(query0) ? [...params0] : (query0 ? [params0] : []);

    const q = Array.isArray(query1) ? [...query1] : (query1 ? [query1] : []);
    const p = Array.isArray(query1) ? [...params1] : (query1 ? [params1] : []);

    if (isRevert) {
      query = [...q, ...query];
      params = [...p, ...params];
    } else {
      query = [...query, ...q];
      params = [...params, ...p];
    }

    return [query, params];
  },

  concat_querys: function (query0: any, params0: any, query1: any, params1: any, middle: any) {
    if (Array.isArray(query0)) return [query0, params0];

    let query = query1;
    const params = [...params0, ...params1];
    for (let i = 0; i < params1.length; i++) {
      query = query.replace(`$${i + 1}`, `$${params.length}`);
    }
    query = `${query0}${middle}${query}`;

    return [query, params];
  },

  make_query: {
    read: function (tableName: string, params: any) {
      if (!tableName) return ["", []];

      let query = crud.querys[tableName]["read"];
      if ((tableName === "issues" && params.query) || tableName === "issues_count") {
        const userQuery = params.query ? decodeURIComponent(atob(params.query)) : 'TRUE';
        const filteredIssuesQuery = `WITH filtered_issues AS (
          SELECT * FROM
          (
          SELECT
            ISS.NUM,
            ISS.TITLE,
            ISS.DESCRIPTION,
            ISS.SPENT_TIME,
            ISS.TYPE_UUID,
            ISS.CREATED_AT,
            ISS.RESOLVED_AT,
            IA.UPDATED_AT,
            ISS.DELETED_AT,
            ISS.PROJECT_UUID,
            ISS.STATUS_UUID,
            ISS.SPRINT_UUID,
            IT.TAGS,
            ISSR.*
          FROM ISSUES ISS
          LEFT JOIN (
            SELECT 
            ISSUE_UUID,
            MAX(CREATED_AT) AS UPDATED_AT
            FROM ISSUE_ACTIONS
            GROUP BY ISSUE_UUID
            ) IA
          ON IA.ISSUE_UUID = ISS.UUID
          LEFT JOIN (
            SELECT 
              ISSUE_UUID,
              STRING_AGG(ISSUE_TAGS_UUID::text,',') AS TAGS
              FROM ISSUE_TAGS_SELECTED
              WHERE DELETED_AT IS NULL
              GROUP BY ISSUE_UUID) IT
          ON IT.ISSUE_UUID = ISS.UUID
          LEFT JOIN FIELD_VALUES_ROWS ISSR
          ON ISSR.uuid = ISS.uuid) I WHERE
          ${userQuery}) ${query}`;

        query = filteredIssuesQuery;
        delete params.query;
      } else if (tableName === "issues" || tableName === "issue") {
        query = `WITH filtered_issues AS (SELECT * FROM ISSUES) ${query}`;
      } else if (tableName === "time_report") {
        if (params.date_from) query += ` AND WORK_DATE >= '${params.date_from}'`;
        if (params.date_to) query += ` AND WORK_DATE <= '${params.date_to}'`;
        query += ` ORDER BY T1.WORK_DATE`;
      }

      if (!params || !params.length) return [query.replace("$@1", ""), []];

      const pgParams = [];
      let where = "";
      for (const i in params) {
        if (i === "offset") {
          query += ` OFFSET ${params[i]}`;
        } else if (i === "like") {
          query = query.replace("$@2", params[i]);
        } else {
          if (i !== 'date_from' && i !== 'date_to') {
            pgParams.push(params[i]);
            where += ` AND t1.${i}=$${pgParams.length}`;
          }
        }
      }
      return [query.replaceAll("$@1", where), pgParams];
    },

    delete: function (tableName: string, params: any) {
      console.log('create delete query from ', tableName);
      const query = crud.querys[tableName]["delete"];
      return [query.replace("$@1", `'${params.uuid}'`), []];
    },

    create: function (tableName: string, params: any) {
      if (!tableName) return ["", []];

      let query = crud.querys[tableName]["create"];
      let keys = "", values = "";
      const columns = data_model.model[tableName].columns;
      const pgParams = [];

      params.updated_at = "NOW()";

      for (const i in params) {
        if (!columns[i] || ["deleted_at", "password", "token", "token_created_at"].includes(i)) continue;
        if (keys) {
          keys += ", ";
          values += ", ";
        }

        keys += i;
        pgParams.push(params[i]);
        values += `$${pgParams.length}`;
      }

      query = query.replace("$@1", keys);
      query = query.replace("$@2", values);

      return [query, pgParams];
    },

    update: function (tableName: string, params: any) {
      if (!tableName || (tableName === 'field_values' && params.field_uuid === CONSTANTS.authorFieldUUID)) return ["", []];

      let query = crud.querys[tableName]["update"];
      query = query.replace("$@1", `'${params.uuid}'`);

      let set = "";
      const columns = data_model.model[tableName].columns;
      const pgParams = [];

      params.updated_at = "NOW()";

      for (const i in params) {
        if (!columns[i] || ["deleted_at", "password", "token", "token_created_at", "author_uuid"].includes(i)) continue;
        if (set) set += ", ";

        pgParams.push(params[i]);
        set += `${i}=$${pgParams.length}`;
      }

      query = query.replace("$@2", set);
      return [query, pgParams];
    },

    upsert: function (tableName: string, params: any) {
      if (!tableName) return ["", []];

      let [queryCreate, paramsCreate] = crud.make_query.create(tableName, params);
      if (queryCreate === '') return ["", []];

      let [queryUpdate, paramsUpdate] = crud.make_query.update(tableName, params);
      queryUpdate = queryUpdate.replace(tableName, "").split("WHERE")[0];

      if (!queryUpdate) queryUpdate = 'NOTHING';

      let [query, pgParams] = crud.concat_querys(queryCreate, paramsCreate, queryUpdate, paramsUpdate, " ON CONFLICT(uuid) DO ");

      if (tableName === "issues" && params.num === undefined) {
        [query, pgParams] = crud.push_query(query, pgParams, `UPDATE issues SET num = (SELECT COALESCE(MAX(num), 0) + 1 FROM ((SELECT uuid, project_uuid, num FROM issues) UNION (SELECT uuid, project_uuid, num FROM old_issues_num)) t WHERE project_uuid = $1 and uuid != $2) WHERE uuid = $3`, [params.project_uuid, params.uuid, params.uuid]);
        [query, pgParams] = crud.push_query(query, pgParams, `UPDATE issues SET status_uuid = (SELECT IST.uuid FROM issue_types IT JOIN workflow_nodes WN ON WN.workflows_uuid = IT.workflow_uuid JOIN issue_statuses IST ON IST.uuid = WN.issue_statuses_uuid AND IST.is_start = TRUE WHERE IT.uuid = $1 LIMIT 1) WHERE uuid = $2`, [params.type_uuid, params.uuid]);
      }

      let subqueries = "";
      let subparams: any[] = [];

      for (const i in params) {
        if (!params[i] || !params[i][0] || typeof params[i][0] !== "object") continue;
        for (const j in params[i]) {
          const child = params[i][j];
          if (["roles", "permissions"].includes(tableName) && child.table_name === 'permissions') continue;
          if (["users", "roles"].includes(tableName) && child.table_name === 'roles') continue;

          const [newSubquery, newSubparams] = crud.make_query.upsert(child.table_name, child);
          [subqueries, subparams] = crud.push_query(subqueries, subparams, newSubquery, newSubparams);
        }
      }

      return crud.push_query(query, pgParams, subqueries, subparams);
    }
  },

  get_query: function (method: string, tableName: string, params: any) {
    if (!tableName) return ["", []];

    let [query, pgParams] = crud.make_query[method](tableName, params);
    if (["update", "create", "upsert"].includes(method)) {
      const [readQuery, readParams] = crud.make_query.read(tableName, { uuid: params.uuid });
      [query, pgParams] = crud.push_query(query, pgParams, readQuery, readParams);
    }

    return [query, pgParams];
  },

  get_uuids: function (obj: any) {
    if (!obj.table_name) return null;

    let ans: any = {};
    if (obj.uuid) ans[obj.uuid] = obj.table_name;
    for (const i in obj) {
      if (!obj[i] || !obj[i][0] || !obj[i][0].uuid) continue;

      const fk = data_model.model[obj.table_name]["fk"];
      if (fk) {
        for (const k in fk) {
          for (const j in obj[fk[k]]) {
            ans[obj[fk[k]][j].uuid ?? obj[fk[k]][j]] = fk[k];
          }
        }
      }

      const fks = data_model.model[obj.table_name]["fks"];
      if (fks && fks.includes(obj[i][0].table_name)) {
        for (const j in obj[i]) {
          const chUuids = crud.get_uuids(obj[i][j]);
          if (chUuids === null) return null;
          ans = tools.obj_join(ans, chUuids);
        }
      }
    }
    return ans;
  },

  updateQueryWithProjectsPermissionsFilter: async function (subdomain: string, tableName: string, method: string, authorUUID: string, query: string, params: any, readedData: any) {
    let key = `w:${subdomain}:user:${authorUUID}:projects`;
    key += method === "read" ? '_r' : '_w';

    let projectsUUIDs = await cacheGet(key);
    if (projectsUUIDs && typeof projectsUUIDs === 'string') {
      projectsUUIDs = JSON.parse(projectsUUIDs);
    }

    if (!projectsUUIDs) projectsUUIDs = [];
    const projectsUUIDsArray = Array.isArray(projectsUUIDs) ? projectsUUIDs : [];

    if (method === "read") {
      const uuidsStr = `('${projectsUUIDsArray.join("','")}')`;
      if (tableName === "projects") query = query.replace('t1.deleted_at IS NULL', `t1.deleted_at IS NULL AND t1.uuid IN ${uuidsStr}`);
      else if (tableName === "issues") query = query.replace('T1.DELETED_AT IS NULL', `T1.DELETED_AT IS NULL AND T1.PROJECT_UUID IN ${uuidsStr}`);
      else if (tableName === "issues_count") query += ` AND PROJECT_UUID IN ${uuidsStr}`;
      else if (["short_issue_info", "short_issue_info_for_imort"].includes(tableName)) query = query.replace('I.DELETED_AT IS NULL', `I.DELETED_AT IS NULL AND I.PROJECT_UUID IN ${uuidsStr}`);
    } else {
      if (tableName === "projects" && !projectsUUIDsArray.includes(params.uuid)) return false;
      if (tableName === "issues" && !projectsUUIDsArray.includes(readedData.rows[0].project_uuid)) return false;
    }

    return query;
  },

  writeIssueHistory: function (query: any, pgParams: any, readedData: any, params: any, subdomain: string) {
    let statusText = '', typeUUID;
    const attrToCheck: any = { 'Тип': 'type_name', 'Проект': 'project_name', 'Спринт': 'sprint_name' };

    if (readedData.rows[0].status_uuid !== params.status_uuid) {
      statusText = `${readedData.rows[0].status_name}->${params.status_name}`;
      typeUUID = CONSTANTS.transitionTypeUUID;

      sql.query(subdomain, `
        UPDATE issues
        SET resolved_at = CASE
          WHEN status_uuid IN (SELECT uuid FROM issue_statuses WHERE is_end) THEN NOW()
          ELSE NULL
        END
        WHERE uuid = $1;
      `, [params.uuid]);
    } else {
      for (const i in attrToCheck) {
        if (params[attrToCheck[i]] === readedData.rows[0][attrToCheck[i]]) continue;
        statusText += `${i}: ${readedData.rows[0][attrToCheck[i]]}->${params[attrToCheck[i]]}\r\n`;
      }
      for (const i in params.values) {
        for (const j in readedData.rows[0].values) {
          if (params.values[i].uuid !== readedData.rows[0].values[j].uuid || params.values[i].value === readedData.rows[0].values[j].value) continue;
          statusText += `${params.values[i].label}: ${params.values[i].value}->${readedData.rows[0].values[j].value}\r\n`;
        }
      }
      typeUUID = CONSTANTS.editedTypeUUID;
    }

    const actionOptions = {
      value: statusText,
      issue_uuid: params.uuid,
      author_uuid: params.author_uuid,
      type_uuid: typeUUID,
      uuid: tools.uuidv4(),
    };

    const [iaQuery, iaParams] = crud.make_query.create("issue_actions", actionOptions);
    return crud.push_query(query, pgParams, iaQuery, iaParams);
  },

  do: async function (subdomain: string, method: string, tableName: string, params: any, authorUUID: string, isAdmin: boolean) {
    if (["issue", "board"].includes(tableName)) tableName += 's';

    let [query, pgParams] = crud.get_query(method, tableName, params);
    let readedData: any;

    if (method !== "read") {
      const [readQuery, readParams] = crud.make_query.read(tableName, { uuid: params.uuid });
      readedData = await sql.query(subdomain, readQuery, readParams);

      if (readedData.rows.length > 0) {
        if (tableName === "issues") [query, pgParams] = crud.writeIssueHistory(query, pgParams, readedData, params, subdomain);

        const oldUUIDs = crud.get_uuids(readedData.rows[0]);
        const newUUIDs = crud.get_uuids(params);

        if (oldUUIDs && newUUIDs) {
          let delQuery = "";
          for (const i in oldUUIDs) {
            if (newUUIDs[i]) continue;

            if (data_model.has_fk(tableName, oldUUIDs[i])) {
              delQuery += `DELETE FROM ${tableName}_to_${oldUUIDs[i]} WHERE ${oldUUIDs[i]}_uuid = '${i}' AND ${tableName}_uuid = '${params.uuid}';`;
            } else {
              delQuery += `${crud.get_query("delete", oldUUIDs[i], { uuid: i })[0]};`;
            }
          }

          for (const i in newUUIDs) {
            if (oldUUIDs[i] || !data_model.has_fk(tableName, newUUIDs[i])) continue;
            delQuery += `INSERT INTO ${tableName}_to_${newUUIDs[i]}(${newUUIDs[i]}_uuid, ${tableName}_uuid) VALUES('${i}', '${params.uuid}');`;
          }

          if (delQuery) {
            [query, pgParams] = crud.push_query([query, pgParams, delQuery], [[]], true);
          }
        }
      }
    }

    if (!isAdmin) {
      const updatedQuery = await crud.updateQueryWithProjectsPermissionsFilter(subdomain, tableName, method, authorUUID, query, params, readedData);
      if (!updatedQuery) return { message: 'forbidden' };
      query = updatedQuery;
    }

    const ans = await sql.query(subdomain, query, pgParams);
    return ans && ans[1] !== undefined ? ans[ans.length - 1] : ans;
  }
};

export default crud;
