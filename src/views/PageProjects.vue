<script>
	import TopMenu from '../components/TopMenu.vue'
	import KTable from '../components/KTable.vue'
	import KButton from '../components/KButton.vue'
	import StringInput from '../components/StringInput.vue'
	import BooleanInput from '../components/BooleanInput.vue'
	import AvatarInput from '../components/AvatarInput.vue'
	import DateInput from '../components/DateInput.vue'

	import tools from '../tools.ts'
	import store_helper from '../store_helper.ts'
	import page_helper from '../page_helper.ts'

	const name = 'projects'
	const crud = 'crud'

	const store_module = store_helper.create_module(name, crud)

	const collumns =
	[
	  	{
	    	name: 'Название',
	        id: "name",
	        type: 'user'
	    },
	    {
	        name: 'Код',
	        id: "short_name"
	    },
        {
            name: 'Владелец',
            id: "owner.0.name"
        
        },
	    {
	        name: 'Зарегистрирован',
	        id: "created_at",
	        type: 'date'
	    },
	]


	const buttons = 
	[
        {
            name: 'Создать проект',
            func: 'unselect_' + name,
        }
    ]

    const search_collumns = ['name', 'short_name']

    methods: 
    {
    	/*add_project(event) 
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
					label: 'Код',
					id: 'short_name',
					type: 'String'
				},
				{
					label: 'Описание',
					id: 'description',
					type: 'String'
				},
				{
					label: 'Аватар',
					id: 'avatar',
					type: 'Avatar'
				},
                {
                    label: 'Владелец',
                    id: 'owner.0.name',
                    type: 'String',
                    disabled: true
                },
				{
					label: 'Зарегистрирован',
					id: 'created_at',
					type: 'Date',
					disabled: true
				}

			]
		}
	}
     

	const data = {collumns, buttons, name, search_collumns}

	const components =
    {
    	TopMenu,
    	KTable,
    	StringInput,
    	BooleanInput,
    	AvatarInput,
    	DateInput,
    	KButton
    }

    const mod = page_helper.create_module(name, crud, data, components, store_module, props)

	export default mod


	
</script>



<template ref='projects'>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
  		:collumns="search_collumns"
    />
    <div id=projects_down_panel>
	  	<div id="projects_table_panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="projects"
	    		:name="'projects'"
	    	/>
	  	</div>
	  	<div id="projects_card">
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="get_json_val(selected_projects, input.id)"
	  			:parent_name="'projects'"
	  			:disabled="input.disabled"
	  		></component>
	  		<div id="projects_card_footer_div">
	  			<div id="projects_card_infooter_div">
			  		<KButton
			  			id="save_projects_btn"
			  			:name="'Сохранить'"
			  			:func="'save_projects'"
			  		/>
			  		<KButton
			  			id="delete_projects_btn"
			  			:name="'Удалить'"
			  			:func="'delete_projects'"
			  		/>
		  		</div>
	  		</div>
	  	</div>
	</div>
</template>




<style>
	#projects_table_panel, #projects_card {
    background-color: rgb(35, 39, 43);
    border-radius: 8px;
    margin: 1px;
    color: white;
    min-height: calc(100vh - 77px);
    height: calc(100vh - 100px);
	}


  #projects_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100% - 3px - 400px);
  }

  #projects_card {
    width: 400px;
    margin-left: 0px;
    display: table;
  }

  #projects_card StringInput {
  	display: table-row;
  }

  #projects_card_footer_div {
  	display: table-footer-group;
  }
  #projects_card_infooter_div {
  	display: flex;
  }
  

  #save_projects_btn, #delete_projects_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }


  #save_projects_btn input, #delete_projects_btn input{
  	width: 100%

  }

  #projects_down_panel {
    display: flex;
  }


  .ktable
	{
		width:100%;
		margin-left: 20px;
		margin-right: 20px;
	}
</style>