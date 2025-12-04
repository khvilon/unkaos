import express from 'express';
import Sender from './Sender';
import { createLogger } from '../server/common/logging';

const logger = createLogger('hermes:rest');

let restConf: any;

try {
  const { restConfig } = require('./conf');
  restConf = restConfig;
  logger.debug({
    msg: 'Loaded configuration from file',
    port: restConf.port
  });
} catch (error) {
  restConf = {
    port: process.env.HERMES_PORT
  };
  logger.debug({
    msg: 'Using default configuration',
    port: restConf.port
  });
}

export class Rest {

    public static listen(sender: Sender) {
        const app = express();

        app.use(express.json({limit: '150mb'}));
        app.use(express.raw({limit: '150mb'}));
        app.use(express.urlencoded({limit: '150mb', extended: true}));

        app.post('/send', async (req: any, res: any) => {
            const { transport, recipient, title, body, workspace } = req.body;
            
            logger.debug({
              msg: 'Received send request',
              transport,
              recipient,
              workspace
            });

            try {
                let ans = await sender.send(transport, recipient, title, body, workspace);
                if(ans.status) {
                  logger.debug({
                    msg: 'Message sent successfully',
                    transport,
                    recipient,
                    workspace
                  });
                  res.status(200).send({ message: 'message sent' });
                } else {
                  logger.error({
                    msg: 'Failed to send message',
                    transport,
                    recipient,
                    workspace,
                    error: ans.status_details
                  });
                  res.status(500).send({ message: ans.status_details });
                }
            } catch (err:any) {
                logger.error({
                  msg: 'Error processing send request',
                  transport,
                  recipient,
                  workspace,
                  error: err.message
                });
                res.status(500).send({ message: err.message });
            }
        });

        app.get('/ping', async (req: any, res: any) => {
            logger.debug({
              msg: 'Received ping request'
            });
            res.status(200).send({status: "OK"});
        });

        app.listen(restConf.port, () => {
            logger.info({
              msg: 'REST API server started',
              port: restConf.port
            });
        });
    }
}

export default Rest;