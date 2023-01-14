const postgres = require('postgres') 
import tools from "../tools";
import dbConf from '../db_conf.json';

let ossaDbConf = tools.obj_clone(dbConf)
ossaDbConf.publications = 'ossa_publication'

const sql = postgres(ossaDbConf)

export default sql