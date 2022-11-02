<template>   
  <div class="numeric">
    <div class="label">{{label}}</div>
    <input type="number" class="numeric-input" min="1" max="9"  v-model="value" :disabled="disabled"
    @blur="blur">
  </div>
</template>

<script>
  export default 
  {

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
      },
      type:
      {
        type: String,
        default: 'text'
      },

    },

    emits: ['update_parent_from_input', 'updated'],
    methods:
    {
      blur()
      {
        this.$emit('updated')
      }
    },
    
    watch: {
      value: function(val, oldVal) {
        console.log(val, oldVal, this.id, this.parent_name)

        this.$emit('update_parent_from_input', val)

        if(this.parent_name == undefined || this.parent_name == '') return;

/*
        
        let data = val

        let id_parts = this.id.split('.')

        let i = id_parts.length-1;
        let id = id_parts[i]
         
        while (id != undefined)
        {
          let new_data = {}
          new_data[id] = data
          data = new_data
          i--
          id = id_parts[i]
        }
        */

        this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})

        //data[this.id] = val
        //this.$store.commit('push_update_' + this.parent_name, data)
      }
    }
  }
</script>

<style lang="scss">

  @import '../css/global.scss';
  .numeric .numeric-input
  {
    width: 100%;
    height: 35px;
    color: var(--text-color);
    padding: 0 10px 0 10px;
  }

  .numeric
  {
    padding: 10px 20px 10px 20px;
  }


  .numeric-input {
    font-size: 14px;
    font-weight: 400;
    border-radius: var(--border-radius);
    transition: all 0.5s ease;
    background: var(--input-bg-color);
    width: 100%;
  }

  .numeric-input:disabled {
    background: var(--disabled-bg-color);
  }

  input[type="number"] {
  -webkit-appearance: textfield;
     -moz-appearance: textfield;
          appearance: textfield;
}
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none;
}



</style>