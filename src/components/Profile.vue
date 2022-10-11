<template>   
  <div class="profile" v-if="common.is_in_workspace">

    <div class="profile-top">
      <img :src="user.avatar" @click="menu_visible=!menu_visible"><div>{{user.name}}
      </div>
      <router-link 
      class='bx bx-plus-circle new-issue-btn'
        :to="'/issue?t=' + new Date().getTime()" 
        tag="i"
        :style="[  {whiteSpace: 'nowrap'} ]"
        >
      </router-link>
    </div>
   
    
    <div v-if="menu_visible" id="profile-menu" class="panel">
      
      <SelectInput 
      label="Тема"
      :values="themes"
      :value="theme"
      :reduce="(obj) => obj.val"
      @update_parent_from_input="set_theme"
      :close_on_select="false"
      :parameters={clearable:false}
      >
      </SelectInput>
      <SelectInput 
      label="Язык"
      :values="langs"
      :value="lang"
      :reduce="(obj) => obj.val"
      @update_parent_from_input="set_lang"
      :parameters={clearable:false}
      >
      </SelectInput>
      <BooleanInput
      label="Главное меню по логотипу"
      :value="lock_main_menu"
      @update_parent_from_input="update_lock_main_menu"
      ></BooleanInput>
      <div id="profile-menu-exit" @click="logout()">
        <div>
          <i class='bx bxs-door-open'></i>
          <span>Выход</span> 
        </div>
        
      </div>
    </div>
  </div>
</template>

<script>
  export default 
  {
    data()
    {
      return{
        user: {},
        menu_visible: false,
        common: this.$store.state['common'],
        themes:[
          {name: 'Темная', val: 'dark'},
          {name: 'Темная объемная', val: 'dark_3d'},
          {name: 'Светлая', val: 'light'},
          {name: 'Я блондинка!', val: 'pink'}
        ],
        theme: 'dark',
        langs:[
          {name: 'Русский', val: 'ru'},
        ],
        lang: {name: 'Русский', val: 'ru'},
        lock_main_menu: false
      }
    },
    mounted()
    {
      console.log('localStorage.profile', localStorage.profile)
      

      for(let i = 0; i < this.themes.length; i++)
      {
        if(localStorage.theme == this.themes[i].val) this.theme = this.themes[i]
      }

      
      if(localStorage.lock_main_menu == 'true') this.lock_main_menu = true
      
      
      //console.log(this.user.avatar)

      document.addEventListener('click', this.close_menu)

      this.user = JSON.parse(localStorage.profile)
  
    },
    updated() {
      //console.log('uuuuu')
      //this.user = JSON.parse(localStorage.profile)
    },
    
    methods: {
      logout()
      {
        //console.log('logout')
        localStorage.user_token = ''
        localStorage.profile = '{}'
				this.$router.push('/login')
      },
      close_menu(e)
      {
        console.log(e)
        for(let i in e.path)
        {
          if(e.path[i].className == "profile" ) return
        }
        this.menu_visible= false  
      },
      set_theme(theme)
      {
        
        this.theme = theme
        localStorage.theme = theme.val
        let htmlElement = document.documentElement;
        htmlElement.setAttribute('theme', theme.val);
      },
      set_lang(lang)
      {
        
      },
      update_lock_main_menu(value)
      {

        localStorage.lock_main_menu = value + ''

      }
    },
  }
</script>

<style  lang="scss">

  @import '../css/global.scss';

  .profile {
    position: absolute;
    height: 74px;
    width: 90px;
    right: 0px;
    top: 0px; 
    padding: 7px;
    
    z-index: 1;
    display: block;
    align-items: center;
    color: white;
    width:  auto;
  }
 
  .profile img {
    height: $input-height;
    width: $input-height;
    object-fit: cover;
    border-radius: var(--border-radius);
    margin-right: 16px;
    float:right;
    margin-top: 6px;
   // background-image: url('https://oboz.myjetbrains.com/hub/api/rest/avatar/7755ec62-dfa1-4c3c-a3a9-ac6748d607c1?dpr=1.25&size=20');
    cursor: pointer;
    border-style: groove;
    border-width: 1px;
  }

  .profile-top
  {
    display: contents;
  }
  
  .profile-top div {
    margin-top: 14px;
    margin-right: 10px;
    float:right;

    font-weight: 600;
    font-size: 14px;
  }

  #profile-menu
  {
    position: absolute;
    right: 0px;
    width: 250px;

    top: calc($top-menu-height + 2px);
    margin: 0px;
    background: val(--table-row-color);
    

    display: flex;
    flex-direction: column;
  }

  #profile-menu div
  {
    //padding: 10px 20px 10px 20px;
  }

  #profile-menu .select-input
  {
     
  }
 

  #profile-menu-exit
  {
    margin: 0px;
    width: 100%;
    
    
    padding: 10px 20px 10px 20px;
  }

  #profile-menu-exit div
  {
    border-radius: var(--border-radius);
    border-color: var(--border-color);
    border-style: outset;
    text-align: center;
    cursor: pointer;
    height: $input-height;
    padding: 5px;
    border-width: var(--border-width);
    display: flex;
    align-items: center;
    background-color: var(--button-color);
  }

  #profile-menu-exit i{
    font-size: 20px;
  }
  

  .new-issue-btn
  {

    display: flex;
    margin-top: 6px;
    font-size: 35px;
    
    /* margin-right: 40px; */
    right: 10px;
    position: relative;
    cursor: pointer;
    text-decoration: none;
  }

</style>