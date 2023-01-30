import express from 'express';
import  Sender from './sender';
import { restConfig } from './conf';

export class Rest {

    public static listen(sender: Sender) {
        const app = express();

        app.use(express.json());

        app.post('/send', (req: any, res: any) => {
            try {
                const { transport, recipient, title, body, workspace } = req.body;
                sender.send(transport, recipient, title, body, workspace);
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

export default Rest