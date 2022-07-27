<script>
	
	import page_helper from '../page_helper.ts'


	const data = 
  	{
    	name: 'roles',
    	label: 'Роли пользователей',
		instance:
		{
			fields: []
		},
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
				label: 'Пользователи',
				id: 'users',
				dictionary: 'users',
				type: 'User',
				clearable: false,
			}
			,
			{
				label: 'Зарегистрирована',
				id: 'created_at',
				type: 'Date',
				disabled: true
			}

		]
  }
     
  const mod = await page_helper.create_module(data)

	export default mod


	
</script>



<template ref='roles'>
<div>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
		:label="'Типы задач'"
  		:collumns="search_collumns"
    />
    <div id=roles_down_panel>
	  	<div id="roles_table_panel" class="panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="roles"
	    		:name="'roles'"
	    	/>
	  	</div>
	  	<div id="roles_card" class="panel">
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="get_json_val(selected_roles, input.id)"
	  			:parent_name="'roles'"
	  			:disabled="input.disabled"
				:clearable="input.clearable"
				:values="input.values"
				:parameters="input"
	  		></component>
	  		<div id="roles_card_footer_div" class="footer_div">
	  			<div id="roles_card_infooter_div">
			  		<KButton
			  			id="save_roles_btn"
			  			:name="'Сохранить'"
			  			:func="'save_roles'"
			  		/>
			  		<KButton
			  			id="delete_roles_btn"
			  			:name="'Удалить'"
			  			:func="'delete_roles'"
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

	#roles_table_panel, #roles_card {
    height: calc(100vh - $top-menu-height);
	}


  #roles_table_panel {
    display: flex;
	width: $table-panel-width;
  }

  #roles_card {
    width: calc(100% - $table-panel-width);
    display: table;
  }
  

  #save_roles_btn, #delete_roles_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }


  #save_roles_btn input, #delete_roles_btn input{
  	width: 100%

  }

  #roles_down_panel {
    display: flex;
  }
</style>