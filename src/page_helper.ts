const page_helper = {}

import tools from './tools.ts';
import dict from './dict.ts'

let lang = tools.get_uri_param(window.location.href, 'lang')

dict.set_lang(lang)

page_helper.create_module = function(name, crud, rdata, components, store_module, props)
{ 
	const beforeCreate = function() {
    	if (!this.$store.state[name]) this.$store.registerModule(name, store_module);

  	}

  	const computed = {}
  	computed[name] = function(){ return this.$store.getters['get_' + name] }
  	computed['selected_' + name] = function(){ return this.$store.getters['selected_' + name] }

	  
	  const beforeUnmount = function() {
		this.is_visible=false
		console.log('unm', this.is_visible)
	  }

	  const mounted = function() {

		this.is_visible=true
		console.log('mounted', this.is_visible)
	  }

	const created = async function() 
   	{
		   console.log('created')
		  
    	await this.$store.dispatch("get_" + name);

		let instance = {}
		if(this.instance !== undefined) instance = tools.obj_clone(this.instance)
		instance.uuid = tools.uuidv4()
		instance.is_new = true

		this.$store.state[name]['selected_' + name] = instance
		this.$store.state[name]['instance_' + name] =  tools.obj_clone(instance)
  	}

	rdata.is_visible = false

  	const data = function()
  	{
    	return rdata
    }

    const methods = 
    {
    	'get_json_val' : tools.obj_attr_by_path
    }

	return {
    	components,
    	created,
		mounted,
		beforeUnmount,
  		computed,
    	data,
    	beforeCreate,
    	props,
    	methods
  	}
}

export default page_helper