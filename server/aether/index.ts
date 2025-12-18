import express, { Request, Response } from 'express';
import cors from 'cors';
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../common/logging';

type Session = {
  id: string;
  subdomain: string;
  email: string;
  password: string;
  token: string;
  createdAt: Date;
};

type IssueRow = {
  uuid: string;
  num: number;
  title: string;
  description?: string | null;
  project_short_name?: string;
  project_uuid?: string;
  type_uuid?: string;
  workflow_uuid?: string;
  status_uuid?: string;
};

const PORT = parseInt(process.env.AETHER_PORT || '3010');
const API_BASE = process.env.API_BASE_URL || 'https://nginx:3002';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  httpsAgent,
  timeout: 30000
});

const logger = createLogger('aether');
const app = express();
// Доверяем прокси, чтобы req.protocol/req.secure учитывали X-Forwarded-Proto
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Разрешаем HTTP только в dev; в остальных окружениях требуем https (по X-Forwarded-Proto)
app.use((req, res, next) => {
  const isDev = process.env.NODE_ENV === 'dev';
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : req.protocol);
  if (!isDev && proto !== 'https') {
    logger.warn({ msg: 'Rejected non-https request', proto, host: req.headers.host, url: req.originalUrl });
    return res.status(403).json({ error: 'HTTPS is required' });
  }
  next();
});

// Базовый лог всех запросов к Aether (помогает увидеть сам факт подключения)
app.use((req, res, next) => {
  const started = Date.now();
  const { method, originalUrl } = req;
  const headers = {
    subdomain: req.headers.subdomain,
    email: req.headers.email
  };
  logger.info({ msg: 'Incoming request', method, url: originalUrl, headers });
  res.on('finish', () => {
    logger.info({
      msg: 'Response sent',
      method,
      url: originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - started
    });
  });
  next();
});

const sessions = new Map<string, Session>();

// ---------- Helpers ----------

function b64(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64');
}

function escapeLike(str: string): string {
  return str.replace(/'/g, "''");
}

function parseIssueKey(issueNumber: string): { project: string; num: number } {
  const match = issueNumber.match(/^([A-Za-z0-9_-]+)-(\d+)$/);
  if (!match) {
    throw new Error('Issue key must be like PROJ-123');
  }
  return { project: match[1], num: Number(match[2]) };
}

async function getToken(subdomain: string, email: string, password: string): Promise<string> {
  logger.info({ msg: 'Requesting token from Cerberus', subdomain, email });
  const resp = await api.get('/get_token', {
    headers: { subdomain, email, password }
  });
  // Cerberus может вернуть {token: "..."} или строку
  const data = resp.data;
  const token =
    typeof data === 'string'
      ? data
      : data.token || data.user_token || data.data?.token || data.data?.user_token || data.data || data;
  if (!token) throw new Error('Empty token from Cerberus');
  const tokenStr = String(token);
  logger.info({ msg: 'Token received', subdomain, email, token_len: tokenStr.length, token_prefix: tokenStr.slice(0, 10) });
  return tokenStr;
}

async function ensureSession(req: Request): Promise<Session> {
  const subdomain = (req.headers.subdomain as string) || '';
  const email = (req.headers.email as string) || '';
  const password = (req.headers.password as string) || '';

  if (!subdomain || !email || !password) {
    logger.warn({ msg: 'Missing auth headers', subdomain, email });
    throw new Error('Headers subdomain, email, password are required');
  }

  const token = await getToken(subdomain, email, password);
  const id = uuidv4();
  const session: Session = { id, subdomain, email, password, token, createdAt: new Date() };
  sessions.set(id, session);
  logger.info({ msg: 'Session created', sessionId: id, subdomain, email });
  return session;
}

function getSession(req: Request): Session {
  const sessionId = (req.query.session as string) || '';
  if (!sessionId || !sessions.has(sessionId)) {
    throw new Error('Session not found');
  }
  return sessions.get(sessionId)!;
}

// Позволяем POST-запросам создать сессию, если она не найдена (помогает,
// когда клиент шлёт RPC без предварительного SSE GET).
async function resolveSession(req: Request): Promise<Session> {
  const sessionId = (req.query.session as string) || '';
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }
  // Если сессия не найдена, пробуем создать по заголовкам
  return ensureSession(req);
}

