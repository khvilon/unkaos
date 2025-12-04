<script setup lang="ts">
import { ref, watch, onMounted, defineProps, defineEmits, computed, onBeforeMount, nextTick } from 'vue'
import * as d3 from 'd3'
import { useD3Graph } from './d3/useD3Graph'
import type { D3Node, D3Link, Selected, WorkflowData } from './d3/types'
import { useStore } from 'vuex'
import store_helper from '../store_helper'
import KButton from './KButton.vue'

const props = defineProps<{
  wdata: WorkflowData
  inputs?: Array<any>
  workflowSelected?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:node-position', value: { uuid: string; x: number; y: number }): void
  (e: 'cancel'): void
}>()

// Store
const store = useStore()

// Refs
const svgContainer = ref<HTMLElement | null>(null)
const selected = ref<Selected>({
  node: null,
  edge: null
})
const isTransitionCreationMode = ref(false)
const draggedNode = ref<D3Node | null>(null)
const searchQuery = ref('')
const zoomLevel = ref(100)
let d3Zoom: any = null
let d3Svg: any = null

// Computed
const issueStatuses = computed(() => store.getters.get_issue_statuses || [])
const selectedIssueStatus = computed(() => store.getters.selected_issue_statuses)

// Доступные статусы для добавления (те которых еще нет в схеме)
const availableStatuses = computed(() => {
  if (!props.wdata?.workflow_nodes) return issueStatuses.value
  
  const usedStatusUuids = props.wdata.workflow_nodes.map(node => 
    node.issue_statuses[0]?.uuid
  ).filter(Boolean)
  
  return issueStatuses.value.filter(status => 
    !usedStatusUuids.includes(status.uuid)
  )
})

const filteredStatuses = computed(() => {
  let statuses = availableStatuses.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    statuses = statuses.filter(s => s.name.toLowerCase().includes(query))
  }
  return statuses
})

// Initialize store module for issue_statuses if not exists
onBeforeMount(() => {
  const name = "issue_statuses"
  if (!store.state[name]) {
    const store_module = store_helper.create_module(name, "")
    store.registerModule(name, store_module)
  }
})

onMounted(() => {
  store.dispatch("get_issue_statuses")
  renderGraph()
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
  
  // Добавляем data-testid к SVG элементу
  svg.attr('data-testid', 'svg-workflow')
  
  // Добавляем data-testid к группам
  linksGroup.attr('data-testid', 'workflow-links')
  arrowsGroup.attr('data-testid', 'workflow-arrows')
  nodesGroup.attr('data-testid', 'workflow-nodes')
  
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
      // Обновляем позицию узла в исходных данных (округляем до целых для PostgreSQL INTEGER)
      const originalNode = props.wdata.workflow_nodes.find(n => n.uuid === node.uuid)
      if (originalNode) {
        originalNode.x = Math.round(node.x)
        originalNode.y = Math.round(node.y)
        console.log('Updated node position:', originalNode.uuid, originalNode.x, originalNode.y)
      }
      
      emit('update:node-position', {
        uuid: node.uuid,
        x: node.x,
        y: node.y
      })
    },
    isTransitionCreationMode.value
  )

  // Add zoom behavior
  d3Svg = svg
  d3Zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event: any) => {
      g.attr('transform', event.transform)
      zoomLevel.value = Math.round(event.transform.k * 100)
    })

  svg.call(d3Zoom)

  // Add transition creation behavior if in transition mode
  if (isTransitionCreationMode.value) {
    addTransitionCreationBehavior(svg, g, nodesGroup)
  }

  // Update simulation and selection
  updateSimulation(nodes, links)
  updateSelection()
  
  // Добавляем data-testid атрибуты к созданным элементам
  addDataTestIds(nodesGroup, linksGroup)
}

