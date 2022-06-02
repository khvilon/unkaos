<script>

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
	
	}
     

	const data = { name, search_collumns}


	let methods = {
		get_field_by_name: function(name)
		{
			if(this.issue.length != 1) return {}
			for(let i in this.issue[0].values) 
			{
				if(this.issue[0].values[i].label == name) return this.issue[0].values[i]
			}
		},
		get_fields_exclude_names: function(names)
		{
			let fields = []
			if(this.issue.length != 1) return {}
			for(let i in this.issue[0].values) 
			{
				let match = false
				for(let j in names)
				{
					if(this.issue[0].values[i].label == names[j])
					{
						match = true
						continue
					}
				}
				if(!match) fields.push(this.issue[0].values[i])
			}
			return fields
		}
	}

    const mod = page_helper.create_module(name, crud, data, {}, store_module, props, methods)


	//  mod.computed.issue_data = function(){ return this.$store.getters['get_issue'] }



	mod.updated = function()
	{
		console.log('i updated')
	}

	export default mod


	
</script>



<template ref='issue'>
    <div id=issue_down_panel>
	  	<div id="issue_card" v-if="issue[0]!=undefined">
		  	<div><span>{{issue[0].project_short_name}}-{{issue[0].num}}</span></div>
			<StringInput :label="get_field_by_name('Название').label"
				:value="get_field_by_name('Название').value"
			>
			</StringInput>
			<TextInput :label="get_field_by_name('Описание').label"
				:value="get_field_by_name('Описание').value"
			>
			</TextInput>
			<UserInput :label="get_field_by_name('Автор').label"
				:value="get_field_by_name('Автор').value"
				:disabled="true"
			>
			</UserInput>
	  		<component  v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in get_fields_exclude_names(['Название', 'Описание', 'Автор'])"
				
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="input.value"
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