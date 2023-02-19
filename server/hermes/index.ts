import  Sender from './sender';
import  Rest from './rest';
import  MsgOut from './msg_out';
import  Watchers from './watchers';
import  Support from './support_temp';


//let s = new Sender();

const my_uuid = '9965cb94-17dc-46c4-ac1e-823857289e98'

const init = async function()
{
    let sender = new Sender()
    await sender.init()

    Rest.listen(sender)

    let msgOut = new MsgOut(sender);
    await msgOut.init()

    let watchers = new Watchers();
    await watchers.init()

    let support = new Support(sender);
    await support.init()
    

    //Sender.send('email', 'n@khvilon.ru', 'test title', 'test body')
    //Sender.send('email', my_uuid, 'test title', 'test body', 'oboz')

    //setTimeout(()=>{Sender.send('telegram', my_uuid, 'test title', 'test body', 'oboz')}, 1000)
    //setTimeout(()=>{Sender.send('telegram', my_uuid, 'test title', 'test body', 'oboz')}, 20000)

    //setTimeout(()=>{Sender.send('discord', my_uuid, 'test title', 'test body', 'oboz')}, 1000)

}

init()

