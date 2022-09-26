<script>
	
	import page_helper from '../page_helper.ts'
	import query_parser from '../query_parser.ts'

	import d from '../dict.ts'
	import rest from '../rest';
	import tools from '../tools.ts'
import { computed } from '@vue/runtime-core';

	console.log('d', d['Название'],d)

	let methods = {

		init_new: async function()
		{

		},
		init: async function()
		{
			this.configs_open = false
			/*{
				this.init_new()
				return;
			}*/
			this.dashboards_issues = []
			//check loaded
			if(this.selected_dashboard == undefined || 
			this.issue_statuses == undefined || this.inputs_dict == undefined || this.inputs_dict.dashboards_columns == undefined) 
			{
				setTimeout(this.init, 200)
				return
			}

			

			//console.log('sselected_dashboard1')

			//check not double
			if(!this.selected_dashboard.is_new) return

			//console.log('sselected_dashboard2')
			//make current dashboard selected
			if(this.selected_dashboard.uuid != this.dashboard[0].uuid) this.$store.commit('select_dashboard', this.dashboard[0].uuid);

			if(this.selected_dashboard.is_new) this.configs_open = true

			 
				this.selected_dashboard.dashboards_columns = this.selected_dashboard.dashboards_columns.sort((a, b) => { a.num-b.num } )

			//console.log('sselected_dashboard3')
			//prapare column values
			this.column_values = []
			for(let i in this.inputs_dict['dashboards_columns'].values)
			{
				let val = this.inputs_dict['dashboards_columns'].values[i]
				let col =  {status:[val], name:val.name}
				for(let j in this.selected_dashboard.dashboards_columns)
				{
					if (this.selected_dashboard.dashboards_columns[j].status[0].uuid == val.uuid)
					{
						col = this.selected_dashboard.dashboards_columns[j] 
						break
					}
				}
				if(col.uuid == undefined) {
					col.uuid = tools.uuidv4()
					col.num = 0
					col.table_name = 'dashboards_columns'
					col.status_uuid = val.uuid
					col.dashboards_uuid = this.selected_dashboard.uuid
				}
				
				this.column_values.push(col)
			}

			//console.log('column_values', this.column_values, this.selected_dashboard)
			for(let i in this.selected_dashboard.dashboards_columns)
			{
				this.selected_dashboard.dashboards_columns[i].name = this.selected_dashboard.dashboards_columns[i].status[0].name
			}

			//console.log('sselected_dashboard4')

			//get_issues()

		},
		get_issues: async function(query) ///added other things on mount
		{
			let options = {}
			if(query != undefined && query != '') options.query = query
			else return
			this.dashboards_issues = await rest.run_method('read_issues', options)
		},
		filtered_issues: function(status_uuid)
		{
			return this.dashboards_issues != undefined ? this.dashboards_issues.filter(issue => issue.status_uuid == status_uuid) : [];
		},
		
		update_search_query: function(val)
		{
			this.search_query = val
		},
		search()
		{
			query_parser.parse(this.search_query, this.fields)
		},
		get_field_by_name: function(issue, name)
		{
			//console.log('get_field_by_name', name)
	
			for(let i in issue.values) 
			{
				if(issue.values[i].label == name) return issue.values[i]		
			}
			return {label: '', value: ''}
			
		},
		dragstart_card: function(e, el)
		{
		//	console.log('dddddrrrr', el, e)
		
			this.card_draginfo = el
		},
		dragend_card: function()
		{
		
		//	console.log('dddddrrrr end')
			this.card_draginfo = {}
			this.status_draginfo = {}
		},
		move_card: function(el)
		{
			//console.log('moving0')
			if(this.card_draginfo.uuid == undefined) return
			//console.log('moving1')
			if(this.card_draginfo.status_uuid != el.uuid)
			{
				this.status_draginfo = el
		//		console.log('moving2')
			}
		},
		drop_card: function(el)
		{
			//console.log('moving0')
			if(this.card_draginfo.uuid == undefined) return
			if(this.status_draginfo.uuid == undefined) return
			//console.log('moving1')
			if(this.card_draginfo.status_uuid == el.uuid) return
			

			this.card_draginfo.status_uuid = el.uuid
			this.card_draginfo.status_name = el.name

			rest.run_method('update_issue', this.card_draginfo)
		//	console.log('drop')
			
		},
		get_input_by_id: function(id)
		{
			return{values:[]}
			/*for(let i in this.inputs)
			{
				if(this.inputs[i].id == id) return this.inputs[i]
			}*/
		},
		get_field_value(issue, field) //todo add values from dicts
		{
			
			for(let i in issue.values)
			{
			
				if(issue.values[i].field_uuid == field.uuid)
				{
					console.log('##' + issue.values[i].value + '##')
					return issue.values[i].value
				}
			}
		},
		get_card_color(issue)
		{
			let p = this.get_field_value(issue, {uuid:'247e7f58-5c9b-4a31-9c27-5d1d4c84669f'})

			if(p == 'Minor') return 'green'
			else if (p == 'Normal') return 'yellow'
			else if (p == 'Major') return 'orange'
			else if (p == 'Critical') return 'pink'
			else if (p == 'Show-stopper') return 'red'
			else return 'gray'
		},
		delete_dashboard()
		{
			this.$store.dispatch('delete_dashboard')
		}
	}

	const data = 
  {
	instance: 
      {
        name: '',
        dashboards_columns: [],
        
      },

	
	column_values: [],
	card_draginfo: {},
	status_draginfo: {},
    name: 'dashboard',
    label: 'Дашборд',
	search_query: '',
	dashboards_issues: [],
	colorFromScript: 'green',
	configs_open: false,
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

  mod.computed.dashboard_query_info = function(){
	  let dashboard_query_info = this.search_query
	  if(dashboard_query_info != '') dashboard_query_info += '; '
	  dashboard_query_info += 'Найдено ' + this.dashboards_issues.length 

	  if(this.selected_dashboard.estimate == undefined || this.selected_dashboard.estimate[0] == undefined ||
	  	 this.selected_dashboard.estimate[0].uuid == undefined) return dashboard_query_info

	  let sum = 0
	  for(let i in this.dashboards_issues)
	  {		  
		let val = Number(this.get_field_value(this.dashboards_issues[i], this.selected_dashboard.estimate[0]))		
		if(!isNaN(val))sum += val
	  }

	  dashboard_query_info += '; Сумма ' + sum

	return dashboard_query_info
  }

  mod.computed.dashboards_columns = function(){
	if(this.selected_dashboard == undefined || this.selected_dashboard.dashboards_columns == undefined) return []
	return this.selected_dashboard.dashboards_columns.map((v)=>v.status[0])
  }

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
		:disabled="!configs_open"
		>
		</StringInput>
		<StringInput class="dashboard-query-info"
		v-if="dashboard != undefined && selected_dashboard != undefined"
		label=''
		disabled="true"
		:value="dashboard_query_info"
		>
			
		</StringInput>
		
		
		<i class='bx bx-dots-vertical-rounded top-menu-icon-btn'
		@click="configs_open=!configs_open"
		></i>
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
	height: calc(100vh - $top-menu-height);
	//overflow:scroll;
  }


  .status-dashboard-collumn{
	width: calc((100vw - $main-menu-width) / v-bind('dashboards_columns.length'));
	height: 150px;
	
	margin: 2px;
    height: 100%;
	text-align: center;
  }

  .status-dashboard-collumn-dragging-to
  {
	  border-style: solid;
	  border-width: 1px;
	  border-radius: $border-radius;
  }

  .issue-dashboard-cards-container
  {
	  background: $disabled-bg-color;
	  border-radius: $border-radius;
	  border-color: $disabled-bg-color;
	  border-width: 5px;
	  border-style: solid;
	  overflow:scroll;
	  height: 100%;
  }

  .issue-dashboard-cards-container::-webkit-scrollbar{
    display:none;
  } 
  
  .issue-dashboard-card
  {
	display:flex;
	flex-direction: column;
	width: calc(100% );//190px;
	height: 190px;

	background: $panel-bg-color;
	border-radius: $border-radius;
	border-color: $border-color;
	border-width: 1px;
	border-style: groove;
	text-align: left;
	margin-bottom: 5px;
	cursor: grab;
	//pointer-events: ;

	//background: v-bind('colorFromScript');
  }

  .dragged-card
  {
	  border-style: dashed;
  }

  .when-dragged-card
  {
	  cursor: grabbing !important;
  }
  .issue-card-title
  {
	height: 80px;
	display: flex;
    flex-direction: column;
	
	overflow: hidden;
  }

  .issue-card-title a
  {
	color: rgb(128, 146, 157)
  }

  .issue-card-description
  {
	  height: 80px;
	  border-top-color: $table-row-color;
	  border-bottom-color: $table-row-color;
	  border-top-width: 2px;
	  border-top-style: solid;
	  border-bottom-width: 2px;
	  border-bottom-style: solid;
	  color: rgb(128, 146, 157);
	  overflow: hidden;
	  font-size: 10px
  }

  .issue-card-top
  {
	  width:100%;
	  height: 5px;
	  border-top-left-radius: $border-radius;
	  border-top-right-radius: $border-radius;
	  opacity: 0.4;
	  background: gray;
  }

  .issue-dashboard-card-footer
  {
	  width:100%;
	  height: 12px;
	  
  }

  .issue-dashboard-card-footer label
  {
	font-size: 10px;
  }

  .dashboard-name-input
  {
	      padding: 0px 20px 10px 0px;
  }

  *{
	  -webkit-user-drag: none;
	    user-drag: none; 
		user-select: none;
		-moz-user-select: none;
		-webkit-user-drag: none;
		-webkit-user-select: none;
		-ms-user-select: none;
  }

  #save-dashboard-config-btn
  {
	  padding-right: 10px;
  }
  #cancel-dashboard-config-btn
  {
	  padding-left: 10px;
  }

  .top-menu-icon-btn
  {
	height: 35px;
    font-size: 25px;
    border-radius: $border-radius;
    margin-left: 10px;
	color: white;
    background-color: #333;
    border-width: 1px;
    border-color: white;
    border-style: solid;
    border-style: outset;
    cursor: pointer;
	width: 35px;
    text-align: center;
	padding-top: 4px;
  }

  .delete-dashboard-btn
  {
	font-size: 23px;
	padding-top: 5px;
	color: #d27065
  }

  
  .dashboard-issue-search-input
  {
	padding: 10px 20px 10px 20px !important;
  }

  .dashboard-issue-search-input span {
    font-size: 20px;
    font-weight: 400;
    margin-top: 1px;
    /* background: red; */
    border-radius: 8px;
    border-color: grey;
    border-width: 2px;
    margin-left: 20px;
    margin-right: 10px;
}

.dashboard-query-info{
	padding: 0px 20px 10px 0px;
	width: 50vw;
}





</style>