<script>
	
	import page_helper from '../page_helper.ts'
	import query_parser from '../query_parser.ts'

	import d from '../dict.ts'
	import rest from '../rest';

	console.log('d', d['Название'],d)

	let methods = {
		get_issues: async function(query)
			{

				console.log('get issues with query ', query)
				let options = {}
				if(query != undefined && query != '') options.query = query
				this.issues = await rest.run_method('read_issues', options)
			},
			filtered_issues: function(status_uuid)
			{
				return this.issues != undefined ? this.issues.filter(issue => issue.status_uuid == status_uuid) : [];
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
				console.log('dddddrrrr', el, e)
			
				this.card_draginfo = el
			},
			dragend_card: function()
			{
			
				console.log('dddddrrrr end')
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
					console.log('moving2')
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
				console.log('drop')
				
			},
		}

	const data = 
  {
	card_draginfo: {},
	status_draginfo: {},
    name: 'board',
    label: 'Доска',
	search_query: '',
	issues: [],
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
			label: 'issue_statuses',
			id: '',
			dictionary: 'issue_statuses',
			type: 'User',
		}
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

  mod.mounted = methods.get_issues

  mod.computed.board_query_info = function(){
	  let board_query_info = this.search_query
	  if(this.search_query == '')
	return this.search_query + ' ' + this.issues.length
  }

	export default mod
	
</script>



<template ref='board' >
<div @mouseup="dragend_card()">
	
    <div class='panel topbar'>
		<div style="display: flex ; flex-direction:row; flex-grow: 1; max-height: calc(100% - 60px); ">
		<StringInput 
		v-if="board != undefined && board[0] != undefined"
		label=''
		key="board_name"
		class="board-name-input"
		:value="board[0].name"
		:disabled="!configs_open"
		>
		</StringInput>
		<StringInput class="board-query-info"
		v-if="board != undefined && board[0] != undefined"
		label=''
		disabled="true"
		:value="board_query_info"
		>
			
		</StringInput>
		
		
		<i class='bx bx-dots-vertical-rounded top-menu-icon-btn'
		@click="configs_open=!configs_open"
		></i>
		<i class='bx bx-trash top-menu-icon-btn delete-board-btn'></i>
		
	
		
		
	
		</div>
	</div>

	

    <div id=board_down_panel class="panel">
	 
	  	<div 
		  v-for="(status, s_index) in issue_statuses"
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
				v-for="(issue, i_index) in filtered_issues(status.uuid)"
				:key="i_index"
				:class="{ 'dragged-card': issue.uuid ==  card_draginfo.uuid, 'when-dragged-card': card_draginfo.uuid != undefined}"
				
				@mousedown="dragstart_card($event, issue)"
				class="issue-board-card">
				<div class="issue-card-top"></div>
				<div class="issue-card-title">
				<a 
				:href="'/issue/' + issue.project_short_name + '-' + issue.num">{{issue.project_short_name}}-{{issue.num}} {{issue.type_name}}</a>
				
				<label>{{get_field_by_name(issue, 'Название').value}}</label>
				</div>
				<label class="issue-card-description">{{get_field_by_name(issue, 'Описание').value.substring(0, 100)}}</label>
				<div class="issue-board-card-footer">
					<div><label>{{get_field_by_name(issue, 'Приоритет').label}}: {{get_field_by_name(issue, 'Срок выполнения').value}}</label></div>
				</div>
				
			</div>
			</div>
		</div>

		<div class="modal-bg" v-show="configs_open">
		<div
			class="panel modal board-config"
		>  

		<IssuesSearchInput
		label=""
		class='board-issue-search-input'
		@update_parent_from_input="update_search_query"
		:fields="fields"
		@search_issues="get_issues"
		:projects="projects"
		:issue_statuses="issue_statuses"
		:issue_types="issue_types"
		:users="users"
		:disabled="!configs_open"
		>

		</IssuesSearchInput>
		
		<SelectInput 
	  		
			label='Поля'
			id='fields'
			
			:parent_name="'board'"
			clearable="false"
			dictionary= 'fields'
			:values="[]"
			multiple: true
		></SelectInput>

	
		<div class="btn-container">
		<KButton 
		name="Сохранить"
		id="save-board-config-btn"
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
	height: calc(100vh - $top-menu-height);
	//overflow:scroll;
  }


  .status-board-collumn{
	width: calc((100vw - $main-menu-width) / v-bind('issue_statuses.length'));
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
	width: 50vw;
}





</style>