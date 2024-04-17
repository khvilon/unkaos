const axios = require('axios');
const token='eyJjdHkiOiJqd3QiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiYWxnIjoiUlNBLU9BRVAtMjU2In0.OcefSrWeLFhjW7jp7MdIdKVccTLdnjFhgh_nHIGsJCyxs1TTyL7P4RyEtN4UZHJIqWVbza-mgqFWHZBhdn6J2vxH-iV3qAbmNwaR8y5e6Xny3Z37jczOKf0itkB_Xsl2pyKgyx1NZOAszT61clSlS1_7nn1Hp-xHhP_nN_7Rj7YAoYTTKprBwq4X4-9uAgm_lU0jaT49DWLof-OmGBc8W8g89nD2sjT2gswXConequUQ3qrlGeO-9CyBvm0XJeyMU9ltSrvVsDyUebYqVIBfWTxBE6v1hhL2MFR4MsEkXfhIhipcSFGUS8WxixeLVAyts_kWsXFuB36LFZlwqx7dEg.SfpcbUggn0a426twNCK0-A.56Xy_a48gzc0VTaqyd9pIfeXhCL7-0sPtsgxkSH4PUl7ZNKPHfT6hO_5YvYwruH8zxrfUa51KgVhiT8r0J4bo44l9MA1u8eJ2XF-RiU_TbiqIjAwRJkmlIEVmV8NvfKPFYv_YuybOwHWM5grVEQn4G16ohV_3DNqhzH9MAlbsub1qVkAekkkeiNr5c2LQJ65wqaJaBi-k5oUozC0CpXImzmxElLkahoL8TTgzgMnsB8TyXf2k1pEIzDzkoe3rNw2O1VPRHCFbGUCVgM-6uwNhpD86nzA7qkMsveUzHJ1CSULQRFNxo0EQbNBAqXfKVGbsDmz1Dg-SSJzwZktmK2Z8v2kAdT3YtcsxsreiAKzikpUF89Gy3Pbpb-ytv1DhrD0FjOVcVdu11eGMXNhx8B3O1UJIyAcpO-Qf69aBreNrggiYlmtMtyJIkZwUYidoiFli6rcjr1u1GpX3N0cKxlgQr6_N0tXL585NkALBoXz_huXbWux-TAKiowDdNvwa80-XFmP_07KY7EwfY2lvRYL2Ma03hIweFIUyGo-W4CTuoYCubZ7HQL4EYzq1jsiVEML6lgK4kGa6EzeVmpyRBwBDzKn7ei7M3WighaslpqvjEmLPf9F2z89ol-JY184XlamKmDQ4I0dZjOsdWgPvZqj2UstkY3l3lN3ffj81nU7HA82fNd_jj1o_QaUM40uyoz31BXzbkr5Y4ZcfLWSMtjtEmxQgRyD6ALpXa4xZkldtS4.9RJOU6w1GF0VwJgFEnrQt7YSsFDgVLp29xP0T0PORpg'

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
/*
const unkaosDescr = `
you do NLP in task tracker. 
You get user prompt and return jsod with schema: ${commandAnswerSchemma}. 
Answer only with a valid json, no any additional text, just the JSON. 
if you are not sure, tr to guess
if you need to use date, use 'yyyy-mm-dd'.

'command' attribute represents the action that the user wants to perform.

'target' is 'current' by default - the command is in context of the current user page issues.
it can be 'children' of page issues if directly specified by user or over all issues ('global') in the system if the user specifies it directly. 

The 'set' attribute should contain an array of objects, each with a 'name' and 'value' attribute. 
The 'name' attribute should indicate the name of the field that the user wants to set or update, 
and the 'value' attribute should contain the new value for that field. If the field accepts a limited set of values, 
the 'value' attribute must be one of the available values or set to 'inherit' to copy the value from the context issues (can be current or all).
dont use 'parent...' value, use inherit instead.
also the name of 'set' item can be 'parent' if the user want to change the parent issue, in this case the value is the full number of new parent.
the full number consists of the short project name, '-' and the numeric part.
If the field or issue attribute has a list of available values, any values in 'set' and 'filter' must be from the available values list.

The 'filter' is a JSON-based query to select issues to be changed. 
If rules on selected issues are not specified, do not use the 'filter' attribute at all. 
Be careful not to use any rule that was not strictly asked. Use single quotes for filter strings, 
and do not use quotes for field and attribute names in the filter query. 
A field/attribute name can be only '=', '>', '<', or 'like' to its value. Logical conditions are only 'and', 'or'.
When a prompt asks for issues about something, it means that either the field 'Название' or the field 'Описание' contains that. 
Therefore, for this condition in the filter, use '(Название like ... or Описание like ...)', 
taking into account that the operator for this expression is 'or', not 'and'. Make sure to enclose this expression in parenthesis. 
Other conditions can be used as usual.

dont use ' for attributes values, always use "

Do not translate any values. Ignore unuseful information like emotions and use only the relevant information.

Verbs resembling a status applied to issues indicate setting the status to that value and do not affect the filter query. 
For example, to close an issue means just to change its status to a status like 'closed' without filtering, 
and to put aside means to set the status to 'put aside'.

Available issue attributes are 'sprint', 'status', 'project', 'type'. 
The 'num' attribute is the numeric ID, and 'num' is strictly an integer. Available issue fields are:
` +
*/