// Функция для добавления data-testid атрибутов к D3 элементам
function addDataTestIds(nodesGroup: any, linksGroup: any) {
  // Добавляем data-testid к узлам
  nodesGroup.selectAll('.conceptG')
    .attr('data-testid', (d: D3Node) => `canvas-status-${d.issue_statuses[0]?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`)
  
  // Добавляем data-testid к кругам узлов
  nodesGroup.selectAll('.conceptG circle')
    .attr('data-testid', (d: D3Node) => `canvas-status-circle-${d.issue_statuses[0]?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`)
  
  // Добавляем data-testid к тексту узлов
  nodesGroup.selectAll('.conceptG text')
    .attr('data-testid', (d: D3Node) => `canvas-status-text-${d.issue_statuses[0]?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`)
  
  // Добавляем data-testid к связям
  linksGroup.selectAll('.link')
    .attr('data-testid', (d: D3Link) => `canvas-transition-${d.source?.issue_statuses[0]?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}-to-${d.target?.issue_statuses[0]?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`)
}

function addTransitionCreationBehavior(svg: any, g: any, nodesGroup: any) {
  // Add marker for dragline arrow
  let defs = svg.select('defs')
  if (defs.empty()) {
    defs = svg.append('defs')
  }
  
  let draglineMarker = defs.select('#dragline-marker')
  if (draglineMarker.empty()) {
    draglineMarker = defs.append('marker')
      .attr('id', 'dragline-marker')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#6366f1')
  }

  // Add dragline for visual feedback
  let dragline = g.select('.dragline')
  if (dragline.empty()) {
    dragline = g.append('path')
      .attr('class', 'dragline hidden')
      .attr('d', 'M0,0L0,0')
      .style('stroke', '#6366f1')
      .style('stroke-width', '2px')
      .style('stroke-dasharray', '5,5')
      .style('fill', 'none')
      .style('pointer-events', 'none')
      .attr('marker-end', 'url(#dragline-marker)')
  }

  // Remove existing transition events
  nodesGroup.selectAll('.conceptG')
    .on('mousedown.transition', null)
    .on('mouseup.transition', null)

  // Add mouse events for transition creation
  nodesGroup.selectAll('.conceptG')
    .on('mousedown.transition', function(event: MouseEvent, d: D3Node) {
      if (!isTransitionCreationMode.value) return
      
      event.stopPropagation()
      event.preventDefault()
      draggedNode.value = d
      
      // Начальная позиция - скрытая линия в центре узла
      dragline
        .classed('hidden', true)
        .attr('d', `M${d.x},${d.y}L${d.x},${d.y}`)
    })
    .on('mouseup.transition', function(event: MouseEvent, d: D3Node) {
      if (!isTransitionCreationMode.value || !draggedNode.value) return
      
      event.stopPropagation()
      event.preventDefault()
      
      // Don't create self-loop
      if (draggedNode.value.uuid === d.uuid) {
        resetTransitionCreation(dragline)
        return
      }
      
      // Create transition
      createTransitionBetweenNodes(
        draggedNode.value.issue_statuses[0].uuid,
        d.issue_statuses[0].uuid
      )
      
      resetTransitionCreation(dragline)
    })

  // Add global mouse events without throttling for immediate response
  svg.on('mousemove.transition', function(event: MouseEvent) {
    if (!isTransitionCreationMode.value || !draggedNode.value) return
    
    const [mouseX, mouseY] = d3.pointer(event, g.node())
    const dx = mouseX - draggedNode.value.x
    const dy = mouseY - draggedNode.value.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const radius = 35
    
    // Не рисуем линию если мышь слишком близко к центру узла
    if (distance < radius + 10) {
      dragline.classed('hidden', true)
      return
    }
    
    // Вычисляем точку на краю кружка
    const edgeX = draggedNode.value.x + (dx / distance) * radius
    const edgeY = draggedNode.value.y + (dy / distance) * radius
    
    dragline
      .classed('hidden', false)
      .attr('d', `M${edgeX},${edgeY}L${mouseX},${mouseY}`)
  })
  .on('mouseup.transition', function() {
    if (!isTransitionCreationMode.value) return
    resetTransitionCreation(dragline)
  })
  .on('mouseleave.transition', function() {
    if (!isTransitionCreationMode.value) return
    resetTransitionCreation(dragline)
  })
}

