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
import { restConfig } from './conf';

const app = express();
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

const dataClass = new Data();
const gpt = new Gpt();

app.get('/gpt', async (req, res) => {
  const userInput = req.query.userInput as string;
  const workspace = req.header('workspace') || 'oboz';

  console.log('User request:', userInput + '\r\n');

  const data: any = await dataClass.get(workspace);
  const parsedCommand = await gpt.parseUserCommand(userInput, data.field);

  console.log('AI answer:', JSON.stringify(parsedCommand, null, 2));

  if (!parsedCommand) {
    res.status(400).json({ error: 'Unable to process user input' });
    return;
  }

  const [updatedCommand, updatedHumanCommand] = dataClass.check(parsedCommand);
  console.log('AI updated answer:', JSON.stringify(updatedCommand, null, 2));
  console.log('AI updated human answer:', JSON.stringify(updatedHumanCommand, null, 2));

  res.status(200).json({ gpt: updatedCommand, humanGpt: updatedHumanCommand });
});

app.listen(restConfig.port, () => {
  console.log(`Listening on port ${restConfig.port}`);
});
