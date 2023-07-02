import {
  FetchMessageObject,
  ImapFlow,
  MessageAddressObject,
  MessageStructureObject
} from "imapflow";
import { decodeWords } from "libmime";
import tools from "../tools";
import {sql} from "./Sql";
import {MessagePart, MsgIn, MsgInPart, MsgPipe, MsgStatus} from "./Types";
import {Readable} from "stream";
import {AsyncTask, SimpleIntervalJob, ToadScheduler} from "toad-scheduler";

const log = require('bunyan').createLogger({ name: "MailPoller" });

export class MailPoller {

  async init() {
    const scheduler = new ToadScheduler()
    const mailPollerTask = new AsyncTask(
      'scheduler_mail_poller',
      () => this.pollMessages(),
      (e: Error) => {
        console.error(`[Scheduler] Unexpected error occurred in scheduled task: \n${e}`)
      }
    )
    const mailPollerJob = new SimpleIntervalJob({seconds: 15}, mailPollerTask,{id: 'id_1', preventOverrun: true})
    scheduler.addSimpleIntervalJob(mailPollerJob)
    log.info('Mail poller online.')
  }

  private async pollMessages() {
    for (const workspace of await this.loadWorkspaces()) {
      for (const pipe of await this.getMsgPipes(workspace)) {
        try {
          const client = new ImapFlow({
            host: pipe.host,
            port: Number(pipe.port),
            secure: true,
            auth: {
              user: pipe.login,
              pass: pipe.password
            },
            // @ts-ignore
            logger: {}
          });
          const lastMsg = await this.getLastMsgIn(workspace, pipe.uuid)
          await client.connect();
          const uid = (lastMsg[0] !== undefined && lastMsg[0].message_uid !== undefined)
            ? Number(lastMsg[0].message_uid)
            : await this.fetchFirstMessageUid(client, pipe.login)// first launch of poller
          const messages = await this.fetchNewMessages(client, uid, pipe.login)
          if (messages.length > 0) {
            log.info(`${pipe.login}: ${messages.length} new messages.`)
          }
          for (const message of messages) {
            await this.parseAndSaveMessage(workspace, client, pipe, message);
          }
          await client.logout();
        } catch (e) {
          log.error(`Unexpected error occurred while working with pipe ${pipe.login}:\n${e}`)
        }
      }
    }
  }

  private async parseAndSaveMessage(workspace: string, client: ImapFlow, pipe: MsgPipe, msg: FetchMessageObject) {
    log.info(`New email message from: ${msg.envelope.sender[0].address} to ${pipe.login}; subject: ${msg.envelope.subject}`)
    try {
      const uuid = tools.uuidv4()
      await this.insertMsgIn(workspace, {
        uuid: uuid,
        pipe_uuid: pipe.uuid,
        message_id: msg.envelope.messageId,
        message_uid: String(msg.uid),
        title: msg.envelope.subject || '',
        body: '',
        from: this.mapRecipientsToString(msg.envelope.from),
        senders: this.mapRecipientsToString(msg.envelope.sender),
        cc: this.mapRecipientsToString(msg.envelope.cc),
        bcc: this.mapRecipientsToString(msg.envelope.bcc),
        reply_to: this.mapRecipientsToString(msg.envelope.replyTo),
        to: this.mapRecipientsToString(msg.envelope.to),
        message_date: msg.envelope.date,
        status: MsgStatus.NEW
      })
      for (const part of await this.fetchParts(client, msg)) {
        await this.parseAndSaveMessagePart(workspace, part, msg, uuid)
      }
    } catch (e) {
      log.error(`Unexpected error occurred while processing message from: ${msg.envelope.sender[0].address} to ${pipe.login}; subject: ${msg.envelope.subject}:\n${e}`)
    }
  }

  private async parseAndSaveMessagePart(workspace: string, part: MessagePart, msg: FetchMessageObject, msg_uuid: string) {
    try {
      let decodedPartContent: string
      if (part.content.content !== undefined) {
        if (part.structure.type.includes('text')) {
          const text = await this.streamToString(part.content.content)
          try {
            decodedPartContent = decodeWords(text)
          } catch (e) {
            log.warn(`Unexpected error occurred while decoding part of message '${msg.envelope.subject}':\n${e}`)
            decodedPartContent = text
          }
          part.structure.encoding = 'utf8'
        } else {
          decodedPartContent = 'data:' + part.structure.type + ';base64,' + part.content.content.setEncoding('base64').read()
        }
      } else {
        decodedPartContent = ''
      }
      await this.insertMsgInPart(workspace, {
        uuid: tools.uuidv4(),
        msg_in_uuid: msg_uuid,
        content: decodedPartContent,
        type: part.structure.type,
        encoding: part.structure.encoding,
        disposition: part.structure.disposition || '',
        part_id: part.structure.id || '',
        part_num: part.structure.part || '',
        filename: (part.structure.dispositionParameters !== undefined) ? JSON.parse(JSON.stringify(part.structure.dispositionParameters)).filename || '' : ''
      })
    } catch (e) {
      log.error(`Unexpected error occurred while processing part of message ${msg.envelope.subject}:\n${(e)}`)
    }
  }

