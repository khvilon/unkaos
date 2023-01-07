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
const axios_1 = __importDefault(require("axios"));
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3001;
const zeus_url = 'http://127.0.0.1:3006';
const cerberus_url = 'http://127.0.0.1:3005';
app.use(cors());
app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.raw({ limit: '150mb' }));
app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const zeus_listeners = yield axios_1.default.get(zeus_url + '/read_listeners');
        for (let i = 0; i < zeus_listeners.data.length; i++) {
            let method = zeus_listeners.data[i].method;
            let func = zeus_listeners.data[i].func;
            app[method]('/' + func, (req, res) => __awaiter(this, void 0, void 0, function* () {
                //console.log(req)
                req.headers.request_function = func;
                //console.log(req.headers)
                let cerberus_ans = yield (0, axios_1.default)({
                    method: 'get',
                    url: cerberus_url + '/check_session',
                    headers: req.headers
                });
                if (cerberus_ans.status != 200) {
                    res.status(cerberus_ans.status);
                    res.send(cerberus_ans.data);
                    return;
                }
                //console.log('cerberus_ans.data', cerberus_ans.data)
                req.headers.user_uuid = cerberus_ans.data.uuid;
                // req.headers.user_name = cerberus_ans.data.name
                let zeus_ans = yield (0, axios_1.default)({
                    method: method,
                    url: zeus_url + req.url,
                    headers: { subdomain: req.headers.subdomain, user_uuid: cerberus_ans.data.uuid }
                });
                res.status(zeus_ans.status);
                res.send(zeus_ans.data);
            }));
        }
        app.listen(port, () => __awaiter(this, void 0, void 0, function* () {
            console.log(`Gateway running on port ${port}`);
        }));
    });
}
init();
