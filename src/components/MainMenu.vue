<script>
  import dict from '../dict.ts'
  import tools from '../tools.ts'
  
  export default {
    props: {
      //! Menu settings
      isMenuOpen: {
        type: Boolean,
        default: false,
      },
      

      //! Menu items
      menuItems: {
        type: Array,
        default: () => [
          {
            link: '/dashboards',
            name: dict['Дашборды'],
            icon: 'bx-layout',
            level: 1
          },
          {
            link: '/issues',
            name: dict['Задачи'],
            icon: 'bx-detail',
            level: 1
          },
          {
            link: '/alerts',
            name: dict['Уведомления'],
            icon: 'bx-envelope',
            level: 1
          },
          {
            link: '/projects',
            name: dict['Проекты'],
            icon: 'bx-briefcase-alt-2',
            level: 1
          },     
          {
            link: '/configs',
            name: dict['Настройки'],
            icon: 'bx-cog',
            level: 1
          },
          {
            link: '/configs/users',
            name: dict['Пользователи'],
            icon: 'bx-user',
            level: 2
          },
          {
            link: '/configs/roles',
            name: dict['Роли'],
            icon: 'bx-group',
            level: 2
          },
          {
            link: '/configs/fields',
            name: dict['Поля'],
            icon: 'bx-bracket',
            level: 2
          },
          {
            link: '/configs/issue_statuses',
            name: dict['Статусы задач'],
            icon: 'bx-flag',
            level: 2
          },
          {
            link: '/configs/issue_types',
            name: dict['Типы задач'],
            icon: 'bx-category-alt',
            level: 2
          },
          {
            link: '/configs/workflows',
            name: dict['Воркфлоу задач'],
            icon: 'bx-sitemap',
            level: 2
          },
        ],
      },      
    },
    data() {
      return {
        is_opened: false,
        hover_offset_x: 0,
        hover_offset_y: 0,
        select_offset_x: 0,
        select_offset_y: 0,
        hover_opacity: 0,
        select_opacity: 0,
        is_in_login_form: false,
        common: this.$store.state['common']
      }
    },
    methods: {
      move_hover(e) {
        this.hover_opacity = 1
        this.hover_offset_x = e.target.offsetLeft
        this.hover_offset_y = e.target.offsetTop
      },
      hide_hover(e) {
        this.hover_opacity = 0
      },
      move_select(e) {
        this.select_opacity = 1
        this.select_offset_x = e.target.offsetLeft
        this.select_offset_y = e.target.offsetTop
        this.exit_menu()
        //[{type: 'loading'}, {type: 'ok'}, {type: 'error', text: 'Это очень страшная ошибка!'}]
      },
      exit_menu(e) {
        if(e != undefined && e.x < 210) return //todo magic number to variable
        this.is_opened = 0

      }


      
    },
    created()
    {
      
    }
  }
</script>


<template>
  <div
    id = "main-menu"
    class="sidebar panel"
    :class="is_opened ? 'open' : ''"
    v-if="common.is_in_workspace"
    @mouseout="exit_menu($event)" 
  >
    <div class="logo-details">
      <i
        class="bx icon bx-hive"
      />
      <div class="logo_name">
        unkaos
      </div>
    </div>

    <div class="main-menu-list" @mouseenter="is_opened = true" >
      <div class="main-menu-element-bg-hover" :style="{ opacity: hover_opacity, top: hover_offset_y + 'px',  left: hover_offset_x + 'px'}"></div>
      <div class="main-menu-element-bg-select" :style="{ opacity: select_opacity, top: select_offset_y + 'px',  left: select_offset_x + 'px'}"></div>
      <div class="main-menu-element"
          v-for="(menuItem, index) in menuItems"
          :key="index">
        <router-link :to="menuItem.link"> 
          <div class="main-menu-element-bg" 
          @mouseenter="move_hover($event)"
          @mouseout="hide_hover($event)"
          @click="move_select($event)"
          ></div> 
          <div  :class="'main-menu-link main-menu-element-' + menuItem.level">
            <i
              class="bx"
              :class="menuItem.icon || 'bx-square-rounded'"
            />
            <span class="links_name">{{ menuItem.name }}</span>
          </div>   
        </router-link>
      </div>
    </div>
  </div>
</template>


<style lang="scss">

