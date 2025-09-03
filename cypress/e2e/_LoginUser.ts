/// <reference types="cypress" />

import { UserInfo, UserRole } from 'cypress/support/types';
import Utils from '../support/utils';

const { generateAdminUserInfo, generateUserInfo, generateBusinessInfo } = Utils;

describe('login user', () => {

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    const newBusinessAdminUser = generateUserInfo(UserRole.BusinessAdmin, false);
    newBusinessAdminUser.role = UserRole.BusinessAdmin;
    newBusinessAdminUser.username = 'David';
    newBusinessAdminUser.firstName = 'David';
    newBusinessAdminUser.password = 'dc231102';
    newBusinessAdminUser.isEnterprise = true;

    it('checks if Custom Groups are not empty', () => {

        //Open website
        cy.checkUserLogin(newBusinessAdminUser);

    });
})