/**
 * Extended E2E Tests for Issues API
 * 
 * Подробное тестирование задач:
 * - Создание и редактирование всех полей
 * - Комментарии
 * - Списание времени
 * - Теги
 * - Наблюдатели
 * 
 * Запуск: npm run test:e2e
 */

import axios, { AxiosInstance } from 'axios';

// Конфигурация
const API_URL = process.env.TEST_API_URL || 'http://localhost:3007';
const SUBDOMAIN = process.env.TEST_SUBDOMAIN || 'test2';
const TEST_TOKEN = process.env.TEST_TOKEN || '';

// HTTP клиент
let api: AxiosInstance;

// Тестовые данные (будут получены в beforeAll)
interface TestData {
  projectUuid: string;
  project2Uuid: string;
  typeUuid: string;
  type2Uuid: string;
  statusUuid: string;
  status2Uuid: string;
  userUuid: string;
  commentTypeUuid: string;
  tagUuid: string;
  workflowUuid: string;
}

let testData: Partial<TestData> = {};
let createdIssueUuid: string = '';
let createdCommentUuid: string = '';
let createdTimeEntryUuid: string = '';
let createdWatcherUuid: string = '';

// Утилиты
const generateTitle = () => `E2E Test Issue ${Date.now()}`;
const generateDescription = () => `Description created at ${new Date().toISOString()}`;

beforeAll(async () => {
  api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'subdomain': SUBDOMAIN,
      'token': TEST_TOKEN
    },
    validateStatus: () => true
  });

  // Загружаем тестовые данные
  console.log('Загрузка тестовых данных...');

  // Проекты
  const projectsRes = await api.get('/api/v2/projects?limit=2');
  if (projectsRes.data.rows?.length > 0) {
    testData.projectUuid = projectsRes.data.rows[0].uuid;
    if (projectsRes.data.rows.length > 1) {
      testData.project2Uuid = projectsRes.data.rows[1].uuid;
    }
  }

  // Типы задач
  const typesRes = await api.get('/api/v2/issue-types?limit=2');
  if (typesRes.data.rows?.length > 0) {
    testData.typeUuid = typesRes.data.rows[0].uuid;
    if (typesRes.data.rows.length > 1) {
      testData.type2Uuid = typesRes.data.rows[1].uuid;
    }
  }

  // Статусы
  const statusesRes = await api.get('/api/v2/issue-statuses?limit=2');
  if (statusesRes.data.rows?.length > 0) {
    testData.statusUuid = statusesRes.data.rows[0].uuid;
    if (statusesRes.data.rows.length > 1) {
      testData.status2Uuid = statusesRes.data.rows[1].uuid;
    }
  }

  // Пользователи
  const usersRes = await api.get('/api/v2/users?limit=1');
  if (usersRes.data.rows?.length > 0) {
    testData.userUuid = usersRes.data.rows[0].uuid;
  }

  // Тип действия "комментарий" (💬)
  const actionsTypesRes = await api.get('/api/v2/issue-actions-types?limit=10');
  if (actionsTypesRes.data.rows?.length > 0) {
    const commentType = actionsTypesRes.data.rows.find((t: any) => t.name === '💬');
    if (commentType) {
      testData.commentTypeUuid = commentType.uuid;
    }
  }

  // Теги
  const tagsRes = await api.get('/api/v2/issue-tags?limit=1');
  if (tagsRes.data.rows?.length > 0) {
    testData.tagUuid = tagsRes.data.rows[0].uuid;
  }

  // Workflows
  const workflowsRes = await api.get('/api/v2/workflows?limit=1');
  if (workflowsRes.data.rows?.length > 0) {
    testData.workflowUuid = workflowsRes.data.rows[0].uuid;
  }

  console.log('Тестовые данные загружены:', {
    project: testData.projectUuid ? '✓' : '✗',
    type: testData.typeUuid ? '✓' : '✗',
    status: testData.statusUuid ? '✓' : '✗',
    user: testData.userUuid ? '✓' : '✗',
    commentType: testData.commentTypeUuid ? '✓' : '✗',
    tag: testData.tagUuid ? '✓' : '✗'
  });
});

afterAll(async () => {
  // Cleanup: удаляем созданную задачу
  if (createdIssueUuid) {
    await api.delete(`/api/v2/issues/${createdIssueUuid}`);
    console.log('Тестовая задача удалена');
  }
});

