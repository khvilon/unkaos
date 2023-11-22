"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const postgres = require('postgres');
let dbConf;
try {
    const dbConfFile = require('../db_conf.json');
    dbConf = dbConfFile;
}
catch (error) {
    dbConf = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    };
}
const sql = postgres(dbConf);
exports.default = sql;
