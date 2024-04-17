<script>
import tools from "../tools.ts";
import graph_math from "../graph_math.ts";

import store_helper from "../store_helper.ts";

export default {
  data() {
    return {
      selected: {},
      dragging_all: false,
      issue_statuses_collumns: [
        {
          name: "Название",
          id: "name",
        },
      ],
      scale: 1
    };
  },

  methods: {
    get_node_by_uuid(uuid) {
      for (let i in this.wdata.workflow_nodes) {
        if (this.wdata.workflow_nodes[i].issue_statuses[0].uuid === uuid)
          return this.wdata.workflow_nodes[i];
      }
    },
    get_edge_by_uuids(uuids) {
      let [from_uuid, to_uuid] = uuids.split(",");
      for (let i in this.wdata.transitions) {
        let tr = this.wdata.transitions[i];
        if (tr.status_from_uuid === from_uuid && tr.status_to_uuid == to_uuid)
          return tr;
      }
    },
    calc_edge_d(transition, is_bidirectional) {
      let node_from = this.get_node_by_uuid(transition.status_from_uuid);
      let node_to = this.get_node_by_uuid(transition.status_to_uuid);

      if (node_from === undefined || node_to === undefined) return "";
      return graph_math.calc_edge_d(
        node_from,
        node_to,
        this.node_radius,
        is_bidirectional
      );
    },
    are_bidirectional(edge0, edge1) {
      return (
        edge0.status_from_uuid == edge1.status_to_uuid &&
        edge0.status_to_uuid == edge1.status_from_uuid &&
        edge0.uuid != edge1.uuid
      );
    },
    calc_are_bidirectional_edges() {
      let are_bidirectional_array = {};
      for (let i in this.wdata.transitions) {
        are_bidirectional_array[i] = false;
        for (let j in this.wdata.transitions) {
          let are_bidirectional = this.are_bidirectional(
            this.wdata.transitions[i],
            this.wdata.transitions[j]
          );
          if (are_bidirectional)
            are_bidirectional_array[i] = are_bidirectional_array[j] = true;
        }
      }
      return are_bidirectional_array;
    },
    update_edges(node_uuid) {
      let are_bidirectional = this.calc_are_bidirectional_edges();
      for (let i in this.wdata.transitions) {
        let tr = this.wdata.transitions[i];
        if (
          tr.status_from_uuid != node_uuid &&
          tr.status_to_uuid != node_uuid &&
          node_uuid != undefined
        )
          continue;

        tr.d = this.calc_edge_d(tr, are_bidirectional[i]);

        let el = this.$refs[tr.status_from_uuid + "," + tr.status_to_uuid][0];

        el.setAttribute("d", tr.d);
      }
    },
    select_node(event) {
      let el = event.currentTarget
      this.selected = { node: this.get_node_by_uuid(el.getAttribute("uuid")) };
      console.log("select node", this.selected)
    },
    select_edge(event) {
      let el = event.currentTarget
      this.selected = { edge: this.wdata.transitions[el.getAttribute("idx")] };
    },
    node_mousedown(event, uuid) {
      this.dragging_all = false;

      let node = this.get_node_by_uuid(uuid);

      if (this.$refs["is_edge_creation_active"].value) {
        let d =
          "M" +
          node.x +
          "," +
          node.y +
          "L" +
          event.offsetX +
          "," +
          event.offsetY;
        this.$refs["dragline"].setAttribute("d", d);
        this.$refs.dragline.classList.remove("hidden");
      }

      this.dragged_node.el = event.currentTarget
      this.dragged_node.issue_statuses = node.issue_statuses;
    },
    node_mouseup(event, uuid) {
      if (!this.$refs["is_edge_creation_active"].value) return;
      if (this.dragged_node.issue_statuses == undefined) return;

      let node = this.get_node_by_uuid(uuid);

      if (
        this.dragged_node.issue_statuses[0].uuid == node.issue_statuses[0].uuid
      )
        return;

      this.create_edge(
        this.dragged_node.issue_statuses[0].uuid,
        node.issue_statuses[0].uuid
      );
    },
    svg_mousedown(event) {
      this.dragging_all = true;
      console.log("svg_mousedown");
    },
    svg_mouseup(event) {
      this.dragging_all = false;
      this.$refs.dragline.classList.add("hidden");
      this.dragged_node.issue_statuses = undefined;
      console.log("svg_mouseup");
    },
    svg_mouseleave(event) {
      this.$refs.dragline.classList.add("hidden");
      this.dragged_node.issue_statuses = undefined;
      console.log("svg_mouseleave");
    },
    mouse_move(event) {
      if (event.type == "touchmove") return;
      if (this.dragged_node.issue_statuses == undefined) {
        if (!this.dragging_all) return;

        for (let i in this.wdata.workflow_nodes) {
          let node = this.wdata.workflow_nodes[i];
          //    console.log('nn', node)
          node.x += event.movementX;
          node.y += event.movementY;

          let el = this.$refs[tr.status_from_uuid + "," + tr.status_to_uuid];

          node.el.setAttribute(
            "transform",
            "translate(" + node.x + "," + node.y + ")"
          );
        }

        this.update_edges();
        return;
      }
      let node = this.get_node_by_uuid(
        this.dragged_node.issue_statuses[0].uuid
      );

      if (this.$refs["is_edge_creation_active"].value) {
        let d =
          "M" +
          node.x +
          "," +
          node.y +
          "L" +
          event.offsetX +
          "," +
          event.offsetY;
        //     console.log(this.$refs['dragline'])
        this.$refs["dragline"].setAttribute("d", d);
      } else {
        node.x += event.movementX;
        node.y += event.movementY;
        this.dragged_node.el.setAttribute(
          "transform",
          "translate(" + node.x + "," + node.y + ")"
        );
        //console.log('nnn', this.$store['selected_workflows'])
        this.update_edges(this.dragged_node.issue_statuses[0].uuid);
      }
    },

    format_node_text(text) {
      const line_up = 3;
      const line_height = 12;
      let formated_text = "";

      let words = text.split(/\s+/g);
      let len = words.length;

      for (let i in words) {
        let y =
          -(line_height * (words.length - 1)) / 2 + line_height * i + line_up;
        formated_text += "<tspan x=0 y=" + y + ">" + words[i] + "</tspan>";
        //if(i > 0)
      }

      return formated_text;
    },
    create_edge(from_uuid, to_uuid) {
      let name_from = this.get_node_by_uuid(from_uuid).issue_statuses[0].name;
      let name_to = this.get_node_by_uuid(to_uuid).issue_statuses[0].name;
      let transition = {
        name: name_from + "->" + name_to,
        uuid: tools.uuidv4(),
        status_from_uuid: from_uuid,
        status_to_uuid: to_uuid,
        workflows_uuid: this.wdata.uuid,
        table_name: "transitions",
      };
      this.wdata.transitions.push(transition);
    },
    create_node() {
      let st = this.selected_issue_statuses;

      if (this.get_node_by_uuid(st.uuid) != undefined) {
        console.log("status already exists");
        return;
      }

      let node = {
        issue_statuses: { 0: st },
        issue_statuses_uuid: st.uuid,
        uuid: tools.uuidv4(),
        workflows_uuid: this.wdata.uuid,
        x: this.$refs["svg_workflow"].clientWidth - 50,
        y: 50,
        table_name: "workflow_nodes",
      };
      this.wdata.workflow_nodes.push(node);
    },
    delete_edge(tr) {
      this.wdata.transitions.splice(this.wdata.transitions.indexOf(tr), 1);
    },
    delete_related_edges(uuid) {
      let toSplice = this.wdata.transitions.filter(function (tr) {
        return tr.status_to_uuid == uuid || tr.status_from_uuid == uuid;
      });
      toSplice.map(this.delete_edge);
    },
    delete_element() {
      if (this.selected.node != undefined) {
        let uuid = this.selected.node.issue_statuses[0].uuid;
        this.delete_related_edges(uuid);
        this.update_edges(uuid);

        this.wdata.workflow_nodes.splice(
          this.wdata.workflow_nodes.indexOf(this.selected.node),
          1
        );
      } else if (this.selected.edge != undefined) {
        this.delete_edge(this.selected.edge);
      }

      this.selected = {};
    },
    get_selected_name() {
      if (this.selected.node != undefined)
        return this.selected.node.issue_statuses[0].name;
      if (this.selected.edge != undefined) return this.selected.edge.name;
      return "";
    },
    update_selected_name(val) {
      if (this.selected.node != undefined) {
        let uuid = this.selected.node.issue_statuses[0].uuid;

        for (let i in this.wdata.workflow_nodes) {
          if (this.wdata.workflow_nodes[i].issue_statuses[0].uuid == uuid) {
            this.wdata.workflow_nodes[i].issue_statuses[0].name = val;
            return;
          }
        }
      } else if (this.selected.edge != undefined) {
        let uuid = this.selected.edge.uuid;

        for (let i in this.wdata.transitions) {
          console.log("edge", uuid, this.wdata.transitions[i].uuid);
          if (this.wdata.transitions[i].uuid == uuid) {
            this.wdata.transitions[i].name = val;
            return;
          }
        }
      }
    },
  },

  props: {
    wdata: {
      type: Object,
      default: {},
    },
    is_edge_creation_active: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: "",
    },
    dragged_node: {
      type: Object,
      default: {},
    },

    node_radius: {
      type: Number,
      default: 35,
    },

    arrows: {
      type: Array,
      default: () => [
        {
          id: "end-arrow",
        },
        {
          id: "hover-end-arrow",
        },
        {
          id: "selected-end-arrow",
        },
        {
          id: "drag-end-arrow",
        },
      ],
    },
  },
  watch: {
    wdata: {
      handler: function (val, oldVal) {
        //  this.$store.commit('push_update_workflows', val)

        this.$store.commit("id_push_update_workflows", { id: "", val: val });
        //    console.log('wwwww', val)
      },
      deep: true,
    },
  },
  mounted() {
    this.update_edges();
  },
  updated() {
    this.update_edges();
  },
  beforeCreate() {
    //   console.log('iss1')
    let name = "issue_statuses";
    if (!this.$store.state[name]) {
      const store_module = store_helper.create_module(name, "");
      //   console.log('iss1', store_module)
      this.$store.registerModule(name, store_module);
    }
  },
  created() {
    this.$store.dispatch("get_issue_statuses");
  },
  computed: {
    issue_statuses: function () {
      return this.$store.getters.get_issue_statuses;
    },
    selected_issue_statuses: function () {
      return this.$store.getters.selected_issue_statuses;
    },
  },
};
</script>

