<script>
import page_helper from "../page_helper.ts";

import IssuesTable from "../gadgets/IssuesTable.vue";
import IssuesTableConfig from "../gadgets/IssuesTableConfig.vue";
import TimeReport from "../gadgets/TimeReport.vue";
import TimeReportConfig from "../gadgets/TimeReportConfig.vue";
import Burndown from "../gadgets/Burndown.vue";
import BurndownConfig from "../gadgets/BurndownConfig.vue";


import d from "../dict.ts";
import rest from "../rest";
import tools from "../tools.ts";
import { computed } from "@vue/runtime-core";

let methods = {
  init: async function () {
    console.log("dashboard mounted", this.dashboard);

    if (
      this.selected_dashboard == undefined ||
      this.dashboard == undefined ||
      this.dashboard[0] == undefined
    ) {
      setTimeout(this.init, 200);
      return;
    }

    this.gadgets = await rest.run_method('read_gadgets', {dashboard_uuid: this.dashboard[0].uuid})

    this.gadgets = this.gadgets.filter((g)=>!g.deleted_at)

  

    console.log(
      "sselected_dashboard1",
      this.selected_dashboard,
      this.dashboard[0]
    );

    this.uv =
      (this.$refs.dashboard_down_panel.clientHeight - 20) / this.v_units;
    this.uh = (this.$refs.dashboard_down_panel.clientWidth - 20) / this.h_units;

    console.log("this.uv", this.uv);

    //check not double
    //	if(!this.selected_dashboard.is_new) return

    //if(this.selected_dashboard.uuid != this.dashboard[0].uuid) this.$store.commit('select_dashboard', this.dashboard[0].uuid);

    console.log(this.uuid);
  },
  get_panel_width: function () {
    return 100;
  },
  start_resize: function (e, gadget, border) {
    console.log(e);
    this.resize_data = {
      border: border,
      gadget: gadget,
      x: e.clientX,
      y: e.clientY,
    };

    console.log('>>>>>>>start_resize')

    this.shadow_gadget.width = this.resize_data.gadget.width
    this.shadow_gadget.height = this.resize_data.gadget.height
    this.shadow_gadget.x0 = this.resize_data.gadget.x0
    this.shadow_gadget.y0 = this.resize_data.gadget.y0
  },
  end_resize: async function (e) {
    if (!this.resize_data) return;

    

    let diff;
    if (
      this.resize_data.border == "right" ||
      this.resize_data.border == "left"
    ) {
      diff = e.clientX - this.resize_data.x;
      diff = diff / this.uh;
    } else {
      diff = e.clientY - this.resize_data.y;
      diff = diff / this.uv;
    }

    if (diff > 0) diff = Math.ceil(diff);
    else diff = Math.floor(diff);

    console.log("resize0", diff);

    if (this.resize_data.border == "right") {
      this.resize_data.gadget.width += diff;
    } else if (this.resize_data.border == "bottom") {
      this.resize_data.gadget.height += diff;
    } else if (this.resize_data.border == "left") {
      this.resize_data.gadget.x0 += diff;
      this.resize_data.gadget.width -= diff;
    } else if (this.resize_data.border == "top") {
      this.resize_data.gadget.y0 += diff;
      this.resize_data.gadget.height -= diff;
    }

    console.log("resize1", this.resize_data.border);

    await rest.run_method("update_gadgets", this.resize_data.gadget);

    this.resize_data = null;

    console.log(e, diff);
  },
  stop_resize: function () {
    this.resize_data = null;
  },
  show_resize: function (e) {

    console.log('show_resize')
    if (!this.resize_data) return;

    

    let diff;
    if (
      this.resize_data.border == "right" ||
      this.resize_data.border == "left"
    ) {
      diff = e.clientX - this.resize_data.x;
      diff = diff / this.uh;
    } else {
      diff = e.clientY - this.resize_data.y;
      diff = diff / this.uv;
    }

    if (diff > 0) diff = Math.ceil(diff);
    else diff = Math.floor(diff);

    console.log("resize0", diff);


    this.shadow_gadget.width = this.resize_data.gadget.width
    this.shadow_gadget.height = this.resize_data.gadget.height
    this.shadow_gadget.x0 = this.resize_data.gadget.x0
    this.shadow_gadget.y0 = this.resize_data.gadget.y0

    if (this.resize_data.border == "right") {
      this.shadow_gadget.width += diff;
    } else if (this.resize_data.border == "bottom") {
      this.shadow_gadget.height += diff;
    } else if (this.resize_data.border == "left") {
      this.shadow_gadget.x0 += diff;
      this.shadow_gadget.width -= diff;
    } else if (this.resize_data.border == "top") {
      this.shadow_gadget.y0 += diff;
      this.shadow_gadget.height -= diff;
    }
  },
  save_gadget: function(e, gadget){
    gadget.config_open = false;
    gadget.name = e.name;
    let config = tools.clone_obj(e);
    delete config.name;
    gadget.config = JSON.stringify(config);
    rest.run_method('upsert_gadgets', gadget)
  },

  new_gadget:  function(type){
    if(type.code != 'TimeReport' && type.code != 'Burndown' && type.code != 'IssuesTable') return;

    let gadget = {
      uuid: tools.uuidv4(),
      dashboard_uuid: this.dashboard[0].uuid,
      x0: 0,
      width: 8,
      height: 3,
      y0: this.max_y,
      type_uuid: type.uuid,
      type: [type],
      name:  type.name,
      config: '{}'
    };

    //console.log('new_gadget', gadget)
    this.gadgets.push(gadget);

    rest.run_method('upsert_gadgets', gadget);

    this.gadget_types_modal_visible = false;
  },
  delete_gadget: function(gadget){
    this.gadgets = this.gadgets.filter((g)=>g.uuid != gadget.uuid)
    //gadget.deleted_at = new Date()
    rest.run_method('delete_gadgets', {uuid: gadget.uuid})
    //rest.run_method('upsert_gadgets', gadget)
  },
  delete_dashboard: async function(){
    await rest.run_method('delete_dashboards', {uuid: this.dashboard[0].uuid})
    window.location.href = '/' + this.$store.state['common'].workspace + "/dashboards"
  },
  update_name: async function(name){
    this.dashboard[0].name = name
    this.dashboard[0].table_name = 'dashboards'
    await rest.run_method('update_dashboards', this.dashboard[0])
  }
};