function resetTransitionCreation(dragline: any) {
  draggedNode.value = null
  dragline.classed('hidden', true)
}

function createTransitionBetweenNodes(fromUuid: string, toUuid: string) {
  // Check if transition already exists
  const existingTransition = props.wdata.transitions.find(t => 
    t.status_from_uuid === fromUuid && t.status_to_uuid === toUuid
  )
  
  if (existingTransition) {
    console.warn('Transition already exists')
    return
  }
  
  const fromNode = props.wdata.workflow_nodes.find(n => 
    n.issue_statuses[0]?.uuid === fromUuid
  )
  const toNode = props.wdata.workflow_nodes.find(n => 
    n.issue_statuses[0]?.uuid === toUuid
  )
  
  if (!fromNode || !toNode) {
    console.error('Could not find nodes for transition')
    return
  }
  
  const newTransition = {
    uuid: crypto.randomUUID(),
    name: `${fromNode.issue_statuses[0].name} → ${toNode.issue_statuses[0].name}`,
    status_from_uuid: fromUuid,
    status_to_uuid: toUuid,
    table_name: 'transitions',
    workflows_uuid: props.wdata.uuid
  }
  
  props.wdata.transitions.push(newTransition)
  renderGraph()
}

function addStatusToWorkflow(statusUuid: string) {
  const status = issueStatuses.value.find(s => s.uuid === statusUuid)
  if (!status) {
    console.error('Status not found')
    return
  }
  
  // Check if status already exists in workflow
  const existingNode = props.wdata.workflow_nodes.find(n => 
    n.issue_statuses[0]?.uuid === statusUuid
  )
  
  if (existingNode) {
    console.warn('Status already exists in workflow')
    return
  }
  
  const newNode: D3Node = {
    uuid: crypto.randomUUID(),
    x: Math.round(Math.random() * 400 + 100),
    y: Math.round(Math.random() * 300 + 100),
    issue_statuses: [status],
    // для апсерта
    // @ts-ignore
    table_name: 'workflow_nodes',
    // @ts-ignore
    workflows_uuid: props.wdata.uuid,
    // @ts-ignore
    issue_statuses_uuid: status.uuid
  }
  
  console.log('ADD_STATUS debug:', {
    newNode,
    wdata_uuid: props.wdata.uuid,
    workflow_nodes_before: props.wdata.workflow_nodes.length
  })
  
  props.wdata.workflow_nodes.push(newNode)
  
  console.log('ADD_STATUS after push:', {
    workflow_nodes_after: props.wdata.workflow_nodes.length,
    workflow_nodes: props.wdata.workflow_nodes
  })
  
  renderGraph()
}

// Watch for data changes
watch(() => props.wdata, (newVal) => {
  if (newVal) {
    renderGraph()
  }
}, { deep: true })

// Watch for wdata changes and update store (like in old WorkflowsEditor)
watch(() => props.wdata, (val, oldVal) => {
  if (val) {
    store.commit("id_push_update_workflows", { id: "", val: val })
  }
}, { deep: true })

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

function createTransition(fromUuid: string, toUuid: string) {
  createTransitionBetweenNodes(fromUuid, toUuid)
}

function getFieldValue(fieldId: string): string {
  if (!props.wdata || !fieldId) return ''
  return props.wdata[fieldId] || ''
}

