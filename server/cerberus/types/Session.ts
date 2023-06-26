export default interface Session {
  user_uuid: string,
  token: string,
  token_created_at: Date,
  expires_at?: Date
}