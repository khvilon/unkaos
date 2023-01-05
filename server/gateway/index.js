"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const https = require('https');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
var a = 0;
//var tools = require('./tools')
const app = express();
const port = 3001;
const dict = {
    read: 'get',
    create: 'post',
    update: 'put',
    delete: 'delete',
    upsert: 'post'
};
app.use(cors());
app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.raw({ limit: '150mb' }));
app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('ts');
    });
}
init();
