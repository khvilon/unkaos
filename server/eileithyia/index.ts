import sql from "./sql";
import cors from 'cors';
import express from "express";
import axios from "axios";
import fs from 'fs/promises';
import crypto from 'crypto';
import { createLogger } from '../server/common/logging';

const logger = createLogger('eileithyia');

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

    logger.debug({
        msg: 'Checking workspace exists',
        workspace,
        exists: ans ? ans[0].exists : true
    });

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
    logger.info({
        msg: 'Creating new workspace',
        workspace,
        email
    });
    
    await execModifSqlFile('../db/-public.sql', 'public', workspace, email, pass)
    await execModifSqlFile('../db/-workspace.sql', 'server', workspace, email, pass)
    
    let files = await fs.readdir(sqlPath)

    files = files.filter(file=>file.endsWith('_m.sql')).sort()

    for(let i = 0; i < files.length; i++){
        logger.debug({
            msg: 'Executing migration file',
            file: files[i]
        });
        await execModifSqlFile(sqlPath + files[i], 'public', workspace, email, pass)
    }
}

const init = async function() {
 
    app.post('/upsert_workspace_requests', async (req:any, res:any) => {   
        let workspace = req.body.workspace
        let email = req.body.email
        let uuid = crypto.randomUUID()

        workspace = workspace.toLowerCase();
        
        let ans

        let exists = await checkWorkspaceExists(workspace)

        let pass = generatePassword()

        if(!exists){
            logger.info({
                msg: 'Creating workspace request',
                workspace,
                email,
                uuid
            });
            
            ans = await sql`INSERT INTO admin.workspace_requests(uuid, workspace, email, pass) 
            VALUES (${uuid}, ${workspace}, ${email}, ${pass})`
            if(!ans){
                logger.error({
                    msg: 'Failed to create workspace request',
                    workspace,
                    email
                });
                res.send({ status: -1 });
                return
            } 
        }
        else {
            logger.warn({
                msg: 'Workspace already exists',
                workspace
            });
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

        if(hermes_answer && hermes_answer.status == 200) {
            logger.info({
                msg: 'Workspace request created and email sent',
                workspace,
                email
            });
            res.send({ status: 0 });
        }
        else {
            logger.error({
                msg: 'Failed to send email',
                workspace,
                email,
                status: hermes_answer?.status
            });
            res.send({ status: -3 });
        }
    })

    app.get('/read_workspace_requests', async (req:any, res:any) => {
        let uuid = req.query.uuid

        let ans: any = await readWorkspaceRequest(uuid)

        if(!ans) {
            logger.warn({
                msg: 'Workspace request not found',
                uuid
            });
            res.send({ status: -1 });
            return;
        }

        logger.debug({
            msg: 'Found workspace request',
            request: ans
        });

        let exists = await checkWorkspaceExists(ans.workspace)

        if(exists){
            logger.warn({
                msg: 'Workspace already exists',
                workspace: ans.workspace
            });
            res.send({ status: -2 });
            return;
        }

        await createWorkspace(ans.workspace, ans.email, ans.pass)
        await sql`UPDATE admin.workspace_requests SET status = 2 WHERE uuid = ${uuid}`
        
        logger.info({
            msg: 'Workspace created successfully',
            workspace: ans.workspace
        });
        
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
        logger.info(`Eileithyia running on port ${port}`);
    })
}
    
init()