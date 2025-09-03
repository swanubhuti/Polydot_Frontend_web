/// <reference types="cypress" />

import { UserInfo, UserRole, BusinessInfo } from "./types";

export function registerCommands() {

    // Define a custom command to log in
    Cypress.Commands.add('loadWebsite', () => {
        cy.visit('/');
        cy.contains('Welcome to Easy Dairy').should('be.visible').scrollIntoView();
        cy.get('form').should('be.visible');
        cy.wait(100);
    })

    Cypress.Commands.add('login', (userInfo: UserInfo) => {
        cy.get('input[name="username"]').clear().type(userInfo.username);
        cy.get('input[id="password"]').clear().type(userInfo.password);
        cy.contains('button', 'Login').click();

        cy.wait(2000);

        if (userInfo.role !== UserRole.Admin) {
            // cy.get('img[alt="Easy Dairy Logo"]').should('exist', { timeout: 10000 });
            cy.contains('button', userInfo.firstName, { timeout: 10000 }).should('exist');
            // cy.get('body').should('not.contain', 'Success');
        }
    });

    Cypress.Commands.add('logoutAsAdmin', () => {
        cy.get('nav[aria-label="Top Bar"]').find('button').click()
        cy.contains('button', 'Logout').click();
        cy.contains('Welcome to Easy Dairy').should('be.visible').scrollIntoView();
    });

    Cypress.Commands.add('logoutAsCreatedUser', () => {
        cy.get('a[href="/dashboard"]')
            .parent().find('button', { timeout: 10000 })
            .click();
        cy.contains('Logout').click();
    });

    Cypress.Commands.add('createBusiness',
        (businessInfo: BusinessInfo) => {

            // Add or acquire business id
            cy.get('a[href="/admin/business/add"]').click();

            //Type business name
            cy.get('input[name="businessName"]').clear().type(businessInfo.name);

            //Find Record with Easiry DiaryIdand Enabled
            cy.contains('td', businessInfo.easyDiaryId).parent().find('button[id^="headlessui-switch"]').click();

            //Click on Action button to select Herd with HerdId
            // cy.contains('td', businessInfo.easyDiaryId).parent().find('button[aria-label="Manage Herds"]').click();

            //Deal with popup box
            cy.get('[id^="headlessui-combobox-input-"]').clear().type(businessInfo.herdId);
            cy.contains('li', businessInfo.herdId).click()
            cy.contains('td', businessInfo.herdId).parent().find('button[id^="headlessui-switch"]').click();
            cy.contains('button', 'Confirm').click();

            //Add Business
            cy.contains('button', 'Add').click();

            //Check business is added
            cy.contains("h5", "Successfully added business").should('be.visible');

            cy.log(JSON.stringify(businessInfo));

        });

    Cypress.Commands.add('createUser', (userInfo: UserInfo, newBusinessName: string) => {

        //Go to Business menu
        cy.get('a[href="/admin/business"]').click();
        cy.get('input[id="name"]').clear().type(newBusinessName);
        cy.contains('button', 'Search').click();

        //Confirm 1 row of record
        cy.get('table').find('tr').should('have.length', 2);
        cy.contains('tr', newBusinessName).get('button[aria-label="Add User"]').click();

        // Get on Add user Form
        cy.wait(1000);
        cy.get('iframe[title="Add User"]')
            .its('0.contentDocument.body').should('not.be.empty').then(cy.wrap)
            .then((body) => {

                //Add input fields
                cy.wrap(body).find('input[name="username"]').type(userInfo.username);
                cy.wrap(body).find('input[name="password"]').type(userInfo.password);
                cy.wrap(body).find('input[name="confirmPassword"]').type(userInfo.password);
                cy.wrap(body).find('input[name="firstName"]').type(userInfo.firstName);
                cy.wrap(body).find('input[name="lastName"]').type(userInfo.lastName);
                cy.wrap(body).find('input[name="email"]').type(userInfo.email);

                // Click the button to open the "User/Business-admin" dropdown
                cy.wrap(body).find('button[aria-haspopup="listbox"]').first().click();
                cy.wrap(body).wait(200);
                cy.wrap(body).contains(userInfo.role).click();

                // User permissions dropdown
                // cy.wrap(body).find('button[aria-haspopup="listbox"]').eq(1).click();
                // cy.wrap(body).wait(200);
                // cy.wrap(body).contains(userInfo.permissions).click();

                //Enterprise button
                if (userInfo.isEnterprise === true) {
                    cy.wrap(body).contains('label', 'Enterprise User')
                        .parent().find('button').first().click();
                };

                cy.wrap(body).contains('button', 'Add').click();

                //Check user is added
                cy.wrap(body).contains("h5", "Successfully added user").should('be.visible');
            });

        // Close Add user form
        cy.contains('h3', 'Add User').parent().find('button').eq(0).click();

        cy.log(JSON.stringify(userInfo));

    });

    Cypress.Commands.add('checkUserLogin', (userInfo: UserInfo) => {

        // //Open website
        cy.loadWebsite();

        // Log in as created user
        cy.login(userInfo);

        //Check if this is the right role
        cy.contains('button', userInfo.firstName).should('be.visible');
        cy.wait(100);

        cy.contains('button', userInfo.firstName).click();

        //Check if admin exists
        if (userInfo.role === UserRole.BusinessAdmin) {
            cy.get('a[href="/dashboard"]').parent().within(() => {
                cy.contains('Admin').should('exist');
            });

        } else {

            cy.get('a[href="/dashboard"]').parent().within(() => {
                cy.contains('Admin').should('not.exist');
            });

        }

        //temp hide this feature, check that it doesn't re-appear
        cy.get('a[href="/dashboard"]').parent().within(() => {
            cy.contains('Promotion').should('not.exist');
        });

        cy.contains('button', userInfo.firstName).click();

        //Check if enterprise icon exists
        if (userInfo.isEnterprise === true) {

            cy.get('a[href="/dashboard"]').parent().within(() => {
                cy.contains('span', 'Enterprise').should('exist');
            });

        } else {

            cy.get('a[href="/dashboard"]').parent().within(() => {
                cy.contains('span', 'Enterprise').should('not.exist');
            });
        }

        // Log out as created user
        cy.logoutAsCreatedUser();
    });

    Cypress.Commands.add('deleteUser', (userInfo: UserInfo) => {

        //Find User
        cy.get('a[href="/admin/user"]').click();
        cy.get('input[id="name"]').clear().type(userInfo.username);
        cy.contains('button', 'Search').click();

        //Delete newly created user
        cy.contains('tr', userInfo.username).find('button').click();
        cy.contains('button', 'Confirm').click();

        //Check user is actually gone
        cy.get('a[href="/admin/user"]').click();
        cy.get('input[id="name"]').clear().type(userInfo.username);
        cy.contains('button', 'Search').click();
        cy.get('table').find('tr').should('have.length', 1);

    });

    Cypress.Commands.add('deleteBusiness', (newBusinessName: string) => {

        // Search business name
        cy.get('a[href="/admin/business"]').click();
        cy.get('input[id="name"]').type(newBusinessName);
        cy.contains('button', 'Search').click();

        //Delete newly created user
        cy.contains('tr', newBusinessName).find('button[aria-label="Toggle business status"]').click();
        cy.contains('button', 'Confirm').click();

        //Check business is actually gone
        cy.get('a[href="/admin/business"]').click();
        cy.get('input[id="name"]').clear().type(newBusinessName);
        cy.contains('button', 'Search').click();
        cy.get('table').find('tr').should('have.length', 1);

    })
}