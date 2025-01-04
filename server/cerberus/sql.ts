const postgres = require('postgres') 
import logger from '../server/common/logging';
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

logger.debug('Database configuration:', dbConf);
let cerberusDbConf = structuredClone(dbConf)
cerberusDbConf.publications = 'cerberus_publication'

const sql = postgres(cerberusDbConf)

export default sql
