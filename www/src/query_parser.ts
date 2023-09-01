const query_parser = {};

const locate_rule = function (user_query, fields) {
  const operators = ["=", ">", "<", "<=", ">="];

  for (const o in operators) {
    const parts = user_query.split(operators[o]);

    if (parts.length == 1) continue;

    if (parts.length == 2) {
      for (const i in fields) {
        console.log(parts[0], fields[i].name.toLowerCase());
        if (fields[i].name.toLowerCase() == parts[0]) {
          return { name: parts[0], val: parts[1], operator: operators[o] };
        }
      }
      return "Поле " + parts[0] + " не существует";
    }

    return "Не корректный синтаксис оператора " + operators[o];
  }
};

query_parser.parse = function (user_query, fields) {
  console.log("user_query", user_query, fields);

  user_query = user_query.toLowerCase();
  user_query = user_query
    .replaceAll(" and ", "&&")
    .replaceAll(")and ", ")&&")
    .replaceAll(" and(", "&&(")
    .replaceAll(")and(", ")&&(");
  user_query = user_query
    .replaceAll(" or ", "||")
    .replaceAll(")or ", ")||")
    .replaceAll(" or(", "||(")
    .replaceAll(")or(", ")||(");
  user_query = user_query.replaceAll(" ", "");

  let oper = "||";
  let parts = user_query.split("||");
  if (parts.length == 1) {
    oper = "&&";
    parts = user_query.split("&&");
    if (parts.length == 1) {
      console.log(locate_rule(user_query, fields));
    }
  }
};

export default query_parser;
