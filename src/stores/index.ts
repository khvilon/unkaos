import { createStore } from 'vuex'

import tools from "../tools.ts";

const mutations = {
  loadUsersM(state, payload) { state.users = payload },
  loadFilteredUsersM(state, payload) { state.filtered_users = payload }
};


const actions = {
  async loadUsers ()
  {
    const resp = await fetch('http://localhost:3001/get_users',
    {
      method: 'get',
      headers: { 'content-type': 'application/json'}
    })

    const data = await resp.json();

    this.commit('loadUsersM', data);
    this.commit('loadFilteredUsersM', data);
  },
  filterUsers(state, {val, collumns})
  {
    let data = tools.filter_data(state.state.users, val, collumns)

    this.commit('loadFilteredUsersM', data);
  }
}

const store = createStore()

export default store