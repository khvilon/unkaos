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
      id: "type.0.name",
    },
    {
      name: "Пользовательское",
      id: "is_custom",
      type: "boolean",
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
    },
    {
      label: "Тип",
      id: "type_uuid",
      dictionary: "field_types",
      type: "Select",
      clearable: false,
      disabled: false,
    },
    {
      label: "Пользовательское",
      id: "is_custom",
      type: "Boolean",
      disabled: true,
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
      <div class="table_down_panel">
        <div class="table_panel panel">
          <Transition name="element_fade">
            <KTable
              v-if="!loading"
              :collumns="collumns"
              :table-data="fields"
              :name="'fields'"
            />
          </Transition>
        </div>
        <div class="table_card panel">
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
              (input.id == 'type_uuid' &&
                !get_json_val(selected_fields, 'is_custom'))
            "
            :parameters="input"
            :values="input.values"
          ></component>
          <NumericInput
            v-if="
              selected_fields.type != undefined &&
              selected_fields.type[0].code == 'Numeric'
            "
            label="Минимальное значение"
            id="min_value"
            :value="get_json_val(selected_fields, 'min_value') || 'NULL'"
            :parent_name="'fields'"
          ></NumericInput>
          <NumericInput
            v-if="
              selected_fields.type != undefined &&
              selected_fields.type[0].code == 'Numeric'
            "
            label="Максимальное значение"
            id="max_value"
            :value="get_json_val(selected_fields, 'max_value') || 'NULL'"
            :parent_name="'fields'"
          ></NumericInput>
          <NumericInput
            v-if="
              selected_fields.type != undefined &&
              selected_fields.type[0].code == 'Numeric'
            "
            label="Знаков после запятой"
            id="presision"
            :value="get_json_val(selected_fields, 'presision') || 'NULL'"
            :parent_name="'fields'"
          ></NumericInput>
          <TextInput
            v-if="
              selected_fields.type != undefined &&
              selected_fields.type[0].code == 'Select'
            "
            label="Список значений"
            id="available_values"
            :value="get_json_val(selected_fields, 'available_values')"
            :parent_name="'fields'"
          ></TextInput>
          <div class="table_card_footer">
            <KButton
              class="table_card_footer_btn"
              :name="'Сохранить'"
              :func="'save_fields'"
            />
            <KButton
              class="table_card_footer_btn"
              :name="'Удалить'"
              :func="'delete_fields'"
            />
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
