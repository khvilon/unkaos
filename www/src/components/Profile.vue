<script>
import cache from "../cache";
import rest from "../rest";
export default {
  data() {
    return {
      user: {},
      menu_visible: false,
      common: this.$store.state["common"],
      themes: [
        { name: "Темная", val: "dark" },
        { name: "Темная теплая", val: "dark_warm" },
        { name: "Светлая", val: "light" }
      ],
      theme: "dark",
      langs: [{ name: "Русский", val: "ru" }],
      lang: { name: "Русский", val: "ru" },
      lock_main_menu: false,
      //instead of user.avatar for new year
      is_new_year: false,
      version: 'fff'
    };
  },
  mounted() {
    console.log("Cached profile:", cache.getObject('profile'));
    for (let i = 0; i < this.themes.length; i++) {
      if (cache.getString("theme") === this.themes[i].val) this.theme = this.themes[i];
    }
    this.lock_main_menu = cache.getObject("lock_main_menu");
//document.addEventListener("click", this.close_menu);

    this.update_user()

    cache.set_profile_listener(this.update_user)

    const admin_role_uuid = '556972a6-0370-4f00-aca2-73a477e48999'
    this.$store.state.common.is_admin = false
    for(let i in this.user.roles){
      if(this.user.roles[i].uuid == admin_role_uuid){
        this.$store.state.common.is_admin = true
        break
      }
    }
    console.log('isadmin>>>>>>>>>>', this.$store.state.common.is_admin)

    this.getVersion();
  },
  updated() {
    //console.log('uuuuu')
  },

  methods: {
    update_user(){
      try {
        this.user = cache.getObject("profile");
      } catch (err) {}
    },
    logout() {
      cache.setString("user_token", "");
      cache.setObject("profile", {});
      this.$router.push('/' + this.$store.state['common'].workspace + "/login");
    },
    close_menu(e) {
    //  console.log('ccc', e);
    //  if(e.target.localName == "img") return
    //  for (let i in e.path) {
        //if (e.path[i].className == "profile") return;
    //    localName
    //  }
      this.menu_visible = false;
    },
    set_theme(theme) {
      console.log("theme0", theme.val)
      this.theme = theme;
      cache.setString("theme", theme.val)
      console.log("theme1", theme.val)
      let htmlElement = document.documentElement;
      htmlElement.setAttribute("theme", theme.val);
    },
    set_lang(lang) {},
    update_lock_main_menu(value) {
      cache.setObject("lock_main_menu", value)
    },

    get_avatar(){
      return this.user.avatar ? this.user.avatar : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAAe9JREFUSEvlVtFRHTEQkyqADggVABWEdAAdQAVABSQVABWkBOgAqACoAEqACsRoZp05fPZ5j8kMH+zPvbnzW3m18srEFwW/CBefApa0D2AnNv1I8n5tAauAJR0A+AtgswJ6BXBM8ia7gTSwpEsAJ4PEZyS9bhgp4KD2NrKZVie/I/kaLJwC+Bnff5G8GyFngR+jp08kd1tJJb0A2ALgnu/9L2BFoi6Vkn4DOPc6ksOChgsqmrs0ZtcVJjLAPwA8xx8Oe8qVdBSK99Jtkqa+G0Ng/1OSj8sGgCuSFtIsJqp/I1kft9n6LPD0KM3ormjubm6KngV2BT4iZVr5t5VuJjxUitK7qq9LTgEH3e61J1MBr3P5fB+NepsWV51dkns8rdKV32Qn1qeBR4Mh+z1FtST30BT72Zxc0XNX7z77uRiLwJIsKruRqV0T1oLdyuJrRhe4Y4FvUVkrmZnwWS+xaJVN4KD2YZLkyo40UqwkK9/im9rnXov6HnBxI1d4kLG5KQXB1nW8a7rVDHjqMgDSxt45dhfx/g9Ju9e/aAF7KtnU01OoJyBJhbl7kr6nLQIX753tco2svXbJoz9UXImqa4HZDVS9/iCyGth0lLtV6u60tImly0EN7IFRJpPV2B0AmapjADXzpUZmBmTtmu8H/A4J79EfjfUqWAAAAABJRU5ErkJggg=='
    },
    toggle_menu(){
      console.log('tm')
      this.menu_visible = !this.menu_visible
    },
    async getVersion(){
      let meta = await rest.version();
      console.log('meta', meta)
      meta = JSON.parse(meta.version);
      this.version = meta.version;
    }
    
  },
};
</script>

