import {
  FetchMessageObject,
  ImapFlow,
  MessageAddressObject,
  MessageStructureObject, SearchObject
} from "imapflow";
import { decodeWords } from "libmime";
import tools from "../tools";
import {Sql} from "./Sql";
import {MessagePart, MsgPipe, MsgStatus} from "./Types";
import {Readable} from "stream";

export class MailPoller {

  async pollMessages() {
    console.log('[MailPoller] Started message sync.')
    try {
      const workspaces: string[] = await Sql.workspaces
      for (const workspace of workspaces) {
        const pipes : MsgPipe[] = await Sql.getMsgPipes(workspace)
        for (const pipe of pipes) {
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
          const lastMsg = await Sql.getLastMsgIn(workspace, pipe.uuid)
          let date: Date, sinceDate: boolean;
          if (lastMsg[0] !== undefined && lastMsg[0].message_date !== undefined) {
            date = lastMsg[0].message_date
            sinceDate = true
          } else { // first launch
            date = new Date()
            sinceDate = false
          }
          await client.connect();
          const messages = await this.fetchNewMessages(client, date, sinceDate)
          for (let message of messages) {
            try {
              await this.parseAndSaveMessage(workspace, client, pipe, message);
            } catch (e) {
              console.log(`[MailPoller] Error while fetching message from: ${message.envelope.sender[0].address}; subject: ${message.envelope.subject}: \n${e}`)
            }
          }
          await client.logout();
        }
      }
    } catch (e) {
      console.log(`[MailPoller] Unexpected error occurred while message sync: \n${e}`)
      throw e
    }
    console.log('[MailPoller] Ended message sync.')
  }

  private async parseAndSaveMessage(workspace: string, client: ImapFlow, pipe: MsgPipe, msg: FetchMessageObject) {
    try {
      console.log(`[MailPoller] New email message from: ${msg.envelope.sender[0].address}; subject: ${msg.envelope.subject}`)
      const uuid = tools.uuidv4()
      await Sql.insertMsgIn(workspace, {
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
      const parts = await this.fetchParts(client, msg)
      for (const part of parts) {
        await this.parseAndSavePart(workspace, part, msg, uuid);
      }
    } catch (e) {
      console.log(`[MailPoller] Unexpected error occurred while processing message ${msg.envelope.subject}: \n${e}`)
    }
  }

  private async parseAndSavePart(workspace: string, part: MessagePart, msg: FetchMessageObject, msg_uuid: string) {
    try {
      let decodedPartContent: string
      if (part.content.content !== undefined) {
        if (part.structure.type.includes('text')) {
          const text = await this.streamToString(part.content.content)
          try {
            decodedPartContent = decodeWords(text)
          } catch (e) {
            console.log(`[MailPoller] Unexpected error occurred while decoding part of message '${msg.envelope.subject}': \n${e}`)
            decodedPartContent = text
          }
          part.structure.encoding = 'utf8'
        } else {
          decodedPartContent = 'data:' + part.structure.type + ';base64,' + part.content.content.setEncoding('base64').read()
        }
      } else {
        decodedPartContent = ''
      }
      await Sql.insertMsgInPart(workspace, {
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
      console.log(`[MailPoller] Unexpected error occurred while processing part of message ${msg.envelope.subject}: \n${(e)}`)
    }
  }

// Fetch all new messages since/before specific date
  private async fetchNewMessages(client: ImapFlow, date: Date, since: boolean) : Promise<FetchMessageObject[]> {
    const lock = await client.getMailboxLock('INBOX');
    const range : SearchObject = since ? {since: date} : {before: date}
    try {
      const fetchResult = client.fetch(range, {envelope: true, bodyStructure: true})
      const messages = Array<FetchMessageObject>();
      for await (let message of fetchResult) {
        messages.push(message)
      }
      return messages;
    } catch (e) {
      console.log(`[MailPoller] Error occurred while fetching new messages: \n${e}`)
      return []
    } finally {
      lock.release();
    }
  }

  private async fetchParts(client: ImapFlow, message: FetchMessageObject): Promise<MessagePart[]> {
    const parts = Array<MessageStructureObject>();
    if (message.bodyStructure.childNodes !== undefined) {
      message.bodyStructure.childNodes.forEach((part : MessageStructureObject) => {
        this.stripParts(part, parts)
      })
    } else {
      parts.push(message.bodyStructure)
    }
    return await Promise.all(parts.map(async part => ({
      structure: part,
      content: await client.download(String(message.uid), part.part, {uid: true})
    })))
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

}

export default MailPoller