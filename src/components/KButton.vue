<template>   
  <div class="btn">
    <input class="btn_input" type="button" :value="name" @click="click(this)">
  </div>
</template>

<script>
  import tools from '../tools.ts'
  export default 
  {
    props: {

      name: {
        type: String,
        default: '',
      },

      func: {
        type: String,
        default: '',
      },

    },
    methods:
    {
      click(btn){ if(this.func!=undefined && this.func!='')this.$store.dispatch(this.func); }
    }
  }
</script>

<style>
  .btn .btn_input
  {
    width: 200px;
    height: 40px;
    color: white;
    background-color: #333;
    border-width: 2px;
    border-color: white;
    border-style: solid;
    font-size: 15px;
    border-radius: 6px;
    border-style: outset;
  }

</style>