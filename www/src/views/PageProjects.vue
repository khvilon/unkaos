<script>
import page_helper from "../page_helper.ts";

const data = {
  name: "projects",
  label: "Проекты",
  collumns: [
    {
      name: "Название",
      id: "name",
      type: "String",
      search: true,
    },
    {
      name: "Код",
      id: "short_name",
      search: true,
    },
    {
      name: "База знаний",
      id: "is_knowledge_base",
      type: "boolean",
    },
    {
      name: "Владелец",
      id: "owner_uuid",
      type: "user",
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
      label: "Код",
      id: "short_name",
      type: "String",
    },
    {
      label: "Описание",
      id: "description",
      type: "Text",
    },
    {
      label: "Является базой знаний",
      id: "is_knowledge_base",
      type: "Boolean",
    },
    {
      label: "Аватар",
      id: "avatar",
      type: "Avatar",
    },
    {
      label: "Владелец",
      id: "owner_uuid",
      type: "User",
      disabled: false,
      clearable: false,
      dictionary: "users",
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

<template ref="projects">
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
          :table-data="projects"
          :name="'projects'"
          :dicts="{ users: users }"
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
            :value="get_json_val(selected_projects, input.id)"
            :parent_name="'projects'"
            :disabled="input.disabled"
            :clearable="input.clearable"
          ></component>
        </div>
        <div class="table_card_buttons">
          <div class="table_card_footer">
            <KButton
              class="table_card_footer_btn"
              :name="'Сохранить'"
              :func="'save_projects'"
            />
            <KButton v-if="projects_selected"
              class="table_card_footer_btn"
              :name="'Удалить'"
              :func="'delete_projects'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

@use 'css/table-page' with (
  $table-panel-width: 70%
);

</style>
