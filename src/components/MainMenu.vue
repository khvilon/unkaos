<template>
  <div
    class="sidebar view"
    :class="isOpened ? 'open' : ''"
    :style="cssVars"
  >
    <div class="logo-details">
      <i
        class="bx icon"
        :class="menuIcon"
      />

      <div class="logo_name">
        unkaos
      </div>

      <i
        class="bx"
        :class="isOpened ? 'bx-menu-alt-right' : 'bx-menu'"
        id="btn"
        @click="isOpened = !isOpened"
      />
    </div>

    <div class="main-menu-list">
      <div id="my-scroll">
        <ul
          class="nav-list"
          style="overflow: visible;"
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
        default: true,
      },
      menuIcon: {
        type: String,
        default: 'bx-hive',
      },
      isPaddingLeft: {
        type: Boolean,
        default: true,
      },
       menuOpenedPaddingLeftBody: {
        type: String,
        default: '250px'
      },
      menuClosedPaddingLeftBody: {
        type: String,
        default: '78px'
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
    beforeCreate()
    {
      //dict.set_lang('en')
      //console.log(dict['Задачи'])
    },
    computed: {
      cssVars() {
        return {
          // '--padding-left-body': this.isOpened ? this.menuOpenedPaddingLeftBody : this.menuClosedPaddingLeftBody,
          '--bg-color': palette.bg_color,
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
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap');
  @import url('https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css');
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Poppins', sans-serif;
  }
  
  .menu-logo {
    width: 30px;
    margin: 0 10px 0 10px;
  }
  .sidebar {
    position: relative;
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    min-height: min-content;
    width: 78px;
    
    z-index: 99;
    transition: all 0.5s ease;
    border-radius: 8px;
    margin:1px;
  }
  .sidebar.open {
    width: 250px;
  }
  .sidebar .logo-details {
    height: 60px;
    display: flex;
    align-items: center;
    position: relative;
    margin: 6px 14px 0 14px;
  }
  .sidebar .logo-details .icon {
    opacity: 0;
    transition: all 0.5s ease;
  }
  .sidebar .logo-details .logo_name {
    color: var(--logo-title-color);
    font-size: 35px;
    font-weight: 400;
    opacity: 0;
    transition: all 0.5s ease;
  }
  .sidebar.open .logo-details .icon,
  .sidebar.open .logo-details .logo_name {
    opacity: 1;
  }
  .sidebar .logo-details #btn {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    font-size: 22px;
    transition: all 0.4s ease;
    font-size: 23px;
    text-align: center;
    cursor: pointer;
    transition: all 0.5s ease;
  }
  .sidebar.open .logo-details #btn {
    text-align: right;
  }

  .sidebar .main-menu-list
  {
    height: 100%;
  }

  .sidebar i {
    color: var(--icons-color);
    height: 55px;
    min-width: 50px;
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
    border-radius: 12px;
    align-items: center;
    text-decoration: none;
    transition: all 0.4s ease;
    background: var(--bg-color);
  }
  .sidebar li a:hover {
    background: var(--menu-items-hover-color);
  }
  .sidebar li a .links_name {
    color: var(--menu-items-text-color);
    font-size: 15px;
    font-weight: 400;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: 0.4s;
  }
  .sidebar.open li a .links_name {
    opacity: 1;
    pointer-events: auto;
  }
  .sidebar li a:hover .links_name,
  .sidebar li a:hover i {
    transition: all 0.5s ease;
    color: var(--bg-color);
  }
  .sidebar li i {
    height: 50px;
    line-height: 50px;
    font-size: 18px;
    border-radius: 12px;
  }

  .sidebar .menu-item-2 {
   		padding-left: 10px;
   }
  .sidebar.open .menu-item-2 {
   		padding-left: 30px;
   }

   .menu-item-2 span {
   		font-size: 12px;
   }
  
  .sidebar.open ~ .home-section {
    left: 250px;
    width: calc(100% - 250px);
  }

  .my-scroll-active {
    overflow-y: auto;
  }
  #my-scroll {
    overflow-y: auto;
    height: calc(100% - 60px);
    margin: 6px 14px 0 14px;
  }
  #my-scroll::-webkit-scrollbar{
    display:none;
  }

</style>