import Gpt from './gpt';
import Data from './data';

const dataClass = new Data();
const gpt = new Gpt();

export async function processUserInput(userInput: string, workspace: string) {
  console.log('User request:', userInput);

  const data: any = await dataClass.get(workspace);
  const parsedCommand = await gpt.parseUserCommand(userInput, data.field);

  console.log('AI answer:', JSON.stringify(parsedCommand, null, 2));

  if (!parsedCommand) return null;

  const [updatedCommand, updatedHumanCommand] = dataClass.check(parsedCommand);
  console.log('AI updated answer:', JSON.stringify(updatedCommand, null, 2));
  console.log('AI updated human answer:', JSON.stringify(updatedHumanCommand, null, 2));

  return { updatedCommand, updatedHumanCommand };
}
