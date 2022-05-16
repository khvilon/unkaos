<template>   
  <label class="boolean">
    <div class="label">{{label}}</div>
    <input  type="checkbox"  v-model="value" />
    <span class="boolean-input"> </span>
  </label>
</template>

<script>
  export default 
  {

    props:
    {
      label:
      {
        type: String,
        default: 'label'
      },
      value:
      {
        type: Boolean,
        default: true
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
    watch: {
      value: function(val, oldVal) {
        console.log(val, oldVal, this.id, this.parent_name)
        let data = {}
        data[this.id] = val
        //this.$store.commit('push_update_' + this.parent_name, data)
      }
    }
  }
</script>

<style>
  .boolean .boolean-input
  {
    width: 35px;
    height: 35px;
    color: white;
  }

  .boolean
  {
        padding: 10px 20px 10px 20px;
        display: block;
  }

  .boolean-input {
    font-size: 20px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background: rgb(29, 27, 49);
    display: inline-block;
    text-align: center;  
    border-color: rgb(118, 118, 118);
    border-width: 2px;
    border-style: inset;   
  }

  [type=checkbox] {
    visibility: hidden;
    width: 0px
  }

  .boolean input:checked ~ .boolean-input:after {
    display: inline-block;
  }
          
  .boolean-input:after {
    content: '\2714';
    display: none;
  }
          

      
       



</style>