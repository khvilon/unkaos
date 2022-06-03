const page_helper = {}

import tools from './tools.ts';
import dict from './dict.ts'
import store_helper from './store_helper.ts'
import store from './stores/index'

let lang = tools.get_uri_param(window.location.href, 'lang')

dict.set_lang(lang)

const register_store_module_if_not_exists = async function(computed, name)
{
	console.log('mename', name)
	if (!store.state[name])
	{
		const store_module = store_helper.create_module(name)
		store.registerModule(name, store_module)
		await store.dispatch('get_' + name);
	}

	computed[name] = function(){ return this.$store.getters['get_' + name] }
	computed['selected_' + name] = function(){ return this.$store.getters['selected_' + name] }

	console.log('me.$store.state[name]', name, JSON.stringify(store.state[name]))
}

page_helper.create_module = async function(data, methods)
{
	if(typeof data == 'string') return {}

	if (data.buttons == undefined) data.buttons= []
	data.buttons.push(
      {
        name: 'Создать',
        func: 'unselect_' + data.name,
      }
	)

	let computed = {}

	await register_store_module_if_not_exists(computed, data.name)

    for(let i in data.inputs)
	{
		if(data.inputs[i].dictionary == undefined) continue
		await register_store_module_if_not_exists(computed, data.inputs[i].dictionary)

		data.inputs[i].reduce = obj => obj.uuid

		data.inputs[i].values = data.inputs[i].dictionary
	}

	data.search_collumns = []
	for(let i in data.collumns)
	{
		if(data.collumns[i].search) data.search_collumns.push(data.collumns[i].id)
	}

	/*
	const beforeCreate = function() 
	{

  	}


	 
	const beforeUnmount = function() {
	this.is_visible=false
	console.log('unm', this.is_visible)
	}

	const mounted = function() {
	this.is_visible=true
	console.log('mounted', this.is_visible)
	}*/


	const created = async function() 
   	{
		
		console.log('created')

		for(let i in this.inputs)
		{
			this.inputs[i].values = this[this.inputs[i].dictionary]
		}
		  
		let instance = {}
		if(this.instance !== undefined) instance = tools.obj_clone(this.instance)
		instance.uuid = tools.uuidv4()
		instance.is_new = true

		this.$store.state[this.name]['selected_' + this.name] = instance

		console.log("this.$store.state[this.name]['selected_' + this.name]", this.$store.state[this.name]['selected_' + this.name])
		this.$store.state[this.name]['instance_' + this.name] =  tools.obj_clone(instance)

		for(let i in this.inputs)
		{
			//console.log('iiiii00', this.inputs[i].values)
			if(typeof this.inputs[i].values != undefined && typeof this.inputs[i].values == 'string' && this.inputs[i].values.split('.')[0] == 'this')
			this.inputs[i].values = this[this.inputs[i].values.split('.')[1]]
		}

		console.log('cr', this.$store.state[this.name])
		
		
  	}
	  

	if(methods == undefined) methods = {}
    methods.get_json_val = tools.obj_attr_by_path

	return {
    	created,
		//mounted,
		//beforeUnmount,
		data:function(){return data},
    	//beforeCreate,
		methods,
		computed
  	}
}

export default page_helper