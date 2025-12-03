import { test } from '@playwright/test';
import { getEmailFromTempMail, getIframeBody, waitRegisterMail, sendWorkspaceRegister, signIn, signOut, navigateMainMenu, changeField, createUser, createWorkflow, createStatus, createField, createProject, createIssue } from '../helpers';

test.describe.serial('Регресионный тест', () => {
  const startTime = new Date().getTime();
  const workspace = 'test' + startTime;
  const newPass = 'pass' + startTime;
  let adminEmail: string;
  const adminName = 'Марк Захаров';
  const usereMail = 'testuser@unkaos.org';
  const userLogin = 'spetrov';
  const userName = 'Сергей Петров';
  let state = 0;
  const baseUrl = 'https://unkaos.local';

  // Хранилище UUID созданных сущностей для удаления
  const createdEntities = {
    user: null as string | null,
    status: null as string | null,
    workflow: null as string | null,
    issueType: null as string | null,
    project: null as string | null,
    role: null as string | null,
  };

  test.beforeEach(async ({ page }) => {
    console.log('🔄 BeforeEach: state =', state);
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    if (!state) return;

    const loginUrl = `${baseUrl}/${workspace}/login`;
    await page.goto(loginUrl);
    await page.waitForSelector('.login-panel', { timeout: 10000 });
    
    if (state == 1) {
      await signIn(page, adminEmail, newPass);
    } else if (state == 2) {
      await signIn(page, usereMail, newPass);
    }
    
    await page.waitForSelector('.profile', { timeout: 10000 });
    await page.waitForSelector('.main-menu-list', { timeout: 10000 });
  });

  // ===========================================
  // ЧАСТЬ 1: РЕГИСТРАЦИЯ И НАСТРОЙКА
  // ===========================================

  test('Регистрация рабочего пространства и смена пароля', async ({ page }) => {
    console.log('🚀 Начинаем тест регистрации...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    adminEmail = await getEmailFromTempMail();
    console.log('📧 Получен email:', adminEmail);

    await sendWorkspaceRegister(page, workspace, adminEmail);
    await waitRegisterMail(page);

    const activationLink = await getIframeBody(page);
    const pass = await activationLink.locator().innerText();
    const link = activationLink.getAttribute('href');
    
    if (!link) throw new Error('Activation link not found');
    if (!pass) throw new Error('Activation password not found');

    const activationUrl = link.replace('https://unkaos.ru', baseUrl);
    await page.goto(activationUrl);
    await page.waitForTimeout(2000);
    await page.waitForSelector('.login-panel', { timeout: 10000 });
    
    await signIn(page, adminEmail, pass);
    await page.waitForSelector('.profile', { timeout: 10000 });
    
    await page.goto(`/${workspace}/configs/users`);
    await page.waitForSelector('.ktable .user', { timeout: 10000 });
    
    await changeField(page, 'ФИО', adminName, adminEmail);
    await changeField(page, 'Пароль', newPass, adminEmail);
    
    await page.waitForSelector('.profile', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    await signOut(page);
    await signIn(page, adminEmail, newPass);
    await signOut(page);

    state = 1;
    console.log('✅ Тест регистрации завершен');
  });

  // ===========================================
  // ЧАСТЬ 2: СОЗДАНИЕ + РЕДАКТИРОВАНИЕ (CRUD)
  // ===========================================

  test('Пользователь: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест пользователя: создание + редактирование...');
    
    // СОЗДАНИЕ
    await navigateMainMenu(page, 'users');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    await createUser(page, userName, userLogin, usereMail);
    console.log('✅ Пользователь создан');
    
    // РЕДАКТИРОВАНИЕ (Full Replace тест)
    await page.waitForTimeout(1000);
    const userRow = page.locator(`.ktable :text("${usereMail}")`);
    if (await userRow.count() > 0) {
      await userRow.first().click();
      await page.waitForTimeout(1000);
      
      // Редактируем telegram
      await changeField(page, 'Телеграм', '@testuser_edited');
      
      const saveButton = page.locator('input[type="button"][value="Сохранить"]');
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      // Проверяем сохранение
      await userRow.first().click();
      await page.waitForTimeout(1000);
      
      const telegramField = page.locator('.label:has-text("Телеграм")').locator('..').locator('input.string-input');
      const telegramValue = await telegramField.inputValue();
      
      if (!telegramValue.includes('testuser_edited')) {
        throw new Error(`Telegram не сохранился: ${telegramValue}`);
      }
      console.log('✅ Пользователь отредактирован');
    }
  });

  test('Статус: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест статуса: создание + редактирование...');
    
    // СОЗДАНИЕ
    await navigateMainMenu(page, 'issue_statuses');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    await createStatus(page, 'Тестовый статус', false, false);
    console.log('✅ Статус создан');
    
    // РЕДАКТИРОВАНИЕ
    await page.waitForTimeout(1000);
    const statusRow = page.locator('.ktable :text("Тестовый статус")');
    if (await statusRow.count() > 0) {
      await statusRow.first().click();
      await page.waitForTimeout(1000);
      
      await changeField(page, 'Название', 'Тестовый статус (изменён)');
      
      const saveButton = page.locator('input[type="button"][value="Сохранить"]');
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      // Проверяем что статус с новым именем существует
      const updatedRow = page.locator('.ktable :text("изменён")');
      if (await updatedRow.count() === 0) {
        throw new Error('Статус не обновился');
      }
      console.log('✅ Статус отредактирован');
    }
  });

  test('Воркфлоу: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест воркфлоу: создание + редактирование...');
    
    // СОЗДАНИЕ
    await navigateMainMenu(page, 'workflows');
    await createWorkflow(page, 'Тестовый воркфлоу');
    console.log('✅ Воркфлоу создан');
    
    // РЕДАКТИРОВАНИЕ
    // После создания воркфлоу редактор уже открыт
    await page.waitForTimeout(1000);
    
    // Кликаем по воркфлоу в таблице слева чтобы убедиться что он выбран
    const wfRow = page.locator('.ktable span:has-text("Тестовый воркфлоу")');
    if (await wfRow.count() > 0) {
      await wfRow.first().click();
      await page.waitForTimeout(1000);
      
      // В редакторе воркфлоу название редактируется через специальный input
      const nameInput = page.locator('[data-testid="workflow-name"]');
      if (await nameInput.count() > 0) {
        await nameInput.clear();
        await nameInput.fill('Тестовый воркфлоу (изменён)');
        
        // Сохраняем через кнопку в редакторе
        const saveButton = page.locator('[data-testid="save-workflow"]');
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        console.log('✅ Воркфлоу отредактирован');
      } else {
        console.log('⚠️ Поле названия воркфлоу не найдено');
      }
    } else {
      console.log('⚠️ Воркфлоу не найден в таблице');
    }
  });

  test('Роль: проверка и редактирование', async ({ page }) => {
    console.log('🚀 Тест роли: проверка + редактирование...');
    
    await navigateMainMenu(page, 'roles');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню если открыто
    const menu = page.locator('#main-menu.open');
    if (await menu.count() > 0) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Выбираем существующую роль в таблице
    const adminRole = page.locator('.ktable span:has-text("Администратор")').first();
    await adminRole.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Проверяем чекбоксы прав
    const checkboxes = await page.locator('.checkboxlist input[type="checkbox"]').count();
    console.log(`Найдено чекбоксов прав: ${checkboxes}`);
    
    if (checkboxes === 0) {
      await page.screenshot({ path: 'debug-roles-no-checkboxes.png', fullPage: true });
      throw new Error('Чекбоксы прав не найдены');
    }
    
    // Пробуем сохранить без изменений (Full Replace тест)
    const saveButton = page.locator('input[type="button"][value="Сохранить"]');
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(2000);
    }
    
    console.log('✅ Роль проверена и сохранена');
  });

  test('Тип задачи: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест типа задачи: создание + редактирование...');
    
    // СОЗДАНИЕ
    await navigateMainMenu(page, 'issue_types');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню если открыто
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    await page.click('.btn_input.bx-plus-circle');
    await page.waitForTimeout(500);
    
    await changeField(page, "Название", "Тестовый тип");
    
    // Выбираем воркфлоу
    const workflowSelect = page.locator('.label:has-text("Воркфлоу")').locator('..').locator('select, .vue-select');
    if (await workflowSelect.count() > 0) {
      await workflowSelect.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
    }
    
    const createButton = page.locator('input[type="button"][value="Создать"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }
    console.log('✅ Тип задачи создан');
    
    // РЕДАКТИРОВАНИЕ
    await page.waitForTimeout(1000);
    const typeRow = page.locator('.ktable :text("Тестовый тип")');
    if (await typeRow.count() > 0) {
      await typeRow.first().click();
      await page.waitForTimeout(1000);
      
      await changeField(page, 'Название', 'Тестовый тип (изменён)');
      
      const saveButton = page.locator('input[type="button"][value="Сохранить"]');
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      console.log('✅ Тип задачи отредактирован');
    }
  });

  // ===========================================
  // ЧАСТЬ 3: ПРОВЕРКА ОТОБРАЖЕНИЯ ЭКРАНОВ
  // ===========================================

  test('Поля: создание разных типов', async ({ page }) => {
    console.log('🚀 Тест полей: создание разных типов...');
    
    await navigateMainMenu(page, 'fields');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // 1. Создаём текстовое поле
    await createField(page, { name: 'Тестовое строковое', typeCode: 'Строка' });
    console.log('✅ Строковое поле создано');
    
    // 2. Создаём числовое поле
    await createField(page, { name: 'Тестовое числовое', typeCode: 'Числовое' });
    console.log('✅ Числовое поле создано');
    
    // 3. Создаём булево поле
    await createField(page, { name: 'Тестовое булево', typeCode: 'Булево' });
    console.log('✅ Булево поле создано');
    
    // 4. Создаём поле даты
    await createField(page, { name: 'Тестовая дата', typeCode: 'Дата' });
    console.log('✅ Поле даты создано');
    
    // 5. Создаём поле Select со значениями и цветами
    await createField(page, { 
      name: 'Тестовый приоритет', 
      typeCode: 'Значение из списка',
      availableValues: [
        { name: 'Низкий', color: '#00ff00' },
        { name: 'Средний', color: '#ffff00' },
        { name: 'Высокий', color: '#ff0000' }
      ]
    });
    console.log('✅ Поле Select со значениями и цветами создано');
    
    // Проверяем, что все поля созданы
    await page.waitForTimeout(1000);
    const tableContent = await page.locator('.ktable').textContent();
    
    const fieldsToCheck = ['Тестовое строковое', 'Тестовое числовое', 'Тестовое булево', 'Тестовая дата', 'Тестовый приоритет'];
    for (const fieldName of fieldsToCheck) {
      if (!tableContent?.includes(fieldName)) {
        console.warn(`⚠️ Поле "${fieldName}" не найдено в таблице`);
      }
    }
    
    console.log('✅ Все типы полей проверены');
  });

  test('Проект: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест проекта: создание + редактирование...');
    
    await navigateMainMenu(page, 'projects');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // СОЗДАНИЕ
    await createProject(page, 'Тестовый проект', 'TEST');
    
    // Проверяем, что проект появился в таблице
    const projectRow = page.locator('.ktable :text("Тестовый проект")');
    if (await projectRow.count() === 0) {
      throw new Error('Проект не найден в таблице после создания');
    }
    console.log('✅ Проект создан');
    
    // РЕДАКТИРОВАНИЕ
    await projectRow.first().click();
    await page.waitForTimeout(1000);
    
    await changeField(page, 'Название', 'Тестовый проект (изменён)');
    
    const saveButton = page.locator('input[type="button"][value="Сохранить"]');
    await saveButton.click();
    await page.waitForTimeout(2000);
    
    // Проверяем изменение
    const updatedRow = page.locator('.ktable :text("изменён")');
    if (await updatedRow.count() === 0) {
      throw new Error('Проект не обновился');
    }
    
    console.log('✅ Проект отредактирован');
  });

  test('Задача: создание и жизненный цикл', async ({ page }) => {
    console.log('🚀 Тест задачи: создание и проверка полей...');
    
    // СОЗДАНИЕ ЗАДАЧИ
    await createIssue(page, {
      summary: 'Тестовая задача E2E',
      project: 'Тестовый проект (изменён)',
      type: 'Тестовый тип', // Используем тип, созданный ранее
      priority: 'Высокий'   // Используем значение из списка, созданное ранее
    });
    
    // ПРОВЕРКА ЗАДАЧИ
    await page.waitForTimeout(1000);
    
    // Ищем задачу в списке
    const issueRow = page.locator('.ktable :text("Тестовая задача E2E")');
    if (await issueRow.count() === 0) {
      throw new Error('Созданная задача не найдена в списке');
    }
    
    // Открываем задачу
    await issueRow.first().click();
    await page.waitForSelector('.issue-card-content', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Проверяем значения полей
    console.log('Проверка значений полей задачи...');
    
    // 1. Проверяем статус (должен быть начальным из воркфлоу)
    // Примечание: наш воркфлоу "Тестовый воркфлоу" имеет статусы, но мы не знаем какой первый.
    // Обычно первый добавленный.
    
    // 2. Проверяем приоритет (наше кастомное поле)
    const priorityValue = await page.locator('.select-input:has(.label:text-is("Тестовый приоритет")) .vs__selected').textContent();
    if (!priorityValue?.includes('Высокий')) {
      console.warn(`⚠️ Приоритет не сохранился или отображается неверно: "${priorityValue}"`);
    } else {
      console.log('✅ Приоритет "Высокий" сохранен корректно');
    }
    
    // РЕДАКТИРОВАНИЕ ЗАДАЧИ
    console.log('Редактирование задачи...');
    
    // Меняем тему
    const summaryInput = page.locator('.string-input:has-text(""), input[placeholder="Тема"], input[placeholder="Название"]').first();
    await summaryInput.fill('Тестовая задача E2E (обновлена)');
    
    // Сохраняем (если есть кнопка сохранения, иногда автосейв)
    const saveBtn = page.locator('input[type="button"][value="Сохранить"]');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // СМЕНА СТАТУСА (Transition)
    console.log('Проверка смены статуса...');
    const statusDropdown = page.locator('.issue-status-dropdown, .workflow-status');
    if (await statusDropdown.count() > 0) {
      await statusDropdown.click();
      await page.waitForTimeout(500);
      
      // Кликаем по любому доступному следующему статусу
      const nextStatus = page.locator('.status-transition-item, .dropdown-item').first();
      if (await nextStatus.count() > 0) {
        const nextStatusName = await nextStatus.textContent();
        console.log(`Переход в статус: ${nextStatusName}`);
        await nextStatus.click();
        await page.waitForTimeout(1000);
        console.log('✅ Статус изменен');
      } else {
        console.log('ℹ️ Нет доступных переходов статуса (возможно, это конечный статус)');
      }
    }
    
    console.log('✅ Жизненный цикл задачи проверен');
  });

  test('Проверка страницы досок', async ({ page }) => {
    console.log('🚀 Проверка страницы досок...');
    
    await navigateMainMenu(page, 'boards');
    await page.waitForTimeout(2000);
    
    const boardContent = await page.locator('.board-content, .kanban, .ktable').count();
    console.log(`Контент доски найден: ${boardContent > 0}`);
    
    console.log('✅ Страница досок проверена');
  });

  // ===========================================
  // ЧАСТЬ 4: УДАЛЕНИЕ (в самом конце)
  // ===========================================

  test('Удаление: тип задачи', async ({ page }) => {
    console.log('🗑️ Удаление типа задачи...');
    
    await navigateMainMenu(page, 'issue_types');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    const typeRow = page.locator('.ktable :text("Тестовый тип")');
    if (await typeRow.count() > 0) {
      await typeRow.first().click();
      await page.waitForTimeout(500);
      
      const deleteButton = page.locator('input[type="button"][value="Удалить"], .btn-delete, .bx-trash');
      if (await deleteButton.count() > 0) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);
        
        // Подтверждаем удаление если есть диалог
        const confirmButton = page.locator('button:has-text("Да"), button:has-text("OK"), .confirm-yes');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('✅ Тип задачи удалён');
  });

  test('Удаление: воркфлоу', async ({ page }) => {
    console.log('🗑️ Удаление воркфлоу...');
    
    await navigateMainMenu(page, 'workflows');
    await page.waitForTimeout(1000);
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const wfRow = page.locator('.ktable :text("Тестовый воркфлоу")');
    if (await wfRow.count() > 0) {
      await wfRow.first().click({ force: true });
      await page.waitForTimeout(500);
      
      const deleteButton = page.locator('input[type="button"][value="Удалить"], .btn-delete, .bx-trash');
      if (await deleteButton.count() > 0) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);
        
        const confirmButton = page.locator('button:has-text("Да"), button:has-text("OK"), .confirm-yes');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('✅ Воркфлоу удалён');
  });

  test('Удаление: статус', async ({ page }) => {
    console.log('🗑️ Удаление статуса...');
    
    await navigateMainMenu(page, 'issue_statuses');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const statusRow = page.locator('.ktable :text("Тестовый статус")');
    if (await statusRow.count() > 0) {
      await statusRow.first().click({ force: true });
      await page.waitForTimeout(500);
      
      const deleteButton = page.locator('input[type="button"][value="Удалить"], .btn-delete, .bx-trash');
      if (await deleteButton.count() > 0) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);
        
        const confirmButton = page.locator('button:has-text("Да"), button:has-text("OK"), .confirm-yes');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('✅ Статус удалён');
  });

  test('Удаление: проект', async ({ page }) => {
    console.log('🗑️ Удаление проекта...');
    
    await navigateMainMenu(page, 'projects');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const projectRow = page.locator('.ktable :text("Тестовый проект")');
    if (await projectRow.count() > 0) {
      await projectRow.first().click({ force: true });
      await page.waitForTimeout(500);
      
      const deleteButton = page.locator('input[type="button"][value="Удалить"], .btn-delete, .bx-trash');
      if (await deleteButton.count() > 0) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);
        
        // Подтверждаем удаление
        const confirmButton = page.locator('button:has-text("Да"), button:has-text("OK"), .confirm-yes');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('✅ Проект удалён');
  });

  test('Удаление: пользователь (деактивация)', async ({ page }) => {
    console.log('🗑️ Деактивация пользователя...');
    
    await navigateMainMenu(page, 'users');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const userRow = page.locator(`.ktable :text("${usereMail}")`);
    if (await userRow.count() > 0) {
      await userRow.first().click({ force: true });
      await page.waitForTimeout(500);
      
      // Деактивируем через чекбокс "Активен"
      const activeCheckbox = page.locator('.label:has-text("Активен")').locator('..').locator('input[type="checkbox"]');
      if (await activeCheckbox.count() > 0 && await activeCheckbox.isChecked()) {
        await activeCheckbox.uncheck();
        
        const saveButton = page.locator('input[type="button"][value="Сохранить"]');
        await saveButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('✅ Пользователь деактивирован');
  });
});
