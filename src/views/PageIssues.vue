<script>
	
	import page_helper from '../page_helper.ts'
	import query_parser from '../query_parser.ts'

	import d from '../dict.ts'
	import rest from '../rest';
	
	console.log('d', d['Название'],d)

	let methods = {
		get_issues: async function(query, offset)
			{
				localStorage.issues_query = this.search_query;
				localStorage.issues_query_encoded = this.search_query_encoded;

				console.log('get issues with query ', query, localStorage.issues_query)
				let options = {}
				this.search_query_encoded = ''
				if(query != undefined && query != '') options.query = this.search_query_encoded = query
				if(offset != undefined) options.offset = offset
				
				let issues = (await rest.run_method('read_issues', options))

				if(offset != undefined) 
				{
					for(let i in issues)
					{
						this.loaded_issues.push(issues[i])
					}
				}
				else this.loaded_issues = issues
				//console.log(this.loaded_issues[0], this.issues[0])
			},
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
				console.log('update_search_query', val)
				this.search_query = val
			},
			load_more: function()
			{
				this.get_issues(this.search_query_encoded, this.loaded_issues.length)
			}
			
		}

	const data = 
  {
	loaded_issues: [],
    name: 'issues',
    label: 'Задачи',
	search_query: undefined,
	search_query_encoded: '',
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


		{
			label: 'issue_statuses',
			id: '',
			dictionary: 'issue_statuses',
			type: 'User',
		}
		,
		{
			label: 'projects',
			id: '',
			dictionary: 'projects'
		},
		{
			label: 'issue_types',
			id: '',
			dictionary: 'issue_types'
		},
    ]
  }
     
  const mod = await page_helper.create_module(data, methods)

  mod.mounted = function()
  {
	  
	this.$nextTick(function () {
	//this.search_query = ''
	this.search_query = localStorage.issues_query != undefined ? localStorage.issues_query : ''
	//this.search_query =  'Проект = Заказ '
	console.log('this.search_query', this.search_query, localStorage.issues_query)
	})
	
	//this.
  }

  mod.activated = function() {
	  console.log('activated!')
  this.$nextTick(function () {
	  if(this.search_query == localStorage.issues_query) return
    this.search_query = localStorage.issues_query != undefined ? localStorage.issues_query : ''
  })
}
/*
  mod.computed.issues2 = async function()
  {
	return await get_issues(this.search_query)
	  return [this.issues[0]]
  }*/

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
		@search_issues="get_issues"
		:projects="projects"
		:issue_statuses="issue_statuses"
		:issue_types="issue_types"
		:users="users"
		:parent_query="search_query"
		>

		</IssuesSearchInput>
		

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
					@scroll_update="load_more"
					:collumns="collumns"
					:table-data="loaded_issues"
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

  
  



</style>