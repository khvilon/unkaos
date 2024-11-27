import postgres from 'postgres';
import { logger } from './logger';
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

logger.debug({ 
    host: dbConf.host,
    port: dbConf.port,
    user: dbConf.user,
    database: dbConf.database
}, 'Database configuration');

const sqlModule = {
    admin: null as any,
    sql: (strings: TemplateStringsArray | string, ...values: any[]) => {
        if (typeof strings === 'string') {
            return strings;
        }
        return sqlModule.admin(strings, ...values);
    },
    addWorkspaceSql(name: string, pass: string) {
        let workspaceDbConf = tools.obj_clone(dbConf);
        workspaceDbConf.password = pass;
        workspaceDbConf.user = name;
        this[name] = postgres(workspaceDbConf);
    },
    init() {
        let workspaces = ['public'];
        for (let workspace of workspaces) {
            this.addWorkspaceSql(workspace, dbConf.password);
        }
    },
    query(subdomain: string, query_arr: any, params_arr: any) {
        return this[subdomain](query_arr, params_arr);
    }
};

let cerberusDbConf = tools.obj_clone(dbConf);
cerberusDbConf.publications = 'cerberus_publication';
sqlModule.admin = postgres(cerberusDbConf);

sqlModule.init();

export default sqlModule;
