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

    ["Unkaos идеологически вдохновлен классическими продуктами, такими как Jira, Youtrack и другими.", { en: "Unkaos is inspired by classic systems like Jira, Youtrack and others." }],
    ["Функциональность включает канбан доски, учет времени, гибкую настройку статусной модели и полей, оповещение на почту и в меседжеры, ИИ интерпретатор команд и продолжает развиваться.", 
    { en: "The functionality includes Kanban boards, time tracking, flexible configuration of status models and fields, notifications via email and messengers, an AI command interpreter, and continues to evolve." }],
    ["Работа с системой", { en: "Get started" }],
    ["Регистрация рабочего пространства в облаке", { en: "Create workspace in cloud" }],
    ["Репозиторий - установка одной командой", { en: "Repository - single command install" }],
    ["Документация", { en: "Documents" }],
    ["Лицензия", { en: "License" }],
    ["Связаться с автором", { en: "authors contacts" }],
    ["по почте ", { en: "email " }],
    ["в телеграм ", { en: "telegram " }],
    ["Николй Хвилон", { en: "Nikolay Khvilon" }],
    ["Версии", { en: "Versions" }],
    ["Стабильная", { en: "Stable" }],
    ["Последняя", { en: "Latest" }],
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
