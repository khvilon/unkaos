<script>
	import TopMenu from '../components/TopMenu.vue'
	import KTable from '../components/KTable.vue'

	import tools from '../tools.ts'
	import store_helper from '../store_helper.ts'
	import page_helper from '../page_helper.ts'

	const name = 'projects'
	const methods = 'crud'

	const store_module = store_helper.create_module(name, methods)

	const collumns =
	[
	  	{
	    	name: 'Название',
	        id: "name"
	    },
	    {
	        name: 'Код',
	        id: "short_name"
	    }
	]

	const buttons = 
	[
        {
            name: 'Создать проект',
            function: 'Dashboard',
        }
    ]

    const search_collumns = ['name', 'short_name']
     

	const data = {collumns, buttons, name, search_collumns}

	const components =
    {
    	TopMenu,
    	KTable
    }

    const mod = page_helper.create_module(name, methods, data, components, store_module)

	export default mod


	
</script>



<template>
  <TopMenu 
  		:buttons="buttons"
  		:name="name"
  		:collumns="search_collumns"
  />
  <div id="projects_panel">
    <KTable 
    	:collumns="collumns"
    	:table-data="projects"
    />
  </div>
</template>




<style>
  #projects_panel {
    min-height: calc(100vh - 77px);
    height: calc(100vh - 100px);
    display: flex;
    background-color: rgb(35, 39, 43);
    border-radius: 8px;
    margin: 1px;
    margin-left: 2px;
    color: white;
    width: calc(100% - 3px);
  }

  .ktable
	{
		width:100%;
		margin-left: 20px;
		margin-right: 20px;
	}
</style>