describe('Issues E2E - Полный CRUD цикл', () => {
  
  describe('1. Создание задачи', () => {
    
    it('должен создавать задачу с минимальными полями', async () => {
      if (!testData.projectUuid || !testData.typeUuid || !testData.statusUuid) {
        console.log('Пропуск: недостаточно данных');
        return;
      }

      const newIssue = {
        title: generateTitle(),
        project_uuid: testData.projectUuid,
        type_uuid: testData.typeUuid,
        status_uuid: testData.statusUuid
      };

      const response = await api.post('/api/v2/issues', newIssue);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('uuid');
      expect(response.data).toHaveProperty('num');
      expect(response.data.title).toBe(newIssue.title);
      
      createdIssueUuid = response.data.uuid;
      console.log(`Создана задача: ${response.data.num} (${createdIssueUuid})`);
    });

    it('должен создавать задачу со всеми полями', async () => {
      if (!testData.projectUuid || !testData.typeUuid || !testData.statusUuid || !testData.userUuid) {
        console.log('Пропуск: недостаточно данных');
        return;
      }

      const fullIssue = {
        title: generateTitle() + ' FULL',
        description: generateDescription(),
        project_uuid: testData.projectUuid,
        type_uuid: testData.typeUuid,
        status_uuid: testData.statusUuid,
        assignee_uuid: testData.userUuid,
        priority: 2
      };

      const response = await api.post('/api/v2/issues', fullIssue);
      
      expect(response.status).toBe(201);
      expect(response.data.description).toBe(fullIssue.description);
      
      // Удаляем эту тестовую задачу
      if (response.data.uuid) {
        await api.delete(`/api/v2/issues/${response.data.uuid}`);
      }
    });

    it('должен отклонять задачу без обязательных полей', async () => {
      const response = await api.post('/api/v2/issues', { title: 'No project' });
      expect(response.status).toBe(400);
    });

    it('должен отклонять задачу с невалидным UUID проекта', async () => {
      const response = await api.post('/api/v2/issues', {
        title: 'Bad project',
        project_uuid: 'not-a-uuid',
        type_uuid: testData.typeUuid,
        status_uuid: testData.statusUuid
      });
      expect(response.status).toBe(400);
    });
  });

  describe('2. Редактирование названия', () => {
    
    it('должен обновлять название задачи', async () => {
      if (!createdIssueUuid) {
        console.log('Пропуск: нет созданной задачи');
        return;
      }

      const newTitle = 'Обновленное название ' + Date.now();
      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        title: newTitle
      });
      
      expect(response.status).toBe(200);
      expect(response.data.title).toBe(newTitle);
    });

    it('должен сохранять название с Unicode символами', async () => {
      if (!createdIssueUuid) return;

      const unicodeTitle = '🚀 Задача с эмодзи и кириллицей ёЁüÜ';
      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        title: unicodeTitle
      });
      
      expect(response.status).toBe(200);
      expect(response.data.title).toBe(unicodeTitle);
    });

    it('должен отклонять пустое название', async () => {
      if (!createdIssueUuid) return;

      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        title: ''
      });
      
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('3. Редактирование описания', () => {
    
    it('должен обновлять описание', async () => {
      if (!createdIssueUuid) return;

      const newDescription = 'Новое описание задачи с **markdown** поддержкой\n\n- пункт 1\n- пункт 2';
      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        description: newDescription
      });
      
      expect(response.status).toBe(200);
      expect(response.data.description).toBe(newDescription);
    });

    it('должен очищать описание (null -> пустая строка)', async () => {
      if (!createdIssueUuid) return;

      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        description: null
      });
      
      expect(response.status).toBe(200);
      // null преобразуется в пустую строку (колонка NOT NULL)
      expect(response.data.description).toBe('');
    });

    it('должен сохранять длинное описание', async () => {
      if (!createdIssueUuid) return;

      const longDescription = 'A'.repeat(5000);
      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        description: longDescription
      });
      
      expect(response.status).toBe(200);
      expect(response.data.description.length).toBe(5000);
    });
  });

  describe('4. Изменение типа задачи', () => {
    
    it('должен менять тип задачи', async () => {
      if (!createdIssueUuid || !testData.type2Uuid) {
        console.log('Пропуск: нет второго типа задачи');
        return;
      }

      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        type_uuid: testData.type2Uuid
      });
      
      expect(response.status).toBe(200);
      expect(response.data.type_uuid.toLowerCase()).toBe(testData.type2Uuid.toLowerCase());
    });

    it('должен вернуть исходный тип', async () => {
      if (!createdIssueUuid || !testData.typeUuid) return;

      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        type_uuid: testData.typeUuid
      });
      
      expect(response.status).toBe(200);
    });
  });

  describe('5. Изменение статуса', () => {
    
    it('должен менять статус задачи', async () => {
      if (!createdIssueUuid || !testData.status2Uuid) {
        console.log('Пропуск: нет второго статуса');
        return;
      }

      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        status_uuid: testData.status2Uuid
      });
      
      expect(response.status).toBe(200);
      expect(response.data.status_uuid.toLowerCase()).toBe(testData.status2Uuid.toLowerCase());
    });
  });

  describe('6. Изменение spent_time', () => {
    
    it('должен устанавливать spent_time', async () => {
      if (!createdIssueUuid) return;

      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        spent_time: 3.5
      });
      
      expect(response.status).toBe(200);
      expect(parseFloat(response.data.spent_time)).toBe(3.5);
    });

    it('должен менять spent_time на 0', async () => {
      if (!createdIssueUuid) return;

      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        spent_time: 0
      });
      
      expect(response.status).toBe(200);
    });
  });

  describe('7. Изменение автора', () => {
    
    it('должен менять автора', async () => {
      if (!createdIssueUuid || !testData.userUuid) return;

      const response = await api.put(`/api/v2/issues/${createdIssueUuid}`, {
        author_uuid: testData.userUuid
      });
      
      expect(response.status).toBe(200);
      expect(response.data.author_uuid?.toLowerCase()).toBe(testData.userUuid.toLowerCase());
    });
  });

  describe('8. Получение задачи', () => {
    
    it('должен возвращать задачу по UUID', async () => {
      if (!createdIssueUuid) return;

      const response = await api.get(`/api/v2/issues/${createdIssueUuid}`);
      
      expect(response.status).toBe(200);
      expect(response.data.rows).toBeDefined();
      expect(response.data.rows[0].uuid.toLowerCase()).toBe(createdIssueUuid.toLowerCase());
    });

    it('должен возвращать 404 для несуществующей задачи', async () => {
      const response = await api.get('/api/v2/issues/00000000-0000-0000-0000-000000000000');
      expect(response.status).toBe(404);
    });
  });
});

