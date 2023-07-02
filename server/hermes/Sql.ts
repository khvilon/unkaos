import postgres = require('postgres');
import tools from "../tools";
import dbConf from '../db_conf.json';

let hermesDbConf = tools.obj_clone(dbConf)
hermesDbConf.publications = 'hermes_publication'

export const sql : postgres.Sql = postgres(hermesDbConf)