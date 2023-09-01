class dict {
  current_lang = "ru";
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
  ]);

  set_lang(lang: string) {
    if (dict._langs.includes(lang)) {
      this.current_lang = lang;
    } else {
      this.current_lang = "ru";
    }
  }

  get(value: string): string {
    const val = dict._dict_langs.get(value);
    if (val !== undefined && dict._langs.includes(this.current_lang)) {
      return val[this.current_lang];
    } else {
      return value;
    }
  }
}

export default new dict();
