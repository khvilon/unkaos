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
    <div id="workflows_down_panel">
      <div id="workflows_table_panel" class="panel">
        <KTable
          :collumns="collumns"
          :table-data="workflows"
          :name="'workflows'"
        />
      </div>
      <div id="workflows_card" class="panel">
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
        <div id="workflows_card_footer_div" class="footer_div">
          <div id="workflows_card_infooter_div">
            <KButton
              id="save_workflows_btn"
              :name="'Сохранить'"
              :func="'save_workflows'"
            />
            <KButton
              id="delete_workflows_btn"
              :name="'Удалить'"
              :func="'delete_workflows'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$table-width: 290px;

#workflows_table_panel,
#workflows_card {
  height: calc(100vh - $top-menu-height);
}

#workflows_table_panel {
  display: flex;
  width: $table-width;
}

#workflows_card {
  width: calc(100vw - $table-width);
  display: table;
}

#save_workflows_btn,
#delete_workflows_btn {
  padding: 0px 20px 15px 20px;
  width: 50%;
}

#save_workflows_btn input,
#delete_workflows_btn input {
  width: 100%;
}

#workflows_down_panel {
  display: flex;
}

#workflows_card .tab-panel {
  height: calc(100vh - 77px - 70px);
}
</style>
