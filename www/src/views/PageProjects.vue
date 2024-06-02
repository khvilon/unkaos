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
      required: true
    },
    {
      label: "Код",
      id: "short_name",
      type: "String",
      required: true
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
      required: true
    },
    {
      label: "Зарегистрирован",
      id: "created_at",
      type: "Date",
      disabled: true,
    },
  ],
  instance: {is_knowledge_base: false},
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
    <div class="table_down_panel" :class="{table_down_panel_no_card: !selected_projects.uuid}">
      <div class="table_panel">
        <KTable
          :collumns="collumns"
          :table-data="projects"
          :name="'projects'"
          :dicts="{ users: users }"
        />
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
            :value="get_json_val(selected_projects, input.id)"
            :parent_name="'projects'"
            :disabled="input.disabled"
            :clearable="input.clearable"
            :class="{'error-field': try_done && input.required && !is_input_valid(input)}"
          ></component>
        </div>
        <div class="table_card_buttons">
          <div class="table_card_footer">
            <KButton
              ref="saveButton"
              class="table_card_footer_btn"
              :name="projects_selected ? 'Сохранить' : 'Создать'"
              :func="'save_projects'"
              @button_ans="function(ans){try_done = !ans}"
              :stop="!inputs.filter((inp)=>inp.required).every(is_input_valid)"
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
