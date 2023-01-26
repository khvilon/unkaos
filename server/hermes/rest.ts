import * as express from 'express';
import  Sender from './sender';
import { restConfig } from './conf';

export class Rest {
    public static listen() {
        const app = express();

        app.use(express.json());

        app.post('/send', (req: any, res: any) => {
            try {
                const { transport, address, title, body } = req.body;
                const sender = new Sender();
                sender.send(transport, address, title, body);
                res.status(200).send({ message: 'message sent' });
            } catch (err:any) {
                res.status(500).send({ message: err.message });
            }
        });

        app.listen(restConfig.port, () => {
            console.log(`Server running on port ${restConfig.port}`);
        });
    }
}