  // Fetch 50 messages of a client starting from specified uid (exclusively)
  private async fetchNewMessages(client: ImapFlow, uid: number, login: string) : Promise<FetchMessageObject[]> {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const messages = Array<FetchMessageObject>();
      const maxUid = (await this.getLastMessage(client)).uid
      let maxQueryUid = ((uid+51) < maxUid) ? (uid+51) : maxUid
      while (maxUid > maxQueryUid && messages.length < 50) {
        // try fetch another 50 messages
        for await (let message of client.fetch(
          (uid+1)+':'+maxQueryUid,
          {envelope: true, bodyStructure: true},
          // @ts-ignore
          { uid: true })) {
          messages.push(message)
        }
        uid = uid+50
        maxQueryUid = maxQueryUid+50
        // try to fetch another 50 uuids in case of uid gap
      }
      return messages;
    } catch (e) {
      log.error(`Error occurred while fetching new messages for client ${login}:\n${e}`)
      return []
    } finally {
      lock.release()
    }
  }

  private async fetchFirstMessageUid(client: ImapFlow, login: string): Promise<number> {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const messages = Array<FetchMessageObject>();
      for await (let message of client.fetch(
        '1:*',
        { uid: true },
        // @ts-ignore
        { uid: true })) {
        messages.push(message)
      }
      return messages[0]?.uid | 0
    } catch (e) {
      log.error(`Error occurred while fetching first message for client ${login}:\n${e}`)
      return 0
    } finally {
      lock.release()
    }
  }

  private async getLastMessage(client: ImapFlow) : Promise<FetchMessageObject> {
      return await client.fetchOne('*',{ uid: true },{ uid: true } )
  }

  private async fetchParts(client: ImapFlow, message: FetchMessageObject): Promise<MessagePart[]> {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const parts = Array<MessageStructureObject>();
      if (message.bodyStructure.childNodes !== undefined) {
        message.bodyStructure.childNodes.forEach((part : MessageStructureObject) => {
          this.stripParts(part, parts)
        })
      } else {
        message.bodyStructure.part = '1'
        parts.push(message.bodyStructure)
      }
      return await Promise.all(parts.map(async part => ({
        structure: part,
        content: await client.download(String(message.uid), part.part, {uid: true})
      })))
    } catch (e) {
      log.error(`Error occurred while fetching message parts:\n${e}`)
      return []
    } finally {
      lock.release()
    }
  }

  // Parse body structure as array of parts
  private stripParts(part : MessageStructureObject, parts: MessageStructureObject[]) {
    if (part.type.includes("multipart")) {
      for (let childNode of part.childNodes) {
        this.stripParts(childNode, parts)
      }
    } else {
      parts.push(part)
    }
  }

  private mapRecipientsToString(elements: MessageAddressObject[]) : string {
    if (elements !== undefined && elements.length !== 0) {
      return elements.map(element => element.address).join(' ').toLowerCase()
    } else {
      return ''
    }
  }

  private async streamToString(stream: Readable) : Promise<string> {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  private async loadWorkspaces() : Promise<string[]> {
    let workspaces = await sql`    
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN 
        ('pg_toast', 'pg_catalog', 'information_schema', 'admin', 'public')`;
    if (workspaces == null || workspaces.length < 1) return [];
    return workspaces.map((r: any) => r.schema_name);
  }

  private async getMsgPipes(workspace: string) : Promise<MsgPipe[]> {
    return await sql`
        SELECT *
        FROM ${sql(workspace + '.msg_pipes') } mp
        WHERE 
          mp.service = 'imap_in'
          and mp.is_active = true 
          and mp.deleted_at is null
      ` as MsgPipe[]
  }

  private async getLastMsgIn(workspace: string, pipe_uuid: string) : Promise<MsgIn[]> {
    return await sql`
        SELECT *
        FROM ${sql(workspace + '.msg_in')} mi
        WHERE 
          mi.deleted_at is null
          and mi.pipe_uuid = ${pipe_uuid}::uuid
        ORDER BY
          mi.message_date desc
        LIMIT 1
      ` as MsgIn[]
  }

  private async insertMsgIn(workspace: string, record: MsgIn) {
    await sql`
      INSERT INTO ${sql(workspace+ '.msg_in')} (uuid,title,body,"from",pipe_uuid,status,message_id,message_uid,message_date,senders,cc,bcc,reply_to,"to")
      VALUES (
        ${record.uuid}::uuid,
        ${record.title},
        ${record.body},
        ${record.from},
        ${record.pipe_uuid}::uuid,
        ${record.status}::${sql(workspace)}."msg_status",
        ${record.message_id},
        ${record.message_uid},
        ${record.message_date.toISOString()},
        ${record.senders},
        ${record.cc},
        ${record.bcc},
        ${record.reply_to},
        ${record.to}
      )`
  }

  private async insertMsgInPart(workspace: string, record: MsgInPart) {
    await sql`
      INSERT INTO ${sql(workspace + '.msg_in_parts')} (uuid,msg_in_uuid,"content","type","encoding",disposition,part_id,part_num,filename)
      VALUES (
        ${record.uuid}::uuid,
        ${record.msg_in_uuid}::uuid,
        ${record.content},
        ${record.type},
        ${record.encoding},
        ${record.disposition},
        ${record.part_id},
        ${record.part_num},
        ${record.filename}
      )`
  }

}

export default MailPoller