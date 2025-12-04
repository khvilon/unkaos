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
const selected = ref<Selected>({
  node: null,
  edge: null
})

// Initialize D3 graph
const { initSvg, processData, updateSimulation, renderGraph: renderD3Graph } = useD3Graph(svgContainer)

function renderGraph() {
  if (!props.wdata) {
    console.warn('No data provided for graph')
    return
  }

  const { svg, g, linksGroup, nodesGroup } = initSvg()
  
  if (!svg || !g || !linksGroup || !nodesGroup) {
    console.error('Failed to initialize SVG elements')
    return
  }

  // Add arrow markers
  const defs = svg.append('defs')
  
  // Default arrow
  defs.append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 24)
    .attr('refY', 0)
    .attr('markerWidth', 3.5)
    .attr('markerHeight', 3.5)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('class', 'arrow-head')

  // Selected arrow
  defs.append('marker')
    .attr('id', 'arrow-selected')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 24)
    .attr('refY', 0)
    .attr('markerWidth', 3.5)
    .attr('markerHeight', 3.5)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('class', 'arrow-head selected')

  // Hover arrow
  defs.append('marker')
    .attr('id', 'arrow-hover')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 24)
    .attr('refY', 0)
    .attr('markerWidth', 3.5)
    .attr('markerHeight', 3.5)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('class', 'arrow-head hover')

  const { nodes, links } = processData(props.wdata)

  if (!nodes.length) {
    console.warn('No nodes to render')
    return
  }

  // Render graph using the function from useD3Graph
  renderD3Graph(
    linksGroup,
    nodesGroup,
    links,
    nodes,
    props.wdata,
    selectNode,
    selectEdge,
    (node) => {
      emit('update:node-position', {
        uuid: node.uuid,
        x: node.x,
        y: node.y
      })
    }
  )

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
}

// Watch for data changes
watch(() => props.wdata, (newVal) => {
  if (newVal) {
    renderGraph()
  }
}, { deep: true })

// Initialize on mount
onMounted(() => {
  renderGraph()
})

function selectNode(d: D3Node) {
  selected.value = { node: d, edge: null }
  updateSelection()
}

function selectEdge(d: D3Link) {
  selected.value = { node: null, edge: d }
  updateSelection()
}

function updateSelection() {
  const svg = d3.select(svgContainer.value).select('svg')

  // Update nodes
  svg.selectAll('.conceptG')
    .classed('selected', (d: any) => d && selected.value.node?.uuid === d.uuid)

  // Update links
  svg.selectAll('.link')
    .classed('selected', (d: any) => d && selected.value.edge?.uuid === d.uuid)
    .attr('marker-end', (d: any) => d && selected.value.edge?.uuid === d.uuid ? 'url(#arrow-selected)' : 'url(#arrow)')
}

function updateName(value: string) {
  if (selected.value.node) {
    selected.value.node.issue_statuses[0].name = value
  } else if (selected.value.edge) {
    selected.value.edge.name = value
  }
}

function createNode() {
  const newNode: D3Node = {
    uuid: crypto.randomUUID(),
    x: Math.random() * 500,
    y: Math.random() * 500,
    issue_statuses: [{
      uuid: crypto.randomUUID(),
      name: 'Новый статус'
    }]
  }
  props.wdata.workflow_nodes.push(newNode)
  renderGraph()
}

function createTransition(fromUuid: string, toUuid: string) {
  const newTransition = {
    uuid: crypto.randomUUID(),
    name: 'Новый переход',
    status_from_uuid: fromUuid,
    status_to_uuid: toUuid
  }
  props.wdata.transitions.push(newTransition)
  renderGraph()
}

function deleteSelected() {
  if (selected.value.node) {
    const idx = props.wdata.workflow_nodes.findIndex(n => n.uuid === selected.value.node?.uuid)
    if (idx !== -1) {
      // Remove node and all its transitions
      props.wdata.workflow_nodes.splice(idx, 1)
      props.wdata.transitions = props.wdata.transitions.filter(t => 
        t.status_from_uuid !== selected.value.node?.issue_statuses[0].uuid &&
        t.status_to_uuid !== selected.value.node?.issue_statuses[0].uuid
      )
    }
  } else if (selected.value.edge) {
    const idx = props.wdata.transitions.findIndex(t => t.uuid === selected.value.edge?.uuid)
    if (idx !== -1) {
      props.wdata.transitions.splice(idx, 1)
    }
  }
  selected.value = { node: null, edge: null }
  renderGraph()
}
</script>

