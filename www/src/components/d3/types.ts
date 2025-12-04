export interface IssueStatus {
  uuid: string
  name: string
  x?: number
  y?: number
}

export interface WorkflowNode {
  uuid: string
  issue_statuses: IssueStatus[]
  x?: number
  y?: number
}

export interface Transition {
  uuid: string
  name: string
  status_from_uuid: string
  status_to_uuid: string
}

export interface WorkflowData {
  name: string
  workflow_nodes: WorkflowNode[]
  transitions: Transition[]
}

export interface D3Node extends WorkflowNode {
  x: number
  y: number
  r: number
  fx?: number | null
  fy?: number | null
}

export interface D3Link extends Transition {
  source: D3Node
  target: D3Node
}

export interface Selected {
  node: D3Node | null
  edge: D3Link | null
}
