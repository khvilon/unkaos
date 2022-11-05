
<script>
  import SearchInput from './SearchInput.vue'
  import KButton from './KButton.vue'

  export default {
    components: 
    {
      SearchInput,
      KButton
    },
  /*  data()
    {
        return {name}
    },*/
    props: {
      
      buttons: {
        type: Array,
        default: () => [
          
        ],
      },

      name:
      {
        type: String,
        default: ''
      },
      label:
      {
        type: String,
        default: ''
      },

      collumns: {
        type: Array,
        default: () => [
          
        ],
      },

      //! Styles
    
    },


    
  }
</script>


<template>
  <div
    class="topbar panel"
  >

    <div style="display: flex ; flex-direction:row; flex-grow: 1; max-height: calc(100% - 60px); ">

      <span>
        {{ label }}
      </span>
      <SearchInput 
        :name="name"
        :collumns="collumns"
      />

      <KButton 
        v-for="(button, index) in buttons"
        :key="index"
        :name="button.name"
        :func="button.func"
        :route="button.route"
        
      />

    </div> 
  </div>
</template>


<style  lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  .topbar {
    position: relative;
    display: flex;
    flex-direction: column;
    left: 0;
    top: 0;

    min-height: min-content;
    /* overflow-y: auto; */
    width:  calc(100vw - $main-menu-width);
    /* padding: 6px 14px 0 14px; */
    z-index: 0;
    /*border-bottom-style: solid;
    border-bottom-width: 1px;*/
    height: $top-menu-height;

    padding-top: 13px;
    padding-left: 0px;
  }

      .topbar .btn .btn_input
      {
        width: 100px;
        height: $input-height;
      }

  
 
  .topbar input {
    font-size: 15px;
    font-weight: 400;
    border-radius: var(--border-radius);
    transition: all 0.5s ease;
    //background: var(--secondary-color);
    margin-left:10px;
    height: $input-height;
  }

  .search-input
  {
    background: var(--input-bg-color);
  }
 
  .topbar span
  {

    font-size: 20px;
    font-weight: 400;
    margin-top: 1px;


   /*     -webkit-text-stroke: thin;
    /* background-color: #313131; */
    /* background: red; */
    border-radius: 8px;
    border-color: grey;
    border-width: 2px;

    margin-left:20px;
    margin-right: 10px;

  }



  

 
  
 

  @media (max-width: 420px) {
    .topbar li .tooltip {
      display: none;
    }
}


</style>