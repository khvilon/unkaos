

<script>
import page_helper from "../page_helper.ts";

import d from "../dict.ts";
import rest from "../rest";
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
  get_issues: async function (query, offset) {
    let url = "query=" + encodeURIComponent(this.search_query);

    this.$router.replace({});
    cache.setString("issues_query", this.search_query)
    cache.setString("issues_query_encoded",  this.search_query_encoded)
    let options = {};
    this.search_query_encoded = "";
    if (query != undefined && query != "")
      options.query = this.search_query_encoded = query;
    if (offset != undefined) options.offset = offset;

    let issues = await rest.run_method("read_issues", options);

    console.log("this.loaded_issues0", issues);

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

    console.log("this.loaded_issues0", this.loaded_issues);

    this.loaded_issues_tree = [];

    for (let i in this.loaded_issues) {
      if (this.loaded_issues[i].local_parent_uuid == null)
        this.loaded_issues_tree = this.add_with_children(
          this.loaded_issues[i],
          this.loaded_issues_tree,
          0
        );
    }

    console.log(
      "this.loaded_issues1",
      this.loaded_issues,
      this.loaded_issues_tree
    );

    //this.loaded_issues = issues
    //console.log(this.loaded_issues[0], this.issues[0])
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
  test_data: [
  {name: 'Идеальное выполнение', color: 'gray', yAxis: 0, dashStyle: 'Dash',
    data: {
      '2017-01-01 00:00:00 -0800': 7,
      '2017-01-02 00:00:00 -0800': 6,
      '2017-01-03 00:00:00 -0800': 5,
      '2017-01-04 00:00:00 -0800': 4,
      '2017-01-05 00:00:00 -0800': 3,
      '2017-01-06 00:00:00 -0800': 2,
      '2017-01-07 00:00:00 -0800': 1,
      '2017-01-08 00:00:00 -0800': 0
    }
  },
  {name: 'Объем задач', color: 'blue', yAxis: 1,
    data: {
      '2017-01-01 00:00:00 -0800': 22,
      '2017-01-02 00:00:00 -0800': 10,
      '2017-01-03 00:00:00 -0800': 10,
      '2017-01-04 00:00:00 -0800': 10,
      '2017-01-05 00:00:00 -0800': 10,
      '2017-01-06 00:00:00 -0800': 2,
      '2017-01-07 00:00:00 -0800': 2,
      '2017-01-08 00:00:00 -0800': 0
    }
  },
  {name: 'Количество задач', color: 'green', yAxis: 0,
  data: {
      '2017-01-01 00:00:00 -0800': 7,
      '2017-01-02 00:00:00 -0800': 7,
      '2017-01-03 00:00:00 -0800': 6,
      '2017-01-04 00:00:00 -0800': 6,
      '2017-01-05 00:00:00 -0800': 2,
      '2017-01-06 00:00:00 -0800': 2,
      '2017-01-07 00:00:00 -0800': 1,
      '2017-01-08 00:00:00 -0800': 1
    }
  }
  
],
chartOptions: {
  height: '100%',
      chart: {
          type: 'line',
          backgroundColor: 'rgba(255, 255, 255, 0)', // Прозрачный фон
         // height: '100%' // Высота в 100%
        },
        xAxis: {
   
      labels: {
        style: {
          color: 'red' // Красные подписи оси X
        }
      },
      lineColor: 'red', // Красная ось X
      tickColor: 'red' // Красные деления на оси X
    },
      yAxis: [{ // Первая ось Y для количества задач
        title: {
          text: 'Количество',
          style: {
            color: 'green' // Красный цвет заголовка оси Y
          }
        },
        labels: {
        style: {
          color: 'green' // Красные подписи оси Y
        }
      },
      gridLineColor: 'red'
      }, { // Вторая ось Y для объема задач
        title: {
          text: 'Объем',
          style: {
            color: 'blue' // Красный цвет заголовка оси Y
          }
        },
        labels: {
        style: {
          color: 'blue' // Красные подписи оси Y
        }
      },
        opposite: true,
        gridLineColor: 'red'
      }],
      legend: {
      itemStyle: {
         color: 'red' // Красный цвет легенды
      },
      
    },
    },
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
  <div class="burndown-container">
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


      <div class="gadget_burndown_panel panel">
        <Transition name="element_fade"> 
          <line-chart :data="test_data" :library="chartOptions" height="100%"></line-chart>
        </Transition>
      </div>

  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

.gadget_burndown_panel {
  height: 100%;
  width: 100%;
  border: none !important;
}


.burndown-container{
  height: 100%;
}
</style>
