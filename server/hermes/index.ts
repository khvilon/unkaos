import Sender from './Sender';
import Rest from './Rest';
import MsgOut from './MsgOut';
import Watchers from './Watchers';
import MailPoller from "./MailPoller";
const { ToadScheduler, SimpleIntervalJob, AsyncTask } = require('toad-scheduler')

const my_uuid = '9965cb94-17dc-46c4-ac1e-823857289e98'

async function init() {
    let sender = new Sender()
    await sender.init()

    Rest.listen(sender)

    let msgOut = new MsgOut(sender);
    await msgOut.init()

    let watchers = new Watchers();
    await watchers.init()

    const scheduler = new ToadScheduler()
    const mail_poller = new MailPoller()
    const mailPollerTask = new AsyncTask(
      'scheduler_mail_poller',
      mail_poller.pollMessages(),
      (e: Error) => {
          console.log(`[Scheduler] Unexpected error occurred in scheduled task: \n${e}`)
      }
    )
    const mailPollerJob = new SimpleIntervalJob({seconds: 15}, mailPollerTask,{id: 'id_1', preventOverrun: true,})
    scheduler.addSimpleIntervalJob(mailPollerJob)

    //Sender.send('email', 'n@khvilon.ru', 'test title', 'test body')
    //Sender.send('email', my_uuid, 'test title', 'test body', 'oboz')
    //setTimeout(()=>{Sender.send('telegram', my_uuid, 'test title', 'test body', 'oboz')}, 1000)
    //setTimeout(()=>{Sender.send('telegram', my_uuid, 'test title', 'test body', 'oboz')}, 20000)
    //setTimeout(()=>{Sender.send('discord', my_uuid, 'test title', 'test body', 'oboz')}, 1000)

}

init()

