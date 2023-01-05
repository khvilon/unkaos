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
const express = require('express');
const app = express();
const port = 3001;
var md5 = require('md5');
const data_1 = __importDefault(require("./data"));
const security_1 = __importDefault(require("./security"));
const checkSession = function (workspace, token) {
    if (data_1.default.sessions[workspace] == null)
        return null;
    let session = data_1.default.sessions[workspace][md5(token)];
    if (!session)
        return null;
    let user = data_1.default.users[workspace][session.user_uuid];
    if (!user)
        return null;
    return user;
};
const handleRequest = function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        let workspace = req.headers.subdomain;
        if (workspace == undefined || workspace == null || workspace == '') {
            res.status(400);
            res.send({ message: 'Необходим заголовок subdomain в качестве workspace' });
            return;
        }
        let request = req.url.split('/')[1];
        if (request == 'get_token') {
            let email = req.headers.email;
            let pass = req.headers.password;
            let token = yield security_1.default.newToken(workspace, email, pass);
            if (token == null) {
                res.status(401);
                res.send({ message: 'Не верное имя пользователя или пароль' });
                return;
            }
            res.send(token);
        }
        else {
            let token = req.headers.token;
            if (!token) {
                res.status(401);
                res.send({ message: 'Требуется токен авторизацмм' });
                return;
            }
            let user = checkSession(workspace, token);
            if (!user) {
                res.status(401);
                res.send({ message: 'Пользовательский токен не валиден' });
                return;
            }
            if (request == 'check_session')
                res.send(user);
            else if (request == 'upsert_password') {
                let params = req.body;
                if (user.uuid != params.user.uuid) {
                    res.status(403);
                    res.send({ message: 'Нельзя задавать пароль других пользователей' });
                    return;
                }
                yield security_1.default.setPassword(workspace, params.user, params.password);
            }
            else if (request == 'upsert_password_rand') {
                let params = req.body;
                yield security_1.default.updatePassword(workspace, params.user);
            }
        }
    });
};
app.get('/get_token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    handleRequest(req, res);
}));
app.get('/check_session', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    handleRequest(req, res);
}));
app.post('/upsert_password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    handleRequest(req, res);
}));
app.post('/upsert_password_rand', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    handleRequest(req, res);
}));
app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server running on port ${port}`);
}));
