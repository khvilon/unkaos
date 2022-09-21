<template>   
  <div class="btn">
    <input   v-if="name.substr(0,3) != 'bx-'"  class="btn_input" type="button" :value="name" @click="click(this)">
    <i v-if="name.substr(0,3) == 'bx-'" :class="'btn_input bx ' + name"  @click="click(this)"></i>
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

      route: {
        type: String,
        default: '',
      },

    },
    emits: ['button_ans'],
    methods:
    {
        async click(btn) { 
        if(this.func!=undefined && this.func!='')
        {
          let ans = await this.$store.dispatch(this.func);
          //console.log('btn aaans', ans)
          this.$emit('button_ans', ans)
        }
        if(this.route!=undefined && this.route!='')
        {
          this.$router.push(this.route)
        }
       }
    }
    
  }
</script>

<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  .btn .btn_input
  {
    width: 200px;
    height: 35px;
    color: white;
    background-color: #333;
    border-width: 1px;
    border-color: white;
    border-style: solid;
    font-size: 15px;
    border-radius: 6px;
    border-style: outset;
    cursor: pointer;
  }

.btn i{
  text-align: center;
    line-height: $input-height;
    font-size: 18px !important;
}
  



</style>