//import { createApp } from 'vue'

import { createApp } from 'vue/dist/vue.esm-bundler';
import { createStore } from 'vuex'

import router from "./router";
import store from "./stores";

import App from './App.vue'
import vSelect from 'vue-select'

import 'vue-select/dist/vue-select.css';

import StringInput from './components/StringInput.vue'
import TextInput from './components/TextInput.vue'
import BooleanInput from './components/BooleanInput.vue'
import AvatarInput from './components/AvatarInput.vue'
import DateInput from './components/DateInput.vue'
import SelectInput from './components/SelectInput.vue'
import UserInput from './components/UserInput.vue'

import KTable from './components/KTable.vue'
import KButton from './components/KButton.vue'

import TopMenu from './components/TopMenu.vue'


const app = createApp(App);
 
app.use(router)
app.use(store)

app.component('v-select', vSelect)

app.component('StringInput', StringInput)
app.component('TextInput', TextInput)
app.component('BooleanInput', BooleanInput)
app.component('AvatarInput', AvatarInput)
app.component('DateInput', DateInput)
app.component('SelectInput', SelectInput)
app.component('UserInput', UserInput)

app.component('KTable', KTable)
app.component('KButton', KButton)

app.component('TopMenu', TopMenu)

app.mount('#app')















