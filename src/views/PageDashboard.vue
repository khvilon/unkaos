<script>
	
	import page_helper from '../page_helper.ts'


	import IssuesTable from '../gadgets/IssuesTable.vue'
	import IssuesTableConfig from '../gadgets/IssuesTableConfig.vue'

	import d from '../dict.ts'
	import rest from '../rest';
	import tools from '../tools.ts'
import { computed } from '@vue/runtime-core';

	

	let methods = {

		
		init: async function()
		{

			console.log('dashboard mounted', this.dashboard)

			if(this.selected_dashboard == undefined || this.dashboard == undefined || this.dashboard[0] != undefined) 
			{
				setTimeout(this.init, 5000)
				return
			}

			console.log('sselected_dashboard1', this.selected_dashboard, this.dashboard[0])

			this.uv = (this.$refs.dashboard_down_panel.clientHeight - 20) / this.v_units;
			this.uh = (this.$refs.dashboard_down_panel.clientWidth - 20) / this.h_units;

			console.log('this.uv', this.uv)

			

			//check not double
		//	if(!this.selected_dashboard.is_new) return

			//if(this.selected_dashboard.uuid != this.dashboard[0].uuid) this.$store.commit('select_dashboard', this.dashboard[0].uuid);

			console.log(this.uuid)

			
		},
		get_panel_width: function()
		{
			return 100
		},
		start_resize: function(e, gadget, border)
		{
			console.log(e)
			this.resize_data = 
			{
				border: border,
				gadget: gadget,
				x: e.clientX,
				y: e.clientY
			}

		},
		end_resize: async function(e)
		{
			if(!this.resize_data) return

			let diff
			if(this.resize_data.border == 'right' || this.resize_data.border == 'left')
			{
				diff = e.clientX - this.resize_data.x
				diff = diff / this.uh
			}	
			else{
				diff = e.clientY - this.resize_data.y
				diff = diff / this.uv
			}

			if(diff > 0) diff = Math.ceil(diff)
			else diff = Math.floor(diff)

			console.log('resize0', diff)

			if(this.resize_data.border == 'right')
			{
				this.resize_data.gadget.width += diff
			} 
			else if(this.resize_data.border == 'bottom')
			{
				this.resize_data.gadget.height += diff
			}
			else if(this.resize_data.border == 'left') 
			{
				this.resize_data.gadget.x0 += diff
				this.resize_data.gadget.width -= diff
			}
			else if(this.resize_data.border == 'top') 
			{
				this.resize_data.gadget.y0 += diff
				this.resize_data.gadget.height -= diff
			}

			console.log('resize1', this.resize_data.border)

			await (await rest.run_method('update_gadgets', this.resize_data.gadget))
			
			this.resize_data = null


			console.log(e, diff)
		},
		stop_resize: function()
		{
			this.resize_data = null
		},
		show_resize: function()
		{
			if(!this.resize_data) return
		}
		
	}

	const data = 
  {
	name: 'dashboard',
	label: 'Дашборд',

	resize_data: null,

	instance: 
      {
        name: ''
        
      },

	v_units: 8,
	h_units: 8,
	uv: 0,
	uh: 0,
	virtual_border_width: 6,
    collumns:[
		{
	        name: '№',
	        id: ["project_short_name","'-'", "num"],
			search: true,

	    },
	  	{
	    	name: d.get('Название'),
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
            name: d.get('Автор'),
            id: "values.Автор",
			type:'user'
        },
	    {
	        name: d.get('Создана'),
	        id: "created_at",
	        type: 'date'
	    },
	    {
	        name: d.get('Изменена'),
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

	mod.computed.total_height = function()
	{
		this.uv
		if(this.dashboard == undefined || this.dashboard[0] == undefined) return 0

		let max_height = 0
		for(let i in this.dashboard[0].gadgets)
		{
			let end = Number(this.dashboard[0].gadgets[i].y0) + Number(this.dashboard[0].gadgets[i].height)
			max_height = Math.max(max_height, end)

			this.dashboard[0].gadgets[i].config_open = false;
		}

		console.log('aaa1', (max_height + this.v_units/2) * this.uv)
		return (max_height + this.v_units/2) * this.uv
	}
   
	mod.components =
	{
		IssuesTable,
		IssuesTableConfig
	}
  
  

	export default mod
	
</script>



<template ref='dashboard' >
<div>
	
    <div class='panel topbar'>
		<div style="display: flex ; flex-direction:row; flex-grow: 1; max-height: calc(100% - 60px); ">
		<StringInput 
		v-if="dashboard != undefined && selected_dashboard != undefined"
		:label="''"
	
		key="dashboard_name"
		:parent_name="'dashboard'"
		class="dashboard-name-input"
		:value="get_json_val(dashboard[0], 'name')"
		>
		</StringInput>
		
		
		<i class='bx bx-trash top-menu-icon-btn delete-dashboard-btn'
		@click="delete_dashboard()"
		>	
		</i>
		
	
		</div>
	</div>

	



    <div id=dashboard_down_panel ref="dashboard_down_panel" class="panel" >
		<div class="gadgets" ref="gadgets"
		@mouseup="end_resize"
		@mouseleave="stop_resize"
		@mousemove="show_resize"
		>
			<div 
			v-for="(gadget, index) in ((dashboard == undefined || dashboard[0] == undefined) ? [] : dashboard[0].gadgets)"
			v-bind:style="{ width:  (Number(uh) * Number(gadget.width)) + 'px', height:   (Number(uv) * Number(gadget.height)) + 'px',
			'margin-left':  (Number(uh) * Number(gadget.x0)) + 'px', 'margin-top':  (Number(uv) * Number(gadget.y0)) + 'px'}"
			class="gadget"
			>
				<div class="gadget-head">
					<span>{{gadget.name}}</span>
					<i class='bx bx-dots-horizontal-rounded gadget-btn'
					@click="gadget.config_open=!gadget.config_open"
					></i>
				</div>
				<div class="gadget-body">
					<component v-show="!gadget.config_open" v-bind:is="gadget.type_code"></component>

					<component v-show="gadget.config_open" v-bind:is="gadget.type_code + 'Config'"
					:name="gadget.name"></component>

				</div>
				<div class="gadget-borders">
					<div class="gadget-border gadget-top"  
					v-bind:style="{ 'width':  (Number(uh) * Number(gadget.width)) + 'px' }"
					@mousedown="start_resize($event, gadget, 'top')"
					></div>
					<div class="gadget-border gadget-right" 
					v-bind:style="{ 'height':  (Number(uv) * Number(gadget.height) - virtual_border_width) + 'px',
					'margin-left': (Number(uh) * Number(gadget.width)  - (virtual_border_width / 4)) + 'px'}"
					@mousedown="start_resize($event, gadget, 'right')"
					>
					</div>
					<div class="gadget-border gadget-bottom" 
					v-bind:style="{ 'width':  (Number(uh) * Number(gadget.width)) + 'px' }"
					@mousedown="start_resize($event, gadget, 'bottom')"
					></div>
					<div 
					class="gadget-border gadget-left" v-bind:style="{ 'height':  (Number(uv) * Number(gadget.height)) + 'px',
						'margin-top':  '-' + (Number(uv) * Number(gadget.height)) + 'px' }"
						@mousedown="start_resize($event, gadget, 'left')"
					></div>
				</div>
			</div>
			<div class="void-gadgets-bottom"
					>
					<div
					v-bind:style="{ 'height':  (total_height) + 'px'}
					"
					></div>
			</div>
		</div>
	</div>
