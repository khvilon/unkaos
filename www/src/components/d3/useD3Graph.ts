import * as d3 from 'd3'
import { ref, type Ref } from 'vue'
import type { D3Node, D3Link, WorkflowData } from './types'
import { calculateLinkPath, formatNodeText, findNodeAtPosition } from './graphUtils'

export function useD3Graph(container: Ref<HTMLElement | null>) {
  const width = ref(800)
  const height = ref(600)
  
  // D3 simulation
  const simulation = d3.forceSimulation<D3Node>()
    .force('link', d3.forceLink<D3Node, D3Link>().id((d) => d.uuid))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width.value / 2, height.value / 2))

  function initSvg() {
    if (!container.value) return { svg: null, g: null, linksGroup: null, nodesGroup: null }

    // Clear existing SVG
    d3.select(container.value)
      .select('svg')
      .remove()

    // Create new SVG
    const svg = d3.select(container.value)
      .select('.svg-wrapper')
      .append('svg')
      .attr('class', 'svg-workflow')
      .attr('width', '100%')
      .attr('height', '100%')

    // Define arrow markers
    const defs = svg.append('defs')
    
    // End marker
    defs.append('marker')
      .attr('id', 'end')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--text-color)')
      .attr('stroke', 'none')

    // Selected marker
    defs.append('marker')
      .attr('id', 'selected')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--selected-color)')
      .attr('stroke', 'none')

    // Create containers
    const g = svg.append('g')
    const linksGroup = g.append('g').attr('class', 'links')
    const nodesGroup = g.append('g').attr('class', 'nodes')

    return { svg, g, linksGroup, nodesGroup }
  }

  function processData(data: WorkflowData | undefined) {
    if (!data || !data.workflow_nodes || !data.transitions) {
      console.warn('Invalid data structure:', data)
      return { nodes: [], links: [] }
    }

    console.log('Processing data:', data)

    // Process nodes
    const nodes: D3Node[] = data.workflow_nodes.map(node => ({
      ...node,
      x: node.x || Math.random() * width.value,
      y: node.y || Math.random() * height.value
    }))

    console.log('Processed nodes:', nodes)

    // Process transitions
    const links: D3Link[] = data.transitions
      .map(transition => {
        const source = nodes.find(n => n.issue_statuses[0]?.uuid === transition.status_from_uuid)
        const target = nodes.find(n => n.issue_statuses[0]?.uuid === transition.status_to_uuid)
        
        if (!source || !target) {
          console.warn('Could not find nodes for transition:', {
            transition,
            sourceFound: !!source,
            targetFound: !!target
          })
          return null
        }

        return {
          ...transition,
          source,
          target
        }
      })
      .filter((link): link is D3Link => link !== null)

    console.log('Processed links:', links)

    return { nodes, links }
  }

  function updateSimulation(nodes: D3Node[], links: D3Link[]) {
    simulation.nodes(nodes)
    simulation.force<d3.ForceLink<D3Node, D3Link>>('link')?.links(links)
    simulation.alpha(1).restart()
  }

  function renderGraph(linksGroup: any, nodesGroup: any, links: D3Link[], nodes: D3Node[], data: any, selected: any) {
    // Add links
    const link = linksGroup
      .selectAll('.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', d => calculateLinkPath(d, data))
      .attr('marker-end', d => selected.value?.edge?.uuid === d.uuid ? 'url(#selected)' : 'url(#end)')

    // Add nodes
    const node = nodesGroup
      .selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
  }

  function calculateLinkPath(link: D3Link, data: any) {
    // Implement link path calculation logic here
    return ''
  }

  return {
    width,
    height,
    simulation,
    initSvg,
    processData,
    updateSimulation,
    renderGraph
  }
}
