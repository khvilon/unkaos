<template>
  <div
    class="sidebar view panel"
    :class="isOpened ? 'open' : ''"
    :style="cssVars"
    
    @mouseout="isOpened = false" 
  >
    <div class="logo-details">
      <i
        class="bx icon bx-hive"
      />
      <div class="logo_name">
        unkaos
      </div>
    </div>

    <div class="main-menu-list" >
      <div id="my-scroll">
        <ul
          class="nav-list"
          style="overflow: visible;"
           @mouseover="isOpened = true"
        >
          <span
            v-for="(menuItem, index) in menuItems"
            :key="index"
          >
            <li>
              <router-link :to="menuItem.link" :class="'menu-item-' + menuItem.level">
                <i
                  class="bx"
                  :class="menuItem.icon || 'bx-square-rounded'"
                />
                <span class="links_name">{{ menuItem.name }}</span>
              </router-link>    
            </li>
          </span>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
  import palette from '../palette.ts'
  import dict from '../dict.ts'
  
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
        isOpened: false
      }
    },
    mounted() {
      this.isOpened = this.isMenuOpen
    },
    computed: {
      cssVars() {
        return {
          // '--padding-left-body': this.isOpened ? this.menuOpenedPaddingLeftBody : this.menuClosedPaddingLeftBody,
          '--logo-title-color': palette.color,
          '--icons-color': palette.color,
          '--menu-items-hover-color': palette.hover_bg_color,
          '--menu-items-text-color': palette.color,
        }
      },
    },
    watch: {
      isOpened() {
        window.document.body.style.paddingLeft = this.isOpened && this.isPaddingLeft ? this.menuOpenedPaddingLeftBody : this.menuClosedPaddingLeftBody
      }
    }
  }
</script>

<style>
  /* Google Font Link */

   :root{

    --menu-open-time: 0.15s;
    --logo-size: 30px;
  }
  
  
  .menu-logo {
    width: var(--logo-size);
    margin: 0 10px 0 10px;
  }
  .sidebar {
    position: absolute;
    display: flex;
    flex-direction: column;
    left:0px;
    top: 0px;
    height: 100vh;
    width: var(--main-menu-width);
    z-index: 100;

    

    min-height: var(--min-win-height);
    
    transition-property: all;
    transition-timing-function: ease;
    transition-duration: var(--menu-open-time);

    margin:1px;
  }
  .sidebar.open {
    width: var(--main-menu-width-open);
  }
  .sidebar .logo-details {
    height: 60px;
    display: flex;
    align-items: center;
    position: absolute;
    left: 7px;  
  
  }

  .sidebar .logo-details .logo_name {
    color: var(--text-color);
    font-size: 35px;
    font-weight: 400;
    opacity: 0;
    transition: all var(--menu-open-time) ease;
  }

  .sidebar.open .logo-details .logo_name {
    opacity: 1;
  }
 
  .sidebar .main-menu-list
  {
    height: calc(100% - 20px);
    position: absolute;
    top: 36px;
    left: 0px;
    width: 100%;
  }

  .sidebar i {
    color: var(--text-color);
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
  }

</style>