<script>
import Multiselect from 'vue-multiselect'
import store_helper from '../store_helper.ts'

import 'vue-select/dist/vue-select.css';



export default {
  components: {
    Multiselect
  },
  emits: ['search', 'update_parent_from_input'],

  beforeCreate()
  {

  },
  watch: {
      value: function(val, oldVal) {
        

        //this.convert_values_to_uuids()
        
        let val_obj
        for(let i in this.values)
        {
          if(this.values[i].uuid == val) {val_obj = this.values[i]; break}
        }
        
     //   console.log('vue_select', val, oldVal, this.id, val_obj)
     //   console.log('pname', this.parent_name)

        if(val != undefined && val[0] != undefined && val[0].num != undefined)
        {
          let num = 1
          for(let i in val)
          {
            val[i].num = num;
            num++
          }
        }


        this.$emit('update_parent_from_input', val)//val_obj == undefined? val : val_obj)

        

        if(this.parent_name == undefined || this.parent_name == '') return;

        this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})
      }
    },
  computed:
  {
      
  },
  props:
    {
      name_path:
      {
        type: String,
        default: ''
      },
      values: {
        type: Array,
        default: () => [],
      },
      value:
      {
        type: Object,
        default: []
      },
      label:
      {
        type: String,
        default: ''
      },
      clearable: {
        type: Boolean,
        default: true
      },
      parameters: {
        type: Object,
        default: {}
      },
      id:
      {
        type: String,
        default: ''
      },
      parent_name:
      {
        type: String,
        default: ''
      },
      disabled: {
        type: Boolean,
        default: false
      }

    },
  methods: {
 
    check_selectable: function(val)
    {
   //   console.log('this.value0', val + '')
      //console.log('this.value1', value + '')
   //    console.log('this.value2', this.value + '')
      if(this == undefined) return true
  //    console.log('this.value', this.value + '')
      if(!(this.value instanceof Array)) return true
      
      for(let i in this.value)
      {
        if(this.value[i].uuid == undefined && this.value[i] == val.uuid) return false
        else if(this.value[i].uuid == val.uuid) return false
      }
      return true
    },
    convert_values_to_uuids: function()
      {
        if(this.value == undefined) return
        if(!(this.value instanceof Array)) return
        if(this.value.length == 0) return
        if(this.value[0].uuid == undefined) return

        let val = []
        for(let i in this.value)
        {
          val.push(this.value[i].uuid)
        }
    //    console.log('vvv2', this.value+'')
        this.value = val
      }

  }
}
</script>

<template>
<div class="select-input">
  <div class="label">{{label}}</div>
 
  <v-select v-model="value"  

  label="name" :reduce="parameters.reduce" :multiple="parameters.multiple" :clearable="parameters.clearable" :disabled="disabled"
   :options=values 
   :selectable="check_selectable"
   @search="(text, arg2)=>$emit('search', text)"
   >
    <template 
    v-slot:no-options="{ searching }" >
      <template v-if="searching">
        Ничего не найдено 
      </template>
    </template>
    
      

  </v-select>
  
</div>
</template>


<style lang="scss">

@import '../css/palette.scss';
@import '../css/global.scss';

 .select-input .vs__search::placeholder,
 .select-input .vs__dropdown-toggle,
 .select-input .vs__dropdown-menu {
  background: $input-bg-color;
  
  color: $text-color;

  border-color: $border-color;
    border-style: inset;
    border-width: 2px;
    border-radius: $border-radius;
}

 .select-input .vs__dropdown-toggle{
  min-height: $input-height;
  height: auto;

}

 .select-input .vs__clear,
 .select-input .vs__open-indicator {
  fill: $text-color;
  
}

.vs__active{
  background-color: red;
}

 .select-input .vs__selected
 {
   color: $text-color;
 }

 .select-input
  {
    padding: 10px 20px 10px 20px;
  }

   .select-input img {
    height: 18px;
    width: 18px;
    object-fit: cover;
    border-radius: 4px;
    margin-right: 10px;
    position: relative;
    top: 5px;
    }

    .select-input .vs__selected img {
      top: 0px
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
  background-color: $table-row-color-selected;
}

.vs__deselect {
  fill: $text-color;
}

.vs--disabled .vs__clear, .vs--disabled .vs__dropdown-toggle, .vs--disabled .vs__open-indicator, .vs--disabled .vs__search, .vs--disabled .vs__selected {
  background-color: $disabled-bg-color;
  
}

.vs--disabled .vs__clear, .vs--disabled .vs__open-indicator
{
  fill: $disabled-bg-color;
}



</style>

<style scoped>
>>> {
  --vs-dropdown-option--active-bg: rgb(50, 60, 70);
}
</style>