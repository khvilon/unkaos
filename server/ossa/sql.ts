const postgres = require('postgres') 
import tools from "../tools";

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

console.log('dbConf', dbConf)

let ossaDbConf = tools.obj_clone(dbConf)
ossaDbConf.publications = 'ossa_publication'

const sql = postgres(ossaDbConf)

export default sql
