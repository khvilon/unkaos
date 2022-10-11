<script>
	
	import page_helper from '../page_helper.ts'
	import query_parser from '../query_parser.ts'

	import d from '../dict.ts'
	import rest from '../rest';
	import tools from '../tools.ts'
import { computed } from '@vue/runtime-core';

	

	let methods = {

		
		init: async function()
		{

			console.log('dashboard mounted', this.dashboard)

			if(this.selected_dashboard == undefined || this.dashboard || undefined || this.dashboard[0] != undefined) 
			{
				setTimeout(this.init, 5000)
				return
			}

			console.log('sselected_dashboard1', this.selected_dashboard, this.dashboard[0])

			//check not double
		//	if(!this.selected_dashboard.is_new) return

			if(this.selected_dashboard.uuid != this.dashboard[0].uuid) this.$store.commit('select_dashboard', this.dashboard[0].uuid);

			console.log(this.uuid)

			
		},
		
	}

	const data = 
  {
	name: 'dashboard',
	lebel: 'Дашборд',

	instance: 
      {
        name: ''
        
      },
	
    collumns:[
		{
	        name: '№',
	        id: ["project_short_name","'-'", "num"],
			search: true,

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
			id: 'estimate_uuid',
			dictionary: 'fields',
			type: 'Select',
		},
		{
			id: 'query',
			type: 'String',
		},
		{
			id: 'dashboards_columns',
			dictionary: 'issue_statuses',
			type: 'User',
		},
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

  mod.mounted = methods.init


  mod.props =
    {
      uuid:
      {
        type: String,
        default: ''
      }
    }
   
  
  

	export default mod
	
</script>



<template ref='dashboard' >
<div @mouseup="dragend_card()">
	
    <div class='panel topbar'>
		<div style="display: flex ; flex-direction:row; flex-grow: 1; max-height: calc(100% - 60px); ">
		<StringInput 
		v-if="dashboard != undefined && selected_dashboard != undefined"
		label=''
		id="name"
		key="dashboard_name"
		:parent_name="'dashboard'"
		class="dashboard-name-input"
		:value="get_json_val(selected_dashboard, 'name')"
		>
		</StringInput>
		
		
		<i class='bx bx-trash top-menu-icon-btn delete-dashboard-btn'
		@click="delete_dashboard()"
		>	
		</i>
		
	
		</div>
	</div>

	

    <div id=dashboard_down_panel class="panel" >

		

		  
	</div>

	

	</div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

	#dashboards_table_panel, #dashboards_card {
    height: calc(100vh - $top-menu-height);    
	}

  #dashboards_table_panel {
    display: flex;
    width: calc(100%);
  }

  #save_dashboards_btn, #delete_dashboards_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }

  #save_dashboards_btn input, #delete_dashboards_btn input{
  	width: 100%
  }

  #dashboard_down_panel {
    display: flex;
	flex-direction: column;
	height: calc(100vh - $top-menu-height);

	overflow:scroll;
  }

  #dashboard_down_panel::-webkit-scrollbar{
    display:none;
  }




</style>