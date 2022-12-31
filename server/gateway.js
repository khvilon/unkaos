const https = require('https');
const fs = require('fs');

var sql = require('./sql')
var data_model = require('./data_model')
var crud = require('./crud')
var cash = require('./cash')
var security = require('./security')

const cors = require('cors');
const express = require('express');
var tools = require('./tools')
var mail = require('./mail')
var imp = require('./imp')
var ws = require('./web_socket')
const app = express()
const port = 3001

const comment_type_uuid = 'f53d8ecc-c26e-4909-a070-5c33e6f7a196'


var bodyParser = require('body-parser');
const { user } = require('./mail');
//const { user } = require('./mail');

const dict =
{
    read: 'get',
    create: 'post',
    update: 'put',
    delete: 'delete',
    upsert: 'post'
}

app.use(cors());
app.use(bodyParser.json({limit: '150mb'}));
app.use(bodyParser.raw({limit: '150mb'}));
app.use(bodyParser.urlencoded({limit: '150mb', extended: true}));


async function notify(issue_uuid, user_uuid)
{
    /*let watchers = await sql.query(subdomain, 
        `SELECT U.NAME
     FROM watchers WHERE user_uuid = '` + user.uuid + `' AND issue_uuid = '` + issue_uuid + `'`)

    for(let i in watchers)
    {
        if()
    }*/

}

