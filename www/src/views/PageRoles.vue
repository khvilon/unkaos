<script>
import page_helper from "../page_helper.ts";

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
