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

      <div id="sprints_down_panel">
        <div id="sprints_table_panel" class="panel">
          <Transition name="element_fade">
            <KTable
              v-if="!loading"
              :collumns="collumns"
              :table-data="sprints"
              :name="'sprints'"
            />
          </Transition>
        </div>

        <div id="sprints_card" class="panel">
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

          <div id="sprints_card_footer_div" class="footer_div">
            <div id="sprints_card_infooter_div">
              <KButton
                id="save_sprints_btn"
                :name="'Сохранить'"
                :func="'save_sprints'"
              />
              <KButton
                id="delete_sprints_btn"
                :name="'Удалить'"
                :func="'delete_sprints'"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$card-width: 400px;

#sprints_table_panel,
#sprints_card {
  height: calc(100vh - $top-menu-height);
}

#sprints_table_panel {
  display: flex;
  width: calc(100vw - $card-width);
}

#sprints_card {
  width: $card-width;
  display: table;
}

#save_sprints_btn,
#delete_sprints_btn {
  padding: 0px 20px 15px 20px;
  width: 50%;
}

#save_sprints_btn input,
#delete_sprints_btn input {
  width: 100%;
}

#sprints_down_panel {
  display: flex;
}
</style>
