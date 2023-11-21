import sql from "./sql";

import cors from 'cors';

import express from "express";
import tools from "../tools";

import axios from "axios";

import fs from 'fs/promises';

const app:any = express();
const port = 5001;

app.use(cors());
app.use(express.json({limit: '1mb'}));
app.use(express.raw({limit: '1mb'}));
app.use(express.urlencoded({limit: '1mb', extended: true}));

let readWorkspaceRequest = async function(uuid: String){
    let ans = await sql`SELECT 
        workspace,
        email,
        status,
        created_at,
        updated_at,
        deleted_at
        FROM admin.workspace_requests 
        WHERE deleted_at IS NULL AND uuid = ${uuid}
        LIMIT 1`

    if(!ans) return null
    return ans[0]
}

let checkWorkspaceExists = async function(workspace: String){
    let ans = await sql`SELECT EXISTS (
        SELECT 1 
        FROM information_schema.schemata 
        WHERE schema_name = ${workspace}
    );
    `

    console.log("check", ans)
    if(!ans) return true
    return ans[0].exists
}

const sqlPath = '../db/';
let execModifSqlFile = async function(file: string, name: string, workspace: string){
    let sqlFileContent = await fs.readFile(sqlPath + file, 'utf-8');
    let sqlFileContentStr = sqlFileContent.replaceAll(name, workspace);
    await sql.unsafe(sqlFileContentStr);
}

let createWorkspace = async function(workspace: string){
    
    await execModifSqlFile('-public.sql', 'public', workspace)
    await execModifSqlFile('-workspace.sql', 'test', workspace)
    
    let files = await fs.readdir(sqlPath)

    files = files.filter(file=>file.endsWith('_m.sql')).sort()

    for(let i = 0; i < files.length; i++){
        await execModifSqlFile(files[i], 'public', workspace)
    }
}

const init = async function() {
 
    app.post('/upsert_workspace_requests', async (req:any, res:any) => {   
        let workspace = req.body.workspace
        let email = req.body.email
        let ans

        let exists = await checkWorkspaceExists(workspace)

        if(!exists){
            let uuid = tools.uuidv4()
            ans = await sql`INSERT INTO admin.workspace_requests(uuid, workspace, email) VALUES (${uuid}, ${workspace}, ${email})`
            if(!ans){
                res.send({ status: -1 });
                return
            } 
        }
        else {
            res.send({ status: -2 });
            return
        } 

        res.send({ status: 0 });

        const hermes_answer = await axios({
            method: "post",
            url: "http://127.0.0.1:5009/send",
            data: {
            transport: "email",
            recipient: email,
            title: "Unkaos - " + workspace,
            body: "Для подтверждения почты пройдите по ссылке: "
            }
        })
    })

    app.get('/read_workspace_requests', async (req:any, res:any) => {
        let uuid = req.query.uuid

        let ans: any = await readWorkspaceRequest(uuid)

        if(!ans) {
            res.send({ status: -1 });
            return;
        }

        console.log("ans", ans)

        let exists = await checkWorkspaceExists(ans.workspace)

        if(exists){
            res.send({ status: -2 });
            return;
        }

        await createWorkspace(ans.workspace)
        await sql`UPDATE admin.workspace_requests SET status = 2 WHERE uuid = ${uuid}`
        
        res.send({ status: 2, workspace: ans.workspace });
    })

    app.listen(port, async () => {
        console.log(`Eileithyia running on port ${port}`)
    })
}
    
init()