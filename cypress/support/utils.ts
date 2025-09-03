import { v4 as uuidv4 } from 'uuid';
import { BusinessInfo, UserInfo, UserRole } from './types';

const Utils = {
    generateBusinessInfo(easyDiaryId: string, herdId: string): BusinessInfo {
        return {
            'name': `${Cypress.env('businessPrefix')}${uuidv4()}`,
            'easyDiaryId': easyDiaryId,
            'herdId': herdId
        }
    },

    generateAdminUserInfo(): UserInfo {
        return {
            'username': Cypress.env('adminUsername'),
            'password': Cypress.env('adminPassword'),
            'firstName': '-',
            'lastName': '-',
            'email': '-',
            'role': UserRole.Admin,
            'permissions': 'Read-Write',
            'isEnterprise': false
        }
    },

    generateUserInfo(role: UserRole, isEnterprise: boolean): UserInfo {
        const FirstName: string = `${role}_${isEnterprise}`;
        const LastName: string = uuidv4();
        const Username: string = `${FirstName}_${LastName}`;
        const Email: string = `${Username}@test.com`;
        const Password: string = Cypress.env('userPassword');

        return {
            role: role,
            firstName: FirstName,
            lastName: LastName,
            username: Username,
            email: Email,
            password: Password,
            permissions: 'Read',
            isEnterprise: isEnterprise
        };
    }

};

export default Utils;