<script setup lang="ts">
import { ref, watch, onMounted, defineProps, defineEmits } from 'vue'
import * as d3 from 'd3'
import { useD3Graph } from './d3/useD3Graph'
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

  const { svg, g, linksGroup, arrowsGroup, nodesGroup } = initSvg()
  
  if (!svg || !g || !linksGroup || !arrowsGroup || !nodesGroup) {
    console.error('Failed to initialize SVG elements')
    return
  }

  const { nodes, links } = processData(props.wdata)

  if (!nodes.length) {
    console.warn('No nodes to render')
    return
  }

  // Render graph using the function from useD3Graph
  renderD3Graph(
    linksGroup,
    arrowsGroup,
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
    
  // Update arrows
  svg.selectAll('.arrow')
    .classed('selected', (d: any) => d && selected.value.edge?.uuid === d.uuid)
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
  <div class="simple-workflow-editor">
    <!-- Левая панель с инструментами -->
    <div class="editor-sidebar">
      <div class="sidebar-section">
        <h4>Управление</h4>
        <button class="btn btn-primary" @click="createNode">
          Добавить статус
        </button>
      </div>

      <!-- Редактирование выбранного элемента -->
      <div v-if="selected.node || selected.edge" class="sidebar-section">
        <h4>Редактирование</h4>
        <div class="form-group">
          <label>Название:</label>
          <input 
            type="text" 
            :value="selected.node?.issue_statuses[0].name || selected.edge?.name"
            @input="updateName($event.target.value)"
            class="form-input"
          />
        </div>
        <button class="btn btn-danger" @click="deleteSelected">
          Удалить
        </button>
      </div>

      <!-- Создание переходов -->
      <div v-if="selected.node" class="sidebar-section">
        <h4>Переходы</h4>
        <p class="section-hint">Создать переход из "{{ selected.node.issue_statuses[0].name }}" в:</p>
        <div class="transitions-grid">
          <button 
            v-for="node in wdata.workflow_nodes" 
            :key="node.uuid"
            v-show="node.uuid !== selected.node?.uuid"
            class="btn btn-outline"
            @click="createTransition(selected.node.issue_statuses[0].uuid, node.issue_statuses[0].uuid)"
          >
            {{ node.issue_statuses[0].name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Правая панель с графом -->
    <div class="editor-canvas">
      <div class="canvas-container" ref="svgContainer">
        <!-- D3 SVG будет вставлен сюда -->
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.simple-workflow-editor {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: var(--bg-color);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.editor-sidebar {
  width: 320px;
  min-width: 320px;
  background: var(--panel-bg-color);
  border-right: 2px solid var(--border-color);
  padding: 20px;
  overflow-y: auto;
  
  .sidebar-section {
    margin-bottom: 30px;
    
    h4 {
      margin: 0 0 15px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 8px;
    }
    
    .section-hint {
      font-size: 14px;
      color: var(--text-secondary-color);
      margin-bottom: 12px;
      line-height: 1.4;
    }
  }
  
  .form-group {
    margin-bottom: 15px;
    
    label {
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
    }
    
    .form-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--input-bg-color);
      color: var(--text-color);
      font-size: 14px;
      
      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
    }
  }
  
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.btn-primary {
      background: var(--primary-color);
      color: white;
      
      &:hover {
        opacity: 0.9;
      }
    }
    
    &.btn-danger {
      background: #dc3545;
      color: white;
      
      &:hover {
        background: #c82333;
      }
    }
    
    &.btn-outline {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      margin-bottom: 8px;
      width: 100%;
      text-align: left;
      
      &:hover {
        background: var(--hover-color);
      }
    }
  }
  
  .transitions-grid {
    max-height: 300px;
    overflow-y: auto;
  }
}

.editor-canvas {
  flex: 1;
  background: var(--input-bg-color);
  position: relative;
  
  .canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
  }
}

// D3 стили для SVG
:deep(.svg-workflow) {
  width: 100%;
  height: 100%;
  background-color: var(--input-bg-color);
  user-select: none;

  .link {
    fill: none;
    stroke: #6366f1;
    stroke-width: 3px;
    cursor: pointer;
    transition: all 0.05s ease;

    &.selected {
      stroke: #3b82f6;
    }

    &:hover {
      stroke: #8b5cf6;
    }
  }

  .arrow {
    fill: #6366f1;
    cursor: pointer;
    transition: all 0.05s ease;

    &.selected {
      fill: #3b82f6;
    }

    &:hover {
      fill: #8b5cf6;
    }
  }

  .conceptG {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    &.selected circle {
      stroke: #3b82f6;
      stroke-width: 4px;
    }

    circle {
      fill: transparent;
      stroke: #6366f1;
      stroke-width: 2px;
      transition: all 0.05s ease;

      &:hover {
        fill: rgba(99, 102, 241, 0.1);
        stroke: #8b5cf6;
      }
    }

    text {
      fill: #1e293b;
      font-size: 12px;
      font-weight: 500;
      pointer-events: none;
    }
  }
}
</style> 