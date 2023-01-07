"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres = require('postgres');
const tools_1 = __importDefault(require("../tools"));
const db_conf_json_1 = __importDefault(require("../db_conf.json"));
let cerberusDbConf = tools_1.default.obj_clone(db_conf_json_1.default);
cerberusDbConf.publications = 'cerberus_publication';
const sql = postgres(cerberusDbConf);
exports.default = sql;
