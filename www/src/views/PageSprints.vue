<script>
import page_helper from "../page_helper.ts";

const data = {
  name: "sprints",
  label: "Спринты",
  collumns: [
    {
      name: "Название",
      id: "name",
      search: true,
    },
    {
      name: "Дата начала",
      id: "start_date",
      type: "date",
    },
    {
      name: "Дата окончания",
      id: "end_date",
      type: "date",
    },
    {
      name: "Создан",
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
      label: "Дата начала",
      id: "start_date",
      type: "Date",
    },
    {
      label: "Дата окончания",
      id: "end_date",
      type: "Date",
    },
    {
      label: "Заархивирован",
      id: "end_date",
      type: "Boolean",
    },
    {
      label: "Зарегистрировано",
      id: "created_at",
      type: "Date",
      disabled: true,
    },
  ],
  instance: {},
};

const mod = await page_helper.create_module(data);

export default mod;
</script>

<template ref="sprints" v-if="sprints">
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
              :table-data="sprints"
              :name="'sprints'"
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
            :value="get_json_val(selected_sprints, input.id)"
            :parent_name="'sprints'"
            :disabled="
              input.disabled ||
              (input.id == 'type_uuid' &&
                !get_json_val(selected_sprints, 'is_custom'))
            "
            :parameters="input"
            :values="input.values"
          ></component>
          <div class="table_card_footer">
            <KButton
              class="table_card_footer_btn"
              :name="'Сохранить'"
              :func="'save_sprints'"
            />
            <KButton
              class="table_card_footer_btn"
              :name="'Удалить'"
              :func="'delete_sprints'"
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
