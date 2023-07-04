import express from 'express';
import Sender from './Sender';

let restConf: any;

try {
  const { restConfig } = require('./conf');
  restConf = restConfig;
} catch (error) {
    restConf = {
    port: process.env.HERMES_PORT
  };
}

export class Rest {

    public static listen(sender: Sender) {
        const app = express();

        app.use(express.json({limit: '150mb'}));
        app.use(express.raw({limit: '150mb'}));
        app.use(express.urlencoded({limit: '150mb', extended: true}));

        app.post('/send', async (req: any, res: any) => {
            console.log('send', req.body)
            try {
                const { transport, recipient, title, body, workspace } = req.body;
                console.log(transport, recipient, title, body, workspace)
                let ans = await sender.send(transport, recipient, title, body, workspace);
                if(ans.status) res.status(200).send({ message: 'message sent' });
                else res.status(500).send({ message: ans.status_details });
                
            } catch (err:any) {
                res.status(500).send({ message: err.message });
            }
        });

        app.get('/ping', async (req: any, res: any) => {
            res.status(200)
            res.send({status: "OK"})
        });

        app.listen(restConf.port, () => {
            console.log(`Server running on port ${restConf.port}`);
        });
    }
}

export default Rest