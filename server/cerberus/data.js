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
var data = {};
const sql_1 = __importDefault(require("./sql"));
const tokenExpirationTimeSec = 30 * 60 * 60 * 24; //30 days
const checkExpiredInterval = 60 * 1000; //1 minute, ms
data.workspaces = [];
data.sessions = {};
data.users = {};
const getWorkspaces = function () {
    return __awaiter(this, void 0, void 0, function* () {
        let ans = yield (0, sql_1.default) `    
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN 
        ('pg_toast', 'pg_catalog', 'information_schema', 'admin', 'public')`;
        if (ans == null || ans.length < 1)
            return [];
        let workspaces = ans.map((r) => r.schema_name);
        return workspaces;
    });
};
const getWorkspaceUsers = function (workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        const ans = yield (0, sql_1.default) `
        SELECT 
            U.uuid,
            U.name,
            U.login,
            U.mail,
            U.telegram
        FROM ${(0, sql_1.default)(workspace + '.users')} U
        WHERE U.active AND U.deleted_at IS NULL
        `;
        let workspaceUsers = {};
        for (let i = 0; i < ans.length; i++) {
            workspaceUsers[ans[i].uuid] = ans[i];
        }
        return workspaceUsers;
    });
};
const getWorkspaceSessions = function (workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        const ans = yield (0, sql_1.default) `
            SELECT 
                US.user_uuid,
                US.token,
                US.created_at AS token_created_at
            FROM ${(0, sql_1.default)(workspace + '.user_sessions')} US
            LEFT JOIN ${(0, sql_1.default)(workspace + '.users')} U
            ON US.user_uuid = U.uuid
            WHERE U.active AND U.deleted_at IS NULL AND 
            US.created_at + ${tokenExpirationTimeSec} * interval '1 second' > NOW() 
            `;
        let workspaceSessions = {};
        for (let i = 0; i < ans.length; i++) {
            ans[i].expires_at = new Date(Date.parse(ans[i].token_created_at) + tokenExpirationTimeSec * 1000);
            workspaceSessions[ans[i].token] = ans[i];
        }
        return workspaceSessions;
    });
};
const init = function () {
    return __awaiter(this, void 0, void 0, function* () {
        let workspaces = yield getWorkspaces();
        let users = {};
        for (let i = 0; i < workspaces.length; i++) {
            users[workspaces[i]] = yield getWorkspaceUsers(workspaces[i]);
        }
        data.users = users;
        let sessions = {};
        for (let i = 0; i < workspaces.length; i++) {
            sessions[workspaces[i]] = yield getWorkspaceSessions(workspaces[i]);
        }
        data.sessions = sessions;
    });
};
init();
const checkExpired = function () {
    let now = new Date();
    for (let workspace in data.sessions) {
        for (let token in data.sessions[workspace]) {
            if (data.sessions[workspace][token].expires_at < now)
                data.sessions[workspace][token] = undefined;
        }
    }
    setTimeout(checkExpired, checkExpiredInterval);
};
checkExpired();
const handleNotify = function (row, { command, relation, key, old }) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log('test_alert', row, command, relation, key, old)
        if (relation.table == 'user_sessions' && command == 'insert') {
            row.expires_at = new Date(Date.parse(row.created_at) + tokenExpirationTimeSec * 1000);
            data.sessions[relation.schema][row.token] = row;
        }
        else if (relation.table == 'users') {
            data.users[relation.schema] = yield getWorkspaceUsers(relation.schema);
        }
        else if (relation.table == 'user_sessions') {
            data.user_sessions[relation.schema] = yield getWorkspaceSessions(relation.schema);
        }
    });
};
const handleSubscribeConnect = function () {
    console.log('subscribe connected!');
};
sql_1.default.subscribe('*', handleNotify, handleSubscribeConnect);
exports.default = data;
