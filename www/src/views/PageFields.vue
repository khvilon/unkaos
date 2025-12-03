<script>
import page_helper from "../page_helper.ts";

const data = {
  name: "fields",
  label: "Поля",
  collumns: [
    {
      name: "Название",
      id: "name",
      search: true,
    },
    {
      name: "Тип",
      id: "type_name",
    },
    {
      name: "Зарегистрирован",
      id: "created_at",
      type: "date",
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
      label: "Тип",
      id: "type_uuid",
      dictionary: "field_types",
      type: "Select",
      clearable: false,
      disabled: false,
      required: true
    },
    {
      label: "Зарегистрировано",
      id: "created_at",
      type: "Date",
      disabled: true,
    },
  ],
  instance: {
    is_custom: true,
  },
};

const mod = await page_helper.create_module(data);


mod.methods.updateSelectVal = function(){
  console.log('>>>>>>upd')
}



export default mod;
</script>

<template ref="fields" v-if="fields">
  <div>
    <div>
      <TopMenu
        :buttons="buttons"
        :name="name"
        :label="label"
        :collumns="search_collumns"
      />
      <div class="table_down_panel" :class="{table_down_panel_no_card: !selected_fields.uuid}">
        <div class="table_panel">
          <Transition name="element_fade">
            <KTable
              v-if="!loading"
              :collumns="collumns"
              :table-data="fields.filter((f)=>f.is_custom)"
              :name="'fields'"
            />
          </Transition>
        </div>
        <div class="table_card panel">
          <i
            class="bx bx-x table-card-close-button"
            @click="closeMobileTableCard"
          ></i>
          <div class="table_card_fields" @keyup.enter="saveEnter()">
            <component
              v-bind:is="input.type + 'Input'"
              v-for="(input, index) in inputs"
              :label="input.label"
              :key="index"
              :id="input.id"
              :value="get_json_val(selected_fields, input.id)"
              :parent_name="'fields'"
              :disabled="
                input.disabled ||
                ((input.id == 'type_uuid' || input.id == 'name') &&
                  !get_json_val(selected_fields, 'is_custom'))
              "
              :parameters="input"
              :values="input.values"
              :class="{'error-field': try_done && input.required && !is_input_valid(input)}"
            ></component>
            <NumericInput
              v-if="selected_fields.type_code == 'Numeric'"
              label="Минимальное значение"
              id="min_value"
              :value="get_json_val(selected_fields, 'min_value') || 'NULL'"
              :parent_name="'fields'"
            ></NumericInput>
            <NumericInput
              v-if="selected_fields.type_code == 'Numeric'"
              label="Максимальное значение"
              id="max_value"
              :value="get_json_val(selected_fields, 'max_value') || 'NULL'"
              :parent_name="'fields'"
            ></NumericInput>
            <NumericInput
              v-if="selected_fields.type_code == 'Numeric'"
              label="Знаков после запятой"
              id="presision"
              :value="get_json_val(selected_fields, 'presision') || 'NULL'"
              :parent_name="'fields'"
            ></NumericInput>
            <TagInput
              v-if="selected_fields.type_code == 'Select'"
              label="Список значений"
              id="available_values"
              :value="get_json_val(selected_fields, 'available_values') || []"
              :values="[]"
              :parent_name="'fields'"
              :isIssueTag="false"
            ></TagInput>
          </div>
          <div class="table_card_buttons">
            <div class="table_card_footer">
              <KButton 
                ref="saveButton"
                class="table_card_footer_btn"
                :name="fields_selected ? 'Сохранить' : 'Создать'"
                @click="updateSelectVal"
                :func="'save_fields'"
                @button_ans="function(ans){try_done = !ans}"
                :stop="!inputs.filter((inp)=>inp.required).every(is_input_valid)"
              />
              <KButton v-if="fields_selected"
                class="table_card_footer_btn"
                :name="'Удалить'"
                :func="'delete_fields'"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'css/table-page' with (
  $table-panel-width: 75%
);
</style>
