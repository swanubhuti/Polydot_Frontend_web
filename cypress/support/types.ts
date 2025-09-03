export enum UserRole {
    Admin = 'admin',
    BusinessAdmin = 'business-admin',
    User = 'user'
}

export interface UserInfo {
    role: UserRole;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    isEnterprise: boolean;
    permissions: string;
}

export interface BusinessInfo {
    name: string;
    easyDiaryId: string;
    herdId: string
}