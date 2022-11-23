<script>
import TopMenu from "../components/TopMenu.vue";
import KTable from "../components/KTable.vue";
import KButton from "../components/KButton.vue";
import StringInput from "../components/StringInput.vue";
import BooleanInput from "../components/BooleanInput.vue";
import AvatarInput from "../components/AvatarInput.vue";
import DateInput from "../components/DateInput.vue";

import tools from "../tools.ts";
import store_helper from "../store_helper.ts";
import page_helper from "../page_helper.ts";

const name = "issue_statuses";
const crud = "crud";

const store_module = store_helper.create_module(name, crud);

const collumns = [
  {
    name: "Название",
    id: "name",
  },
  {
    name: "Тип",
    id: "type[0].name",
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
];

const buttons = [
  {
    name: "Создать поле",
    func: "unselect_" + name,
  },
];

const search_collumns = ["name", "short_name"];

{
  /*add_project(event)
      {
          console.log('ttt ' + this)
      // `event` — нативное событие DOM
          if (event) console.log(event.target.tagName)
        }*/
}

const props = {
  inputs: {
    type: Array,
    default: () => [
      {
        label: "Название",
        id: "name",
        type: "String",
      },
      {
        label: "Тип",
        id: "type[0].name",
        type: "String",
      },
      {
        label: "Пользовательское",
        id: "is_custom",
        type: "Boolean",
      },
      {
        label: "Зарегистрировано",
        id: "created_at",
        type: "Date",
        disabled: true,
      },
    ],
  },
};

const data = { collumns, buttons, name, search_collumns };

const components = {
  TopMenu,
  KTable,
  StringInput,
  BooleanInput,
  AvatarInput,
  DateInput,
  KButton,
};

const mod = page_helper.create_module(
  name,
  crud,
  data,
  components,
  store_module,
  props
);

export default mod;
</script>

<template ref="issue_statuses">
  <TopMenu :buttons="buttons" :name="name" :collumns="search_collumns" />
  <div id="issue_statuses_down_panel">
    <div id="issue_statuses_table_panel">
      <KTable
        :collumns="collumns"
        :table-data="issue_statuses"
        :name="'issue_statuses'"
      />
    </div>
    <div id="issue_statuses_card">
      <component
        v-bind:is="input.type + 'Input'"
        v-for="(input, index) in inputs"
        :label="input.label"
        :key="index"
        :id="input.id"
        :value="get_json_val(selected_issue_statuses, input.id)"
        :parent_name="'issue_statuses'"
        :disabled="input.disabled"
      ></component>
      <div id="issue_statuses_card_footer_div">
        <div id="issue_statuses_card_infooter_div">
          <KButton
            id="save_issue_statuses_btn"
            :name="'Сохранить'"
            :func="'save_issue_statuses'"
          />
          <KButton
            id="delete_issue_statuses_btn"
            :name="'Удалить'"
            :func="'delete_issue_statuses'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";
#issue_statuses_table_panel,
#issue_statuses_card {
  background-color: var(--panel-bg-color);
  border-radius: var(--border-radiusr);
  color: var(--text-color);
  min-height: calc(100vh - 77px);
  height: calc(100vh - 100px);
}

#issue_statuses_table_panel {
  display: flex;
  width: calc(100% - 400px);
}

#issue_statuses_card {
  width: 400px;
  margin-left: 0px;
  display: table;
}

#issue_statuses_card StringInput {
  display: table-row;
}

#issue_statuses_card_footer_div {
  display: table-footer-group;
}
#issue_statuses_card_infooter_div {
  display: flex;
}

#save_issue_statuses_btn,
#delete_issue_statuses_btn {
  width: 150px;
}

#save_issue_statuses_btn input,
#delete_issue_statuses_btn input {
  width: 100%;
}

#issue_statuses_down_panel {
  display: flex;
}

.ktable {
  width: 100%;
  margin-left: 20px;
  margin-right: 20px;
}
</style>
