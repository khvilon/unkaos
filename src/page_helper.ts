const page_helper = {}

import tools from './tools.ts';
import dict from './dict.ts'
import store_helper from './store_helper.ts'
import store from './stores/index'
import rest from './rest';

let lang = tools.get_uri_param(window.location.href, 'lang')

dict.set_lang(lang)

const beforeCreate = function()
{
	console.log('before create 5555555555555555', store.state['common'])
	store.state['common']['loading'] = true;
	//store.state['common']['is_router_view_visible'] = false
}

const beforeUnmount = function()
{
	console.log('beforeUnmount 5555555555555555', store.state['common'])
	this.visible = false
	//store.state['common']['is_router_view_visible'] = false
}

const beforeMount = function()
{
	//this.visible = false
	//store.state['common']['is_router_view_visible'] = false
	store.state['common']['is_router_view_visible'] = true
}



const register_store_module_if_not_exists = async function(name, params)
{
	console.log('mename', name)
	if (!store.getters['get_' + name])
	{
		const store_module = store_helper.create_module(name)
		store.registerModule(name, store_module)	
	}

	if(name=='issue' && params == undefined ) return
	
	await store.dispatch('get_' + name, params);

	console.log('meeeeeeeeeeeee.$store.state[name]', name, JSON.stringify(store.getters['get_' + name]))
}

const register_computed = async function(computed, name)
{
	console.log('mename computed', name)

	computed[name] = function(){ 
		if(this.$store.state[name] == undefined) return []; 
		return this.$store.state[name]['filtered_' + name] 
	}
	computed['selected_' + name] = function(){ 
		if(this.$store.state[name] == undefined) return []; 
		return this.$store.state[name]['selected_' + name] 
	}
	

	return computed;
}

page_helper.create_module = async function(data, methods)
{
	//data[data.name] = {}
	//data[data.name]['selected_' + data.name] = {}
	

	data.visible = false
	data.loaded = false
	

	if (data.buttons == undefined) data.buttons= []
	data.buttons.push(
      {
        name: 'Создать',
        func: 'unselect_' + data.name,
      }
	)

	data.search_collumns = []
	for(let i in data.collumns)
	{
		if(data.collumns[i].search) data.search_collumns.push(data.collumns[i].id)
	}

	let computed = {
		loading: function(){
		  if(this.$store.state['common'] == undefined) return false
		  return this.$store.state['common']['loading']
		}
	  }
	computed = await register_computed(computed, data.name)

	for(let i in data.inputs)
	{
		if(data.inputs[i].dictionary == undefined) continue
		computed = await register_computed(computed, data.inputs[i].dictionary)

		data.inputs[i].reduce = obj => obj.uuid

		data.inputs[i].values = data.inputs[i].dictionary
	}

	const created = async function() 
   	{
		//store.state['common']['is_router_view_visible'] = false
		let params

		if(this.id != undefined && this.id != '')
		{
			let [proj_short, num] = this.id.split('-')

			let proj = await rest.run_method('read_projects', {short_name: proj_short})

			params = {project_uuid: proj[0].uuid, num: num}
		}

		await register_store_module_if_not_exists(data.name, params)

		for(let i in data.inputs)
		{
			if(data.inputs[i].dictionary == undefined) continue
			await register_store_module_if_not_exists(data.inputs[i].dictionary)
		}
		
		console.log('created')

		for(let i in this.inputs)
		{
			this.inputs[i].values = this[this.inputs[i].dictionary]
		}
		  
		let instance = {}
		if(this.instance !== undefined) instance = tools.obj_clone(this.instance)
		instance.uuid = tools.uuidv4()
		//instance.name = 'aaa'
		instance.is_new = true

		console.log('ttt', this.$store.state[this.name][this.name])
		this.$store.state[this.name]['selected_' + this.name] = instance

		console.log("this.$store.state[this.name]['selected_' + this.name]", this.$store.state[this.name]['selected_' + this.name])
		this.$store.state[this.name]['instance_' + this.name] =  tools.obj_clone(instance)

		for(let i in this.inputs)
		{
			//console.log('iiiii00', this.inputs[i].values)
			if(typeof this.inputs[i].values != undefined && typeof this.inputs[i].values == 'string' && this.inputs[i].values.split('.')[0] == 'this')
			this.inputs[i].values = this[this.inputs[i].values.split('.')[1]]

			//this[this.inputs[i].dictionary] = this.$store.state[this.inputs[i].dictionary]

		}

		console.log('cr', this.$store.state[this.name])

		//this[this.name] = this.$store.getters['get_' + this.name]
		//this['selected_' + this.name] = this.$store.getters['selected_' + this.name]

		this.loaded = true
		console.log('meee loaaaaadeeeeeddd')

		this.$store.state['common']['loading'] = false

		if(this.name == 'issue') 
		{
			console.log('selilili', this[this.name][0].uuid)
			this.$store.commit('select_issue', this[this.name][0].uuid);
		}
		
		//this.$forceUpdate()
  	}

	  const mounted = function() {
		//this.$forceUpdate()
		console.log('meee 555555 Mounted!')
		this.visible = true
		store.state['common']['is_router_view_visible'] = true
	  }
	  

	if(methods == undefined) methods = {}
    methods.get_json_val = tools.obj_attr_by_path

	return {
    	created,
		mounted,
		beforeUnmount,
		data:function(){return data},
    	beforeCreate,
		methods,
		computed,
		beforeMount
  	}
}

export default page_helper