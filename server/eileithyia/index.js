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
const sql_1 = __importDefault(require("./sql"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const tools_1 = __importDefault(require("../tools"));
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const app = (0, express_1.default)();
const port = 5001;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.raw({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ limit: '1mb', extended: true }));
let readWorkspaceRequest = function (uuid) {
    return __awaiter(this, void 0, void 0, function* () {
        let ans = yield (0, sql_1.default) `SELECT 
        workspace,
        email,
        status,
        created_at,
        updated_at,
        deleted_at
        FROM admin.workspace_requests 
        WHERE deleted_at IS NULL AND uuid = ${uuid}
        LIMIT 1`;
        if (!ans)
            return null;
        return ans[0];
    });
};
let checkWorkspaceExists = function (workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        let ans = yield (0, sql_1.default) `SELECT EXISTS (
        SELECT 1 
        FROM information_schema.schemata 
        WHERE schema_name = ${workspace}
    );
    `;
        console.log("check", ans);
        if (!ans)
            return true;
        return ans[0].exists;
    });
};
const sqlPath = '../db/';
let execModifSqlFile = function (file, name, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        let sqlFileContent = yield promises_1.default.readFile(sqlPath + file, 'utf-8');
        let sqlFileContentStr = sqlFileContent.replaceAll(name, workspace);
        yield sql_1.default.unsafe(sqlFileContentStr);
    });
};
let createWorkspace = function (workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        yield execModifSqlFile('-public.sql', 'public', workspace);
        yield execModifSqlFile('-workspace.sql', 'test', workspace);
        let files = yield promises_1.default.readdir(sqlPath);
        files = files.filter(file => file.endsWith('_m.sql')).sort();
        for (let i = 0; i < files.length; i++) {
            yield execModifSqlFile(files[i], 'public', workspace);
        }
    });
};
const init = function () {
    return __awaiter(this, void 0, void 0, function* () {
        app.post('/upsert_workspace_requests', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let workspace = req.body.workspace;
            let email = req.body.email;
            let ans;
            let exists = yield checkWorkspaceExists(workspace);
            if (!exists) {
                let uuid = tools_1.default.uuidv4();
                ans = yield (0, sql_1.default) `INSERT INTO admin.workspace_requests(uuid, workspace, email) VALUES (${uuid}, ${workspace}, ${email})`;
                if (!ans) {
                    res.send({ status: -1 });
                    return;
                }
            }
            else {
                res.send({ status: -2 });
                return;
            }
            res.send({ status: 0 });
            const hermes_answer = yield (0, axios_1.default)({
                method: "post",
                url: "http://127.0.0.1:5009/send",
                data: {
                    transport: "email",
                    recipient: email,
                    title: "Unkaos - " + workspace,
                    body: "Для подтверждения почты пройдите по ссылке: "
                }
            });
        }));
        app.get('/read_workspace_requests', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let uuid = req.query.uuid;
            let ans = yield readWorkspaceRequest(uuid);
            if (!ans) {
                res.send({ status: -1 });
                return;
            }
            console.log("ans", ans);
            let exists = yield checkWorkspaceExists(ans.workspace);
            if (exists) {
                res.send({ status: -2 });
                return;
            }
            yield createWorkspace(ans.workspace);
            yield (0, sql_1.default) `UPDATE admin.workspace_requests SET status = 2 WHERE uuid = ${uuid}`;
            res.send({ status: 2, workspace: ans.workspace });
        }));
        app.listen(port, () => __awaiter(this, void 0, void 0, function* () {
            console.log(`Eileithyia running on port ${port}`);
        }));
    });
};
init();
