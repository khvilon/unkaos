<script>
import page_helper from "../page_helper.ts";

const data = {
  name: "issue_statuses",
  label: "Статусы задач",
  collumns: [
    {
      name: "Название",
      id: "name",
      type: "string",
      search: true,
    },
    {
      name: "Начальный",
      id: "is_start",
      type: "boolean",
    },
    {
      name: "Конечный",
      id: "is_end",
      type: "boolean",
    },
    {
      name: "создан",
      id: "created_at",
      type: "date",
    },
    {
      name: "Обновлен",
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
      label: "Начальный",
      id: "is_start",
      type: "Boolean",
    },
    {
      label: "Конечный",
      id: "is_end",
      type: "Boolean",
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

<template ref="issue_statuses">
  <div>
    <TopMenu
      :buttons="buttons"
      :name="name"
      :label="'Статусы задач'"
      :collumns="search_collumns"
    />
    <div class="table_down_panel">
      <div class="table_panel panel">
        <KTable
          :collumns="collumns"
          :table-data="issue_statuses"
          :name="'issue_statuses'"
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
            :value="selected_issue_statuses[input.id]"
            :parent_name="'issue_statuses'"
            :disabled="input.disabled"
          ></component>
        </div>
        <div class="table_card_buttons">
          <div class="table_card_footer">
            <KButton
                class="table_card_footer_btn"
              :name="'Сохранить'"
              :func="'save_issue_statuses'"
            />
            <KButton
              class="table_card_footer_btn"
              :name="'Удалить'"
              :func="'delete_issue_statuses'"
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