async function apiGet(path: string, session: Session, params?: Record<string, any>) {
  try {
    const resp = await api.get(path, {
      params,
      headers: {
        subdomain: session.subdomain,
        token: session.token
      }
    });
    return resp.data;
  } catch (err: any) {
    logger.error({
      msg: 'API GET failed',
      path,
      params,
      status: err.response?.status,
      data: err.response?.data
    });
    throw err;
  }
}

async function apiPost(path: string, session: Session, body: any) {
  try {
    const resp = await api.post(path, body, {
      headers: {
        subdomain: session.subdomain,
        token: session.token,
        'Content-Type': 'application/json'
      }
    });
    return resp.data;
  } catch (err: any) {
    logger.error({
      msg: 'API POST failed',
      path,
      body,
      status: err.response?.status,
      data: err.response?.data
    });
    throw err;
  }
}

async function apiPatch(path: string, session: Session, body: any) {
  try {
    const resp = await api.patch(path, body, {
      headers: {
        subdomain: session.subdomain,
        token: session.token,
        'Content-Type': 'application/json'
      }
    });
    return resp.data;
  } catch (err: any) {
    logger.error({
      msg: 'API PATCH failed',
      path,
      body,
      status: err.response?.status,
      data: err.response?.data
    });
    throw err;
  }
}

async function apiPut(path: string, session: Session, body: any) {
  try {
    const resp = await api.put(path, body, {
      headers: {
        subdomain: session.subdomain,
        token: session.token,
        'Content-Type': 'application/json'
      }
    });
    return resp.data;
  } catch (err: any) {
    logger.error({
      msg: 'API PUT failed',
      path,
      body,
      status: err.response?.status,
      data: err.response?.data
    });
    throw err;
  }
}

async function listProjects(session: Session) {
  logger.info({ msg: 'API get projects started', subdomain: session.subdomain });
  const data = await apiGet('/api/v2/projects', session, { limit: 200 });
  const rows = data.rows || data.items || data;
  const projects = Array.isArray(rows) ? rows : [];
  logger.info({ msg: 'API get projects completed', subdomain: session.subdomain, count: projects.length });
  // Возвращаем в формате rows[], как ожидает клиент
  return { rows: projects };
}

async function listIssueTypes(session: Session) {
  const data = await apiGet('/api/v2/issue-types', session, { limit: 200 });
  return data.rows || data;
}

async function listStatuses(session: Session) {
  const data = await apiGet('/api/v2/issue-statuses', session, { limit: 200 });
  return data.rows || data;
}

async function findProjectByShortName(session: Session, shortName: string) {
  const query = b64(`short_name = '${shortName}'`);
  const data = await apiGet('/api/v2/projects', session, { query, limit: 1 });
  const rows = data.rows || data;
  if (!rows || rows.length === 0) throw new Error(`Project ${shortName} not found`);
  return rows[0];
}

async function findIssueByKey(session: Session, issueNumber: string): Promise<IssueRow> {
  const { project, num } = parseIssueKey(issueNumber);
  // 1) Поиск по issue_number
  try {
    const q1 = b64(`issue_number = '${issueNumber}'`);
    const data1 = await apiGet('/api/v2/issues', session, { query: q1, limit: 1 });
    const rows1 = data1.rows || data1;
    if (rows1 && rows1.length) return rows1[0] as IssueRow;
  } catch (_) {
    // fallback ниже
  }

  // 2) Поиск по project_uuid + number
  const proj = await findProjectByShortName(session, project);
  const queries = [b64(`project_uuid = '${proj.uuid}' AND number = ${num}`)];

  for (const q of queries) {
    try {
      const data = await apiGet('/api/v2/issues', session, { query: q, limit: 1 });
      const rows = data.rows || data;
      if (rows && rows.length) return rows[0] as IssueRow;
    } catch (_) {
      // пробуем следующий вариант
    }
  }

  throw new Error(`Issue ${issueNumber} not found`);
}

async function findIssueByUuid(session: Session, uuid: string): Promise<any> {
  const data = await apiGet(`/api/v2/issue/${uuid}`, session);
  const issue = data?.rows ? data.rows[0] : data;
  if (!issue?.uuid) throw new Error('Issue not found by uuid');
  return issue;
}

