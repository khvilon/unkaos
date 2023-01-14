import axios from 'axios';

import conf from './conf.json';

import cors from 'cors';

import express from "express";

const app:any = express()

const port = 3001

app.use(cors());
app.use(express.json({limit: '150mb'}));
app.use(express.raw({limit: '150mb'}));
app.use(express.urlencoded({limit: '150mb', extended: true}));

async function init(){ 
    const zeus_listeners = await axios.get(conf.zeusUrl + '/read_listeners');

    for(let i = 0; i < zeus_listeners.data.length; i++){
        let method = zeus_listeners.data[i].method
        let func = zeus_listeners.data[i].func

        app[method]('/' + func, async (req:any, res:any) => {

            //console.log(req)

            req.headers.request_function = func
            //console.log(req.headers)

            let cerberus_ans = await axios({
                method: 'get',
                url: conf.cerberusUrl + '/check_session' ,
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
                data: req.body,
                method: method,
                url: conf.zeusUrl + req.url,
                headers: {subdomain: req.headers.subdomain, user_uuid: cerberus_ans.data.uuid}
            });

            res.status(zeus_ans.status);
            res.send(zeus_ans.data)
        })
    }

    app.get('/get_token', async (req : any, res : any) => {
        let cerberus_ans = await axios({
            method: 'get',
            url: conf.cerberusUrl + '/get_token' ,
            headers: req.headers
        }); 

        res.status(cerberus_ans.status);
        res.send(cerberus_ans.data)
    })

    app.listen(port, async () => {
        console.log(`Gateway running on port ${port}`)
    })
}
    
init()