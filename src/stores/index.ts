import { createStore } from 'vuex'

import tools from "../tools.ts";

const store = createStore()

store.registerModule('common',{});
store.registerModule('alerts', {});
store.state['alerts'] = {}
store.state['common'] = {}


export default store