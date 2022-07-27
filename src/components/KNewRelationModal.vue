<template >
  <div class="modal-bg" v-show="visible">
  <div
    class="panel modal new-relation-modal"
  >  
  <SelectInput
  label="Тип связи"
		:value="2"
		:values="[{uuid:'1', name:'a'},{uuid:'2', name:'b'}]"
		:parameters="{clearable: false, reduce: obj => obj.uuid}"
   >
   </SelectInput>

 <SelectInput
  label="Задача"
  :value="1"
		:values="[{uuid:'1', name:'c'},{uuid:'2', name:'d'}]"
		:parameters="{clearable: false, reduce: obj => obj.uuid}"
   >
   </SelectInput>
    
<div class="btn-container">
  <KButton 
  name="Создать"
  id="create-relation-btn"
  />
   <KButton 
  name="Отменить"
  @click="close()"
  />
  </div>

  </div>
  </div>
</template>

<script>
  export default {
    data () {
      vvisible:true
    },
    created () {
      this.vvisible=false
    },
    mounted () {
      //this.select_tab(0)

    },
    computed:
    {
      visible:function(){this.vvisible; return !this.vvisible}
    },
    methods: {
      close () {
        this.vvisible = true;
       // this.$forceUpdate()
        console.log(this.vvisible, this.visible)
      }
    }
  }
</script>


<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  .modal-bg{
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.3);
    position: absolute;
    z-index: 10;
  }

  .new-relation-modal{
    position: absolute;
    width: 40%;
    height: $input-height*6;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .new-relation-modal SelectInut{
    width: 100%;
    height: $input-height;
  }

 .new-relation-modal .btn-container{
   display: flex;
  padding: 10px 20px 10px 20px;
 }

 .new-relation-modal #create-relation-btn{
 width: 100%;
 }




</style>