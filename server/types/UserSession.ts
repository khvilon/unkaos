export default interface UserSession {
  uuid: string,
  user_uuid: string,
  token: string,
  token_created_at: Date,
  expires_at?: Date
}