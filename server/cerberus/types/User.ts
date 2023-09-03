export default interface Role {
  uuid: string,
  name: string
}

export default interface User {
  uuid: string,
  name: string,
  login: string,
  mail: string,
  telegram: string,
  roles: Role[]
}