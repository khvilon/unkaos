import sql from "./sql";

import cors from 'cors';

import express from "express";
import tools from "../tools";

import axios from "axios";

import fs from 'fs/promises';

const app:any = express();
const port = 5001;


app.use(express.json({limit: '1mb'}));
app.use(express.raw({limit: '1mb'}));
app.use(express.urlencoded({limit: '1mb', extended: true}));


app.use(cors({origin: '*'}));

let generatePassword = function(): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 8;
    let password = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }

    return password;
}

let readWorkspaceRequest = async function(uuid: String){
    let ans = await sql`SELECT 
        workspace,
        email,
        status,
        pass,
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
let execModifSqlFile = async function(file: string, name: string, workspace: string, email: string, pass: string){
    let sqlFileContent = await fs.readFile(file, 'utf-8');
    let sqlFileContentStr = sqlFileContent.replaceAll(name + '.', workspace + '.')
    .replaceAll(name + ' ', workspace + ' ').replaceAll(name + ';', workspace + ';')
    .replaceAll(name + '_', workspace + '_').replaceAll(name + "'", workspace + "'")
    .replaceAll('root@unkaos.org', email).replaceAll('rootpass', pass);
    await sql.unsafe(sqlFileContentStr);
}

let createWorkspace = async function(workspace: string, email: string, pass: string){
    
    await execModifSqlFile('../db/-public.sql', 'public', workspace, email, pass)
    await execModifSqlFile('../db/-workspace.sql', 'server', workspace, email, pass)
    
    let files = await fs.readdir(sqlPath)

    files = files.filter(file=>file.endsWith('_m.sql')).sort()

    for(let i = 0; i < files.length; i++){
        await execModifSqlFile(sqlPath + files[i], 'public', workspace, email, pass)
    }
}

const init = async function() {
 
    app.post('/upsert_workspace_requests', async (req:any, res:any) => {   
        let workspace = req.body.workspace
        let email = req.body.email
        let uuid = tools.uuidv4()
        
        let ans

        let exists = await checkWorkspaceExists(workspace)

        let pass = generatePassword()

        if(!exists){
            
            ans = await sql`INSERT INTO admin.workspace_requests(uuid, workspace, email, pass) 
            VALUES (${uuid}, ${workspace}, ${email}, ${pass})`
            if(!ans){
                res.send({ status: -1 });
                return
            } 
        }
        else {
            res.send({ status: -2 });
            return
        }


        const hermes_answer = await axios({
            method: "post",
            url: "http://hermes:5009/send",
            data: {
                transport: "email",
                recipient: email,
                title: "Подтверждение регистрации в Unkaos - " + workspace,
                body: `
                    <html>
                    <body>
                        <p>Здравствуйте,</p>
                        <p>Благодарим вас за регистрацию в Unkaos. Для завершения регистрации, пожалуйста, подтвердите свой адрес электронной почты.</p>
                        <p><a href='https://${process.env.DOMAIN}/register/${uuid}'>Нажмите здесь, чтобы активировать вашу учетную запись</a></p>
                        <p>Ваш временный пароль для входа: <strong>${pass}</strong></p>
                        <p>После входа в систему рекомендуем вам изменить этот временный пароль.</p>
                        <br>
                        <p>Для последующего входа в ваше рабочее пространство используте:</p> 
                        <p><a href='https://${process.env.DOMAIN}/${workspace}/login'>https://${process.env.DOMAIN}/${workspace}/login</a></p>
                        <p>Если вы авторизованы, ваши задачи доступны по ссылке:</p>
                        <p><a href='https://${process.env.DOMAIN}/${workspace}/issues'>https://${process.env.DOMAIN}/${workspace}/issues</a></p>
                        <br>
                        <p>С уважением,<br/>Команда Unkaos</p>
                    </body>
                    </html>`
            }
        })

        if(hermes_answer && hermes_answer.status == 200) res.send({ status: 0 });
        else res.send({ status: -3 });
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

        await createWorkspace(ans.workspace, ans.email, ans.pass)
        await sql`UPDATE admin.workspace_requests SET status = 2 WHERE uuid = ${uuid}`
        
        res.send({ status: 2, workspace: ans.workspace });
    })

    app.get('/readme', async (req:any, res:any) => {  
        let lang = req.query.lang
        let path = '../README.md';
        if(lang == 'ru'){path = '../README_RU.md'}
        let readmeContent = await fs.readFile(path, 'utf-8');
        res.send({ readme: readmeContent });    
    })

    app.get('/version', async (req:any, res:any) => {  
        let path = '../meta.json';
        let metaContent = await fs.readFile(path, 'utf-8');
        res.send({ version: metaContent });    
    })

    app.listen(port, async () => {
        console.log(`Eileithyia running on port ${port}`)
    })
}
    
init()