const unkaosDescr = `
Ты сервис по NLP для таск трекера. 
Пользовательские запросы истрактовываешь как команду в трекере и отвечаешь без пояснений json соответствующий схеме: ${commandAnswerSchemma}. 
Если даже не уверен, старайся угадать.
Даты пиши в формате 'yyyy-mm-dd'.

аттрибут 'command' - действие, которое хочет сделать пользователь.

аттрибут 'target' - контекст команды, по умолчанию имеет значение 'current'. В этом случае команда применяется к задачам со страницы пользователя.
'target' имеет значение 'children' только если пользователь в явном виде указал желание применить команду к дочерним, т.е. к подзадачам, не используй если в запросе нет слова про дочернюю или подзадачу.
'target' имеет значение 'global' только если пользователь в явном виде указал желание работать со всеми задачами системы, а не только из текущего окна.
Обязательно проверь себя, чтобы 'target' не имел ошибочно значение 'children' или 'global'.

аттрибут 'set' содержит массив изменяемых полей и атрибутов задач, у каждого указан 'name', 'value'. 
'name' - название поля или атрибута, который пользователь хочет изменить или поменять. 
'value' содержит желаемое пользователем новое значение. 
If the field accepts a limited set of values, 
Если в описании поля есть список возможных значений, 'value' данного поля может задаваться только строго значениями из этого списка.
Если пользователь хочет задать знаение такое же как у задач контекста, значение 'value' должно быть inherit.
'name' также может иметь значение 'parent' если пользователь хочет задачам задать новую родительскую задачу,
в этом случае 'value' должен содержать полный номер задачи, которая должна стать родительской.
Полный номер задачи состоит из буквенного краткого обозначения проекта, '-' и числового номера.

'filter' является JSON-based query для фильтрации из контекста задач, к которым применится команда. 
Если правила фильтрации пользователь не указывает, этот атрибут в ответ не добавляй.
Добавляй только фильтры, которые просит пользователь.
для строковых значений используй одинарные кавычки,  
операторы для 'value' могут быть '=', '>', '<', 'like'.
логические операторы, соединяющие условия только 'and', 'or'.
Если пользователь спрашивает задачи про что-то, это значит, или поле 'Название' или 'Описание' содержат это,
добавь соответствующие условия в фильтр. 

Ничего не переводи с одного языка на другой. Игнорируй лишние данные, такие как эмоции и т.д.

Глаголы применяемые к задачам означают желание присвоить соответствующий Статус и не влияют на фильтр.

Например "отложи задачу" значит присвоить полю зтатус значение "отложена", 
а "закрой" - присвоить статус "закрыта" или "завершена" если нет в списке возможных значений "закрыта"

Атрибуты задач 'sprint', 'status', 'project', 'type'. 
Атрибут 'num' - целочисленный идентификатор задачи. Задача имеет поля:
` +

'Автор, Назначеа на, Создана, Обновлена, Назвние, Описание, Приоритет'


//let userMessage = `Сделай спринт 99 задачам у которых автор садовский и назначены на иванова`
let userMessage = `Найди дочерние, созданные вчера`




let data = JSON.stringify({
  "model": "GigaChat-Pro",
  "messages": [
        {
            "role": "system",
            "content": commandAnswerSchemma
        },
        {
            "role": "user",
            "content": 'Поменять спринт у назначенных на петрова или горского на 93'
        },
        {
            "role": "assistant",
            "content": `{
              "command": "update",
              "target": "current",
              "filter": {
                "conditions": [
                  {
                    "name": "Назначеа на",
                    "operator": "=",
                    "value": "Петров"
                  },
                  {
                    "name": "Назначеа на",
                    "operator": "=",
                    "value": "Горский"
                  }
                ],
                "operator": "or"
              },
              "set": [
                {
                  "name": "sprint",
                  "value": "93"
                }
              ]
            }`
        },
        {
          "role": "user",
          "content": 'Поменять дочерним спринт на 89 и родительскую задачу на TD-569'
      },
      {
          "role": "assistant",
          "content": `{
            "command": "update",
            "target": "children",
            "set": [
              {
                "name": "sprint",
                "value": "89"
              },
              {
                "name": "parent",
                "value": "TD-569"
              }
            ]
            
          }
          `
      },
      {
        "role": "user",
        "content": 'Найди все задачи созданные в этом году соколовой со статусом новая или в работе'
    },
    {
        "role": "assistant",
        "content": `{
          "command": "find",
          "target": "global",
          "filter": {
            "conditions": [
              {
                "name": "Автор",
                "operator": "=",
                "value": "соколова"
              },
              {
                "name": "Создана",
                "operator": ">",
                "value": "2024-01-01"
              },
              {
                "conditions": [
                  {
                    "name": "status",
                    "operator": "=",
                    "value": "новая"
                  },
                  {
                    "name": "status",
                    "operator": "=",
                    "value": "в работе"
                  }
                ],
                "operator": "or"
              }
            ],
            "operator": "and"
          }
        }
        `
    },
        {
            "role": "user",
            "content": userMessage
        }
    ],
  "temperature": 0.1
});

let config = {
  method: 'post',
maxBodyLength: Infinity,
  url: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions?t=1',
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