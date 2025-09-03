/// <reference types="cypress" />

import { UserInfo, UserRole } from 'cypress/support/types';
import Utils from '../support/utils';

const { generateAdminUserInfo } = Utils;

describe('template', () => {

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    const adminUser: UserInfo = generateAdminUserInfo();

    it('Login', () => {

        //Open website
        cy.loadWebsite();
        cy.login(adminUser);

        //New code here

    });
})