<template>
  <div class="profile" v-if="common.is_in_workspace" v-click-outside="close_menu">
    <div class="profile-top">
      <img @click="toggle_menu()" :src="get_avatar()"  />
      <div
        v-if="!this.$store.state['common']['is_mobile']"
        class="profile-username"
      >
        {{ user.name }}
      </div>
      <div class="top-menu-icon-btn" v-if="false">
        <a
            class="bx new-issue-btn"
            title="Создать новую задачу"
            :href="'/' + $store.state['common'].workspace + '/issue?t=' + new Date().getTime()"
            tag="i"
        >
        
        <svg height="32" id="icon" viewBox="0 0 32 32" width="32" xmlns="http://www.w3.org/2000/svg"><polygon points="31 24 27 24 27 20 25 20 25 24 21 24 21 26 25 26 25 30 27 30 27 26 31 26 31 24"/><path d="M25,5H22V4a2.0058,2.0058,0,0,0-2-2H12a2.0058,2.0058,0,0,0-2,2V5H7A2.0058,2.0058,0,0,0,5,7V28a2.0058,2.0058,0,0,0,2,2H17V28H7V7h3v3H22V7h3v9h2V7A2.0058,2.0058,0,0,0,25,5ZM20,8H12V4h8Z"/></svg>
        </a>
      </div>


    </div>

    <div v-if="menu_visible" id="profile-menu" class="panel">
      <SelectInput
        label="Тема"
        :values="themes"
        :value="theme"
        :reduce="(obj) => obj.val"
        @update_parent_from_input="set_theme"
        :close_on_select="false"
        :parameters="{ clearable: false }"
      >
      </SelectInput>
      <SelectInput
        label="Язык"
        :values="langs"
        :value="lang"
        :reduce="(obj) => obj.val"
        @update_parent_from_input="set_lang"
        :parameters="{ clearable: false }"
      >
      </SelectInput>
      <BooleanInput
        label="Главное меню по логотипу"
        :value="lock_main_menu"
        @update_parent_from_input="update_lock_main_menu"
        style="margin-bottom: 10px"
      ></BooleanInput>
      <div id="profile-menu-exit" @click="logout()">
        <div>
          <i class="bx bxs-door-open"></i>
          <span>Выход</span>
        </div>
      </div>
      <br>
      <span>Версия системы: {{ version }}</span>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

.profile {
  position: absolute;
  right: 0;
  top: 0;
  padding: 10px 25px;
  z-index: 1;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  color: white;
  width: auto;
  height: 68px;
  z-index: 11;
}

.mobile .profile{
  height: 60px;
  padding: 10px 14px;
  z-index: 11;
}

.profile-username {
  padding: 5px;
  margin: 0 5px;
  font-weight: 400;
}

.new-issue-btn {
  display: flex !important;
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
  position: relative;
  width: 32px !important;
  height: 32px !important;
  font-size: 30px;
  cursor: pointer;
  text-decoration: none;
  color: var(--on-button-icon-color);
}
.new-issue-btn g, .new-issue-btn polygon, .new-issue-btn path{
  fill: var(--on-button-icon-color);
}

.new-issue-btn svg{
  height: fit-content;
  //transform: scale(1);
}

.new-issue-btn{
  padding: 4px;
  padding-top: 0;
  margin-top:0;
  width: 30px !important;
  height: 32px !important;
}

.mobile .profile-top .top-menu-icon-btn{
  margin-right: 10px;
  border: none;
  scale: 1.4;
}

.profile img {
  height: $input-height;
  width: $input-height;

  //new year
  //margin-top: -5px;
  //margin-right: -20px;
  //height: 50px;
  //width: 50px;

  object-fit: cover;
  border-radius: var(--border-radius);
  float: right;
 
  cursor: pointer;
  border-style: outset;
  border-width: 1px;
}

.mobile .profile img {
  border-radius: $input-height;
  scale: 1.2;
}

.profile-top {
  display: contents;
}

.profile-top .top-menu-icon-btn{
  margin: 0;
  padding: 0;
}

.profile-top div {
  float: right;
  font-size: 14px;
}

#profile-menu {
  position: absolute;
  right: 0;
  width: 250px;

  top: calc($top-menu-height + 2px);
  margin: 0;
  padding: 20px;
  background: var(--table-row-color);

  display: flex;
  flex-direction: column;
}

#profile-menu > *:not(:last-child) {
  margin-bottom: 10px;
}

#profile-menu-exit {
  width: 100%;
  margin-bottom: 0 !important;
}

#profile-menu-exit div {
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

#profile-menu-exit i {
  font-size: 20px;
}

</style>
