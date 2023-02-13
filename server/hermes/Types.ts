import { DownloadObject, FetchMessageObject, MessageStructureObject } from "imapflow";

export type MsgPipe = {
  uuid: string,
  host: string,
  port: string,
  login: string,
  password: string,
  service: string,
  name: string,
  is_active: boolean,
  created_at: Date,
  updated_at: Date,
  deleted_at: Date
}

export type User = {
  uuid: string,
  name: string,
  login: string,
  mail: string,
  telegram : string,
  telegram_id : string,
  discord: string,
  discord_id: string
}

export type ParsedMessage = {
  uuid: string,
  message: FetchMessageObject,
  parts: MessagePart[]
}

export type MessagePart = {
  structure: MessageStructureObject,
  content: DownloadObject
}

export type MessageClient = {
  uuid: string,
  host: string,
  login: string,
  password: string,
  service: string,
  name: string,
  port: string,
}