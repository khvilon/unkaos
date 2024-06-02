<script>
import tools from "../tools.ts";
//"'/issue/'+get_json_val(row, collumn.id)"

export default {
  emits: ["row_selected", "order", "scroll_update"],
  methods: {
    sort(collumn) {
      if(collumn.not_sortable) return;
      for (let i in this.collumns) {
        if (this.collumns[i].id == collumn.id) {
          if (this.collumns[i].asc) {
            this.collumns[i].desc = true;
            this.collumns[i].asc = false;
          } else {
            this.collumns[i].desc = false;
            this.collumns[i].asc = true;
          }
        } else {
          this.collumns[i].asc = this.collumns[i].desc = false;
        }
      }
      this.$store.dispatch("sort_" + this.name, {collumn: collumn.id, type: collumn.type});
      this.$emit("order", collumn);
    },
    scroll_handler(e) {
      let bottom = e.target.getBoundingClientRect().bottom;
      let table_bottom = e.target.children[0].getBoundingClientRect().bottom;
      const critical_diff = 200;
      if (table_bottom - bottom > critical_diff) return;
      const time_diff = 1000;
      if (new Date() - this.last_scroll_update < time_diff) return;
      this.last_scroll_update = new Date();
      this.$emit("scroll_update");
      //     console.log('time to load more')
    },
    select_row(row) {
      let uuid = row.uuid; //event.path[1].getAttribute('uuid');
      this.$store.commit("select_" + this.name, uuid);
      this.$emit("row_selected", uuid);
      //console.log("sel", this.name)
    },
    get_row_by_uuid(uuid) {
      for (let i in this.tableData) {
        if (this.tableData[i].uuid == uuid) return this.tableData[i];
      }
    },
    all_parents_expended(uuid) {
      if (uuid == null) return true;

      let parent = this.get_row_by_uuid(uuid);

      if (parent == undefined) return true;

      if (!parent.expanded) return false;

      return this.all_parents_expended(parent.parent_uuid);
    },
    get_json_val: tools.obj_attr_by_path,
    get_user(uuid) {
      let users = this.dicts["users"];
      let user;
      for (let i in users) {
        if (users[i].uuid == uuid) {
          user = users[i];
          continue;
        }
      }

      if (user == undefined) return { avatar: this.default_avatar, name: "-" };
      if (user.avatar == null || user.avatar == "" || user.avatar == undefined)
        user.avatar = this.default_avatar;
      return user;
    },
    format_val(row, collumn) {
      const max_length = 100;

      let type = collumn.type;
      //let val = row[collumn.id]

      let val = this.get_json_val(row, collumn.id);

      //console.log('fff', val)

      //(collumn.id.indexOf('.') > -1) val = row[collumn.id.split('.')[0]][0][collumn.id.split('.')[1]]

      if (type == undefined) {
        if (
          val != undefined &&
          val.toString() != undefined &&
          val.toString().length > 100
        )
          val = val.toString().substring(0, max_length) + "...";
        return val;
      }
      if (type == "date") {
        //  console.log('dtval', val)
        var options = {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          timezone: "Moscow",
        };
        let dt = "";
        try {
          dt = new Date(val).toLocaleString("ru", options);
          if (dt == "Invalid Date") return "";
        } catch {
          return "";
        }
        return dt;
      }
      if (type == "dt") {
        return tools.format_dt(val)
      }
      if (type == "boolean") {
        if (val == "true" || val == true || val == "t") return "✓";
        else return "✗";
      }
      if (type == "user") {
        return this.get_user(val);
      }
      return val;
    },
  },
  emits: ["scroll_update"],
  data() {
    return {
      last_scroll_update: new Date(),
      children_padding: 10,
      default_avatar:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAAe9JREFUSEvlVtFRHTEQkyqADggVABWEdAAdQAVABSQVABWkBOgAqACoAEqACsRoZp05fPZ5j8kMH+zPvbnzW3m18srEFwW/CBefApa0D2AnNv1I8n5tAauAJR0A+AtgswJ6BXBM8ia7gTSwpEsAJ4PEZyS9bhgp4KD2NrKZVie/I/kaLJwC+Bnff5G8GyFngR+jp08kd1tJJb0A2ALgnu/9L2BFoi6Vkn4DOPc6ksOChgsqmrs0ZtcVJjLAPwA8xx8Oe8qVdBSK99Jtkqa+G0Ng/1OSj8sGgCuSFtIsJqp/I1kft9n6LPD0KM3ormjubm6KngV2BT4iZVr5t5VuJjxUitK7qq9LTgEH3e61J1MBr3P5fB+NepsWV51dkns8rdKV32Qn1qeBR4Mh+z1FtST30BT72Zxc0XNX7z77uRiLwJIsKruRqV0T1oLdyuJrRhe4Y4FvUVkrmZnwWS+xaJVN4KD2YZLkyo40UqwkK9/im9rnXov6HnBxI1d4kLG5KQXB1nW8a7rVDHjqMgDSxt45dhfx/g9Ju9e/aAF7KtnU01OoJyBJhbl7kr6nLQIX753tco2svXbJoz9UXImqa4HZDVS9/iCyGth0lLtV6u60tImly0EN7IFRJpPV2B0AmapjADXzpUZmBmTtmu8H/A4J79EfjfUqWAAAAABJRU5ErkJggg==",
    };
  },
  props: {
    tree_view: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: "",
    },
    dicts: {},
    collumns: {
      type: Array,
      default: () => [],
    },
    tableData: {
      default: () => [],
    },
  },
};
</script>

