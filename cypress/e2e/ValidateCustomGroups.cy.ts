/// <reference types="cypress" />

import { UserInfo, UserRole } from 'cypress/support/types';
import Utils from '../support/utils';

const { generateAdminUserInfo, generateUserInfo, generateBusinessInfo } = Utils;

const easyDairyId = Cypress.env('userEasyDairyId');
const herdId =  Cypress.env('userHerdId');
const customGroups = Cypress.env('userCustomGroups').split(',');

describe('set up "standard" and "business-admin" user', () => {

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    const adminUser: UserInfo = generateAdminUserInfo();
    const newBusinessInfo = generateBusinessInfo(easyDairyId, herdId);
    const newBusinessAdminUser = generateUserInfo(UserRole.BusinessAdmin, false);

    it('creates a business and user entity using admin login', () => {
        cy.loadWebsite();
        cy.login(adminUser);
        cy.createBusiness(newBusinessInfo);
        cy.createUser(newBusinessAdminUser, newBusinessInfo.name);
        cy.logoutAsAdmin();
    });

    it('checks if Custom Groups are not empty', () => {

        //Open website and login
        cy.loadWebsite();
        cy.login(newBusinessAdminUser);

        //Switch to Herd
        cy.contains("label", "Current Herd:").parent().find('button').click()
        cy.contains("label", "Current Herd:").parent().contains('li', herdId).click()

        cy.wait(1000);

        //Animal List
        cy.get('div[id="AnimalList"]').as('tableAnimalList');

        for (const customGroup of customGroups) {

            //Select custom group 
            cy.get('@tableAnimalList')
                .contains('label', 'Groups')
                .parent().find('button').click();

            cy.get('@tableAnimalList')
                .contains('label', 'Groups')
                .parent().contains('li', customGroup).click();

            cy.wait(1000);

            //Do Count
            cy.get('@tableAnimalList').find('tbody')
                .find('tr').its('length').then((rowCount) => {
                    cy.log(`Number of '${customGroup}' rows: ${rowCount}`);
                    expect(rowCount).to.be.gt(0);
                });
        }


    });

    it('archives the business and user entity using admin login', () => {
        cy.loadWebsite();
        cy.login(adminUser);
        cy.deleteBusiness(newBusinessInfo.name);
        cy.logoutAsAdmin();
    })
})