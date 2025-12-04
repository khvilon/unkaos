/**
 * E2E Tests for Issues API
 * 
 * Тестируют реальное API через HTTP запросы
 * Запускать с работающим сервером: npm run test
 */

import axios, { AxiosInstance } from 'axios';

// Конфигурация для тестов
const API_URL = process.env.TEST_API_URL || 'http://localhost:3007';
const SUBDOMAIN = process.env.TEST_SUBDOMAIN || 'test2';
const TEST_TOKEN = process.env.TEST_TOKEN || '';

// Тестовые данные (будут созданы в beforeAll)
let testProjectUuid: string;
let testIssueUuid: string;
let testIssueNum: number;
let testTypeUuid: string;
let testStatusUuid: string;

// HTTP клиент
let api: AxiosInstance;

// Skip тесты если нет токена (CI без настроенной БД)
const skipIfNoToken = TEST_TOKEN ? describe : describe.skip;

beforeAll(async () => {
  api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'subdomain': SUBDOMAIN,
      'token': TEST_TOKEN
    },
    validateStatus: () => true // Не выбрасывать исключения для не-2xx статусов
  });
});

describe('Issues API - Basic Operations', () => {
  
  describe('GET /api/v2/issues', () => {
    it('должен возвращать список задач без фильтров', async () => {
      const response = await api.get('/api/v2/issues?limit=10');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      expect(response.data).toHaveProperty('total');
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    it('должен поддерживать пагинацию', async () => {
      const response = await api.get('/api/v2/issues?limit=5&offset=0');
      
      expect(response.status).toBe(200);
      expect(response.data.limit).toBe(5);
      expect(response.data.page).toBe(1);
    });

    it('должен возвращать правильную структуру задачи', async () => {
      const response = await api.get('/api/v2/issues?limit=1');
      
      if (response.data.items.length > 0) {
        const issue = response.data.items[0];
        expect(issue).toHaveProperty('uuid');
        expect(issue).toHaveProperty('num');
        expect(issue).toHaveProperty('title');
        expect(issue).toHaveProperty('project_uuid');
        expect(issue).toHaveProperty('status_uuid');
        expect(issue).toHaveProperty('type_uuid');
        expect(issue).toHaveProperty('values');
      }
    });
  });

  describe('GET /api/v2/issues-count', () => {
    it('должен возвращать количество задач', async () => {
      const response = await api.get('/api/v2/issues-count');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('count');
      expect(typeof response.data.count).toBe('number');
    });
  });

  describe('GET /api/v2/issue-uuid', () => {
    it('должен находить задачу по номеру и проекту', async () => {
      // Сначала получим существующую задачу
      const issuesResponse = await api.get('/api/v2/issues?limit=1');
      
      if (issuesResponse.data.items.length === 0) {
        console.log('Нет задач для тестирования issue-uuid');
        return;
      }
      
      const issue = issuesResponse.data.items[0];
      const response = await api.get(`/api/v2/issue-uuid?project_uuid=${issue.project_uuid}&num=${issue.num}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('rows');
      expect(response.data.rows.length).toBeGreaterThan(0);
      // UUID может быть в разном регистре
      expect(response.data.rows[0].uuid.toLowerCase()).toBe(issue.uuid.toLowerCase());
    });

    it('должен возвращать пустой массив для несуществующей задачи', async () => {
      const response = await api.get('/api/v2/issue-uuid?project_uuid=00000000-0000-0000-0000-000000000000&num=99999');
      
      expect(response.status).toBe(200);
      expect(response.data.rows).toEqual([]);
    });
  });

  describe('GET /api/v2/issues/:uuid', () => {
    it('должен возвращать конкретную задачу по UUID', async () => {
      // Получаем UUID существующей задачи
      const issuesResponse = await api.get('/api/v2/issues?limit=1');
      
      if (issuesResponse.data.items.length === 0) {
        console.log('Нет задач для тестирования');
        return;
      }
      
      const issueUuid = issuesResponse.data.items[0].uuid;
      const response = await api.get(`/api/v2/issues/${issueUuid}`);
      
      expect(response.status).toBe(200);
      expect(response.data.uuid.toLowerCase()).toBe(issueUuid.toLowerCase());
    });

    it('должен возвращать 404 для несуществующей задачи', async () => {
      const response = await api.get('/api/v2/issues/00000000-0000-0000-0000-000000000000');
      
      expect(response.status).toBe(404);
    });

    it('должен возвращать 400 для некорректного UUID', async () => {
      const response = await api.get('/api/v2/issues/not-a-valid-uuid');
      
      expect(response.status).toBe(400);
    });
  });
});

describe('Issues API - Filtering', () => {
  
  describe('Фильтрация по стандартным полям', () => {
    it('должен фильтровать по статусу', async () => {
      // Получаем статусы
      const statusesResponse = await api.get('/api/v2/issue-statuses?limit=1');
      
      if (statusesResponse.data.items?.length > 0) {
        const statusName = statusesResponse.data.items[0].name;
        const query = Buffer.from(`Статус = '${statusName}'`).toString('base64');
        
        const response = await api.get(`/api/v2/issues?query=${encodeURIComponent(query)}&limit=10`);
        
        expect(response.status).toBe(200);
        // Все задачи должны иметь указанный статус
        for (const issue of response.data.items) {
          expect(issue.status_name).toBe(statusName);
        }
      }
    });

    it('должен фильтровать по дате создания', async () => {
      const query = Buffer.from('Создана > 2020-01-01').toString('base64');
      const response = await api.get(`/api/v2/issues?query=${encodeURIComponent(query)}&limit=10`);
      
      expect(response.status).toBe(200);
      // Все задачи должны быть созданы после указанной даты
      for (const issue of response.data.items) {
        expect(new Date(issue.created_at).getTime()).toBeGreaterThan(new Date('2020-01-01').getTime());
      }
    });
  });

  describe('Фильтрация по кастомным полям', () => {
    it('должен обрабатывать фильтр по кастомному полю без ошибки 500', async () => {
      // Получаем кастомные поля
      const fieldsResponse = await api.get('/api/v2/fields?is_custom=true&limit=1');
      
      if (fieldsResponse.data.items?.length > 0) {
        const fieldName = fieldsResponse.data.items[0].name;
        const query = Buffer.from(`${fieldName} = ''`).toString('base64');
        
        const response = await api.get(`/api/v2/issues?query=${encodeURIComponent(query)}&limit=10`);
        
        // Не должно быть 500 ошибки (раньше была из-за неправильной генерации SQL)
        expect(response.status).not.toBe(500);
        expect([200, 400]).toContain(response.status);
      }
    });
  });

  describe('Обработка невалидных запросов', () => {
    it('должен возвращать ошибку для несуществующего поля', async () => {
      const query = Buffer.from('НесуществующееПоле123 = test').toString('base64');
      const response = await api.get(`/api/v2/issues?query=${encodeURIComponent(query)}&limit=10`);
      
      // Должна быть ошибка валидации, а не 500
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('code');
    });

    it('должен возвращать ошибку для синтаксически неверного запроса', async () => {
      const query = Buffer.from('Статус = = test').toString('base64');
      const response = await api.get(`/api/v2/issues?query=${encodeURIComponent(query)}&limit=10`);
      
      expect(response.status).toBe(400);
    });
  });
});

describe('Issues API - CRUD Operations', () => {
  let createdIssueUuid: string;

  // Получаем необходимые данные для создания задачи
  beforeAll(async () => {
    // Получаем проект
    const projectsResponse = await api.get('/api/v2/projects?limit=1');
    if (projectsResponse.data.items?.length > 0) {
      testProjectUuid = projectsResponse.data.items[0].uuid;
    }

    // Получаем тип задачи
    const typesResponse = await api.get('/api/v2/issue-types?limit=1');
    if (typesResponse.data.items?.length > 0) {
      testTypeUuid = typesResponse.data.items[0].uuid;
    }

    // Получаем статус
    const statusesResponse = await api.get('/api/v2/issue-statuses?limit=1');
    if (statusesResponse.data.items?.length > 0) {
      testStatusUuid = statusesResponse.data.items[0].uuid;
    }
  });

  describe('POST /api/v2/issues', () => {
    it('должен создавать новую задачу', async () => {
      if (!testProjectUuid || !testTypeUuid || !testStatusUuid) {
        console.log('Недостаточно данных для создания задачи');
        return;
      }

      const newIssue = {
        title: 'E2E Test Issue ' + Date.now(),
        description: 'Created by E2E test',
        project_uuid: testProjectUuid,
        type_uuid: testTypeUuid,
        status_uuid: testStatusUuid
      };

      const response = await api.post('/api/v2/issues', newIssue);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('uuid');
      expect(response.data.title).toBe(newIssue.title);
      
      createdIssueUuid = response.data.uuid;
    });

    it('должен возвращать ошибку при отсутствии обязательных полей', async () => {
      const response = await api.post('/api/v2/issues', { title: 'No project' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/v2/issues/:uuid', () => {
    it('должен обновлять задачу', async () => {
      if (!createdIssueUuid) {
        console.log('Нет созданной задачи для обновления');
        return;
      }

      const updatedTitle = 'Updated E2E Test Issue ' + Date.now();
      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        title: updatedTitle
      });
      
      expect(response.status).toBe(200);
      expect(response.data.title).toBe(updatedTitle);
    });

    it('должен возвращать 404 для несуществующей задачи', async () => {
      const response = await api.put('/api/v2/issues/00000000-0000-0000-0000-000000000000', {
        title: 'Test'
      });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v2/issues/:uuid', () => {
    it('должен удалять задачу (soft delete)', async () => {
      if (!createdIssueUuid) {
        console.log('Нет созданной задачи для удаления');
        return;
      }

      const response = await api.delete(`/api/v2/issues/${createdIssueUuid}`);
      
      expect(response.status).toBe(200);
      
      // Проверяем что задача помечена как удалённая
      const getResponse = await api.get(`/api/v2/issues/${createdIssueUuid}`);
      expect(getResponse.status).toBe(404);
    });
  });
});

describe('Issues API - Related Endpoints', () => {
  
  describe('GET /api/v2/issue-actions', () => {
    it('должен возвращать список действий по задаче', async () => {
      // Получаем существующую задачу
      const issuesResponse = await api.get('/api/v2/issues?limit=1');
      
      if (issuesResponse.data.items.length === 0) return;
      
      const issueUuid = issuesResponse.data.items[0].uuid;
      const response = await api.get(`/api/v2/issue-actions?issue_uuid=${issueUuid}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.items || response.data)).toBe(true);
    });
  });

  describe('GET /api/v2/attachments', () => {
    it('должен возвращать вложения задачи', async () => {
      const issuesResponse = await api.get('/api/v2/issues?limit=1');
      
      if (issuesResponse.data.items.length === 0) return;
      
      const issueUuid = issuesResponse.data.items[0].uuid;
      const response = await api.get(`/api/v2/attachments?issue_uuid=${issueUuid}`);
      
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v2/time-entries', () => {
    it('должен возвращать списания времени', async () => {
      const issuesResponse = await api.get('/api/v2/issues?limit=1');
      
      if (issuesResponse.data.items.length === 0) return;
      
      const issueUuid = issuesResponse.data.items[0].uuid;
      const response = await api.get(`/api/v2/time-entries?issue_uuid=${issueUuid}`);
      
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v2/watchers', () => {
    it('должен возвращать наблюдателей задачи', async () => {
      const issuesResponse = await api.get('/api/v2/issues?limit=1');
      
      if (issuesResponse.data.items.length === 0) return;
      
      const issueUuid = issuesResponse.data.items[0].uuid;
      const response = await api.get(`/api/v2/watchers?issue_uuid=${issueUuid}`);
      
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v2/relations', () => {
    it('должен возвращать связи задачи', async () => {
      const issuesResponse = await api.get('/api/v2/issues?limit=1');
      
      if (issuesResponse.data.items.length === 0) return;
      
      const issueUuid = issuesResponse.data.items[0].uuid;
      const response = await api.get(`/api/v2/relations?issue_uuid=${issueUuid}`);
      
      expect(response.status).toBe(200);
    });
  });
});

describe('Issues API - Error Handling', () => {
  
  it('должен возвращать 401 без токена авторизации', async () => {
    const noAuthApi = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'subdomain': SUBDOMAIN
        // Без токена
      },
      validateStatus: () => true
    });
    
    const response = await noAuthApi.get('/api/v2/issues');
    
    // Ожидаем ошибку авторизации (через gateway)
    expect([401, 403, 502]).toContain(response.status);
  });

  it('должен возвращать ошибку для несуществующего subdomain', async () => {
    const wrongSubdomainApi = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'subdomain': 'nonexistent_workspace_12345',
        'token': TEST_TOKEN
      },
      validateStatus: () => true
    });
    
    const response = await wrongSubdomainApi.get('/api/v2/issues');
    
    expect([400, 401, 403, 404, 500]).toContain(response.status);
  });
});


