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
      required: true
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
  instance: {is_start: false, is_end: false},
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
    <div class="table_down_panel" :class="{table_down_panel_no_card: !selected_issue_statuses.uuid}">
      <div class="table_panel">
        <KTable
          :collumns="collumns"
          :table-data="issue_statuses"
          :name="'issue_statuses'"
        />
      </div>
      <div class="table_card panel">
        <i
            class="bx bx-x table-card-close-button"
            @click="closeMobileTableCard"
        ></i>
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
            :class="{'error-field': try_done && input.required && !is_input_valid(input)}"
          ></component>
        </div>
        <div class="table_card_buttons">
          <div class="table_card_footer">
            <KButton
                class="table_card_footer_btn"
              :name="issue_statuses_selected ? 'Сохранить' : 'Создать'"
              :func="'save_issue_statuses'"
              @button_ans="function(ans){try_done = !ans}"
              :stop="!inputs.filter((inp)=>inp.required).every(is_input_valid)"
            />
            <KButton v-if="issue_statuses_selected"
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
