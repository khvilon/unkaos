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
var security = {};
const tools_1 = __importDefault(require("../tools"));
const sql_1 = __importDefault(require("./sql"));
var jwt = require('jsonwebtoken');
const key = 'shhhhh';
security.newToken = function (workspace, email, pass) {
    return __awaiter(this, void 0, void 0, function* () {
        let users = yield (0, sql_1.default) `SELECT * FROM  ${(0, sql_1.default)(workspace + '.users')}  WHERE 
        mail=${email} AND 
        password = MD5(${pass}) AND deleted_at IS NULL AND active`;
        if (!users || users.length != 1)
            return null;
        let user_data = { uuid: users[0].uuid };
        let token = jwt.sign(user_data, key);
        let ans = yield (0, sql_1.default) `INSERT INTO  ${(0, sql_1.default)(workspace + '.user_sessions')} (uuid, user_uuid, token) 
        values( ${tools_1.default.uuidv4()}, ${users[0].uuid}, MD5(${token}))`;
        return { user_token: token, profile: users[0] };
    });
};
security.setPassword = function (workspace, user, newPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, sql_1.default) `UPDATE  ${(0, sql_1.default)(workspace + '.users')} SET password = MD5(${newPassword}) WHERE uuid=${user.uuid}`;
    });
};
const generateRandomPassword = function () {
    const pass_chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const pass_len = 12;
    let password = '';
    for (var i = 0; i <= pass_len; i++) {
        let rand_num = Math.floor(Math.random() * pass_chars.length);
        password += pass_chars.substring(rand_num, rand_num + 1);
    }
    return password;
};
security.updatePassword = function (workspace, user) {
    return __awaiter(this, void 0, void 0, function* () {
        security.setPassword(workspace, user, generateRandomPassword());
    });
};
exports.default = security;
