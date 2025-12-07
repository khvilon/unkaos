# Aether (MCP service)

Отдельный сервис для MCP, который сам получает токен через Cerberus и работает поверх API Zeus2.

## Endpoint
- `GET/POST /aether-mcp` через nginx:3002 (SSE + JSON-RPC)

## Headers
- `subdomain` — workspace
- `email` — логин
- `password` — пароль

## Health
- `GET /health` → `{ status: "ok" }`

## Возможности
- search_issues (title/description LIKE, limit 20)
- get_issue (PROJ-123)
- create_issue (title/description/project/type)
- update_issue_status (workflow transitions)
- get_available_transitions
- list_projects / list_statuses / list_issue_types

## Пример конфигурации (Cursor)
```json
{
  "mcpServers": {
    "unkaos": {
      "url": "https://your-server.com:3002/aether-mcp",
      "headers": {
        "subdomain": "your-workspace",
        "email": "your@email.com",
        "password": "your-password"
      }
    }
  }
}
```