<template>
  <div class="ktable" @scroll="scroll_handler">
    <table>
      <thead>
        <tr>
          <th
            v-for="(collumn, index) in collumns"
            :key="index"
            @click="sort(collumn)"
            v-bind:class="{ 'sortable-row': !collumn.not_sortable }"
          >
            <label>{{ collumn.name }}</label>
            <label class="sort_arrow" v-bind:class="{ sorted_asc: collumn.asc }"
              >&#9660;</label
            >
            <label
              class="sort_arrow"
              v-bind:class="{ sorted_desc: collumn.desc }"
              >&#9650;</label
            >
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in tableData"
          :key="index"
          :uuid="row.uuid"
          :class="{
            selected_row: row.selected,
            'hidden-row':
              tree_view &&
              row.parent_uuid != null &&
              !all_parents_expended(row.parent_uuid),
          }"
        >
          <td
            v-for="(collumn, index) in collumns"
            :key="index"
            @click="select_row(row)"
          >
            <span v-if="tree_view && collumn.type == 'link'">
              {{ "    ".repeat(row.ch_level) }}
            </span>

            <span
              class="expander"
              v-if="
                tree_view &&
                collumn.type == 'link' &&
                row.children != undefined &&
                row.children.length > 0
              "
              @click="row.expanded = !row.expanded"
            >
              {{ row.expanded ? "⯆ " : "⯈ " }}
            </span>

            <span
              v-if="
                tree_view &&
                collumn.type == 'link' &&
                row.parent_uuid != null &&
                (row.children == undefined || row.children.length == 0)
              "
              >{{ "● " }}</span
            >

            <span
              v-if="
                collumn.type != 'link' &&
                collumn.type != 'user' &&
                collumn.id != 'parent_uuid'
              "
              @click="select_row(row)"
              >{{ format_val(row, collumn) }}</span
            >

            <div
              class="user"
              v-if="collumn.type == 'user'"
              @click="select_row(row)"
            >
              <img :src="format_val(row, collumn).avatar" />
              {{ format_val(row, collumn).name }}
            </div>

            <a
              v-if="collumn.type == 'link'"
              :href="(collumn.link[0] == '/' ? '/' + $store.state.common.workspace : '') + collumn.link + get_json_val(row, collumn.link_id)"
              tag="li"
              class="link"
            >
              {{ get_json_val(row, collumn.id) }}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

table {
  text-align: left;
  width: 100%;

  border-collapse: separate;
  border-spacing: 0 10px;
  margin-top: -10px; //correct offset on first border spacing if desired
}

td {
  padding-right: 10px;
  padding-left: 10px;
}

.selected_row td {
  background-color: var(--table-row-color-selected);
  //border-color: var(--table-row-color-selected);
}
td {
  border: solid 2px #000;
  border-style: solid none;
  padding: 3px 3px 3px 3px;
  //border-color: var(--table-row-color);
  border-color: transparent;
  background-color: var(--table-row-color);
}
td:first-child {
  border-left-style: solid;
  border-top-left-radius: var(--border-radius);
  border-bottom-left-radius: var(--border-radius);
}
td:last-child {
  border-right-style: solid;
  border-bottom-right-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
}

.selected_row td {
  background-color: var(--table-row-color-selected);
  //border-color: var(--table-row-color-selected);
}

.ktable tbody tr:hover{
  background-color: var(--table-row-color-hover);
  //border-color: var(--table-row-color-selected);
}
/*
 .selected_row
 {
    border-style: solid;
    border-color: white;
    border-width: 2px;
    border-radius: 6px;
 }*/

.ktable {
  overflow-y: auto;
}
.ktable::-webkit-scrollbar {
  display: none;
}

.ktable * {
  user-select: text;
}

.sort_arrow {
  display: none;
}
.sorted_asc,
.sorted_desc {
  display: inline;
}

.user {
  margin-top: -5px;
}

.expander {
  cursor: pointer;
}

.hidden-row {
  display: none;
}

.user img {
  height: 18px;
  width: 18px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
  top: 5px;
}

.sortable-row label{
  cursor: pointer;
}
</style>
