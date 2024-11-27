import sql from "./sql";
import tools from "../tools";
import { logger } from './logger';
import { Row } from "postgres";
import { User } from "./types/User";

interface UserSession {
    token: string;
    user: User;
    timestamp: number;
}

export default class Data {
    private workspaces: Map<string, UserSession[]> = new Map();
    private tokenExpirationTimeSec: number = 30 * 60 * 60 * 24; // 30 days
    private checkExpiredIntervalMs: number = 10 * 1000; // 10 minutes in ms

    private CRUD: any = {
        'C': 'create',
        'R': 'read',
        'U': 'update',
        'D': 'delete'
    };

    public async init() {
        await this.initSchema();
        await this.getWorkspaces();
        this.removeExpiredTokens();
    }

    private async initSchema() {
        try {
            await sql.admin`
                CREATE TABLE IF NOT EXISTS users (
                    workspace text,
                    uuid text,
                    name text,
                    email text,
                    password text,
                    admin boolean,
                    PRIMARY KEY(workspace, uuid)
                )
            `;
            logger.info('Database schema initialized');
        } catch (error) {
            logger.error({ error }, 'Failed to initialize database schema');
            throw error;
        }
    }

    private async getWorkspaces() {
        const schemas = await sql.admin`
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name != 'information_schema'
            AND schema_name != 'pg_catalog'
            AND schema_name != 'pg_toast'
            AND schema_name != 'public'
        `;

        for (const schema of schemas) {
            this.workspaces.set(schema.schema_name, []);
        }
    }

    private removeExpiredTokens() {
        setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            this.workspaces.forEach((sessions, workspace) => {
                this.workspaces.set(workspace, 
                    sessions.filter(session => session.timestamp + this.tokenExpirationTimeSec > now)
                );
            });
        }, this.checkExpiredIntervalMs);
    }

    public async checkSession(workspace: string, token: string): Promise<User | null> {
        const sessions = this.workspaces.get(workspace);
        if (!sessions) return null;

        const session = sessions.find(s => s.token === token);
        if (!session) return null;

        const now = Math.floor(Date.now() / 1000);
        if (session.timestamp + this.tokenExpirationTimeSec < now) {
            this.workspaces.set(workspace, 
                sessions.filter(s => s.token !== token)
            );
            return null;
        }

        session.timestamp = now;
        return session.user;
    }

    public async getUser(workspace: string, email: string): Promise<User | null> {
        const users = await sql.admin`
            SELECT * FROM users 
            WHERE workspace = ${workspace} 
            AND email = ${email}
        `;

        if (users.length === 0) return null;
        return users[0] as User;
    }

    public isAdmin(workspace: string, uuid: string): boolean {
        return true; // Временно все пользователи админы
    }

    public checkPermission(workspace: string, uuid: string, func: string): boolean {
        return true; // Временно все разрешено
    }
}