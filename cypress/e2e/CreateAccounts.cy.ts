/// <reference types="cypress" />

import { UserRole, UserInfo } from 'cypress/support/types';
import Utils from '../support/utils';

const { generateAdminUserInfo, generateUserInfo, generateBusinessInfo } = Utils;

describe('set up "standard" and "business-admin" user', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  const adminUser: UserInfo = generateAdminUserInfo()

  const easyDiaryId = "152465";
  const herdId = "C00859H";
  const newBusinessInfo = generateBusinessInfo(easyDiaryId, herdId);

  const newNonEnterpriseBusinessAdminUser = generateUserInfo(UserRole.BusinessAdmin, false);
  const newNonEnterpriseStandardUser = generateUserInfo(UserRole.User, false);

  const newEnterpriseBusinessAdminUser = generateUserInfo(UserRole.BusinessAdmin, true);
  const newEnterpriseStandardUser = generateUserInfo(UserRole.User, true);

  it('creates a new business with users using admin login', () => {
    cy.loadWebsite();
    cy.login(adminUser);
    cy.createBusiness(newBusinessInfo);
    cy.createUser(newNonEnterpriseBusinessAdminUser, newBusinessInfo.name);
    cy.createUser(newNonEnterpriseStandardUser, newBusinessInfo.name);
    cy.createUser(newEnterpriseBusinessAdminUser, newBusinessInfo.name);
    cy.createUser(newEnterpriseStandardUser, newBusinessInfo.name);
    cy.logoutAsAdmin();
  });

  it('checks "non-enterprise business-admin" user using admin login', () => {
    cy.checkUserLogin(newNonEnterpriseBusinessAdminUser);
  });

  it('checks "non-enterprise standard" user using admin login', () => {
    cy.checkUserLogin(newNonEnterpriseStandardUser);
  });

  it('checks "enterprise business-admin" user using admin login', () => {
    cy.checkUserLogin(newEnterpriseBusinessAdminUser);
  });

  it('checks "enterprise standard" user using admin login', () => {
    cy.checkUserLogin(newEnterpriseStandardUser);
  });

  it('archives the new business entity using admin login', () => {
    cy.loadWebsite();

    cy.login(adminUser);

    cy.deleteUser(newNonEnterpriseBusinessAdminUser, newBusinessInfo.name);
    cy.deleteUser(newNonEnterpriseStandardUser, newBusinessInfo.name);

    cy.deleteUser(newEnterpriseBusinessAdminUser, newBusinessInfo.name);
    cy.deleteUser(newEnterpriseStandardUser, newBusinessInfo.name);

    cy.deleteBusiness(newBusinessInfo.name);

    cy.logoutAsAdmin();
  })

});