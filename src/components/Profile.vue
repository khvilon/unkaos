<template>   
  <div class="profile" v-if="common.is_in_workspace">
    <img :src="user.avatar" @click="menu_visible=!menu_visible"><div>{{user.name}}</div>
    <div v-if="menu_visible" id="profile-menu" class="panel">
      <div id="profile-menu-exit" @click="logout()">
        <span>Выход</span>
        <i class='bx bxs-door-open'></i>
      </div>
    </div>
  </div>
</template>

<script>
  export default 
  {

    /*
    props: 
    {
      name:
      {
        type: String,
        default: 'Хвилон Николай',
      },
      logo_src:
      {
        type: String,
        default: "https://oboz.myjetbrains.com/hub/api/rest/avatar/b9b1d87d-568f-4f54-8ee3-44035e1137ff?etag=MjYtMjYwOA%3D%3D&amp;dpr=1.25&amp;size=32",
      }
    },*/

    data()
    {
      return{
        user: {},
        menu_visible: false,
        common: this.$store.state['common']
      }
    },
    mounted()
    {
      console.log('localStorage.profile', localStorage.profile)
      

      //console.log(this.user.avatar)

      document.addEventListener('click', this.close_menu)
  
    },
    updated() {
      //console.log('uuuuu')
      this.user = JSON.parse(localStorage.profile)
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
        if(e.target.localName == 'img') return
        this.menu_visible= false  
      }
    },
  }
</script>

<style lang="scss">

  @import '../css/palette.scss';
  @import '../css/global.scss';

  .profile {
    position: absolute;
    height: 74px;
    width: 90px;
    right: 0px;
    top: 0px; 
    padding: 7px;
    
    z-index: 1001;
    display: block;
    align-items: center;
    color: white;
    width:  300px;
  }
 
  .profile img {
    height: 32px;
    width: 32px;
    object-fit: cover;
    border-radius: 6px;
    margin-right: 16px;
    float:right;
    margin-top: 16px;
    background-image: url('https://oboz.myjetbrains.com/hub/api/rest/avatar/7755ec62-dfa1-4c3c-a3a9-ac6748d607c1?dpr=1.25&size=20')
  }
  .profile div {
    margin-top: 20px;
    margin-right: 10px;
    float:right;
  }

  #profile-menu
  {
    position: absolute;
    right: 0px;
    width: 200px;
    height: 100px;
    top: calc($top-menu-height + 2px);
    margin: 0px;
    background-color: $table-row-color;
    display: flex;
    align-items: center;
  }

  #profile-menu-exit
  {
    margin: 0px;
    width: 100%;
    text-align: center;
  }

</style>