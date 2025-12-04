import Sender from './Sender';
import Rest from './Rest';
import MsgOut from './MsgOut';
import Watchers from './Watchers';
import Support from './support_temp';
import MailPoller from "./MailPoller";
import { createLogger } from '../server/common/logging';

const logger = createLogger('hermes');

async function init() {
    logger.info({
        msg: 'Initializing Hermes service'
    });

    const sender = new Sender()
    await sender.init()
    logger.info({
        msg: 'Sender initialized'
    });

    Rest.listen(sender)
    logger.info({
        msg: 'REST API started'
    });

    const msgOut = new MsgOut(sender);
    await msgOut.init()
    logger.info({
        msg: 'Message output handler initialized'
    });

    const watchers = new Watchers();
    await watchers.init()
    logger.info({
        msg: 'Watchers initialized'
    });

    const support = new Support(sender);
    await support.init()
    logger.info({
        msg: 'Support handler initialized'
    });

    const mail_poller = new MailPoller()
    await mail_poller.init()
    logger.info({
        msg: 'Mail poller initialized'
    });

    logger.info({
        msg: 'Hermes service started successfully'
    });
}

init().catch(error => {
    logger.error({
        msg: 'Failed to initialize Hermes service',
        error: error
    });
    process.exit(1);
});
