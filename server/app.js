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
const app = express()
const port = 3001

var bodyParser = require('body-parser')

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
                let ans = await crud.do(subdomain, method, table_name, params)

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