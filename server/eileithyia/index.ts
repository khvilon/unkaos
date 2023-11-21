import sql from "./sql";

import cors from 'cors';

import express from "express";
import tools from "../tools";

import axios from "axios";

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
        WHERE schema_name = ${String}
    );
    `

    console.log("check", ans)
    if(!ans) return true
    return ans[0].exists
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
        return

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

        let ans: any = readWorkspaceRequest(uuid)

        if(!ans) {
            res.send({ status: -1 });
            return;
        }

        let exists = await checkWorkspaceExists(ans[0].workspace)

        if(exists){
            res.send({ status: -2 });
            return;
        }

        //todo create workspace
        sql`UPDATE admin.workspace_request SET status = 2 WHERE uuid = ${uuid}`
        
        res.send({ status: 2 });
    })

    app.listen(port, async () => {
        console.log(`Eileithyia running on port ${port}`)
    })
}
    
init()