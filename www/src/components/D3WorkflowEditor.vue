<script setup lang="ts">
import { ref, watch, onMounted, defineProps, defineEmits } from 'vue'
import * as d3 from 'd3'
import { useD3Graph } from './d3/useD3Graph'
import { calculateLinkPath, formatNodeText } from './d3/graphUtils'
import type { D3Node, D3Link, Selected, WorkflowData } from './d3/types'

const props = defineProps<{
  wdata: WorkflowData
}>()

const emit = defineEmits<{
  (e: 'update:node-position', value: { uuid: string; x: number; y: number }): void
}>()

// Refs
const svgContainer = ref<HTMLElement | null>(null)
const isEdgeCreationActive = ref(false)
const selected = ref<Selected>({
  node: null,
  edge: null
})

// Initialize D3 graph
const { initSvg, processData, updateSimulation } = useD3Graph(svgContainer)

function renderGraph() {
  console.log('Starting graph render with data:', props.wdata)

  if (!props.wdata) {
    console.warn('No data provided for graph')
    return
  }

  const { svg, g, linksGroup, nodesGroup } = initSvg()
  
  if (!svg || !g || !linksGroup || !nodesGroup) {
    console.error('Failed to initialize SVG elements')
    return
  }

  const { nodes, links } = processData(props.wdata)

  if (!nodes.length) {
    console.warn('No nodes to render')
    return
  }

  console.log('Rendering graph elements:', { nodes: nodes.length, links: links.length })

  // Add links
  const link = linksGroup.selectAll('.link')
    .data(links)
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('marker-end', 'url(#end)')
    .attr('d', d => calculateLinkPath(d, props.wdata))
    .on('click', (event, d) => {
      event.stopPropagation()
      selectEdge(d)
    })

  // Add nodes
  const node = nodesGroup.selectAll('.conceptG')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'conceptG')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))
    .on('click', (event, d) => {
      event.stopPropagation()
      selectNode(d)
    })

  // Add circles to nodes
  node.append('circle')
    .attr('r', 20)

  // Add text to nodes
  node.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .text(d => formatNodeText(d.issue_statuses[0]?.name || ''))

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  // Update simulation and selection
  updateSimulation(nodes, links)
  updateSelection()

  console.log('Graph render complete')
}

// Watch for data changes
watch(() => props.wdata, (newVal) => {
  console.log('wdata changed:', newVal)
  if (newVal) {
    renderGraph()
  }
}, { deep: true })

// Initialize on mount
onMounted(() => {
  console.log('Component mounted, initial render')
  renderGraph()
})

function selectNode(d: D3Node) {
  if (!isEdgeCreationActive.value) {
    selected.value = { node: d, edge: null }
    updateSelection()
  }
}

function selectEdge(d: D3Link) {
  if (!isEdgeCreationActive.value) {
    selected.value = { node: null, edge: d }
    updateSelection()
  }
}

function updateSelection() {
  const svg = d3.select(svgContainer.value).select('svg')

  // Update nodes
  svg.selectAll('.conceptG')
    .classed('selected', d => selected.value.node?.uuid === d.uuid)

  // Update links
  svg.selectAll('.link')
    .classed('selected', d => selected.value.edge?.uuid === d.uuid)
    .attr('marker-end', d => selected.value.edge?.uuid === d.uuid ? 'url(#selected)' : 'url(#end)')
}

function dragstarted(event: any) {
  event.subject.fx = event.subject.x
  event.subject.fy = event.subject.y
}

function dragged(event: any) {
  event.subject.fx = event.x
  event.subject.fy = event.y
  updateLinkPositions()
}

function dragended(event: any) {
  event.subject.fx = null
  event.subject.fy = null
  
  const node = event.subject
  emit('update:node-position', {
    uuid: node.uuid,
    x: node.x,
    y: node.y
  })
}

function updateLinkPositions() {
  d3.select(svgContainer.value)
    .select('svg')
    .selectAll('.link')
    .attr('d', d => calculateLinkPath(d, props.wdata))
}

function updateName(value: string) {
  if (selected.value.node) {
    selected.value.node.issue_statuses[0].name = value
  } else if (selected.value.edge) {
    selected.value.edge.name = value
  }
}

function createNode() {
  // Implement node creation logic
}

function handleStatusSelect(uuid: string) {
  // Implement status selection logic
}
</script>

