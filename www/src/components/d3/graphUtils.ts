import type { D3Node, D3Link, WorkflowData } from './types'
import graph_math from '@/graph_math'

const CIRCLE_RADIUS = 20

export function isBidirectional(link: D3Link, data: WorkflowData): boolean {
  return data.transitions.some(t => 
    t.status_from_uuid === link.status_to_uuid && 
    t.status_to_uuid === link.status_from_uuid
  )
}

export function calculateLinkPath(d: D3Link, data: WorkflowData): string {
  const source = { x: d.source.x, y: d.source.y }
  const target = { x: d.target.x, y: d.target.y }
  
  return graph_math.calc_edge_d(
    source,
    target,
    CIRCLE_RADIUS,
    isBidirectional(d, data)
  )
}

export function formatNodeText(text: string, maxLength: number = 15): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function findNodeAtPosition(nodes: D3Node[], x: number, y: number, radius: number): D3Node | undefined {
  return nodes.find(node => {
    const dx = x - node.x
    const dy = y - node.y
    return (dx * dx + dy * dy) <= (radius * radius)
  })
}
