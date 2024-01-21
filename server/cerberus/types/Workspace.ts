import User from "./User";
import UserSession from "./UserSession";

export default interface Workspace {
  name: string;
  sessions: Map<string, UserSession>; //token, user_uuid
  permissions: Map<string, boolean>; //user_uuid.table_name.CRUD as key
  users: Map<string, User>; //users by uuid
}