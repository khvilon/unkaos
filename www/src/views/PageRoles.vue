<script>
import page_helper from "../page_helper.ts";

/*
ВСЕ МОГУТ
  читать пользователей
  читать проекты
  вести свое избранное


АДМИНИСТРАТОР МОЖЕТ ВСЕ


АДМИНИСТРАТОР структуры
  Круд Воркфлоу
  КРУД Статусов
  Круд Полей
  Круд Типов Задач

Управление ролями - нельзя дать те права, которых нет у самого

Круд пользователей

Круд проектов





Читать пользователей, проеты, свое избранное

SYSTEM
"gpt_logs"
"logs_done"
"msg_in"
"msg_in_parts"
"msg_out"
"msg_pipes"
"user_sessions"


READ EVERYBODY
"field_types"
"gadget_types"
"issue_actions_types"
"favourites_types"
"relation_types"

READ, WRITE OWN EVERYBODY
"favourites"

READ
WRITE
READ FOR PROJECT
WRITE FOR PROJRCT
"issues"
"attachments"
"field_values"
"field_values_rows"
"issue_actions"
"old_issues_num"
"issue_tags"
"issue_tags_selected"
"relations"
"time_entries"
"watchers"

READ WRITE
"configs"

READ WRITE
DELETE
"workflows"
"transitions"
"workflow_nodes"
"fields"
"issue_statuses"
"issue_types"
"issue_types_to_fields"


READ PUBLIC
EDIT, DELETE OWN
EDIT NOT OWN
DELETE NOT OWN
"boards"
"boards_columns"
"boards_fields"
"boards_filters"
"dashboards"
"gadgets"


READ - EVERYBODY
EDIT
DELETE
"projects"


EDIT, DELETE
ASSIGN
"roles"
"users_to_roles"

READ - EVERYBODY
CRUD
"sprints"

READ - EVERYVODY
CRUD
"users"

*/

const data = {
  name: "roles",
  label: "Роли пользователей",
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
      label: "Пользователи",
      id: "users",
      dictionary: "users",
      type: "User",
      clearable: false,
    },
    {
      label: "Зарегистрирована",
      id: "created_at",
      type: "Date",
      disabled: true,
    },
  ],
};

const mod = await page_helper.create_module(data);

export default mod;
</script>

<template ref="roles">
  <div>
    <TopMenu
      :buttons="buttons"
      :name="name"
      :label="'Роли пользователей'"
      :collumns="search_collumns"
    />
    <div class="table_down_panel">
      <div class="table_panel panel">
        <KTable :collumns="collumns" :table-data="roles" :name="'roles'" />
      </div>
      <div class="table_card panel">
        <component
          v-bind:is="input.type + 'Input'"
          v-for="(input, index) in inputs"
          :label="input.label"
          :key="index"
          :id="input.id"
          :value="get_json_val(selected_roles, input.id)"
          :parent_name="'roles'"
          :disabled="input.disabled"
          :clearable="input.clearable"
          :values="input.values"
          :parameters="input"
        ></component>
        <div class="table_card_footer">
          <KButton
            class="table_card_footer_btn"
            :name="'Сохранить'"
            :func="'save_roles'"
          />
          <KButton
            class="table_card_footer_btn"
            :name="'Удалить'"
            :func="'delete_roles'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'css/table-page' with (
  $table-panel-width: 25%
);
</style>
