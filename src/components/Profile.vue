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
      //instead of user.avatar for new year
      bad_santa: 'data:image/jpeg;base64,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'
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
      <img :src="bad_santa" @click="menu_visible = !menu_visible" />
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

  //new year
  margin-top: -5px;
  height: 50px;
  width: 50px;

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