function updateField(fieldId: string, value: string) {
  if (!props.wdata || !fieldId) return
  props.wdata[fieldId] = value
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function handleSave() {
  // Вызываем экшен без параметров, так как данные уже в сторе (обновляются через watcher)
  const result = await store.dispatch('save_workflows')
  console.log('Save result:', result)
  emit('cancel')
}

async function handleDelete() {
  const result = await store.dispatch('delete_workflows')
  console.log('Delete result:', result)
  emit('cancel')
}

function handleCancel() {
  emit('cancel')
}

function zoomIn() {
  if (!d3Svg || !d3Zoom) return
  d3Svg.transition().duration(300).call(d3Zoom.scaleBy, 1.2)
}

function zoomOut() {
  if (!d3Svg || !d3Zoom) return
  d3Svg.transition().duration(300).call(d3Zoom.scaleBy, 0.8)
}

function zoomFit() {
  if (!d3Svg || !d3Zoom) return
  d3Svg.transition().duration(750).call(d3Zoom.transform, d3.zoomIdentity)
}
</script>

<template>
  <div class="simple-workflow-editor" data-testid="simple-workflow-editor">
    <!-- Левая панель с инструментами -->
    <div class="editor-sidebar" data-testid="editor-sidebar">
      <div class="sidebar-header">
        <h3>Редактор воркфлоу</h3>
      </div>

      <div class="sidebar-content">
        <!-- Свойства воркфлоу -->
        <div class="sidebar-section">
          <div class="form-group" v-for="(input, index) in inputs" :key="index">
            <label v-if="input.type === 'String'">{{ input.label }}</label>
            <input 
              v-if="input.type === 'String'"
              type="text" 
              :value="getFieldValue(input.id)"
              @input="updateField(input.id, $event.target.value)"
              class="form-input"
              :disabled="input.disabled"
              :data-testid="`workflow-${input.id}`"
              placeholder="Введите название..."
            />
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Редактирование выбранного элемента -->
        <div v-if="selected.node || selected.edge" class="sidebar-section selected-element-section">
          <div class="section-header">
            <h4>{{ selected.node ? 'Статус' : 'Переход' }}</h4>
            <button class="icon-btn danger" @click="deleteSelected" title="Удалить">
              <i class='bx bx-trash'></i>
            </button>
        </div>

          <div class="form-group">
            <label>Название</label>
            <div class="input-with-icon">
            <input 
              type="text" 
              :value="selected.node?.issue_statuses[0].name || selected.edge?.name"
              @input="updateName($event.target.value)"
              class="form-input"
              :disabled="!!selected.node"
              data-testid="selected-element-name"
            />
              <i v-if="selected.node" class='bx bx-lock-alt' title="Изменяется в настройках статусов"></i>
              <i v-else class='bx bx-edit-alt'></i>
            </div>
            <p class="input-hint" v-if="selected.node">
              Имя статуса меняется в справочнике статусов
            </p>
          </div>
        </div>

        <!-- Палитра статусов -->
        <div class="sidebar-section statuses-section" v-else>
          <div class="section-header">
            <h4>Добавить статус</h4>
            <span class="badge" v-if="availableStatuses.length">{{ availableStatuses.length }}</span>
          </div>
          
          <div class="search-box" v-if="availableStatuses.length > 5 || searchQuery">
            <i class='bx bx-search'></i>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Найти статус..."
              class="search-input"
            />
            <i v-if="searchQuery" class='bx bx-x' @click="searchQuery = ''" style="cursor: pointer"></i>
          </div>

          <div class="statuses-list" data-testid="statuses-grid">
            <div 
              v-for="status in filteredStatuses" 
              :key="status.uuid"
              @click="addStatusToWorkflow(status.uuid)"
              class="status-item"
              :data-testid="`status-${status.name.toLowerCase().replace(/\s+/g, '-')}`"
            >
              <div class="status-icon">
                <i class='bx bx-circle'></i>
              </div>
              <span class="status-name">{{ status.name }}</span>
              <i class='bx bx-plus'></i>
            </div>
            
            <div v-if="filteredStatuses.length === 0 && availableStatuses.length > 0" class="empty-state">
              Ничего не найдено
            </div>
            <div v-if="availableStatuses.length === 0" class="empty-state">
              Все статусы добавлены
            </div>
          </div>
        </div>
      </div>
      
      <!-- Футер с кнопками -->
      <div class="sidebar-footer">
        <div class="footer-actions">
          <button 
            class="action-btn primary"
            @click="handleSave"
          data-testid="save-workflow"
          >
            <i class='bx bx-save'></i>
            {{ workflowSelected ? 'Сохранить' : 'Создать' }}
          </button>
          
          <button 
            class="action-btn secondary"
          @click="handleCancel"
          data-testid="cancel-workflow"
          >
            Отмена
          </button>
        </div>
        
        <button 
          v-if="workflowSelected"
          class="action-btn danger-text"
          @click="handleDelete"
          data-testid="delete-workflow"
        >
          <i class='bx bx-trash'></i> Удалить воркфлоу
        </button>
      </div>
    </div>

    <!-- Правая панель с графом -->
    <div class="editor-canvas" data-testid="editor-canvas">
      <!-- Тулбар инструментов -->
      <div class="canvas-toolbar">
        <div class="toolbar-group mode-group">
          <button 
            class="tool-btn" 
            :class="{ active: !isTransitionCreationMode }"
            @click="isTransitionCreationMode = false; renderGraph()"
            title="Перемещение (V)"
          >
            <i class='bx bx-move'></i>
          </button>
          <button 
            class="tool-btn" 
            :class="{ active: isTransitionCreationMode }"
            @click="isTransitionCreationMode = true; renderGraph()"
            title="Связи (C)"
          >
            <i class='bx bx-share-alt'></i>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group zoom-group">
          <button class="tool-btn" @click="zoomOut" title="Zoom Out">
            <i class='bx bx-zoom-out'></i>
          </button>
          <span class="zoom-level">{{ zoomLevel }}%</span>
          <button class="tool-btn" @click="zoomIn" title="Zoom In">
            <i class='bx bx-zoom-in'></i>
          </button>
          <button class="tool-btn" @click="zoomFit" title="Reset Zoom">
            <i class='bx bx-reset'></i>
          </button>
        </div>
      </div>

      <div class="canvas-info" v-if="isTransitionCreationMode">
        <i class='bx bx-info-circle'></i>
        Перетащите от одного статуса к другому для создания связи
      </div>

      <div class="canvas-container" ref="svgContainer" data-testid="workflow-canvas">
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
  overflow: hidden;
  color: var(--text-color);
}

