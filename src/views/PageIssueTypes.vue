<script>
	
	import page_helper from '../page_helper.ts'


	const data = 
  	{
    	name: 'issue_types',
    	label: 'Типы задач',
    	collumns:[
			{
				name: 'Название',
				id: "name",
				type: 'string',
				search: true
			}
		],
		inputs:[
			{
				label: 'Название',
				id: 'name',
				type: 'String'
			},
			{
				label: 'Воркфлоу',
				id: 'workflow_uuid',
				dictionary: 'workflows',
				type: 'Select',
				clearable: false,
			},
			{
				label: 'Поля',
				id: 'fields',
				type: 'Select',
				clearable: false,
				dictionary: 'fields',
				multiple: true
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
     
  const mod = await page_helper.create_module(data)

	export default mod


	
</script>



<template ref='issue_types'>
<div>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
		:label="'Типы задач'"
  		:collumns="search_collumns"
    />
    <div id=issue_types_down_panel>
	  	<div id="issue_types_table_panel" class="panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="issue_types"
	    		:name="'issue_types'"
	    	/>
	  	</div>
	  	<div id="issue_types_card" class="panel">
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="get_json_val(selected_issue_types, input.id)"
	  			:parent_name="'issue_types'"
	  			:disabled="input.disabled"
				:clearable="input.clearable"
				:values="input.values"
				:parameters="input"
	  		></component>
	  		<div id="issue_types_card_footer_div" class="footer_div">
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
	</div>
</template>




<style lang="scss">
	@import '../css/palette.scss';
  	@import '../css/global.scss';

  	$table-panel-width: 290px;

	#issue_types_table_panel, #issue_types_card {
    height: calc(100vh - $top-menu-height);
	}


  #issue_types_table_panel {
    display: flex;
	width: $table-panel-width;
  }

  #issue_types_card {
    width: calc(100% - $table-panel-width);
    display: table;
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
</style>