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
    // console.log('localStorage.tic', localStorage.tic)

    let uri = window.location.href;
    let uri_parts = uri.split(".");

    this.check_is_in_workspace();

    let subdomain = "public";

    if (!uri.contains("?lang=")) {
      console.log("select lang");
      window.location.href += "?lang=ru";
    }

    if (uri_parts.length == 3) subdomain = uri_parts[0].replace("http://", "");
    // console.log('ddd', this.$store.state['domain'])
  },
  updated() {
    this.check_is_in_workspace();
  },
  mounted() {
    console.log("app mounted");
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
    v-bind:class="{ 'no-menu-container': !is_in_workspace, loading: loading }"
  >
    <router-view v-slot="{ Component }">
      <transition name="ffade" mode="out-in">
        <component :is="Component"></component>
      </transition>
    </router-view>
  </div>

  <Transition name="loading_fade" mode="out-in">
    <div v-show="false" class="loading-background">
      <div class="loading-bar"></div>
    </div>
  </Transition>
  <MainMenu />
  <Profile v-if="is_in_workspace" />
  <KAlerter />
</template>

<style lang="scss">
@import url("https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css");
@import "./css/palette.scss";
@import "./css/global.scss";

//$font-family:'Poppins', sans-serif;
body {
  background-color: $body-bg-color;
}

@font-face {
  font-family: "Segoe UI Local";
  src: local("Segoe UI Light");
  font-weight: 100;
  font-style: normal;
}

@font-face {
  font-family: "Segoe UI Local";
  src: local("Segoe UI Semilight");
  font-weight: 300;
  font-style: normal;
}

@font-face {
  font-family: "Segoe UI Local";
  src: local("Segoe UI");
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: "Segoe UI Local";
  src: local("Segoe UI Semibold");
  font-weight: 600;
  font-style: normal;
}

@font-face {
  font-family: "Segoe UI Web (West European)";
  src: url("https://static2.sharepointonline.com/files/fabric/assets/fonts/segoeui-westeuropean/segoeui-light.woff2")
      format("woff2"),
    url("https://static2.sharepointonline.com/files/fabric/assets/fonts/segoeui-westeuropean/segoeui-light.woff")
      format("woff");
  font-weight: 100;
  font-style: normal;
}

@font-face {
  font-family: "Segoe UI Web (West European)";
  src: url("https://static2.sharepointonline.com/files/fabric/assets/fonts/segoeui-westeuropean/segoeui-semilight.woff2")
      format("woff2"),
    url("https://static2.sharepointonline.com/files/fabric/assets/fonts/segoeui-westeuropean/segoeui-semilight.woff")
      format("woff");
  font-weight: 300;
  font-style: normal;
}

@font-face {
  font-family: "Segoe UI Web (West European)";
  src: url("https://static2.sharepointonline.com/files/fabric/assets/fonts/segoeui-westeuropean/segoeui-regular.woff2")
      format("woff2"),
    url("https://static2.sharepointonline.com/files/fabric/assets/fonts/segoeui-westeuropean/segoeui-regular.woff")
      format("woff");
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: "Segoe UI Web (West European)";
  src: url("https://static2.sharepointonline.com/files/fabric/assets/fonts/segoeui-westeuropean/segoeui-semibold.woff2")
      format("woff2"),
    url("https://static2.sharepointonline.com/files/fabric/assets/fonts/segoeui-westeuropean/segoeui-semibold.woff")
      format("woff");
  font-weight: 600;
  font-style: normal;
}

* {
  color: $text-color;
  font-size: $font-size;
  font-family: "Segoe UI Local"; //segoiui;//var(--font-family);

  margin: 0;
  padding: 0;
  box-sizing: border-box;
  transition: all 0.2s ease;
  opacity: 1;
}

.no-menu-container {
  left: 0px !important;
}

#router-view-container {
  position: absolute;
  background-color: $body-bg-color;
  top: 0px;
  left: $main-menu-width;
  width: calc(100vw - $main-menu-width);
  height: 100vh;
}

.loading {
  //background-color:  $panel-bg-color !important;
}

.panel {
  background: $panel-bg-color;
  border-radius: 10px;
  margin: 0px;
  border-style: ridge;
  border-width: $border-width;
  border-color: $body-bg-color;
  //box-shadow: 1px 0px 1px $body-bg-color;
}

.hidden {
  opacity: 0;
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
  transition: opacity 5s;
}
.loading_fade-leave-active {
  transition: opacity 0.1s;
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
  top: 2px;
  left: 2px;
  width: 100%;
  height: 100vh;
  background: rgba(0, 00, 0, 0.15);
  overflow: hidden;
  border-radius: 10px;
  z-index: 10;
}

.loading-bar {
  position: absolute;
  //height: 100%;
  width: 100%;

  height: 60vh;
  top: -50vh;
  //width: $loading-bar-width;
  //left:-$loading-bar-width;
  //background: linear-gradient(0.25turn, rgba(200,200,200,0.0), rgba(0,0,0,0.8), rgba(200,200,200,0.0));
  //animation: background 3s infinite ease-in-out;
  background: linear-gradient(
    rgba(200, 200, 200, 0),
    rgba(5, 10, 5, 0.5),
    rgba(200, 200, 200, 0)
  );
  animation: background 2s infinite alternate ease-in-out;
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

.footer_div {
  //position: absolute;
  padding-top: 5px;

  bottom: 0px;
  //display: table-footer-group;
}

.footer_div div {
  display: flex;
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
</style>
