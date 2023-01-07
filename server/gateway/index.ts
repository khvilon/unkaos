import axios from 'axios';

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const app = express()

const port = 3001
const zeus_url = 'http://127.0.0.1:3006'
const cerberus_url = 'http://127.0.0.1:3005'

app.use(cors());
app.use(bodyParser.json({limit: '150mb'}));
app.use(bodyParser.raw({limit: '150mb'}));
app.use(bodyParser.urlencoded({limit: '150mb', extended: true}));

async function init(){ 
    const zeus_listeners = await axios.get(zeus_url + '/read_listeners');

    for(let i = 0; i < zeus_listeners.data.length; i++){
        let method = zeus_listeners.data[i].method
        let func = zeus_listeners.data[i].func

        

        app[method]('/' + func, async (req:any, res:any) => {

            //console.log(req)

            req.headers.request_function = func
            //console.log(req.headers)

            let cerberus_ans = await axios({
                method: 'get',
                url: cerberus_url + '/check_session' ,
                headers: req.headers
            });

            if(cerberus_ans.status != 200){
                res.status(cerberus_ans.status);
                res.send(cerberus_ans.data);
                return
            }

            //console.log('cerberus_ans.data', cerberus_ans.data)

            req.headers.user_uuid = cerberus_ans.data.uuid
           // req.headers.user_name = cerberus_ans.data.name

            let zeus_ans = await axios({
                method: method,
                url: zeus_url + req.url,
                headers: {subdomain: req.headers.subdomain, user_uuid: cerberus_ans.data.uuid}
            });

            res.status(zeus_ans.status);
            res.send(zeus_ans.data)
        })
    }

    app.listen(port, async () => {
        console.log(`Gateway running on port ${port}`)
    })
}
    
init()