import postgres = require('postgres');
import tools from "/app/server/tools";

let dbConf: any;

try {
  const dbConfFile = require('../db_conf.json');
  dbConf = dbConfFile;
} catch (error) {
  dbConf = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  };
}

let hermesDbConf = structuredClone(dbConf)
hermesDbConf.publications = 'hermes_publication'

export const sql : postgres.Sql = postgres(hermesDbConf)