<script>
import MainMenu from "./components/MainMenu.vue";
import Profile from "./components/Profile.vue";
import KAlerter from "./components/KAlerter.vue";

import palette from "./palette.ts";
import dict from "./dict.ts";
import tools from "./tools.ts";

let uri = window.location.href;

let lang = tools.get_uri_param(uri, "lang");
dict.set_lang(lang);

export default {
  data() {
    return {
      is_in_workspace: false,
    };
  },

  created() {
    this.check_is_in_workspace();
    // console.log('localStorage.tic', localStorage.tic)
    /*
      let uri = window.location.href
     
      if(!uri.contains('?lang='))
      { 
        console.log('select lang') 
        window.location.href += '?lang=ru'     
      }*/
  },
  updated() {
    // this.check_is_in_workspace()
  },

  mounted() {
    console.log("app mounted");
    if (localStorage.theme == undefined) localStorage.theme = "dark";
    let htmlElement = document.documentElement;
    htmlElement.setAttribute("theme", localStorage.theme);

    this.$store.state["common"]["is_mobile"] = this.is_mobile() || this.in_iframe();
    this.$store.state["common"]["in_iframe"] = this.in_iframe();
    

    console.log(
      "this.$store.state[common][is_mobile]",
      this.$store.state["common"]["is_mobile"], this.$store.state["common"]["in_iframe"]
    );
  },
  computed: {
    loading: function () {
      if (this.$store.state["common"] == undefined) return false;
      return this.$store.state["common"]["loading"];
    },
    is_router_view_visible: function () {
      if (this.$store.state["common"] == undefined) return false;
      return this.$store.state["common"]["is_router_view_visible"];
    },
  },
  methods: {
    is_mobile: function () {
      return window.innerHeight > window.innerWidth;
    },
    in_iframe: function () {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    },
    pasted: function (e) {
      console.log(e);
    },
    check_is_in_workspace() {
      console.log("check_is_in_workspace");
      let uri = window.location.href;

      let uri_parts = uri.split(".");

      if (uri_parts.length != 3) {
        this.is_in_workspace = false;
        this.$router.push("/");
        return;
      }

      let subdomain = "public";

      if (uri.contains("/login")) {
        console.log("main menu off");
        this.is_in_workspace = false;
      }

      this.is_in_workspace = true;
    },
    show() {
      console.log("alerter", Object.values(this.$store.state["alerts"]));
    },
  },

  components: {
    MainMenu,
    Profile,
    KAlerter,
  },
};
</script>

<template>
  <div
    id="router-view-container"
    v-bind:class="{
      'no-menu-container': !is_in_workspace,
      loading: loading,
      'mobile-view': $store.state['common']['is_mobile'],
      'iframe-view': $store.state['common']['in_iframe'],
    }"
  >
    <router-view v-slot="{ Component }" :key="$route.fullPath">
      <transition name="ffade" mode="out-in">
        <component :is="Component" class="rv-container"></component>
      </transition>
    </router-view>
  </div>

  <Transition name="loading_fade" mode="out-in">
    <div
      v-show="
        Object.values($store.state['alerts']).some(
          (o) =>
            (o.type == 'loading' || o.type == 'ok') &&
            (o.status == 'show' || o.status == 'new')
        )
      "
      class="loading-background"
    >
      <div class="loading-bar"></div>
    </div>
  </Transition>
  <MainMenu
    v-if="$store.state['common'] && !$store.state['common']['in_iframe']"
    v-bind:class="{ 'mobile-sidebar': $store.state['common']['is_mobile'] }"
  />
  <Profile v-if="is_in_workspace && $store.state['common'] && !$store.state['common']['in_iframe']" />
  <KAlerter />
</template>

<style lang="scss">
@import url("https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css");
@import "./css/palette.scss";
@import "./css/global.scss";

//$font-family:'Poppins', sans-serif;
body {
  background-color: var(--body-bg-color);
  transition: all 0.5s ease;
  overflow: hidden;
  padding: 0px;
  margin: 0px;
}

* {
  color: var(--text-color);
  font-size: $font-size;
  //font-family: 'Segoe UI Local';//segoiui;//var(--font-family);

  font-family: Inter, system-ui, Roboto, sans-serif;

  //margin: 0;
  //padding: 0;
  box-sizing: border-box;
  transition: all 0.2s ease;
  opacity: 1;

  // font-family: 'Poppins', sans-serif;
}

[draggable] {
  -moz-user-select: none;
  -khtml-user-select: none;
  -webkit-user-select: none;
  user-select: none;
  /* Required to make elements draggable in old WebKit */
  -khtml-user-drag: element;
  -webkit-user-drag: element;

  cursor: grab;
}

[draggable]:active {
  cursor: grabbing;
}

.link {
  white-space: nowrap;
}

#router-view-container {
  position: absolute;
  background-color: var(--body-bg-color);
  top: 0px;
  left: $main-menu-width;
  width: calc(100vw - $main-menu-width);
  height: 100vh;
}

.mobile-view {
  left: 0px !important;
  width: calc(100vw) !important;
  height: calc(100vh - $main-menu-width) !important;
  top: $main-menu-width !important;
}

