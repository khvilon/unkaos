<script>

  import MainMenu from './components/MainMenu.vue'
  import Profile from './components/Profile.vue'

  import palette from './palette.ts'
  import dict from './dict.ts'
  import tools from './tools.ts'

  let lang = tools.get_uri_param(window.location.href, 'lang')
    //  console.log('lang', lang)
      dict.set_lang(lang)

  export default 
  {

    components: 
    {
      MainMenu,
      Profile
    },
    
    computed: {
      cssVars() {
        return {
          // '--padding-left-body': this.isOpened ? this.menuOpenedPaddingLeftBody : this.menuClosedPaddingLeftBody,
          '--bg-color': palette.bg_color,
          '--ttt-color': palette.color,
        }
      },
    },
    beforeCreated()
    {
      
    }
  }



</script>


<template>
  <MainMenu />
  <router-view />
  <Profile />
</template>


<style>
  body { 
    background-color: rgb(71, 81, 89);
    transition: all 0.5s ease; 
  }
  .view {
     background: var(--bg-color);
  }

  *
  {
    font-size: 13px
  }

</style>

