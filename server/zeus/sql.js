"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("postgres"));
const tools_1 = __importDefault(require("../tools"));
const db_conf_json_1 = __importDefault(require("../db_conf.json"));
var sql = {};
let zeusDbConf = tools_1.default.obj_clone(db_conf_json_1.default);
//zeusDbConf.publications = 'zeus_publication'
sql.admin = (0, postgres_1.default)(zeusDbConf);
var workspaceSqls = {};
workspaceSqls['public'] = sql.admin;
workspaceSqls['admin'] = sql.admin;
const addWorkspaceSql = function (name, pass) {
    workspaceSqls[name] = (0, postgres_1.default)({
        user: name,
        password: pass,
        database: db_conf_json_1.default.database,
        host: db_conf_json_1.default.host,
        port: db_conf_json_1.default.port
    });
};
sql.init = function () {
    return __awaiter(this, void 0, void 0, function* () {
        let workspaces = yield sql.admin `SELECT * FROM admin.workspaces`;
        for (let i in workspaces) {
            addWorkspaceSql(workspaces[i].name, workspaces[i].pass);
        }
    });
};
sql.query = function (subdomain, query_arr, params_arr) {
    return __awaiter(this, void 0, void 0, function* () {
        if (workspaceSqls[subdomain] == undefined)
            return null;
        if (!Array.isArray(query_arr)) {
            query_arr = [query_arr];
            params_arr = [params_arr];
        }
        let ans;
        for (let i = 0; i < query_arr.length; i++) {
            let query = query_arr[i];
            let params = params_arr[i];
            console.log('sql', query, params);
            if (typeof query != 'string') {
                console.log('sql empty query', query + '', '!' + params + '!');
                continue;
            }
            try {
                if (params != undefined && params != null && params.length > 0)
                    ans = yield workspaceSqls[subdomain].unsafe(query, params);
                else
                    ans = yield workspaceSqls[subdomain].unsafe(query);
            }
            catch (e) {
                console.log('sql error', e, query, params);
                ans = { error: 'Ошибка запроса в БД', http_code: 400 };
            }
        }
        return { rows: ans };
    });
};
exports.default = sql;
