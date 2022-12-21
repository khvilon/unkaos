<script>
import cache from "../cache";
export default {
  data() {
    return {
      user: {},
      menu_visible: false,
      common: this.$store.state["common"],
      themes: [
        { name: "Темная", val: "dark" },
        { name: "Темная объемная", val: "dark_3d" },
        { name: "Светлая", val: "light" },
        { name: "Я блондинка!", val: "pink" },
      ],
      theme: "dark",
      langs: [{ name: "Русский", val: "ru" }],
      lang: { name: "Русский", val: "ru" },
      lock_main_menu: false,
    };
  },
  mounted() {
    console.log("Cached profile:", cache.getObject('profile'));
    for (let i = 0; i < this.themes.length; i++) {
      if (cache.getString("theme") === this.themes[i].val) this.theme = this.themes[i];
    }
    this.lock_main_menu = cache.getObject("lock_main_menu");
    document.addEventListener("click", this.close_menu);

    try {
      this.user = cache.getObject("profile");
    } catch (err) {}
  },
  updated() {
    //console.log('uuuuu')
  },

  methods: {
    logout() {
      cache.setString("user_token", "");
      cache.setObject("profile", {});
      this.$router.push("/login");
    },
    close_menu(e) {
      console.log(e);
      for (let i in e.path) {
        if (e.path[i].className == "profile") return;
      }
      this.menu_visible = false;
    },
    set_theme(theme) {
      this.theme = theme;
      cache.setString("theme", theme.val)
      let htmlElement = document.documentElement;
      htmlElement.setAttribute("theme", theme.val);
    },
    set_lang(lang) {},
    update_lock_main_menu(value) {
      cache.setObject("lock_main_menu", value)
    },
  },
};
</script>

<template>
  <div class="profile" v-if="common.is_in_workspace">
    <div class="profile-top">
      <img :src="user.avatar" @click="menu_visible = !menu_visible" />
      <div class="profile-username">{{ user.name }}</div>
      <div class="issue-top-button">
        <a
            class="bx bx-plus new-issue-btn"
            title="Создать новую задачу"
            :href="'/issue?t=' + new Date().getTime()"
            tag="i"
        >
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
}

.profile-username {
  padding: 5px;
  margin: 0 5px;
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
  border-radius: 50% !important;
  border-style: solid;
  cursor: pointer;
  text-decoration: none;
  color: var(--on-button-icon-color);
}

.profile img {
  height: $input-height;
  width: $input-height;
  object-fit: cover;
  border-radius: var(--border-radius);
  float: right;
  // background-image: url('https://oboz.myjetbrains.com/hub/api/rest/avatar/7755ec62-dfa1-4c3c-a3a9-ac6748d607c1?dpr=1.25&size=20');
  cursor: pointer;
  border-style: outset;
  border-width: 1px;
}

.profile-top {
  display: contents;
}

.profile-top div {
  float: right;
  font-weight: 600;
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
