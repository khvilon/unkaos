import { Page } from '@playwright/test';

export async function moveStatusNode(page: Page, name: string, x: number, y: number) {
  // В D3 мы фиксируем позицию ноды через fx и fy
  await page.evaluate(({ name, x, y }) => {
    const nodes = document.querySelectorAll('.conceptG text');
    let targetNode = null;
    
    // Ищем ноду с нужным текстом
    for (const node of nodes) {
      if (node.textContent?.trim() === name) {
        targetNode = node;
        break;
      }
    }

    if (targetNode) {
      const parentG = targetNode.closest('.conceptG');
      if (parentG) {
        const d3Node = (parentG as any).__data__;
        d3Node.fx = x;
        d3Node.fy = y;
      }
    }
  }, { name, x, y });
  
  await page.waitForTimeout(500); // Ждем обновления позиции
}

export async function createWorkflow(page: Page, name: string, statuses: string[]) {
  console.log('Creating workflow:', name, 'with statuses:', statuses);

  // Нажимаем кнопку создания в топбаре
  console.log('Clicking create button');
  await page.click('.topbar .btn_input');
  await page.waitForTimeout(1000);
  
  // Заполняем название на вкладке основное
  console.log('Filling workflow name:', name);
  await page.fill('.table_card_fields .string-input', name);
  await page.waitForTimeout(1000);
  
  // Переходим на вкладку схема
  console.log('Switching to Schema tab');
  await page.click('.tabs__header li:has-text("Схема")');
  await page.waitForTimeout(1000);
  
  // Добавляем первый статус
  console.log('Adding first status:', statuses[0]);
  await page.click('.table-statuses tbody tr td span:has-text("' + statuses[0] + '")');
  await page.waitForTimeout(1000);
  console.log('Clicking add status button');
  await page.click('#add-status-to-graph');
  await page.waitForTimeout(2000);

  // Находим и перемещаем первый узел
  console.log('Moving first node to position 200,200');
  await moveStatusNode(page, statuses[0], 200, 200);
  await page.waitForTimeout(1000);
  
  // Добавляем второй статус
  console.log('Adding second status:', statuses[1]);
  await page.click('.table-statuses tbody tr td span:has-text("' + statuses[1] + '")');
  await page.waitForTimeout(1000);
  await page.click('#add-status-to-graph');
  await page.waitForTimeout(2000);

  // Перемещаем второй узел
  console.log('Moving second node to position 400,200');
  await moveStatusNode(page, statuses[1], 400, 200);
  await page.waitForTimeout(1000);

  // Включаем режим создания переходов
  console.log('Enabling transition creation mode');
  await page.click('.workflows-command-panel .boolean-input');
  await page.waitForTimeout(1000);

  // Создаем связь между узлами
  console.log('Creating link between nodes');
  
  // В D3 мы используем drag для создания связей
  const node1 = page.locator('.conceptG').filter({ has: page.locator(`text=${statuses[0]}`) });
  const node2 = page.locator('.conceptG').filter({ has: page.locator(`text=${statuses[1]}`) });
  
  // Начинаем перетаскивание от первой ноды
  const node1Box = await node1.boundingBox();
  if (!node1Box) throw new Error('First node not found');
  
  await page.mouse.move(
    node1Box.x + node1Box.width/2,
    node1Box.y + node1Box.height/2
  );
  await page.mouse.down();
  
  // Перетаскиваем ко второй ноде
  const node2Box = await node2.boundingBox();
  if (!node2Box) throw new Error('Second node not found');
  
  await page.mouse.move(
    node2Box.x + node2Box.width/2,
    node2Box.y + node2Box.height/2,
    { steps: 50 }
  );
  
  // Отпускаем на второй ноде
  await page.mouse.up();
  await page.waitForTimeout(1000);

  // Проверяем создание связи
  await page.locator('.link:not(.dragline)').waitFor({ state: 'visible' });
  console.log('Link created successfully');

  // Сохраняем воркфлоу
  console.log('Saving workflow');
  await page.click('.table_card_footer .btn_input[value="Создать"]');
  
  // Ждем появления названия в таблице слева
  console.log('Waiting for workflow to appear in table');
  await page.locator(`.ktable tbody tr td span:has-text("${name}")`).waitFor({ state: 'visible' });
  console.log('Workflow creation completed');
}
