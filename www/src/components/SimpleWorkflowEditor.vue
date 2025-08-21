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
      // Обновляем позицию узла в исходных данных
      const originalNode = props.wdata.workflow_nodes.find(n => n.uuid === node.uuid)
      if (originalNode) {
        originalNode.x = node.x
        originalNode.y = node.y
        console.log('Updated node position:', originalNode.uuid, node.x, node.y)
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
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

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
    x: Math.random() * 400 + 100,
    y: Math.random() * 300 + 100,
    issue_statuses: [status],
    // для апсерта
    // @ts-ignore
    table_name: 'workflow_nodes',
    // @ts-ignore
    workflows_uuid: props.wdata.uuid,
    // @ts-ignore
    issue_statuses_uuid: status.uuid
  }
  
  props.wdata.workflow_nodes.push(newNode)
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

function handleSave(result: any) {
  // Результат операции сохранения из store
  console.log('Save result:', result)
}

function handleDelete(result: any) {
  // Результат операции удаления из store
  console.log('Delete result:', result)
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="simple-workflow-editor" data-testid="simple-workflow-editor">
    <!-- Левая панель с инструментами -->
    <div class="editor-sidebar" data-testid="editor-sidebar">
      <div class="sidebar-content">
        <!-- Основные параметры -->
        <div class="sidebar-section" v-if="inputs && inputs.length > 0">
          <div class="form-group" v-for="(input, index) in inputs" :key="index">
            <label v-if="input.type === 'String'">{{ input.label }}:</label>
            <input 
              v-if="input.type === 'String'"
              type="text" 
              :value="getFieldValue(input.id)"
              @input="updateField(input.id, $event.target.value)"
              class="form-input"
              :disabled="input.disabled"
              :data-testid="`workflow-${input.id}`"
            />
          </div>
        </div>

        <!-- Добавление статусов -->
        <div class="sidebar-section" v-if="availableStatuses.length > 0">
          <div class="statuses-grid" data-testid="statuses-grid">
            <button 
              v-for="status in availableStatuses" 
              :key="status.uuid"
              @click="addStatusToWorkflow(status.uuid)"
              class="status-button"
              :data-testid="`status-${status.name.toLowerCase().replace(/\s+/g, '-')}`"
            >
              {{ status.name }}
            </button>
          </div>
        </div>

        <!-- Режим редактирования -->
        <div class="sidebar-section">
          <h4>Режим редактирования</h4>
          <div class="mode-selector">
            <label class="radio-label">
              <input 
                type="radio" 
                :value="false"
                v-model="isTransitionCreationMode"
                @change="renderGraph"
                data-testid="mode-drag-statuses"
              />
              <span class="radio-mark"></span>
              Перетаскивание статусов
            </label>
            <label class="radio-label">
              <input 
                type="radio" 
                :value="true"
                v-model="isTransitionCreationMode"
                @change="renderGraph"
                data-testid="mode-create-transitions"
              />
              <span class="radio-mark"></span>
              Создание переходов
            </label>
          </div>
          <p class="section-hint" v-if="isTransitionCreationMode">
            Перетащите от одного статуса к другому для создания перехода
          </p>
          <p class="section-hint" v-else>
            Перетаскивайте статусы для изменения их расположения на схеме
          </p>
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
              :disabled="!!selected.node"
              data-testid="selected-element-name"
            />
            <p class="input-hint" v-if="selected.node">
              Название статуса можно изменить только на странице "Статусы задач"
            </p>
          </div>
          <KButton 
            :name="selected.node ? 'Удалить из схемы' : 'Удалить переход'"
            @click="deleteSelected"
            class="delete-btn"
            data-testid="delete-selected-element"
          />
        </div>
      </div>
      
      <!-- Футер с кнопками -->
      <div class="sidebar-footer">
        <KButton 
          :name="workflowSelected ? 'Сохранить' : 'Создать'"
          :func="'save_workflows'"
          @button_ans="handleSave"
          class="footer-btn primary"
          data-testid="save-workflow"
        />
        <KButton 
          v-if="workflowSelected"
          :name="'Удалить'"
          :func="'delete_workflows'"
          @button_ans="handleDelete"
          class="footer-btn danger"
          data-testid="delete-workflow"
        />
        <KButton 
          :name="'Отменить'"
          @click="handleCancel"
          class="footer-btn secondary"
          data-testid="cancel-workflow"
        />
      </div>
    </div>

    <!-- Правая панель с графом -->
    <div class="editor-canvas" data-testid="editor-canvas">
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
}

