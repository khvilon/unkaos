import express from 'express';
import  Sender from './sender';
import { restConfig } from './conf';

export class Rest {

    public static listen(sender: Sender) {
        const app = express();

        app.use(express.json());

        app.post('/send', async (req: any, res: any) => {
            try {
                const { transport, recipient, title, body, workspace } = req.body;
                let ans = await sender.send(transport, recipient, title, body, workspace);
                if(ans.status) res.status(200).send({ message: 'message sent' });
                else res.status(500).send({ message: ans.status_details });
                
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