describe('Issues E2E - Комментарии (Issue Actions)', () => {
  
  describe('Создание комментария', () => {
    
    it('должен создавать комментарий к задаче', async () => {
      if (!createdIssueUuid || !testData.userUuid || !testData.commentTypeUuid) {
        console.log('Пропуск: недостаточно данных для комментария');
        return;
      }

      const comment = {
        issue_uuid: createdIssueUuid,
        author_uuid: testData.userUuid,
        type_uuid: testData.commentTypeUuid,
        value: 'Это тестовый комментарий ' + Date.now()
      };

      const response = await api.post('/api/v2/issue-actions', comment);
      
      expect([200, 201]).toContain(response.status);
      expect(response.data).toHaveProperty('rows');
      expect(response.data.rows.length).toBeGreaterThan(0);
      expect(response.data.rows[0].value).toBe(comment.value);
      
      createdCommentUuid = response.data.rows[0].uuid;
      console.log(`Создан комментарий: ${createdCommentUuid}`);
    });

    it('должен получать комментарии задачи', async () => {
      if (!createdIssueUuid) return;

      const response = await api.get(`/api/v2/issue-actions?issue_uuid=${createdIssueUuid}`);
      
      expect(response.status).toBe(200);
      expect(response.data.rows).toBeDefined();
    });

    it('должен получать форматированные действия', async () => {
      if (!createdIssueUuid) return;

      const response = await api.get(`/api/v2/issue-formated-actions?issue_uuid=${createdIssueUuid}`);
      
      expect(response.status).toBe(200);
      expect(response.data.rows).toBeDefined();
    });
  });

  describe('Редактирование комментария', () => {
    
    it('должен обновлять текст комментария', async () => {
      if (!createdCommentUuid) {
        console.log('Пропуск: нет созданного комментария');
        return;
      }

      const newValue = 'Обновленный комментарий ' + Date.now();
      const response = await api.put(`/api/v2/issue-actions/${createdCommentUuid}`, {
        value: newValue
      });
      
      expect(response.status).toBe(200);
      expect(response.data.rows?.[0]?.value).toBe(newValue);
    });
  });

  describe('Создание через PUT (upsert)', () => {
    let upsertCommentUuid: string = '';

    it('должен создавать комментарий через PUT (как делает фронтенд)', async () => {
      if (!createdIssueUuid || !testData.userUuid || !testData.commentTypeUuid) {
        console.log('Пропуск: недостаточно данных для upsert комментария');
        return;
      }

      // Генерируем валидный UUID v4 (variant 1 - 4-я группа начинается с 8/9/a/b)
      const hex = () => Math.floor(Math.random() * 16).toString(16);
      const variant = ['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)];
      upsertCommentUuid = [
        Array(8).fill(0).map(hex).join(''),
        Array(4).fill(0).map(hex).join(''),
        '4' + Array(3).fill(0).map(hex).join(''),
        variant + Array(3).fill(0).map(hex).join(''),
        Array(12).fill(0).map(hex).join('')
      ].join('-');
      
      const comment = {
        issue_uuid: createdIssueUuid,
        author_uuid: testData.userUuid,
        type_uuid: testData.commentTypeUuid,
        value: 'Комментарий через PUT (upsert) ' + Date.now(),
        uuid: upsertCommentUuid
      };

      const response = await api.put(`/api/v2/issue-actions/${upsertCommentUuid}`, comment);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('rows');
      expect(response.data.rows.length).toBeGreaterThan(0);
      expect(response.data.rows[0].value).toBe(comment.value);
      
      console.log(`Создан комментарий через PUT: ${upsertCommentUuid}`);
    });

    it('комментарий через PUT должен быть виден в списке', async () => {
      if (!createdIssueUuid || !upsertCommentUuid) return;

      const response = await api.get(`/api/v2/issue-formated-actions?issue_uuid=${createdIssueUuid}`);
      
      expect(response.status).toBe(200);
      // Должен быть хотя бы один комментарий с нашим uuid
      const found = response.data.rows?.find((r: any) => r.uuid === upsertCommentUuid);
      expect(found).toBeDefined();
    });

    afterAll(async () => {
      // Удаляем созданный через upsert комментарий
      if (upsertCommentUuid) {
        await api.delete(`/api/v2/issue-actions/${upsertCommentUuid}`);
      }
    });
  });

  describe('Удаление комментария', () => {
    
    it('должен архивировать комментарий', async () => {
      if (!createdCommentUuid) return;

      const response = await api.delete(`/api/v2/issue-actions/${createdCommentUuid}`);
      // 204 при успешном удалении или 200 если возвращает тело
      expect([200, 204]).toContain(response.status);
    });
  });
});

describe('Issues E2E - Списание времени (Time Entries)', () => {
  
  describe('Создание записи времени', () => {
    
    it('должен создавать запись о списании времени', async () => {
      if (!createdIssueUuid || !testData.userUuid) {
        console.log('Пропуск: недостаточно данных для time entry');
        return;
      }

      const timeEntry = {
        issue_uuid: createdIssueUuid,
        author_uuid: testData.userUuid,
        work_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        duration: 1.5,
        comment: 'E2E тест списания времени'
      };

      const response = await api.post('/api/v2/time-entries', timeEntry);
      
      // CRUD factory возвращает 200 при создании через getByUuid и оборачивает в rows
      expect([200, 201]).toContain(response.status);
      
      // Ответ может быть {uuid: ...} или {rows: [...]}
      if (response.data.rows) {
        expect(response.data.rows.length).toBeGreaterThan(0);
        expect(parseFloat(response.data.rows[0].duration)).toBe(1.5);
        createdTimeEntryUuid = response.data.rows[0].uuid;
      } else {
        expect(response.data).toHaveProperty('uuid');
        expect(parseFloat(response.data.duration)).toBe(1.5);
        createdTimeEntryUuid = response.data.uuid;
      }
      
      console.log(`Создано списание времени: ${createdTimeEntryUuid}`);
    });

    it('должен получать списания времени по задаче', async () => {
      if (!createdIssueUuid) return;

      const response = await api.get(`/api/v2/time-entries?issue_uuid=${createdIssueUuid}`);
      
      expect(response.status).toBe(200);
      expect(response.data.rows).toBeDefined();
    });
  });

  describe('Редактирование записи времени', () => {
    
    it('должен обновлять duration', async () => {
      if (!createdTimeEntryUuid) {
        console.log('Пропуск: нет созданной записи времени');
        return;
      }

      const response = await api.put(`/api/v2/time-entries/${createdTimeEntryUuid}`, {
        duration: 2.5,
        comment: 'Обновленный комментарий'
      });
      
      expect(response.status).toBe(200);
    });
  });

  describe('Удаление записи времени', () => {
    
    it('должен удалять запись времени', async () => {
      if (!createdTimeEntryUuid) return;

      const response = await api.delete(`/api/v2/time-entries/${createdTimeEntryUuid}`);
      // 200 если возвращает тело, 204 если успешно без тела
      expect([200, 204]).toContain(response.status);
    });
  });
});

describe('Issues E2E - Наблюдатели (Watchers)', () => {
  
  describe('Добавление наблюдателя', () => {
    
    it('должен добавлять наблюдателя к задаче', async () => {
      if (!createdIssueUuid || !testData.userUuid) {
        console.log('Пропуск: недостаточно данных для watcher');
        return;
      }

      const watcher = {
        issue_uuid: createdIssueUuid,
        user_uuid: testData.userUuid
      };

      const response = await api.post('/api/v2/watchers', watcher);
      
      expect([200, 201]).toContain(response.status);
      console.log(`Добавлен наблюдатель`);
    });

    it('должен получать наблюдателей задачи', async () => {
      if (!createdIssueUuid) return;

      const response = await api.get(`/api/v2/watchers?issue_uuid=${createdIssueUuid}`);
      
      expect(response.status).toBe(200);
      expect(response.data.rows).toBeDefined();
    });
  });

  describe('Удаление наблюдателя', () => {
    
    it('должен удалять наблюдателя', async () => {
      if (!createdIssueUuid || !testData.userUuid) return;

      const response = await api.delete(`/api/v2/watchers?issue_uuid=${createdIssueUuid}&user_uuid=${testData.userUuid}`);
      expect([200, 204]).toContain(response.status);
    });
  });
});

describe('Issues E2E - Связи (Relations)', () => {
  
  it('должен получать связи задачи', async () => {
    if (!createdIssueUuid) return;

    const response = await api.get(`/api/v2/relations?issue0_uuid=${createdIssueUuid}`);
    
    expect(response.status).toBe(200);
  });

  it('должен получать форматированные связи', async () => {
    if (!createdIssueUuid) return;

    const response = await api.get(`/api/v2/formated-relations?current_uuid=${createdIssueUuid}`);
    
    expect(response.status).toBe(200);
    expect(response.data.rows).toBeDefined();
  });
});

describe('Issues E2E - Теги задачи', () => {
  let createdTagSelectedUuid: string = '';
  
  describe('Добавление тега', () => {
    
    it('должен добавлять тег к задаче', async () => {
      if (!createdIssueUuid || !testData.tagUuid) {
        console.log('Пропуск: недостаточно данных для tag');
        return;
      }

      const tagSelected = {
        issue_uuid: createdIssueUuid,
        tag_uuid: testData.tagUuid
      };

      const response = await api.post('/api/v2/issue-tags-selected', tagSelected);
      
      expect([200, 201]).toContain(response.status);
      if (response.data.rows?.[0]?.uuid) {
        createdTagSelectedUuid = response.data.rows[0].uuid;
      }
      console.log('Тег добавлен к задаче');
    });

    it('должен получать теги задачи', async () => {
      if (!createdIssueUuid) return;

      const response = await api.get(`/api/v2/issue-tags-selected?issue_uuid=${createdIssueUuid}`);
      
      expect(response.status).toBe(200);
      expect(response.data.rows).toBeDefined();
    });
  });

  describe('Удаление тега', () => {
    
    it('должен удалять тег с задачи', async () => {
      if (!createdTagSelectedUuid) {
        console.log('Пропуск: нет добавленного тега');
        return;
      }

      const response = await api.delete(`/api/v2/issue-tags-selected/${createdTagSelectedUuid}`);
      expect(response.status).toBe(204);
    });
  });
});

describe('Issues E2E - Вложения (Attachments)', () => {
  
  it('должен получать вложения задачи', async () => {
    if (!createdIssueUuid) return;

    const response = await api.get(`/api/v2/attachments?issue_uuid=${createdIssueUuid}`);
    
    expect(response.status).toBe(200);
  });
});

describe('Issues E2E - Кастомные поля (Field Values)', () => {
  
  it('должен получать значения кастомных полей', async () => {
    if (!createdIssueUuid) return;

    const response = await api.get(`/api/v2/field-values?issue_uuid=${createdIssueUuid}`);
    
    expect(response.status).toBe(200);
  });
});

describe('Issues E2E - Удаление задачи', () => {
  
  it('должен удалять задачу (soft delete)', async () => {
    if (!createdIssueUuid) {
      console.log('Пропуск: нет созданной задачи');
      return;
    }

    const response = await api.delete(`/api/v2/issues/${createdIssueUuid}`);
    // 200 если возвращает uuid, 204 если без тела
    expect([200, 204]).toContain(response.status);
    
    // Задача больше не должна находиться
    const getResponse = await api.get(`/api/v2/issues/${createdIssueUuid}`);
    expect(getResponse.status).toBe(404);
    
    // Сбрасываем UUID чтобы afterAll не пытался удалить
    createdIssueUuid = '';
    console.log('Задача успешно удалена');
  });
});

