//const userInput = 'У всех дочерних, у которых спринт 83 и статус новая или в работе, сделай спринт 84 и дерекшен fe';
//const userInput = 'Сделай всем дочерним такой же спринт, если статус новая';
//const userInput = 'Сделай мне хорошо по задачам';
//const userInput = 'Переведи текущую задачу в статус закрыто';
//const userInput = 'Отклони все дочерние';
//const userInput = 'Закрой задачу';

import express from 'express';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import Gpt from "./gpt";
import Data from "./data";

let restConf: any;

try {
  const { restConfig } = require('./conf');
  restConf = restConfig;
} catch (error) {
  restConf = {
    port: process.env.ATHENA_PORT
  };
}

const app = express();
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));


const gpt = new Gpt();



app.get('/gpt', async (req, res) => {
/*
  res.status(200).json({ gpt: {
    "command": "update",
    "useCurrent": true,
    "useChildren": true,
    "set": [
      {
        "name": "sprint_uuid",
        "value": "inherit"
      }
    ],
    "filter": ""
  }, humanGpt:  {
    "command": "update",
    "useCurrent": true,
    "set": [
      {
        "name": "Спринт",
        "value": "80. 9 янв. - 16 фев."
      }
    ],
    "filter": ""
  } });

  return*/


  const userInput = req.query.userInput as string;
  const userUuid = req.query.userUuid as string;
  const workspace = req.header('workspace') || 'oboz';
  const dataClass = new Data(workspace);

  let logUuid = await dataClass.log(userInput, userUuid)

  console.log('User request:', userInput + '\r\n');

  const data: any = await dataClass.get(workspace);
  const parsedCommand = await gpt.parseUserCommand(userInput, data.field);

  dataClass.updateLogGpt(logUuid, JSON.stringify(parsedCommand, null, 2))

  console.log('AI answer:', JSON.stringify(parsedCommand, null, 2));

  if (!parsedCommand || !parsedCommand.command) {
    res.status(400).json({ error: 'Unable to process user input' });
    return;
  }

  try{
    const [updatedCommand, updatedHumanCommand] = await dataClass.check(parsedCommand);
    if(!updatedCommand || !updatedHumanCommand){
      console.log('Unable to process gpt ans')
      res.status(400).json({ error: 'Unable to process gpt ans' });
      return
    }
    console.log('AI updated answer:', JSON.stringify(updatedCommand, null, 2));
    console.log('AI updated human answer:', JSON.stringify(updatedHumanCommand, null, 2));

    dataClass.updateLogAthena(logUuid, JSON.stringify({ gpt: updatedCommand, humanGpt: updatedHumanCommand }, null, 2))
    res.status(200).json({ gpt: updatedCommand, humanGpt: updatedHumanCommand });
  }
  catch(e){
    console.log('Unable to process gpt ans', e)
    res.status(400).json({ error: 'Unable to process gpt ans' });
  }
});

app.listen(restConf.port, () => {
  console.log(`Listening on port ${restConf.port}`);
});

console.log('update test 1')