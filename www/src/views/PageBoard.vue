<script>
import page_helper from '../page_helper.ts'
import query_parser from '../query_parser.ts'

import d from '../dict.ts'
import rest from '../rest';
import tools from '../tools.ts'
import cache from "../cache";

let methods = {

	get_favourite_uuid() {

		if (this.favourites == undefined || this.selected_board == undefined || this.selected_board.is_new) {
			setTimeout(this.get_favourite_uuid, 200)
			return
		}


		for (let i = 0; i < this.favourites.length; i++) {

			if ('/board/' + this.selected_board.uuid == this.favourites[i].link) {

				this.favourite_uuid = this.favourites[i].uuid

				return
			}
		}
	},



	get_issue_by_uuid(uuid) {
		for (let i in this.boards_issues) {
			if (this.boards_issues[i].uuid == uuid) return this.boards_issues[i]
		}
	},
	all_parents_expended(uuid) {
		if (uuid == null) return true

		let parent = this.get_row_by_uuid(uuid)
		if (!parent.expanded) return false

		return this.all_parents_expended(parent.parent_uuid)
	},
	init: async function () {
		this.configs_open = false
		this.boards_issues = []
		//check loaded
		if (this.selected_board == undefined ||
			this.issue_statuses == undefined || this.inputs_dict == undefined || this.inputs_dict.boards_columns == undefined) {
			setTimeout(this.init, 50)
			return
		}


		this.title

		for (let i in this.issue_statuses) {
			this.statuses_ends_dict[this.issue_statuses[i].uuid] = this.issue_statuses[i].is_end
		}

		//console.log('sselected_board1')

		this.get_favourite_uuid()

		//check not double
		if (!this.selected_board.is_new) return

		


		if (this.selected_board.uuid != this.board[0].uuid) this.$store.commit('select_board', this.board[0].uuid);

		

		if (this.selected_board.is_new) this.configs_open = true

		
		this.selected_board.boards_columns = this.selected_board.boards_columns.sort((a, b) => { return a.num - b.num })
		this.sprints = (await rest.run_method('read_sprints', {})).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
		
		this.curr_sprint_num = this.get_curr_sprint_num()		

		this.selected_board.boards_columns = this.selected_board.boards_columns.sort((a, b) => { return a.num - b.num })
		this.selected_board.boards_fields = this.selected_board.boards_fields.sort((a, b) => { return a.num - b.num })
		
		this.column_values = []
		for (let i in this.inputs_dict['boards_columns'].values) {
			let val = this.inputs_dict['boards_columns'].values[i]
			let col = { status: [val], name: val.name }
			for (let j in this.selected_board.boards_columns) {
				if (this.selected_board.boards_columns[j].status[0].uuid == val.uuid) {
					col = this.selected_board.boards_columns[j]
					break
				}
			}
			if (col.uuid == undefined) {
				col.uuid = tools.uuidv4()
				col.num = 0
				col.table_name = 'boards_columns'
				col.status_uuid = val.uuid
				col.boards_uuid = this.selected_board.uuid
			}

			this.column_values.push(col)
		}

		//console.log('column_values', this.column_values, this.selected_board)
		for (let i in this.selected_board.boards_columns) {
			this.selected_board.boards_columns[i].name = this.selected_board.boards_columns[i].status[0].name
		}

		this.fields_values = []

		for (let i in this.inputs_dict['boards_fields'].values) {

			let val = this.inputs_dict['boards_fields'].values[i]
			if (val.name == 'Название') continue
			let col = { field: [val], name: val.name }
			for (let j in this.selected_board.boards_fields) {
				if (this.selected_board.boards_fields[j].fields[0].uuid == val.uuid) {
					col = this.selected_board.boards_fields[j]
					break
				}
			}
			if (col.uuid == undefined) {
				col.uuid = tools.uuidv4()
				col.num = 0
				col.table_name = 'boards_fields'
				col.fields_uuid = val.uuid
				col.boards_uuid = this.selected_board.uuid
			}

			this.fields_values.push(col)
		}


		for (let i in this.selected_board.boards_fields) {
			this.selected_board.boards_fields[i].name = this.selected_board.boards_fields[i].fields[0].name
		}


		let my_uuid = cache.getObject("profile").uuid
		let filters = await rest.run_method("read_boards_filters", { board_uuid: this.selected_board.uuid })
		filters = filters.filter((f) => !f.is_private || f.author_uuid == my_uuid)
		filters = filters.sort(tools.compare_obj_dt('updated_at'))

		/*let my_filters = await rest.run_method("read_boards_filters",{
				board_uuid: this.selected_board.uuid, is_private: 'TRUE', 
			author_uuid: cache.getObject("profile").uuid
			})
		console.log('my_filters', my_filters)
		let public_filters = await rest.run_method("read_boards_filters", { 
			board_uuid: this.selected_board.uuid, is_private: false })	
		console.log('public_filters', public_filters)*/

		this.filters = filters//my_filters.concat(public_filters);

		//console.log('sselected_board4')
		if(this.board[0].query == '') return
		if(this.board[0].query[this.board[0].query.length-1] == ' ') this.board[0].query = this.board[0].query.trimEnd()
		else this.board[0].query += ' '
	},
	get_root: function (issue) {
		if (issue.parent_uuid == undefined || issue.parent_uuid == null) return issue
		let parent = this.get_issue_by_uuid(issue.parent_uuid)
		if (parent == undefined) return issue
		return this.get_root(parent)
	},
	compare_swimlanes_to_sort: function (a, b) {
		if (a[0] == this.void_group_name) return 1
		if (b[0] == this.void_group_name) return -1
		//todo
/*		if (a[1].position == undefined) a[1].position = -1
		if (a[1].position == undefined) b[1].position = -1
		if (a[1].position < b[1].position) return -1
		if (a[1].position > b[1].position) return 1*/
		if (a[1].name < b[1].name) return -1
		if (a[1].name > b[1].name) return 1
		return 0
	},
	compare_cards_to_sort: function (a, b) {
		//console.log('aaa', a, b)
		const pseudo_infinite_position = 1000
		if (a.position == undefined) a.position = pseudo_infinite_position
		if (a.position == undefined) b.position = pseudo_infinite_position
		if (a.position < b.position) return -1
		if (a.position > b.position) return 1
		if (Number(a.num) < Number(b.num)) return -1
		if (Number(a.num) > Number(b.num)) return 1
		return 0
	},
	sort_swimlanes() {
		let swimlanes_arr = Object.entries(this.swimlanes)

		console.log('swimlanes_arr', swimlanes_arr)

		swimlanes_arr = swimlanes_arr.sort(this.compare_swimlanes_to_sort)

		this.swimlanes = Object.fromEntries(swimlanes_arr)
	},
	sort_cards() {
		for (let i in this.swimlanes) {
			for (let status_uuid in this.swimlanes[i].filtered_issues) {
				this.swimlanes[i].filtered_issues[status_uuid] =
					this.swimlanes[i].filtered_issues[status_uuid].sort(this.compare_cards_to_sort)
				for (let j = 0; j < this.swimlanes[i].filtered_issues[status_uuid].length; j++) {
					this.swimlanes[i].filtered_issues[status_uuid][j].position = j
				}
			}
		}
	},
	change_swimlane_position(swimlane, new_position) {

		console.log(">>>>>>>>>>>>>", swimlane.name, swimlane.position, new_position)

		let old_position = swimlane.position

		if (new_position == old_position) return
		for (let i in this.swimlanes) {


			if (this.swimlanes[i].position < old_position && this.swimlanes[i].position < new_position) continue



			if (this.swimlanes[i].position > old_position && this.swimlanes[i].position > new_position) continue



			if (this.swimlanes[i].position > old_position && this.swimlanes[i].position < new_position) this.swimlanes[i].position--
			else if (this.swimlanes[i].position < old_position && this.swimlanes[i].position > new_position) this.swimlanes[i].position++
			else if (this.swimlanes[i].position == old_position) this.swimlanes[i].position = new_position

			else if (this.swimlanes[i].position == new_position) {
				if (old_position < new_position) this.swimlanes[i].position--
				else this.swimlanes[i].position++
			}

		}

		console.log(">>>>>>>>>>>>>", swimlane.position, new_position)

		this.sort_swimlanes()

		this.make_conf()


		let conf_str = JSON.stringify(this.conf)

		this.$store.commit('id_push_update_board', { id: 'config', val: conf_str })
		this.$store.dispatch('save_board');
	},
	make_conf() {
		if(this.active_filters && this.active_filters.length) return
		
		let swimlanes = {}
		for (let i in this.swimlanes) {
			swimlanes[i] = { position: this.swimlanes[i].position, filtered_issues: {} }
			for (let status in this.swimlanes[i].filtered_issues) {
				if (this.swimlanes[i].filtered_issues[status] == undefined) continue
				swimlanes[i].filtered_issues[status] = {}
				for (let j = 0; j < this.swimlanes[i].filtered_issues[status].length; j++) {
					let issue = this.swimlanes[i].filtered_issues[status][j]
					swimlanes[i].filtered_issues[status][issue.uuid] = { position: issue.position }
				}
			}
		}

		if(this.selected_board.use_sprint_filter && this.$store.state['common'].use_sprints){
			let sprint_uuid = this.sprints[this.curr_sprint_num].uuid
			if(!this.conf.sprints) this.conf.sprints = {}
			this.conf.sprints[sprint_uuid] = { swimlanes: swimlanes }
		} 
		else this.conf.swimlanes = swimlanes
	},
	move_swimlane(e, swimlane_to) {

		if (!this.moving_swimlane) return

		this.change_swimlane_position(this.moving_swimlane, swimlane_to.position)

	},
	swimlane_start_dragging(e, swimlane) {


		e.dataTransfer.dropEffect = 'move'
		e.dataTransfer.effectAllowed = 'move'



		swimlane.is_dragged = true;

		this.moving_swimlane = swimlane

	},
	swimlane_stop_dragging(e, swimlane) {
		swimlane.is_dragged = false;

		this.moving_swimlane = null
	},
	make_swimlanes() {

		console.log('make_swimlanes0', new Date())
		this.swimlanes = {}

		if (this.selected_board.config != undefined && this.selected_board.config != null && this.selected_board.config != '') {
			this.conf = JSON.parse(this.selected_board.config)
		}

		let parent_types_uuids = {}
		if (this.selected_board.swimlanes_by_root) {
			for (let i in this.boards_issues) {
				let type_uuid = this.boards_issues[i].type_uuid
				if (parent_types_uuids[type_uuid] == undefined) parent_types_uuids[type_uuid] = true
				let root = this.get_root(this.boards_issues[i])



				if (this.boards_issues[i].type_uuid != root.type_uuid) {
					parent_types_uuids[type_uuid] = false
				}
			}
		}

		console.log('make_swimlanes1', new Date())

		//console.log('parent_types_uuids',parent_types_uuids)

		for (let i in this.boards_issues) {
			let x = 0
			let link
			let root_num
			let root_name
			let root_project_uuid
			let root_issue
			let is_resolved = false
			if (this.selected_board.swimlanes_by_root) {
				let type_uuid = this.boards_issues[i].type_uuid
				//if(parent_types_uuids[type_uuid]) continue


				let root = this.get_root(this.boards_issues[i])
				if (parent_types_uuids[root.type_uuid]) x = root.uuid//this.get_field_by_name(root, 'Название').value
				root_name = this.get_field_by_name(root, 'Название').value
				if (root.num != undefined) {
					root_num = root.project_short_name + '-' + root.num
					link = '/issue/' + root_num
					root_project_uuid = root.project_uuid
					is_resolved = this.statuses_ends_dict[root.status_uuid]
					root_issue = root
				}

			}
			else if (!this.selected_board.no_swimlanes) {
				x = this.get_field_value(this.boards_issues[i], { uuid: this.selected_board.swimlanes_field_uuid }, true)
				root_name = x
			}


			if (x == '') { x = this.void_group_name; root_name = x }
			else if (x == null) { x = this.void_group_name; root_name = x }
			else if (x == undefined) { x = this.void_group_name; root_name = x }

			if (this.swimlanes[x] == undefined) {
				this.swimlanes[x] = {
					id: x,
					name: root_name,
					issues: {},
					filtered_issues: {},
					count: 0,
					sum: 0,
					project_uuid: root_project_uuid
				}
			}

			let stored_exp = cache.getString(this.selected_board.uuid + '#' + x)
			if (stored_exp == undefined || stored_exp == 'false') stored_exp = false
			else stored_exp = true
			this.swimlanes[x].expanded = stored_exp


			if (link != undefined) {
				this.swimlanes[x].link = link
				this.swimlanes[x].num = root_num
				this.swimlanes[x].is_resolved = is_resolved
				this.swimlanes[x].issue = root_issue
			}

		


			if(this.selected_board.use_sprint_filter && this.$store.state['common'].use_sprints){
				let sprint_uuid = this.sprints[this.curr_sprint_num].uuid
				
				if (this.conf && this.conf.sprints && this.conf.sprints[sprint_uuid] && this.conf.sprints[sprint_uuid].swimlanes[x]){
					this.swimlanes[x].position = this.conf.sprints[sprint_uuid].swimlanes[x].position
				}
			}
			else if (this.conf != undefined && this.conf.swimlanes != undefined && this.conf.swimlanes[x] != undefined){
				this.swimlanes[x].position = this.conf.swimlanes[x].position
			}

			if (this.conf != undefined && this.conf.swimlanes != undefined && this.conf.swimlanes[x] != undefined) {

				this.swimlanes[x].position = this.conf.swimlanes[x].position
				//console.log('swpos000000sssss--------------------2222222', x, this.swimlanes[x].position)
				//console.log('swpos000000sssss--------------------3333333', this.conf.swimlanes[x])
			}


			let status_uuid = this.boards_issues[i].status_uuid
			if (this.swimlanes[x].issues[status_uuid] == undefined) this.swimlanes[x].issues[status_uuid] = []

			if (x == this.get_field_by_name(this.boards_issues[i], 'Название').value || x == this.boards_issues[i].uuid) continue

			this.swimlanes[x].issues[status_uuid].push(this.boards_issues[i])


			let is_in_columns = this.boards_columns.map((obj) => obj.uuid).indexOf(this.boards_issues[i].status_uuid) > -1

			if (is_in_columns &&
				(!(this.selected_board.use_sprint_filter && this.$store.state['common'].use_sprints) || this.boards_issues[i].sprint_uuid == this.sprints[this.curr_sprint_num].uuid)) {
				//console.log(this.boards_issues[i].sprint_uuid == this.sprints[this.curr_sprint_num], this.boards_issues[i].sprint_uuid, this.sprints[this.curr_sprint_num])
				if (this.swimlanes[x].filtered_issues[status_uuid] == undefined) this.swimlanes[x].filtered_issues[status_uuid] = []

				this.swimlanes[x].filtered_issues[status_uuid].push(this.boards_issues[i])

				this.swimlanes[x].count++

				if (this.selected_board.estimate_uuid != undefined && this.selected_board.estimate_uuid != null) {
					let val = Number(this.get_field_value(this.boards_issues[i], { uuid: this.selected_board.estimate_uuid }))
					if (!isNaN(val)) this.swimlanes[x].sum += val
				}
			}

		}

		console.log('make_swimlanes2', new Date())



		if (tools.obj_length(this.swimlanes) == 0) return



		this.sort_swimlanes()



		let position = 0
		for (let i in this.swimlanes) {
			this.swimlanes[i].position = position
			position++

			if (this.conf.swimlanes == undefined) return
			if (this.conf.swimlanes[i] == undefined) continue
			if (this.conf.swimlanes[i].filtered_issues == undefined) continue


			for (let status in this.swimlanes[i].filtered_issues) {
				console.log('cooonf0', this.conf.swimlanes[i].filtered_issues[status])
				if (this.conf.swimlanes[i].filtered_issues[status] == undefined) continue
				if (this.swimlanes[i].filtered_issues[status] == undefined) continue
				console.log('cooonf', this.conf.swimlanes[i].filtered_issues[status])
				for (let j = 0; j < this.swimlanes[i].filtered_issues[status].length; j++) {
					let issue_uuid = this.swimlanes[i].filtered_issues[status][j].uuid
					if (this.conf.swimlanes[i].filtered_issues[status][issue_uuid] == undefined) continue
					this.swimlanes[i].filtered_issues[status][j].position =
						this.conf.swimlanes[i].filtered_issues[status][issue_uuid].position
				}

			}
		}

		this.sort_cards()



		console.log('make_swimlanes100', new Date())

		//load saved swimlanes order



		//this.make_conf()
		//let conf_str = JSON.stringify(this.conf)

		//this.$store.commit('id_push_update_board' , {id: 'config', val:conf_str})
		//rest.run_method('update_board', this.selected_board)
		//this.$store.dispatch('save_board');

		//console.log('this.swimlanes', this.swimlanes)
	},
	get_issues: async function (query) ///added other things on mount
	{
		let options = {}
		//if (query != undefined && query != '') {
			options.query = query.trim();
			this.encoded_query = query
		/*}
		else if (this.encoded_query != undefined && this.encoded_query != '') {
			options.query = this.encoded_query
		}
		else return*/

		let query_str = decodeURIComponent(atob(options.query)).split('order by')[0]
		if(query_str != '') query_str = '(' + query_str + ')'
		if (this.selected_board.use_sprint_filter && this.$store.state['common'].use_sprints) {
			query_str += " and attr#sprint_uuid#='" + this.sprints[this.curr_sprint_num].uuid + "'#"
		}

		let active_filters = this.filters.filter((f) => f.is_active)
		for (let i = 0; i < active_filters.length; i++) {
			query_str += ' and (' + active_filters[i].converted_query + ')'
		}

	

		console.log('options.query', query_str)
		options.query = btoa(encodeURIComponent(query_str))

		console.log('>>>>>>>>>>>>>>>>>>>>get_issues2' , options, '#')

		if(options.query) this.boards_issues = await rest.run_method('read_issues', options)
		else this.boards_issues = await rest.run_method('read_issues')

		this.make_swimlanes()
	},
	filtered_issues: function (status_uuid) {
		return this.boards_issues != undefined ? this.boards_issues.filter(issue => issue.status_uuid == status_uuid) : [];
	},

	update_search_query: function (val) {
		this.search_query = val
	},
	search() {
		query_parser.parse(this.search_query, this.fields)
	},
	get_field_by_name: function (issue, name) {
		//console.log('get_field_by_name', name)

		for (let i in issue.values) {
			if (issue.values[i].label == name) return issue.values[i]
		}
		return { label: '', value: '' }

	},
	dragstart_card: function (e, el) {
		//	console.log('dddddrrrr', el, e)

		this.card_draginfo = el
	},
	dragend_card: function () {

		//	console.log('dddddrrrr end')
		this.card_draginfo = {}
		this.status_draginfo = {}
		//this.card_to_be_moved_down_uuid = undefined
		//this.bottom_to_move_uuids = undefined
	},
	move_card: function (el) {
		if (this.card_draginfo.uuid == undefined) return

		console.log('move_card2', el)
	},
	move_card_status: function (el, e, swimlane) {
		//console.log('moving0')
		if (this.card_draginfo.uuid == undefined) return
		//console.log('moving1')
		if (this.card_draginfo.status_uuid != el.uuid) {
			console.log('move_card0', el)
			this.status_draginfo = el
			//		console.log('moving2')
		}


		const pause_timeout = 100 //ms

		//console.log(new Date() - this.last_move_card_calc_dt)
		if (new Date() - this.last_move_card_calc_dt < pause_timeout) return
		this.last_move_card_calc_dt = new Date()
		const pseudo_infinite_top = 10000
		let min_top_dist = pseudo_infinite_top;
		let closest_top
		let min_bottom_dist = pseudo_infinite_top;
		let closest_bottom
		for (let i in swimlane.filtered_issues[el.uuid]) {
			let ref_name = 'issue_board_card_' + swimlane.id + '_' + el.uuid + '_' + i

			let card_rect = this.$refs[ref_name][0].getBoundingClientRect()
			console.log(card_rect, e.clientY, ref_name)
			let top_diff_y = Math.abs(card_rect.top - e.clientY)
			let bottom_diff_y = Math.abs(card_rect.bottom - e.clientY)

			if (top_diff_y < min_top_dist) {
				min_top_dist = top_diff_y
				closest_top = swimlane.filtered_issues[el.uuid][i]
				console.log('move_card1', min_top_dist, i)
			}

			if (bottom_diff_y < min_bottom_dist) {
				min_bottom_dist = bottom_diff_y
				closest_bottom = swimlane.filtered_issues[el.uuid][i]
				console.log('move_card1', min_top_dist, i)
			}

		}

		console.log(closest_top.num)

		if (closest_top == undefined || closest_top.uuid == this.card_draginfo.uuid || swimlane.filtered_issues[el.uuid] == undefined) {
			this.bottom_to_move_uuids = undefined
			this.card_to_be_moved_down_uuid = undefined
			return
		}

		let last_num = swimlane.filtered_issues[el.uuid].length - 1
		let is_closest_last =
			swimlane.filtered_issues[el.uuid][last_num].uuid == closest_bottom.uuid
		let is_closest_first =
			swimlane.filtered_issues[el.uuid][0].uuid == closest_top.uuid


		if (is_closest_last && (!is_closest_first || min_bottom_dist < min_top_dist)) {
			this.bottom_to_move_uuids = el.uuid + '_' + swimlane.uuid
			console.log('bottom_to_move_uuids', this.bottom_to_move_uuids)
			this.card_to_be_moved_down_uuid = undefined
		}
		else {
			if (Number(this.card_draginfo.position) + 1 == Number(closest_top.position) && this.card_draginfo.status_uuid == closest_top.status_uuid) {
				this.card_to_be_moved_down_uuid = undefined
			}
			else this.card_to_be_moved_down_uuid = closest_top.uuid
			this.bottom_to_move_uuids = undefined
		}

	},
	drop_card: function (el, e, swimlane) {

		//console.log('move_card111', e, this.$refs['issue_board_card_' + el.uuid + '_0'])

		//console.log('moving0')

		let status_changed = this.card_draginfo.uuid != undefined &&
			this.status_draginfo.uuid != undefined &&
			this.card_draginfo.status_uuid != el.uuid

		if (status_changed) {
			this.card_draginfo.status_uuid = el.uuid
			this.card_draginfo.status_name = el.name

			rest.run_method('update_issue', this.card_draginfo)

			this.make_swimlanes()
		}


		if (this.card_to_be_moved_down_uuid != undefined) {
			let inc = 0
			for (let i = 0; i < swimlane.filtered_issues[el.uuid].length; i++) {
				if (swimlane.filtered_issues[el.uuid][i].uuid == this.card_to_be_moved_down_uuid) {
					this.card_draginfo.position = swimlane.filtered_issues[el.uuid][i].position
					inc++
					if (inc == 0) this.card_draginfo.position--
				}
				if (swimlane.filtered_issues[el.uuid][i].uuid == this.card_draginfo.uuid) inc--

				swimlane.filtered_issues[el.uuid][i].position = Number(swimlane.filtered_issues[el.uuid][i].position) + inc;
			}

			this.sort_cards()
			this.card_to_be_moved_down_uuid = undefined

			this.make_conf()
			let conf_str = JSON.stringify(this.conf)
			this.$store.commit('id_push_update_board', { id: 'config', val: conf_str })
			this.$store.dispatch('save_board');
		}

		if (this.bottom_to_move_uuids != undefined) {
			this.card_draginfo.position = this.pseudo_infinite_card_position
			this.sort_cards()
			this.bottom_to_move_uuids = undefined

			this.make_conf()
			let conf_str = JSON.stringify(this.conf)
			this.$store.commit('id_push_update_board', { id: 'config', val: conf_str })
			this.$store.dispatch('save_board');
		}
	},
	get_input_by_id: function (id) {
		return { values: [] }
		/*for(let i in this.inputs)
		{
			if(this.inputs[i].id == id) return this.inputs[i]
		}*/
	},

	get_field_value(issue, field, deep) //todo add values from dicts
	{
		for (let i in issue.values) {
			if (issue.values[i].field_uuid == field.uuid) {
				if (!deep) return issue.values[i].value

				if (issue.values[i].type == 'User') {
					for (let j in this.users) {
						if (this.users[j].uuid == issue.values[i].value) return this.users[j].name
					}
					console.log('USERRRR', issue.values[i])
				}
				console.log('USERRRR field', field, issue.values[i])
				return issue.values[i].value
			}
		}
	},
	get_curr_sprint_num() {
		
		let cached_sprint_uuid = cache.getString(this.selected_board.uuid + '#sprint_uuid')

		//last opened sprint
		if (cached_sprint_uuid) {
			for (let i in this.sprints) {
				if (this.sprints[i].uuid == cached_sprint_uuid) return Number(i)
			}
		}

		let curr_date = new Date()

		//find if there is a current sprint
		for (let i in this.sprints) {
			if (curr_date > new Date(this.sprints[i].start_date) && curr_date < new Date(this.sprints[i].end_date)) {
				return Number(i)
			}
		}

		//find nearest sprint in future
		for (let i in this.sprints) {
			if (curr_date < new Date(this.sprints[i].end_date)) {
				return Number(i)
			}
		}

		//no sprint found, get the first one
		return 0
	},
	update_sprint_num(new_num) {

		console.log('uspn>>>>>>',this.curr_sprint_num, new_num)
		if (new_num < 0) return
		if (new_num > this.sprints.length - 1) return

		cache.setString(this.selected_board.uuid + '#sprint_uuid', this.sprints[new_num].uuid)
		
		this.curr_sprint_num = new_num

		this.get_issues()
		//this.make_swimlanes()

	},
	get_dict_value(val, type) {

		if (type == 'User') {
			if (val == null) return 'Не назначен'
			for (let i in this.users) {
				//console.log(this.users[i], val)
				if (this.users[i].uuid == val) return this.users[i].name
			}
		}
		return val
	},
	get_card_color(issue) {
		let p = this.get_field_value(issue, { uuid: 'b6ddb33f-eea9-40c0-b1c2-d9ab983026a1' })

		if (p == 'Minor') return 'green'
		else if (p == 'Normal') return 'yellow'
		else if (p == 'Major') return 'orange'
		else if (p == 'Critical') return 'pink'
		else if (p == 'Show-stopper') return 'red'
		else return 'gray'
	},
	delete_board() {
		this.$store.dispatch('delete_board')
	},
	swimlane_expanded_toogle(swimlane) {
		swimlane.expanded = !swimlane.expanded
		cache.setString(this.selected_board.uuid + '#' + swimlane.id, swimlane.expanded)
	},
	swimlanes_updated(v) {
		if (v == null) {
			this.$store.commit('id_push_update_board', { id: 'swimlanes_by_root', val: false })
			this.$store.commit('id_push_update_board', { id: 'no_swimlanes', val: true })
			this.$store.commit('id_push_update_board', { id: 'swimlanes_field_uuid', val: null })
		}
		else if (v.toString() == '0') {
			this.$store.commit('id_push_update_board', { id: 'swimlanes_by_root', val: true })
			this.$store.commit('id_push_update_board', { id: 'no_swimlanes', val: false })
			this.$store.commit('id_push_update_board', { id: 'swimlanes_field_uuid', val: null })
		}
		else {
			this.$store.commit('id_push_update_board', { id: 'swimlanes_by_root', val: false })
			this.$store.commit('id_push_update_board', { id: 'no_swimlanes', val: false })
			this.$store.commit('id_push_update_board', { id: 'swimlanes_field_uuid', val: v })
		}

		this.make_swimlanes()
	},
	async add_to_favourites() {
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
	async delete_from_favourites() {
		await rest.run_method('delete_favourites', { uuid: this.favourite_uuid })
		this.favourite_uuid = null
	},
	async edit_card_title(issue, e) {
		let new_title = e.target.innerText
		for (let i in issue.values) {
			if (issue.values[i].label == "Название") {
				issue.values[i].value = new_title
			}
		}

		await rest.run_method('update_issue', issue)

	},
	get_children_by_status(swimlane, status) {
		let ch
		//console.log('new issue card000', swimlane, status)
		for (let s in swimlane.issues) {
			for (let i in swimlane.issues[s]) {
				if (s == status.uuid) {
					return swimlane.issues[s][i];
				}
				ch = swimlane.issues[s][i];
			}
		}
		return ch
	},
	async new_issue_card(swimlane, status) {
		console.log('new issue card', swimlane, status)
		let parent_uuid = swimlane.id
		let status_uuid = status.uuid
		let project_uuid = swimlane.project_uuid
		let author_uuid = cache.getObject("profile").uuid
		let query = decodeURIComponent(atob(this.encoded_query))
		let search_start = 0
		let field_start
		const max_count = 100
		let count = 0
		const field_text = 'fields#'
		let query_fields = []

		while (count < max_count) {
			field_start = query.indexOf(field_text, search_start)
			if (field_start == -1) break
			field_start += field_text.length
			let field_end = query.indexOf("#", field_start)
			let field_uuid = query.substring(field_start, field_end)
			query_fields.push(field_uuid)
			search_start = field_end
			count++
		}

		let ch = this.get_children_by_status(swimlane, status)

		if (ch == undefined) {
			for (let i in this.swimlanes) {
				ch = this.get_children_by_status(this.swimlanes[i], status)
				if (ch != undefined) break
			}
		}

		if (ch == undefined) {
			alert('Невозможно создать карточку. На доске нет ни одной карточки для определения типа')
			return
		}

		let type_uuid = ch.type_uuid

		const name = 'Задача с доски'

		let issue = {

			uuid: tools.uuidv4(),
			project_uuid: project_uuid,
			status_uuid: status_uuid,
			type_uuid: type_uuid,
			values: [
				{
					type: "Text",
					uuid: "",
					label: "Описание",
					value: "",
					field_uuid: "4a095ff5-c1c4-4349-9038-e3c35a2328b9",
					issue_uuid: "",
					table_name: "field_values",
				},
				{
					type: "String",
					uuid: "",
					label: "Название",
					value: name,
					field_uuid: "c96966ea-a591-47a9-992c-0a2f6443bc80",
					issue_uuid: "",
					table_name: "field_values",
				},
				{
					type: "User",
					uuid: "",
					label: "Автор",
					value: author_uuid,
					field_uuid: "733f669a-9584-4469-a41b-544e25b8d91a",
					issue_uuid: "",
					table_name: "field_values",
				},
			],

		}


		for (let i in ch.values) {
			if (query_fields.includes(ch.values[i].field_uuid) &&
				(ch.values[i].label != 'Описание' &&
					ch.values[i].label != 'Название' &&
					ch.values[i].label != 'Автор')) {
				let new_value = tools.obj_clone(ch.values[i])
				issue.values.push(new_value)
			}
		}

		if (this.selected_board.use_sprint_filter && this.$store.state['common'].use_sprints) issue.sprint_uuid = this.sprints[this.curr_sprint_num].uuid

		for (let i in issue.values) {
			issue.values[i].issue_uuid = issue.uuid;
			issue.values[i].uuid = tools.uuidv4();
		}


		console.log(issue)


		let ans = await rest.run_method('upsert_issue', issue)
		let created_issue = ans[0]

		if (created_issue.status_uuid != status_uuid) {
			created_issue.status_uuid = status_uuid
			ans = await rest.run_method('upsert_issue', created_issue)
		}

		let relation = {
			uuid: tools.uuidv4(),
			issue0_uuid: parent_uuid,
			issue1_uuid: created_issue.uuid,
			type_uuid: this.parent_relation_type_uuid,
		};

		await rest.run_method("upsert_relations", relation);

		console.log(this.boards_issues.length)
		this.boards_issues.push(created_issue)
		console.log(this.boards_issues.length)
		console.log(this.boards_issues)
		if (swimlane.issues[status.uuid] == undefined) swimlane.issues[status.uuid] = []
		swimlane.issues[status.uuid].push(created_issue)
		if (swimlane.filtered_issues[status.uuid] == undefined) swimlane.filtered_issues[status.uuid] = []

		//swimlane.filtered_issues[status.uuid]
		swimlane.filtered_issues[status.uuid].push(created_issue)

		this.get_issues()

		//console.log(created_issue)
	},
	field_updated: async function (e, field) {
		console.log("field_updated", e, field);

	},

	start_add_filter: function () {
		this.filter_to_edit = { query: '', name: '', is_active: true, is_private: true }
		this.board_filter_modal_visible = true
	},
	start_edit_filter: function (filter) {
		this.filter_to_edit = filter
		this.board_filter_modal_visible = true
	},
	filter_ok: function (filter) {
		this.board_filter_modal_visible = false
		if (filter.uuid) {

		}
		else {
			filter.uuid = tools.uuidv4()
			filter.author_uuid = cache.getObject("profile").uuid
			filter.board_uuid = this.selected_board.uuid
			filter.table_name = 'boards_filters'
			this.filters.push(filter)
		}
		filter.updated_at = new Date()
		rest.run_method("upsert_boards_filters", filter)
		this.filters = this.filters.sort(tools.compare_obj_dt('updated_at'))
		this.get_issues()
	},
	delete_filter: function (filter) {
		rest.run_method("delete_boards_filters", { uuid: filter.uuid })
		this.filters = this.filters.filter((f) => f.uuid != filter.uuid)
		this.board_filter_modal_visible = false
	},
	toggle_filter: function (filter) {
		filter.is_active = !filter.is_active
		this.get_issues()
	},
	sprint_changed: function(sprint)
	{
		if(sprint.uuid == this.sprints[this.curr_sprint_num].uuid) return

		console.log('spr>>>>>>>>>>>', sprint)
		for(let i in this.sprints){
			if(this.sprints[i].uuid == sprint.uuid) {
				this.update_sprint_num(Number(i))
				console.log('spri>>>>>>>>>>>', i)
				return
			}
		}
	}
}

const data =
{
	selected_issue: undefined,
	parent_relation_type_uuid: "73b0a22e-4632-453d-903b-09804093ef1b",
	instance:
	{
		name: '',
		boards_columns: [],
		boards_fields: [],
		use_sprint_filter: false,
		query: ''
	},
	statuses_ends_dict: {},
	conf: {},
	favourite_board_type_uuid: '1b6832db-7d94-4423-80f2-10ed989af9f8',
	favorite_uuid: undefined,
	void_group_name: 'Без группы',
	swimlanes: {},
	moving_swimlane: null,
	sprints: [],
	curr_sprint_num: 0,
	column_values: [],
	fields_values: [],
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
	pseudo_infinite_card_position: 1000,
	card_to_be_moved_down_uuid: undefined,
	bottom_to_move_uuids: undefined,
	last_move_card_calc_dt: new Date(),
	filters: [],
	board_filter_modal_visible: false,
	filter_to_edit: {},
	collumns: [
		{
			name: '№',
			id: ["project_short_name", "'-'", "num"],
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
			type: 'user'
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
			id: 'boards_fields',
			dictionary: 'fields',
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

mod.computed.board_query_info = function () {
	let board_query_info = this.search_query

	return board_query_info
}

mod.computed.boards_columns = function () {
	if (this.selected_board == undefined || this.selected_board.boards_columns == undefined) return []
	return this.selected_board.boards_columns.map((v) => v.status[0])
}

mod.computed.swimlanes_values = function () {
	if (this.selected_board == undefined || this.selected_board.boards_columns == undefined || this.fields == undefined) return []
	let values = [{ uuid: '0', name: 'Корневая задача' }]
	this.fields = this.fields.sort((a, b) => a.name < b.name ? -1 : (a.name > b.name ? 1 : 0))
	for (let i in this.fields) {
		values.push(this.fields[i])
	}
	return values
}

mod.computed.swimlanes_value = function () {
	if (this.selected_board == undefined) return null
	if (this.selected_board.no_swimlanes) return null
	if (this.selected_board.swimlanes_by_root) return '0'
	else return this.selected_board.swimlanes_field_uuid
}


mod.computed.display_description = function () {
	if (this.selected_board == undefined || this.selected_board.boards_fields == undefined) return false
	for (let i in this.selected_board.boards_fields) {
		if (this.selected_board.boards_fields[i].name == 'Описание') return true
	}
	return false

}

mod.computed.available_values = function (field_uuid) {
	//		console.log('get_available_values', field_uuid)
	let av = {}

	for (let i in this.fields) {
		if (this.fields[i].available_values == undefined) {
			av[this.fields[i].uuid] = []
			continue;
		}
		let available_values = this.fields[i].available_values
			.split(",")
			.map((v) => v.replace("\n", "").replace("\r", "").trim());
		av[this.fields[i].uuid] = available_values;

	}
	return av
}


mod.computed.total_count = function () {
	let count = 0
	for (let i in this.swimlanes) {
		count += this.swimlanes[i].count
	}
	return count
}

mod.computed.total_sum = function () {
	let sum = 0
	for (let i in this.swimlanes) {
		sum += this.swimlanes[i].sum
	}
	return sum
}

mod.computed.active_filters = function(){
	return this.filters.filter((f) => f.is_active)
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

		<Transition name="element_fade">
			<KBoardFilterModal v-if="board_filter_modal_visible"
				@close_board_filter_modal="board_filter_modal_visible = false" @ok_board_filter_modal="filter_ok"
				@delete_board_filter="delete_filter" :filter="filter_to_edit" :fields="fields" :projects="projects"
				:issue_statuses="issue_statuses" :issue_tags="issue_tags" :issue_types="issue_types" :users="users"
				:sprints="sprints" />
		</Transition>

		<div class='panel topbar'>
			<div style="display: flex ; flex-direction:row; flex-grow: 1; max-height: calc(100% - 60px); ">
				<StringInput v-if="board != undefined && selected_board != undefined" label='' id="name"
					key="board_name" :parent_name="'board'" class="board-name-input"
					:value="get_json_val(selected_board, 'name')" :disabled="!configs_open">
				</StringInput>


				<div v-if="board != undefined && selected_board != undefined && selected_board.use_sprint_filter && this.$store.state['common'].use_sprints && sprints.length > 0"
					class="board-sprint-filter">
					<span class='board-sprint-filter-btn' @click="update_sprint_num(curr_sprint_num - 1)">❮</span>
					<SelectInput class="board-sprint-filter-string" label=''
						:value="sprints[curr_sprint_num]"
						:values="sprints"
						@updated="sprint_changed"
						:parameters="{clearable:false}"
						>
					</SelectInput>
					<span class='board-sprint-filter-btn' @click="update_sprint_num(curr_sprint_num + 1)">❯</span>
				</div>

				<StringInput class="board-query-info" v-if="false && board != undefined && selected_board != undefined"
					label='' disabled="true" :value="board_query_info">

				</StringInput>


				<i class='bx bx-dots-horizontal-rounded top-menu-icon-btn' @click="configs_open = !configs_open"></i>
				<i class='bx bx-trash top-menu-icon-btn delete-board-btn' @click="delete_board()">
				</i>
				<i class='bx bx-star top-menu-icon-btn' @click="add_to_favourites"
					v-if="(favourite_uuid == undefined) || (favourite_uuid == null)">
				</i>
				<i class='bx bxs-star top-menu-icon-btn' @click="delete_from_favourites"
					v-if="(favourite_uuid != undefined) && (favourite_uuid != null)">
				</i>


			</div>
		</div>



		<div id=board_down_panel class="panel">

			<div class="filters-row">
				<i class='bx bx-filter-alt'></i>
				<div class="filter" v-for="(filter) in filters" :class="{ 'selected-filter': filter.is_active }">
					<i class="delete-filter-btn bx bx-trash" @click=""></i>
					<span @click="toggle_filter(filter)">{{ filter.name }}</span>
					<i class="config-filter-btn bx bx-cog" @click="start_edit_filter(filter)"></i>
				</div>
				<i class="add-filter-btn bx bx-plus" @click="start_add_filter()"></i>
			</div>

			<div class="swimlane-total">
				<span>Всего</span>
				<span v-if="boards_issues">{{ 'кол-во: ' + total_count + '/' + boards_issues.length }}</span>
				<span>{{ 'сумма: ' + total_sum }}</span>
			</div>

			<div :class="{ 'when-dragged-swimlane': moving_swimlane != null }" class="swimlane"
				v-for="(swimlane, sw_index) in swimlanes" :key="swimlane.uuid" @drop="move_swimlane($event, swimlane)"
				@dragover.prevent @dragenter.prevent>
				<div class="swimlane-head" v-if="!selected_board.no_swimlanes">
					<div 
						v-if="!active_filters || !active_filters.length"
						class="swimlane-drag-dots" :id="swimlane.name"
						@dragstart="swimlane_start_dragging($event, swimlane)" draggable
						@dragend="swimlane_stop_dragging($event, swimlane)"
						v-bind:class="{ 'dragged-swimlane': swimlane.is_dragged }">
						<i class='bx bx-dots-vertical-rounded '></i>
					</div>
					<span class="swimlane-expander" @click="swimlane_expanded_toogle(swimlane)">{{
						swimlane.expanded ?
							'⯆' : '⯈'
					}}</span>
					<span v-if="swimlane.link == undefined">{{ swimlane.name }}</span>
					<a v-if="swimlane.link != undefined" :href="'/' + $store.state['common'].workspace + swimlane.link" tag="li"
						:class="{ 'resolved-issue': swimlane.is_resolved, link: true }">
						{{ swimlane.num }} {{ swimlane.name }}

					</a>
					<span>{{ 'кол-во: ' + swimlane.count }}</span>
					<span>{{ 'сумма: ' + swimlane.sum }}</span>
					<i v-if="swimlane.issue != undefined" @click="selected_issue = swimlane.issue"
						class='bx bx-window-open'>
					</i>
				</div>

				<div class="swimlane-body"
					:class="{ 'swimlane-body-closed': !swimlane.expanded && !selected_board.no_swimlanes }">

					<div v-for="(status, s_index) in boards_columns" :key="swimlane.uuid + '_' + s_index"
						@mousemove="move_card_status(status, $event, swimlane)"
						@mouseup="drop_card(status, $event, swimlane)" @mouseleave="status_draginfo = {}"
						class="status-board-collumn"
						:class="{ 'status-board-collumn-dragging-to': this.status_draginfo.uuid == status.uuid, 'when-dragged-card': card_draginfo.uuid != undefined }">

						<label>{{ status.name }}</label>
						<div class="issue-board-cards-container">

							<div v-for="(issue, i_index) in 
						(swimlane.filtered_issues[status.uuid] != undefined ? swimlane.filtered_issues[status.uuid] : [])"
								:key="issue.uuid + '_' + i_index">
								<div v-if="issue.uuid == card_to_be_moved_down_uuid && card_draginfo.uuid != undefined"
									class="gost-issue-card">
								</div>
								<div :ref="'issue_board_card_' + swimlane.id + '_' + status.uuid + '_' + i_index"
									:id="'issue_board_card_' + swimlane.id + '_' + status.uuid + '_' + i_index" :class="{
										'dragged-card': issue.uuid == card_draginfo.uuid,
										'when-dragged-card': card_draginfo.uuid != undefined,
										'selected-board-card': selected_issue != undefined && issue.uuid == selected_issue.uuid
									}"
									@dblclick="selected_issue = issue" @mousedown="dragstart_card($event, issue)"
									@mousemove.prevent class="issue-board-card">

									<div class="issue-card-top" :style="[{ backgroundColor: get_card_color(issue) }]">
									</div>
									<div class="issue-card-title">
										<div>
											<a
												:href="'/' + $store.state['common'].workspace + '/issue/' + issue.project_short_name + '-' + issue.num">{{ issue.project_short_name }}-{{ issue.num }}</a>
											<span>{{ issue.type_name }}</span>
											<i @click="selected_issue = issue" class='bx bx-window-open'></i>
										</div>
										<label contenteditable="true" @blur="edit_card_title(issue, $event)"
											:class="{ 'resolved-issue': statuses_ends_dict[issue.status_uuid] }">{{
												get_field_by_name(issue,
																						'Название').value
											}}</label>
									</div>
									<label class="issue-card-description" v-if="display_description">
										{{
											get_field_by_name(issue, 'Описание').value != undefined ?
												get_field_by_name(issue, 'Описание').value.substring(0, 100) : ''
										}}
									</label>
									<div class="issue-board-card-footer"
										v-show="swimlane.expanded || selected_board.no_swimlanes">

										<div class="board-card-field"
											v-for="(f, f_index) in selected_board.boards_fields">
											<label class="board-card-field-title"
												v-if="f.fields != undefined && f.fields[0] != undefined && f.fields[0].name != 'Описание'">
												{{ f.fields[0].name }}: </label>
											<component
												v-if="false && f.fields != undefined && f.fields[0] != undefined && f.fields[0].name != 'Описание'"
												v-bind:is="f.fields[0].type[0].code + 'Input'"
												:value="get_field_value(issue, f.fields[0])" label=""
												:key="issue.uuid + '_' + i_index + '_' + f_index"
												:disabled="f.fields[0].name == 'Автор'"
												:values="available_values[f.fields_uuid]" class="board-card-field-input"
												@updated="field_updated($event, f.fields[0])"></component>
											<StringInput
												v-if="swimlane.expanded && f.fields != undefined && f.fields[0] != undefined && f.fields[0].name != 'Описание'"
												:value="get_field_value(issue, f.fields[0], true)" label=""
												:key="issue.uuid + '_' + i_index + '_' + f_index" :disabled="true"
												:values="available_values[f.fields_uuid]" class="board-card-field-input"
												@updated="field_updated($event, f.fields[0])"></StringInput>
										</div>
									</div>

								</div>

							</div>
							<div v-if="bottom_to_move_uuids == status.uuid + '_' + swimlane.uuid && card_draginfo.uuid != undefined"
								class="gost-issue-card">
							</div>
							<i v-if="selected_board.swimlanes_by_root" class="bx new-issue-card-btn"
								@click="new_issue_card(swimlane, status)">+</i>
						</div>
					</div>
				</div>

			</div>

			<div class="board-card-frame" :class="{ 'board-card-frame-closed': !selected_issue }">
				<div>
					<iframe v-if="selected_issue"
						:src="('/' + $store.state.common.workspace + '/issue/' + selected_issue.project_short_name + '-' + selected_issue.num)"></iframe>
					<i v-if="selected_issue" @click="(selected_issue = undefined)" class='bx bx-x'></i>
				</div>
			</div>


			<div class="modal-bg" v-show="configs_open">
				<div class="panel modal board-config">

					<IssuesSearchInput v-if="board != undefined && 
					selected_board && (!(selected_board.use_sprint_filter && $store.state['common'].use_sprints) || sprints[curr_sprint_num])" label="Запрос" class='board-issue-search-input'
						:parent_name="'board'" @update_parent_from_input="update_search_query" :fields="fields"
						@search_issues="get_issues" :projects="projects" :issue_statuses="issue_statuses"
						:tags="issue_tags" :issue_types="issue_types" :users="users" :sprints="sprints"
						:disabled="!configs_open" id='query' :parent_query="selected_board.query">

					</IssuesSearchInput>

					<SelectInput v-if="inputs_dict != undefined && selected_board != undefined" label='Статусы'
						id='boards_columns' :parent_name="'board'" clearable="false"
						:value="get_json_val(selected_board, 'boards_columns')" :values="column_values"
						:parameters="{ multiple: true }" @update_parent_from_input="make_swimlanes"></SelectInput>

					<SelectInput v-if="inputs_dict != undefined" label='Группировать по' clearable="true"
						:value="swimlanes_value" :values="swimlanes_values" :parameters="{ reduce: obj => obj.uuid }"
						@update_parent_from_input="swimlanes_updated"></SelectInput>

					<SelectInput v-if="inputs_dict != undefined" label='Суммируемое поле' id='estimate_uuid'
						:parent_name="'board'" clearable="false" :value="get_json_val(selected_board, 'estimate_uuid')"
						:values="inputs_dict['estimate_uuid'].values.filter((v) => v.type[0].code == 'Numeric')"
						:parameters="inputs_dict['estimate_uuid']" @update_parent_from_input="make_swimlanes">
					</SelectInput>

					<SelectInput v-if="inputs_dict != undefined && selected_board != undefined" label='Поля карточки'
						id='boards_fields' :parent_name="'board'" clearable="false"
						:value="get_json_val(selected_board, 'boards_fields')" :values="fields_values"
						:parameters="{ multiple: true }"></SelectInput>

					<BooleanInput 
					v-show = "$store.state['common'].use_sprints"
					label='Использовать фильтр по спринтам' id='use_sprint_filter'
						:value="get_json_val(selected_board, 'use_sprint_filter')" :parent_name="'board'"
						@update_parent_from_input="make_swimlanes"></BooleanInput>

					<SelectInput label='Поле цвета (функция в разработке)' id='fields' disabled="true"
						:parent_name="'board'" clearable="false" :values="[]" multiple: false></SelectInput>


					<div class="table_card_footer">
						<KButton name="Сохранить" class="table_card_footer_btn" :func="'save_board'"
							@click="configs_open = false" />
						<KButton name="Отменить" class="table_card_footer_btn" @click="configs_open = false" />
					</div>

				</div>

			</div>

		</div>

		<GptPanel
          v-if="!loading && id !== '' && !$store.state['common']['is_mobile']"
          :context="boards_issues"
        />


	</div>
</template>

<style lang="scss">
@import '../css/palette.scss';
@import '../css/global.scss';

$cards_field_left: 20px;

#boards_table_panel,
#boards_card {
	height: calc(100vh - $top-menu-height);
	
}

#boards_table_panel {
	display: flex;
	width: calc(100%);
}

#save_boards_btn,
#delete_boards_btn {
	padding: 0px 20px 15px 20px;
	width: 50%
}

#save_boards_btn input,
#delete_boards_btn input {
	width: 100%
}

