<script>
import page_helper from "../page_helper.ts";

const data = {
  name: "automations",
  label: "Типы задач",
  instance: {
    fields: [],
  },
  collumns: [
    {
      name: "Название",
      id: "name",
      type: "string",
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
      label: "Воркфлоу",
      id: "workflow_uuid",
      dictionary: "workflows",
      type: "Select",
      clearable: false,
    },
    {
      label: "Поля",
      id: "fields",
      type: "Select",
      clearable: false,
      dictionary: "fields",
      multiple: true,
    },
    {
      label: "Зарегистрирован",
      id: "created_at",
      type: "Date",
      disabled: true,
    },
  ],
};

const mod = await page_helper.create_module(data);

export default mod;
</script>

<template ref="automations">
  <div>
    <TopMenu
      :buttons="buttons"
      :name="name"
      :label="'Типы задач'"
      :collumns="search_collumns"
    />
    <div id="automations_down_panel">
      <div id="automations_table_panel" class="panel">
        <KTable
          :collumns="collumns"
          :table-data="automations"
          :name="'automations'"
        />
      </div>
      <div id="automations_card" class="panel">
        <component
          v-bind:is="input.type + 'Input'"
          v-for="(input, index) in inputs"
          :label="input.label"
          :key="index"
          :id="input.id"
          :value="get_json_val(selected_automations, input.id)"
          :parent_name="'automations'"
          :disabled="input.disabled"
          :clearable="input.clearable"
          :values="input.values"
          :parameters="input"
        ></component>
        <div id="automations_card_footer_div" class="footer_div">
          <div id="automations_card_infooter_div">
            <KButton
              id="save_automations_btn"
              :name="'Сохранить'"
              :func="'save_automations'"
            />
            <KButton
              id="delete_automations_btn"
              :name="'Удалить'"
              :func="'delete_automations'"
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

$table-panel-width: 290px;

#automations_table_panel,
#automations_card {
  height: calc(100vh - $top-menu-height);
}

#automations_table_panel {
  display: flex;
  width: $table-panel-width;
}

#automations_card {
  width: calc(100% - $table-panel-width);
  display: table;
}

#save_automations_btn,
#delete_automations_btn {
  padding: 0px 20px 15px 20px;
  width: 50%;
}

#save_automations_btn input,
#delete_automations_btn input {
  width: 100%;
}

#automations_down_panel {
  display: flex;
}
</style>
