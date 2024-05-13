

import sql from './sql';
import axios from 'axios';
// Destructure from the module if it exports as an object
import { HttpsProxyAgent } from 'https-proxy-agent';


var openaiConfig: any = {}

const classifyDescr = `You are an AI assistant for the Unkaos task tracker. 
Classify each user request into one of the following categories without any additional comments:
find_issues: Requests to filter or search for specific issues.
update_issues: Requests to modify or update issues.
use_readme: Questions about using the task tracker, its features, or the assistant.
unknown: Requests that do not fit any of the above categories.
 `


const readmeDescr = `You are an AI assistant for the Unkaos task tracker. Follow these steps:

1. Parse the README to find information related to the user's question.
2. Translate the answer to the user's language if needed.
3. If the question is about your AI abilities, explain that you can search or update issues, or provide answers from the documentation.
4. Provide a full answer.
5. If no valid answer is found, respond with "not_found".
6. Do not invent any facts; use only information from the README (summarization is allowed).

Ensure clarity and completeness in your responses.
The readme:`


const commandAnswerSchemma :any= {
find_issues:
`{
  "type": "object",
  "required": ["command", "filter"],
  "properties": {
    "command": {
      "type": "string",
      "enum": ["find"]
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
    }
  }
}
`,
update_issues:
`{
  "type": "object",
  "required": ["command", "set", "target"],
  "properties": {
    "command": {
      "type": "string",
      "enum": ["update"]
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

}

const unkaosDescrBase0 = `you are NLP for Unkaos task tracker, 
answer only a valid JSON matching provided schema, no other text:
`

const unkaosDescrBase1 = 
`The 'filter' is a JSON-based query to select issues to be changed. If no rules are specified, do not use the 'filter' attribute. Use only the rules provided, and format filter strings with single quotes, avoiding quotes for field and attribute names.
Field names can be '=', '>', '<', or 'like'. Logical conditions are 'and' and 'or'. When a prompt asks for issues about something, it means either 'Название' or 'Описание' contains that value. Use the condition (Название like ... or Описание like ...), with 'or' as the operator. Enclose this expression in parentheses and use %val% for the like condition as in SQL.
Do not use single quotes for attribute values; always use double quotes.
Do not translate any values. Ignore irrelevant information like emotions and use only relevant information.
Use yyyy-mm-dd format for dates.
Available issue attributes are 'sprint', 'status', 'project', 'type', 'created_at', 'updated_at', 'title', 'description', 'author'. The 'num' attribute is a numeric ID and strictly an integer.
Available issue fields are:
`



const unkaosDescr: any = {
  find_issues:
`
you parse promt for find issues command.

If the field or issue attribute has a list of available values, any values in 'filter' must be from the available values list.
`,
update_issues:
`
Parse the prompt for the update issues command.
Verbs resembling a status change applied to issues indicate setting the status to that value and do not affect the filter query. For example, "close an issue" means to change its status to 'closed' without filtering, and "put aside" means to set the status to 'put aside'.
Context issues are the current issues on the page. 'Target' refers to the issues to modify, which by default are the context issues. It can also refer to children of the current context issues. Actions on all issues of the tracker should use 'global' as the target value.
The 'set' attribute should contain an array of objects, each with 'name' and 'value' attributes. The 'name' attribute indicates the field to set or update, and the 'value' attribute contains the new value. If the field accepts a limited set of values, 'value' must be one of those values or set to 'inherit' to copy from the context issues (current or all).
Do not use 'parent...' value; use 'inherit' instead. The 'name' of a 'set' item can be 'parent' if the user wants to change the parent issue, in which case 'value' is the full number of the new parent. The full number consists of the short project name, a hyphen, and the numeric part.
If a field or issue attribute has a list of available values, any values in 'set' and 'filter' must be from this list. The 'set' attribute cannot be empty.
The 'status' attribute for the filter can include the value 'Решенные', which can be used as one of the available values.
`
}

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

  private createRequestConfig(systemMessage: string, userMessage: string, isSecond: boolean = false){

    console.log('temperature00openaiConfig>>', openaiConfig)


    isSecond = isSecond && openaiConfig.url2 && openaiConfig.key2 && openaiConfig.model2
    let url = isSecond ? openaiConfig.url2 : openaiConfig.url;
    let key = isSecond ? openaiConfig.key2 : openaiConfig.key;
    let model = isSecond ? openaiConfig.model2 : openaiConfig.model;
    let temperature = isSecond ? openaiConfig.temperature2 : openaiConfig.temperature;
    let proxy = isSecond ? openaiConfig.proxy2 : openaiConfig.proxy;

    console.log('temperature000 model>>', model)

    const defaultTemperature = isSecond ? 0.2 : 0.4;
    console.log('temperature0>>', temperature)
    try{
      temperature = Number(temperature);
      if( isNaN(temperature)) temperature = defaultTemperature;
    }
    catch{
      temperature = defaultTemperature;
    }
    
    console.log('temperature>>', temperature)
    let data: any = {
      "model": model,
      //"response_format": { "type": 'json_object' },
      "messages": [
            {
                "role": "system",
                "content": systemMessage
            },
           
          {
            "role": "user",
            "content": userMessage
        }],
       
      "temperature": temperature//Number(openaiConfig.temperature)
    };

    if(systemMessage.indexOf('JSON') > -1){
      data.response_format = { "type": "json_object" };
    }

    let config:any = {
      method: 'post',
      maxBodyLength: Infinity,
      url: url + 'chat/completions',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + key
      },
      data : JSON.stringify(data)
    };

    if(proxy){
      const proxyAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = proxyAgent;
    }

    return config;
  }

  public async classify(input: string): Promise<any> {
    console.log('classify gpt', openaiConfig)

    let config:any = this.createRequestConfig(classifyDescr, input, false)

    try{
      let response = await axios(config);

      console.log('>>gptResponse0', response.data.choices[0].message.content);
      if(!response.data.choices[0].message.content) return {};
      console.log('>>gptResponse', response.data.choices[0].message.content);
      return {command: response.data.choices[0].message.content.replace('\n','')};
    }
    catch(err) {
      console.log(err);
      return {};
    }
  }

  public async useReadme(input: string): Promise<any> {
    const readme = await axios({url:'https://raw.githubusercontent.com/khvilon/unkaos/master/README.md'});

    let descr = readmeDescr + readme.data;

    console.log('readme descr', descr)

    let config:any = this.createRequestConfig(descr, input, true)

    

    try{
      let response = await axios(config);
      console.log('>>gptResponse0', response.data.choices[0].message.content);
      return {humanGpt: response.data.choices[0].message.content};
    }
    catch(err) {
      console.log(err);
      return {};
    }
  }

  private async ask(input: string, context: string = ''): Promise<any> {


    console.log('ask gpt openaiConfig', openaiConfig)

    context += '. today is '+ new Date().toLocaleString() +'' + new Date().toLocaleTimeString();

    let config:any = this.createRequestConfig(context, input, false)

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



  public async parseUserCommand(input: string, command: string, fields: Array<any>, language: string = 'russian'): Promise<any> {
  
    const fieldsStr = JSON.stringify(fields.map((item: any)=>'"' + item.name + '"').join(', '))

    const context: string = 
    unkaosDescrBase0 + commandAnswerSchemma[command] + unkaosDescr[command] + unkaosDescrBase1 + fieldsStr;

    const parsedCommand = await this.ask(input, context)

    return parsedCommand
  }

}

export default Gpt
