import {
  FetchMessageObject,
  ImapFlow,
  MessageAddressObject,
  MessageStructureObject, SearchObject
} from "imapflow";
import { decodeWords } from "libmime";
import tools from "../tools";
import {Sql} from "./Sql";
import {MessagePart, MsgPipe, MsgStatus, ParsedMessage} from "./Types";

export class MailPoller {

  async pollMessages() {
    console.log('[MailPoller] Started message sync.')
    try {
      const workspaces: string[] = await Sql.workspaces
      for (const workspace of workspaces) {
        for (const pipe of await Sql.getMsgPipes(workspace)) {
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
          const parsedMessages : ParsedMessage[] = [];
          for (let message of await this.fetchNewMessages(client, date, sinceDate)) {
            try {
              console.log(`[MailPoller] New email message from: ${message.envelope.sender[0].address}; subject: ${message.envelope.subject}`)
              parsedMessages.push({
                uuid: tools.uuidv4(),
                message: message,
                parts: await this.fetchParts(client, message)
              })
            } catch (e) {
              console.log(`[MailPoller] Error while fetching message from: ${message.envelope.sender[0].address}; subject: ${message.envelope.subject}: \n${e}`)
            }
          }
          for (const msg of parsedMessages) {
            await this.parseAndSaveMessage(workspace, msg, pipe);
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

  private async parseAndSaveMessage(workspace: string, msg: ParsedMessage, pipe: MsgPipe) {
    try {
      await Sql.insertMsgIn(workspace, {
        uuid: msg.uuid,
        pipe_uuid: pipe.uuid,
        message_id: msg.message.envelope.messageId,
        message_uid: String(msg.message.uid),
        title: msg.message.envelope.subject,
        body: '',
        from: this.mapRecipientsToString(msg.message.envelope.from),
        senders: this.mapRecipientsToString(msg.message.envelope.sender),
        cc: this.mapRecipientsToString(msg.message.envelope.cc),
        bcc: this.mapRecipientsToString(msg.message.envelope.bcc),
        reply_to: this.mapRecipientsToString(msg.message.envelope.replyTo),
        to: this.mapRecipientsToString(msg.message.envelope.to),
        message_date: msg.message.envelope.date,
        created_at: new Date(),
        updated_at: new Date(),
        status: MsgStatus.NEW
      })
      for (const part of msg.parts) {
        await this.parseAndSavePart(workspace, part, msg);
      }
    } catch (e) {
      console.log(`[MailPoller] Unexpected error occurred while processing message ${msg.message.envelope.subject}: \n${e}`)
    }
  }

  private async parseAndSavePart(workspace: string, part: MessagePart, msg: ParsedMessage) {
    try {
      let decodedPartContent: string
      if (part.structure.encoding == 'quoted-printable') {
        if (part.content.content.read() !== undefined) {
          decodedPartContent = decodeWords(part.content.content.read())
        } else {
          decodedPartContent = ''
        }
      } else {
        decodedPartContent = 'data:' + part.structure.type + ';base64,' + part.content.content.setEncoding('base64').read()
      }
      await Sql.insertMsgInPart(workspace, {
        uuid: tools.uuidv4(),
        msg_in_uuid: msg.uuid,
        content: decodedPartContent,
        type: part.structure.type,
        encoding: part.structure.encoding,
        disposition: part.structure.disposition,
        part_id: part.structure.id,
        filename: JSON.parse(part.structure.dispositionParameters).filename || ''
      })
      //console.log(`[MailPoller] Content of message ${msg.message.uid}, part '${part.structure.part}': ${decodedPartContent}`)
    } catch (e) {
      console.log(`[MailPoller] Unexpected error occurred while processing part of message ${msg.message.envelope.subject}: \n${e}`)
    }

  }

// Fetch all new messages since/before specific date
  private async fetchNewMessages(client: ImapFlow, date: Date, since: boolean) : Promise<FetchMessageObject[]> {
    let lock = await client.getMailboxLock('INBOX');
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
      return elements?.map(element => element.address).join(' ').toLowerCase()
    } else {
      return ''
    }
  }

}

export default MailPoller