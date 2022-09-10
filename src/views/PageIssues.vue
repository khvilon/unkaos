<script>
	
	import page_helper from '../page_helper.ts'
	import query_parser from '../query_parser.ts'

	import d from '../dict.ts'

	console.log('d', d['Название'],d)

	let methods = {
		get_field_path_by_name: function(name)
			{
				if(this.issue == undefined || this.issue.length != 1) return {}
				for(let i in this.issue[0].values) 
				{
					if(this.issue[0].values[i].label == name) 
					{
						return 'values.'+ i+'.value'
					}
				}
			},
			new_issue: function()
			{
				this.$router.push('/issue')
			},
			update_search_query: function(val)
			{
				this.search_query = val
			},
			search()
			{
				query_parser.parse(this.search_query, this.fields)


			}
		}

	const data = 
  {
    name: 'issues',
    label: 'Задачи',
	search_query: '',
    collumns:[
		{
	        name: '№',
	        id: ["project_short_name","'-'", "num"],
			search: true,
			type: 'link',
			link: '/issue/' ,
			link_id: ["project_short_name","'-'", "num"]
	    },
	  	{
	    	name: d['Название'],
	        id: "values.Название",
			search: true,
	    },
		{
	        name: 'Тип',
	        id: "type_name"
	    },
		{
	        name: 'Статус',
	        id: "status_name"
	    },
		{
	        name: 'Проект',
	        id: "project_name"
	    },
		{
            name: d['Автор'],
            id: "values.Автор",
			type:'user'
        },
	    {
	        name: d['Создана'],
	        id: "created_at",
	        type: 'date'
	    },
	    {
	        name: d['Изменена'],
	        id: "updated_at",
	        type: 'date'
	    },
	],
    inputs: [
		{
			label: 'fields',
			id: '',
			dictionary: 'fields',
			type: 'Select',
		},
		{
			label: 'users',
			id: '',
			dictionary: 'users',
			type: 'User',
		},
    ]
  }
     
  const mod = await page_helper.create_module(data, methods)

	export default mod
	
</script>



<template ref='issues' >
<div>
	
    <div class='panel topbar'>
		<div style="display: flex ; flex-direction:row; flex-grow: 1; max-height: calc(100% - 60px); ">
		<span>{{ label }}</span>
		<IssuesSearchInput
		label=""
		class='issue-search-input'
		@update_parent_from_input="update_search_query"
		:fields="fields"
		>

		</IssuesSearchInput>
		<KButton 
		name='bx-search-alt-2'
		class='issue-search-input-btn'
		@click="search()"
		/>
		

		<KButton 
		:name="'Создать'"
		@click="new_issue"
		/>
			
		</div>
	</div>

    <div id=issues_down_panel class="panel">
	
	  	<div id="issues_table_panel" >
			<Transition name="element_fade">
				<KTable v-if="!loading"
					:collumns="collumns"
					:table-data="issues"
					:name="'issues'"
					:dicts="{users: users}"
				/>
			</Transition>
	  	</div>
		  
	</div>
	</div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

	#issues_table_panel, #issues_card {
    height: calc(100vh - $top-menu-height);    
	}

  #issues_table_panel {
    display: flex;
    width: calc(100%);
  }

  #save_issues_btn, #delete_issues_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }

  #save_issues_btn input, #delete_issues_btn input{
  	width: 100%
  }

  #issues_down_panel {
    display: flex;
  }

  .issue-search-input textarea{
	  padding: 0px !important;

  }
  .issue-search-input{
	  padding: 0px !important;
	  width: 50vw;
  }
  .issue-search-input-btn{
	  padding: 0px;
	  width: $input-height;
  }
  .issue-search-input-btn .btn_input{
	  padding: 0px;
	  border-top-left-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
	margin-left: -$input-height;
	width: $input-height !important;

	border-top-width: 0px !important;
	border-bottom-width: 2px !important;
	border-left-color: $border-color !important;
    border-top-color: $border-color !important;
	//border-bottom-color: $border-color !important;

  }
  



</style>