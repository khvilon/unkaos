// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })


Cypress.Commands.add('getEmailFromTempMail', function() {
    cy.origin('https://tempmail.lol/', () => {
      cy.visit('/');
      cy.get('#email_field', { timeout: 15000 }) // Adjust timeout as necessary
        .should($el => {
          // This assertion will retry until it passes or the timeout is reached
          expect($el.val()).not.to.be.empty;
        })
        .invoke('val')
      });
  });
  
  Cypress.Commands.add('getIframeBody', function()  {
    return cy
    .get('iframe[id="email_iframe"]')
    .its('0.contentDocument.body').should('not.be.empty')
    .then(cy.wrap)
  })
  
  Cypress.Commands.add('waitRegisterMail', function() {
    cy.origin('https://tempmail.lol', () => {
      cy.visit('/');
      cy.get('tr[style="cursor: pointer;"]', { timeout: 60000 })  // Wait up to 10 seconds
        .should('be.visible')  // Ensure the element is visible
        .click(); 
  
        cy.get('.inbox', { timeout: 20000 })
      });
  });