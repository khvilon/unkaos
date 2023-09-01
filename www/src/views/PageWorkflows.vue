<script>
import page_helper from "../page_helper.ts";

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
  ],
  instance: {
    name: "",
    transitions: [],
    workflow_nodes: [],
  },
};

const mod = await page_helper.create_module(data);

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
    <div class="table_down_panel">
      <div class="table_panel panel">
        <KTable
          :collumns="collumns"
          :table-data="workflows"
          :name="'workflows'"
        />
      </div>
      <div class="table_card panel">
        <KTabPanel>
          <KTab title="Основное">
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
          </KTab>
          <KTab title="Схема">
            <WorkflowsEditor :wdata="selected_workflows" />
          </KTab>
          <KTab title="Статусы">Статусы</KTab>
          <KTab title="Автоматизация">Автоматизация</KTab>
        </KTabPanel>
        <div class="table_card_footer">
            <KButton
              class="table_card_footer_btn"
              :name="'Сохранить'"
              :func="'save_workflows'"
            />
            <KButton
              class="table_card_footer_btn"
              :name="'Удалить'"
              :func="'delete_workflows'"
            />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'css/table-page' with (
  $table-panel-width: 15%
);

</style>
