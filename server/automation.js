var sql = require('./sql')
var data_model = require('./data_model')
var crud = require('./crud')

const express = require('express');
var tools = require('./tools')
var mail = require('./mail')

const app = express()
const port = 3005


var bodyParser = require('body-parser');


const dict =
{
    read: 'get',
    create: 'post',
    update: 'put',
    delete: 'delete',
    upsert: 'post'
}

app.use(bodyParser.json({limit: '20mb'}));
app.use(bodyParser.raw({limit: '20mb'}));
app.use(bodyParser.urlencoded({limit: '20mb', extended: true}));



async function init()
{
    await sql.init()
    await crud.load()
    //await cash.load()

    for(let table in crud.querys)
    {
        for(let method in crud.querys[table])
        {
            console.log('add ', method)
            let func_name = method + '_' + table
            console.log('d', dict[method])
            app[dict[method]]('/' + func_name, async (req, res) => {
                
                return

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

                console.log('ppppppp', params)


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
        console.log(`Automation server running on port ${port}`)

        //return
        await imp.run()
        //console.log('new_issues', new_issues)

          
 
        //console.log('aaaannnnssss', ans)
    })




    

}
    
init()