async function getWorkflowTransitions(session: Session, workflowUuid: string) {
  const data = await apiGet(`/api/v2/workflows/${workflowUuid}`, session);
  const rows = data.rows || data;
  if (!rows || rows.length === 0) throw new Error('Workflow not found');
  return rows[0].transitions || [];
}

// ---------- MCP handlers ----------

function sendSseEvent(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

app.get('/aether-mcp', async (req: Request, res: Response) => {
  try {
    const session = await ensureSession(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost';
    const endpointUrl = `${proto}://${host}/aether-mcp?session=${session.id}`;

    logger.info({ msg: 'Announcing endpoint', sessionId: session.id, endpointUrl });
    sendSseEvent(res, 'endpoint', { url: endpointUrl });
    logger.info({ msg: 'SSE connection established', sessionId: session.id, subdomain: session.subdomain });

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`event: ping\n`);
        res.write(`data: {}\n\n`);
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sessions.delete(session.id);
      logger.info({ msg: 'SSE connection closed', sessionId: session.id });
    });
  } catch (err: any) {
    logger.error({ msg: 'SSE init failed', error: err.message });
    res.status(401).json({ error: err.message });
  }
});

app.post('/aether-mcp', async (req: Request, res: Response) => {
  try {
    const session = await resolveSession(req);
    const { method, params, id } = req.body || {};
    logger.info({ msg: 'RPC call', sessionId: session.id, method, id });

    const result = await handleRpc(method, params || {}, session);
    res.json({ jsonrpc: '2.0', id: id ?? null, result });
  } catch (err: any) {
    logger.error({ msg: 'RPC error', error: err.message, body: req.body });
    res.json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32000, message: err.message || 'Internal error' }
    });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'aether', timestamp: new Date().toISOString() });
});

async function handleRpc(method: string, params: Record<string, unknown>, session: Session) {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'aether-mcp',
          version: '0.1.0',
          description:
            'Инструменты для таск-трекера Unkaos. Используй их, когда пользователь просит что-то сделать с задачами/проектами в Unkaos (создать, найти, показать, обновить, сменить статус).'
        },
        capabilities: {
          tools: { list: true, call: true },
          prompts: { list: true },
          resources: { list: true },
          logging: { list: false },
          roots: { listChanged: false }
        }
      };

    case 'tools/list':
      return {
        tools: [
          {
            name: 'search_issues',
            description: 'Unkaos: поиск задач по тексту Названия/Описание (limit 20)',
            inputSchema: {
              type: 'object',
              properties: {
                keyword: { type: 'string', description: 'Текст для поиска по Названию/Описанию' }
              },
              required: ['keyword']
            }
          },
          {
            name: 'get_issue',
            description: 'Unkaos: получить задачу по ключу (PROJECT-123) или UUID',
            inputSchema: {
              type: 'object',
              properties: {
                issue_number: { type: 'string', description: 'Ключ задачи, напр. PROJ-123' },
                issue_uuid: { type: 'string', description: 'UUID задачи (если есть, можно без ключа)' }
              },
              required: ['issue_number']
            }
          },
          {
            name: 'create_issue',
            description: 'Unkaos: создать задачу (title/description/project/type)',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Заголовок (обязательно)' },
                description: { type: 'string', description: 'Описание' },
                project: { type: 'string', description: 'Короткое имя проекта, напр. BS (обязательно)' },
                type: { type: 'string', description: 'Имя или код типа задачи (опционально)' }
              },
              required: ['title', 'project']
            }
          },
          {
            name: 'update_issue',
            description: 'Unkaos: обновить задачу по UUID (title/description/status). Статус проверяется по workflow',
            inputSchema: {
              type: 'object',
              properties: {
                issue_uuid: { type: 'string', description: 'UUID задачи (обязательно)' },
                title: { type: 'string', description: 'Новое название (опционально)' },
                description: { type: 'string', description: 'Новое описание (опционально)' },
                status: { type: 'string', description: 'Целевой статус (опционально, проверяется допустимый переход)' }
              },
              required: ['issue_uuid']
            }
          },
          {
            name: 'get_available_transitions',
            description: 'Unkaos: список допустимых переходов статусов для задачи',
            inputSchema: {
              type: 'object',
              properties: {
                issue_number: { type: 'string' }
              },
              required: ['issue_number']
            }
          },
          {
            name: 'list_projects',
            description: 'Unkaos: список проектов',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'list_statuses',
            description: 'Unkaos: список статусов',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'list_issue_types',
            description: 'Unkaos: список типов задач',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      };

    case 'prompts/list':
      return {
        prompts: [
          {
            name: 'unkaos_usage',
            description: 'Как выбирать инструменты для таск-трекера Unkaos',
            messages: [
              {
                role: 'system',
                content:
                  'Ты работаешь с таск-трекером Unkaos. Когда пользователь просит что-то о задачах/трекере/Unkaos (создать, найти, показать, обновить, сменить статус), используй инструменты:\n' +
                  '- search_issues: поиск задач по тексту Названия/Описание\n' +
                  '- get_issue: получить задачу по ключу или UUID\n' +
                  '- create_issue: создать задачу (title, project short name, опционально type/description)\n' +
                  '- update_issue: обновить по UUID title/description/status (статус только если переход допустим)\n' +
                  '- get_available_transitions: посмотреть допустимые переходы\n' +
                  '- list_projects/list_statuses/list_issue_types: справочники\n' +
                  'Перед обновлением или сменой статуса используй issue_uuid, если он известен. Для статуса — параметр status в update_issue.'
              }
            ]
          }
        ]
      };

    case 'resources/list':
      // Пока нет ресурсов — вернуть пустой список
      return { resources: [] };

    case 'notifications/initialized':
      // Игнорируем уведомление о старте клиента
      return { ok: true };

    case 'tools/call':
      return wrapToolResult(await executeTool(params as any, session));

    case 'ping':
      return { pong: true };

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

