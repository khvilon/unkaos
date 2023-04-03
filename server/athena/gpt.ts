
import { Configuration, OpenAIApi } from 'openai';

import { openaiConfig } from './conf';

const key = openaiConfig.key

const configuration = new Configuration({
  apiKey: key,
});
const openai = new OpenAIApi(configuration);

const commandAnswerSchemma =
`{
  "type": "object",
  "required": ["command", "set"],
  "properties": {
    "command": {
      "type": "string",
      "enum": ["create", "update"]
    },
    "useCurrent": {
      "type": "boolean"
    },
    "useChildren": {
      "type": "boolean"
    },
    "filter": {
      "type": "object",
      "required": ["conditions", "operator"],
      "properties": {
        "conditions": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["name", "operator", "value"],
            "properties": {
              "name": {
                "type": "string"
              },
              "operator": {
                "type": "string",
                "enum": ["=", ">", "<", "like", "and", "or"]
              },
              "value": {
                "type": "string"
              },
              "conditions": {
                "type": "array",
                "items": {
                  "$ref": "#/properties/filter"
                }
              }
            }
          }
        },
        "operator": {
          "type": "string",
          "enum": ["and", "or"]
        }
      }
    },
    "set": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "value"],
        "properties": {
          "name": {
            "type": "string"
          },
          "value": {
            "type": "string"
          }
        }
      }
    }
  }
}
`

const unkaosDescr = `
A user inputs a natural language command request in task tracker, 
you parse the input and identify which action the user is requesting, along with any necessary parameters for the action into 
a valid JSON that adheres to the following schema: ${commandAnswerSchemma}

note that verbs resembling to a status applyed to issues means to set the status to that value and does not affect filter query, 
for example to close an issue means just to change its status to a status like closed without filtering,
to put aside means to set status to puted aside.

The command attribute is the action that the user wants to perform. 
The useCurrent attribute is true by default, but is false if the user wants to apply the command to all issues. 
The useChildren attribute is false by default, but is true if the user wants to apply the command to the children of the current issue.

The set attribute should contain an array of objects, each with a name and value attribute. 
The name attribute should indicate the name of the field that the user wants to set or update, 
the value attribute should contain the new value for that field. 
If the field accepts a limited set of values, the value attribute must be one of the available values or set to "inherit" to copy the value from the current issue. 
If the field or issue attribute has a list of available values, any values in set and filter must be from the available values list.

filter is JSON-based query to select issues to be changed.
if rules on selected issues are not specified dont use the filter attribute at all. Be careful, dont use any rule that was not strictly asked.
use ' for filter strings. dont use quotes for field and attr names in filter query.

Dont translate any values, use them as is.

available issue attributes are sprint, status, project, type. 
available issue fields are:
`

const checkDescr = `


`

export class Gpt {

  private async ask(input: string, context: string = '', temper=0.4): Promise<string> {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{role: "system", content: context},{role: "user", content: input}],
      temperature: temper,
    });

    const gptResponse = completion.data.choices[0].message?.content ?  completion.data.choices[0].message?.content : ''

    return gptResponse
  }

  public async parseUserCommand(input: string, fields: Array<any>, language: string = 'russian'): Promise<any> {
  
    const fieldsStr = JSON.stringify(fields.map((item: any)=>'"' + item.name + '"').join(', '))

    const context = `${unkaosDescr}.
    ${fieldsStr}.`

    const parsedCommandStr = await this.ask(input, context)

    let parsedCommand: any
  
    try {
      parsedCommand = JSON.parse(parsedCommandStr);
    } catch (error) {
      console.log("Error gpt JSON", parsedCommandStr)
      parsedCommand = {}
    }

    return parsedCommand
/*
    const attr_values =`
    attributes have available values:
    "sprint": ${data.sprints.map((item: any)=>'"' + item.name + '"').join(', ')}
    "status": ${data.statuses.map((item: any)=>'"' + item.name + '"').join(', ')}
    "project": ${data.projects.map((item: any)=>'"' + item.name + '"').join(', ')}
    "type": ${data.types.map((item: any)=>'"' + item.name + '"').join(', ')} 
    .`;

    const field_values =`field available values: 
    ${data.fields.filter((f:any)=>f.available_values).map((f:any)=>f.name + ': ' + f.available_values+ ';')}.`

    let input2 = checkDescr + attr_values + field_values + ' The json to update is:' + `${parsedCommand}`

    const context2 = `You are an API to update JSON from the user message by autocompleting, translating, and fixing values.
    The structure has to be preserved, and only values are changed. No text out of the JSON should be in your answer, only a valid JSON object!
    Check all values provided in the "filter" query (if provided, not required) and "set".
    If the filter query is not provided or has no values, just check "set". By default, the current task is affected by the command.
    For each value in the "filter" or the "set" of provided JSON, if there is a corresponding field or attribute with a list of available values, follow these 4 steps:
    1. Check if the value is equal to a value in the list or the keyword 'inherit' exactly, considering symbols and case.
    2. If the value is not exactly equal the full variant in the list, but resembles a value in the list or differs in case, 
    replace it by the full value from the list. 
    Resembling may mean to be part of the full value (even if it is much shorter), the value with some mestakes, translated, other cases and so on. 
    3. If the value in the JSON is an abbreviation or an incomplete form of a value in the list, expand and complete it to match the value in the list.
    4. If the list is present, but the value seems not to correspond to any from the list, return {}.
    
    After all the steps done for all values return the provided JSON with updated values.
    

    give an explanation what happened with each value in the json on all steps.
    `
    console.log('>>>>>>>>>>', context2)
    console.log('>>>>>>>>>>', input2)

    const checkedCommand = await this.ask(input2, context2)

    console.log('AI checked answer:', checkedCommand);
    /*
    // Check if the prompt could not be mapped to a CRUD action
    if (JSON.parse(gptResponse).data.command == '') {
      console.log('Не понимаю вас...');
      return;
    }*/


    // Uncomment the following line to perform the action on the task tracker API
    // await executeTaskTrackerApiRequest(apiRequest, explanation);*/
  }
}

export default Gpt