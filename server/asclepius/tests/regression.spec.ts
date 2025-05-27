import { test } from '@playwright/test';
import { getEmailFromTempMail, getIframeBody, waitRegisterMail, sendWorkspaceRegister, signIn, signOut, navigateMainMenu, changeField, createUser, createProject, createIssueField, createIssueStatus, createIssueType } from '../helpers';
import {  createWorkflow } from '../helpers_workflow';

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
  const baseUrl = 'https://localhost:3000';

  test.beforeEach(async ({ page }) => {
    console.log('🔄 BeforeEach: state =', state);
    
    if (!state) {
      console.log('⏭️ Пропускаем beforeEach для state = 0');
      return;
    }

    const loginUrl = `${baseUrl}/${workspace}/login`;
    console.log('🌐 Переходим на:', loginUrl);
    
    try {
      await page.goto(loginUrl);
      console.log('⏳ Ждем появления панели логина...');
      await page.waitForSelector('.login-panel', { timeout: 10000 });
      
      if (state == 1) {
        console.log('👤 Логинимся как админ:', adminEmail, newPass);
        await signIn(page, adminEmail, newPass);
      } else if (state == 2) {
        console.log('👤 Логинимся как пользователь:', usereMail, newPass);
        await signIn(page, usereMail, newPass);
      }
      
      console.log('⏳ Ждем загрузки профиля...');
      await page.waitForSelector('.profile', { timeout: 10000 });
      console.log('⏳ Ждем загрузки главного меню...');
      await page.waitForSelector('.main-menu-list', { timeout: 10000 });
      console.log('✅ BeforeEach завершен успешно');
      
    } catch (error) {
      console.error('❌ Ошибка в beforeEach:', error);
      throw error;
    }
  });

  test('Регистрация рабочего пространства и смена пароля', async ({ page }) => {
    console.log('🚀 Начинаем тест регистрации...');
    
    try {
      // Создаем временный email
      console.log('📧 Создаем временный email...');
      adminEmail = await getEmailFromTempMail();
      console.log('📧 Получен email:', adminEmail);

      // Регистрируем workspace
      console.log('🏢 Регистрируем workspace:', workspace);
      await sendWorkspaceRegister(page, workspace, adminEmail);
      
      // Ждем письмо
      console.log('📬 Ждем письмо активации...');
      await waitRegisterMail(page);

      // Получаем данные активации
      console.log('🔗 Получаем ссылку активации...');
      const activationLink = await getIframeBody(page);
      const pass = await activationLink.locator().innerText();
      const link = activationLink.getAttribute('href');
      
      if (!link) throw new Error('Activation link not found');
      if (!pass) throw new Error('Activation password not found');
      console.log('🔗 Ссылка активации:', link);
      console.log('🔑 Временный пароль:', pass);

      // Переходим по ссылке активации
      const activationUrl = link.replace('https://unkaos.ru', baseUrl);
      console.log('🌐 Переходим по ссылке активации:', activationUrl);
      await page.goto(activationUrl);
      
      // Ждем завершения активации - может быть редирект или обработка
      console.log('⏳ Ждем завершения активации...');
      await page.waitForTimeout(5000);
      
      // Ждем панель логина
      console.log('⏳ Ждем панель логина...');
      await page.waitForSelector('.login-panel', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Логинимся с временным паролем
      console.log('🔐 Логинимся с временным паролем...');
      await signIn(page, adminEmail, pass);

      // Отладка: проверяем текущий URL и элементы на странице
      console.log('🔍 Текущий URL после логина:', page.url());
      
      // Проверяем наличие различных элементов
      const profileExists = await page.locator('.profile').count();
      const menuExists = await page.locator('.main-menu-list').count();
      const loginPanelExists = await page.locator('.login-panel').count();
      
      console.log('🔍 Элементы на странице:');
      console.log('  - .profile:', profileExists);
      console.log('  - .main-menu-list:', menuExists);
      console.log('  - .login-panel:', loginPanelExists);
      
      // Если профиль не найден, попробуем подождать дольше
      if (profileExists === 0) {
        console.log('⏳ Профиль не найден, ждем дольше...');
        await page.waitForTimeout(5000);
        
        // Проверяем снова
        const profileExists2 = await page.locator('.profile').count();
        console.log('🔍 Профиль после ожидания:', profileExists2);
        
        if (profileExists2 === 0) {
          // Делаем скриншот для отладки
          await page.screenshot({ path: 'debug-after-login.png', fullPage: true });
          console.log('📸 Скриншот сохранен: debug-after-login.png');
        }
      }

      // Ждем загрузки профиля
      console.log('⏳ Ждем загрузки профиля...');
      await page.waitForSelector('.profile', { timeout: 10000 });
      
      // Переходим к настройкам пользователей
      console.log('⚙️ Переходим к настройкам пользователей...');
      await page.goto(`/${workspace}/configs/users`);
      await page.waitForSelector('.ktable .user', { timeout: 10000 });
      
      // Меняем ФИО и пароль
      console.log('✏️ Меняем ФИО администратора...');
      await changeField(page, 'ФИО', adminName, adminEmail);
      
      console.log('🔑 Меняем пароль администратора...');
      await changeField(page, 'Пароль', newPass, adminEmail);
      
      await page.waitForSelector('.profile', { timeout: 10000 });
      await page.waitForTimeout(1000);
      
      // Проверяем новый пароль
      console.log('🚪 Выходим из системы...');
      await signOut(page);
      
      console.log('🔐 Логинимся с новым паролем...');
      await signIn(page, adminEmail, newPass);
      
      console.log('🚪 Выходим из системы...');
      await signOut(page);

      state = 1;
      console.log('✅ Тест регистрации завершен успешно');
      
    } catch (error) {
      console.error('❌ Ошибка в тесте регистрации:', error);
      throw error;
    }
  });

  test('Создание пользователя', async ({ page }) => {
    console.log('🚀 Начинаем тест создания пользователя...');
    
    try {
      console.log('👥 Переходим к пользователям...');
      await navigateMainMenu(page, 'users');
      
      console.log('⏳ Ждем загрузки таблицы...');
      await page.waitForSelector('.table_card_fields', { timeout: 10000 });
      
      console.log('👤 Создаем пользователя:', userName);
      await createUser(page, userName, userLogin, usereMail);
      
      console.log('✅ Тест создания пользователя завершен успешно');
      
    } catch (error) {
      console.error('❌ Ошибка в тесте создания пользователя:', error);
      throw error;
    }
  });

  test('Создание воркфлоу', async ({ page }) => {
    console.log('🚀 Начинаем тест создания воркфлоу...');
    
    try {
      console.log('🔄 Переходим к воркфлоу...');
      await navigateMainMenu(page, 'workflows');
      
      console.log('⚙️ Создаем воркфлоу...');
      await createWorkflow(page, 'Тестовый', ['Новая', 'В работе']);
      
      console.log('✅ Тест создания воркфлоу завершен успешно');
      
    } catch (error) {
      console.error('❌ Ошибка в тесте создания воркфлоу:', error);
      throw error;
    }
  });

  /*
  test('Создание типа задачи', async ({ page }) => {
    await navigateMainMenu(page, 'issue_types');
    await createIssueType(page, 'Сторя', 'Простой', ['Приоритет', 'Ответственный']);
  });*/
});
