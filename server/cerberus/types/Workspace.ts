import User from "./User";
import UserSession from "./UserSession";
import Role from "./Role";

export default interface Workspace {
  name: string;
  users: Map<string, User & { roles: Role[] }>;
  sessions: Map<string, UserSession>;
}