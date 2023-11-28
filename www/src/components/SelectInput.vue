<script>
import Multiselect from "vue-multiselect";
import store_helper from "../store_helper.ts";
import tools from "../tools.ts";

import { nextTick } from "vue";

import "vue-select/dist/vue-select.css";

export default {
  components: {
    Multiselect,
  }, 

  data() {
    let d = {
      val: undefined,
      updated_at: undefined
    };
    return d;
  },
  emits: ["search", "update_parent_from_input", "updated", "tag_clicked", "value_created", "value_selected", "value_deselected"],

  beforeCreate() {},
  watch: {
    value: function (val, oldVal) {
     
        
        this.val = val
    
    },
    val: function (val, oldVal) {
      //this.convert_values_to_uuids()

      
      if(this.updated_at == undefined) 
      {
        this.updated_at = new Date()
        return
      }
      this.updated_at = new Date()

      let val_obj;
      for (let i in this.values) {
        if (this.values[i].uuid == val) {
          val_obj = this.values[i];
          break;
        }
      }

      console.log("vue_select", val, oldVal, this.id, val_obj);
      //   console.log('pname', this.parent_name)

      if (val != undefined && val[0] != undefined && val[0].num != undefined) {
        let num = 1;
        for (let i in val) {
          val[i].num = num;
          num++;
        }
      }

      if (this.parent_name != undefined && this.parent_name != "")
        console.log('idpush')
        this.$store.commit("id_push_update_" + this.parent_name, {
          id: this.id,
          val: val,
        });

      this.$emit("update_parent_from_input", val); //val_obj == undefined? val : val_obj)
      this.$emit("updated", val);
    },
  },
  computed: {},
  props: {
    name_path: {
      type: String,
      default: "",
    },
    values: {
      type: Array,
      default: () => [],
    },
    value: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    parameters: {
      type: Object,
      default: {},
    },
    id: {
      type: String,
      default: "",
    },
    parent_name: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    close_on_select: {
      type: Boolean,
      default: true,
    },
    taggable: {
      type: Boolean,
      default: false,
    },
    multiselect: {},
  },
  mounted() {
    console.log('mounted', this.value)
    this.val = this.value
  },
  methods: {
    
    check_selectable: function (val) {
      //   console.log('this.value0', val + '')
      //console.log('this.val1', value + '')
      //    console.log('this.val2', this.val + '')
      if (this == undefined) return true;
      //    console.log('this.val', this.val + '')
      if (!(this.val instanceof Array)) return true;

      for (let i in this.val) {
        if (this.val[i].uuid == undefined && this.val[i] == val.uuid)
          return false;
        else if (this.val[i].uuid == val.uuid) return false;
      }
      return true;
    },
    convert_values_to_uuids: function () {
      if (this.val == undefined) return;
      if (!(this.val instanceof Array)) return;
      if (this.val.length == 0) return;
      if (this.val[0].uuid == undefined) return;

      let val = [];
      for (let i in this.val) {
        val.push(this.val[i].uuid);
      }
      //    console.log('vvv2', this.val+'')
      this.val = val;
    },
    deselect: function(option)
    {
     
      console.log('deselect',this.val, option)
      if(this.val.filter == undefined) {
        this.val = null
      }
      else{
        this.val = this.val.filter((val) => {
          return (val.uuid != option.uuid)
        })
      }
      
      this.$emit("value_deselected", option);

    },
    create_option: function (text) {
      let newOption

      for(let i in this.values){
        if(text == this.values[i].name){
          newOption = this.values[i]
        }
      }

      if(newOption == undefined){
        newOption = { uuid: tools.uuidv4(), name: text };
        this.$emit("value_created", newOption);
      }
   
      return newOption;
    },

    value_selected: function(sel_val)
    {
      console.log('sel_val',sel_val)
     
      this.$emit('value_selected', sel_val)
    }
  },
};
</script>

<template>
  <div class="select-input input">
    <div class="label">{{ label }}</div>

    <v-select
      v-model="val"
      label="name"
      :reduce="parameters.reduce"
      :multiple="parameters.multiple"
      :clearable="parameters.clearable"
      :disabled="disabled"
      :options="values"
      :selectable="check_selectable"
      @search="(text, arg2) => $emit('search', text)"
      :taggable="taggable"
      :close-on-select="close_on_select"
      :createOption="create_option"
      @option:selected="value_selected"
      :appendToBody="appendToBody"
    >
      
      <template v-if="taggable"
      #selected-option-container="{ option}"
      >
        
          <div class="select-input-selected" :style="[ 
              option.color ? { 'background': option.color } : ''
          ]">
          
          <span
          @click="$emit('tag_clicked', option)"
          :style="[ 
              option.text_color ? { 'color' : option.text_color } : ''
          ]"
          class="vs__selected">
            {{ option.name }}
          </span>
          <div class="x-icon-container">
            <i class='bx bx-x' @click="deselect(option)"></i>
          </div>
        </div>
      </template>
      <template v-slot:no-options="{ searching }">
        <template v-if="searching"> Ничего не найдено </template>
      </template>
    </v-select>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

.select-input .vs__search::placeholder,
.select-input .vs__dropdown-toggle,
.select-input .vs__dropdown-menu {
  background: var(--input-bg-color);

  color: var(--text-color);

  border-color: var(--border-color);
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-radius: var(--border-radius);
}

.select-input .vs__dropdown-toggle {
  min-height: $input-height;
  height: auto;
}

.select-input .vs__clear,
.select-input .vs__open-indicator {
  fill: var(--text-color);
}

.vs__active {
  background-color: red;
}

.select-input .vs__selected {
  color: var(--text-color);
}

.select-input {
}

.select-input img {
  height: 18px;
  width: 18px;
  object-fit: cover;
  border-radius: var(--panel-bg-color);
  margin-right: 10px;
  position: relative;
  top: 5px;
}

.select-input .vs__selected img {
  top: 0px;
}

.select-input .vs__dropdown-menu {
  -ms-overflow-style: none;
  scrollbar-width: none;
  overflow-y: scroll;
}

.select-input .vs__dropdown-menu::-webkit-scrollbar {
  display: none;
}

.vs__selected {
  background-color: var(--table-row-color-selected);
}

.select-input-selected{
  font-weight: 700;
  margin-right: 10px;
  background-color: var(--table-row-color-selected);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
}

.vs__deselect {
  fill: var(--text-color);
}

.vs--disabled .vs__clear,
.vs--disabled .vs__dropdown-toggle,
.vs--disabled .vs__open-indicator,
.vs--disabled .vs__search,
.vs--disabled .vs__selected {
  background-color: var(--disabled-bg-color);
  color: var(--disabled-text-color);
}

.vs--disabled .vs__clear,
.vs--disabled .vs__open-indicator {
  fill: var(--disabled-bg-color);
}
</style>

<style scoped lang="scss">
>>> {
  --vs-dropdown-option--active-bg: var(--table-row-color-selected);
}
</style>