const data = {
  name: "dashboard",
  label: "Дашборд",

  resize_data: null,

  instance: {
    name: "",
  },
  gadgets: [],
  v_units: 8,
  h_units: 8,
  uv: 0,
  uh: 0,
  virtual_border_width: 10,
  gadget_padding: 5,
  gadget_types_modal_visible: false,
  shadow_gadget: {x0:0, y0:0, width: 0, height: 0},
  collumns: [
    {
      name: "№",
      id: ["project_short_name", "'-'", "num"],
      search: true,
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
      id: "estimate_uuid",
      dictionary: "fields",
      type: "Select",
    },
    {
      id: "query",
      type: "String",
    },
    {
      id: "dashboards_columns",
      dictionary: "issue_statuses",
      type: "User",
    },
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
      label: "gadget_types",
      id: "",
      dictionary: "gadget_types",
    },

  ],
};

const mod = await page_helper.create_module(data, methods);

mod.mounted = methods.init;

mod.props = {
  uuid: {
    type: String,
    default: "",
  },
};

mod.computed.title = function () {
  const name = this.dashboard[0].name;
  if (name !== undefined && name !== {} && name !== "") {
    document.title = name;
    return name;
  } else {
    return "Дашборд";
  }
};

mod.computed.max_y = function () {
  let max_y = 0;
  for (let i in this.gadgets) {
    let end =
      Number(this.gadgets[i].y0) +
      Number(this.gadgets[i].height);
      max_y = Math.max(max_y, end);


  }
  return max_y
}

mod.computed.total_height = function () {
  this.uv;
  if (this.dashboard == undefined || this.dashboard[0] == undefined) return 0;

  
  return (this.max_y + this.v_units / 2) * this.uv;
};

mod.components = {
  IssuesTable,
  IssuesTableConfig,
  TimeReport,
  TimeReportConfig,
  Burndown,
  BurndownConfig,
};

export default mod;
</script>