@import '../css/palette.scss';
@import '../css/global.scss';


  $main-menu-open-time: 0.2s;
  $main-menu-selection-time: 0.05s;
  $logo-size: 32px;
  $logo-field-size: 75px;
  $main-menu-element-height: 45px;
  $main-menu-icon-size: 20px;
  $main-menu-element-font-size: 16px;
  $main-menu-selection-offset: 10px;
  $logo-icon-size: 32px;
  
  .menu-logo {
    width: $logo-size;
    margin: 0 10px 0 10px;
  }
  .sidebar {
    position: absolute;
    display: flex;
    flex-direction: column;
    left:0px;
    top: 0px;
    height: 100vh;
    width: $main-menu-width;
    z-index: 100;

    min-height: $min-win-height;
    
    transition-property: all !important;
    transition-duration: $main-menu-open-time !important;

    margin:1px;
  }
  .sidebar.open {
    width: $main-menu-width-open;
  }
  .sidebar .logo-details {
    
    height: 56px;
    display: flex;
    align-items: center;
    position: absolute;
    left: ($main-menu-width - $logo-icon-size) / 2;
  }

   .sidebar .logo-details i {
     font-size: $logo-icon-size;
     padding-right: $main-menu-selection-offset/2;
     padding-top:8px
   }

   .sidebar.open .logo-details i {
     animation: rotateAnimation 3s linear infinite;
     
   }

  .sidebar .logo-details .logo_name {
    font-size: 35px;
    font-weight: 400;

    //transform: translateX(-50%);
    //padding-left: ($main-menu-width - $logo-icon-size) / 2 + $logo-icon-size + $main-menu-width-open/2;
    opacity: 0;
    transition: all $main-menu-open-time ease;
  }

  .sidebar.open .logo-details .logo_name {
    opacity: 1;
  }
 
  .sidebar .main-menu-list
  {
    height: calc(100% - $logo-field-size);
    position: absolute;
    top: $logo-field-size;
    left: 0px;
    width: 100%;
  }

  .main-menu-element
  {
    width: 100%;
    height: $main-menu-element-height;
    left: 0px;
    top: 0px;
  }

  .main-menu-element-bg
  {
    position: relative;
    width: calc(100% - 2*$main-menu-selection-offset);
    height: $main-menu-element-height;
    opacity: 0;
    left: $main-menu-selection-offset;
  }



  .main-menu-link
  {
    text-decoration: none;
    pointer-events: none;
    z-index: 2;
    position: relative;
    left: 0px;
    top: -1 * ($main-menu-element-height - ($main-menu-element-height - $main-menu-icon-size) / 2); //- $main-menu-icon-size) / 2;
    display: flex;
  }

  
.main-menu-element a {
    text-decoration: none;
}

  .main-menu-element i
  {
    position: relative;
    width: calc(($main-menu-width + $main-menu-icon-size) / 2);
    font-size: $main-menu-icon-size;
    left: calc(($main-menu-width - $main-menu-icon-size) / 2);
  }

  .main-menu-element span
  {
    position: relative;
    left: 0;
    font-size: $main-menu-element-font-size;
    padding-left: $main-menu-selection-offset;
    opacity: 0;

    transition-property: all;
    transition-duration: $main-menu-open-time;
  }

  .sidebar.open .main-menu-element span
  {
    opacity: 1;
  }

  .sidebar.open .main-menu-element-2 span
  {
    left: $main-menu-selection-offset
  }
  .sidebar.open .main-menu-element-2 i, .sidebar.open .main-menu-element-2 span {
   		padding-left: $main-menu-selection-offset;
   }


  .main-menu-element-bg-select, .main-menu-element-bg-hover
  {
    width: calc($main-menu-width) - 2*$main-menu-selection-offset;
    height: $main-menu-element-height;
    position: absolute;
    border-radius: 12px;
  }

  .sidebar.open .main-menu-element-bg-select, .sidebar.open .main-menu-element-bg-hover
  {
    width: calc($main-menu-width-open - 2*$main-menu-selection-offset);
    
  }

  .main-menu-element-bg-select
  {
    background-color: $table-row-color-selected;
    transition: all $main-menu-open-time ease;
  }
  

  .main-menu-element-bg-hover
  {
    background: $table-row-color;
    transition: all $main-menu-selection-time ease;
  }


  @keyframes rotateAnimation {
	0% { transform: perspective(500px) rotate3d(1, 1, 0, 0deg); }
25% { transform: perspective(500px) rotate3d(1, 1, 0, 90deg); }
50% { transform: perspective(500px) rotate3d(1, -1, 0, 180deg); }
	75% { transform: perspective(500px) rotate3d(-1, -1, 0, 90deg); }
	100% { transform: perspective(500px) rotate3d(-1, 1, 0, 360deg); }
}
  
  
/*
  .sidebar i {
    color: $text-color);
    height: 55px;
    width: 50px;
    font-size: 28px;
    text-align: center;
    line-height: 60px;
  }
  .sidebar .nav-list {
    margin-top: 20px;
  }
  .sidebar li {
    position: relative;
    margin: 0;
    list-style: none;
  }
  
  .sidebar li a {
    display: flex;
    height: 100%;
    width: 100%;
    border-radius: 4px;
    align-items: center;
    text-decoration: none;
    transition: all var(--menu-open-time) ease;
  }
  .sidebar li a:hover {
    background: var(--table-row-color);
  }
  .sidebar li a .links_name {
    color: var(--text-color);
    font-size: 15px;
    font-weight: 400;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: var(--menu-open-time);
  }
  .sidebar.open li a .links_name {
    opacity: 1;
    pointer-events: auto;
  }
  .sidebar li a:hover .links_name,
  .sidebar li a:hover i {
    transition: all var(--menu-open-time) ease;
    color: #ddddff
  }
  .sidebar li i {
    height: 50px;
    line-height: 50px;
    font-size: 18px;
    border-radius: 8px;
  }

  .sidebar .menu-item-2 {
   		padding-left: 0px;
   }
  .sidebar.open .menu-item-2 i {
   		padding-left: 20px;
   }

   .menu-item-2 span {
   		font-size: 12px;
   }
  

  .my-scroll-active {
    overflow-y: auto;
  }
  #my-scroll {
    overflow-y: auto;
 
    height: 100%;
    margin: 6px 14px 0 10px;

  }
  #my-scroll::-webkit-scrollbar{
    display:none;
  } */

</style>

