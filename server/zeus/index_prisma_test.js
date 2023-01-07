"use strict";
//import { PrismaClient } from '@prisma/client'
//const prisma = new PrismaClient()
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function init_prisma() {
    return __awaiter(this, void 0, void 0, function* () {
        //const currentPage = req.query.page || 1;
        // const listPerPage = 5;
        // const offset = (currentPage - 1) * listPerPage;
        /*
         const pusers =  await prisma.issues.findMany({
             include:
             {
                 field_values: {select:{value:true}}
             },
             where: {
                 field_values: {some: {
                     value:{
                         equals: 'Core dev team'
                     }
                 }}
             },
       //      skip: offset,
             take: listPerPage,
         });*/
    });
}
init_prisma();
