# 
# 
<div align="center">

![Логотип Unkaos](pictures/big_logo.png)

[![Лицензия: Apache 2.0](https://img.shields.io/badge/Лицензия-Apache%202.0-blue.svg)](LICENSE) 
[![Канал в Telegram](https://img.shields.io/badge/канал-Telegram-blueviolet.svg)](https://t.me/unkaos_info)
</div>

## Ваш трекер задач с открытым исходным кодом

**Unkaos** — это мощный трекер задач с открытым исходным кодом, вдохновленный функциональностью Jira и YouTrack, предназначенный для команд разработчиков и не только. Наслаждайтесь надежным инструментом управления проектами с гибкой настройкой, все под лицензией Apache 2.

🌐 Официальное облако: [http://unkaos.org](http://unkaos.org) | 📦 Установка на ваш сервер: [Руководство по установке](#standalone-setup)

Построен на стабильных и современных технологиях, таких как Vue.js 3, Node.js, TypeScript и PostgreSQL, обеспечивает комфортное взаимодействие с пользователем, включая обновления в реальном времени с помощью WebSockets и даже ИИ для понимания запросов пользователей естественным языком.

## 📖 Содержание

1. [📚Руководство пользователя](#user-guide)
    - [🧑‍💻Для членов команды](#for-team-members)
      - [Задачи](#issues)
        - [Поиск задач](#finding-issues)
        - [Создание задач](#creating-issues)
        - [Работа с задачей](#working-with-an-issue)
        - [Массовые изменения и другие возможности ИИ](#bulk-changes-and-other-ai-options)
      - [Доски Agile](#agile-boards)
        - [Использование доски](#using-the-board)
        - [Создание и настройка доски](#creating-and-configuring-your-board)
      - [Панели мониторинга](#dashboards)
        - [Обзор панелей](#dashboard-overview)
        - [Список задач](#issue-list)
        - [Отчеты по времени](#time-reports)
        - [Диаграммы сгорания](#burndown-charts)
      - [Персональные настройки](#personal-configurations)
    - [🛠️Для администраторов рабочих пространств](#for-workspace-administrators)
      - [Настройки рабочего пространства](#workspace-configurations)
      - [Настройка процессов](#customizing-processes)
      - [Пользователи и роли](#users-and-roles)
    - [📦Автономная установка](#standalone-setup)
      - [Установка](#installation)
      - [Настройки сервера](#server-configurations)
2. [💻Документация для разработчиков](#developer-documentation)
    - [Архитектура](#architecture)
    - [Участие в разработке](#contributing)
    - [Справочник API (в разработке)](#api-reference-in-progress)
3. [📢Информация](#info)
    - [Новости](#news)
    - [Контакт автора](#contact-the-author)

# 📚User Guide

## 🧑‍💻For Team Members
If you are invited to join an existing project, you should contact your admin. They will add you to the workspace, and you will receive an email with a link to sign in and a temporary password, which you can then change in your user settings.

### Issues

#### Finding Issues

To find issues, you can use the search field on the 'Issues' page. This field suggests available options at each step of your query construction. The syntax is SQL-like, where each query consists of filters: each filter starts with an issue field name, followed by an operator, and then the value. Filters can be mixed and grouped with logical operators.

When the searched value is a string not from a list of available values, enclose it in quotes (' '). Dates should be formatted as 'yyyy-mm-dd', like '2016-07-16'.

If you're unsure about the correct query structure or prefer not to write it in this manner, don't worry. The Unkaos AI will interpret any prompt to understand what you're seeking and will generate the corresponding query for you.


#### Creating Issues

To create an issue, use the button located near your profile in the upper right corner. Like the profile, this button is accessible from any page.

Additionally, when you're on an issue page, you can create a new one using the clone button found in the top menu, or by using the subtask creation button next to it.

Some configurations of agile boards allow for quick and simple new issue creation directly from a board column, using the '+' button.

#### Working with an Issue

To edit an issue, click the pen icon in the top menu. Once in edit mode, you can change the name, description, or project. Note that changing the project will result in a change to the issue number due to its structure, which includes the short project name. Don't forget to use the save button or press Ctrl+S after making changes in edit mode. Other fields, which are located on the right panel, are editable in any mode, and changes are applied as soon as you move the focus away from the field.

The description in edit mode is provided with both a text field for editing with Markdown and a preview. Use a standard Markdown guide if you wish to become more familiar with your options. Feel free to paste images directly into the editable description field.

If you want an image to be available in the issue but not embedded in the description, add it in the attachments section. There, you can attach any files to your issue.

Issue status transitions are available only according to the corresponding workflow.

The button with an eye icon in the top menu enables you to watch the issue - meaning you'll be notified of any changes by email or through messengers.

Additionally, you can manage relations, tags, and time usage in the issue.



#### Bulk Changes and Other AI Options

There is a magic wand button located in the bottom right corner on the issue, issues list, and board pages. It opens a panel for AI requests. In the left field of this panel, you can enter a command in natural language, then press the 'brain' button to get an AI interpretation. Commands for issue search, creation, and updates are available. The right field will display a structured interpretation of your command. Exercise caution and verify it accurately reflects your request, especially for modification commands. Note that this feature allows you to make bulk changes in Unkaos, and it's crucial to ensure it's applied to the correct set of issues.

### Agile Boards

#### Using the Board

Agile boards give a visual overview of the project's progress. Drag and drop issues between columns to update their status.

#### Creating and Configuring Your Board

Go to the "Boards" section and click "Create New Board." Choose the board's layout, columns, and which issues it should display.

### Dashboards

#### Dashboard Overview

Dashboards provide a customizable overview of your projects. You can add widgets like issue lists, time reports, and burndown charts.

#### Issue List

The issue list widget displays your issues in a list, with options to sort and filter based on various criteria.

#### Time Reports

Time reports track time spent on tasks. They can be used to generate insights into team productivity and project timelines.

#### Burndown Charts

Burndown charts visualize your project's progress against its timeline, helping teams stay on track.

### Personal Configurations

In your user settings, you can configure notifications, update your profile, and change your password. Access settings from the user menu in the top right corner.

## 🛠️For Workspace Administrators

As a workspace administrator, you have additional responsibilities and capabilities within Unkaos.

### Workspace Configurations

Admins can configure global settings, including project structures, default permissions, and integrations with other tools.

### Customizing Processes

Customize workflows, issue fields, and user roles to fit your team's processes. Access these settings from the admin dashboard.

### Users and Roles

Manage user accounts and roles from the "Users" section in the admin dashboard. You can add new users, assign roles, and set permissions.

## 📦Standalone Setup



### Installation
The installation should be performed on a machine with a fresh OS, currently supporting Ubuntu and Debian.

Log into the machine as a user with sudo rights and run the command:

```bash
wget -O - https://raw.githubusercontent.com/khvilon/unkaos/master/setup.sh | bash
```

This will execute the installation script with a wizard that asks for your domain name and the database password.

Additionally, the script will install a Certbot certificate for HTTPS, or you can skip this step if you already have one.

### Server Configurations

...

# 💻Developer Documentation

## Architecture

Unkaos is built on a robust, scalable, and modern technology stack designed for efficiency and ease of use. At its core, Unkaos uses Vue.js 3 for the front end, providing a reactive and composable user interface. The back end is powered by Node.js, ensuring fast and scalable server-side logic. Data storage is managed by PostgreSQL, known for its reliability and powerful features.

### Key Components:

- **Frontend**: Vue.js 3
- **Backend**: Node.js
- **Database**: PostgreSQL
- **Real-Time Updates**: the Unkaos AI service can use any model over openai protocol

## Contributing

We welcome contributions from the community! Whether you're interested in fixing bugs, adding new features, or improving documentation, your help is appreciated.

### Getting Started:

1. **Fork the repository**: Start by forking the Unkaos repository on GitHub.
2. **Clone your fork**: Clone your fork to your local machine for development.
3. **Create a new branch**: Make your changes in a new git branch.
4. **Commit your updates**: Commit your changes with clear, descriptive commit messages.
5. **Submit a pull request**: Push your changes to your fork and submit a pull request to the main Unkaos repository.

If your changes includes DB migrations, place it into a file named m.sql in the /server/db folder. 

## API Reference (in progress)

A V2 API is currently in development. Upon release, it will include an OpenAPI specification, providing a comprehensive and interactive documentation for developers.

For the moment, you can leverage requests captured from developer tools for temporary automation tasks. However, it is recommended to wait for the V2 API for serious development efforts to ensure compatibility and access to the full suite of new features.

Stay tuned for updates and the detailed documentation on how to utilize the Unkaos API effectively.


# 📢Info

Stay updated with the latest news and updates from Unkaos. Join our Telegram channel, or reach out to the author directly.

🔔News: [https://t.me/unkaos_info](https://t.me/unkaos_info)
<br>
📧 Contact: n@khvilon.ru | [@khvilon](https://t.me/khvilon)