.editor-sidebar {
  width: 300px;
  min-width: 300px;
  background: var(--panel-bg-color);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  z-index: 10;
  
  .sidebar-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
      
    h3 {
      margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-color);
    }
  }
  
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
    
  .sidebar-section {
    padding: 20px;
      
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-secondary-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .badge {
        background: var(--border-color);
        color: var(--text-secondary-color);
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
        }
      
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: var(--text-secondary-color);
        transition: all 0.2s;
        
        &:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text-color);
        }
        
        &.danger:hover {
          color: #dc3545;
          background: rgba(220, 53, 69, 0.1);
        }
        
        i {
          font-size: 18px;
        }
      }
    }
  }
  
  .sidebar-divider {
    height: 1px;
    background: var(--border-color);
    margin: 0;
  }
  
  .statuses-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .search-box {
      position: relative;
      margin-bottom: 12px;
      
      i {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary-color);
        font-size: 16px;
        
        &:first-child {
          left: 10px;
        }
        
        &:last-child {
          right: 10px;
          cursor: pointer;
        }
    }
    
      .search-input {
      width: 100%;
        padding: 8px 32px 8px 34px;
      border: 1px solid var(--border-color);
        border-radius: 6px;
      background: var(--input-bg-color);
      color: var(--text-color);
        font-size: 13px;
      
      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
      }
    }
    
    .statuses-list {
      flex: 1;
      overflow-y: auto;
      padding-right: 4px; // space for scrollbar
      
      .status-item {
    display: flex;
    align-items: center;
        padding: 8px 12px;
        margin-bottom: 6px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
    cursor: pointer;
        transition: all 0.2s ease;
        background: var(--panel-bg-color);
        
        &:hover {
          background: var(--hover-color);
          transform: translateX(2px);
          
          .bx-plus {
            opacity: 1;
            color: var(--primary-color);
          }
        }
        
        .status-icon {
          margin-right: 10px;
          color: var(--text-secondary-color);
          font-size: 16px;
          display: flex;
    }
    
        .status-name {
          flex: 1;
          font-size: 13px;
      font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .bx-plus {
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 16px;
    }
  }
  
      .empty-state {
        text-align: center;
        padding: 20px;
        color: var(--text-secondary-color);
        font-size: 13px;
        font-style: italic;
      }
    }
  }
  
  .selected-element-section {
    background: rgba(var(--primary-rgb), 0.05);
    border-left: 3px solid var(--primary-color);
  }
  
  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border-color);
    background: var(--panel-bg-color);
    
    .footer-actions {
    display: flex;
      gap: 10px;
      margin-bottom: 10px;
      
      .action-btn {
        flex: 1;
        display: flex;
        justify-content: center;
    align-items: center;
        gap: 6px;
        padding: 8px 16px;
    border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s;
        
        &.primary {
          background: var(--primary-color);
          color: white;
    
    &:hover {
            opacity: 0.9;
    }
    }
    
        &.secondary {
          background: transparent;
          border-color: var(--border-color);
      color: var(--text-color);
    
          &:hover {
            background: var(--hover-color);
          }
      }
    }
  }
  
    .action-btn.danger-text {
      width: 100%;
      display: block;
      padding: 8px 16px;
      color: var(--text-secondary-color);
      font-size: 12px;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
      background: transparent;
      border: none;
      
      &:hover {
        color: #dc3545;
        background: rgba(220, 53, 69, 0.05);
        border-radius: 4px;
      }
    }
  }
  
  .form-group {
    margin-bottom: 12px;
    
    label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary-color);
      text-transform: uppercase;
    }
    
    .form-input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--input-bg-color);
      color: var(--text-color);
      font-size: 14px;
      transition: border-color 0.2s;
      
      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
      
      &:disabled {
        background: var(--bg-color);
        color: var(--text-secondary-color);
        cursor: not-allowed;
      }
    }
    
    .input-with-icon {
      position: relative;
      
      .form-input {
        padding-right: 30px;
      }
      
      i {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary-color);
        font-size: 16px;
      }
    }
    
    .input-hint {
      margin-top: 6px;
      font-size: 11px;
      color: var(--text-secondary-color);
      font-style: italic;
    }
  }
}

