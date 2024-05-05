// https://docs.cypress.io/api/introduction/api.html



function sendWorkspaceRegister(workspace: string, adminEmail: string) {
  cy.visit('https://unkaos.tech/');
  cy.contains('a', 'Регистрация рабочего пространства').click();
  cy.get('.register-panel').should('be.visible');
  cy.get('input.string-input').eq(0).type(workspace);
  cy.get('input.string-input').eq(1).type(adminEmail);
  cy.get('.btn_input').should('be.visible').click();

  cy.contains('span.workspace-register-ok', 'Заявка зарегистрирована', { timeout: 10000 }).should('be.visible')
}

function signIn(email: string, pass: string) {
  cy.get('.login-panel', { timeout: 5000 }).should('be.visible');
  cy.get('input.string-input').eq(0).type(email);
  cy.get('input.string-input').eq(1).type(pass);
  cy.get('input.btn_input').click();
}

function signOut() {
  cy.get('.profile-top img').click();
  cy.get('#profile-menu-exit').should('be.visible').click();
}

function navigateMainMenu(page: string) {
  cy.get(`a[href*="/${page}"]`).click();
}

function changeUserField(email: string,fieldName: string, value: string) {
  cy.contains('span', email).click();
  cy.contains('.label', fieldName).siblings('input.string-input').clear().type(value);
  cy.get('input[type="button"][value="Сохранить"]').click();
}

function createUser(name: string, login: string, email: string) {
  cy.get('input[type="button"][value="Создать"]').click();
  cy.contains('.label', 'ФИО').siblings('input.string-input').clear().type(name);
  cy.contains('.label', 'Логин').siblings('input.string-input').clear().type(login);
  cy.contains('.label', 'Адрес почты').siblings('input.string-input').clear().type(email);
  cy.get('input[type="button"][value="Сохранить"]').click();
}

function changeField(key: string,fieldName: string, value: string) {
  cy.contains('span', key).click();
  cy.contains('.label', fieldName).siblings('input.string-input').clear().type(value);
  cy.get('input[type="button"][value="Сохранить"]').click();
}

function createProject(name: string, code: string, email: string) {
  cy.get('input[type="button"][value="Создать"]').click();

  cy.get('input[type="button"][value="Сохранить"]').click();
}



describe('Регресионный тест', () => {
  const startTime = new Date().getTime();
  const workspace: string = 'test' + startTime;

  const newPass: string = 'pass' + startTime;

  let adminEmail: string;
  const adminName = 'Марк Захаров'

  const usereMail: string = 'testuser@unkaos.org';
  const userLogin: string = 'spetrov'
  const userName =  'Сергей Петров'

  before(() => {
    cy.viewport(1920, 1080);

    cy.getEmailFromTempMail().then((tempEmail: any) => {
      adminEmail = tempEmail;

      sendWorkspaceRegister(workspace, adminEmail);

      cy.waitRegisterMail();
      
      cy.getIframeBody().find('strong').then(($str: any) => {
      
        let pass = $str.text();
        cy.getIframeBody().find('a').then(($a: any) => {
          let link = $a.attr('href');
          cy.visit(link);
          signIn(adminEmail, pass);
        });
      });  
    });
  });

  it('Основные функции системы', () => {

    changeField(adminEmail, 'Пароль', newPass);
    signOut();
    signIn(adminEmail, newPass);
    changeField(adminEmail, 'ФИО', adminName);
    createUser(userName, userLogin, usereMail);

    navigateMainMenu('projects');

    changeField('BS', 'Название', 'Проект 1');
   // createProject('Проект 1', userLogin, usereMail);

  })
});