<template ref="dashboard">
  <div>


    <div v-if="gadget_types_modal_visible" class = gadget-types-modal-container>
      <div class="modal-bg" @mousedown.self="gadget_types_modal_visible=false">
        <div class="panel modal gadget-types-modal">
          <Transition name="element_fade">
          <div class="gadget-types-cells">
            
            <div
            v-for="(gadget_type) in gadget_types"
            @click="new_gadget(gadget_type)"
            class="gadget-types-cell"
            :class="{'gadget-types-cell-disabled' : gadget_type.code != 'TimeReport' && gadget_type.code != 'Burndown' && gadget_type.code != 'IssuesTable'}"
            >
          
            <span>{{ gadget_type.name }}</span>
            </div>
          
          </div>
        </Transition>
          <KButton name="Отменить" @click="gadget_types_modal_visible=false" />
        </div>
      </div>
    </div>


    <div class="panel topbar">
      <div
        style="
          display: flex;
          flex-direction: row;
          flex-grow: 1;
          max-height: calc(100% - 60px);
        "
      >
        <StringInput
          v-if="dashboard != undefined && selected_dashboard != undefined"
          :label="''"
          key="dashboard_name"
          :parent_name="'dashboard'"
          class="dashboard-name-input"
          :value="get_json_val(dashboard[0], 'name')"
          @updated="update_name"
        >
        </StringInput>

        <i
          class="bx bx-extension top-menu-icon-btn add-gadget-btn"
          @click="gadget_types_modal_visible=true"
        >
        </i>
        <i
          class="bx bx-trash top-menu-icon-btn delete-dashboard-btn"
          @click="delete_dashboard()"
        >
        </i>
      </div>
    </div>

    <div id="dashboard_down_panel" ref="dashboard_down_panel" class="panel">
      <div
        class="gadgets"
        ref="gadgets"
        @mouseup="end_resize"
        @mouseleave="stop_resize"
        @mousemove="show_resize"
      >
        <div
          v-bind:style="{
            width: Number(uh) * Number(shadow_gadget.width) + 'px',
            height: Number(uv) * Number(shadow_gadget.height) + 'px',
            'margin-left': Number(uh) * Number(shadow_gadget.x0) + 'px',
            'margin-top': Number(uv) * Number(shadow_gadget.y0) + 'px',
          }"
          class="shadow-gadget-container"
          v-show="resize_data && resize_data.gadget"
        >
          <div class="shadow-gadget"></div>
        </div>
        <div
          v-for="(gadget, index) in gadgets"
          v-bind:style="{
            width: Number(uh) * Number(gadget.width) + 'px',
            height: Number(uv) * Number(gadget.height) + 'px',
            'margin-left': Number(uh) * Number(gadget.x0) + 'px',
            'margin-top': Number(uv) * Number(gadget.y0) + 'px',
          }"
          class="gadget"
          :class="{'resized-gadget': resize_data && resize_data.gadget && resize_data.gadget.uuid == gadget.uuid}"
        >
          <div class="gadget-head">
            <span>{{ gadget.name }}</span>
            <i
              v-show="gadget.config_open"
              class="bx bx-trash gadget-btn"
              @click="delete_gadget(gadget)"
            ></i>
            <i
              class="bx bx-dots-horizontal-rounded gadget-btn"
              @click="gadget.config_open = !gadget.config_open"
            ></i>
            
          </div>
          <div class="gadget-body">
            <component
              v-show="!gadget.config_open"
              v-bind:is="gadget.type[0].code"
              :config="gadget.config ? JSON.parse(gadget.config) : {}"
            ></component>

            <component
              v-show="gadget.config_open"
              v-bind:is="gadget.type[0].code + 'Config'"
              :title="gadget.name"
              :config="gadget.config ? JSON.parse(gadget.config) : {}"
              @cancel="gadget.config_open=false"
              @ok="save_gadget($event, gadget)"
            ></component>
          </div>
          <div class="gadget-borders">
            <div
              class="gadget-border gadget-top"
              v-bind:style="{ width: Number(uh) * Number(gadget.width) - 2*gadget_padding + 'px' }"
              @mousedown="start_resize($event, gadget, 'top')"
            ></div>
            <div
              class="gadget-border gadget-right"
              v-bind:style="{
                height:
                  Number(uv) * Number(gadget.height) - 2*gadget_padding -
                  virtual_border_width +
                  'px',
                'margin-left':
                  Number(uh) * Number(gadget.width) - 2*gadget_padding -
                  virtual_border_width / 4 +
                  'px',
              }"
              @mousedown="start_resize($event, gadget, 'right')"
            ></div>
            <div
              class="gadget-border gadget-bottom"
              v-bind:style="{ width: Number(uh) * Number(gadget.width) - 2*gadget_padding + 'px' }"
              @mousedown="start_resize($event, gadget, 'bottom')"
            ></div>
            <div
              class="gadget-border gadget-left"
              v-bind:style="{
                height: Number(uv) * Number(gadget.height) + 'px',
                'margin-top': '-' + Number(uv) * Number(gadget.height) + 'px',
              }"
              @mousedown="start_resize($event, gadget, 'left')"
            ></div>
          </div>
        </div>
        <div class="void-gadgets-bottom">
          <div v-bind:style="{ height: total_height + 'px' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

$gadget-padding: 10px;
$vu: calc((100vh - $top-menu-height - 2 * $gadget-padding) / v-bind(v_units));
$hu: calc((100vw - $main-menu-width - 2 * $gadget-padding) / v-bind(h_units));

#dashboards_table_panel,
#dashboards_card {
  height: calc(100vh - $top-menu-height);
}

#dashboards_table_panel {
  display: flex;
  width: calc(100%);
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

#dashboard_down_panel {
  display: flex;
  flex-direction: column;
  height: calc(100vh - $top-menu-height);

 // background: var(--input-bg-color);
 background: transparent;

  overflow: scroll;
}

#dashboard_down_panel::-webkit-scrollbar {
  display: none;
}

.dashboard-name-input {
  padding: 0px 20px 10px 0px;
}

.dashboard-name-input input{
  font-size: 18px !important;
}

