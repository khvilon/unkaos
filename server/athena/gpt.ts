

import sql from './sql';
import axios from 'axios';

var openaiConfig: any = {}

const commandAnswerSchemma =
`{
  "type": "object",
  "required": ["command", "set", "target"],
  "properties": {
    "command": {
      "type": "string",
      "enum": ["create", "update", "find"]
    },
    "target":{
      "type": "string",
      "enum": ["global", "current", "children"]
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
you are NLP for a task tracker, 
answer schema: ${commandAnswerSchemma}
answer only a valid JSON, no other text.

Note that verbs resembling a status applied to issues indicate setting the status to that value and do not affect the filter query. 
For example, to close an issue means just to change its status to a status like 'closed' without filtering, 
and to put aside means to set the status to 'put aside'.

'command' attribute represents the action that the user wants to perform. 

context issues are current issues on the page.
'target' are issues to modify. by default it is the context issues. 
it can be children of context current issues. 
Asking to perform actions on all issues of the tracker should be represented by 'global' value for target.

The 'set' attribute should contain an array of objects, each with a 'name' and 'value' attribute. 
The 'name' attribute should indicate the name of the field that the user wants to set or update, 
and the 'value' attribute should contain the new value for that field. If the field accepts a limited set of values, 
the 'value' attribute must be one of the available values or set to 'inherit' to copy the value from the context issues (can be current or all).
dont use 'parent...' value, use inherit instead.
also the name of 'set' item can be 'parent' if the user want to change the parent issue, in this case the value is the full number of new parent.
the full number consists of the short project name, '-' and the numeric part.
If the field or issue attribute has a list of available values, any values in 'set' and 'filter' must be from the available values list.

The 'filter' is a JSON-based query to select issues to be changed. If rules on selected issues are not specified, 
do not use the 'filter' attribute at all. Be careful not to use any rule that was not strictly asked. Use single quotes for filter strings, 
and do not use quotes for field and attribute names in the filter query. 
A field/attribute name can be only '=', '>', '<', or 'like' to its value. Logical conditions are only 'and', 'or'.
When a prompt asks for issues about something, it means that either the field 'Название' or the field 'Описание' contains that. 
Therefore, for this condition in the filter, use '(Название like ... or Описание like ...)', 
taking into account that the operator for this expression is 'or', not 'and'. Make sure to enclose this expression in parenthesis. 
Other conditions can be used as usual.

dont use ' for attributes values, always use "

Do not translate any values. Ignore unuseful information like emotions and use only the relevant information.
If you update or create issues, 'set' cant be void.

Available issue attributes are 'sprint', 'status', 'project', 'type'. 
The 'num' attribute is the numeric ID, and 'num' is strictly an integer. Available issue fields are:
`

export class Gpt {

  constructor() {
    sql.subscribe('*', this.updateConfig.bind(this), this.handleSubscribeConnect)
  }

  private handleSubscribeConnect(){
    console.log('subscribe sql configs connected!')
  }

  private async updateConfig(row:any, { command, relation, key, old }: any){
    if(relation.table == 'configs' || relation.schema == 'server') this.init()
  }

  public async init() { 
    const ans = await sql`SELECT name, value FROM server.configs WHERE service = 'openai'`;

    for(let i in ans){
      openaiConfig[ans[i].name] = ans[i].value
    }    
  }

  public async classify(input: string, context: string = ''): Promise<any> {
    console.log('classify gpt', openaiConfig)

    let data = JSON.stringify({
      "model": openaiConfig.model,
      //"response_format": { "type": 'json_object' },
      "messages": [
            {
                "role": "system",
                "content": "You are an ai assistant for a task tracker. your classify user request. User can do: 'find_issues' - a query to filter issues, 'update_issues' - a query to filter some issues and set some values, 'use_readme' - any question about use of the task tracker. Answer with one of these categorys without comments. if th promt seems does not matching any of the categorys, answer 'unknown'"
            },
           
          {
            "role": "user",
            "content": input
        }],
       
      "temperature": 0.4//Number(openaiConfig.temperature)
    });

    let config:any = {
      method: 'post',
      maxBodyLength: Infinity,
      url: openaiConfig.url + 'chat/completions',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + openaiConfig.key
      },
      data : data
    };

    
    if(openaiConfig.proxy_host){
      config.proxy = {
        host: openaiConfig.proxy.split(':')[0],
        port:  openaiConfig.proxy.split(':')[1]
      }
    }

    try{
      let response = await axios(config);

      console.log('>>gptResponse0', response.data.choices[0].message.content);


      //let gptResponse = JSON.parse(response.data.choices[0].message.content);
      if(!response.data.choices[0].message.content) return {};
      console.log('>>gptResponse', response.data.choices[0].message.content);
      return {command: response.data.choices[0].message.content};
    }
    catch(err) {
      console.log(err);
      return {};
    }
  }

  private async ask(input: string, context: string = ''): Promise<any> {

    console.log('ask gpt openaiConfig', openaiConfig)

    let data = JSON.stringify({
      "model": openaiConfig.model,
      //"response_format": { "type": 'json_object' },
      "messages": [
            {
                "role": "system",
                "content": context
            },
           
          {
            "role": "user",
            "content": input
        }],
       
      "temperature": 0.4//Number(openaiConfig.temperature)
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: openaiConfig.url + 'chat/completions',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + openaiConfig.key
      },
      data : data
    };

    try{
      let response = await axios(config);

      console.log('>>gptResponse0', response.data.choices[0].message.content);


      let gptResponse = JSON.parse(response.data.choices[0].message.content.replace('```json', '').replace('```', ''));
      if(!gptResponse) return {};
      console.log('>>gptResponse', JSON.stringify(gptResponse), null, 4);
      return gptResponse;
    }
    catch(err) {
      console.log(err);
      return {};
    }
  }



  public async parseUserCommand(input: string, fields: Array<any>, language: string = 'russian'): Promise<any> {
  
    const fieldsStr = JSON.stringify(fields.map((item: any)=>'"' + item.name + '"').join(', '))

    const context = `${unkaosDescr}.
    ${fieldsStr}.`

    const parsedCommand = await this.ask(input, context)

    return parsedCommand

  }

}

export default Gpt
