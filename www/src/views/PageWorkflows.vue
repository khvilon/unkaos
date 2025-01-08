<script>
import page_helper from "../page_helper.ts";
import D3WorkflowEditor from "../components/D3WorkflowEditor.vue";

const data = {
  name: "workflows",
  label: "Воркфлоу",
  collumns: [
    {
      name: "Название",
      id: "name",
      search: true,
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
    },
    {
      label: "Обновлена",
      id: "updated_at",
      type: "Date",
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

mod.components = {
  D3WorkflowEditor
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
          :collumns="collumns"
          :table-data="workflows"
          :name="'workflows'"
        />
      </div>
      <div class="table_card panel workflow-table-card">
        <i
            class="bx bx-x table-card-close-button"
            @click="closeMobileTableCard"
        ></i>
        <KTabPanel>
          <KTab title="Основное" :visible="true">
            <div class="table_card_fields">
              <component
                v-bind:is="input.type + 'Input'"
                v-for="(input, index) in inputs"
                :label="input.label"
                :key="index"
                :id="input.id"
                :value="get_json_val(selected_workflows, input.id)"
                :parent_name="'workflows'"
                :disabled="input.disabled"
              ></component>
            </div>
            <div class="table_card_buttons">
              <div class="table_card_footer">
                <KButton
                  class="table_card_footer_btn"
                  :name="'Сохранить'"
                  :func="'save_workflows'"
                />
                <KButton v-if="workflow_selected"
                  class="table_card_footer_btn"
                  :name="'Удалить'"
                  :func="'delete_workflows'"
                />
              </div>
            </div>
          </KTab>
          <KTab title="Схема" :visible="true">
            <D3WorkflowEditor :wdata="selected_workflows" />
            <div class="table_card_buttons">
              <div class="table_card_footer">
                <KButton
                  class="table_card_footer_btn"
                  :name="workflows_selected ? 'Сохранить' : 'Создать'"
                  :func="'save_workflows'"
                />
                <KButton
                  class="table_card_footer_btn"
                  :name="'Отменить'"
                  @click="cancel_workflow_changes"
                />
              </div>
            </div>
          </KTab>
        </KTabPanel>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'css/table-page' with (
  $table-panel-width: 15%
);

.workflow-table-card{
  padding: 0;
  background: transparent;
}

.workflow-table-card .tab-panel {
  height: 100%;
}

.workflow-table-card .tab{
  height: 100%;
  display: flex;
  flex-direction: column;
  
}

</style>
