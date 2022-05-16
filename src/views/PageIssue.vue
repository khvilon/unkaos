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

	const name = 'issue'
	const crud = 'crud'

	const store_module = store_helper.create_module(name, crud)



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
		id: {
			type: String,
			default: null,
		},
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
     

	const data = { name, search_collumns}

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



<template ref='issue'>
    <div id=issue_down_panel>
	  	<div id="issue_card">
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="get_json_val(selected_issue, input.id)"
	  			:parent_name="'issue'"
	  			:disabled="input.disabled"
	  		></component>
	  		<div id="issue_card_footer_div">
	  			<div id="issue_card_infooter_div">
			  		<KButton
			  			id="save_issue_btn"
			  			:name="'Сохранить'"
			  			:func="'save_issue'"
			  		/>
			  		<KButton
			  			id="delete_issue_btn"
			  			:name="'Удалить'"
			  			:func="'delete_issue'"
			  		/>
		  		</div>
	  		</div>
	  	</div>
	</div>
</template>




<style>
	#issue_table_panel, #issue_card {
    background-color: rgb(35, 39, 43);
    border-radius: 8px;
    margin: 1px;
    color: white;
    height: 100vh;
	}



  #issue_card {
    width: 100%;
    margin-left: 2px;
    display: table;
  }

  #issue_card StringInput {
  	display: table-row;
  }

  #issue_card_footer_div {
  	display: table-footer-group;
  }
  #issue_card_infooter_div {
  	display: flex;
  }
  

  #save_issue_btn, #delete_issue_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }


  #save_issue_btn input, #delete_issue_btn input{
  	width: 100%

  }

  #issue_down_panel {
    display: flex;
  }


  .ktable
	{
		width:100%;
		margin-left: 20px;
		margin-right: 20px;
	}
</style>