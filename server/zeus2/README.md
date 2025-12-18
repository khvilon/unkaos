# Zeus2 - REST API v2

Микросервис REST API второй версии для Unkaos. Построен на Express.js + Prisma ORM.

## 📋 Оглавление

- [Особенности](#особенности)
- [Быстрый старт](#быстрый-старт)
- [API Endpoints](#api-endpoints)
- [Архитектура](#архитектура)
- [Безопасность](#безопасность)
- [Тестирование](#тестирование)
- [Конфигурация](#конфигурация)

## ✨ Особенности

- **REST API v2** с версионированием `/api/v2/`
- **CRUD Factory** - генерация типовых CRUD операций без дублирования кода
- **Prisma ORM** - типобезопасная работа с PostgreSQL
- **Socket.IO** - интеграция с Gateway для real-time коммуникации
- **JQL-подобные запросы** - мощная фильтрация через `@unkaos/query-lang`
- **Rate Limiting** - защита от DDoS (1000 req/15min)
- **Zod Validation** - строгая валидация входных данных
- **Health Checks** - Kubernetes-ready проверки `/health/live` и `/health/ready`
- **Structured Logging** - логирование через Pino
- **SQL Injection Protection** - параметризованные запросы + валидация

## 🚀 Быстрый старт

### Требования

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

### Установка

```bash
# Установка зависимостей
npm install

# Генерация Prisma клиента
npm run prisma:generate

# Запуск в dev режиме
npm run dev

# Сборка
npm run build

# Запуск production
npm start
```

### Переменные окружения

```env
ZEUS2_PORT=3007
DB_HOST=localhost
DB_PORT=5432
DB_USER=unkaos
DB_PASSWORD=secret
DB_DATABASE=unkaos
```

## 📡 API Endpoints

### Issues (Задачи)

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v2/issues` | Список задач с фильтрацией |
| GET | `/api/v2/issues/:uuid` | Получить задачу по UUID |
| POST | `/api/v2/issues` | Создать задачу |
| PUT | `/api/v2/issues/:uuid` | Обновить/создать задачу (upsert) |
| PATCH | `/api/v2/issues/:uuid` | Частичное обновление |
| DELETE | `/api/v2/issues/:uuid` | Soft delete |
| GET | `/api/v2/issues-count` | Количество задач |

#### Пример запроса с фильтрацией

```bash
# Фильтр кодируется в base64
QUERY=$(echo -n "Проект = 'TEST' AND Статус != Закрыт ORDER BY Создана DESC" | base64)
curl -H "subdomain: mycompany" \
     "http://localhost:3007/api/v2/issues?query=$QUERY&limit=50"
```

### Другие сущности

Все сущности поддерживают стандартные CRUD операции:

- `/api/v2/projects` - Проекты
- `/api/v2/users` - Пользователи
- `/api/v2/issue-statuses` - Статусы
- `/api/v2/issue-types` - Типы задач
- `/api/v2/workflows` - Воркфлоу
- `/api/v2/sprints` - Спринты
- `/api/v2/boards` - Доски
- `/api/v2/dashboards` - Дашборды
- `/api/v2/fields` - Поля
- `/api/v2/roles` - Роли
- `/api/v2/time-entries` - Записи времени
- `/api/v2/attachments` - Вложения
- `/api/v2/relations` - Связи между задачами

### Health Checks

```bash
# Полный health check
curl http://localhost:3007/health

# Liveness probe (для k8s)
curl http://localhost:3007/health/live

# Readiness probe (для k8s)
curl http://localhost:3007/health/ready
```

## 🏗 Архитектура

```
zeus2/
├── index.ts              # Точка входа, настройка Express
├── routes/               # REST роуты для сущностей
│   ├── issues.ts         # Сложная логика для задач
│   ├── projects.ts       # Используют CRUD Factory
│   ├── users.ts          # Кастомная логика (роли)
│   └── ...
├── utils/
│   ├── crud-factory.ts   # Генератор CRUD роутов
│   ├── validation.ts     # Zod схемы валидации
│   ├── issue-query-parser.ts  # Парсер JQL запросов
│   └── issue-query-builder.ts # Построитель SQL
├── types/
│   └── index.ts          # TypeScript типы
├── __tests__/
│   └── crud-factory.test.ts
└── prisma/
    └── schema.prisma
```

### CRUD Factory

```typescript
// Пример использования CRUD Factory
createCrudRoutes(app, prisma, listeners, API_PREFIX, {
  entity: 'projects',
  singular: 'project',
  fields: ['uuid', 'name', 'short_name', 'owner_uuid', 'created_at', 'updated_at'],
  requiredFields: ['name', 'short_name'],
  uuidFields: ['owner_uuid'],
  relations: [
    {
      table: 'users',
      alias: 'U',
      foreignKey: 'owner_uuid',
      selectFields: [{ field: 'name', as: 'owner_name' }]
    }
  ],
  softDelete: true,
  defaultOrder: 'name ASC'
});
```

## 🔒 Безопасность

### Защита от SQL Injection

1. **Параметризованные запросы** - все пользовательские данные передаются как параметры
2. **escapeIdentifier()** - экранирование имён схем/таблиц с валидацией
3. **UUID валидация** - проверка формата UUID перед использованием в SQL
4. **Zod валидация** - строгая проверка всех входных данных

```typescript
// ❌ Опасно
const sql = `SELECT * FROM issues WHERE uuid = '${uuid}'`;

// ✅ Безопасно
const sql = `SELECT * FROM issues WHERE uuid = $1::uuid`;
await prisma.$queryRawUnsafe(sql, uuid);
```

### Rate Limiting

- 1000 запросов на IP за 15 минут
- Пропускает `/health` и `/read_listeners`

### Headers

- `X-Request-Id` - уникальный ID запроса
- `X-Trace-Id` - ID для трассировки через микросервисы

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тесты с coverage
npm run test -- --coverage

# Watch режим
npm run test:watch
```

### Структура тестов

```typescript
describe('escapeIdentifier', () => {
  test('экранирует простой идентификатор', () => {
    expect(escapeIdentifier('users')).toBe('"users"');
  });

  test('блокирует SQL injection', () => {
    expect(() => escapeIdentifier("'; DROP TABLE--")).toThrow();
  });
});
```

## ⚙️ Конфигурация

### Prisma

```bash
# Синхронизация схемы с БД
npm run prisma:pull

# Генерация клиента
npm run prisma:generate
```

### Socket.IO

Сервис поддерживает WebSocket соединения для интеграции с Gateway:

```javascript
const socket = io('http://localhost:3007');

socket.emit('request', {
  method: 'GET',
  url: '/api/v2/issues',
  headers: { subdomain: 'mycompany' }
}, (response) => {
  console.log(response.data);
});
```

## 📊 Мониторинг

### Health Response

```json
{
  "status": "ok",
  "service": "zeus2",
  "version": "v2",
  "uptime": 3600,
  "endpoints": 45,
  "database": {
    "status": "connected",
    "latency": 2
  },
  "memory": {
    "heapUsed": 45,
    "heapTotal": 65,
    "external": 2,
    "rss": 85
  },
  "timestamp": "2024-12-03T10:00:00.000Z"
}
```

### Логирование

Все логи в JSON формате для парсинга:

```json
{
  "level": 30,
  "time": 1701601200000,
  "msg": "HTTP Request",
  "method": "GET",
  "path": "/api/v2/issues",
  "status": 200,
  "duration": 45,
  "requestId": "abc-123",
  "subdomain": "mycompany"
}
```

## 🤖 MCP

MCP теперь вынесен в отдельный сервис **Aether** (`/aether-mcp` через nginx:3002). Zeus2 больше не публикует MCP endpoint.

### Как получить токен

```bash
curl -X GET "https://your-server.com:3002/get_token" \
  -H "subdomain: your-workspace" \
  -H "email: your@email.com" \
  -H "password: your-password"
```

Ответ:
```json
{
  "user_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profile": {
    "uuid": "...",
    "name": "Your Name",
    "mail": "your@email.com"
  }
}
```

Используйте `user_token` как значение для header `token`.

### Примеры использования

После настройки AI-ассистент сможет:

```
"Найди задачи про авторизацию"
"Покажи задачу PROJ-42"
"Создай задачу в проекте PROJ: Исправить баг в форме логина"
"Возьми задачу PROJ-42 в работу"
"Закрой задачу PROJ-42"
```

### Workflow и статусы

MCP учитывает workflow:
- При создании задачи — автоматический начальный статус
- При смене статуса — проверка допустимых переходов
- Недопустимые переходы блокируются с понятным сообщением

### API Reference

MCP перенесён в сервис **Aether** (`/aether-mcp` через nginx:3002). Zeus2 MCP-эндпоинт удалён. Примеры и настройки см. в `server/aether/README.md`.

### Безопасность

- Авторизация через стандартный механизм Unkaos (token → Cerberus)
- Все операции выполняются от имени авторизованного пользователя
- Рекомендуется использовать отдельный сервисный аккаунт для AI-интеграции
- Токен можно обновлять при необходимости через `/get_token`

## 📝 Changelog

### v2.1.0

- Перенос MCP в отдельный сервис Aether

### v2.0.0

- Миграция на Prisma ORM
- Параметризованные SQL запросы
- Zod валидация
- Rate Limiting
- Улучшенные Health Checks
- TypeScript типизация

## 📄 Лицензия

Proprietary - Unkaos © 2024

