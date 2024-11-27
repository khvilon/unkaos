import { User } from "./User";

export interface UserSession {
    uuid?: string;
    user_uuid?: string;
    token: string;
    user: User;
    timestamp: number;
    token_created_at?: Date;
    expires_at?: Date;
}