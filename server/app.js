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
const app = express()
const port = 3001

const comment_type_uuid = 'f53d8ecc-c26e-4909-a070-5c33e6f7a196'


var bodyParser = require('body-parser');
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
app.use(bodyParser.json({limit: '20mb'}));
app.use(bodyParser.raw({limit: '20mb'}));
app.use(bodyParser.urlencoded({limit: '20mb', extended: true}));

async function init()
{
    await sql.init()
    await crud.load()
    //await cash.load()

    app.get('/get_token', async (req, res) => {   
        let subdomain = req.headers.subdomain
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
        let params = req.body

        let token = req.headers.token

        user = await security.check_token(subdomain, token)

        if(user == null)
        {
            res.status(401);
            res.send({message: 'wrong token'});
            return
        }

        if(user.uuid != params.uuid)
        {
            es.status(403);
            res.send({message: 'you dont have permission to change other users password'});
            return
        }
        
        await security.set_password(subdomain, params.uuid, params.password)
        
        res.send('done')
    })

    app.post('/upsert_password_rand', async (req, res) => {   
        let subdomain = req.headers.subdomain
        let params = req.body

        let token = req.headers.token

        let user = await security.check_token(subdomain, token)

        if(user == null)
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
        
        await security.set_password(subdomain, params.uuid, password)

        

        mail.send('n@khvilon.ru', 'new pass', 'your new pass is ' + password, '')
        
        res.send('done')
    })

    

    for(let table in crud.querys)
    {
        for(let method in crud.querys[table])
        {
            console.log('add ', method)
            let func_name = method + '_' + table
            console.log('d', dict[method])
            app[dict[method]]('/' + func_name, async (req, res) => {                
                let params = req.query

                let subdomain = req.headers.subdomain

                let token = req.headers.token

                user = await security.check_token(subdomain, token)

                if(user == null)
                {
                    res.status(401);
                    res.send({message: 'wrong token'});
                    return
                }

                console.log('checked user ', user)
           

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

                if(method!='read') params.author_uuid = user.uuid;

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

                console.log('ppppppp', params)


                let ans = await crud.do(subdomain, method, table_name, params)

                
                if(ans.rows == undefined)
                {
                    res.status(ans.http_code != undefined ? ans.http_code : '400');
                } 

                res.send(ans)
            })
        }
    }

    app.listen(port, () => 
    {
        console.log(`Server running on port ${port}`)
    })

    

}
    
init()