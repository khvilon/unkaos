<template>
<div class="select-input">
  <div class="label">{{label}}</div>
 
  <v-select v-model="value"  

  label="name" :reduce="parameters.reduce" :multiple="parameters.multiple" :clearable="parameters.clearable" :options=values>
    <template v-slot:no-options="{ search, searching }">
      <template v-if="searching">
        Ничего не найдено 
      </template>
      </template>

  </v-select>
  
</div>
</template>

<script>
import Multiselect from 'vue-multiselect'
import store_helper from '../store_helper.ts'

import 'vue-select/dist/vue-select.css';



export default {
  components: {
    Multiselect
  },

  beforeCreate()
  {

  },
  watch: {
      value: function(val, oldVal) {
        

        let val_obj
        for(let i in this.values)
        {
          if(this.values[i].uuid == val) {val_obj = this.values[i]; break}
        }
        
        console.log(val, oldVal, this.id, val_obj)
        console.log('pname', this.parent_name)


        this.$emit('update_parent_from_input', val, this.parent_name)

        if(this.parent_name == undefined || this.parent_name == '') return;

        let data = {}
        data[this.id] = val

        console.log('commit select data ', data)
        this.$store.commit('push_update_' + this.parent_name, data)
      }
    },
  computed:
  {
 
  },
  props:
    {
      values: {
        type: Array,
        default: () => [],
      },
      value:
      {
        type: Object,
        default: ''
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
      }

    },
  methods: {
 

  }
}
</script>


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
  height: $input-height;
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


</style>

<style scoped>
>>> {
  --vs-dropdown-option--active-bg: rgb(50, 60, 70);
}
</style>