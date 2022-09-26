<template>   
  <label class="boolean">
    <div class="label">{{label}}</div>
    <input  type="checkbox"  v-model="value" :disabled="disabled"/>
    <span class="boolean-input" v-bind:class="{ disabled: disabled }" > </span>
  </label>
</template>

<script>
  export default 
  {
    emits: ['update_parent_from_input'],
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
        this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})
        this.$emit('update_parent_from_input', val)//val_obj == undefined? val : val_obj)
      }
    }
  }
</script>

<style lang="scss">

@import '../css/palette.scss';
@import '../css/global.scss';

  .boolean .boolean-input
  {
    width: 35px;
    height: 35px;
    color: $text-color;
  }

  .boolean
  {
        padding: 10px 20px 10px 20px;
        display: block;
  }

  .boolean-input {
    font-size: 20px;
    font-weight: 400;
    border-radius: $border-radius;
    transition: all 0.5s ease;
    background: $input-bg-color;
    display: inline-block;
    text-align: center;  
    border-color: $border-color;
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

   .boolean .disabled {
    background: $disabled-bg-color
  }
          

      
       



</style>