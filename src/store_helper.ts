//import { Console } from 'console'
import rest from './rest.ts'
import tools from './tools.ts'

const base_url = 'http://localhost:3001/'

const store_helper = {}

store_helper.dict = 
{
	r: 'get',
	u: 'update',
	c: 'create',
	d: 'delete'
}

store_helper.create_module = function(name)
{ 
	let st = {}
	st[name] = []
	st['filtered_' + name] = []
	st['selected_' + name] = {}
	st['updated_' + name] = {}
	st['sorted_' + name] = {collumn_name:false, reverse:false}
	const state = function()
	{
		return st
	}

	const getters = {}
	getters['get_' + name] = function(state)
	{
		return state['filtered_' + name]
	}
	getters['selected_' + name] = function(state)
	{
		return state['selected_' + name]
	}
	getters[name + '_num_by_uuid'] = function(state) 
	{
		return function(uuid)
		{
			for(let i in state[name])
		  	{
		  		if(state[name][i].uuid == uuid) return i
		  	}
		}
	}
	getters['filtered_' + name + '_num_by_uuid'] = function(state) 
	{
		return function(uuid)
		{
			for(let i in state['filtered_' + name])
		  	{
		  		if(state['filtered_' + name][i].uuid == uuid) return i
		  	}
		}
	}

	const mutations = {}
	mutations['get_' + name] = function(state, payload)
	{
		state[name] = payload
	  	state['filtered_' + name] = tools.clone_obj(payload)
	}
	mutations['filter_' + name] = function(state, payload)
	{
	  	state['filtered_' + name] = payload
	}
	mutations['select_' + name] = function(state, uuid)
	{
		for(let i in state['filtered_' + name])
		{
			if(state['filtered_' + name][i].uuid == uuid)
			{
				state['selected_' + name] = state['filtered_' + name][i]
				state['filtered_' + name][i].selected = true
			}
			else state['filtered_' + name][i].selected = false
		}
		state['updated_' + name] = {}
	}
	mutations['push_update_' + name] = function(state, data)
	{
		if(data.uuid!==undefined && state['selected_' + name].uuid != data.uuid) return

		console.log('data', data)
		state['updated_' + name] = tools.clone_obj(data)
		state['selected_' + name] = tools.obj_join(state['selected_' + name], data)
	}
	mutations['create_' + name] = function(state, data)
	{
		state[name].push(data)
		state['filtered_' + name].push(data)
		this.commit('select_' + name, data.uuid)
	}
	mutations['update_' + name] = function(state)
	{
		let uuid = state['selected_' + name].uuid
		let num = this.getters[name + '_num_by_uuid'](uuid)
		let filtered_num = this.getters['filtered_' + name + '_num_by_uuid'](uuid)

		for(let i in state['updated_' + name])
		{		
			if(JSON.stringify(state[name][num][i]) != JSON.stringify(state['updated_' + name][i]))
			{
				console.log('uuu', name, state[name][num][i],'\r\n', state['updated_' + name][i])
				state[name][num][i] = state['updated_' + name][i]
				state['filtered_' + name][filtered_num][i] = state['updated_' + name][i]
				state['selected_' + name][i] = state['updated_' + name][i]
			}
			else delete state['updated_' + name][i]
		}
	}
	mutations['unselect_' + name] = function(state)
	{

		console.log('iiiii', state['instance_' + name])
	  	state['selected_' + name] = tools.obj_clone(state['instance_' + name])
	  	state['updated_' + name] = tools.obj_clone(state['instance_' + name])
	  	for(let i in state['filtered_' + name])
		{
			state['filtered_' + name][i].selected = false
		}
	}
	mutations['delete_' + name] = function(state)
	{
		let uuid = state['selected_' + name].uuid
		let num = this.getters[name + '_num_by_uuid'](uuid)
		let filtered_num = this.getters['filtered_' + name + '_num_by_uuid'](uuid)
		state[name].splice(num, 1)
		state['filtered_' + name].splice(filtered_num, 1);
	  	this.commit('unselect_' + name)
	}
	mutations['sort_' + name] = function(state, collumn)
	{
		console.log('lllll', collumn)
		if(state['sorted_' + name].collumn == collumn) 
			state['sorted_' + name].reverse = !state['sorted_' + name].reverse
		else
		{
			state['sorted_' + name].order = false
			state['sorted_' + name].collumn = collumn
		}
		state['filtered_' + name].sort(tools.compare_obj(collumn))
		if(state['sorted_' + name].reverse) state['filtered_' + name].reverse()
	}
	

	const actions = {}
	actions['get_' + name] = async function()
	{
		console.log('geeeeeet', name)
		let params
		if(name == 'issue') params = {uuid: 'cf80f5b4-ba05-472e-80ea-4805ffc2f431'}
		else params = undefined
		const data = await rest.run_method('read_' + name, params)

		console.log('got data', data)

	    this.commit('get_' + name, data);
	}
	actions['filter_' + name] = async function(state, {val, collumns})
	{
		let data = tools.filter_data(state.state[name], val, collumns)

	    this.commit('filter_' + name, data);
	}
	actions['upsert_' + name] = async function(state)
	{
		rest.run_method('upsert_' + name, state.state['selected_' + name])
	}
	actions['create_' + name] = async function(state)
	{
	/*	let body = 
	    {
	        "uuid": tools.uuidv4(),
	        "password": "temp",
	    }
	    for(let i in state.state['updated_' + name])
		{
			body[i] = state.state['updated_' + name][i]
		}*/

		//console.log('body', body)

		//body.created_at = Date()
		this.commit('create_' + name, state.state['selected_' + name])

		let ans = await rest.run_method('create_' + name, state.state['selected_' + name])

		state.state['updated_' + name] = ans[0]
		this.commit('update_' + name)
	}
	actions['update_' + name] = async function(state)
	{
		this.commit('update_' + name);

		//let body = state.state['updated_' + name]
		//body.uuid = state.state['selected_' + name].uuid

		console.log('uuuuupdate', state.state['selected_' + name])

		rest.run_method('update_' + name, state.state['selected_' + name])
	}
	actions['save_' + name] = async function(state)
	{
		const is_new = state.state['selected_' + name] == undefined || state.state['selected_' + name].uuid == undefined || state.state['selected_' + name].is_new
		console.log('is_new', is_new)
		state.state['selected_' + name].is_new = false
		if(is_new) this.dispatch('create_' + name)
		else this.dispatch('update_' + name)
	}
	actions['delete_' + name] = async function(state)
	{
		console.log(state.state['selected_' + name])
		if(state.state['selected_' + name] == undefined || state.state['selected_' + name].uuid == undefined) 
			this.commit('unselect_' + name);
		else
		{
			rest.run_method('delete_' + name, state.state['selected_' + name])
			this.commit('delete_' + name)
		}
	}
	actions['unselect_' + name] = async function(state)
	{
		this.commit('unselect_' + name)
	}
	actions['sort_' + name] = async function(state, collumn)
	{
	    this.commit('sort_' + name, collumn);
	}



	
	  	
	return {
	  state,
	  getters,
	  mutations,
	  actions
	}
}

export default store_helper