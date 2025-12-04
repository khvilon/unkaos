import { Gpt } from './gpt_arch';
import { Data } from './data';
import { createLogger } from '../common/logging';

const logger = createLogger('athena:request');
const gpt = new Gpt();
const dataClass = new Data();

export async function processUserInput(userInput: string, workspace: string) {
  logger.info({
    msg: 'Processing user request',
    input: userInput
  });

  const data: any = await dataClass.get(workspace);
  const parsedCommand = await gpt.parseUserCommand(userInput, data.field);

  logger.info({
    msg: 'AI response',
    response: parsedCommand
  });

  if (!parsedCommand) return null;

  const [updatedCommand, updatedHumanCommand] = dataClass.check(parsedCommand);
  
  logger.info({
    msg: 'AI updated response',
    command: updatedCommand,
    humanCommand: updatedHumanCommand
  });

  return { updatedCommand, updatedHumanCommand };
}