</div>
</template>




<style lang="scss">

  @import '../css/global.scss';

  $gadget-padding: 10px;
  $vu: calc((100vh - $top-menu-height - 2 * $gadget-padding) / v-bind(v_units));
  $hu: calc((100vw - $main-menu-width - 2 * $gadget-padding) / v-bind(h_units));

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

	background: var(--input-bg-color);

	overflow:scroll;
  }

  #dashboard_down_panel::-webkit-scrollbar{
    display:none;
  }

  .dashboard-name-input{
	padding: 0px 20px 10px 0px;
  }

  .gadgets{
	padding: 10px 10px 10px 10px;
	width: 100%;
	height:	calc(v-bind(total_height) * 1px);
	min-height:	calc(v-bind(total_height) * 1px);
	position: relative;
  }
  .gadget{
	border-style: var(--border-style);
	border-width: var(--border-width);
	border-color: var(--border-color);
	border-radius: var(--border-radius);
	//resize: both;
	display: flex;
	flex-direction: column;
	position: absolute;
  }

  .gadget-head{
	height: $input-height;
	background-color: var(--table-row-color);
	width: 100%;
	position: relative;
	display: flex;
	align-items: center;
  }

  .gadget-head span{
  padding-left: 10px;
  }

  .gadget-body{
	height: 100%;
	width: 100%;
	position: relative;
	overflow: scroll;
  }


  .gadget-body::-webkit-scrollbar{
    display:none;
  }

  .gadget:active {
  width: 0;
  height: 0;
}

.gadget-borders{
	position:absolute;
	margin-top: calc(-1 * v-bind(virtual_border_width) / 2 * 1px);
	margin-left: calc(-1 * v-bind(virtual_border_width) / 2 * 1px);
	width: 0px;
    height: 0px;
}

.gadget-border{
	background: rgba(0, 128, 0, 0);
}

	.gadget-left, .gadget-right{
		width: calc(v-bind(virtual_border_width) * 1px);
		cursor: ew-resize;
	}

	.gadget-top, .gadget-bottom{
		height: calc(v-bind(virtual_border_width) * 1px);
		cursor:ns-resize;
	}

	.void-gadgets-bottom{
		position: absolute;
		width: 1px;
		
	}
	.void-gadgets-bottom div{
		position: relative;
		width: 1px;
	}


	.gadget-btn{
		height: 28px;
		width: 28px;
		font-size: 15px;
		border-radius: var(--border-radius);
		margin-left: 10px;
		color: var(--text-color);
		background-color: var(--button-color);
		border-width: 1px;
		border-color: var(--border-color);
		border-style: solid;
		border-style: outset;
		cursor: pointer;
		text-align: center;
    	padding: 6px;
		
		text-align: center;
		//padding-top: 4px;
	}



</style>