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

const init = async function() {
  const gpt = new Gpt();
  await gpt.init();

  app.get('/gpt', async (req, res) => {

    const userInput = req.query.userInput as string;
    const userCommand = req.query.userCommand as string;
    const userUuid = req.query.userUuid as string;
    let workspace:string = '';

    if(userCommand == 'classify'){
      let command = await gpt.classify(userInput);
      res.status(200).json(command);
      return;
    }
    else if(userCommand == 'use_readme'){
      let ans = await gpt.useReadme(userInput);
      res.status(200).json(ans);
      return;
    }
    else if(userCommand != 'find_issues' && userCommand != 'update_issues'){
      res.status(400).json({error:'unknwn command'});
      return;
    }

    if (typeof req.headers.workspace === 'string') {
      workspace = req.headers.workspace;
    }
    

    if(!workspace){
      res.status(400).json({ error: 'Need workspace' });
      return;
    }
    const dataClass = new Data(workspace);

    let logUuid = await dataClass.log(userInput, userUuid)

    console.log('User request:', userInput + '\r\n');

    const data: any = await dataClass.get(workspace);
    const parsedCommand = await gpt.parseUserCommand(userInput, userCommand, data.field);

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

}

init();