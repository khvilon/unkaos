<script>
	
	import page_helper from '../page_helper.ts'
	import query_parser from '../query_parser.ts'

	import d from '../dict.ts'
	import rest from '../rest';

	console.log('d', d['Название'],d)

	let methods = {
		get_issues: async function(qyery)
			{
				this.issues = await rest.run_method('read_issues')
			},
			filtered_issues: function(status_uuid)
			{
				return this.issues.filter(issue => issue.status_uuid == status_uuid);
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
		},
    ]
  }
     
  const mod = await page_helper.create_module(data, methods)

  mod.mounted = methods.get_issues

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
		:disabled="false"
		>
		</StringInput>
		<IssuesSearchInput
		label=""
		class='issue-search-input'
		@update_parent_from_input="update_search_query"
		:fields="fields"
		>

		</IssuesSearchInput>
		<KButton 
		name='bx-search-alt-2'
		class='issue-search-input-btn'
		@click="search()"
		/>
		
	
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
				:href="'/issue/' + issue.project_short_name + '-' + issue.num">{{issue.project_short_name}}-{{issue.num}}</a>&nbsp
				<label>{{issue.type_name}}</label>&nbsp
				<label>{{get_field_by_name(issue, 'Название').value}}</label>
				</div>
				<label class="issue-card-description">{{get_field_by_name(issue, 'Описание').value.substring(0, 100)}}</label>
				<div class="issue-board-card-footer">
					<div><label>{{get_field_by_name(issue, 'Приоритет').label}}: {{get_field_by_name(issue, 'Срок выполнения').value}}</label></div>
				</div>
				
			</div>
			</div>
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

  #board_down_panel {
    display: flex;
	height: calc(100vh - $top-menu-height);
	//overflow:scroll;
  }

  .issue-search-input textarea{
	  padding: 0px !important;

  }
  .issue-search-input{
	  padding: 0px !important;
	  width: 50vw;
  }
  .issue-search-input-btn{
	  padding: 0px;
	  width: $input-height;
  }
  .issue-search-input-btn .btn_input{
	  padding: 0px;
	  border-top-left-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
	margin-left: -$input-height;
	width: $input-height !important;

	border-top-width: 0px !important;
	border-bottom-width: 2px !important;
	border-left-color: $border-color !important;
    border-top-color: $border-color !important;
	//border-bottom-color: $border-color !important;

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
	height: 150px;

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
	  height: 20px;
  }

  .issue-card-description
  {
	  height: 100px;
	  border-top-color: $table-row-color;
	  border-bottom-color: $table-row-color;
	  border-top-width: 2px;
	  border-top-style: solid;
	  border-bottom-width: 2px;
	  border-bottom-style: solid;
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
	  height: 25px;
		

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



</style>