#board_down_panel {
	padding-right: 7px;
	display: flex;
	flex-direction: column;
	height: calc(100vh - $top-menu-height);
	background: transparent;

	overflow-y: scroll;
    overflow-x: hidden;
}

#board_down_panel::-webkit-scrollbar {
	//display:none;
}

.board-config {
	padding: 20px;
}

.board-config>*:not(:last-child) {
	margin-bottom: 10px;
}



.status-board-collumn {
	width: calc((100vw - $main-menu-width - $cards_field_left * 2) / v-bind('boards_columns.length'));
	height: 150px;

	margin: 2px;
	height: 100%;
	text-align: center;
}

.status-board-collumn-dragging-to {
	border-style: solid;
	border-width: 1px;
	border-radius: var(--border-radius);
}

.issue-board-cards-container {
	background: var(--group-bg-color);
	border-radius: var(--border-radius);
	border-color: var(--disabled-bg-color);
	border-style: none;
	overflow: scroll;
	height: 100%;
	margin: 5px;
	display: flex;
	flex-direction: column;
	overflow: visible;
}

.issue-board-cards-container::-webkit-scrollbar {
	display: none;
}

.issue-board-card {
	display: flex;
	flex-direction: column;
	width: calc(100%); //190px;
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

.dragged-card {
	border-style: dashed;
}

.when-dragged-card {
	cursor: grabbing !important;
}

.issue-card-title {
	height: auto;
	display: flex;
	flex-direction: column;

	overflow: hidden;
	padding: 5px;
}

.issue-card-title div {
	display: flex;
	width: 100%;
}

.issue-card-title span {
	width: 100%;
}

.issue-card-title a {
	color: var(--link-color);
	margin: 0px 4px 4px 4px;
	white-space: nowrap;
}

.issue-card-title label {
	cursor: text;
	font-weight: 500;
}

.issue-card-description {
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

.issue-card-top {
	width: 100%;
	height: 5px;
	border-top-left-radius: var(--border-radius);
	border-top-right-radius: var(--border-radius);
	opacity: 0.4;
	background: gray;
}

.issue-board-card-footer {
	width: 100%;
	// height: 12px;
	padding: 5px;
}


.board-name-input {
	padding: 0px 20px 10px 0px;
}

* {
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

.board-query-info {
	padding: 0px 20px 10px 0px;
	width: 500px;

}

.board-sprint-filter {
	padding: 0px 20px 10px 0px;
	display: flex;

}

.board-sprint-filter-string {

	width: 300px;
	padding: 0px;
}

.board-sprint-filter-btn {
	cursor: pointer;
	width: $font-size;
	height: $input-height;
	border-radius: var(--border-radius);
	margin: 0 0 0 2px !important;
	padding-top: 0px;
	font-size: 20px;
	font-weight: 400;
}

.board-sprint-filter-btn:hover {
	background: var(--table-row-color-selected);

}

.board-sprint-filter-string input {
	margin: 0px !important;
}

.swimlane {
	width: 100%;
	display: flex;
	flex-direction: column;
}



.swimlane-head,
.swimlane-total {
	width: 100%;
	display: flex;
	border-radius: var(--border-radius);
	background: var(--disabled-bg-color);
	margin: 4px;
	margin-bottom: 1px;
}

.swimlane-total {
	height: 1.2*$input-height;
	min-height: 1.2*$input-height;
	max-height: 1.2*$input-height;
}

.swimlane-head {
	height: $input-height;
	margin-top: var(--border-width);
}

.swimlane-head span,
.swimlane-total span,
.swimlane-head a {
	padding: 0px 10px 10px 10px;
	margin: 5px;
	font-size: 14px;
}

.swimlane-total span {
	font-size: 15px;
}


.swimlane-body {
	width: 100%;
	display: flex;
	overflow: hidden;
	margin-left: $cards_field_left;
}

.swimlane-body-closed * {
	height: 0 !important;
	overflow: hidden !important;
}

.swimlane-body-closed {
	height: 0;
	padding: 0;
	margin: 0;
}

.swimlane-expander {
	cursor: pointer;
}


.swimlane-drag-dots {}

.swimlane-drag-dots i {
	font-size: 22px;
	margin: 6px;
}

.dragged-swimlane {
	//cursor: grabbing;
}



#issue_types_table_panel {
	padding: 10px 0px 0px 0px;
}



.issue-card-description {}


.board-card-field {
	display: flex;
	padding-bottom: 2px;
}

.board-card-field .numeric {
	display: flex;
}

.board-card-field-input .label {
	height: 0px !important;
	max-height: 0px !important;
	min-height: 0px !important;
	font-size: 11px !important;
}

.board-card-field-input {
	height: 15px !important;
	width: 100%;
}

.board-card-field-input img {
	width: 11px !important;
	height: 11px !important;
	max-height: 11px !important;
	min-height: 11px !important;
}

.board-card-field-input * {

	//height: 15px !important;
	//max-height: 15px !important;
	//min-height: 15px !important;


}

.board-card-field-input svg {
	display: none;
}

.board-card-field-input span {
	margin: 0px !important;
}


.board-card-field * {
	font-size: 11px !important;
}


.board-card-field-input input,
.board-card-field-input textarea,
.board-card-field-input .vs__dropdown-toggle,
.board-card-field-input .vs__selected {
	height: 15px !important;
	max-height: 15px !important;
	min-height: 15px !important;
	font-size: 11px !important;
	background: none !important;
	border: none !important;
}

.board-card-field-input textarea {
	padding-top: 0 !important;
	padding-bottom: 0 !important;
}


.board-card-field-input .vs__dropdown-menu {
	//position: absolute !important;
	z-index: 200;
}

.board-card-field-title {
	white-space: nowrap;
}

.new-issue-card-btn {
	font-size: 18px;
	font-weight: 700 !important;
	position: relative;
	text-decoration: none;
	border-radius: 50%;
	border-style: solid;
	border-width: 2px;
	width: 18px;
	height: 18px;
	align-items: center;
	display: flex !important;
	padding-left: 2px;
	align-self: center;
	margin: 0;
	align-content: end;
	flex-wrap: wrap;
	cursor: pointer;
	color: var(--link-color);
}


.board-card-frame {
	position: absolute;
	top: $top-menu-height;
	bottom: 0;
	right: 0;
	width: 450px;
	background: var(--loading-bg-color);
	border: none;
	padding: 10px;
}

.board-card-frame-closed {
	width: 0px;
	padding: 0px;
}

.board-card-frame div {
	width: 100%;
	height: 100%;

	border-radius: var(--border-radius);

	background: var(--panel-bg-color);
	border-radius: var(--border-radius);
	border-color: var(--border-color);
	border-width: 1px;
	border-style: groove;
}



.board-card-frame iframe {
	width: 100%;
	height: 100%;
	z-index: 1;
	position: relative;

	background: var(--panel-bg-color);
	border-radius: var(--border-radius);
	border-color: var(--border-color);
	border-width: 1px;
	border-style: groove;

	border: none;
}

.board-card-frame i {
	position: absolute;
	right: 0;
	z-index: 1;
	font-size: 32px;
	margin: 13px;
	cursor: pointer;
	margin-right: 23px;
}

.issue-board-card .bx-window-open,
.swimlane-head .bx-window-open {
	font-size: 20px;
	cursor: pointer;
	opacity: 0;
}

.swimlane-head .bx-window-open {
	padding-top: 5px;
}

.issue-board-card:hover .bx-window-open,
.swimlane-head:hover .bx-window-open {
	opacity: 1;
}

.selected-board-card .bx-window-open {
	opacity: 0 !important;
}


.gost-issue-card {
	border-radius: var(--border-radius);
	border-color: var(--border-color);
	border-width: 1px;
	border-style: dashed;
	margin-bottom: 5px;
	height: $input-height;
}

.filters-row {
	display: flex;
	margin: 10px 15px 5px 15px;
}

.filters-row .bx {
	font-size: 18px;
	padding-top: 3px;
}

.filters-row .bx-filter-alt {
	padding-right: 8px;
}



.filter .bx {
	font-size: 13px;
	padding: 3px 1px 1px 1px;
	opacity: 0;
	cursor: pointer;
}

.filter:hover .config-filter-btn {
	opacity: 1;
}

.filter .bx-cog {
	margin-top: 1px;
}


.config-filter-btn:hover {
	color: green
}

.add-filter-btn:hover {
	color: green;
	cursor: pointer;

}

.add-filter-btn {
	margin-left: 5px;
}

.filters-row .filter {
	border-radius: var(--border-radius);
	border-color: var(--border-color);
	border-width: 1px;
	border-style: solid;
	margin-left: 8px;
	height: 25px;
	padding: 1px 3px 1px 3px;
	cursor: pointer;
	display: flex;
}

.filters-row .filter span {
	padding: 0px 5px;
}

.filters-row .selected-filter {
	background-color: var(--button-color);
	box-shadow: var(--text-color) 0px 0px 1px;
}

.filters-row .filter:hover {
	box-shadow: var(--text-color) 0px 0px 3px;
}
</style>