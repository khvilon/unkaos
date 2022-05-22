
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
          {
            name: 'кнопка 1',
            func: '',
          }
        ],
      },

      name:
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
      bgColor: {
        type: String,
        default: 'rgb(35, 39, 43)',
      },
      secondaryColor: {
        type: String,
        default: '#1d1b31',
      },
      homeSectionColor: {
        type: String,
        default: '#e4e9f7',
      },
      logoTitleColor: {
        type: String,
        default: '#fff',
      },
      iconsColor: {
        type: String,
        default: '#fff',
      },
      itemsTooltipColor: {
        type: String,
        default: '#e4e9f7',
      },
      menuItemsHoverColor: {
        type: String,
        default: '#fff',
      },
      menuItemsTextColor: {
        type: String,
        default: '#fff',
      },
      menuFooterTextColor: {
        type: String,
        default: '#fff',
      },
    },


    computed: {
      cssVars() {
        console.log('col1', this.collumns)
        return {
          // '--padding-left-body': this.isOpened ? this.menuOpenedPaddingLeftBody : this.menuClosedPaddingLeftBody,
          '--bg-color': this.bgColor,
          '--secondary-color': this.secondaryColor,
          '--home-section-color': this.homeSectionColor,
          '--logo-title-color': this.logoTitleColor,
          '--icons-color': this.iconsColor,
          '--items-tooltip-color': this.itemsTooltipColor,
          '--menu-items-hover-color': this.menuItemsHoverColor,
          '--menu-items-text-color': this.menuItemsTextColor,
          '--menu-footer-text-color': this.menuFooterTextColor,
        }
      },
    }
  }
</script>


<template>
  <div
    class="topbar panel"
    :style="cssVars"
  >

    <div style="display: flex ; flex-direction:row; flex-grow: 1; max-height: calc(100% - 60px); ">

      <span>
        {{ name }}
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
      />

    </div> 
  </div>
</template>


<style>
  /* Google Font Link */

  .topbar {
    position: relative;
    display: flex;
    flex-direction: column;
    left: 0;
    top: 0;

    min-height: min-content;
    /* overflow-y: auto; */
    width:  calc(100% - 3px);
    /* padding: 6px 14px 0 14px; */
    z-index: 99;
    border-bottom-color: rgb(71, 81, 89);;
    /*border-bottom-style: solid;
    border-bottom-width: 1px;*/
    height: var(--top-menu-height);


    
    margin: 1px;
    margin-left: 2px;
    padding-top: 14px;
    padding-left: 0px;
  }

  
 
  .topbar input {
    font-size: 15px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background: var(--secondary-color);
    margin-left:0px
  }
 
  .topbar span
  {
    width: 200px;
    font-size: 20px;
    text-align: center;

   /*     -webkit-text-stroke: thin;
    /* background-color: #313131; */
    /* background: red; */
    height: 40px;
    border-radius: 8px;
    border-color: grey;
    border-width: 2px;
    border-style: groove;
    margin-left:20px;
    background-color: rgb(30, 34, 39);
  }
  

 
  
 

  @media (max-width: 420px) {
    .topbar li .tooltip {
      display: none;
    }
}


</style>