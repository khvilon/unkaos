const postgres = require('postgres') 

let athenaDbConf: any;

try {
  const dbConfFile = require('../db_conf.json');
  athenaDbConf = dbConfFile;
} catch (error) {
  athenaDbConf = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  };
}

athenaDbConf.publications = 'hermes_publication'
const sql = postgres(athenaDbConf)

export default sql