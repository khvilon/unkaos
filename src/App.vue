<script>
  import MainMenu from './components/MainMenu.vue'
  import Profile from './components/Profile.vue'

  import palette from './palette.ts'
  import dict from './dict.ts'
  import tools from './tools.ts'

  let uri = window.location.href

  let lang = tools.get_uri_param(uri, 'lang')
  dict.set_lang(lang)
  

  export default 
  {

   created ()
    {
      let uri = window.location.href
      let uri_parts = uri.split('.')

      let subdomain = 'public'

      if(uri_parts.length == 3) subdomain = uri_parts[0].replace('http://', '')
       // console.log('ddd', this.$store.state['domain'])
      
      this.$store.registerModule('common', {subdomain: subdomain});
      
    },

   
    components: 
    {
      MainMenu,
      Profile
    }  
  }

</script>


<template>
  
  <div id="router-view-container">
    <router-view v-slot="{ Component, route }">
  <transition name="fade" mode="out-in">
    <div :key="route.name">  
      <component :is="Component"></component>
    </div>
  </transition>
</router-view>
</div>
  <div class="loading-background">
    <div class="loading-bar"></div>
  </div>
  <MainMenu />
  <Profile />
</template>

<style lang="scss">
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap');
  @import url('https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css');
  @import url(./css/palette.css);
  @import './css/palette.scss';
  @import './css/global.scss';


$body-bg-color: rgb(71, 81, 89);

$panel-bg-color: rgb(35, 39, 43);

$text-color: rgb(255, 255, 255);

$table-row-colorrrr: rgb(128, 128, 128);
$table-row-color: rgb(40, 45, 50);
$table-row-color-selected: rgb(50, 60, 70);

  :root{
    --main-menu-width: 60px;
    --main-menu-width-open: 210px;
    --border-radius: 8px;
    --min-win-height: 600px;
    --min-win-width: 800px;
    --font-size: 13px;
   
    --border-width: 1px;
    --top-menu-height: 60px;
     --font-family:'Poppins', sans-serif;
  }

    
   
    $border-width: 1px;
    
     //$font-family:'Poppins', sans-serif;


  body { 
    background-color: var(--body-bg-color);
  }

  .view {
     background: var(--panel-bg-color);
  }

  *
  {
    color: var(--text-color);
    font-size: var(--font-size);
    font-family: var(--font-family);

    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  #router-view-container
  {
    position: absolute;
    left: var(--main-menu-width);
    width: calc(100vw - var(--main-menu-width));
    height: 100vh;
  }

  .panel
  {
    background: var(--panel-bg-color);
    border-radius: 8px;
    box-shadow: 1px 0px 2px var(--body-bg-color);

    transition: opacity 4s;
  }


  .hidden
  {
    opacity: 0;
  }
  


  


  .fade-enter-active, .fade-leave-active {


      transition: opacity 1s;
  }

  .fade-enter, .fade-leave-to {
      opacity: 0;
  }

  .topbar
  {z-index: 0;}


$loading-bar-width: 200vw;

  .loading-background {
    display: none;
  position: absolute;
  top: 2px;
  left: 2px;
  width: 100%;
  height: 100vh;
  background: rgba(0,00,0,0.2);
  overflow: hidden;
  border-radius: 10px;
  z-index: 3;
}

.loading-bar {
  position: relative;
  height: 100%;
  width: $loading-bar-width;
  left:-$loading-bar-width;
  background: linear-gradient(0.25turn, rgba(200,200,200,0.0), rgba(0,0,0,0.8), rgba(200,200,200,0.0));
  animation: background 3s infinite ease-in-out;
}

@keyframes background {
  100% {
    left:calc(100%);
  }
}



</style>

