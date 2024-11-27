export interface Role {
    uuid: string;
    name: string;
}

export interface User {
    uuid: string;
    name?: string;
    email?: string;
    login?: string;
    mail?: string;
    telegram?: string;
    password?: string;
    admin?: boolean;
    is_admin?: boolean;
    roles?: Role[];
}