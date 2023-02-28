const express = require('express');
const app = express()
const port = 3005

const md5 = require('md5');

import data from "./data";
import security from "./security";
import axios from "axios";
import conf from "./conf.json";


app.use(express.json({limit: '150mb'}));
app.use(express.raw({limit: '150mb'}));
app.use(express.urlencoded({limit: '150mb', extended: true}));

const checkSession = function(workspace : string, token : string){
    if(data.sessions[workspace] == null) return null
    const md5Token = md5(token)
    //console.log('token', md5Token)
    let session = data.sessions[workspace][md5Token]
    if(!session) return null
    let user = data.users[workspace][session.user_uuid]
    if(!user) return null
    return user
}

const checkHermesAvailable = async function () : Promise<boolean> {
    try {
        const hermes_answer = await axios({ method: "get", url: conf.hermesUrl + "/ping"})
        return (hermes_answer?.data?.status == "OK")
    } catch (e) {
        return false
    }
}

const handleRequest = async function(req : any, res : any){
    const workspace = req.headers.subdomain

    if(workspace == undefined || workspace == ''){
        res.status(400);
        res.send({message: 'Необходим заголовок subdomain в качестве workspace'});
        return
    }

    const request = req.url.split('/')[1]

    if(request == 'get_token'){
        let email = req.headers.email
        let pass = req.headers.password
        let token = await security.newToken(workspace, email, pass)

        if(token == null) {
            res.status(401);
            res.send({message: 'Не верное имя пользователя или пароль'});
            return
        }

        res.send(token)
    } else {
        const token = req.headers.token

        if(!token) {
            res.status(401);
            res.send({message: 'Требуется токен авторизацмм'});
            return
        }  

        let user = checkSession(workspace, token)

        if(!user) {
            res.status(401);
            res.send({message: 'Пользовательский токен не валиден'});
            return
        }  

        if(request == 'check_session') res.send(user)
        else if(request == 'upsert_password'){
            const params = req.body
            if(user.uuid != params.user.uuid) {
                res.status(403);
                res.send({message: 'Нельзя изменять пароль других пользователей'});
                return
            }
            await security.setPassword(workspace, params.user, params.password)
        }
        else if(request == 'upsert_password_rand') {
            //console.log('upsert_password_rand0', req.body.user)
            if (await security.checkUserIsAdmin(workspace, user)) {
                if (await checkHermesAvailable()) {
                    const password = await security.setRandomPassword(workspace, req.body.user)
                    try {
                        const hermes_answer = await axios({
                            method: "post",
                            url: conf.hermesUrl + "/send",
                           // headers: req.headers,
                            data: {
                                transport: "email",
                                recipient: req.body.user.mail,
                                title: "Новый пароль Unkaos",
                                body: "Ваш новый пароль Unkaos: "+password,
                                workspace: workspace
                            }
                        })
                        res.status(hermes_answer.status);
                        if (hermes_answer.status == 200) {
                            res.send({message: 'Пароль упешно изменён'});
                        } else {
                            res.send({message: 'Ошибка сброса пароля'});
                        }
                    } catch (e) {
                        console.log('/upsert_password_rand error: '+JSON.stringify(e))
                        res.status(500)
                        res.send({message: "Internal Server Error"})
                    }
                } else {
                    res.status(503)
                    res.send({message: "Service Temporarily Unavailable"})
                }
            } else {
                res.status(403);
                res.send({message: 'Данное действие доступно только администратору'});
            }
        }
    }    
}
app.get('/get_token', async (req : any, res : any) => {
    handleRequest(req, res)   
})
app.get('/check_session', async (req : any, res : any) => {
    handleRequest(req, res)   
})
app.post('/upsert_password', async (req : any, res : any) => {
    handleRequest(req, res)   
})
app.post('/upsert_password_rand', async (req : any, res : any) => {
    handleRequest(req, res)   
})

app.listen(port, async () => {
    console.log(`Cerberus running on port ${port}`)
})