<template>
  <div class="workflows-editor">
    <div class="workflows-command-panel">
      <StringInput
        :label="'Название статуса/перехода'"
        @update_parent_from_input="update_selected_name"
        :value="get_selected_name()"
      />
      <KButton :name="'Удалить элемент'" @click="delete_element()" />
      <BooleanInput
        ref="is_edge_creation_active"
        :label="'Создание переходов'"
        :id="'is-edge-creation-active'"
        :value="is_edge_creation_active"
      />
    </div>
    <div class="svg-container">
      <svg
        class="svg-workflow"
        ref="svg_workflow"
        @mousemove="mouse_move($event)"
        @touchmove="mouse_move($event)"
        @mouseup="svg_mouseup($event)"
        @mousedown="svg_mousedown($event)"
        @touchend="svg_mouseup($event)"
        @mouseleave="svg_mouseleave($event)"
       
        preserveAspectRatio="slice"
      >
        <defs>
          <marker
            v-for="(arrow, index) in arrows"
            :key="index"
            :id="arrow.id"
            viewBox="0 -5 10 10"
            refX="9"
            markerWidth="3.5"
            markerHeight="3.5"
            orient="auto"
          >
            <path d="M0,-5L10,0L0,5"></path>
          </marker>
        </defs>
        <g class="graph">
          <path
            class="link dragline hidden"
            d="M0,0L0,0"
            style="marker-end: url('#drag-end-arrow')"
            ref="dragline"
          ></path>

          <g>
            <path
              v-for="(edge, index) in wdata.transitions"
              :key="index"
              class="link"
              :name="edge.name"
              :from_uuid="edge.status_from_uuid"
              :to_uuid="edge.status_to_uuid"
              :idx="index"
              :ref="edge.status_from_uuid + ',' + edge.status_to_uuid"
              @click="select_edge($event)"
              v-bind:class="{
                selected:
                  selected.edge != undefined && selected.edge.uuid == edge.uuid,
              }"
            ></path>
          </g>
          <g>
            <g
              v-for="(node, index) in wdata.workflow_nodes"
              :key="index"
              class="conceptG"
              :uuid="node.issue_statuses[0].uuid"
              :ref="node.issue_statuses[0].uuid"
              :transform="'translate(' + node.x + ',' + node.y + ')'"
              @click="select_node($event)"
              @mousedown="node_mousedown($event, node.issue_statuses[0].uuid)"
              @touchstart="node_mousedown($event, node.issue_statuses[0].uuid)"
              @mouseup="node_mouseup($event, node.issue_statuses[0].uuid)"
              @touchend="node_mouseup($event, node.issue_statuses[0].uuid)"
              v-bind:class="{
                selected:
                  selected.node != undefined &&
                  selected.node.issue_statuses[0].uuid ==
                    node.issue_statuses[0].uuid,
              }"
            >
              <circle :r="node_radius"></circle>
              <text
                text-anchor="middle"
                dy="-0"
                v-html="format_node_text(node.issue_statuses[0].name)"
              ></text>
            </g>
          </g>
        </g>
        
      </svg>
      <KButton
            id="graph_zoom_in"
            name="+"
            @click="scale+=0.1"
          >
        </KButton>
          <KButton
            id="graph_zoom_out"
            name="-"
            @click="scale-=0.1"
          >
      </KButton>
      <div class="statuses-container">
        <div class="statuses-search-and-add">
          <KButton
            id="add-status-to-graph"
            name="Использовать статус"
            @click="create_node()"
          >
          </KButton>
        </div>
        <KTable
          class="table-statuses"
          :collumns="issue_statuses_collumns"
          :table-data="issue_statuses"
          :name="'issue_statuses'"
        >
        </KTable>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
