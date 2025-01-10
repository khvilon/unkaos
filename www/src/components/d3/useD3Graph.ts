import * as d3 from 'd3'
import { ref, type Ref } from 'vue'
import type { D3Node, D3Link, WorkflowData } from './types'
import { formatNodeText, findNodeAtPosition } from './graphUtils'
import graph_math from '@/graph_math'

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

    // Standard arrow
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)  
      .attr('refY', 0)
      .attr('markerWidth', 3)  
      .attr('markerHeight', 3)  
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('class', 'arrow-head')

    // Selected arrow
    defs.append('marker')
      .attr('id', 'arrow-selected')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)  
      .attr('refY', 0)
      .attr('markerWidth', 3)  
      .attr('markerHeight', 3)  
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('class', 'arrow-head selected')

    // Hover arrow
    defs.append('marker')
      .attr('id', 'arrow-hover')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('class', 'arrow-head hover')

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
      y: node.y || Math.random() * height.value,
      r: 35
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

  function renderGraph(
    linksGroup: any, 
    nodesGroup: any, 
    links: D3Link[], 
    nodes: D3Node[], 
    data: WorkflowData,
    onNodeClick?: (node: D3Node) => void,
    onEdgeClick?: (link: D3Link) => void,
    onNodeDragEnd?: (node: D3Node) => void
  ) {
    // Add links
    const link = linksGroup.selectAll('.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('marker-end', 'url(#arrow)')  
      .attr('d', d => calculateLinkPath(d, data))
      .on('click', (event: Event, d: D3Link) => {
        event.stopPropagation()
        if (onEdgeClick) onEdgeClick(d)
      })

    // Add nodes with drag behavior
    const node = nodesGroup.selectAll('.conceptG')
      .data(nodes)
      .join('g')
      .attr('class', 'conceptG')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .call(d3.drag()
        .on('start', (event: any) => {
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
        })
        .on('drag', (event: any) => {
          event.subject.fx = event.x
          event.subject.fy = event.y
          // Update links during drag
          linksGroup.selectAll('.link')
            .attr('d', d => calculateLinkPath(d, data))
        })
        .on('end', (event: any) => {
          event.subject.fx = null
          event.subject.fy = null
          if (onNodeDragEnd) onNodeDragEnd(event.subject)
        }))
      .on('click', (event: Event, d: D3Node) => {
        event.stopPropagation()
        if (onNodeClick) onNodeClick(d)
      })

    // Add circles to nodes
    node.selectAll('circle')
      .data(d => [d])
      .join('circle')
      .attr('r', d => d.r)

    // Add text to nodes
    node.selectAll('text')
      .data(d => [d])
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .text(d => formatNodeText(d.issue_statuses[0]?.name || ''))

    return { link, node }
  }

  function calculateLinkPath(link: D3Link, data: WorkflowData): string {
    const source = { x: link.source.x, y: link.source.y }
    const target = { x: link.target.x, y: link.target.y }
    
    return graph_math.calc_edge_d(
      source,
      target,
      35,  // Используем тот же радиус что и для узлов
      isBidirectional(link, data)
    )
  }

  function isBidirectional(link: D3Link, data: WorkflowData): boolean {
    return data.transitions.some(t => 
      t.status_from_uuid === link.status_to_uuid && 
      t.status_to_uuid === link.status_from_uuid
    )
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
