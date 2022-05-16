//import { createApp } from 'vue'

import { createApp } from 'vue/dist/vue.esm-bundler';
import { createStore } from 'vuex'

import router from "./router";
import store from "./stores";

import App from './App.vue'

const app = createApp(App);
 
app.use(router)
app.use(store)

app.mount('#app')