.editor-sidebar {
  width: 320px;
  min-width: 320px;
  background: var(--panel-bg-color);
  border-right: 2px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .sidebar-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    
    .sidebar-section {
      margin-bottom: 30px;
      
      h4 {
        margin: 0 0 18px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-color);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 8px;
      }
      
      .section-hint {
        font-size: 14px;
        color: var(--text-secondary-color);
        margin-bottom: 16px;
        line-height: 1.4;
      }
    }
  }
  
  .sidebar-footer {
    flex-shrink: 0;
    padding: 20px;
    border-top: 1px solid var(--border-color);
    background: var(--panel-bg-color);
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .footer-btn {
      width: 100% !important;
      
      .btn {
        width: 100% !important;
        
        .btn_input {
          width: 100% !important;
          margin-bottom: 0 !important;
          height: 36px !important;
          display: block !important;
          box-sizing: border-box !important;
        }
      }
      
      &.primary .btn .btn_input {
        background: var(--primary-color) !important;
        color: white !important;
        border-color: var(--primary-color) !important;
        
        &:hover {
          opacity: 0.9;
        }
      }
      
      &.danger .btn .btn_input {
        background: #dc3545 !important;
        color: white !important;
        border-color: #dc3545 !important;
        
        &:hover {
          background: #c82333 !important;
        }
      }
      
      &.secondary .btn .btn_input {
        background: var(--bg-color) !important;
        border-color: var(--border-color) !important;
        color: var(--text-color) !important;
      }
    }
    
    // Дополнительное переопределение для KButton
    :deep(.btn .btn_input) {
      width: 100% !important;
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
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
    
    .input-hint {
      font-size: 12px;
      color: var(--text-secondary-color);
      margin-top: 4px;
      font-style: italic;
    }
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-bottom: 10px;
    
    input[type="checkbox"] {
      margin-right: 8px;
      width: 16px;
      height: 16px;
    }
    
    .checkmark {
      font-weight: 500;
      color: var(--text-color);
    }
  }
  
  .mode-selector {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .radio-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--hover-color);
    }
    
    input[type="radio"] {
      margin-right: 8px;
      width: 16px;
      height: 16px;
    }
    
    .radio-mark {
      font-weight: 500;
      color: var(--text-color);
      flex: 1;
    }
    
    &:has(input:checked) {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: white;
      
      .radio-mark {
        color: white;
      }
    }
  }
  
  .statuses-grid {
    max-height: 200px;
    overflow-y: auto;
    padding: 2px 0;
    
    .status-button {
      display: block;
      width: 100%;
      margin-bottom: 8px;
      padding: 8px 16px;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      color: var(--text-color);
      font-size: 13px;
      font-weight: 400;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
      
      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
    }
  }
  
  .delete-btn {
    .btn_input {
      width: 100% !important;
      background: #dc3545 !important;
      color: white !important;
      border-color: #dc3545 !important;
      
      &:hover {
        background: #c82333 !important;
      }
    }
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

// Специфичные стили для кнопок в футере - переопределяем фиксированную ширину KButton
:deep(.sidebar-footer .footer-btn) {
  width: 100% !important;
}

:deep(.sidebar-footer .footer-btn .btn) {
  width: 100% !important;
}

:deep(.sidebar-footer .footer-btn .btn .btn_input) {
  width: 100% !important;
  margin-bottom: 0 !important;
  height: 36px !important;
  display: block !important;
  box-sizing: border-box !important;
}

:deep(.sidebar-footer .footer-btn.primary .btn .btn_input) {
  background: var(--primary-color) !important;
  color: white !important;
  border-color: var(--primary-color) !important;
}

:deep(.sidebar-footer .footer-btn.danger .btn .btn_input) {
  background: #dc3545 !important;
  color: white !important;
  border-color: #dc3545 !important;
}

:deep(.sidebar-footer .footer-btn.secondary .btn .btn_input) {
  background: var(--bg-color) !important;
  border-color: var(--border-color) !important;
  color: var(--text-color) !important;
}

/* Максимально специфичные стили для кнопок статусов */
.simple-workflow-editor .editor-sidebar .sidebar-content .statuses-grid .status-button {
  /* Полный сброс браузерных стилей */
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  
  /* Размеры */
  width: 100% !important;
  height: auto !important;
  min-height: 32px !important;
  margin: 0 !important;
  padding: 8px 16px !important;
  box-sizing: border-box !important;
  
  /* Фон и границы */
  background: transparent !important;
  background-color: transparent !important;
  border: 1px solid var(--border-color) !important;
  border-style: solid !important;
  border-width: 1px !important;
  border-radius: 20px !important;
  
  /* Текст */
  color: var(--text-color) !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  text-align: center !important;
  text-decoration: none !important;
  white-space: nowrap !important;
  
  /* Интерактивность */
  cursor: pointer !important;
  outline: none !important;
  user-select: none !important;
  
  /* Анимации */
  transition: all 0.2s ease !important;
  
  /* Сброс дополнительных браузерных стилей */
  border-image: none !important;
  padding-block: 8px !important;
  padding-inline: 16px !important;
}

.simple-workflow-editor .editor-sidebar .sidebar-content .statuses-grid .status-button:hover {
  background: var(--primary-color) !important;
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
  color: white !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
}

.simple-workflow-editor .editor-sidebar .sidebar-content .statuses-grid .status-button:active {
  border-style: solid !important;
  transform: translateY(0) !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
}

.simple-workflow-editor .editor-sidebar .sidebar-content .statuses-grid .status-button:focus {
  outline: none !important;
  border-color: var(--primary-color) !important;
}
</style> 