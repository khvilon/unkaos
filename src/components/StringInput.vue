<template>   
  <div class="string">
    <div class="label">{{label}}</div>
    <input class="string-input" :type="type"  v-model="value" :disabled="disabled">
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

        let data = {}
        data[this.id] = val
        this.$store.commit('push_update_' + this.parent_name, data)
      }
    }
  }
</script>

<style>
  .string .string-input
  {
    width: 100%;
    height: 35px;
    color: white;
    padding: 0 10px 0 10px;
  }

  .string
  {
    padding: 10px 20px 10px 20px;
  }


  .string-input {
    font-size: 14px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background: rgb(29, 27, 49);
    width: 100%;
  }

  .string-input:disabled {
    background: rgb(30, 35, 38);
  }



</style>