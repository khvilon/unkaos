<script>
import page_helper from "../page_helper.ts";
import SimpleWorkflowEditor from "../components/SimpleWorkflowEditor.vue";

const data = {
  name: "workflows",
  label: "Воркфлоу",
  collumns: [
    {
      name: "Название",
      id: "name",
      search: true,
    },
    {
      name: "Создана",
      id: "created_at",
      type: "date",
    },
    {
      name: "Обновлена", 
      id: "updated_at",
      type: "date",
    },
  ],
  inputs: [
    {
      label: "Название",
      id: "name",
      type: "String",
    },
    {
      label: "Создана",
      id: "created_at",
      type: "Date",
      disabled: true,
    },
    {
      label: "Обновлена",
      id: "updated_at",
      type: "Date",
      disabled: true,
    },
  ],
  instance: {
    name: "",
    transitions: [],
    workflow_nodes: [],
  }
};

const mod = await page_helper.create_module(data);


mod.methods.cancel_workflow_changes=async function(){
  let uuid = this.selected_workflows.uuid
  await this.update_data()
  this.$store.commit("select_workflows", uuid);
};

mod.computed.workflow_selected=function(){
  return this.selected_workflows != undefined && 
  this.selected_workflows.uuid && 
  this.selected_workflows.created_at
};

mod.computed.dynamicColumns=function(){
  // Если карточка открыта (есть выбранный workflow), показываем только название
  if (this.selected_workflows && this.selected_workflows.uuid) {
    return [
      {
        name: "Название",
        id: "name",
        search: true,
      }
    ];
  }
  
  // Если карточка не открыта, показываем все колонки
  return this.collumns;
};

mod.components = {
  SimpleWorkflowEditor
};

export default mod;
</script>

<template ref="workflows">
  <div>
    <TopMenu
      :buttons="buttons"
      :name="name"
      :label="label"
      :collumns="search_collumns"
    />
    <div class="table_down_panel" :class="{table_down_panel_no_card: !selected_workflows.uuid}">
      <div class="table_panel">
        <KTable
          :collumns="dynamicColumns"
          :table-data="workflows"
          :name="'workflows'"
        />
      </div>
      <div class="table_card panel workflow-table-card">
        <i
            class="bx bx-x table-card-close-button"
            @click="closeMobileTableCard"
        ></i>
        <SimpleWorkflowEditor 
          :wdata="selected_workflows" 
          :inputs="inputs"
          :workflow-selected="workflow_selected"
          @cancel="cancel_workflow_changes"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'css/table-page' with (
  $table-panel-width: 15%
);

.workflow-table-card {
  padding: 0;
  background: var(--bg-color);
  height: calc(100vh - 88px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workflow-table-card .simple-workflow-editor {
  height: 100%;
  flex: 1;
}
</style>
