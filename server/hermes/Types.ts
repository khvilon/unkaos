import { DownloadObject, MessageStructureObject } from "imapflow";

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
  telegram: string,
  discord: string,
}

export type MessagePart = {
  structure: MessageStructureObject,
  content: DownloadObject
}

export type MsgIn = {
  uuid: string,
  pipe_uuid: string,
  message_id: string,
  message_uid: string,
  title: string,
  body: string,
  from: string,
  senders: string,
  cc: string,
  bcc: string,
  reply_to: string,
  to: string,
  error_message?: string,
  message_date: Date,
  created_at?: Date,
  updated_at?: Date,
  deleted_at?: Date,
  status: MsgStatus
}

export enum MsgStatus {
  NEW = "NEW",
  PROCESSED = "PROCESSED",
  ERROR = "ERROR"
}

export type MsgInPart = {
  uuid: string,
  msg_in_uuid: string,
  content: string,
  type: string,
  encoding: string,
  disposition: string,
  part_id: string,
  part_num: string,
  filename: string,
  created_at?: Date,
  updated_at?: Date,
  deleted_at?: Date
}