async function init()
{
    await sql.init()
    await crud.load()
    //await cash.load()

    app.get('/get_token', async (req, res) => {   
        let subdomain = req.headers.subdomain

        if(subdomain == undefined || subdomain == null || subdomain == '')
        {
            res.status(400);
            res.send({message: 'need subdomain to use workspace'});
            return
        }


        let email = req.headers.email
        let pass = req.headers.password

        let token = await security.get_token(subdomain, email, pass)

        let ans

        if(token == null) 
        {
            ans = {error: 'Не верное имя пользователя или пароль'} 
            res.status(401);
        }
        else ans = token

        console.log('token', ans)
        
        res.send(ans)
    })

    app.post('/upsert_password', async (req, res) => {   
        let subdomain = req.headers.subdomain

        if(subdomain == undefined || subdomain == null || subdomain == '')
        {
            res.status(400);
            res.send({message: 'need subdomain to use workspace'});
            return
        }

        let params = req.body

        let token = req.headers.token

        let user = await security.check_token(subdomain, token)

        if(user == null)
        {
            res.status(401);
            res.send({message: 'wrong token'});
            return
        }

        if(user.uuid != params.user.uuid)
        {
            res.status(403);
            res.send({message: 'you dont have permission to change other users password'});
            return
        }
        
        await security.set_password(subdomain, params.user.uuid, params.password)
        
        res.send({text: 'done'})
    })

    app.post('/upsert_password_rand', async (req, res) => {   
        let subdomain = req.headers.subdomain

        if(subdomain == undefined || subdomain == null || subdomain == '')
        {
            res.status(400);
            res.send({message: 'need subdomain to use workspace'});
            return
        }

        let params = req.body

        let token = req.headers.token

        let curr_user = await security.check_token(subdomain, token)

        if(curr_user == null)
        {
            res.status(401);
            res.send({message: 'wrong token'});
            return
        }

        if(false) //todo check admin role
        {
            es.status(403);
            res.send({message: 'you dont have permission to change other users password if you are not an Admin'});
            return
        }

        const pass_chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const pass_len = 12;

        let password = ''

        for (var i = 0; i <= pass_len; i++) 
        {
            let rand_num = Math.floor(Math.random() * pass_chars.length);
            password += pass_chars.substring(rand_num, rand_num +1);
        }
        
        await security.set_password(subdomain, params.user.uuid, password)


        mail.send(params.user.mail, 'Сброс пароля Unkaos', 'Уважаемый ' + params.user.name + ', ваш новый пароль ' + password + '. Вход на https://unkaos.oboz.tech/login', '')
        
        res.send({text: 'done'})
    })


    app.post('/upsert_watcher', async (req, res) => {   
        let subdomain = req.headers.subdomain

        if(subdomain == undefined || subdomain == null || subdomain == '')
        {
            res.status(400);
            res.send({message: 'need subdomain to use workspace'});
            return
        }
    
        let token = req.headers.token

        let user = await security.check_token(subdomain, token)

        if(user == null)
        {
            res.status(401);
            res.send({message: 'wrong token'});
            return
        }

        let issue_uuid = req.body.issue_uuid

        ans = await sql.query(subdomain, `INSERT INTO watchers SET (user_uuid, issue_uuid) VALUES('` + user.uuid + `','` + issue_uuid + `') ON CONFLICT DO NOTHING`)

        res.send(ans)
    })

    app.delete('/delete_watcher', async (req, res) => {   
        let subdomain = req.headers.subdomain
    
        let token = req.headers.token

        let user = await security.check_token(subdomain, token)

        if(user == null)
        {
            res.status(401);
            res.send({message: 'wrong token'});
            return
        }

        let issue_uuid = req.body.issue_uuid

        ans = await sql.query(subdomain, `DELETE FROM watchers WHERE user_uuid = '` + user.uuid + `' AND issue_uuid = '` + issue_uuid + `'`)

        res.send(ans)
    })


    app.get('/read_watcher', async (req, res) => {   
        let subdomain = req.headers.subdomain
    
        let token = req.headers.token

        let user = await security.check_token(subdomain, token)

        if(user == null)
        {
            res.status(401);
            res.send({message: 'wrong token'});
            return
        }

        let issue_uuid = req.query.issue_uuid

        ans = await sql.query(subdomain, `SELECT * FROM watchers WHERE user_uuid = '` + user.uuid + `' AND issue_uuid = '` + issue_uuid + `'`)

        res.send(ans)
    })
  

    for(let table in crud.querys)
    {
        for(let method in crud.querys[table])
        {
            console.log('add ', method)
            let func_name = method + '_' + table
            console.log('d', dict[method])
            app[dict[method]]('/' + func_name, async (req, res) => {
                

                let req_uuid = tools.uuidv4()
                req_values= [ req_uuid,  req.method,  req.url, JSON.stringify(req.headers), JSON.stringify(req.body)]

                sql.query('admin', `INSERT INTO admin.logs_incoming (uuid, method, url, headers, body) VALUES($1,$2,$3,$4,$5)`, req_values)
                
                //console.log(req)
                
                let params = req.query

                let subdomain = req.headers.subdomain

                if(subdomain == undefined || subdomain == null || subdomain == '')
                {
                    res.status(400);
                    res.send({message: 'need subdomain to use workspace'});
                    return
                }

                let token = req.headers.token

                let user = await security.check_token(subdomain, token)

                if(user == null)
                {
                    res.status(401);
                    res.send({message: 'wrong token'});
                    return
                }

                

                console.log('checked user ', user.name, user.login, user.mail)

                let [method, table_name] = tools.split2(func_name, '_')

                if(method != 'read') params = req.body
               /* else if(tools.obj_length(params) == 0)
                {
                    console.log('data from cashe!')
                    res.send(cash.data[table_name])
                    return 
                }*/

                console.log('ss', subdomain)

                if(table_name == 'issue_actions')
                {
                    params.type_uuid = comment_type_uuid;
                    
                }

                if((method!='read' || table_name == 'favourites') && method!='delete') params.author_uuid = user.uuid;

                if(params.values != undefined)
                {
                    for(let i in params.values)
                    {
                        if(params.values[i].label == 'Автор' && params.values[i].value == '')
                        {
                            params.values[i].value = user.uuid
                        }
                    }
                }

                console.log('ppppppp', params, table_name)


                let ans = await crud.do(subdomain, method, table_name, params)

                
                if(ans.rows == undefined)
                {
                    res.status(ans.http_code != undefined ? ans.http_code : '400');
                } 

                //add log
                if(method!='read')
                {
                    let params_str = '' //JSON.stringify(params)
                    let req_done_values= [req_uuid,  user.uuid, table_name, method, params.uuid, params_str]
                    sql.query(subdomain, `INSERT INTO logs_done (uuid, user_uuid, table_name, method, target_uuid, parameters) VALUES($1,$2,$3,$4,$5,$6)`,req_done_values)
                }

                //add watcher
                if(method!='read' && table_name == 'issue')
                {
                    sql.query(subdomain, `INSERT INTO watchers (user_uuid, issue_uuid) VALUES('` + user.uuid + "','" + params.uuid + `') ON CONFLICT DO NOTHING`)
                }
                

                res.send(ans)
            })
        }
    }

    app.listen(port, async () => 
    {
        console.log(`Server running on port ${port}`)

        //return
        await imp.run()
        //console.log('new_issues', new_issues)

          
 
        //console.log('aaaannnnssss', ans)
    })




    

}
    
init()