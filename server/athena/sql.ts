const postgres = require('postgres') 
import dbConf from '../db_conf.json';

const sql = postgres(dbConf)

export default sql