const postgres = require('postgres') 
const tools = require('../tools')
import dbConf from '../db_conf.json';

let cerberusDbConf = tools.obj_clone(dbConf)
cerberusDbConf.publications = 'cerberus_publication'

const sql = postgres(cerberusDbConf) 

export default sql