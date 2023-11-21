class dict {
  static current_lang = "ru";
  static _langs = ["en"];
  static _dict_langs: Map<string, Record<string, string>> = new Map([
    ["Задачи", { en: "Issues" }],
    ["Задача", { en: "Issue" }],
    ["Пользователи", { en: "Users" }],
    ["Пользователь", { en: "User" }],
    ["Воркфлоу", { en: "Workflow" }],
    ["Создать", { en: "Create" }],
    ["Удалить", { en: "Delete" }],
    ["Дашборды", { en: "Dashboards" }],
    ["Дашборд", { en: "Dashboard" }],
    ["Уведомления", { en: "Notifications" }],
    ["Проекты", { en: "Projects" }],
    ["Роли", { en: "Roles" }],
    ["Поля", { en: "Fields" }],
    ["Статусы задач", { en: "Issue statuses" }],
    ["Типы задач", { en: "Issue types" }],
    ["Воркфлоу задач", { en: "Workflows" }],
    ["Настройки", { en: "Settings" }],
    ["Название", { en: "Title" }],
    ["Автор", { en: "Author" }],
    ["Ответственный", { en: "Assignee" }],
    ["Создана", { en: "Created" }],
    ["Изменена", { en: "Updated" }],
    ["Создать задачу", { en: "Create issue" }],
    ["Поиск...", { en: "Search..." }],
    ["Электронная почта", { en: "email" }],
    ["Воркфлоу", { en: "Workflow" }],
    ["Пароль", { en: "Password" }],
    ["Войти", { en: "Sign in" }],
    [
      "Вы находитесть на странице проекта Unkaos. Данный инструмент создан в целях борьбы с хаосом в разработке программного обеспечения и других проектах, нуждающихся в качественном трекере задач.",
      {
        en: "You are on the page of the Unkaos project. This is an instrument to fight chaos in software development and other projects that need a task tracker",
      },
    ],
    [
      "Система бесплатна и распространяется под лицензией Apache 2.0, вы можете как пользоваться облачной версией, так и установить коробочную версию. Исходный код открыт и доступен в репозитории https://github.com/khvilon/unkaos.",
      {
        en: "The system is free and is made under Apache 2.0 license. You can use it the cloud or install from https://github.com/khvilon/unkaos.",
      },
    ],
    [
      "Связаться с автором можно по почте n@khvilon.ru (Николай Хвилон)",
      {
        en: "To contact the author you can use email n@khvilon.ru (Nikolas Khvilon)",
      },
    ],
    ["Доски", { en: "Boards" }],
    ["Спринты", { en: "Sprints" }],
    ["Избранное", { en: "Favorites" }],
    ["трекер задач c открытым исходным кодом", { en: "Open-source task tracker" }],
    // Add these lines to your dict class

    ["Вы находитесь на главной странице системы Unkaos с открытым исходным кодом. Идеология данного трекера задач вдохновлена такими продуктами как Jira, Youtrack и другими.", { en: "You are on the main page of the Unkaos system with open-source code. The ideology of this task tracker is inspired by products such as Jira, Youtrack, and others." }],
    ["Исходный код доступен в ", { en: "Source code is available at " }],
    ["репозитории", { en: "repository" }],
    [" Использование возможно как в общем облаке, так и с самостоятельной установкой локальной версии. Правила использования регламентируются ", { en: " Usage is possible both in the general cloud and with the independent installation of a local version. Usage rules are regulated by " }],
    ["стандартной лицензией", { en: "standard license" }],
    ["Для регистрации нового рабочего пространства пройдите на ", { en: "To register a new workspace, go to " }],
    ["страницу регистрации", { en: "registration page" }],
    [" Для входа воспользуйтесь ссылкой, полученной на почту или обратитесь к администратору вашего рабочего пространства. Регистрировать новых пользователей в существующих рабочих пространствах могут только администраторы данных пространств.", { en: "To log in, use the link received by email or contact the administrator of your workspace. Only administrators of these workspaces can register new users in existing workspaces." }],
    ["Связаться с автором можно", { en: "You can contact the author" }],
    ["по почте ", { en: "by email " }],
    ["в телеграм ", { en: "on Telegram " }],
    ["@Khvilon", { en: "@Khvilon" }],
    ["Николй Хвилон", { en: "Nikolay Khvilon" }],
    ["Неправильный логин или пароль", { en: "Wrong login or password" }],
    ["вход в систему", { en: "user authentication" }],
    ["создание рабочего пространства", { en: "create new workspace" }],
    ["Название рабочего пространства", { en: "workspace name" }],
    ["Заявка создана, ожидается подтверждение почты", { en: "request created, waiting for mail verification" }],
    ["Не удалось создать заявку на регистрацию", { en: "Error creating new workspace request" }],
    ["Рабочее пространство уже существует", { en: "Workspace already exists" }],
    
    
    
  ]);

  set_lang(lang: string) {
    //console.log('}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}', lang)
    if (dict._langs.includes(lang)) {
      dict.current_lang = lang;
    } else {
      dict.current_lang = "ru";
    }
  }

  get(value: string): string {
    //console.log('}}}}}}}}}}}this.current_lang', dict.current_lang, dict._langs)
    const val = dict._dict_langs.get(value);
    if (val !== undefined && dict._langs.includes(dict.current_lang)) {
      //console.log('}}}}}}}}}}}this.current_lang1111111111111', dict.current_lang, val[dict.current_lang])
      return val[dict.current_lang];
    } else {
      return value;
    }
  }
}

export default new dict();
