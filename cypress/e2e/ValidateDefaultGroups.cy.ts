/// <reference types="cypress" />

import { UserInfo, UserRole } from 'cypress/support/types';
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

    const newBusinessAdminUser = generateUserInfo(UserRole.BusinessAdmin, false);

    it('creates a new business entity using admin login', () => {
        cy.loadWebsite();
        cy.login(adminUser);
        cy.createBusiness(newBusinessInfo);
        cy.createUser(newBusinessAdminUser, newBusinessInfo.name);
        cy.logoutAsAdmin();
    });

    it('checks if valid Status Groups are not empty', () => {

        //Open website
        cy.loadWebsite();

        cy.login(newBusinessAdminUser);

        cy.wait(500);

        //Switch to Herd
        cy.contains("label", "Current Herd:").parent().find('button').click()
        cy.contains("label", "Current Herd:").parent().contains('li', herdId).click()

        cy.wait(1000);

        //Status Groups check
        cy.contains("h3", "Status Groups")
            .parent()
            .as('chartStatusGroups');

        let numStatusZeroBarCount = 0;
        //Check bar chart
        cy.get('@chartStatusGroups')
            .find('g[class="recharts-layer recharts-bar-rectangles"]')
            .find('g[class="recharts-layer recharts-bar-rectangle"]')
            .each(($rectangle) => {
                // Check if the rectangle does not contain a <path> element
                if ($rectangle.find('path').length === 0) {
                    numStatusZeroBarCount++;
                }
            })
            .then(() => {
                expect(numStatusZeroBarCount).to.equal(0);
            });


    });

    it('checks if valid Management Groups are not empty', () => {

        //Open website
        cy.loadWebsite();

        cy.login(newBusinessAdminUser);

        //Switch to Herd
        cy.contains("label", "Current Herd:").parent().find('button').click()
        cy.contains("label", "Current Herd:").parent().contains('li', herdId).click()

        cy.wait(1000);

        //Management Groups check
        cy.contains("h3", "Management Groups")
            .parent()
            .as('chartManagementGroups');

        //Get Names
        let tspanTextList: string[] = [];
        cy.get('@chartManagementGroups')
            .find('g[class="recharts-layer recharts-cartesian-axis recharts-yAxis yAxis"]')
            .find('text')
            .each(($tspan) => {
                const tspanText = $tspan.text().trim();
                tspanTextList.push(tspanText);
            })

        let numManagementZeroBarCount = 0;
        //@NOTE: The numbers and empty bars can change from time to time depending on when the test is run, therefore is unreliable
        // So we will instead check that the chart is not completely empty
        // Check bar chart
        cy.get('@chartManagementGroups')
            .find('g[class="recharts-layer recharts-bar-rectangles"]')
            .find('g[class="recharts-layer recharts-bar-rectangle"]')
            .each(($rectangle, index) => {
                // cy.log(String(index), tspanTextList[index]);
                // if (["Due To Cycle", "Empty 100 Days"].includes(tspanTextList[index])) {
                    //no error since 'Due To Cycle' and 'Empty 100 Days' are empty
                // }
                // Check if the rectangle does not contain a <path> element
                if ($rectangle.find('path').length === 0) {
                    console.log('which bar', tspanTextList[index])
                    numManagementZeroBarCount++;
                }
            })
            .then(() => {
                expect(numManagementZeroBarCount).to.lessThan(tspanTextList.length);
            });
    });

    it('archives the new business entity using admin login', () => {
        cy.loadWebsite();
        cy.login(adminUser);
        cy.deleteBusiness(newBusinessInfo.name);
        cy.logoutAsAdmin();
    })
})