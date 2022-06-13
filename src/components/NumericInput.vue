<template>   
  <div class="numeric">
    <div class="label">{{label}}</div>
    <input class="numeric-input" :type="type"  v-model="value" :disabled="disabled">
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

    emits: ['update_parent_from_input'],
    
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

<style>
  .numeric .numeric-input
  {
    width: 100%;
    height: 35px;
    color: white;
    padding: 0 10px 0 10px;
  }

  .numeric
  {
    padding: 10px 20px 10px 20px;
  }


  .numeric-input {
    font-size: 14px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background: rgb(29, 27, 49);
    width: 100%;
  }

  .numeric-input:disabled {
    background: rgb(30, 35, 38);
  }



</style>