import User from "./User";
import Session from "./Session";

export default interface Workspace {
  name: string,
  users: User[],
  sessions: Session[]
}