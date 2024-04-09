const axios = require('axios');
const token='eyJjdHkiOiJqd3QiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiYWxnIjoiUlNBLU9BRVAtMjU2In0.Tqlknl1kBBwXWQ3lUV9PYwfIlmcAc02ITZIpCYYhd6LfVKwK2feaXCCRcX_cyeH0mw-SpCip0iVnz_G-Md8HoigGugYa-0Yay9UcSQyrIXti0tjmZ7gdqf5oeA4cE6wGkAfOCADRXYCVzLF8_cyEJirXnPFfZy_t56dHkR8wsB1UBdSs7g0qwDKNLH-u1-ZvsJv6BoA8DcLiePiwUofF6rdfEOUzhL6en_RCwWiPQ1Y-5eUjABs9oWdkAH6e54m6LeqCgNPzCecCfSg2mI9kY4NL0mbo1Yhm7IfWSGHJ-QuhDXKmxs3RWuMe3va9LlPMpZBJOsRYQnsqkl_bRRF-GQ.8D0BaHYgtc5rngfYkT5_9Q.XIbcZ3r70QACqs75InPk8cZFEGdVjLlVUjhX945944CKkrm_c_uPWoadDX-_TnDWwJ7BAfJ5Nz6viAuLcCzMUNUt155FdITMBR6vwC4xyOXHKrA5G00syPsWhdRIXzMBCNPjWAN8u277kKJqovd5MXAc82ZiSkydjQh-jH7CJcX3zEaeg6gAevXjmvsyyvB0fD8yy8YbBT9A6eLBYNEN18_wMSeqtMsUAsjewHqrYKdGZFo3_LMt9oXAojXFALwaEVwjfyMdfoigl0yhgmWAJjlg_U48Po9iq0tiYdAu06Y77iAoYZRHrh7Wqm3pIGuTjWsBk9tc4t3zNFn4CIOMlkSLwcZgfrmf7ruElYAhEQag1HKXRdO4KY1e_hfaqo6jBxJQ9OYaY3cXTORW_8wKQn3twxcnBNbERb6RU5ukg-pAG_FGxEHLYo5ngI5VnKJGHeFsN6ytHM9nRetPoW3R7z6L8FO_R5ID46xGaE6xaFVWiSOegxoGF7LibbqZKxlcerP2UVASwvfO22NsItTuTZ8Hq0IA9fiSNYyEDaheq0_Cxf8hR8cebgLhr8m1JutKGtXJMowVECQpfXRlHGIpYJ2bgRziv4tqFe7AGtmJUNZcloG_4D7Rmyg_6WOc_DTet8dxJXhZeaKKDgYPiw8gOaZCd684TnlnAKABM3z9rMXgEKWkLVh90cfRXFUpJE2seNcyXRCai1ryk8e-JRZ5exUkU5iiv2zpGmL4pLvNqDk.d71BF-b5iQmIIqIvhtIjni055ukpbZfVvzZrjnr817A'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
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
A user inputs a natural language command request in a task tracker. 
You  parse input, identify the requested action and any necessary parameters for the action, 
and convert it into a valid JSON that adheres to the following schema: ${commandAnswerSchemma}. Answer only with valid json, no text. if you are not sure, tr to gess
if you need to use date, use 'yyyy-mm-dd'.

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

Available issue attributes are 'sprint', 'status', 'project', 'type'. 
The 'num' attribute is the numeric ID, and 'num' is strictly an integer. Available issue fields are:
` +

'Автор, Назначеа на, Создана, Обновлена, Назвние, Описание, Приоритет'


let userMessage = `Сделай  спринт 88 задачам у которых автор садовский или назначены на иванова`



let data = JSON.stringify({
  "model": "GigaChat-Plus",
  "messages": [
        {
            "role": "system",
            "content": commandAnswerSchemma
        },
        {
            "role": "user",
            "content": userMessage
        }
    ],
  "temperature": 0.5
});

let config = {
  method: 'post',
maxBodyLength: Infinity,
  url: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
  headers: { 
    'Content-Type': 'application/json', 
    'Accept': 'application/json', 
    'Authorization': 'Bearer ' + token
  },
  data : data
};

axios(config)
.then((response) => {
  try{
    console.log(JSON.stringify(JSON.parse(response.data.choices[0].message.content), null, 4));
  }
  catch{
    console.log(response.data.choices[0].message.content);
  }
  
})
.catch((error) => {
  
  console.log(error);
});