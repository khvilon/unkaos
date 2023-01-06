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
const fs = require('fs');
var sql = require('./sql');
var data_model = require('./data_model');
var crud = require('./crud');
var security = require('./security');
const cors = require('cors');
const express = require('express');
var tools = require('../tools');
var ws = require('./web_socket');
const app = express();
const port = 3006;
const comment_type_uuid = 'f53d8ecc-c26e-4909-a070-5c33e6f7a196';
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
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        yield sql.init();
        yield crud.load();
        app.post('/upsert_watcher', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let subdomain = req.headers.subdomain;
            if (subdomain == undefined || subdomain == null || subdomain == '') {
                res.status(400);
                res.send({ message: 'need subdomain to use workspace' });
                return;
            }
            let token = req.headers.token;
            let user = yield security.check_token(subdomain, token);
            if (user == null) {
                res.status(401);
                res.send({ message: 'wrong token' });
                return;
            }
            let issue_uuid = req.body.issue_uuid;
            let ans = yield sql.query(subdomain, `INSERT INTO watchers SET (user_uuid, issue_uuid) VALUES('` + user.uuid + `','` + issue_uuid + `') ON CONFLICT DO NOTHING`);
            res.send(ans);
        }));
        app.delete('/delete_watcher', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let subdomain = req.headers.subdomain;
            let token = req.headers.token;
            let user = yield security.check_token(subdomain, token);
            if (user == null) {
                res.status(401);
                res.send({ message: 'wrong token' });
                return;
            }
            let issue_uuid = req.body.issue_uuid;
            let ans = yield sql.query(subdomain, `DELETE FROM watchers WHERE user_uuid = '` + user.uuid + `' AND issue_uuid = '` + issue_uuid + `'`);
            res.send(ans);
        }));
        app.get('/read_watcher', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let subdomain = req.headers.subdomain;
            let token = req.headers.token;
            let user = yield security.check_token(subdomain, token);
            if (user == null) {
                res.status(401);
                res.send({ message: 'wrong token' });
                return;
            }
            let issue_uuid = req.query.issue_uuid;
            let ans = yield sql.query(subdomain, `SELECT * FROM watchers WHERE user_uuid = '` + user.uuid + `' AND issue_uuid = '` + issue_uuid + `'`);
            res.send(ans);
        }));
        app.get('/read_listeners', (req, res) => __awaiter(this, void 0, void 0, function* () {
            res.send(listeners);
        }));
        for (let table in crud.querys) {
            for (let method in crud.querys[table]) {
                console.log('add ', method);
                let func_name = method + '_' + table;
                console.log('d', dict[method]);
                listeners.push({ "method": dict[method], "func": func_name });
                app[dict[method]]('/' + func_name, (req, res) => __awaiter(this, void 0, void 0, function* () {
                    let req_uuid = tools.uuidv4();
                    let req_values = [req_uuid, req.method, req.url, JSON.stringify(req.headers), JSON.stringify(req.body)];
                    sql.query('admin', `INSERT INTO admin.logs_incoming (uuid, method, url, headers, body) VALUES($1,$2,$3,$4,$5)`, req_values);
                    //console.log(req)
                    let params = req.query;
                    let subdomain = req.headers.subdomain;
                    if (subdomain == undefined || subdomain == null || subdomain == '') {
                        res.status(400);
                        res.send({ message: 'need subdomain to use workspace' });
                        return;
                    }
                    /*
                    let token = req.headers.token
    
                    let user = await security.check_token(subdomain, token)
    
                    if(user == null)
                    {
                        res.status(401);
                        res.send({message: 'wrong token'});
                        return
                    }
    
                    
    
                    console.log('checked user ', user.name, user.login, user.mail)*/
                    let [method, table_name] = tools.split2(func_name, '_');
                    if (method != 'read')
                        params = req.body;
                    console.log('ss', subdomain);
                    if (table_name == 'issue_actions') {
                        params.type_uuid = comment_type_uuid;
                    }
                    //todo back
                    /*if((method!='read' || table_name == 'favourites') && method!='delete') params.author_uuid = user.uuid;
    
                    if(params.values != undefined)
                    {
                        for(let i in params.values)
                        {
                            if(params.values[i].label == 'Автор' && params.values[i].value == '')
                            {
                                params.values[i].value = user.uuid
                            }
                        }
                    }*/
                    console.log('ppppppp', params, table_name);
                    let ans = yield crud.do(subdomain, method, table_name, params);
                    if (ans.rows == undefined) {
                        res.status(ans.http_code != undefined ? ans.http_code : '400');
                    }
                    //add log
                    //todo back
                    /*if(method!='read')
                    {
                        let params_str = '' //JSON.stringify(params)
                        let req_done_values= [req_uuid,  user.uuid, table_name, method, params.uuid, params_str]
                        sql.query(subdomain, `INSERT INTO logs_done (uuid, user_uuid, table_name, method, target_uuid, parameters) VALUES($1,$2,$3,$4,$5,$6)`,req_done_values)
                    }
    
                    //add watcher
                    if(method!='read' && table_name == 'issue')
                    {
                        sql.query(subdomain, `INSERT INTO watchers (user_uuid, issue_uuid) VALUES('` + user.uuid + "','" + params.uuid + `') ON CONFLICT DO NOTHING`)
                    }
                    */
                    res.send(ans);
                }));
            }
        }
        app.listen(port, () => __awaiter(this, void 0, void 0, function* () {
            console.log(`Server running on port ${port}`);
        }));
    });
}
init();
