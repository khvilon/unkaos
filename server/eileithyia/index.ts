import sql from "./sql";

import cors from 'cors';

import express from "express";
import tools from "../tools";

const app:any = express();
const port = 3006;

app.use(cors());
app.use(express.json({limit: '1mb'}));
app.use(express.raw({limit: '1mb'}));
app.use(express.urlencoded({limit: '1mb', extended: true}));

const init = async function() {
 
    app.post('/upsert_workspace_requests', async (req:any, res:any) => {   
        let workspace = req.body.workspace
        let email = req.body.email
        let uuid = tools.uuidv4()

        let ans = await sql`INSERT INTO admin.workspace_requests(uuid, workspace, email) VALUES (${uuid}, ${workspace}, ${email})`
        
        res.send(ans)
    })

    app.get('/read_workspace_requests', async (req:any, res:any) => {
        let uuid = req.query.uuid

        let ans = await sql`SELECT 
        workspace,
        email,
        status,
        created_at,
        updated_at,
        deleted_at
        FROM admin.workspace_requests T1
        WHERE deleted_at IS NULL AND uuid = ${uuid}
        LIMIT 1`
        

        res.send(ans)
    })

    app.listen(port, async () => {
        console.log(`Eileithyia running on port ${port}`)
    })
}
    
init()