/* Google Font Link */
@import "../css/global.scss";

.workflows-editor {
  display: flex;
    flex-direction: column;
    height: 100%;
    flex-grow: 1;
    overflow-y: auto;
}

.workflows-command-panel {
  display: flex;
  flex-direction: row;
  height: 74px;
  align-items: flex-end;
  padding-bottom: 12px;
}

.workflows-command-panel > *:not(:last-child) {
  margin-right: 20px;
}

.workflows-command-panel .label{
  text-wrap: nowrap;
}


.workflows-command-panel .string,
.workflows-command-panel .boolean {
  padding-top: 0px;
  margin-top: -12px;
  /* margin-left: 0px; */
  padding-left: 0px;
}

.workflows-command-panel .string-input,
.workflows-command-panel .boolean-input {
  height: 28px;
}

.workflows-command-panel .btn {
  margin-right: 20px;
}

.svg-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
  padding-bottom: 8px;
  flex-grow: 1;
    overflow-y: auto;
}

.svg-workflow,
.statuses-container {
  height: 100%;

}

.svg-workflow,
.table-statuses {
  border-radius: var(--border-radius);
  background-color: var(--input-bg-color);
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  transition: all 0.2s ease;
  border-color: var(--border-color);
  border-width: 2px;
  border-style: inset;
}