.iframe-view {
  height: 100vh !important;
  top: 0 !important;
}

.no-menu-container {
  left: 0px !important;
}

.loading {
  //background-color:  $panel-bg-color !important;
}

.panel {
  background: var(--panel-bg-color);
  border-radius: var(--panel-border-radius);
  margin: 0px;
  border-style: ridge;
  border-width: $border-width;
  border-color: var(--body-bg-color);
  //box-shadow: 1px 0px 1px $body-bg-color;
}

.hidden {
  opacity: 0;
}

input {
  border-color: var(--border-color);
  border-style: var(--border-style);
  border-width: var(--border-width);
}

.panel_fade-enter-active,
.panel_fade-leave-active {
  transition: opacity 4.1s;
}

.element_fade-enter-active,
.element_fade-leave-active {
  transition: opacity 0.1s;
}

.loading_fade-enter-active {
  transition: opacity 4s ease;
}
.loading_fade-leave-active {
  transition: opacity 0.5s;
}

.element_fade-enter-from,
.element_fade-leave-to {
  opacity: 0;
}

.panel_fade-enter-from,
.panel_fade-leave-to,
.loading_fade-enter-from,
.loading_fade-leave-to {
  opacity: 0;
}

.ffade-enter-active,
.ffade-leave-active {
  transition: opacity 0.15s ease;
}

.ffade-enter-from,
.ffade-leave-to {
  opacity: 0.9;
}

.ffade-enter-to,
.ffade-leave-from {
  opacity: 1;
}

.topbar {
  z-index: 0;
}

$loading-bar-width: 200vw;

.loading-background {
  // display: none;
  position: absolute;
  top: 2px !important;
  left: 2px !important;
  width: 100% !important;
  height: 100vh !important;
  background: var(--loading-bg-color);
  overflow: hidden !important;
  border-radius: var(--panel-border-radius);
  z-index: 10 !important;
}

.loading-bar {
  position: absolute !important;
  //height: 100%;
  width: 100% !important;

  height: 100vh !important;
  top: -100vh;
  z-index: 11 !important;
  //width: $loading-bar-width;
  //left:-$loading-bar-width;
  //background: linear-gradient(0.25turn, rgba(200,200,200,0.0), rgba(0,0,0,0.8), rgba(200,200,200,0.0));
  //animation: background 3s infinite ease-in-out;
  background: linear-gradient(
    rgba(200, 200, 200, 0),
    var(--loading-bar-color),
    rgba(200, 200, 200, 0)
  ) !important;
  animation: background 1.5s infinite alternate ease-in-out !important;
}

@keyframes background {
  100% {
    //    left:calc(100%);
    top: 90vh;
  }
}

.ktable {
  width: 100%;
  margin-left: 20px;
  margin-right: 20px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.75s ease-out;
}

.slide-enter-to {
  position: absolute;
  right: 0;
}

.slide-enter-from {
  position: absolute;
  right: -100%;
}

.slide-leave-to {
  position: absolute;
  left: -100%;
}

.slide-leave-from {
  position: absolute;
  left: 0;
}

.modal {
  height: 100%;
}

.btn-container {
  display: flex;
  padding: 10px 20px 10px 20px;
  bottom: 0px;
  position: fixed;
  width: -webkit-fill-available;
}

.btn-container .btn {
  width: 50%;
}

.btn-container .btn input {
  width: 100%;
}

.resolved-issue {
  text-decoration: line-through;
}

::-webkit-scrollbar {
  //display: none;
  //color: red;
  background-color: none;
  width: 12px;
  height: 12px;
  opacity: 0;
}

::-webkit-scrollbar-track {
  background: none;        /* цвет дорожки */
 // -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.9);
    border-radius: 10px;
}

::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background: var(--scroll-color);
    -webkit-box-shadow: inset 0 0 5px var(--scroll-shadow-color);
}

.table_card_footer_btn {
  width: 45%;

  input {
    width: 100% !important;
  }
}

.change-password .btn_input {
  width: 100% !important;
}

.top-menu-icon-btn {
	  height: $input-height;
    width: $input-height;
    font-size: calc($input-height - 10px);
    border-radius: var(--border-radius);
    margin-left: 10px;
	  color: var(--text-color);
    background-color: var(--button-color);
    border-width: 1px;
    border-color: var(--border-color);
    border-style: solid;
    border-style: outset;
    cursor: pointer;
	
    text-align: center;
	padding-top: 4px;
  }

.login-panel .btn_input {
  margin-top: 10px;
  width: 100%;
}

.issue-search-input-btn {
  padding: 0px;
  //width: $input-height;
}
.issue-search-input-btn .btn_input {
  padding: 0px;
  border-top-left-radius: 0px !important;
  border-bottom-left-radius: 0px !important;
  margin-left: -$input-height;
  width: $input-height !important;
  height: $input-height;

  border-top-width: var(--issue-search-btn-top-border-width) !important;
  border-bottom-width: var(--border-width) !important;
  border-left-color: var(--border-color) !important;
  border-top-color: var(--border-color) !important;
  //border-bottom-color: $border-color !important;
}

</style>