.gadgets {
  padding: 0px 10px 10px 10px;
  width: 100%;
  height: calc(v-bind(total_height) * 1px);
  min-height: calc(v-bind(total_height) * 1px);
  position: relative;
}
.gadget {
  border-style: none;
  border-width: var(--border-width);
  border-color: var(--border-color);
  border-radius: var(--border-radius);
  //resize: both;
  display: flex;
  flex-direction: column;
  position: absolute;
  padding: 5px;
  padding-top: 0px;
  padding-bottom: 10px;
}

.shadow-gadget-container{

  position: absolute;
  padding: 5px;
}

.shadow-gadget{
  background-color: var(--on-button-icon-color);
  opacity: 0.3;
  width: 100%;
  height: 100%;
  border-color: var(--border-color);
  border-radius: var(--border-radius);
  border-style: none;
}

.gadget-head {
  height: $input-height;
  background-color: var(--table-row-color);
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;

  border-style: var(--border-style);
  border-style: groove;
  border-color: var(--border-color);

  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;

  border-top-width: var(--border-width);
  border-left-width: var(--border-width);
  border-right-width: var(--border-width);
  border-bottom-width: 0px;
  border: none;
}

.gadget-head span {
  padding-left: 10px;
  width: 100%;
  font-weight: 400;
}

.gadget-body {
  height: 100%;
  width: 100%;
  position: relative;
  overflow: scroll;
  background-color: var(--panel-bg-color);

  border-style: var(--border-style);
  border-color: var(--border-color);

  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
  border-bottom-left-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);

  border-style: groove;
  border-top-width: var(--border-width);
  border-left-width: var(--border-width);
  border-right-width: var(--border-width);
  border-bottom-width: var(--border-width);
  border: none;
}

.gadget-body::-webkit-scrollbar {
  display: none;
}

.gadget:active {
  width: 0;
  height: 0;
}

.gadget-borders {
  position: absolute;
  margin-top: calc(-1 * v-bind(virtual_border_width) / 2 * 1px);
  margin-left: calc(-1 * v-bind(virtual_border_width) / 2 * 1px);
  width: 0px;
  height: 0px;

}

.gadget-border {
  background: rgba(0, 128, 0, 0);

}

.gadget-left,
.gadget-right {
  width: calc(v-bind(virtual_border_width) * 1px);
  cursor: ew-resize;
}

.gadget-top,
.gadget-bottom {
  height: calc(v-bind(virtual_border_width) * 1px);
  cursor: ns-resize;
}

.void-gadgets-bottom {
  position: absolute;
  width: 1px;
}
.void-gadgets-bottom div {
  position: relative;
  width: 1px;
}

.gadget-btn {
  height: 22px;
  width: 22px;
  font-size: 16px;
  border-radius: var(--border-radius);
  margin-left: 10px;
  color: var(--text-color);
  background-color: var(--button-color);
  border-width: 1px;
  border-color: var(--border-color);
  border-style: solid;
  border-style: outset;
  cursor: pointer;
  text-align: center;
  padding-top: 3px;
  margin-right: 1px;

  text-align: center;
  border: none;
  background: transparent;
  //padding-top: 4px;
}
.gadget-btn:hover{
  background-color: var(--button-color);
}

.delete-dashboard-btn:hover{
  color: red;
}

.add-gadget-btn:hover{
  color: green;
}






.gadget-types-modal {
  padding: 20px;
  position: absolute;
  width: 60%;
  height: fit-content !important;
  width: fit-content !important;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.gadget-types-modal > *:not(:last-child) {
  margin-bottom: 10px;
}

.gadget-types-modal SelectInut {
  width: 100%;
  height: $input-height;
}


.gadget-types-modal .btn {
  width: 100%;
  justify-content: center;
    display: flex;
    margin-top: 10px;
    margin-bottom: 10px;
}

.gadget-types-modal .btn input{
  width: 340px;
  height: $input-height;
  width: 100%;
  margin-left: 10px;
  margin-right: 10px;
}


.gadget-types-modal #create-relation-btn {
  padding-right: 20px;
}

.gadget-types-cells {
  display: flex;
  justify-content: center;
}


.gadget-types-cell {
  width: 100px;
  height: 100px;

    font-size: 20px;

    border-radius: var(--border-radius);
    color: var(--text-color);
    background-color: var(--button-color);
    border-width: 1px;
    border-color: var(--border-color);
    border-style: solid;
    border-style: outset;
    cursor: pointer;
    text-align: center;

    margin: 10px;
    align-items: center;
    display: flex;
}

.gadget-types-cell-disabled{
  cursor:not-allowed;
  opacity: 0.5;
}

.gadget-types-cell span{
width: 100%;
}

.gadget-head .bx-trash:hover{
  color: red;
}


.resized-gadget{
  opacity: 0.5;
}

</style>
