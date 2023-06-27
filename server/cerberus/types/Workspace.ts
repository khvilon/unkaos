import User from "./User";
import UserSession from "./UserSession";

export default interface Workspace {
  name: string,
  users: User[],
  sessions: UserSession[]
}