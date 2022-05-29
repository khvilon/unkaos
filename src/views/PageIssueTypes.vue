<script>
	import TopMenu from '../components/TopMenu.vue'
	import KTable from '../components/KTable.vue'
	import KButton from '../components/KButton.vue'
	import StringInput from '../components/StringInput.vue'
	import BooleanInput from '../components/BooleanInput.vue'
	import AvatarInput from '../components/AvatarInput.vue'
	import DateInput from '../components/DateInput.vue'
	import SelectInput from '../components/SelectInput.vue'

	import store_helper from '../store_helper.ts'
	import page_helper from '../page_helper.ts'

	const name = 'issue_types'
	const crud = 'crud'

	

	const store_module = store_helper.create_module(name, crud)

	//this.$store.registerModule('workflows', store_helper.create_module('workflows', 'crud'))
	//		this.$store.dispatch("get_workflows");

	

	 const instance = 
	{
		name: ''
	}

	const collumns =
	[
	  	{
	    	name: 'Название',
	        id: "name",
	        type: 'string'
	    }
	]

	const buttons = 
	[
        {
            name: 'Создать',
            func: 'unselect_' + name,
        }
    ]

    const search_collumns = ['name']

    methods: 
    {
    	/*add_user(event) 
    	{
      		console.log('ttt ' + this)
      // `event` — нативное событие DOM
      		if (event) console.log(event.target.tagName)
        }*/
	}

	const props = 
	{
		inputs: {
			type: Array,
        	default: () => [
				{
					label: 'Название',
					id: 'name',
					type: 'String'

				},
				{
					label: 'Воркфлоу',
					id: 'workflow.0.uuid',
					type: 'Select',
					clearable: false,
					reduce: workflow => workflow.uuid
				}
				,
				{
					label: 'Зарегистрирован',
					id: 'created_at',
					type: 'Date',
					disabled: true
				}

			]
		}
	}
     
	const data = {instance, collumns, buttons, name, search_collumns}

	const components =
    {
    	TopMenu,
    	KTable,
    	StringInput,
    	BooleanInput,
    	AvatarInput,
    	DateInput,
    	KButton,
		SelectInput
    }

	//data.workflows = [1,2,3]

    const mod = page_helper.create_module(name, crud, data, components, store_module, props)

	mod.beforeCreate = function()
	{
		//workflows = ['a1', 'a2']
		if (!this.$store.state['issue_types']) 
		{
			this.$store.registerModule('issue_types', store_helper.create_module('issue_types', 'crud'))
		}
		if (!this.$store.state['workflows']) 
		{
			this.$store.registerModule('workflows', store_helper.create_module('workflows', 'crud'))
			this.$store.dispatch("get_workflows");
		}
	}
	mod.computed.workflows = function(){ return this.$store.getters['get_workflows'] }
	

	export default mod


	
</script>



<template ref='issue_types'>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
		:label="'Типы задач'"
  		:collumns="search_collumns"
    />
    <div id=issue_types_down_panel>
	  	<div id="issue_types_table_panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="issue_types"
	    		:name="'issue_types'"
	    	/>
	  	</div>
	  	<div id="issue_types_card">
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="get_json_val(selected_issue_types, input.id)"
	  			:parent_name="'issue_types'"
	  			:disabled="input.disabled"
				:clearable="input.clearable"
				:values="workflows"
				:parameters="input"
	  		></component>
	  		<div id="issue_types_card_footer_div">
	  			<div id="issue_types_card_infooter_div">
			  		<KButton
			  			id="save_issue_types_btn"
			  			:name="'Сохранить'"
			  			:func="'save_issue_types'"
			  		/>
			  		<KButton
			  			id="delete_issue_types_btn"
			  			:name="'Удалить'"
			  			:func="'delete_issue_types'"
			  		/>
		  		</div>
	  		</div>
	  	</div>
	</div>
</template>




<style>
	#issue_types_table_panel, #issue_types_card {
    background-color: rgb(35, 39, 43);
    border-radius: 8px;
    margin: 1px;
    color: white;
    min-height: calc(100vh - 77px);
    height: calc(100vh - 100px);
	}


  #issue_types_table_panel {
    display: flex;
    margin-left: 2px;
	width: 290px;
  }

  #issue_types_card {
    width: calc(100% - 290px);
    margin-left: 0px;
    display: table;
  }

  #issue_types_card StringInput {
  	display: table-row;
  }

  #issue_types_card_footer_div {
  	display: table-footer-group;
  }
  #issue_types_card_infooter_div {
  	display: flex;
  }
  

  #save_issue_types_btn, #delete_issue_types_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }


  #save_issue_types_btn input, #delete_issue_types_btn input{
  	width: 100%

  }

  #issue_types_down_panel {
    display: flex;
  }


  .ktable
	{
		width:100%;
		margin-left: 20px;
		margin-right: 20px;
	}
</style>