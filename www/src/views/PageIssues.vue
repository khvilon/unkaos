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
      arr = this.add_with_children(obj.children[i], arr, ch_level + 1);
    }

    return arr;
  },
  get_issues: async function (query, offset) {
    this.$router.replace({});
    cache.setString("issues_query", this.search_query);
    cache.setString("issues_query_encoded", this.search_query_encoded);
    let options = {};
    this.search_query_encoded = "";
    if (query != undefined && query != "")
      options.query = this.search_query_encoded = query;
    if (offset != undefined) options.offset = offset;

    //options.tree_view = tree_view

    if(offset == undefined) {
      let ans = await rest.run_method("read_issues_count", options);
      if (ans == null) this.total_count = '-'
      else if (ans[0] == undefined) this.total_count = '-'
      else this.total_count = ans[0].count
    }

    let issues = await rest.run_method("read_issues", options);

    if (offset != undefined) {
      for (let i in issues) {
        this.loaded_issues.push(issues[i]);
      }
    } else this.loaded_issues = issues;

    this.loaded_issues.map((issue) => (issue.children = []));

    for (let i in this.loaded_issues) {
      this.loaded_issues[i].children = [];
      this.loaded_issues[i].local_parent_uuid = null;
    }

    for (let i in this.loaded_issues) {
      if (
        this.loaded_issues[i].parent_uuid != null &&
        this.loaded_issues[i].parent_uuid != undefined
      ) {
        for (let j in this.loaded_issues) {
          if (this.loaded_issues[j].uuid == this.loaded_issues[i].parent_uuid) {
            this.loaded_issues[j].children.push(this.loaded_issues[i]);
            this.loaded_issues[i].local_parent_uuid =
              this.loaded_issues[i].parent_uuid;
          }
        }
      }
    }

    this.loaded_issues_tree = [];

    for (let i in this.loaded_issues) {
      if (this.loaded_issues[i].local_parent_uuid == null)
        this.loaded_issues_tree = this.add_with_children(
          this.loaded_issues[i],
          this.loaded_issues_tree,
          0
        );
    }

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
    this.$router.push('/' + this.$store.state['common'].workspace + "/issue");
  },
  update_search_query: function (val) {
    //console.log('update_search_query', val)
    this.search_query = val;
  },
  load_more: function () {
    this.get_issues(this.search_query_encoded, this.loaded_issues.length);
  },
  add_to_favourites: async function () {
    this.favourite_uuid = tools.uuidv4();
    console.log("this.favourite_uuid0", this.favourite_uuid);
    let favourite = {
      uuid: this.favourite_uuid,
      type_uuid: this.favourite_issues_type_uuid,
      name: this.search_query,
      link: "/issues?query=" + tools.encodeURIComponent(this.search_query),
    };


    await rest.run_method("create_favourites", favourite);
  },
  get_table_data: function () {
    if(document.getElementById("issues_table") == undefined) return ''
    let data = document.getElementById("issues_table").innerHTML.replaceAll('▲', '').replaceAll('▼', '')
    return data
  },
  get_excel: function()
  {
    let data = this.get_table_data()
    //console.log(data)
    if(data=='') return

    const blob = new Blob([data], { type: "data:application/vnd.ms-excel" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = 'Unkaos экспорт запроса.xls';
      link.click();
      URL.revokeObjectURL(link.href);
      return
  },
  order: function(column){
    console.log('>>>column', column);
    let query = this.search_query;
    query = query.split(' order by')[0].split(' order by')[0];
    query = query + ' order by ' + column.name;
    if(column.desc) query += ' desc';
    this.search_query = query;
    this.search_issues();
  }
};

const data = {
  favourite_issues_type_uuid: "ac367512-c614-4f2a-b7d3-816018f71ad8",
  total_count: 0,
  loaded_issues: [],
  loaded_issues_tree: [],
  name: "issues",
  label: "Задачи",
  search_query: undefined,
  search_query_encoded: "",
  tree_view: true,
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
      not_sortable: true
    },
    {
      name: d.get("Название"),
      id: "values.Название",
      search: true,
      not_sortable: true
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
      not_sortable: true
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
    {
      label: "tags",
      id: "",
      dictionary: "issue_tags",
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

mod.activated = function () {
  console.log("activated!");
  this.$nextTick(function () {
    if (this.search_query === cache.getString("issues_query")) return;
    this.search_query = cache.getString("issues_query")
  });
};
/*
  mod.computed.issues2 = async function()
  {
	return await get_issues(this.search_query)
	  return [this.issues[0]]
  }*/

export default mod;
</script>

<template ref="issues">
  <div>
    <div class="panel topbar">
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
          :tags="issue_tags"
          :parent_query="search_query"
        >
        </IssuesSearchInput>

        <i
          :class="{
            'bx-subdirectory-right': !tree_view,
            'bx-list-ul': tree_view,
          }"
          class="bx top-menu-icon-btn"
          @click="tree_view = !tree_view"
        ></i>
        <i class="bx bx-star top-menu-icon-btn" @click="add_to_favourites"> </i>
        <i v-if="!loading" class="bx bxs-download top-menu-icon-btn"
        @click="get_excel"
        > </i>


        <span class="topbar-label">{{loaded_issues.length}}/{{total_count}}</span>
      </div>
    </div>

    <div id="issues_down_panel" class="panel">
      <div id="issues_table_panel" ref="issuesTablePanel">
        <Transition name="element_fade">
          <KTable
            :ref="'issuesTable'"
            id="issues_table"
            v-if="!loading"
            @scroll_update="load_more"
            :collumns="collumns"
            :table-data="tree_view ? loaded_issues_tree : loaded_issues"
            :name="'issues'"
            :dicts="{ users: users }"
            :tree_view="tree_view"
            @order="order"
          />
        </Transition>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

#issues_table_panel,
#issues_card {
  height: calc(100vh - $top-menu-height);
}

#issues_table_panel {
  display: flex;
  width: calc(100%);
}

#save_issues_btn,
#delete_issues_btn {
  padding: 0px 20px 15px 20px;
  width: 50%;
}

#save_issues_btn input,
#delete_issues_btn input {
  width: 100%;
}

#issues_down_panel {
  display: flex;
  background: transparent;
}
</style>
