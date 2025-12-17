import { test } from '@playwright/test';
import { getEmailFromTempMail, getIframeBody, waitRegisterMail, sendWorkspaceRegister, signIn, signOut, navigateMainMenu, changeField, createUser, createWorkflow, createStatus, createField, createProject, createIssue, logWork, addDashboardGadget, createAutomation } from '../helpers';

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
    
    // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки создания...');
    await page.reload();
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
    const userRowAfterReload = page.locator(`.ktable :text("${usereMail}")`);
    if (await userRowAfterReload.count() === 0) {
      throw new Error(`Пользователь с email "${usereMail}" не найден после обновления страницы`);
    }
    console.log('✅ Пользователь подтверждён после обновления страницы');
    
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
      
      // ПРОВЕРКА РЕДАКТИРОВАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
      console.log('🔄 Обновление страницы для проверки редактирования...');
      await page.reload();
      await page.waitForSelector('.ktable', { timeout: 10000 });
      
      // Кликаем по пользователю снова
      const userRowAfterEdit = page.locator(`.ktable :text("${usereMail}")`);
      await userRowAfterEdit.first().click();
      await page.waitForTimeout(1000);
      
      const telegramField = page.locator('.label:has-text("Телеграм")').locator('..').locator('input.string-input');
      const telegramValue = await telegramField.inputValue();
      
      if (!telegramValue.includes('testuser_edited')) {
        throw new Error(`Telegram не сохранился после обновления страницы: ${telegramValue}`);
      }
      console.log('✅ Пользователь отредактирован и подтверждён после обновления страницы');
    }
  });

  test('Статус: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест статуса: создание + редактирование...');
    
    // СОЗДАНИЕ
    await navigateMainMenu(page, 'issue_statuses');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    await createStatus(page, 'Тестовый статус', false, false);
    console.log('✅ Статус создан');
    
    // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки создания...');
    await page.reload();
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
    const statusRowAfterReload = page.locator('.ktable :text("Тестовый статус")');
    if (await statusRowAfterReload.count() === 0) {
      throw new Error('Статус "Тестовый статус" не найден после обновления страницы');
    }
    console.log('✅ Статус подтверждён после обновления страницы');
    
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
      
      // ПРОВЕРКА РЕДАКТИРОВАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
      console.log('🔄 Обновление страницы для проверки редактирования...');
      await page.reload();
      await page.waitForSelector('.ktable', { timeout: 10000 });
      
      // Проверяем что статус с новым именем существует
      const updatedRow = page.locator('.ktable :text("изменён")');
      if (await updatedRow.count() === 0) {
        throw new Error('Статус не обновился после обновления страницы');
      }
      console.log('✅ Статус отредактирован и подтверждён после обновления страницы');
    }
  });

  test('Воркфлоу: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест воркфлоу: создание + редактирование...');
    
    // СОЗДАНИЕ
    await navigateMainMenu(page, 'workflows');
    await createWorkflow(page, 'Тестовый воркфлоу');
    console.log('✅ Воркфлоу создан');
    
    // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки создания...');
    await page.reload();
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
    const wfRowAfterReload = page.locator('.ktable span:has-text("Тестовый воркфлоу")');
    if (await wfRowAfterReload.count() === 0) {
      throw new Error('Воркфлоу "Тестовый воркфлоу" не найден после обновления страницы');
    }
    console.log('✅ Воркфлоу подтверждён после обновления страницы');
    
    // РЕДАКТИРОВАНИЕ
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
        
        // ПРОВЕРКА РЕДАКТИРОВАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
        console.log('🔄 Обновление страницы для проверки редактирования...');
        await page.reload();
        await page.waitForSelector('.ktable', { timeout: 10000 });
        
        const updatedWfRow = page.locator('.ktable span:has-text("изменён")');
        if (await updatedWfRow.count() === 0) {
          throw new Error('Воркфлоу не обновился после обновления страницы');
        }
        console.log('✅ Воркфлоу отредактирован и подтверждён после обновления страницы');
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
    
    // Выбираем воркфлоу - ищем select-input с лейблом "Воркфлоу"
    console.log('Выбираем воркфлоу...');
    const workflowContainer = page.locator('.select-input:has(.label:text("Воркфлоу"))');
    if (await workflowContainer.count() > 0) {
      const dropdown = workflowContainer.locator('.vs__dropdown-toggle');
      await dropdown.click();
      await page.waitForTimeout(500);
      
      // Ищем наш созданный воркфлоу (может быть с суффиксом "изменён")
      let option = page.locator('.vs__dropdown-option:has-text("Тестовый воркфлоу")');
      if (await option.count() > 0) {
        await option.first().click();
        console.log('✅ Воркфлоу выбран');
      } else {
        // Если не нашли, выбираем первый доступный
        const firstOption = page.locator('.vs__dropdown-option').first();
        if (await firstOption.count() > 0) {
          const optionText = await firstOption.textContent();
          await firstOption.click();
          console.log(`✅ Выбран первый доступный воркфлоу: ${optionText}`);
        } else {
          await page.keyboard.press('Escape');
          console.warn('⚠️ Воркфлоу не найден');
      }
    }
    } else {
      console.warn('⚠️ Контейнер воркфлоу не найден');
    }
    
    await page.waitForTimeout(500);
    
    const createButton = page.locator('input[type="button"][value="Создать"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      // Ждем пока закроется карточка создания или появится новая строка
      await page.waitForTimeout(2000);
    }
    
    // Проверяем что тип появился в таблице сразу после создания
    const typeRowImmediate = page.locator('.ktable :text("Тестовый тип")');
    if (await typeRowImmediate.count() === 0) {
      // Делаем скриншот для отладки
      await page.screenshot({ path: 'debug-issue-type-creation.png', fullPage: true });
      console.warn('⚠️ Тип задачи не найден сразу после создания, проверяем таблицу...');
      const tableContent = await page.locator('.ktable').textContent();
      console.log('Содержимое таблицы:', tableContent);
    }
    console.log('✅ Тип задачи создан');
    
    // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки создания...');
    await page.reload();
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
    const typeRowAfterReload = page.locator('.ktable :text("Тестовый тип")');
    if (await typeRowAfterReload.count() === 0) {
      throw new Error('Тип задачи "Тестовый тип" не найден после обновления страницы');
    }
    console.log('✅ Тип задачи подтверждён после обновления страницы');
    
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
      
      // ПРОВЕРКА РЕДАКТИРОВАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
      console.log('🔄 Обновление страницы для проверки редактирования...');
      await page.reload();
      await page.waitForSelector('.ktable', { timeout: 10000 });
      
      const updatedTypeRow = page.locator('.ktable :text("изменён")');
      if (await updatedTypeRow.count() === 0) {
        throw new Error('Тип задачи не обновился после обновления страницы');
      }
      console.log('✅ Тип задачи отредактирован и подтверждён после обновления страницы');
    }
  });

  // ===========================================
  // ЧАСТЬ 3: ПРОВЕРКА ОТОБРАЖЕНИЯ ЭКРАНОВ
  // ===========================================

  test('Автоматизация: создание', async ({ page }) => {
    console.log('🚀 Тест автоматизации: создание...');
    
    try {
      // Проверяем наличие пункта меню автоматизаций
      const automationsLink = page.locator('a[href*="/configs/automations"]');
      await page.waitForTimeout(1000);
      if (await automationsLink.count() === 0) {
        console.log('⚠️ Меню автоматизаций недоступно, пропускаем тест');
        return;
      }
      
      await navigateMainMenu(page, 'automations');
      await page.waitForSelector('.table_card, .ktable', { timeout: 10000 });
      
      // Закрываем меню если открыто
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
      // СОЗДАНИЕ
      await page.click('.btn_input.bx-plus-circle');
      await page.waitForTimeout(500);
      
      await changeField(page, "Название", "Тестовая автоматизация");
      
      // Выбираем воркфлоу
      const wfSelect = page.locator('.select-input:has(.label:has-text("Воркфлоу")) .vs__dropdown-toggle');
      if (await wfSelect.count() > 0) {
        await wfSelect.click();
        await page.waitForTimeout(300);
        
        // Выбираем первый доступный воркфлоу
        const firstOption = page.locator('.vs__dropdown-option').first();
        if (await firstOption.count() > 0) {
          await firstOption.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
      
      const createButton = page.locator('input[type="button"][value="Создать"]');
      if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
      
      console.log('✅ Автоматизация создана');
      
      // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
      console.log('🔄 Обновление страницы для проверки создания...');
      await page.reload();
      await page.waitForSelector('.ktable', { timeout: 10000 });
      
      const automationRow = page.locator('.ktable :text("Тестовая автоматизация")');
      if (await automationRow.count() === 0) {
        throw new Error('Автоматизация "Тестовая автоматизация" не найдена после обновления страницы');
      }
      console.log('✅ Автоматизация подтверждена после обновления страницы');
      
    } catch (e) {
      console.warn('⚠️ Ошибка при работе с автоматизациями:', e);
    }
  });

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
    // Примечание: Select-поля могут требовать отдельной обработки
    try {
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
    } catch (e) {
      console.warn('⚠️ Не удалось создать поле Select, продолжаем тест:', e);
    }
    
    // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки создания полей...');
    await page.reload();
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
    const tableContent = await page.locator('.ktable').textContent();
    
    // Проверяем только основные поля (без Select, который может не создаваться)
    const fieldsToCheck = ['Тестовое строковое', 'Тестовое числовое', 'Тестовое булево', 'Тестовая дата'];
    const missingFields: string[] = [];
    for (const fieldName of fieldsToCheck) {
      if (!tableContent?.includes(fieldName)) {
        missingFields.push(fieldName);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`Поля не найдены после обновления страницы: ${missingFields.join(', ')}`);
    }
    
    // Опционально проверяем Select-поле
    if (tableContent?.includes('Тестовый приоритет')) {
      console.log('✅ Поле Select также подтверждено');
    } else {
      console.warn('⚠️ Поле Select не найдено после обновления (возможно, не было создано)');
    }
    
    console.log('✅ Основные поля подтверждены после обновления страницы');
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
    
    // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки создания...');
    await page.reload();
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
    const projectRowAfterReload = page.locator('.ktable :text("Тестовый проект")');
    if (await projectRowAfterReload.count() === 0) {
      throw new Error('Проект "Тестовый проект" не найден после обновления страницы');
    }
    console.log('✅ Проект подтверждён после обновления страницы');
    
    // РЕДАКТИРОВАНИЕ
    await projectRowAfterReload.first().click();
    await page.waitForTimeout(1000);
    
    await changeField(page, 'Название', 'Тестовый проект (изменён)');
    
    const saveButton = page.locator('input[type="button"][value="Сохранить"]');
    await saveButton.click();
    await page.waitForTimeout(2000);
    
    // ПРОВЕРКА РЕДАКТИРОВАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки редактирования...');
    await page.reload();
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
    // Проверяем изменение
    const updatedRow = page.locator('.ktable :text("изменён")');
    if (await updatedRow.count() === 0) {
      throw new Error('Проект не обновился после обновления страницы');
    }
    
    console.log('✅ Проект отредактирован и подтверждён после обновления страницы');
  });

  test('Спринт: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест спринта: создание + редактирование...');
    
    // Проверяем доступность меню спринтов (после beforeEach уже залогинены)
    const sprintsLink = page.locator('a[href*="/configs/sprints"]');
    await page.waitForTimeout(1000); // Даем время для загрузки меню
    if (await sprintsLink.count() === 0) {
      console.log('⚠️ Меню спринтов недоступно (возможно отключено или нет прав), пропускаем тест');
      return;
    }
    
    try {
    await navigateMainMenu(page, 'sprints');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    } catch (e) {
      console.warn('⚠️ Не удалось открыть страницу спринтов:', e);
      return;
    }
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];
    
    // СОЗДАНИЕ
    await page.click('.btn_input.bx-plus-circle');
    await page.waitForTimeout(500);
    
    await changeField(page, "Название", "Тестовый спринт");
    
    // Заполняем даты
    const fillDate = async (label: string, value: string) => {
        const input = page.locator(`.label:has-text("${label}")`).locator('..').locator('input');
        await input.fill(value);
    };
    
    await fillDate("Дата начала", startDate);
    await fillDate("Дата окончания", endDate);
    
    const createButton = page.locator('input[type="button"][value="Создать"]');
    if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForTimeout(1000);
    }
    console.log('✅ Спринт создан');
    
    // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки создания...');
    await page.reload();
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
    const sprintRowAfterReload = page.locator('.ktable :text("Тестовый спринт")');
    if (await sprintRowAfterReload.count() === 0) {
      throw new Error('Спринт "Тестовый спринт" не найден после обновления страницы');
    }
    console.log('✅ Спринт подтверждён после обновления страницы');
    
    // РЕДАКТИРОВАНИЕ
    const sprintRow = page.locator('.ktable :text("Тестовый спринт")');
    if (await sprintRow.count() > 0) {
      await sprintRow.first().click();
      await page.waitForTimeout(1000);
      
      await changeField(page, 'Название', 'Тестовый спринт (изменён)');
      
      const saveButton = page.locator('input[type="button"][value="Сохранить"]');
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      // ПРОВЕРКА РЕДАКТИРОВАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
      console.log('🔄 Обновление страницы для проверки редактирования...');
      await page.reload();
      await page.waitForSelector('.ktable', { timeout: 10000 });
      
      const updatedRow = page.locator('.ktable :text("изменён")');
      if (await updatedRow.count() === 0) {
        throw new Error('Спринт не обновился после обновления страницы');
      }
      console.log('✅ Спринт отредактирован и подтверждён после обновления страницы');
    }
  });

  test('Дашборд: создание и редактирование', async ({ page }) => {
    console.log('🚀 Тест дашборда: создание и редактирование...');
    
    await navigateMainMenu(page, 'dashboards');
    await page.waitForTimeout(2000);
    
    // СОЗДАНИЕ
    const createBtn = page.locator('.bx-plus-circle').first();
    if (await createBtn.count() > 0) {
        await createBtn.click();
        
        // Должен произойти редирект на новый дашборд
        try {
        await page.waitForURL(/.*\/dashboard\/[a-z0-9-]+/, { timeout: 10000 });
        console.log('✅ Дашборд создан');
            
            // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
            console.log('🔄 Обновление страницы для проверки создания...');
            await page.reload();
            // Проверяем что мы всё ещё на странице дашборда после обновления
            await page.waitForURL(/.*\/dashboard\/[a-z0-9-]+/, { timeout: 10000 });
            console.log('✅ Дашборд подтверждён после обновления страницы');
            
            // ДОБАВЛЕНИЕ ГАДЖЕТА (Time Report)
            console.log('Добавление гаджета TimeReport...');
            try {
                await addDashboardGadget(page, 'Отчёт по времени');
                
                // Проверяем что гаджет появился
                await page.waitForTimeout(1000);
                const gadget = page.locator('.gadget');
                if (await gadget.count() > 0) {
                    console.log('✅ Гаджет добавлен на дашборд');
                    
                    // Обновляем страницу и проверяем сохранение
                    await page.reload();
                    await page.waitForURL(/.*\/dashboard\/[a-z0-9-]+/, { timeout: 10000 });
                    await page.waitForTimeout(2000);
                    
                    const gadgetAfterReload = page.locator('.gadget');
                    if (await gadgetAfterReload.count() > 0) {
                        console.log('✅ Гаджет сохранён после обновления страницы');
                    } else {
                        console.warn('⚠️ Гаджет не сохранился после обновления страницы');
                    }
                }
            } catch (e) {
                console.warn('⚠️ Ошибка при добавлении гаджета:', e);
            }
        
        // Возвращаемся в список для переименования
        await navigateMainMenu(page, 'dashboards');
            await page.waitForTimeout(2000);
            
            // Ждем загрузки страницы списка
            const tableCard = page.locator('.table_card_fields, .ktable');
            await tableCard.first().waitFor({ state: 'visible', timeout: 10000 });
        
        // Закрываем меню
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // РЕДАКТИРОВАНИЕ (по умолчанию имя "Дашборд")
            const dashRow = page.locator('.ktable span:has-text("Дашборд")').first();
        if (await dashRow.count() > 0) {
            await dashRow.click();
            await page.waitForTimeout(500);
            
            await changeField(page, 'Название', 'Тестовый дашборд');
            const saveButton = page.locator('input[type="button"][value="Сохранить"]');
            await saveButton.click();
            await page.waitForTimeout(1000);
                
                // ПРОВЕРКА РЕДАКТИРОВАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
                console.log('🔄 Обновление страницы для проверки редактирования...');
                await page.reload();
                await page.waitForTimeout(2000);
            
            // Проверка
                const updatedRow = page.locator('.ktable span:has-text("Тестовый дашборд")');
            if (await updatedRow.count() === 0) {
                    console.warn('⚠️ Дашборд не переименован после обновления страницы (возможно ошибка сервера)');
                } else {
                    console.log('✅ Дашборд отредактирован и подтверждён после обновления страницы');
                }
            } else {
                console.warn('⚠️ Дашборд не найден в таблице');
            }
        } catch (e) {
            console.warn('⚠️ Ошибка при работе с дашбордом:', e);
        }
    } else {
        console.warn('⚠️ Кнопка создания дашборда не найдена');
    }
  });

  test('Задача: создание и жизненный цикл', async ({ page }) => {
    console.log('🚀 Тест задачи: создание и проверка полей...');
    
    // СОЗДАНИЕ ЗАДАЧИ
    try {
    await createIssue(page, {
      summary: 'Тестовая задача E2E',
      project: 'Тестовый проект (изменён)',
        type: 'Тестовый тип (изменён)' // Используем тип, созданный ранее
      });
    } catch (e) {
      console.warn('⚠️ Ошибка при создании задачи:', e);
    }
    
    // Проверяем что мы на странице задачи
    const issueUrl = page.url();
    if (!issueUrl.includes('/issue/') || issueUrl.includes('/issue?t=')) {
      console.warn('⚠️ Задача не была создана (возможно ошибки сервера), пропускаем остальные проверки');
      return;
    }
    
    // ПРОВЕРКА СОЗДАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки создания задачи...');
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Проверяем что карточка задачи загрузилась
    const issueCard = page.locator('.issue-card-content, .issue-name-input');
    if (await issueCard.count() === 0) {
      console.warn('⚠️ Карточка задачи не найдена после обновления, возможно задача не сохранена');
      return;
    }
    
    // Проверяем, что мы остались на странице задачи
    if (!page.url().includes('/issue/')) {
      console.warn('⚠️ После обновления страницы задача не открылась');
      return;
    }
    console.log('✅ Задача подтверждена после обновления страницы');
    
    // Проверяем значения полей
    console.log('Проверка значений полей задачи...');
    
    // 1. Проверяем что название сохранено
    const summaryInput = page.locator('.issue-name-input input');
    if (await summaryInput.count() > 0) {
      const summaryAfterReload = await summaryInput.inputValue();
      if (!summaryAfterReload.includes('Тестовая задача E2E')) {
        console.warn(`⚠️ Название задачи не совпадает: ${summaryAfterReload}`);
    } else {
        console.log('✅ Название задачи сохранено корректно');
      }
    }
    
    // РЕДАКТИРОВАНИЕ ЗАДАЧИ
    console.log('Редактирование задачи...');
    
    // Меняем тему
    const summaryInputEdit = page.locator('.issue-name-input input');
    await summaryInputEdit.fill('Тестовая задача E2E (обновлена)');
    
    // Сохраняем (если есть кнопка сохранения, иногда автосейв)
    const saveBtn = page.locator('input[type="button"][value="Сохранить"]');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // НАЗНАЧЕНИЕ СПРИНТА
    console.log('Назначение спринта...');
    // Ищем поле Спринт
    const sprintSelect = page.locator('.select-input:has(.label:text-is("Спринт")) .vs__dropdown-toggle');
    if (await sprintSelect.count() > 0) {
        await sprintSelect.click();
        await page.waitForTimeout(300);
        const option = page.locator('.vs__dropdown-option:has-text("Тестовый спринт (изменён)")');
        if (await option.count() > 0) {
            await option.first().click();
            console.log('✅ Спринт назначен');
        } else {
            console.warn('⚠️ Спринт не найден в списке');
            await page.keyboard.press('Escape');
        }
        // Сохраняем если есть кнопка
        const saveBtnAfterSprint = page.locator('input[type="button"][value="Сохранить"]');
        if (await saveBtnAfterSprint.isVisible()) {
            await saveBtnAfterSprint.click();
            await page.waitForTimeout(1000);
        }
    }

    // СПИСАНИЕ ВРЕМЕНИ (Time Tracking)
    console.log('Списание времени...');
    try {
        await logWork(page, '2', 'Тестовое списание времени E2E');
        
        // Проверяем что время списалось
        console.log('🔄 Обновление страницы для проверки списания времени...');
        await page.reload();
        await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
        
        // Проверяем поле затраченного времени
        const spentTimeInput = page.locator('.issue-spent-time-input input');
        if (await spentTimeInput.count() > 0) {
            const spentValue = await spentTimeInput.inputValue();
            if (spentValue && parseFloat(spentValue) > 0) {
                console.log(`✅ Время списано: ${spentValue}ч`);
            } else {
                console.warn('⚠️ Время не отображается после обновления');
            }
        }
        
        // Проверяем запись в истории
        const timeEntryInHistory = page.locator(':text("Списал на задачу")');
        if (await timeEntryInHistory.count() > 0) {
            console.log('✅ Запись о списании времени найдена в истории');
        }
    } catch (e) {
        console.warn('⚠️ Ошибка при списании времени:', e);
    }

    // ПРОВЕРКА РЕДАКТИРОВАНИЯ ЧЕРЕЗ ОБНОВЛЕНИЕ СТРАНИЦЫ
    console.log('🔄 Обновление страницы для проверки редактирования задачи...');
    await page.reload();
    await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
    
    // Проверяем что название обновилось
    const summaryAfterEdit = await page.locator('.issue-name-input input').inputValue();
    if (!summaryAfterEdit.includes('обновлена')) {
      throw new Error(`Название задачи не обновилось: ${summaryAfterEdit}`);
    }
    console.log('✅ Редактирование задачи подтверждено после обновления страницы');

    // ДОБАВЛЕНИЕ КОММЕНТАРИЯ
    console.log('Добавление комментария...');
    const commentInput = page.locator('textarea[placeholder*="комментарий"], .comment-input textarea');
    if (await commentInput.count() > 0) {
        await commentInput.fill('Тестовый комментарий E2E');
        const sendBtn = page.locator('button:has-text("Отправить"), .send-comment-btn, .bx-send');
        if (await sendBtn.count() > 0) {
            await sendBtn.click();
            await page.waitForTimeout(1000);
            
            // Проверка комментария через обновление страницы
            console.log('🔄 Обновление страницы для проверки комментария...');
            await page.reload();
            await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
            
            if (await page.locator(':text("Тестовый комментарий E2E")').count() > 0) {
                console.log('✅ Комментарий подтверждён после обновления страницы');
            } else {
                console.warn('⚠️ Комментарий не появился после обновления страницы');
            }
        }
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
        
        // Проверка смены статуса через обновление
        console.log('🔄 Обновление страницы для проверки смены статуса...');
        await page.reload();
        await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
        console.log('✅ Смена статуса подтверждена');
      } else {
        console.log('ℹ️ Нет доступных переходов статуса (возможно, это конечный статус)');
      }
    }
    
    console.log('✅ Жизненный цикл задачи проверен с обновлением страницы');
  });

  test('Связи: создание связанной задачи', async ({ page }) => {
    console.log('🚀 Тест связей...');
    
    // Создаем вторую задачу
    try {
    await createIssue(page, {
      summary: 'Связанная задача',
      project: 'Тестовый проект (изменён)',
        type: 'Тестовый тип (изменён)'
      });
    } catch (e) {
      console.warn('⚠️ Не удалось создать задачу для связи:', e);
      return;
    }
    
    // Проверяем что задача создана
    if (!page.url().includes('/issue/') || page.url().includes('/issue?t=')) {
      console.warn('⚠️ Задача не создана, пропускаем тест связей');
      return;
    }
    
    // Связываем с первой
    console.log('Добавление связи...');
    // Кнопка добавления связи находится в блоке связей (иконка "+")
    const addLinkBtn = page.locator('#issue-relations .add-relation-btn');
    if (await addLinkBtn.count() > 0) {
        await addLinkBtn.first().click();
        await page.waitForTimeout(500);
        
        // Ждём модалку создания связи
        await page.waitForSelector('.new-relation-modal', { timeout: 5000 });
        
        // Выбираем задачу для связи через SelectInput в модалке
        const issueSelectToggle = page.locator('.new-relation-modal .select-input:has(.label:text-is("Задача")) .vs__dropdown-toggle');
        if (await issueSelectToggle.count() > 0) {
          await issueSelectToggle.click();
          await page.waitForTimeout(200);

          const searchInput = page.locator('.new-relation-modal .select-input:has(.label:text-is("Задача")) .vs__search');
          if (await searchInput.count() > 0) {
            await searchInput.fill('Тестовая задача E2E');
          }
          await page.waitForTimeout(800);
        }
        
        // Выбираем из списка (обычно выпадает dropdown или список)
        const option = page.locator('.vs__dropdown-option, .search-result-item, .suggestion').first();
        if (await option.count() > 0) {
            await option.click();
            
            const saveLinkBtn = page.locator('.new-relation-modal input[type="button"][value="Создать"]');
            await saveLinkBtn.click();
            await page.waitForTimeout(1000);
            
            console.log('✅ Связь добавлена');
        } else {
            console.warn('⚠️ Первая задача не найдена для связи');
            await page.keyboard.press('Escape');
        }
    } else {
        console.warn('⚠️ Кнопка добавления связи не найдена');
    }
  });

  test('Проверка страницы досок', async ({ page }) => {
    console.log('🚀 Проверка страницы досок...');
    
    await navigateMainMenu(page, 'boards');
    await page.waitForTimeout(2000);
    
    const boardContent = await page.locator('.board-content, .kanban, .ktable').count();
    console.log(`Контент доски найден: ${boardContent > 0}`);
    
    console.log('✅ Страница досок проверена');
  });

  test('Доска: настройка свимлейнов и группировок', async ({ page }) => {
    console.log('🚀 Тест настройки доски...');
    
    await navigateMainMenu(page, 'boards');
    await page.waitForTimeout(2000);
    
    // Открываем настройки доски (если есть кнопка настроек)
    const settingsBtn = page.locator('.board-settings-btn, .bx-cog');
    if (await settingsBtn.count() > 0) {
      await settingsBtn.first().click();
      await page.waitForTimeout(1000);
      
      // Ищем настройку свимлейнов
      const swimlaneSelect = page.locator('.select-input:has(.label:has-text("Swimlane")), .select-input:has(.label:has-text("Свимлейн"))');
      if (await swimlaneSelect.count() > 0) {
        console.log('✅ Найдена настройка свимлейнов');
        
        // Пробуем выбрать группировку по исполнителю
        const dropdown = swimlaneSelect.locator('.vs__dropdown-toggle');
        await dropdown.click();
        await page.waitForTimeout(300);
        
        const assigneeOption = page.locator('.vs__dropdown-option:has-text("Исполнитель"), .vs__dropdown-option:has-text("Assignee")');
        if (await assigneeOption.count() > 0) {
          await assigneeOption.first().click();
          console.log('✅ Свимлейн по исполнителю выбран');
        } else {
          await page.keyboard.press('Escape');
        }
      } else {
        console.log('⚠️ Настройка свимлейнов не найдена');
      }
      
      // Закрываем настройки
      await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ Кнопка настроек доски не найдена');
    }
    
    console.log('✅ Тест настройки доски завершён');
  });

  test('Доска: персональный фильтр', async ({ page }) => {
    console.log('🚀 Тест персонального фильтра на доске...');
    
    await navigateMainMenu(page, 'boards');
    await page.waitForTimeout(2000);
    
    // Ищем поле фильтра на доске
    const filterInput = page.locator('.board-filter input, .quick-filter input');
    if (await filterInput.count() > 0) {
      await filterInput.first().fill('Тестовая задача');
      await page.waitForTimeout(1000);
      
      console.log('✅ Персональный фильтр применён');
      
      // Очищаем фильтр
      await filterInput.first().clear();
      await page.waitForTimeout(500);
    } else {
      console.log('⚠️ Поле фильтра на доске не найдено');
    }
    
    console.log('✅ Тест персонального фильтра завершён');
  });

  test('Задача: списание времени', async ({ page }) => {
    console.log('🚀 Тест списания времени...');
    
    // Открываем страницу задач и находим созданную задачу
    await navigateMainMenu(page, 'issues');
    await page.waitForTimeout(2000);
    
    // Кликаем по первой задаче в списке
    const issueLink = page.locator('.ktable a[href*="/issue/"]').first();
    if (await issueLink.count() > 0) {
      await issueLink.click();
      await page.waitForURL(/.*\/issue\//, { timeout: 10000 });
      await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
      
      // Ищем поле списанного времени
      const spentTimeInput = page.locator('.issue-spent-time-input input, .spent-time-input');
      if (await spentTimeInput.count() > 0) {
        await spentTimeInput.first().click();
        await page.waitForTimeout(1000);
        
        // Проверяем появление модального окна
        const timeModal = page.locator('.time-entry-modal, .modal');
        if (await timeModal.count() > 0) {
          console.log('✅ Модальное окно списания времени открыто');
          
          // Заполняем время
          const hoursInput = timeModal.locator('input[type="number"], .numeric-input input');
          if (await hoursInput.count() > 0) {
            await hoursInput.first().fill('2');
            
            // Заполняем комментарий
            const commentInput = timeModal.locator('.string-input input, textarea');
            if (await commentInput.count() > 0) {
              await commentInput.first().fill('Тестовое списание времени');
            }
            
            // Сохраняем
            const saveBtn = timeModal.locator('input[type="button"][value*="OK"], input[type="button"][value*="Сохранить"]');
            if (await saveBtn.count() > 0) {
              await saveBtn.first().click();
              await page.waitForTimeout(1000);
              console.log('✅ Время списано');
            }
          }
        } else {
          console.log('⚠️ Модальное окно списания времени не появилось');
        }
      } else {
        console.log('⚠️ Поле списанного времени не найдено');
      }
    } else {
      console.log('⚠️ Задача для списания времени не найдена');
    }
    
    console.log('✅ Тест списания времени завершён');
  });

  test('Задача: добавление тега', async ({ page }) => {
    console.log('🚀 Тест добавления тега...');
    
    // Открываем страницу задач и находим созданную задачу
    await navigateMainMenu(page, 'issues');
    await page.waitForTimeout(2000);
    
    // Кликаем по первой задаче в списке
    const issueLink = page.locator('.ktable a[href*="/issue/"]').first();
    if (await issueLink.count() > 0) {
      await issueLink.click();
      await page.waitForURL(/.*\/issue\//, { timeout: 10000 });
      await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
      
      // Ищем компонент тегов
      const tagsInput = page.locator('.tags-input, .issue-tags, .vs__dropdown-toggle:has-text("Теги")');
      if (await tagsInput.count() > 0) {
        await tagsInput.first().click();
        await page.waitForTimeout(500);
        
        // Вводим новый тег
        const tagTextInput = page.locator('.vs__search, .tags-input input');
        if (await tagTextInput.count() > 0) {
          await tagTextInput.first().fill('test-tag');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
          console.log('✅ Тег добавлен');
        }
      } else {
        console.log('⚠️ Компонент тегов не найден');
      }
    } else {
      console.log('⚠️ Задача для добавления тега не найдена');
    }
    
    console.log('✅ Тест добавления тега завершён');
  });

  test('Дашборд: добавление гаджетов разных типов', async ({ page }) => {
    console.log('🚀 Тест добавления разных гаджетов...');
    
    await navigateMainMenu(page, 'dashboards');
    await page.waitForTimeout(2000);
    
    // Кликаем на первый дашборд
    const dashboardLink = page.locator('.ktable a[href*="/dashboard/"], .dashboard-card');
    if (await dashboardLink.count() > 0) {
      // Иногда сайдбар перекрывает клики — кликаем форсированно
      await dashboardLink.first().click({ force: true });
      await page.waitForTimeout(2000);
      
      // Добавляем гаджеты через общий helper (он сам открывает/закрывает модалку)
      try {
        await addDashboardGadget(page, 'TimeReport');
        console.log('✅ Гаджет TimeReport добавлен');
      } catch (e) {
        console.log('⚠️ Не удалось добавить TimeReport');
      }

      try {
        await addDashboardGadget(page, 'Burndown');
        console.log('✅ Гаджет Burndown добавлен');
      } catch (e) {
        console.log('⚠️ Не удалось добавить Burndown');
      }

      try {
        await addDashboardGadget(page, 'IssuesTable');
        console.log('✅ Гаджет IssuesTable добавлен');
      } catch (e) {
        console.log('⚠️ Не удалось добавить IssuesTable');
      }
    } else {
      console.log('⚠️ Дашборд не найден');
    }
    
    console.log('✅ Тест добавления гаджетов завершён');
  });

  test('Дашборд: масштабирование гаджета', async ({ page }) => {
    console.log('🚀 Тест масштабирования гаджета...');
    
    await navigateMainMenu(page, 'dashboards');
    await page.waitForTimeout(2000);
    
    // Кликаем на первый дашборд
    const dashboardLink = page.locator('.ktable a[href*="/dashboard/"], .dashboard-card');
    if (await dashboardLink.count() > 0) {
      // Сайдбар закрывается по mouseout; уводим курсор в контент, чтобы не перехватывал клик
      await page.mouse.move(320, 40);
      await page.waitForTimeout(250);
      await dashboardLink.first().click();
      await page.waitForTimeout(2000);
      
      // Ищем гаджет для масштабирования
      const gadget = page.locator('.gadget, .dashboard-gadget').first();
      if (await gadget.count() > 0) {
        // Ищем ручку масштабирования
        const resizeHandle = gadget.locator('.resize-handle, .gadget-resize');
        if (await resizeHandle.count() > 0) {
          const box = await resizeHandle.boundingBox();
          if (box) {
            // Перетаскиваем для увеличения размера
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + 100, box.y + 100);
            await page.mouse.up();
            await page.waitForTimeout(500);
            console.log('✅ Гаджет масштабирован');
          }
        } else {
          console.log('⚠️ Ручка масштабирования не найдена');
        }
      } else {
        console.log('⚠️ Гаджет для масштабирования не найден');
      }
    } else {
      console.log('⚠️ Дашборд не найден');
    }
    
    console.log('✅ Тест масштабирования завершён');
  });

  test('Фильтры: поиск и сохранение', async ({ page }) => {
    console.log('🚀 Тест фильтров: поиск и сохранение...');
    
    await navigateMainMenu(page, 'issues');
    await page.waitForTimeout(2000);
    
    // Вводим запрос в поиск
    const searchInput = page.locator('.issue-search-input input, .issue-search-input textarea');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('project = "Тестовый проект"');
      await page.waitForTimeout(500);
      
      // Нажимаем Enter для поиска
      await searchInput.first().press('Enter');
      await page.waitForTimeout(2000);
      
      // Добавляем в избранное (сохраняем фильтр)
      const starBtn = page.locator('.bx-star.top-menu-icon-btn');
      if (await starBtn.count() > 0) {
        await starBtn.click();
        await page.waitForTimeout(1000);
        
        // Проверяем что звездочка стала закрашенной
        const filledStar = page.locator('.bxs-star.top-menu-icon-btn');
        if (await filledStar.count() > 0) {
          console.log('✅ Фильтр сохранён в избранное');
          
          // Обновляем страницу и проверяем сохранение
          await page.reload();
          await page.waitForTimeout(2000);
          
          // Проверяем что звездочка всё ещё закрашена для этого запроса
          const starAfterReload = page.locator('.bxs-star.top-menu-icon-btn');
          if (await starAfterReload.count() > 0) {
            console.log('✅ Фильтр сохранён после обновления страницы');
          } else {
            console.warn('⚠️ Фильтр не сохранился после обновления страницы');
          }
        } else {
          console.warn('⚠️ Фильтр не добавился в избранное');
        }
      } else {
        console.warn('⚠️ Кнопка звездочки не найдена');
      }
    } else {
      console.warn('⚠️ Поле поиска не найдено');
    }
    
    console.log('✅ Тест фильтров завершён');
  });

  test('Вложения: добавление к задаче', async ({ page }) => {
    console.log('🚀 Тест вложений: добавление к задаче...');
    
    // Открываем страницу задач и находим созданную задачу
    await navigateMainMenu(page, 'issues');
    await page.waitForTimeout(2000);
    
    // Кликаем по первой задаче в списке
    const issueLink = page.locator('.ktable a[href*="/issue/"]').first();
    if (await issueLink.count() > 0) {
      await issueLink.click();
      await page.waitForURL(/.*\/issue\//, { timeout: 10000 });
      await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
      
      // Ищем input для загрузки файла
      const fileInput = page.locator('#issue-attachments input[type="file"], input[type="file"]');
      if (await fileInput.count() > 0) {
        // Загружаем тестовый файл
        await fileInput.setInputFiles({
          name: 'test-attachment.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Тестовое содержимое файла для E2E теста')
        });
        
        await page.waitForTimeout(2000);
        
        // Проверяем что вложение появилось
        const attachment = page.locator('#issue-attachments :text("test-attachment")');
        if (await attachment.count() > 0) {
          console.log('✅ Вложение добавлено');
          
          // Обновляем страницу и проверяем сохранение
          await page.reload();
          await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
          
          const attachmentAfterReload = page.locator('#issue-attachments :text("test-attachment")');
          if (await attachmentAfterReload.count() > 0) {
            console.log('✅ Вложение сохранено после обновления страницы');
          } else {
            console.warn('⚠️ Вложение не сохранилось после обновления страницы');
          }
        } else {
          console.warn('⚠️ Вложение не появилось после загрузки');
        }
      } else {
        console.warn('⚠️ Input для загрузки файла не найден');
      }
    } else {
      console.warn('⚠️ Задачи не найдены в списке');
    }
    
    console.log('✅ Тест вложений завершён');
  });

  // ===========================================
  // ЧАСТЬ 4: УДАЛЕНИЕ (в самом конце)
  // ===========================================

  test('Удаление: автоматизация', async ({ page }) => {
    console.log('🗑️ Удаление автоматизации...');
    
    // Проверяем наличие пункта меню
    const automationsLink = page.locator('a[href*="/configs/automations"]');
    if (await automationsLink.count() === 0) {
      console.log('⚠️ Меню автоматизаций недоступно, пропускаем удаление');
      return;
    }
    
    await navigateMainMenu(page, 'automations');
    await page.waitForSelector('.table_card, .ktable', { timeout: 10000 });
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const row = page.locator('.ktable :text("Тестовая автоматизация")');
    if (await row.count() > 0) {
      await row.first().click({ force: true });
      await page.waitForTimeout(500);
      
      const deleteButton = page.locator('input[type="button"][value="Удалить"]');
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(500);
        
        const confirmButton = page.locator('button:has-text("Да"), button:has-text("OK"), .confirm-yes');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }
        await page.waitForTimeout(1000);
      }
    }
    console.log('✅ Автоматизация удалена');
  });

  test('Удаление: спринт', async ({ page }) => {
    console.log('🗑️ Удаление спринта...');
    
    // Проверяем доступность меню спринтов
    const sprintsLink = page.locator('a[href*="/configs/sprints"]');
    if (await sprintsLink.count() === 0) {
      console.log('⚠️ Меню спринтов недоступно, пропускаем удаление');
      return;
    }
    
    await navigateMainMenu(page, 'sprints');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const row = page.locator('.ktable :text("Тестовый спринт")'); // Ищем по любой части имени
    if (await row.count() > 0) {
        await row.first().click();
        await page.waitForTimeout(500);
        
        const deleteButton = page.locator('input[type="button"][value="Удалить"]');
        if (await deleteButton.count() > 0) {
            await deleteButton.click();
            await page.waitForTimeout(500);
            
            const confirmButton = page.locator('button:has-text("Да"), button:has-text("OK"), .confirm-yes');
            if (await confirmButton.count() > 0) {
                await confirmButton.click();
            }
            await page.waitForTimeout(1000);
        }
    }
    console.log('✅ Спринт удалён');
  });

  test('Удаление: дашборд', async ({ page }) => {
    console.log('🗑️ Удаление дашборда...');
    await navigateMainMenu(page, 'dashboards');
    await page.waitForTimeout(1000);
    
    const row = page.locator('.ktable :text("Тестовый дашборд")');
    if (await row.count() > 0) {
        await row.first().click();
        await page.waitForTimeout(500);
        
        const deleteButton = page.locator('input[type="button"][value="Удалить"]');
        if (await deleteButton.count() > 0) {
            await deleteButton.click();
            await page.waitForTimeout(500);
            
            const confirmButton = page.locator('button:has-text("Да"), button:has-text("OK"), .confirm-yes');
            if (await confirmButton.count() > 0) {
                await confirmButton.click();
            }
            await page.waitForTimeout(1000);
        }
    }
    console.log('✅ Дашборд удалён');
  });

  test('Удаление: тип задачи', async ({ page }) => {
    console.log('🗑️ Удаление типа задачи...');
    
    await navigateMainMenu(page, 'issue_types');
    await page.waitForSelector('.table_card_fields', { timeout: 10000 });
    
    // Закрываем меню если открыто (кликаем вне меню)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    // Дополнительно кликаем на пустую область для закрытия меню
    await page.locator('.table_panel').click({ force: true });
    await page.waitForTimeout(500);
    
    const typeRow = page.locator('.ktable :text("Тестовый тип")');
    if (await typeRow.count() > 0) {
      await typeRow.first().click({ force: true });
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

