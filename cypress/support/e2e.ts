import { registerCommands } from './commands'
import { BusinessInfo, UserInfo } from './types';

registerCommands()

declare global {
    namespace Cypress {
        interface Chainable {
            loadWebsite(): Chainable<Element>;
            login(userInfo: UserInfo): Chainable<Element>;
            logoutAsAdmin(): Chainable<Element>;
            logoutAsCreatedUser(): Chainable<Element>;
            createBusiness(newBusinessInfo: BusinessInfo): Chainable<Element>;
            createUser(userInfo: UserInfo, newBusinessName: string): Chainable<Element>;
            checkUserLogin(userInfo: UserInfo): Chainable<Element>;
            deleteUser(userInfo: UserInfo, newBusinessName: string): Chainable<Element>;
            deleteBusiness(newBusinessName: string): Chainable<Element>;
        }
    }
}

// Disable Cypress uncaught exception failures from React hydration errors
Cypress.on('uncaught:exception', (err) => {
    if (
        err.message.includes('Minified React error #418') ||
        err.message.includes('Minified React error #423') ||
        err.message.includes('Hydration failed because the initial UI does not match what was rendered on the server') ||
        err.message.includes('There was an error while hydrating')
    ) {
        return false;
    }
    // Enable uncaught exception failures for other errors
});