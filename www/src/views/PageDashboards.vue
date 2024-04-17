<script>
import page_helper from "../page_helper.ts";
import tools from "../tools.ts";
import rest from "../rest.ts";
import cache from "../cache.ts";

const methods = {
  new_dashboard: async function () {

    let uuid = tools.uuidv4()
    let dashboard = {
      uuid: uuid,
      author_uuid: cache.getObject("profile").uuid,
      name: 'Дашборд'
    }

    await rest.run_method('create_dashboards', dashboard)

    window.location.href = '/' + this.$store.state['common'].workspace + "/dashboard/" + uuid
    //this.$router.push("/dashboard?uuid=" + uuid);
  },
};

const data = {
  name: "dashboards",
  label: "Дашборды",
  collumns: [
    {
      name: "Название",
      id: "name",
      search: true,
      type: "link",
      link: "/dashboard/",
      link_id: "uuid",
    },
    {
      name: "Автор",
      id: "author_uuid",
      type: "user",
    },
    {
      name: "Зарегистрирована",
      id: "created_at",
      type: "date",
    },
    {
      name: "Обновлена",
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
      label: "Зарегистрировано",
      id: "created_at",
      type: "Date",
      disabled: true,
    },
    {
      label: "users",
      id: "",
      dictionary: "users",
      type: "User",
    },
  ],
  
};

const mod = await page_helper.create_module(data, methods);

export default mod;
</script>

<template ref="dashboards" v-if="dashboards">
  <div>
    <div>
      <TopMenu
        :buttons="[{name:'Создать', click: new_dashboard}]"
        :name="name"
        :label="label"
        :collumns="search_collumns"
      />

      <div id="dashboards_down_panel">
        <div id="dashboards_table_panel" class="panel">
          <Transition name="element_fade">
            <KTable
              v-if="!loading"
              :collumns="collumns"
              :table-data="dashboards"
              :name="'dashboards'"
              :dicts="{ users: users }"
            />
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$card-width: 400px;

#dashboards_table_panel,
#dashboards_card {
  height: calc(100vh - $top-menu-height);
}

#dashboards_table_panel {
  display: flex;
  width: calc(100%);
  background: transparent;
}

#save_dashboards_btn,
#delete_dashboards_btn {
  padding: 0px 20px 15px 20px;
  width: 50%;
}

#save_dashboards_btn input,
#delete_dashboards_btn input {
  width: 100%;
}

#dashboards_down_panel {
  display: flex;
}
</style>