.editor-canvas {
  flex: 1;
  background: var(--input-bg-color);
  position: relative;
  overflow: hidden;
  
  // Сетка на фоне
  background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
  background-size: 20px 20px;
  
  .canvas-container {
    width: 100%;
    height: 100%;
  }
  
  .canvas-toolbar {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--panel-bg-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 6px;
    display: flex;
    align-items: center;
    z-index: 100;
    gap: 6px;
    
    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: var(--border-color);
      margin: 0 6px;
    }
    
    .tool-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-color);
      cursor: pointer;
      transition: all 0.2s;
      
      i {
        font-size: 20px;
      }
      
      &:hover {
        background: var(--hover-color);
      }
      
      &.active {
        background: var(--primary-color);
        color: white;
        box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.3);
      }
    }
    
    .zoom-level {
      font-size: 12px;
      font-weight: 600;
      min-width: 40px;
      text-align: center;
      color: var(--text-secondary-color);
      user-select: none;
    }
  }
  
  .canvas-info {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    z-index: 90;
    backdrop-filter: blur(4px);
    
    i {
      font-size: 16px;
    }
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
    
    // В режиме создания переходов меняем курсор
    &.transition-mode {
      cursor: crosshair;
      
      &:active {
        cursor: crosshair;
      }
      
      // Применяем курсор ко всем дочерним элементам
      circle {
        cursor: crosshair !important;
      }
      
      text, .node-text {
        cursor: crosshair !important;
      }
      
      tspan {
        cursor: crosshair !important;
      }
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

    text, .node-text {
      fill: var(--text-color);
      font-size: 10px;
      font-weight: 500;
      pointer-events: none;
      
      tspan {
        fill: var(--text-color);
      }
    }
  }

  .dragline {
    fill: none;
    stroke: #6366f1;
    stroke-width: 2px;
    stroke-dasharray: 5,5;
    pointer-events: none;
    
    &.hidden {
      display: none;
    }
  }
}
</style>

