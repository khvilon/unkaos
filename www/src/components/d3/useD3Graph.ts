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
    .force('charge', d3.forceManyBody()
      .strength(-1000)
      .distanceMax(150) // Максимальное расстояние действия силы отталкивания
      .theta(0.9)) // Увеличиваем точность расчетов
    .force('collision', d3.forceCollide()
      .radius(50) // Радиус коллизии чуть больше размера ноды
      .strength(0.9)) // Сила коллизии
    .velocityDecay(0.7)
    .alphaDecay(0.1)
    .on('tick', () => {
      if (!currentLinksGroup || !currentArrowsGroup || !currentNodesGroup || !currentData) return

      // Обновляем позиции при каждом тике simulation
      currentLinksGroup.selectAll('.link')
        .attr('d', (d: D3Link) => calculateLinkPath(d, currentData!))
      
      // Обновляем позиции стрелок
      currentArrowsGroup.selectAll('.arrow')
        .attr('transform', (d: D3Link) => {
          const triangle = calculateArrowTriangle(d, currentData!)
          return `translate(${triangle.x},${triangle.y}) rotate(${triangle.angle})`
        })
      
      currentNodesGroup.selectAll('.conceptG')
        .attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`)
    })

  // Храним текущие элементы для обновления в tick
  let currentLinksGroup: any = null
  let currentArrowsGroup: any = null
  let currentNodesGroup: any = null
  let currentData: WorkflowData | null = null
  let isDragging = false  // Флаг для отслеживания состояния перетаскивания
  let draggedElement: d3.Selection<any, any, any, any> | null = null // Сохраняем элемент, который перетаскиваем

  // Create new SVG
  function initSvg() {
    // Clear previous SVG
    d3.select(container.value).select('svg').remove()

    // Create new SVG
    const svg = d3.select(container.value)
      .append('svg')
      .attr('class', 'svg-workflow')
      .attr('width', '100%')
      .attr('height', '100%')

    // Create groups for graph elements
    const g = svg.append('g')
    const linksGroup = g.append('g').attr('class', 'links')
    const arrowsGroup = g.append('g').attr('class', 'arrows')
    const nodesGroup = g.append('g').attr('class', 'nodes')

    return { svg, g, linksGroup, arrowsGroup, nodesGroup }
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
    arrowsGroup: any, 
    nodesGroup: any, 
    links: D3Link[], 
    nodes: D3Node[], 
    data: WorkflowData,
    onNodeClick?: (node: D3Node) => void,
    onEdgeClick?: (link: D3Link) => void,
    onNodeDragEnd?: (node: D3Node) => void,
    isTransitionMode?: boolean
  ) {
    // Сохраняем текущие элементы
    currentLinksGroup = linksGroup
    currentArrowsGroup = arrowsGroup
    currentNodesGroup = nodesGroup
    currentData = data

    // Add links (without markers)
    const link = linksGroup.selectAll('.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', (d: D3Link) => {
        const path = calculateLinkPath(d, data)
        console.log('Creating path:', path, 'for link:', d.name)
        return path
      })
      .on('click', (event: Event, d: D3Link) => {
        event.stopPropagation()
        if (onEdgeClick) onEdgeClick(d)
      })

    // Add arrow triangles
    const arrows = arrowsGroup.selectAll('.arrow')
      .data(links)
      .join('path')
      .attr('class', 'arrow')
      .attr('d', 'M -8,-4 L 8,0 L -8,4 z')  // Треугольник 8px шириной
      .attr('fill', '#6366f1')
      .attr('stroke', 'none')
      .attr('transform', (d: D3Link) => {
        const triangle = calculateArrowTriangle(d, data)
        return `translate(${triangle.x},${triangle.y}) rotate(${triangle.angle})`
      })
      .on('click', (event: Event, d: D3Link) => {
        event.stopPropagation()
        if (onEdgeClick) onEdgeClick(d)
      })

    console.log('Created links:', link.size(), 'and arrows:', arrows.size())

    // Add nodes with drag behavior
    const node = nodesGroup.selectAll('.conceptG')
      .data(nodes)
      .join('g')
      .attr('class', (d: D3Node) => isTransitionMode ? 'conceptG transition-mode' : 'conceptG')
      .attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`)
      .on('click', (event: Event, d: D3Node) => {
        event.stopPropagation()
        if (onNodeClick) onNodeClick(d)
      })

    // Add drag behavior only if not in transition mode
    if (!isTransitionMode) {
      node.call(d3.drag<any, D3Node>()
        .on('start', (event: any) => {
          if (!event.active) {
            simulation.stop()
          }
          draggedElement = d3.select(event.sourceEvent.target.closest('.conceptG'))
          draggedElement.classed('dragging', true)
          
          event.subject.fx = event.x
          event.subject.fy = event.y
        })
        .on('drag', (event: any) => {
          if (!draggedElement) return
          
          event.subject.fx = event.x
          event.subject.fy = event.y
          event.subject.x = event.x
          event.subject.y = event.y
          
          draggedElement.attr('transform', `translate(${event.x},${event.y})`)
          
          // Update connected links
          linksGroup.selectAll('.link')
            .filter((d: D3Link) => d.source === event.subject || d.target === event.subject)
            .attr('d', (d: D3Link) => calculateLinkPath(d, data))
            
          // Update connected arrows
          arrowsGroup.selectAll('.arrow')
            .filter((d: D3Link) => d.source === event.subject || d.target === event.subject)
            .attr('transform', (d: D3Link) => {
              const triangle = calculateArrowTriangle(d, data)
              return `translate(${triangle.x},${triangle.y}) rotate(${triangle.angle})`
            })
        })
        .on('end', (event: any) => {
          if (!draggedElement) return
          
          draggedElement.classed('dragging', false)
          draggedElement = null
          
          event.subject.x = event.x
          event.subject.y = event.y
          event.subject.fx = null
          event.subject.fy = null
          
          if (onNodeDragEnd) onNodeDragEnd(event.subject)
          
          simulation.alpha(0.1).restart()
        }))
    }

    // Add circles to nodes
    node.selectAll('circle')
      .data((d: D3Node) => [d])
      .join('circle')
      .attr('r', 35)

    // Add text to nodes
    node.selectAll('text')
      .data((d: D3Node) => [d])
      .join('text')
      .attr('class', 'node-text')  // Добавляем CSS класс
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '10px')  // Уменьшаем размер шрифта
      .style('font-weight', '500')
      .style('fill', 'var(--text-color)')  // Добавляем цвет через стиль
      .each(function(this: SVGTextElement, d: D3Node) {
        const textElement = d3.select(this)
        textElement.selectAll('tspan').remove() // Очищаем предыдущие tspan
        
        const fullText = d.issue_statuses[0]?.name || 'Статус'
        const maxLineLength = 10  // Увеличиваем максимальную длину строки
        const words = fullText.split(' ')
        
        if (fullText.length <= maxLineLength) {
          // Короткий текст - одна строка
          textElement.text(fullText)
        } else {
          // Длинный текст - разбиваем на строки
          const lines: string[] = []
          let currentLine = ''
          
          words.forEach(word => {
            const testLine = currentLine ? currentLine + ' ' + word : word
            if (testLine.length <= maxLineLength) {
              currentLine = testLine
            } else {
              if (currentLine) {
                lines.push(currentLine)
                currentLine = word
              } else {
                // Если одно слово длиннее максимума - обрезаем
                lines.push(word.substring(0, maxLineLength - 1) + '…')
                currentLine = ''
              }
            }
          })
          
          if (currentLine) {
            lines.push(currentLine)
          }
          
          // Ограничиваем до 2 строк
          if (lines.length > 2) {
            lines[1] = lines[1].substring(0, maxLineLength - 1) + '…'
            lines.splice(2)
          }
          
          textElement.text('')
          lines.forEach((line, i) => {
            textElement.append('tspan')
              .attr('x', 0)
              .attr('dy', i === 0 ? '-0.3em' : '1.1em')  // Улучшаем позиционирование строк
              .text(line)
          })
        }
      })

    // Update simulation
    simulation.nodes(nodes)
    simulation.force<d3.ForceLink<D3Node, D3Link>>('link')?.links(links)
    simulation.alpha(1).restart()
  }

  function calculateLinkPath(link: D3Link, data: WorkflowData): string {
    return graph_math.calculate_link_path(link, data)
  }

  function isBidirectional(link: D3Link, data: WorkflowData): boolean {
    return graph_math.is_bidirectional_link(link, data)
  }

  // Calculate arrow triangle position and rotation
  function calculateArrowTriangle(link: D3Link, data: WorkflowData) {
    return graph_math.calculate_arrow_triangle(link, data)
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
