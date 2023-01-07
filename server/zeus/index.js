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
const db_loger_1 = __importDefault(require("./db_loger"));
const sql_1 = __importDefault(require("./sql"));
const crud_1 = __importDefault(require("./crud"));
const cors = require('cors');
const express = require('express');
const tools_1 = __importDefault(require("../tools"));
const app = express();
const port = 3006;
var bodyParser = require('body-parser');
const dict = {
    read: 'get',
    create: 'post',
    update: 'put',
    delete: 'delete',
    upsert: 'post'
};
var listeners = [];
app.use(cors());
app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.raw({ limit: '150mb' }));
app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));
const handleRequest = function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        let req_uuid = tools_1.default.uuidv4();
        db_loger_1.default.writeLogIncoming(req_uuid, req);
        let func_name = req.url.split('/')[1].split('?')[0];
        let [method, table_name] = tools_1.default.split2(func_name, '_');
        let subdomain = req.headers.subdomain;
        let params = req.query;
        if (method != 'read')
            params = req.body;
        if ((method != 'read' || table_name == 'favourites') && method != 'delete')
            params.author_uuid = req.headers.user_uuid;
        if (params.values != undefined) {
            for (let i in params.values) {
                if (params.values[i].label == 'Автор' && params.values[i].value == '') {
                    params.values[i].value = req.headers.user_uuid;
                }
            }
        }
        let ans = yield crud_1.default.do(subdomain, method, table_name, params, req.headers.user_uuid);
        if (ans.rows == undefined) {
            res.status(ans.http_code != undefined ? ans.http_code : '400');
        }
        if (method != 'read')
            db_loger_1.default.writeLogDone(subdomain, req_uuid, req.headers.user_uuid, table_name, method, params.uuid, params);
        //add watcher
        if (method != 'read' && table_name == 'issue') {
            sql_1.default.query(subdomain, `INSERT INTO watchers (user_uuid, issue_uuid) VALUES('` + req.headers.user_uuid + "','" + params.uuid + `') ON CONFLICT DO NOTHING`);
        }
        res.send(ans);
    });
};
const init = function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield sql_1.default.init();
        yield crud_1.default.load();
        app.post('/upsert_watcher', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let subdomain = req.headers.subdomain;
            let issue_uuid = req.body.issue_uuid;
            let ans = yield sql_1.default.query(subdomain, `INSERT INTO watchers SET (user_uuid, issue_uuid) VALUES('` + req.headers.user_uuid + `','` + issue_uuid + `') ON CONFLICT DO NOTHING`);
            res.send(ans);
        }));
        app.delete('/delete_watcher', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let subdomain = req.headers.subdomain;
            let issue_uuid = req.body.issue_uuid;
            let ans = yield sql_1.default.query(subdomain, `DELETE FROM watchers WHERE user_uuid = '` + req.headers.user_uuid + `' AND issue_uuid = '` + issue_uuid + `'`);
            res.send(ans);
        }));
        app.get('/read_watcher', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let subdomain = req.headers.subdomain;
            let issue_uuid = req.body.issue_uuid;
            let ans = yield sql_1.default.query(subdomain, `SELECT * FROM watchers WHERE user_uuid = '` + req.headers.user_uuid + `' AND issue_uuid = '` + issue_uuid + `'`);
            res.send(ans);
        }));
        app.get('/read_listeners', (req, res) => __awaiter(this, void 0, void 0, function* () {
            res.send(listeners);
        }));
        for (let table in crud_1.default.querys) {
            for (let method in crud_1.default.querys[table]) {
                let func_name = method + '_' + table;
                listeners.push({ "method": dict[method], "func": func_name });
                app[dict[method]]('/' + func_name, handleRequest);
            }
        }
        app.listen(port, () => __awaiter(this, void 0, void 0, function* () {
            console.log(`Zeus running on port ${port}`);
        }));
    });
};
init();
