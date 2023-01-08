const https = require('https');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

var a = 0

//var tools = require('./tools')

const app = express()

const port = 3001


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



async function init()
{
    

    console.log('ts')

}
    
init()