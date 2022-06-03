<script>
	
	import page_helper from '../page_helper.ts'

	import d from '../dict.ts'

	console.log('d', d['Название'],d)

	const data = 
  {
    name: 'issues',
    label: 'Задачи',
    collumns:[
		{
	        name: '№',
	        id: ["project_short_name","'-'", "num"],
			search: true
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
	],
    inputs: [
      
    ]
  }
     
  const mod = await page_helper.create_module(data)

	export default mod
	
</script>



<template ref='issues' >
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
		:label="label"
  		:collumns="search_collumns"
    />
    <div id=issues_down_panel class="panel">
	  	<div id="issues_table_panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="issues"
	    		:name="'issues'"
	    	/>
	  	</div>
	</div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

	#issues_table_panel, #issues_card {
    margin: 1px;
    height: calc(100vh - $top-menu-height);

    transition: all 3s ease;
	}


  #issues_table_panel {
    display: flex;
    margin-left: 2px;
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