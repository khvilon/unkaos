import Sender from './Sender';
import Rest from './Rest';
import MsgOut from './MsgOut';
import Watchers from './Watchers';
import Support from './support_temp';
import MailPoller from "./MailPoller";

const my_uuid = '9965cb94-17dc-46c4-ac1e-823857289e98'

async function init() {
    const sender = new Sender()
    await sender.init()

    Rest.listen(sender)

    const msgOut = new MsgOut(sender);
    await msgOut.init()

    const watchers = new Watchers();
    await watchers.init()

    const support = new Support(sender);
    await support.init()

    const mail_poller = new MailPoller()
    await mail_poller.init()

    //Sender.send('email', 'n@khvilon.ru', 'test title', 'test body')
    //Sender.send('email', my_uuid, 'test title', 'test body', 'oboz')
    //setTimeout(()=>{Sender.send('telegram', my_uuid, 'test title', 'test body', 'oboz')}, 1000)
    //setTimeout(()=>{Sender.send('telegram', my_uuid, 'test title', 'test body', 'oboz')}, 20000)
    //setTimeout(()=>{Sender.send('discord', my_uuid, 'test title', 'test body', 'oboz')}, 1000)

}

init()