<template>
  <div class="d3-workflows-editor">
    <div class="workflows-command-panel">
      <StringInput
        v-if="selected.node || selected.edge"
        label="Название статуса/перехода"
        :value="selected.node?.issue_statuses[0].name || selected.edge?.name"
        @update="updateName"
      />
      <BooleanInput
        label="Создание переходов"
        v-model="isEdgeCreationActive"
      />
      <KButton 
        name="Создать нод" 
        @click="createNode()"
      />
    </div>
    <div class="svg-container" ref="svgContainer">
      <div class="svg-wrapper">
        <!-- D3 will inject SVG here -->
      </div>
      <div class="controls">
        <KButton
          id="graph_zoom_in"
          name="+"
          @click="scale += 0.1"
        />
        <KButton
          id="graph_zoom_out"
          name="-"
          @click="scale -= 0.1"
        />
      </div>
      <div class="statuses-container">
        <div class="statuses-search-and-add">
          <KButton
            id="add-status-to-graph"
            name="Использовать статус"
            @click="createNode()"
          />
        </div>
        <table class="table-statuses">
          <thead>
            <tr>
              <th v-for="col in issue_statuses_collumns" :key="col.id">
                {{ col.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="status in issue_statuses" 
                :key="status.uuid" 
                @click="handleStatusSelect(status.uuid)"
                :class="{ selected: status.selected }">
              <td>
                <span>{{ status.name }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/css/global.scss';

:deep(.svg-workflow) {
  width: 100%;
  height: 100%;
  border-radius: var(--border-radius);
  background-color: var(--input-bg-color);
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  transition: all 0.2s ease;
  border: 2px inset var(--border-color);

  .link {
    fill: none;
    stroke: var(--text-color);
    stroke-width: 3px;
    cursor: pointer;

    &.selected {
      stroke: var(--selected-color);
    }

    &.dragline {
      pointer-events: none;

      &.hidden {
        stroke-width: 0;
      }
    }
  }

  .conceptG {
    cursor: pointer;

    circle {
      fill: var(--input-bg-color);
      stroke: var(--text-color);
      stroke-width: 2px;
    }

    text {
      fill: var(--text-color) !important;
      font-weight: 300;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serf;
      font-size: 14px;
      pointer-events: none;
      user-select: none;
      color: var(--text-color) !important;
    }

    &:hover circle {
      fill: var(--hover-color);
    }

    &.selected {
      circle {
        stroke: var(--selected-color);
      }
      text {
        fill: var(--selected-color) !important;
        color: var(--selected-color) !important;
      }
    }
  }

  marker {
    fill: var(--text-color);
    
    &#end path {
      fill: var(--text-color);
      stroke: none;
    }

    &#selected path {
      fill: var(--selected-color);
      stroke: none;
    }
  }
}

.d3-workflows-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;

  .workflows-command-panel {
    display: flex;
    flex-direction: row;
    height: 74px;
    align-items: flex-end;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);

    > *:not(:last-child) {
      margin-right: 20px;
    }

    .label {
      text-wrap: nowrap;
    }

    .string,
    .boolean {
      padding-top: 0px;
      margin-top: -12px;
      padding-left: 0px;
    }

    .string-input,
    .boolean-input {
      height: 28px;
    }

    .btn {
      margin-right: 20px;
    }
  }

  .svg-container {
    flex: 1;
    position: relative;
    display: flex;
    overflow: hidden;

    .svg-wrapper {
      flex: 1;
      position: relative;
    }

    .controls {
      position: absolute;
      right: 220px;
      bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .btn {
        width: 30px;
        height: 30px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .statuses-container {
      width: 200px;
      margin: 8px;
      display: flex;
      flex-direction: column;
      background: var(--input-bg-color);
      border: 2px inset var(--border-color);
      border-radius: var(--border-radius);

      .statuses-search-and-add {
        padding: 8px;
        border-bottom: 1px solid var(--border-color);
      }

      .table-statuses {
        flex: 1;
        width: 100%;
        border-collapse: collapse;
        
        th, td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }

        tbody tr {
          cursor: pointer;
          
          &:hover {
            background: var(--hover-color);
          }

          &.selected {
            background: var(--selected-bg-color);
            color: var(--selected-color);
          }
        }
      }
    }
  }
}
</style>
