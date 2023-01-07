"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dbLoger = {};
const sql_1 = __importDefault(require("./sql"));
dbLoger.writeLogIncoming = function (reqUuid, req) {
    sql_1.default.admin `INSERT INTO admin.logs_incoming (uuid, method, url, headers, body) 
    VALUES(${reqUuid},${req.method},${req.url},${JSON.stringify(req.headers)},${JSON.stringify(req.body)})`;
};
dbLoger.writeLogDone = function (workspace, reqUuid, userUuid, tableName, method, targetUuid, params) {
    sql_1.default.admin `INSERT INTO ${(0, sql_1.default)(workspace) + '.logs_done'} (uuid, user_uuid, table_name, method, target_uuid, parameters) 
    VALUES(${reqUuid},${userUuid},${tableName},${method},${targetUuid},${JSON.stringify(params)})`;
};
exports.default = dbLoger;
