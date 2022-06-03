<script>

	import tools from '../tools.ts'
	import store_helper from '../store_helper.ts'
	import page_helper from '../page_helper.ts'


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


  const data = 
  {
    name: 'issue',
    label: 'Поля',
    collumns:[
      
    ],
    inputs: [
     
    ]
  }
     
  const mod = await page_helper.create_module(data, methods)


	export default mod


	
</script>



<template ref='issue'>
    <div id="issue_top_panel" class="panel">
				<StringInput 
				class='issue-code' 
				label='' 
				disabled="true"
				:value="issue[0].project_short_name  + '-' +  issue[0].num"
				>
				</StringInput>
				<KButton
					class="status-btn"
			  		:name="'Взять в работу'"
			  		:func="'save_issue'"
			  	/>
    >
	</div>


    <div id=issue_down_panel>
      <div id="issue_main_panel" class="panel">
        
		<div class="issue-line">

		  <StringInput :label="get_field_by_name('Название').label"
				:value="get_field_by_name('Название').value"
				class="issue-name-input"
			>
			</StringInput>
			<UserInput :label="get_field_by_name('Автор').label"
				:value="get_field_by_name('Автор').value"
				:disabled="true"
				class="issue-author-input"
			>
			</UserInput>
			
			

		</div>

		<TextInput :label="get_field_by_name('Описание').label"
				:value="get_field_by_name('Описание').value"
			>
			</TextInput>



      </div>
      <div id="issue_card" class="panel">

		<component  v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in get_fields_exclude_names(['Название', 'Описание', 'Автор'])"
				
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="input.value"
	  			:parent_name="'issue'"
	  			:disabled="input.disabled"
	  		></component>
        
        <div id="issue_card_footer_div" class="footer_div">
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





<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

	$card-width: 400px;
  $code-width: 160px;
  $author-input-width: 250px;

  #issue_top_panel
  {
	  height: $top-menu-height;
	  display: flex;
  }

	#issue_table_panel, #issue_card {
    margin: 1px;
    height: calc(100vh - $top-menu-height);
	}

	.issue-code
	{
		width: $code-width
	}



	#issue_main_panel
	{
		display: table;
   	 	margin: 1px;
    	width: calc(100vw - 3px - $card-width);
	}


  #issue_card {
    width:  $card-width;
    margin-left: 0px;
    display: table;
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

.issue-line
	{
		display: flex;
	}

	.status-btn, .status-btn 
	{
		padding: 10px 20px 10px 20px;
	}
  .status-btn, .status-btn .btn_input
	{
		height: $input-height !important;
		
		width: 250px  !important;
	}

.issue-name-input{
	width: calc(100% - $author-input-width)
}

.issue-author-input{
	width: $author-input-width;
}


</style>