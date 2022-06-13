<script>
	
	import page_helper from '../page_helper.ts'

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
			}
		}

	const data = 
  {
    name: 'issues',
    label: 'Задачи',
    collumns:[
		{
	        name: '№',
	        id: ["project_short_name","'-'", "num"],
			search: true,
			type: 'link'
	    },
	  	{
	    	name: d['Название'],
	        id: "this.get_field_path_by_name('Название')",
			search: true,
	    },
        {
            name: d['Автор'],
            id: "this.get_field_path_by_name('Автор')"
        },
		{
	        name: 'Статус',
	        id: "status_name"
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
     
  const mod = await page_helper.create_module(data, methods)

	export default mod
	
</script>



<template ref='issues' >
<div>
	
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
		:label="label"
  		:collumns="search_collumns"
    />

    <div id=issues_down_panel class="panel">
	
	  	<div id="issues_table_panel" >
			<Transition name="element_fade">
				<KTable v-if="!loading"
					:collumns="collumns"
					:table-data="issues"
					:name="'issues'"
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