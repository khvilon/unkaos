<script>
	import TopMenu from '../components/TopMenu.vue'
	import KTable from '../components/KTable.vue'
	import KButton from '../components/KButton.vue'
	import StringInput from '../components/StringInput.vue'
	import BooleanInput from '../components/BooleanInput.vue'
	import AvatarInput from '../components/AvatarInput.vue'
	import DateInput from '../components/DateInput.vue'

	import store_helper from '../store_helper.ts'
	import page_helper from '../page_helper.ts'

	import d from '../dict.ts'
	

	const name = 'issues'
	const crud = 'crud'

	console.log('d', d['Название'],d)

	const store_module = store_helper.create_module(name, crud)

	const collumns =
	[
		{
	        name: '№',
	        id: ["project_short_name","'-'", "num"] 
	    },
	  	{
	    	name: d['Название'],
	        id: "values.Название",
	    },
        {
            name: d['Автор'],
            id: "owner.0.name"
        },
        {
            name: d['Ответственный'],
            id: "project.0.short_name"
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
	]


	const buttons = 
	[
        {
            name: d['Создать задачу'],
            func: 'unselect_' + name,
        }
    ]

    const search_collumns = ['name']

    methods: 
    {
    	/*add_project(event) 
    	{
      		console.log('ttt ' + this)
      // `event` — нативное событие DOM
      		if (event) console.log(event.target.tagName)
        }*/
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

    const mod = page_helper.create_module(name, crud, data, components, store_module, {})

	export default mod


	
</script>



<template ref='issues'>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
  		:collumns="search_collumns"
    />
    <div id=issues_down_panel>
	  	<div id="issues_table_panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="issues"
	    		:name="'issues'"
	    	/>
	  	</div>
	</div>
</template>




<style>
	#issues_table_panel, #issues_card {
    background-color: rgb(35, 39, 43);
    border-radius: 8px;
    margin: 1px;
    color: white;
    min-height: calc(100vh - 77px);
    height: calc(100vh - 100px);
	}


  #issues_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100%);
  }

  #issues_card {
    width: 400px;
    margin-left: 0px;
    display: table;
  }

  #issues_card StringInput {
  	display: table-row;
  }

  #issues_card_footer_div {
  	display: table-footer-group;
  }
  #issues_card_infooter_div {
  	display: flex;
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


  .ktable
	{
		width:100%;
		margin-left: 20px;
		margin-right: 20px;
	}
</style>