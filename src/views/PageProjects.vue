<script>
	
	import page_helper from '../page_helper.ts'

	const data = 
  {
    name: 'projects',
    label: 'Проекты',
    collumns:[
	  	{
	    	name: 'Название',
	        id: "name",
	        type: 'user',
			search: true
	    },
	    {
	        name: 'Код',
	        id: "short_name",
			search: true
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
	],
    inputs: [
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
					type: 'Text'
				},
				{
					label: 'Аватар',
					id: 'avatar',
					type: 'Avatar'
				},
                {
                    label: 'Владелец',
                    id: 'owner_uuid',
                    type: 'User',
                    disabled: false,
					clearable: false
                },
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



<template ref='projects'>
<div>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
		:label="label"
  		:collumns="search_collumns"
    />
    <div id=projects_down_panel>
	  	<div id="projects_table_panel"  class="panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="projects"
	    		:name="'projects'"
	    	/>
	  	</div>
	  	<div id="projects_card"  class="panel">
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="get_json_val(selected_projects, input.id)"
	  			:parent_name="'projects'"
	  			:disabled="input.disabled"
				:clearable="input.clearable"
	  		></component>
			 
	  		<div id="projects_card_footer_div" class="footer_div">
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
	</div>
</template>



<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

	#projects_table_panel, #projects_card {
    height: calc(100vh - $top-menu-height);
	}


  #projects_table_panel {
    display: flex;
    width: calc(100% - $card-width);
  }

  #projects_card {
    width: $card-width;
    display: table;
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


</style>