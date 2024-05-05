<script>
import BooleanInput from './BooleanInput.vue';
import tools from '../../tools';

export default {
  components: { BooleanInput },
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: "label",
    },
    value: {
      type: Array,
      default: () => [],
    },
    id: {
      type: String,
      default: "",
    },
    parent_name: {
      type: String,
      default: "",
    },
    values: {
      type: Array,
      default: () => [],
    },
    value_field: {
      type: String,
      default: "name",
    },
    uuid_match_field: {
      type: String,
      default: "uuid",
    },
    new_instance_creation:{
      type: Function,
      default: function(lineObject, parameters){
        return tools.obj_clone(lineObject);
      },
    },
    new_instance_parameters: {
      type: Object,
      default: {},
    },

  },

  data()
  {
    return {
      current_value: null,
    }
  },

  emits: ["update_parent_from_input"],

  methods: {
    updateCheckbox(boolVal, val) {
      let boolCurrent = Boolean(this.current_value.filter((v)=>v[this.uuid_match_field] == val.uuid).length)
      if(boolCurrent == boolVal) return;

      if(boolVal) {
        console.log('need add vall!!!')
        let instance = this.new_instance_creation(val, this.new_instance_parameters);
        this.current_value.push(instance);
      }
      else{
        console.log('need remove vall!!!')
        this.current_value = this.current_value.filter((v)=>v[this.uuid_match_field] != val.uuid)
      }

      
      this.$emit("update_parent_from_input", this.current_value);


    },
  },

  watch: {
    value: function (val, oldVal) {
 

      this.current_value = tools.obj_clone(this.value)

    
    },
    
  },
};
</script>

<template>
  <div class="checkboxlist">
    <div class="label">{{ label }}</div>
    <div
      class="checkboxlist-input"
      :disabled="disabled"
      >
        <div
          class="checkboxlist-line"
          v-for="(val, index) in values"
          :key="index"
        >
          <BooleanInput :value="value.filter ? Boolean(value.filter((v)=>v[uuid_match_field] == val.uuid).length) : false"
            @update_parent_from_input="(boolVal) => updateCheckbox( boolVal, val)" 
           label=""/>
           <span>
            {{val[value_field]}}
          </span>
        </div>
      
    </div>
  </div>
</template>

<style lang="scss">
@import "../../css/global.scss";
.checkboxlist-input {
  width: 100%;
  height: fit-content;
  color: var(--text-color);
  padding: 0 10px 0 10px;
  font-size: 14px;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  //background: var(--input-bg-color);
  width: 100%;
}

.checkboxlist-line{
  height: $input-height;
  display: flex;
  border: solid 2px #000;
  border-style: solid none;
  padding: 3px 3px 3px 3px;
  border-color: var(--table-row-color);
  background-color: var(--group-bg-color);
}


.checkboxlist-line .boolean-input{
  width: 20px !important;
  height: 20px !important;
}

.checkboxlist:disabled {
  background: var(--disabled-bg-color);
  color: var(--disabled-text-color);
}
</style>
