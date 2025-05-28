import { test, expect } from '@playwright/test';
import { 
  sendWorkspaceRegister, 
  waitRegisterMail, 
  signIn, 
  signOut, 
  navigateMainMenu, 
  createUser,
  createWorkflow
} from '../helpers';

test.describe('Unkaos E2E Tests', () => {
  test('1. Регистрация workspace', async ({ page }) => {
    const workspace = 'testworkspace';
    const adminEmail = 'admin@example.com';
    
    await sendWorkspaceRegister(page, workspace, adminEmail);
    await waitRegisterMail(page);
  });

  test('2. Создание пользователя', async ({ page }) => {
    const email = 'admin@example.com';
    const password = 'admin123';
    
    await signIn(page, email, password);
    await createUser(page, 'Тестовый Пользователь', 'testuser', 'testuser@example.com');
    await signOut(page);
  });

  test('3. Создание воркфлоу', async ({ page }) => {
    const email = 'admin@example.com';
    const password = 'admin123';
    
    await signIn(page, email, password);
    await navigateMainMenu(page, 'Воркфлоу');
    await createWorkflow(page, 'Тестовый воркфлоу');
    await signOut(page);
  });
}); 