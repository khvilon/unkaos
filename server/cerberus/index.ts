const express = require('express');
const app = express()
const port = 3005

var md5 = require('md5')

import data from "./data";
import security from "./security";

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

const handleRequest = async function(req : any, res : any){
    let workspace = req.headers.subdomain

    if(workspace == undefined || workspace == null || workspace == ''){
        res.status(400);
        res.send({message: 'Необходим заголовок subdomain в качестве workspace'});
        return
    }

    let request = req.url.split('/')[1]

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
    }
    else{
        let token = req.headers.token

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
            let params = req.body

            if(user.uuid != params.user.uuid)
            {
                res.status(403);
                res.send({message: 'Нельзя задавать пароль других пользователей'});
                return
            }
        
            await security.setPassword(workspace, params.user, params.password)
        }
        else if(request == 'upsert_password_rand'){
            let params = req.body
        
            await security.updatePassword(workspace, params.user)
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

app.listen(port, async () => 
{
    console.log(`Cerberus running on port ${port}`)
})