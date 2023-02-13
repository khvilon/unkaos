import {
  DownloadObject,
  FetchMessageObject,
  ImapFlow,
  MessageAddressObject,
  MessageStructureObject
} from "imapflow";
import { DateTime, Duration } from "luxon";
import * as libmime from "libmime";
import tools from "../tools";
import sql from "./Sql";
import {MessagePart, ParsedMessage} from "./Types";

class MailPoller {

  async pollMessages() {
    console.log('Started message sync')
    const workspaces: string[] = await sql.workspaces
    for (const workspace of workspaces) {
      for (const msg_client of await sql.getMsgPipes(workspace)) {
        const client = new ImapFlow({
          host: msg_client.host,
          port: Number(msg_client.port),
          secure: true,
          auth: {
            user: msg_client.login,
            pass: msg_client.password
          },
          // @ts-ignore
          logger: {}
        });
        const nowMinusTenDays = DateTime.now().minus(Duration.fromObject({days: 10})).toBSON()// TODO change to date of last message or epoch
        await client.connect();
        const parsedMessages : ParsedMessage[] = [];
        for (let message of await this.fetchNewMessages(client, nowMinusTenDays)) {
          parsedMessages.push({
            uuid: tools.uuidv4(),
            message: message,
            parts: await this.fetchParts(client, message)
          })
        }
        parsedMessages.forEach(msg => {
          msg.parts.forEach(part => {
            let decodedPartContent: string
            if (part.structure.encoding == 'quoted-printable') {
              decodedPartContent = libmime.decodeWords(part.content.content.read())
            } else {
              decodedPartContent = 'data:'+part.structure.type+';base64,'+part.content.content.setEncoding('base64').read()
            }
            console.log(`Content of message ${msg.message.uid}, part '${part.structure.part}': ${decodedPartContent}`)
          })

        })
        await client.logout();
      }
    }
    console.log('Ended message sync')
  }

  private async fetchNewMessages(client: ImapFlow, sinceDate: Date) : Promise<FetchMessageObject[]> {
    let lock = await client.getMailboxLock('INBOX');
    try {
      const fetchResult = client.fetch({since: sinceDate}, {envelope: true, bodyStructure: true})
      const messages = Array<FetchMessageObject>();
      for await (let message of fetchResult) {
        messages.push(message)
      }
      return messages;
    } catch (e) {
      console.log('Error occurred while message sync: '+JSON.stringify(e))
      return []
    } finally {
      lock.release();
    }
  }

  private async fetchParts(client: ImapFlow, message: FetchMessageObject): Promise<MessagePart[]> {
    const parts = Array<MessageStructureObject>();
    message.bodyStructure.childNodes.forEach((part : MessageStructureObject) => {
      this.stripParts(part, parts)
    })
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

  private mapRecipientsToString(elements: MessageAddressObject[]) {
    return elements?.map(element => element.address).join(' ').toLowerCase()
  }

}

export default MailPoller


/*console.log(`
          Fetched envelope:
          uid            = ${message.uid}
          messageId      = ${message.envelope.messageId}
          senders        = ${this.mapRecipientsToString(message.envelope.sender)}
          from           = ${this.mapRecipientsToString(message.envelope.from)}
          bcc            = ${this.mapRecipientsToString(message.envelope.bcc)}
          cc             = ${this.mapRecipientsToString(message.envelope.cc)}
          replyTo        = ${this.mapRecipientsToString(message.envelope.replyTo)}
          to             = ${this.mapRecipientsToString(message.envelope.to)}
          date           = ${message.envelope.date.toISOString()}
          subject        = ${message.envelope.subject}
        `)*/

/*console.log(`
  Fetched body:
  bodyParts     = ${JSON.stringify(message.bodyParts)}
  bodyStructure = ${JSON.stringify(message.bodyStructure)}
`)*/