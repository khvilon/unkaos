const axios = require('axios');
const token='sk-or-vv-5e773ad23da8603b16267d5d9bf6912e8619ae9326d8320616cd9482905f7171'

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

//Задай спринт 1 всем задачам с синим цветным списком

let unkaosDescr = `
you are NLP for a task tracker, 
answer schema: ${commandAnswerSchemma}

Note that verbs resembling a status applied to issues indicate setting the status to that value and do not affect the filter query. 
For example, to close an issue means just to change its status to a status like 'closed' without filtering, 
and to put aside means to set the status to 'put aside'.

context issues are current issues on the page.
'target' are issues to modify. by default it is the context issues. 
it can be children of context current issues. 
Asking to perform actions on all issues of the tracker should be represented by 'global' value for target.

If field accepts a limited set of values, 
its 'value' attribute must be one of the available values or set to 'inherit' to copy the value from the context issues (can be current or all).
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


/*
const unkaosDescr = `
Ты сервис по NLP для таск трекера. 
отвечай без текста по схеме: ${commandAnswerSchemma}. 
Даты пиши в формате 'yyyy-mm-dd'.

аттрибут 'target' - контекст команды, по умолчанию имеет значение 'current'. В этом случае команда применяется к задачам со страницы пользователя.
'target' имеет значение 'children' только если пользователь в явном виде указал желание применить команду к дочерним, т.е. к подзадачам.
'target' имеет значение 'global' только если пользователь в явном виде указал желание работать со всеми задачами системы, а не только из текущего окна.

Если в описании поля есть список возможных значений, 'value' в 'set'  данного поля может задаваться только строго значениями из этого списка.
Если пользователь хочет задать знаение такое же как у задач контекста, значение 'value' должно быть 'inherit'.
'name' также может иметь значение 'parent' если пользователь хочет задачам задать новую родительскую задачу,
в этом случае 'value' должен содержать полный номер задачи, которая должна стать родительской.
Полный номер задачи состоит из буквенного краткого обозначения проекта, '-' и числового номера.

'filter' является JSON-based query для фильтрации из контекста задач, к которым применится команда. 
Если правила фильтрации пользователь не указывает, этот атрибут в ответ не добавляй.
для строковых значений используй одинарные кавычки,  
операторы для 'value' могут быть '=', '>', '<', 'like'.
логические операторы, соединяющие условия только 'and', 'or'.
Если пользователь спрашивает задачи про что-то, это значит, или поле 'Название' или 'Описание' содержат это,
добавь соответствующие условия в фильтр. 

Не путай условия из 'filter' и 'set'

Ничего не переводи с одного языка на другой. Игнорируй лишние данные, такие как эмоции и т.д.

Глаголы применяемые к задачам означают желание присвоить соответствующий Статус и не влияют на фильтр.
Например "отложи задачу" значит присвоить полю зтатус значение "отложена", 
а "закрой" - присвоить статус "закрыта" или "завершена" если нет в списке возможных значений "закрыта"

Атрибуты задач 'sprint', 'status', 'project', 'type'. 
Атрибут 'num' - целочисленный идентификатор задачи. Задача имеет поля:
` +*/

'Автор, Назначеа на, Создана, Обновлена, Назвние, Описание, Приоритет'





let userMessage = `Сделай спринт 99 задачам у которых автор садовский и назначены на иванова`
//let userMessage = `Найди дочерние, созданные вчера`

unkaosDescr += '. for any date or time you use note that it is now ' + new Date()
//"cohere/command-r-plus"
//"openai/gpt-3.5-turbo-instruct"

let data = JSON.stringify({
  "model": "openai/gpt-3.5-turbo-0125",
 // "model": "cohere/command-r-plus",
  //"response_format": { "type": 'json_object' },
  
  "messages": [  
    {
      "role": "system",
      "content": unkaosDescr
  },     
      {
        "role": "user",
        "content": 'Задай спринт 88 дочерним задачам созданным в этом году Соколовой со статусом новая или в работе'
    }],
   
  "temperature": 0.4
});

/*
data = JSON.stringify({
  "model": "openai/gpt-3.5-turbo-0125", 
  "messages": [
    {"role": "user", "content": "What is the meaning of life?"}
  ]
})*/

/*
data = JSON.stringify({
    "model": "openai/gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Найди все задачи созданные в этом году соколовой со статусом новая или в работе"}
    ]
  })*/

  console.log('data', data)

let config = {
  method: 'post',
maxBodyLength: Infinity,
  url: "https://api.vsegpt.ru/v1/chat/completions",
  headers: { 
    'Content-Type': 'application/json', 
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