.svg-workflow {
  width: 100%;
}

.statuses-container {
  width: 200px;
  margin-left: 10px;
  display: flex;
  flex-direction: column;
  
}

.statuses-container .ktable {
  margin-left: 0;
  padding: 2px;
  width: 100%;
  margin-top: 10px;
  height: 100%;
}

.statuses-search-and-add {
  display: flex;
  flex-direction: row;
}

.statuses-search-and-add .string,
.statuses-search-and-add .string-input {
  padding: 0px;
}

#graph_zoom_in, #graph_zoom_out {
  width: 28px;
  height: 28px;
  margin-bottom: 10px;
  margin-right: 5px;
}

#add-status-to-graph{

}

#graph_zoom_in input, #graph_zoom_out input {
  width: 28px;
  height: 28px;
  font-size: 18px;
}

#add-status-to-graph input{
  
}


#graph_zoom_in, #graph_zoom_out {
position: absolute;
    right: 210px;
    
}

#graph_zoom_in {
  top: 6px;
}

#graph_zoom_out {
    top: calc($input-height + 6px);
}



.statuses-search-and-add .string input {
  height: 28px;
}
.statuses-search-and-add .label {
  height: 0px;
}
g.conceptG{
  transition: all 0.05s ease;
}

.conceptG text {
  pointer-events: none;
  font-size: 12px;
}

marker {
  fill: var(--workflow-marker-color);
}

g.conceptG circle {
  fill: var(--workflow-g-fill-color);
  stroke: var(--workflow-marker-color);
  stroke-width: 2px;
  color: var(--workflow-marker-color);
  cursor: grab;
}

g.conceptG:active circle {
  cursor: grabbing;
}

g.conceptG text tspan {
  fill: var(--workflow-marker-color);
}

g.conceptG:hover circle {
  fill: var(--workflow-g-hover-fill-color);
  stroke: var(--workflow-g-hover-color);
}

g.selected circle {
  stroke-width: 4px;
  stroke: var(--workflow-g-selected-color);
}
g.selected:hover circle {
  stroke-width: 4px;
  stroke: var(--workflow-g-selected-color);
}

#hover-end-arrow {
  fill: var(--workflow-g-hover-color);
}

path.link {
  fill: none;
  stroke: var(--workflow-marker-color);
  stroke-width: 3px;
  cursor: pointer;
  marker-end: url(#end-arrow);
  transition: all 0.05s ease;
}

path.dragline {
  stroke-dasharray: 15, 4;
  stroke-width: 2px;
}

path.link:hover {
  stroke: var(--workflow-g-hover-color);
  marker-end: url(#hover-end-arrow);
}

g.connect-node circle {
  fill: red;
}

path.link.hidden {
  stroke-width: 0;
}

path.link.selected {
  stroke: var(--workflow-g-selected-color);
  marker-end: url(#selected-end-arrow);
}

#selected-end-arrow {
  fill: var(--workflow-g-selected-color);
}

.graph{
  scale: v-bind('scale');
}

.workflows-editor .btn{
  height: $input-height;
}

</style>
