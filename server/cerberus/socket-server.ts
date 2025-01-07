import { Server } from 'socket.io';
import { createLogger } from '../server/common/logging';
import Security from "./security";
import Data from "./data";

const logger = createLogger('cerberus-socket');

export class SocketServer {
    private io: Server;
    private data: Data = new Data();

    constructor(server: any) {
        logger.info({
            msg: 'Creating Socket.IO server'
        });

        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT", "DELETE"],
                credentials: true
            },
            transports: ['polling', 'websocket'],
            path: '/socket.io'
        });

        logger.info({
            msg: 'Socket.IO server created'
        });
    }

    public async start() {
        await this.data.init();

        logger.info({
            msg: 'Starting Socket.IO server'
        });

        this.io.on('connection', (socket) => {
            logger.info({
                msg: 'New gateway connection',
                socketId: socket.id
            });

            socket.on('get_token', async (data: any, callback: Function) => {
                logger.debug({
                    msg: 'Handling get_token request',
                    socketId: socket.id
                });

                try {
                    const token = await Security.newToken(data.subdomain, data.email, data.password);
                    callback({ status: 200, data: token });
                } catch (error) {
                    logger.error({
                        msg: 'get_token error',
                        error
                    });
                    callback({ status: 401, data: { message: 'Неверное имя пользователя или пароль' } });
                }
            });

            socket.on('check_session', async (data: any, callback: Function) => {
                logger.debug({
                    msg: 'Handling check_session request',
                    socketId: socket.id,
                    subdomain: data.subdomain
                });

                try {
                    const user = await this.data.checkSession(data.subdomain, data.token);
                    if (!user) {
                        callback({ status: 401, data: { message: 'Пользовательский токен не валиден' } });
                        return;
                    }

                    const isAdmin = this.data.isAdmin(data.subdomain, user.uuid);
                    user.is_admin = isAdmin;
                    callback({ status: 200, data: user });
                } catch (error) {
                    logger.error({
                        msg: 'check_session error',
                        error
                    });
                    callback({ status: 401, data: { message: 'Ошибка авторизации' } });
                }
            });

            socket.on('upsert_password', async (data: any, callback: Function) => {
                try {
                    const user = await this.data.checkSession(data.subdomain, data.token);
                    if (!user) {
                        callback({ status: 401, data: { message: 'Ошибка авторизации' } });
                        return;
                    }
                    await Security.setUserPassword(data.subdomain, user, data.password);
                    callback({ status: 200, data: {} });
                } catch (error) {
                    logger.error({
                        msg: 'upsert_password error',
                        error
                    });
                    callback({ status: 500, data: { message: 'Internal Server Error' } });
                }
            });

            socket.on('upsert_password_rand', async (data: any, callback: Function) => {
                try {
                    const user = await this.data.checkSession(data.subdomain, data.token);
                    if (!user) {
                        callback({ status: 401, data: { message: 'Ошибка авторизации' } });
                        return;
                    }
                    const password = await Security.setRandomPassword(data.subdomain, user);
                    callback({ status: 200, data: { password } });
                } catch (error) {
                    logger.error({
                        msg: 'upsert_password_rand error',
                        error
                    });
                    callback({ status: 500, data: { message: 'Internal Server Error' } });
                }
            });

            socket.on('disconnect', () => {
                logger.info({
                    msg: 'Gateway disconnected',
                    socketId: socket.id
                });
            });
        });

        logger.info({
            msg: 'Socket.IO server started and listening for connections'
        });
    }
}
