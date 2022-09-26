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
		get_issue_by_uuid(uuid)
      {
          for(let i in this.boards_issues)
          {
            if(this.boards_issues[i].uuid == uuid) return  this.boards_issues[i]
          }
      },
      all_parents_expended(uuid)
      {
          if(uuid == null) return true

          let parent = this.get_row_by_uuid(uuid)
          if(!parent.expanded) return false

          return this.all_parents_expended(parent.parent_uuid)
      },
		init: async function()
		{
			this.configs_open = false
			/*{
				this.init_new()
				return;
			}*/
			this.boards_issues = []
			//check loaded
			if(this.selected_board == undefined || 
			this.issue_statuses == undefined || this.inputs_dict == undefined || this.inputs_dict.boards_columns == undefined) 
			{
				setTimeout(this.init, 200)
				return
			}

			//console.log('sselected_board1')

			//check not double
			if(!this.selected_board.is_new) return

			this.sprints = (await rest.run_method('read_sprints', {})).sort((a, b)=> new Date(a.start_date) - new Date(b.start_date) )
			let curr_date = new Date()
			for(let i in this.sprints)
			{
				console.log(this.sprints.name, curr_date, new Date(this.sprints[i].start_date), new Date(this.sprints[i].end_date))
				if(curr_date > new Date(this.sprints[i].start_date) &&  curr_date < new Date(this.sprints[i].end_date))
				{
					this.curr_sprint_num = Number(i)
					break
				}
			}

			//console.log('sselected_board2')
			//make current board selected
			if(this.selected_board.uuid != this.board[0].uuid) this.$store.commit('select_board', this.board[0].uuid);

			if(this.selected_board.is_new) this.configs_open = true

			 
			this.selected_board.boards_columns = this.selected_board.boards_columns.sort((a, b) => { return a.num-b.num } )
			console.log('this.selected_board.boards_columns',JSON.stringify(this.selected_board.boards_columns))

			//console.log('sselected_board3')
			//prapare column values
			this.column_values = []
			for(let i in this.inputs_dict['boards_columns'].values)
			{
				let val = this.inputs_dict['boards_columns'].values[i]
				let col =  {status:[val], name:val.name}
				for(let j in this.selected_board.boards_columns)
				{
					if (this.selected_board.boards_columns[j].status[0].uuid == val.uuid)
					{
						col = this.selected_board.boards_columns[j] 
						break
					}
				}
				if(col.uuid == undefined) {
					col.uuid = tools.uuidv4()
					col.num = 0
					col.table_name = 'boards_columns'
					col.status_uuid = val.uuid
					col.boards_uuid = this.selected_board.uuid
				}
				
				this.column_values.push(col)
			}

			//console.log('column_values', this.column_values, this.selected_board)
			for(let i in this.selected_board.boards_columns)
			{
				this.selected_board.boards_columns[i].name = this.selected_board.boards_columns[i].status[0].name
			}

			//console.log('sselected_board4')
			//get_issues()
		},
		get_root: function(issue)
		{
			if(issue == undefined) return {name:'Корневая задача не попала в выборку'}
			if(issue.parent_uuid == undefined || issue.parent_uuid == null) return issue
			let parent = this.get_issue_by_uuid(issue.parent_uuid)
			return this.get_root(parent)
		},
		sort_swimlanes: function(a, b)
		{
			if(a[0] == this.void_group_name) return 1
			if(b[0] == this.void_group_name) return -1
			if(a[0]<b[0]) return -1
			if(a[0]>b[0]) return 1
			return 0
		},
		make_swimlanes()
		{
			this.swimlanes = {}

			for(let i in this.boards_issues)
			{
				let x = 0
				if(this.selected_board.swimlanes_by_root)
				{
					if(this.boards_issues[i].parent_uuid == null) continue
					let root = this.get_root(this.boards_issues[i])
					x = this.get_field_by_name(root, 'Название').value
				}
				else if(!this.selected_board.no_swimlanes)
				{
					x = this.get_field_value(this.boards_issues[i], {uuid: this.selected_board.swimlanes_field_uuid})
				}

				
				if(x == '') x = this.void_group_name
				else if(x == null) x = this.void_group_name
				else if(x == undefined) x = this.void_group_name

				if(this.swimlanes[x] == undefined) this.swimlanes[x] = {name:x,issues:{},filtered_issues:{},count:0, sum:0}

				let status_uuid = this.boards_issues[i].status_uuid
				if(this.swimlanes[x].issues[status_uuid] == undefined) this.swimlanes[x].issues[status_uuid] = []

				this.swimlanes[x].issues[status_uuid].push(this.boards_issues[i])

				
				let is_is_columns = this.boards_columns.map((obj)=>obj.uuid).indexOf(this.boards_issues[i].status_uuid) > -1
				
				if(is_is_columns && 
				(!this.selected_board.use_sprint_filter || this.boards_issues[i].sprint_uuid == this.sprints[this.curr_sprint_num].uuid))
				{
					console.log(this.boards_issues[i].sprint_uuid == this.sprints[this.curr_sprint_num], this.boards_issues[i].sprint_uuid, this.sprints[this.curr_sprint_num])
					if(this.swimlanes[x].filtered_issues[status_uuid] == undefined) this.swimlanes[x].filtered_issues[status_uuid] = []

					this.swimlanes[x].filtered_issues[status_uuid].push(this.boards_issues[i])

					this.swimlanes[x].count++

					if(this.selected_board.estimate_uuid != undefined && this.selected_board.estimate_uuid != null)
					{
						let val = Number(this.get_field_value(this.boards_issues[i], {uuid: this.selected_board.estimate_uuid}))		
						if(!isNaN(val)) this.swimlanes[x].sum += val
					}
				}

				this.swimlanes = Object.fromEntries(Object.entries(this.swimlanes).sort(this.sort_swimlanes))
			}
			
			console.log('this.swimlanes', this.swimlanes)
		},
		get_issues: async function(query) ///added other things on mount
		{
			let options = {}
			if(query != undefined && query != '') options.query = query
			else return
			this.boards_issues = await rest.run_method('read_issues', options)

			this.make_swimlanes()
		},
		filtered_issues: function(status_uuid)
		{
			return this.boards_issues != undefined ? this.boards_issues.filter(issue => issue.status_uuid == status_uuid) : [];
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

			this.make_swimlanes()
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
					//console.log('##' + issue.values[i].value + '##')
					return issue.values[i].value
				}
			}
			
		},
		update_sprint_num(new_num)
		{
			console.log(this.curr_sprint_num, new_num, this.sprints.length, this.sprints)
			if(new_num < 0) return
			if(new_num > this.sprints.length-1) return

			this.curr_sprint_num = new_num

			this.make_swimlanes()

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
		delete_board()
		{
			this.$store.dispatch('delete_board')
		},
		swimlanes_updated(v)
		{
			if(v == null)
			{
				this.$store.commit('id_push_update_board' , {id: 'swimlanes_by_root', val:false})
				this.$store.commit('id_push_update_board' , {id: 'no_swimlanes', val:true})
				this.$store.commit('id_push_update_board' , {id: 'swimlanes_field_uuid', val:null})
			}
			else if(v.toString() == '0')
			{
				this.$store.commit('id_push_update_board' , {id: 'swimlanes_by_root', val:true})
				this.$store.commit('id_push_update_board' , {id: 'no_swimlanes', val:false})
				this.$store.commit('id_push_update_board' , {id: 'swimlanes_field_uuid', val:null})
			}
			else
			{
				this.$store.commit('id_push_update_board' , {id: 'swimlanes_by_root', val:false})
				this.$store.commit('id_push_update_board' , {id: 'no_swimlanes', val:false})
				this.$store.commit('id_push_update_board' , {id: 'swimlanes_field_uuid', val:v})
			}
			
			this.make_swimlanes()
		}
	}

	const data = 
  {
	instance: 
      {
        name: '',
        boards_columns: [],
        
      },
	void_group_name: 'Без группы',
	swimlanes: {},
	sprints: [],
	curr_sprint_num: 0,
	column_values: [],
	card_draginfo: {},
	status_draginfo: {},
    name: 'board',
    label: 'Доска',
	search_query: '',
	boards_issues: [],
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
			id: 'boards_columns',
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

  mod.computed.board_query_info = function(){
	  let board_query_info = this.search_query
	  


	return board_query_info
  }

  mod.computed.boards_columns = function(){
	if(this.selected_board == undefined || this.selected_board.boards_columns == undefined) return []
	return this.selected_board.boards_columns.map((v)=>v.status[0])
  }

  mod.computed.swimlanes_values = function(){
	if(this.selected_board == undefined || this.selected_board.boards_columns == undefined || this.fields == undefined) return []
	let values = [{uuid: '0', name: 'Корневая задача'}]
	this.fields = this.fields.sort((a,b)=>a.name<b.name?-1:(a.name>b.name?1:0))
	for(let i in this.fields)
	{
		values.push(this.fields[i])
	}
	return values
  }

  mod.computed.swimlanes_value = function()
  {
	if(this.selected_board == undefined) return null
	if(this.selected_board.no_swimlanes) return null
	if(this.selected_board.swimlanes_by_root) return '0'
	else return this.selected_board.swimlanes_field_uuid
  }


  mod.computed.total_count = function()
  {
	  let count = 0
  	for(let i in this.swimlanes)
	  {
		  count += this.swimlanes[i].count
	  }
	  return count
  }

  mod.computed.total_sum = function()
  {
	  let sum = 0
  	for(let i in this.swimlanes)
	  {
		sum += this.swimlanes[i].sum
	  }
	  return sum
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



<template ref='board' >
<div @mouseup="dragend_card()">
	
    <div class='panel topbar'>
		<div style="display: flex ; flex-direction:row; flex-grow: 1; max-height: calc(100% - 60px); ">
		<StringInput 
		v-if="board != undefined && selected_board != undefined"
		label=''
		id="name"
		key="board_name"
		:parent_name="'board'"
		class="board-name-input"
		:value="get_json_val(selected_board, 'name')"
		:disabled="!configs_open"
		>
		</StringInput>
		

		<div 
		v-if="board != undefined && selected_board != undefined && selected_board.use_sprint_filter && sprints.length > 0"
		class="board-sprint-filter">
			<span class='board-sprint-filter-btn'
			@click="update_sprint_num(curr_sprint_num-1)"
			>❮</span>
			<StringInput class="board-sprint-filter-string"
			
			label=''
			disabled="true"
			:value="sprints[curr_sprint_num].name"
			>
			</StringInput>
			<span class='board-sprint-filter-btn'
			@click="update_sprint_num(curr_sprint_num+1)"
			>❯</span>			
		</div>

		<StringInput class="board-query-info"
		v-if="board != undefined && selected_board != undefined"
		label=''
		disabled="true"
		:value="board_query_info"
		>
			
		</StringInput>
		
		
		<i class='bx bx-dots-vertical-rounded top-menu-icon-btn'
		@click="configs_open=!configs_open"
		></i>
		<i class='bx bx-trash top-menu-icon-btn delete-board-btn'
		@click="delete_board()"
		>	
		</i>
		
	
		</div>
	</div>

	

    <div id=board_down_panel class="panel" >

		<div class="swimlane-total">
			<span>Всего</span>
			<span>{{'кол-во: ' + total_count + '/' + boards_issues.length}}</span>
			<span>{{'сумма: ' + total_sum}}</span>
		</div>

		<div
		class="swimlane"
		v-for="(swimlane, sw_index) in swimlanes"
		:key="sw_index"
		>
			<div class="swimlane-head"
			v-if="!selected_board.no_swimlanes && swimlane.count > 0" >
				<span>{{swimlane.name}}</span>
				<span>{{'кол-во: ' + swimlane.count}}</span>
				<span>{{'сумма: ' + swimlane.sum}}</span>
			</div>

			<div class="swimlane-body"
			v-if="swimlane.count > 0"
			>
		
				<div 
				v-for="(status, s_index) in boards_columns"
				:key="s_index"
				@mousemove="move_card(status)"
				@mouseup="drop_card(status)"
				@mouseleave="status_draginfo={}"
				class="status-board-collumn"
				:class="{'status-board-collumn-dragging-to':  this.status_draginfo.uuid == status.uuid, 'when-dragged-card': card_draginfo.uuid != undefined}"
				>
					
					<label>{{status.name}}</label>
					<div class="issue-board-cards-container"
					
					>
					<div
						v-for="(issue, i_index) in (swimlane.filtered_issues[status.uuid] != undefined ? swimlane.filtered_issues[status.uuid] : [])"
						:key="i_index"
						:class="{ 'dragged-card': issue.uuid ==  card_draginfo.uuid, 'when-dragged-card': card_draginfo.uuid != undefined}"
						
						@mousedown="dragstart_card($event, issue)"
						class="issue-board-card">
						<div class="issue-card-top"
						:style="[  {backgroundColor: get_card_color(issue)} ]"
						></div>
						<div class="issue-card-title">
						<a 
						:href="'/issue/' + issue.project_short_name + '-' + issue.num">{{issue.project_short_name}}-{{issue.num}} {{issue.type_name}}</a>
						
						<label>{{get_field_by_name(issue, 'Название').value}}</label>
						</div>
						<label class="issue-card-description">{{get_field_by_name(issue, 'Описание').value.substring(0, 100)}}</label>
						<div class="issue-board-card-footer">
							<div><label>{{get_json_val(issue, 'author_uuid')}}</label></div>
						</div>
						
					</div>
					</div>
				</div>
			</div>
		</div>

		<div class="modal-bg" v-show="configs_open">
		<div
			class="panel modal board-config"
		>  

		<IssuesSearchInput
		v-if="board != undefined"
		label="Запрос"
		class='board-issue-search-input'
		:parent_name="'board'"
		@update_parent_from_input="update_search_query"
		:fields="fields"
		@search_issues="get_issues"
		:projects="projects"
		:issue_statuses="issue_statuses"
		:issue_types="issue_types"
		:users="users"
		:disabled="!configs_open"
		id='query'
		:parent_query="get_json_val(selected_board, 'query')"

		>

		</IssuesSearchInput>
		
		<SelectInput 
			v-if="inputs_dict != undefined && selected_board != undefined"
			label='Статусы'
			id='boards_columns'
			
			:parent_name="'board'"
			clearable="false"
			:value="get_json_val(selected_board, 'boards_columns')"
			:values="column_values"
			:parameters="{ multiple: true}"
			@update_parent_from_input="make_swimlanes"
		></SelectInput>

		<SelectInput 
			v-if="inputs_dict != undefined"
			label='Группировать по'
			clearable="true"
			:value="swimlanes_value"
			:values="swimlanes_values"
			:parameters="{ reduce: obj => obj.uuid}"
			@update_parent_from_input="swimlanes_updated"
		></SelectInput>

		<SelectInput 
			v-if="inputs_dict != undefined"
			label='Суммируемое поле'
			id='estimate_uuid'
			:parent_name="'board'"
			clearable="false"
			:value="get_json_val(selected_board, 'estimate_uuid')"
			:values="inputs_dict['estimate_uuid'].values.filter((v)=>v.type[0].code == 'Numeric')" 
			:parameters="inputs_dict['estimate_uuid']"
			@update_parent_from_input="make_swimlanes"
		></SelectInput>

		<SelectInput 
			label='Поля внизу карточки (функция в разработке)'
			id='fields'
			disabled="true"
			:parent_name="'board'"
			clearable="false"
			dictionary= 'fields'
			:values="[]"
		></SelectInput>

		<BooleanInput 
			label='Использовать фильтр по спринтам'
			id='use_sprint_filter'
			:value="get_json_val(selected_board, 'use_sprint_filter')"
			:parent_name="'board'"
			@update_parent_from_input="make_swimlanes"
		></BooleanInput>

		<SelectInput 
			label='Поле цвета (функция в разработке)'
			id='fields'
			disabled="true"
			:parent_name="'board'"
			clearable="false"
			dictionary= 'fields'
			:values="[]"
			multiple: false
		></SelectInput>

	
		<div class="btn-container">
		<KButton 
		name="Сохранить"
		id="save-board-config-btn"
		:func="'save_board'"
		@click="configs_open=false"
		/>
		<KButton 
		name="Отменить"
		id="cancel-board-config-btn"
		@click="configs_open=false"
		/>
		</div>

		</div>
  </div>
		  
	</div>

	

	</div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

	#boards_table_panel, #boards_card {
    height: calc(100vh - $top-menu-height);    
	}

  #boards_table_panel {
    display: flex;
    width: calc(100%);
  }

  #save_boards_btn, #delete_boards_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }

  #save_boards_btn input, #delete_boards_btn input{
  	width: 100%
  }

  #board_down_panel {
    display: flex;
	flex-direction: column;
	height: calc(100vh - $top-menu-height);

	overflow:scroll;
  }

  #board_down_panel::-webkit-scrollbar{
    display:none;
  }


  .status-board-collumn{
	width: calc((100vw - $main-menu-width) / v-bind('boards_columns.length'));
	height: 150px;
	
	margin: 2px;
    height: 100%;
	text-align: center;
  }

  .status-board-collumn-dragging-to
  {
	  border-style: solid;
	  border-width: 1px;
	  border-radius: $border-radius;
  }

  .issue-board-cards-container
  {
	  background: $disabled-bg-color;
	  border-radius: $border-radius;
	  border-color: $disabled-bg-color;
	  border-width: 5px;
	  border-style: solid;
	  overflow:scroll;
	  height: 100%;
  }

  .issue-board-cards-container::-webkit-scrollbar{
    display:none;
  } 
  
  .issue-board-card
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

  .issue-board-card-footer
  {
	  width:100%;
	  height: 12px;
	  
  }

  .issue-board-card-footer label
  {
	font-size: 10px;
  }

  .board-name-input
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

  #save-board-config-btn
  {
	  padding-right: 10px;
  }
  #cancel-board-config-btn
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

  .delete-board-btn
  {
	font-size: 23px;
	padding-top: 5px;
	color: #d27065
  }

  
  .board-issue-search-input
  {
	padding: 10px 20px 10px 20px !important;
  }

  .board-issue-search-input span {
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

.board-query-info{
	padding: 0px 20px 10px 0px;
	width: 500px;
	
}

.board-sprint-filter{
	padding: 0px 20px 10px 0px;
	display: flex;
	
}

.board-sprint-filter-string{
	
	width: 300px;
	padding: 0px;
}

.board-sprint-filter-btn{
	cursor: pointer;
	width: $font-size;
	height: $input-height;
	border-radius: $border-radius;
	margin: 0px !important;
	padding-top: 3px;
}

.board-sprint-filter-btn:hover{
	background: $table-row-color-selected;
	
}

.board-sprint-filter-string input{
	margin: 0px !important;
}

.swimlane
{
	width: 100%;
    display: flex;
	flex-direction: column;
}



.swimlane-head, .swimlane-total
{
	width: 100%;
    display: flex;
	border-radius: $border-radius;
	background: $disabled-bg-color;
	margin: 4px;
}

.swimlane-total
{
	height: 2*$input-height;
}

.swimlane-head
{
	height: $input-height;
	margin-top: 60px;
}

.swimlane-head span, .swimlane-total span
{
	padding: 0px 10px 10px 10px;
    margin: 5px;
	font-size: 14px;
}

.swimlane-total span
{
	font-size: 15px;
}


.swimlane-body
{
	width: 100%;
    display: flex;
}




</style>