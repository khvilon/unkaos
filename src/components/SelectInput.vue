<template>   
  <div class="select">
    <div class="label">{{label}}</div>
    <input class="select-input"
     type="text"  
     v-model="value" 
     :disabled="disabled" 
     @focus="focused = true" 
     @blur="focused = false"
    >
    <div class="select-list"  :class="{ active: focused }"  v-show="focused">
      <table>
        <tr
            v-for="(element, index) in values"
            :key="index"     
        >
          <td
              v-html="element.name"
          >
          </td>     
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
  export default 
  {
    data: () => ({
      focused: false,
    }),
    props:
    {
      disabled:
      {
        type: Boolean,
        default: false
      },
      label:
      {
        type: String,
        default: 'label'
      },
      value:
      {
        type: String,
        default: ''
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
      ,
      values: {
        type: Array,
        default: () => [
          {name: 'aaa'},
          {name: 'bbb'},
          {name: 'ccc'},
          {name: 'ddd'}
        ],
      },

    },
    
    watch: {
      value: function(val, oldVal) {
        console.log(val, oldVal, this.id, this.parent_name)
        let data = {}
        data[this.id] = val
        this.$store.commit('push_update_' + this.parent_name, data)
      }
    }
  }
</script>

<style>
  input{
    position: relative;
  }
  .select .select-input
  {
    width: 100%;
    height: 35px;
    color: white;
    padding: 0 10px 0 10px;
  }

  .select
  {
    padding: 10px 20px 10px 20px;
  }

  .select-list
  {
    height: 0px;
    z-index: 1001;
    position: relative;
  }

  .select-list .active
  {
    height: 60px;
  }


  .select-input {
    font-size: 15px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background: rgb(29, 27, 49);
    width: 100%;
  }

  .select-input:disabled {
    background: rgb(30, 35, 38);
  }



</style>