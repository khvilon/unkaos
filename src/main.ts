//import { createApp } from 'vue'

import { createApp } from 'vue/dist/vue.esm-bundler';
import { createStore } from 'vuex'

import router from "./router";
import store from "./stores";

import App from './App.vue'
import vSelect from 'vue-select'

import 'vue-select/dist/vue-select.css';


const app = createApp(App);
 
app.use(router)
app.use(store)



app.component('v-select', vSelect)

app.mount('#app')















