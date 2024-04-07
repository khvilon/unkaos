<script>
import page_helper from "../page_helper.ts";
import query_parser from "../query_parser.ts";

import d from "../dict.ts";
import rest from "../rest";
import tools from "../tools.ts";
import cache from "../cache";

let methods = {
  add_with_children: function (obj, arr, ch_level) {
    if (ch_level > 10) return arr;

    obj.ch_level = ch_level;

    arr.push(obj);

    if (obj.children == undefined) return arr;

    for (let i in obj.children) {
      console.log(obj, ch_level);
      arr = this.add_with_children(obj.children[i], arr, ch_level + 1);
    }

    return arr;
  },
  get_issues: async function (encoded_query) {
    

    let options = {query: encoded_query}

		if(options.query) this.loaded_issues = await rest.run_method('read_issues', options);
		else this.loaded_issues = await rest.run_method('read_issues');
  

    this.loaded_issues = await rest.run_method("read_issues", options);

  },
  get_field_path_by_name: function (name) {
    if (this.issue == undefined || this.issue.length != 1) return {};
    for (let i in this.issue[0].values) {
      if (this.issue[0].values[i].label == name) {
        return "values." + i + ".value";
      }
    }
  },
  new_issue: function () {
    this.$router.push("/issue");
  },
  update_search_query: function (val) {
    //console.log('update_search_query', val)
    this.search_query = val;
  },
  load_more: function () {
    this.get_issues(this.search_query_encoded, this.loaded_issues.length);
  },
};

const data = {
  favourite_issues_type_uuid: "ac367512-c614-4f2a-b7d3-816018f71ad8",
  loaded_issues: [],
  loaded_issues_tree: [],
  name: "issues",
  label: "Задачи",
  search_query: undefined,
  search_query_encoded: "",
  collumns: [
    {
      name: "",
      id: "parent_uuid",
    },
    {
      name: "№",
      id: ["project_short_name", "'-'", "num"],
      search: true,
      type: "link",
      link: "/issue/",
      link_id: ["project_short_name", "'-'", "num"],
    },
    {
      name: d.get("Название"),
      id: "values.Название",
      search: true,
    },
    {
      name: "Тип",
      id: "type_name",
    },
    {
      name: "Статус",
      id: "status_name",
    },
    {
      name: "Проект",
      id: "project_name",
    },
    {
      name: d.get("Автор"),
      id: "values.Автор",
      type: "user",
    },
    {
      name: d.get("Создана"),
      id: "created_at",
      type: "date",
    },
    {
      name: d.get("Изменена"),
      id: "updated_at",
      type: "date",
    },
  ],
  inputs: [
    {
      label: "fields",
      id: "",
      dictionary: "fields",
      type: "Select",
    },
    {
      label: "users",
      id: "",
      dictionary: "users",
      type: "User",
    },

    {
      label: "issue_statuses",
      id: "",
      dictionary: "issue_statuses",
      type: "User",
    },
    {
      label: "projects",
      id: "",
      dictionary: "projects",
    },
    {
      label: "issue_types",
      id: "",
      dictionary: "issue_types",
    },
    {
      label: "sprints",
      id: "",
      dictionary: "sprints",
    },
  ],
};

//sudo cp -r /var/app/unkaos/dist /srv/docker/nginx/www

const mod = await page_helper.create_module(data, methods);

mod.mounted = function () {
  console.log("this.url_params", this.url_params);

  if (this.url_params.query != undefined) {
    console.log("this.url_params", this.url_params.query);
    let query = decodeURIComponent(this.url_params.query);
    this.$nextTick(function () {
      this.search_query = query;
    });
  } else {
    this.$nextTick(function () {
      this.search_query = cache.getString("issues_query")
    });
  }

  //this.
};

mod.props = {
  config: {
    type: Object,
    default: {query: ''}
  }
};

mod.watch = {
  config: {
    deep: true,
    handler: function(newVal, oldVal) {
      console.log('>>>>>bconfwatchIT0', newVal, oldVal)
      if(!newVal || !newVal.encoded_query) return;
      if(oldVal && oldVal.toString() == newVal.toString() ) return;
      console.log('>>>>>bconfwatchIT', newVal, oldVal)
      //this.setChartOptions();
      if(!oldVal || !oldVal.encoded_query) this.get_issues(newVal.encoded_query);
      else if(oldVal.encoded_query != newVal.encoded_query) this.get_issues(newVal.encoded_query);
      //else this.calcChart();
    },
    immediate: true
  },

};

export default mod;
</script>

<template ref="issues">
  <div>
    <div class="panel topbar" v-show="false">
      <div
        style="
          display: flex;
          flex-direction: row;
          flex-grow: 1;
          max-height: calc(100% - 60px);
        "
      >
        <span class="topbar-label">{{ label }}</span>

        <IssuesSearchInput
          label=""
          class="issue-search-input"
          @update_parent_from_input="update_search_query"
          :fields="fields"
          @search_issues="get_issues"
          :projects="projects"
          :issue_statuses="issue_statuses"
          :issue_types="issue_types"
          :users="users"
          :sprints="sprints"
          :parent_query="search_query"
        >
        </IssuesSearchInput>
      </div>
    </div>


      <div class="gadget_issues_table_panel panel">
        <Transition name="element_fade">
          <KTable
            v-if="!loading"
            @scroll_update="load_more"
            :collumns="collumns"
            :table-data="loaded_issues"
            :name="'issues'"
            :dicts="{ users: users }"
          />
        </Transition>
      </div>

  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

.gadget_issues_table_panel {
  height: auto;
  width: 100%;
  border: none !important;
}

.gadget_issues_table_panel .ktable {
  margin: 0px;
  padding: 10px;
}
</style>
