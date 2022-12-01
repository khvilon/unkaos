<script>
	import page_helper from '../page_helper.ts'
	import query_parser from '../query_parser.ts'

	import d from '../dict.ts'
	import rest from '../rest';
	import tools from '../tools.ts'

	let methods = {
		get_favourite_uuid() {
			
			if(this.favourites == undefined || this.selected_board == undefined || this.selected_board.is_new) 
			{
				setTimeout(this.get_favourite_uuid, 200)
				return
			}


			for(let i = 0; i < this.favourites.length; i++)
			{
	
				if('/board/' + this.selected_board.uuid == this.favourites[i].link) 
				{

					this.favourite_uuid = this.favourites[i].uuid
			
					return 
				}
			}
		},
		

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
				setTimeout(this.init, 50)
				return
			}

			this.title



			for(let i in this.issue_statuses)
			{
				this.statuses_ends_dict[this.issue_statuses[i].uuid] = this.issue_statuses[i].is_end
			}
			

			//console.log('sselected_board1')

			this.get_favourite_uuid()

			//check not double
			if(!this.selected_board.is_new) return

			this.sprints = (await rest.run_method('read_sprints', {})).sort((a, b)=> new Date(a.start_date) - new Date(b.start_date) )
			let curr_date = new Date()
			this.curr_sprint_num = 0
			for(let i in this.sprints)
			{
				//console.log(this.sprints.name, curr_date, new Date(this.sprints[i].start_date), new Date(this.sprints[i].end_date))
				if(curr_date > new Date(this.sprints[i].start_date) &&  curr_date < new Date(this.sprints[i].end_date))
				{
					this.curr_sprint_num = Number(i)
					break
				}
			}
			if(this.curr_sprint_num == 0)
			{
				for(let i in this.sprints)
				{
					if(curr_date < new Date(this.sprints[i].end_date))
					{
						this.curr_sprint_num = Number(i)
						break
					}
				}
			}

			//console.log('sselected_board2')
			//make current board selected
			if(this.selected_board.uuid != this.board[0].uuid) this.$store.commit('select_board', this.board[0].uuid);

			if(this.selected_board.is_new) this.configs_open = true

			 
			this.selected_board.boards_columns = this.selected_board.boards_columns.sort((a, b) => { return a.num-b.num } )
			//console.log('this.selected_board.boards_columns',JSON.stringify(this.selected_board.boards_columns))

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
			if(issue.parent_uuid == undefined || issue.parent_uuid == null) return issue
			let parent = this.get_issue_by_uuid(issue.parent_uuid)
			if(parent == undefined) return issue
			return this.get_root(parent)
		},
		compare_swimlanes_to_sort: function(a, b)
		{
			if(a[0] == this.void_group_name) return 1
			if(b[0] == this.void_group_name) return -1
			if(a[1].position == undefined) a[1].position = -1
			if(a[1].position == undefined) b[1].position = -1
			if(a[1].position<b[1].position) return -1
			if(a[1].position>b[1].position) return 1
			if(a[1].name<b[1].name) return -1
			if(a[1].name>b[1].name) return 1
			return 0
		},
		sort_swimlanes()
		{
			let swimlanes_arr = Object.entries(this.swimlanes)

			console.log('swimlanes_arr', swimlanes_arr)

			swimlanes_arr = swimlanes_arr.sort(this.compare_swimlanes_to_sort)

			this.swimlanes = Object.fromEntries(swimlanes_arr)
		},	
		change_swimlane_position(swimlane, new_position)
		{	
			
			let old_position = swimlane.position
			
			if(new_position == old_position) return
			for(let i in this.swimlanes)
			{
				
				
				if(this.swimlanes[i].position < old_position && this.swimlanes[i].position < new_position) continue

				

				if(this.swimlanes[i].position > old_position && this.swimlanes[i].position > new_position) continue

			

				if(this.swimlanes[i].position > old_position && this.swimlanes[i].position < new_position) this.swimlanes[i].position--
				else if(this.swimlanes[i].position < old_position && this.swimlanes[i].position > new_position) this.swimlanes[i].position++
				else if(this.swimlanes[i].position == old_position) this.swimlanes[i].position = new_position

				else if(this.swimlanes[i].position == new_position) 
				{
					if(old_position < new_position) this.swimlanes[i].position--
					else this.swimlanes[i].position++
				} 

			}

			this.sort_swimlanes()

			this.make_conf()


			let conf_str = JSON.stringify(this.conf)

			this.$store.commit('id_push_update_board' , {id: 'config', val:conf_str})
			this.$store.dispatch('save_board');
		},
		make_conf()
		{
			this.conf.swimlanes = {}
			for(let i in this.swimlanes)
			{
				this.conf.swimlanes[i] = {position: this.swimlanes[i].position }
			}
		},
		move_swimlane(e, swimlane_to)
		{
		
			if(!this.moving_swimlane) return

			this.change_swimlane_position(this.moving_swimlane, swimlane_to.position)

		},
		swimlane_start_dragging(e, swimlane)
		{
	

			e.dataTransfer.dropEffect = 'move'
      		e.dataTransfer.effectAllowed = 'move'



			swimlane.is_dragged = true; 
			
			this.moving_swimlane = swimlane

		},
		swimlane_stop_dragging(e, swimlane)
		{
			swimlane.is_dragged = false; 
			
			this.moving_swimlane = null
		},
		make_swimlanes()
		{
			this.swimlanes = {}

			if(this.selected_board.config != undefined && this.selected_board.config != null && this.selected_board.config != '')
			{
				this.conf = JSON.parse(this.selected_board.config)
			}

			let parent_types_uuids = {}
			if(this.selected_board.swimlanes_by_root)
			{
				for(let i in this.boards_issues)
				{
					let type_uuid = this.boards_issues[i].type_uuid
					if(parent_types_uuids[type_uuid] == undefined) parent_types_uuids[type_uuid] = true
					let root = this.get_root(this.boards_issues[i])


					
					if(this.boards_issues[i].type_uuid != root.type_uuid) 
					{
						parent_types_uuids[type_uuid] = false
					}
				}
			}

			//console.log('parent_types_uuids',parent_types_uuids)

			for(let i in this.boards_issues)
			{
				let x = 0
				let link
				let root_num
				let root_name
				let is_resolved = false
				if(this.selected_board.swimlanes_by_root)
				{
					let type_uuid = this.boards_issues[i].type_uuid
					//if(parent_types_uuids[type_uuid]) continue
					
					
					let root = this.get_root(this.boards_issues[i])
					if(parent_types_uuids[root.type_uuid]) x = root.uuid//this.get_field_by_name(root, 'Название').value
					root_name = this.get_field_by_name(root, 'Название').value
					if(root.num!=undefined)
					{
						root_num = root.project_short_name + '-' + root.num
						link = '/issue/' + root_num	

						is_resolved = this.statuses_ends_dict[root.status_uuid]
					}
					
				}
				else if(!this.selected_board.no_swimlanes)
				{
					x = this.get_field_value(this.boards_issues[i], {uuid: this.selected_board.swimlanes_field_uuid}, true)
					root_name = x
				}

				
				if(x == '') { x = this.void_group_name; root_name = x}
				else if(x == null) { x = this.void_group_name; root_name = x}
				else if(x == undefined) { x = this.void_group_name; root_name = x}

				if(this.swimlanes[x] == undefined) this.swimlanes[x] = {id:x, name:root_name,issues:{},filtered_issues:{},count:0, sum:0}
				
				let  stored_exp = localStorage[this.selected_board.uuid+'#'+x]
				if(stored_exp == undefined || stored_exp == 'false') stored_exp = false
				else stored_exp = true
				this.swimlanes[x].expanded = stored_exp


				if(link!=undefined)
				{
					this.swimlanes[x].link = link
					this.swimlanes[x].num = root_num
					this.swimlanes[x].is_resolved = is_resolved
				} 

				if(this.conf != undefined && this.conf.swimlanes != undefined && this.conf.swimlanes[x] != undefined) {
					
					this.swimlanes[x].position = this.conf.swimlanes[x].position
					//console.log('swpos000000sssss--------------------2222222', x, this.swimlanes[x].position)
					//console.log('swpos000000sssss--------------------3333333', this.conf.swimlanes[x])
				}
				

				let status_uuid = this.boards_issues[i].status_uuid
				if(this.swimlanes[x].issues[status_uuid] == undefined) this.swimlanes[x].issues[status_uuid] = []

				if(x == this.get_field_by_name(this.boards_issues[i], 'Название').value  || x == this.boards_issues[i].uuid) continue

				this.swimlanes[x].issues[status_uuid].push(this.boards_issues[i])

				
				let is_is_columns = this.boards_columns.map((obj)=>obj.uuid).indexOf(this.boards_issues[i].status_uuid) > -1
				
				if(is_is_columns && 
				(!this.selected_board.use_sprint_filter || this.boards_issues[i].sprint_uuid == this.sprints[this.curr_sprint_num].uuid))
				{
					//console.log(this.boards_issues[i].sprint_uuid == this.sprints[this.curr_sprint_num], this.boards_issues[i].sprint_uuid, this.sprints[this.curr_sprint_num])
					if(this.swimlanes[x].filtered_issues[status_uuid] == undefined) this.swimlanes[x].filtered_issues[status_uuid] = []

					this.swimlanes[x].filtered_issues[status_uuid].push(this.boards_issues[i])

					this.swimlanes[x].count++

					if(this.selected_board.estimate_uuid != undefined && this.selected_board.estimate_uuid != null)
					{
						let val = Number(this.get_field_value(this.boards_issues[i], {uuid: this.selected_board.estimate_uuid}))		
						if(!isNaN(val)) this.swimlanes[x].sum += val
					}
				}

				

				

				

				
			}


			if(tools.obj_length(this.swimlanes) == 0)return
			


			this.sort_swimlanes()

			
			let position = 0
			for(let i in this.swimlanes)
			{
				this.swimlanes[i].position = position
				position++
				//this.swimlanes[swimlanes_arr[i].name].position = i
				
			}

			

			//load saved swimlanes order


			
			//this.make_conf()
			//let conf_str = JSON.stringify(this.conf)

			//this.$store.commit('id_push_update_board' , {id: 'config', val:conf_str})
			//rest.run_method('update_board', this.selected_board)
			//this.$store.dispatch('save_board');
		
			//console.log('this.swimlanes', this.swimlanes)
		},
		get_issues: async function(query) ///added other things on mount
		{
			let options = {}
			if(query != undefined && query != '') 
			{
				options.query = query
				this.encoded_query = query
			}
			else if(this.encoded_query != undefined && this.encoded_query != '') 
			{
				options.query = this.encoded_query
			}
			else return

			if(this.selected_board.use_sprint_filter)
			{
				options.query = decodeURIComponent(atob( options.query))
				options.query = '(' + options.query + ") and attr#sprint_uuid#='" + this.sprints[this.curr_sprint_num].uuid + "'"

				console.log('options.query', options.query)
				options.query = btoa(encodeURIComponent(options.query))  
			}
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
		
		get_field_value(issue, field, deep) //todo add values from dicts
		{
			for(let i in issue.values)
			{
				if(issue.values[i].field_uuid == field.uuid)
				{
					if(!deep) return issue.values[i].value

					if(issue.values[i].type == 'User')
					{
						for(let j in this.users)
						{
							if(this.users[j].uuid == issue.values[i].value) return this.users[j].name
						}
						console.log('USERRRR', issue.values[i])
					}
					console.log('USERRRR field', field, issue.values[i])
					return issue.values[i].value
				}
			}
		},
		update_sprint_num(new_num)
		{
			
			if(new_num < 0) return
			if(new_num > this.sprints.length-1) return

			this.curr_sprint_num = new_num

			this.get_issues()
			//this.make_swimlanes()

		},
		get_dict_value(val, type)
		{
			
			if(type == 'User')
			{
				if(val == null) return 'Не назначен'
				for(let i in this.users)
				{
					//console.log(this.users[i], val)
					if(this.users[i].uuid == val) return this.users[i].name
				}
			}
			return val
		},
		get_card_color(issue)
		{
			let p = this.get_field_value(issue, {uuid:'b6ddb33f-eea9-40c0-b1c2-d9ab983026a1'})

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
		swimlane_expanded_toogle(swimlane)
		{
			swimlane.expanded = !swimlane.expanded
			localStorage[this.selected_board.uuid+'#'+swimlane.id] = swimlane.expanded
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
		},
		async add_to_favourites()
		{
			this.favourite_uuid = tools.uuidv4()
			console.log('this.favourite_uuid0', this.favourite_uuid)
			let favourite = 
			{
				uuid: this.favourite_uuid,
				type_uuid: this.favourite_board_type_uuid,
				name: this.selected_board.name,
				link: '/board/' + this.selected_board.uuid
			}

			await rest.run_method('create_favourites', favourite)
		},
		async delete_from_favourites()
		{
			await rest.run_method('delete_favourites', {uuid: this.favourite_uuid})
			this.favourite_uuid = null
		}
	}

	const data = 
  {
	instance: 
      {
        name: '',
        boards_columns: [],
        
      },
	  statuses_ends_dict:{},
	conf: {},
	favourite_board_type_uuid: '1b6832db-7d94-4423-80f2-10ed989af9f8',
	favorite_uuid: undefined,
	void_group_name: 'Без группы',
	swimlanes: {},
	moving_swimlane: null,
	sprints: [],
	curr_sprint_num: 0,
	column_values: [],
	card_draginfo: {},
	status_draginfo: {},
    name: 'board',
    label: 'Доска',
	search_query: '',
	encoded_query: '',
	issues_dict: {},
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
			id: 'boards_columns',
			dictionary: 'issue_statuses',
			type: 'User',
		},
		{
			id: 'issue_tags',
			dictionary: 'issue_tags',
			type: 'Tag',
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
		{
			label: 'favourites',
			id: '',
			dictionary: 'favourites'
		},
    ]
  }

  const mod = await page_helper.create_module(data, methods)

  mod.computed.title = function () {
    const name = this.board[0].name
    if (
        name !== undefined &&
        name !== {} &&
        name !== ''
    ) {
      document.title = name
      return (name)
    } else {
      return 'Доска'
    }
  }

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

  mod.computed.swimlanes_value = function() {
    if(this.selected_board == undefined) return null
    if(this.selected_board.no_swimlanes) return null
    if(this.selected_board.swimlanes_by_root) return '0'
    else return this.selected_board.swimlanes_field_uuid
  }


  mod.computed.total_count = function() {
	  let count = 0
  	for(let i in this.swimlanes)
	  {
		  count += this.swimlanes[i].count
	  }
	  return count
  }

  mod.computed.total_sum = function() {
	  let sum = 0
  	for(let i in this.swimlanes)
	  {
		sum += this.swimlanes[i].sum
	  }
	  return sum
  }

  mod.props = {
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
		
		
		<i class='bx bx-dots-horizontal-rounded top-menu-icon-btn'
		@click="configs_open=!configs_open"
		></i>
		<i class='bx bx-trash top-menu-icon-btn delete-board-btn'
		@click="delete_board()"
		>	
		</i>
		<i class='bx bx-star top-menu-icon-btn'
		@click="add_to_favourites"
		v-if="(favourite_uuid == undefined) || (favourite_uuid == null)"
		>	
		</i>
		<i class='bx bxs-star top-menu-icon-btn'
		@click="delete_from_favourites"
		v-if="(favourite_uuid != undefined) && (favourite_uuid != null)"
		>	
		</i>
		
	
		</div>
	</div>

	

    <div id=board_down_panel class="panel" 
	
	>

		<div class="swimlane-total">
			<span>Всего</span>
			<span v-if="boards_issues">{{'кол-во: ' + total_count + '/' + boards_issues.length}}</span>
			<span>{{'сумма: ' + total_sum}}</span>
		</div>

		<div
		:class="{ 'when-dragged-swimlane': moving_swimlane != null}"
		class="swimlane"
		v-for="(swimlane, sw_index) in swimlanes"
		:key="sw_index"
		@drop="move_swimlane($event, swimlane)"
		@dragover.prevent
		@dragenter.prevent
		>
			<div class="swimlane-head"
			v-if="!selected_board.no_swimlanes" >
				<div class="swimlane-drag-dots"
				:id="swimlane.name"
				@dragstart="swimlane_start_dragging($event, swimlane)" 
				draggable
				@dragend="swimlane_stop_dragging($event, swimlane)"
				v-bind:class="{'dragged-swimlane': swimlane.is_dragged}"
				>
					<i class='bx bx-dots-vertical-rounded '
					></i>
				</div>
				<span class="swimlane-expander"
				@click="swimlane_expanded_toogle(swimlane)"
				>{{swimlane.expanded ? '⯆' : '⯈'}}</span>
				<span v-if="swimlane.link==undefined" >{{swimlane.name}}</span>
				<a v-if="swimlane.link!=undefined" 
				:href="swimlane.link" tag="li"
				:class="{ 'resolved-issue':swimlane.is_resolved, link:true}"
				>
					{{swimlane.num}} {{swimlane.name}}
				
				</a>
				<span>{{'кол-во: ' + swimlane.count}}</span>
				<span>{{'сумма: ' + swimlane.sum}}</span>
			</div>

			<div class="swimlane-body" :class="{'swimlane-body-closed': !swimlane.expanded && !selected_board.no_swimlanes}"

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
						
						<label
						:class="{ 'resolved-issue':statuses_ends_dict[issue.status_uuid]}"
						>{{get_field_by_name(issue, 'Название').value}}</label>
						</div>
						<label class="issue-card-description">
							{{get_field_by_name(issue, 'Описание').value != undefined ? get_field_by_name(issue, 'Описание').value.substring(0, 100) : ''}}
						</label>
						<div class="issue-board-card-footer">
							<div><label>{{'Assignee: ' + get_dict_value(get_field_by_name(issue, 'Assignee').value, 'User')}}</label>
							</div>
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
		:tags="issue_tags"
		:issue_types="issue_types"
		:users="users"
		:sprints="sprints"
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
			label='Поля карточки'
			id='boards_fields'
			:parent_name="'board'"
			clearable="false"
			dictionary= 'fields'
			:value="get_json_val(selected_board, 'boards_fields')"
			:values="fields"
			:parameters="{ multiple: true}"
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

	
		<div class="table_card_footer">
      <KButton
        name="Сохранить"
        class="table_card_footer_btn"
        :func="'save_board'"
        @click="configs_open=false"
      />
      <KButton
        name="Отменить"
        class="table_card_footer_btn"
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

  $cards_field_left: 20px;

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
    padding-right: 7px;
    display: flex;
	  flex-direction: column;
	  height: calc(100vh - $top-menu-height);
	  overflow:scroll;
  }

  #board_down_panel::-webkit-scrollbar{
    display:none;
  }

  .board-config {
    padding: 20px;
  }

  .board-config > *:not(:last-child) {
    margin-bottom: 10px;
  }

  .table_card_footer {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
  }

  .table_card_footer_btn {
    width: 45%;

    input {
      width: 100%;
    }
  }


  .status-board-collumn{
	width: calc((100vw - $main-menu-width - $cards_field_left * 2) / v-bind('boards_columns.length'));
	height: 150px;
	
	margin: 2px;
    height: 100%;
	text-align: center;
  }

  .status-board-collumn-dragging-to
  {
	  border-style: solid;
	  border-width: 1px;
	  border-radius: var(--border-radius);
  }

  .issue-board-cards-container
  {
	  background: var(--disabled-bg-color);
	  border-radius: var(--border-radius);
	  border-color: var(--disabled-bg-color);
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
	height: auto;

	background: var(--panel-bg-color);
	border-radius: var(--border-radius);
	border-color: var(--border-color);
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
	height: auto;
	display: flex;
    flex-direction: column;
	
	overflow: hidden;
	padding: 5px;
  }

  .issue-card-title a
  {
	color: var(--link-color);
	margin: 0px 0px 4px 0px;
  }

  .issue-card-description
  {
	  height: auto;
	  max-height: 100px;
	  border-top-color: var(--table-row-color);
	  border-bottom-color: var(--table-row-color);
	  border-top-width: 2px;
	  border-top-style: solid;
	  border-bottom-width: 2px;
	  border-bottom-style: solid;
	  color: var(--issue-card-descr-color);
	  overflow: hidden;
	  font-size: 10px;
	  padding: 5px;
  }

  .issue-card-top
  {
	  width:100%;
	  height: 5px;
	  border-top-left-radius: var(--border-radius);
	  border-top-right-radius: var(--border-radius);
	  opacity: 0.4;
	  background: gray;
  }

  .issue-board-card-footer
  {
	  width:100%;
	 // height: 12px;
	  padding: 5px;
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

  .top-menu-icon-btn {
	  height: 35px;
    font-size: 25px;
    border-radius: var(--border-radius);
    margin-left: 10px;
	  color: var(--text-color);
    background-color: var(--button-color);
    border-width: 1px;
    border-color: var(--border-color);
    border-style: solid;
    border-style: outset;
    cursor: pointer;
	width: 35px;
    text-align: center;
	padding-top: 4px;
  }

  .delete-board-btn {
	font-size: 23px;
	padding-top: 5px;
	color: #d27065
  }

  .panel topbar span {
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
	border-radius: var(--border-radius);
	margin: 0 0 0 2px !important;
	padding-top: 0px;
  font-size: 20px;
  font-weight: 400;
}

.board-sprint-filter-btn:hover{
	background: var(--table-row-color-selected);
	
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
	border-radius: var(--border-radius);
	background: var(--disabled-bg-color);
	margin: 4px;
	margin-bottom: 1px;
}

.swimlane-total
{
	height: 1.2*$input-height;
	min-height: 1.2*$input-height;
	max-height: 1.2*$input-height;
}

.swimlane-head
{
	height: $input-height;
	margin-top: var(--border-width);
}

.swimlane-head span, .swimlane-total span, .swimlane-head a
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
	overflow: hidden;
	margin-left: $cards_field_left;
}

.swimlane-body-closed *
{
	height: 0px;
}


.swimlane-expander
{
	cursor: pointer;
}


.swimlane-drag-dots
{
	
}

.swimlane-drag-dots i
{
	font-size: 22px;	
	margin: 6px;
}

.dragged-swimlane
{
	//cursor: grabbing;
}



#issue_types_table_panel {
	padding: 10px 0px 0px 0px;
}



.issue-card-description{

}




</style>