// MCP content wrapper: always return content array with text
function wrapToolResult(result: any) {
  // Если уже есть content, не трогаем
  if (result && Array.isArray(result.content)) {
    return result;
  }
  // Заворачиваем в text content
  return {
    content: [
      {
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }
    ]
  };
}

async function executeTool(
  callParams: { name: string; arguments?: Record<string, unknown> },
  session: Session
): Promise<any> {
  const name = callParams.name;
  const args = (callParams.arguments || {}) as Record<string, unknown>;

  switch (name) {
    case 'search_issues':
      return toolSearchIssues(args.keyword as string, session);
    case 'get_issue':
      return toolGetIssue(args.issue_number as string, args.issue_uuid as string | undefined, session);
    case 'create_issue':
      return toolCreateIssue(
        args.title as string,
        (args.description as string) || '',
        args.project as string,
        (args.type as string) || '',
        session
      );
    case 'update_issue':
      return toolUpdateIssue(
        args.issue_uuid as string,
        (args.title as string) || undefined,
        (args.description as string) || undefined,
        (args.status as string) || undefined,
        session
      );
    case 'get_available_transitions':
      return toolGetAvailableTransitions(args.issue_number as string, session);
    case 'list_projects':
      logger.info({ msg: 'List projects requested', sessionId: session.id, subdomain: session.subdomain });
      return await listProjects(session);
    case 'list_statuses':
      return listStatuses(session);
    case 'list_issue_types':
      return listIssueTypes(session);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------- Tool implementations ----------

async function toolSearchIssues(keyword: string, session: Session) {
  const safe = keyword?.trim();
  if (!safe) throw new Error('keyword is required');
  const kw = escapeLike(safe);
  // Запрос в формате, ожидаемом API: Название/Описание LIKE '%text%'
  const filter = `Название like '%${kw}%'  OR Описание like '%${kw}%'`;
  const query = b64(filter);
  const data = await apiGet('/api/v2/issues', session, { query, limit: 20 });
  return data.rows || data;
}

async function toolGetIssue(issueNumber: string, issueUuid: string | undefined, session: Session) {
  if (issueUuid) {
    return await findIssueByUuid(session, issueUuid);
  }
  const row = await findIssueByKey(session, issueNumber);
  return row;
}

async function toolCreateIssue(
  title: string,
  description: string,
  projectShort: string,
  typeNameOrCode: string,
  session: Session
) {
  if (!title?.trim()) throw new Error('title is required');
  if (!projectShort?.trim()) throw new Error('project is required');

  const project = await findProjectByShortName(session, projectShort);

  let typeUuid: string | undefined;
  const types = await listIssueTypes(session);
  if (types && types.length) {
    if (typeNameOrCode) {
      const match = types.find(
        (t: any) =>
          t.name?.toLowerCase() === typeNameOrCode.toLowerCase() ||
          t.code?.toLowerCase() === typeNameOrCode.toLowerCase()
      );
      typeUuid = match?.uuid;
    }
    if (!typeUuid) typeUuid = types[0].uuid;
  }
  if (!typeUuid) throw new Error('No issue types available');

  const payload = {
    is_new: true,
    title,
    description,
    project_uuid: project.uuid,
    type_uuid: typeUuid
  };

  const data = await apiPost('/api/v2/issue', session, payload);
  return data;
}

async function toolGetAvailableTransitions(issueNumber: string, session: Session) {
  const issue = await findIssueByKey(session, issueNumber);
  if (!issue.workflow_uuid || !issue.status_uuid) {
    throw new Error('Issue has no workflow/status');
  }
  const transitions = await getWorkflowTransitions(session, issue.workflow_uuid);
  const relevant = transitions.filter((t: any) => t.status_from_uuid === issue.status_uuid);

  const statuses = await listStatuses(session);
  const statusByUuid = new Map<string, any>(statuses.map((s: any) => [s.uuid, s]));

  return relevant.map((t: any) => ({
    name: t.name,
    from: statusByUuid.get(t.status_from_uuid)?.name || t.status_from_uuid,
    to: statusByUuid.get(t.status_to_uuid)?.name || t.status_to_uuid,
    status_to_uuid: t.status_to_uuid
  }));
}

async function toolUpdateIssueStatus(issueNumber: string, statusName: string, session: Session) {
  if (!statusName?.trim()) throw new Error('status is required');
  const issue = await findIssueByKey(session, issueNumber);
  if (!issue.workflow_uuid || !issue.status_uuid) {
    throw new Error('Issue has no workflow/status');
  }

  const statuses = await listStatuses(session);
  const target = statuses.find((s: any) => s.name?.toLowerCase() === statusName.toLowerCase());
  if (!target) throw new Error(`Status ${statusName} not found`);

  const transitions = await getWorkflowTransitions(session, issue.workflow_uuid);
  const allowed = transitions.find(
    (t: any) => t.status_from_uuid === issue.status_uuid && t.status_to_uuid === target.uuid
  );
  if (!allowed) throw new Error(`Transition to ${statusName} is not allowed`);

  const resp = await apiPatch(`/api/v2/issues/${issue.uuid}`, session, {
    status_uuid: target.uuid
  });
  return resp;
}

async function toolUpdateIssue(
  issueUuid: string,
  title: string | undefined,
  description: string | undefined,
  statusName: string | undefined,
  session: Session
) {
  if (!issueUuid?.trim()) throw new Error('issue_uuid is required');
  if (!title && !description && !statusName) throw new Error('Provide at least one of title/description/status');

  // Считываем полное тело задачи, затем подставляем новые значения
  const issue = await findIssueByUuid(session, issueUuid);

  let status_uuid = issue.status_uuid;
  let status_name = issue.status_name;

  if (statusName) {
    const statuses = await listStatuses(session);
    const target = statuses.find((s: any) => s.name?.toLowerCase() === statusName.toLowerCase());
    if (!target) throw new Error(`Status ${statusName} not found`);

    // Проверим допустимый переход
    if (!issue.workflow_uuid || !issue.status_uuid) {
      throw new Error('Issue has no workflow/status');
    }
    const transitions = await getWorkflowTransitions(session, issue.workflow_uuid);
    const allowed = transitions.find(
      (t: any) => t.status_from_uuid === issue.status_uuid && t.status_to_uuid === target.uuid
    );
    if (!allowed) throw new Error(`Transition to ${statusName} is not allowed`);

    status_uuid = target.uuid;
    status_name = target.name;
  }

  const payload: Record<string, any> = {
    ...issue,
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(statusName ? { status_uuid, status_name } : {})
  };

  const resp = await apiPut(`/api/v2/issue/${issue.uuid}`, session, payload);
  return resp;
}

// ---------- Start server ----------

app.listen(PORT, () => {
  logger.info({ msg: 'Aether MCP server listening', port: PORT, apiBase: API_BASE });
});

