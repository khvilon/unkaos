<script>
	import page_helper from '../page_helper.ts'

	const data = 
  {
    name: 'issue_statuses',
    label: 'Статусы задач',
    collumns:[
	  	{
	    	name: 'Название',
	        id: "name",
	        type: 'string',
			search: true
	    },
		{
	    	name: 'Начальный',
	        id: "is_start",
	        type: 'boolean'
	    },
		{
	    	name: 'Конечный',
	        id: "is_end",
	        type: 'boolean'
	    },
	    {
	        name: 'создан',
			id: "created_at",
	        type: "date"
	    },
	    {
	        name: 'Обновлен',
	        id: "updated_at",
	        type: "date"
	    }
	],
    inputs: [
		{
			label: 'Название',
			id: 'name',
			type: 'String'
		},
		{
			label: 'Начальный',
			id: 'is_start',
			type: 'Boolean'
		},
		{
			label: 'Конечный',
			id: 'is_end',
			type: 'Boolean'
		},
		{
			label: 'Зарегистрирован',
			id: 'created_at',
			type: 'Date',
			disabled: true
		}
	],
  }
     
  const mod = await page_helper.create_module(data)

   

	export default mod


	
</script>



<template ref='issue_statuses'>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
		:label="'Статусы задач'"
  		:collumns="search_collumns"
    />
    <div id=issue_statuses_down_panel>
	  	<div id="issue_statuses_table_panel" class="panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="issue_statuses"
	    		:name="'issue_statuses'"
	    	/>
	  	</div>
	  	<div id="issue_statuses_card" class="panel">
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="selected_issue_statuses[input.id]"
	  			:parent_name="'issue_statuses'"
	  			:disabled="input.disabled"
	  		></component>
	  		<div id="issue_statuses_card_footer_div" class="footer_div">
	  			<div id="issue_statuses_card_infooter_div">
			  		<KButton
			  			id="save_issue_statuses_btn"
			  			:name="'Сохранить'"
			  			:func="'save_issue_statuses'"
			  		/>
			  		<KButton
			  			id="delete_issue_statuses_btn"
			  			:name="'Удалить'"
			  			:func="'delete_issue_statuses'"
			  		/>
		  		</div>
	  		</div>
	  	</div>
	</div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

	#issue_statuses_table_panel, #issue_statuses_card {
    height: calc(100vh - $top-menu-height);
	}


  #issue_statuses_table_panel {
    display: flex;
    width: calc(100vw - $card-width);
  }

  #issue_statuses_card {
    width:  $card-width;
    display: table;
  }

  #save_issue_statuses_btn, #delete_issue_statuses_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }


  #save_issue_statuses_btn input, #delete_issue_statuses_btn input{
  	width: 100%

  }

  #issue_statuses_down_panel {
    display: flex;
  }


  
</style>

