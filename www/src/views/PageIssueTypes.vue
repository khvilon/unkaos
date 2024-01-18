<script>
import page_helper from "../page_helper.ts";
import tools from "../tools.ts";

const data = {
  name: "issue_types",
  label: "Типы задач",
  instance: {
    fields: [
    ],
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
      required: true
    },
    {
      label: "Воркфлоу",
      id: "workflow_uuid",
      dictionary: "workflows",
      type: "Select",
      clearable: false,
      required: true
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
  customFields: [],


};

const mod = await page_helper.create_module(data);

mod.methods.filterCustomFieldsSelected = function (selectedFields) {
  return selectedFields
  let customUuids = this.customFields.map((f)=>f.uuid);
  if(!selectedFields || !selectedFields.filter) return [];
  return selectedFields.filter((f)=>customUuids.includes(f.uuid));
};

mod.methods.init = function (fields, selectedFields) {
    if(!this.fields || !this.fields.length) {
      setTimeout(this.init, 200);
      return;
    }
    this.customFields = tools.clone_obj(this.fields).filter((f)=>f.is_custom);
    console.log('customFields',this.customFields)
};

mod.mounted = function () {
  console.log("mounted configs!", this.configs);
  this.init();
};

export default mod;
</script>

<template ref="issue_types">
  <div>
    <TopMenu
      :buttons="buttons"
      :name="name"
      :label="'Типы задач'"
      :collumns="search_collumns"
    />
    <div class="table_down_panel">
      <div class="table_panel panel">
        <KTable
          :collumns="collumns"
          :table-data="issue_types"
          :name="'issue_types'"
        />
      </div>
      <div class="table_card panel">
        <div class="table_card_fields">
          <component
            v-bind:is="input.type + 'Input'"
            v-for="(input, index) in inputs"
            :label="input.label"
            :key="index"
            :id="input.id"
            :value="get_json_val(selected_issue_types, input.id)"
            :parent_name="'issue_types'"
            :disabled="input.disabled"
            :clearable="input.clearable"
            :values="input.id != 'fields' ? input.values : customFields"
            :parameters="input"
            :class="{'error-field': try_done && input.required && !is_input_valid(input)}"
          ></component>
        </div>
        <div class="table_card_buttons">
          <div class="table_card_footer">
            <KButton
              class="table_card_footer_btn"
              :name="'Сохранить'"
              :func="'save_issue_types'"
              @button_ans="function(ans){try_done = !ans}"
              :stop="!inputs.filter((inp)=>inp.required).every(is_input_valid)"
            />
            <KButton v-if="issue_types_selected"
              class="table_card_footer_btn"
              :name="'Удалить'"
              :func="'delete_issue_types'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

@use 'css/table-page' with (
  $table-panel-width: 20%
);
@import "../css/palette.scss";
@import "../css/global.scss";

</style>