<template>
  <div class="d3-workflows-editor">
    <div class="workflows-command-panel">
      <!-- Selected item editor -->
      <div v-if="selected.node || selected.edge" class="editor-section">
        <StringInput
          label="Название"
          :value="selected.node?.issue_statuses[0].name || selected.edge?.name"
          @update="updateName"
          class="editor-input"
        />
        <KButton 
          name="Удалить" 
          @click="deleteSelected"
          class="editor-button"
        />
      </div>

      <!-- Node creation -->
      <div class="editor-section">
        <KButton 
          name="Добавить статус" 
          @click="createNode"
          class="editor-button primary"
        />
      </div>

      <!-- Transition creation -->
      <div v-if="selected.node" class="editor-section">
        <div class="section-title">Создать переход из "{{ selected.node.issue_statuses[0].name }}" в:</div>
        <div class="transitions-list">
          <div v-for="node in wdata.workflow_nodes" 
               :key="node.uuid"
               class="transition-item"
               v-show="node.uuid !== selected.node?.uuid">
            <KButton 
              :name="node.issue_statuses[0].name"
              @click="createTransition(selected.node.issue_statuses[0].uuid, node.issue_statuses[0].uuid)"
              class="editor-button secondary"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="svg-container" ref="svgContainer">
      <div class="svg-wrapper">
        <!-- D3 will inject SVG here -->
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.d3-workflows-editor {
  display: flex !important;
  height: 100% !important;
  width: 100% !important;
  min-height: 400px !important;
  max-height: none !important;
  background: var(--bg-color) !important;
  border-radius: var(--border-radius) !important;
  overflow: hidden !important;
  position: relative !important;
  border: 1px solid var(--border-color) !important;
  margin: 0 !important;
  padding: 0 !important;

  .workflows-command-panel {
    min-width: 280px !important;
    max-width: 320px !important;
    width: 300px !important;
    height: 100% !important;
    padding: 16px !important;
    border-right: 2px solid var(--border-color) !important;
    background: var(--panel-bg-color) !important;
    overflow-y: auto !important;
    flex-shrink: 0 !important;
    z-index: 1 !important;
    position: relative !important;

    .editor-section {
      margin-bottom: 24px !important;
      padding-bottom: 16px !important;
      border-bottom: 1px solid var(--border-color) !important;

      &:last-child {
        border-bottom: none !important;
      }

      .editor-input {
        margin-bottom: 12px !important;
      }

      .editor-button {
        width: 100% !important;
        margin-bottom: 8px !important;
        height: 32px !important;

        &.primary {
          background: var(--primary-color) !important;
          color: white !important;
        }

        &.secondary {
          background: var(--bg-color) !important;
          border: 1px solid var(--border-color) !important;
          
          &:hover {
            background: var(--hover-color) !important;
          }
        }
      }
    }

    .section-title {
      font-size: 14px !important;
      font-weight: 500 !important;
      margin-bottom: 12px !important;
      color: var(--text-color) !important;
    }

    .transitions-list {
      max-height: 300px !important;
      overflow-y: auto !important;
      padding-right: 8px !important;

      .transition-item {
        margin-bottom: 8px !important;

        &:last-child {
          margin-bottom: 0 !important;
        }
      }
    }
  }

  .svg-container {
    flex: 1 !important;
    position: relative !important;
    overflow: hidden !important;
    background: var(--input-bg-color) !important;
    border-radius: var(--border-radius) !important;
    margin: 8px !important;
    min-width: 0 !important;
    height: calc(100% - 16px) !important;

    .svg-wrapper {
      width: 100% !important;
      height: 100% !important;
      position: relative !important;
    }
  }

  :deep(.svg-workflow) {
    width: 100%;
    height: 100%;
    background-color: var(--input-bg-color);
    border-radius: var(--border-radius);
    user-select: none;

    .link {
      fill: none;
      stroke: var(--workflow-marker-color);
      stroke-width: 3px;
      cursor: pointer;
      transition: all 0.05s ease;

      &.selected {
        stroke: var(--workflow-g-selected-color);
      }

      &:hover {
        stroke: var(--workflow-g-hover-color);
      }
    }

    .arrow-head {
      fill: var(--workflow-marker-color);
      stroke: none;

      &.selected {
        fill: var(--workflow-g-selected-color);
      }

      &.hover {
        fill: var(--workflow-g-hover-color);
      }
    }

    .conceptG {
      cursor: grab;

      &:active {
        cursor: grabbing;
      }

      &.selected circle {
        stroke: var(--workflow-g-selected-color);
        stroke-width: 4px;
      }

      circle {
        fill: var(--workflow-g-fill-color);
        stroke: var(--workflow-marker-color);
        stroke-width: 2px;
        transition: all 0.05s ease;

        &:hover {
          fill: var(--workflow-g-hover-fill-color);
          stroke: var(--workflow-g-hover-color);
        }
      }

      text {
        fill: var(--text-color);
        font-size: 14px;
        font-weight: 500;
        pointer-events: none;
      }
    }
  }
}
</style>
