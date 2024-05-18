<script>
import tools from "../tools.ts";
import rest from "../rest.ts";

export default {
  emits: ["new_relation", "relation_deleted"],
  props: {
    label: {
      type: String,
      default: "label",
    },
    value: {
      type: String,
      default: "",
    },
    id: {
      type: String,
      default: "",
    },
    parent_name: {
      type: String,
      default: "",
    },
    relation_types: {
      type: Array,
      default: [],
    },
    formated_relations: {
      type: Array,
      default: [],
    },
  },
  methods: {
    get_src: function (value) {
      if (value) return value;
    },
  },
};
</script>

<template>
  <label class="relations">
    <div class="label">
      <i class="bx bx-link"></i
      ><i
        class="add-relation-btn bx bx-plus"
        @click="() => $emit('new_relation')"
      ></i
      >{{ label }}
    </div>
    <div
      class="relation"
      v-for="(relation, index) in formated_relations"
      :key="index"
    >
      <span v-if="relation != undefined">
        {{ relation.type_name }}
        <a :href="'/' + $store.state['common'].workspace + '/issue/' + relation.id" v-bind:class="{ relation_resolved: relation.issue_resolved }"
          >{{ relation.id }} {{ relation.issue_name }}</a
        >
        <i
          class="bx bx-unlink"
          @click="() => $emit('relation_deleted', relation.uuid)"
        ></i>
      </span>
    </div>
  </label>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$relation_input_border_width: 2px;

.relations .relations-input {
  width: 100%;
  height: $input-height * 2;
}

.relations {
  display: block;
  margin-top: 20px;
}

.relations-input {
  font-size: 20px;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background-color: transparent;
  text-align: center;
  border-color: var(--table-row-color);
  border-width: $relation_input_border_width;
  border-style: solid;
  display: flex;
}

.relation {
  margin-top: 2px;
  margin-left: 10px;
  margin-bottom: 3px;
}

.relation_resolved {
  text-decoration: line-through;
  opacity: .7;
}

.relations * {
  user-select: text;
} 

.add-relation-btn {
  margin-top: 5px;
  margin-left: 10px;
  margin-bottom: 3px;
  font-size: $font-size * 1.4;
  cursor: pointer;
}

.add-relation-btn:hover {
  color: green;
}

.relation span {
 // white-space: nowrap;
  line-height: calc($input-height/2);
}

.relation i {
  padding-left: 10px;
  padding-right: 10px;
  cursor: pointer;
}

.relation .bx-unlink:hover {
  color: red;
}

.relation a:hover {
  color: green;
}

.relations .bx-link {
  font-size: $font-size * 1.4;
}
</style>
