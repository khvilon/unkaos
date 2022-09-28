<script>

	import tools from '../tools.ts'
	import page_helper from '../page_helper.ts'
	import rest from '../rest.ts'

	let methods = {
		get_field_by_name: function(name)
		{
			console.log('get_field_by_name', name)
			if(this.issue == undefined || this.issue.length != 1) return {}
			for(let i in this.issue[0].values) 
			{
				if(this.issue[0].values[i].label == name) 
				{
					this.issue[0].values[i].idx = i
					return this.issue[0].values[i]
				}
			}	
		},
		get_fields_exclude_names: function(names)
		{
			console.log('get_fields_exclude_names', names)
			let fields = []
			if(this.issue == undefined || this.issue.length != 1) return {}
			for(let i in this.issue[0].values) 
			{
				let match = false
				for(let j in names)
				{
					if(this.issue[0].values[i].label == names[j])
					{
						match = true
						continue
					}
				}

			//	console.log('get_fields_exclude_names1', this.issue[0].values[i].label, match)
				this.issue[0].values[i].idx = i
				if(!match) 
				{
					if(this.issue[0].values[i].uuid == null) 
					{
						this.issue[0].values[i].uuid = tools.uuidv4()
						//this.$store.commit('id_push_update_' + issue, {id: 'values.' + i + '.uuid', val:this.issue[0].values[i].uuid})
					}
					fields.push(this.issue[0].values[i])
				}
			}
		//	console.log('get_fields_exclude_names2', fields)
			return fields
		},
		add_action_to_history: async function(type, val)
		{

			console.log('add_action_to_history', type, val)
			if(this.issue[0] == undefined || this.issue[0].actions == undefined) return;
			const action_icons = 
			{
				comment: '🗩',
				edit: '🖉',
				transition: '⤞'
			}
			let new_action = {
				name: action_icons[type], 
				created_at: new Date(), 
				value: val,
				author: JSON.parse(localStorage.profile).name
			}


			console.log('aaaaaction', new_action)

			this.issue[0].actions.unshift(new_action)
		},
		send_comment: async function()
		{
			let params = {}
			params.issue_uuid = this[this.name][0].uuid
			params.value = this.comment
			params.uuid = tools.uuidv4()

			let ans = await rest.run_method('upsert_issue_actions', params)

			this.add_action_to_history('comment', params.value)

			this.comment = ''
		},
		update_comment: function(val)
		{
			
			this.comment = val
		},
		comment_focus: function(val)
		{
		//	console.log('tyyyyypesffffff', this.$store.state.issue_types)
			this.comment_focused=val

			
		},
		get_type_uuid: function()
		{
			if(this.issue != undefined && this.issue[0] != undefined && this.issue[0].type_name != '') return this.issue[0].type_uuid
			if(this.issue_statuses != undefined) return Object.values(this.issue_statuses)[0].uuid
			return ''
		},
		get_types: function()
		{
	//		console.log('tyyyyypes', this.issue_types)
			if(this.issue_types == undefined) return []
			this.update_type(this.issue[0].type_uuid)
			return this.issue_types
		},
		set_status: function(status_uuid)
		{
		
			this.issue[0].status_uuid = status_uuid
			
		},
		get_status: function()
		{
			if(this.issue == undefined) return ''
			//if(this.issue[0] == undefined) return ''
			
			return this.issue[0].status_uuid
		},
		get_formated_relations: async function()
		{

			console.log('try iii', this.issue)
			if(this.issue == undefined || this.issue[0] == undefined)
			{
				setTimeout(this.get_formated_relations, 200)
				console.log('try iii1', JSON.stringify(this.issue), this.issue)
				return
			}

			console.log('try iii2', this.issue)

			
			let uuid = this.issue[0].uuid
			this.formated_relations = (await rest.run_method('read_formated_relations', {current_uuid: uuid}))

			console.log('this.formated_relations', this.formated_relations)
			
		},
		update_statuses: async function(val)
		{
	//		console.log('uuuupppppaaarrrr', this.issue[0].status_uuid , val )

			//this.issue[0].status_uuid = val
			this.current_status = !this.current_status//val + '' + new Date()
			this.set_status(val)
	//		console.log(this.available_transitions)

			let status_name
			for(let i in this.statuses)
			{
				if(this.statuses[i].uuid == val) 
				{
					status_name = this.statuses[i].name
					continue
				}
			} 

			this.$store.state['issue']['selected_issue'].status_name = status_name
			this.$store.state['issue']['issue'][0].status_name = status_name
			this.$store.state['issue']['filtered_issue'][0].status_name = status_name

			this.add_action_to_history('transition', '->' + status_name)

			let ans = await this.$store.dispatch('save_issue');
		},
		update_type: function(type_uuid)
		{
			if(this.id!= '') return

			this.$store.commit('id_push_update_issues', {id: 'type_uuid', val:type_uuid})
	//		console.log('update_type', type_uuid)

			let issue_type
			for(let i in this.issue_types)
			{
				if(this.issue_types[i].uuid == type_uuid)
				{
					issue_type = this.issue_types[i]
					continue
				}
			}

	//		console.log('update_type2', issue_type)

			let values = []
			for(let i in issue_type.fields)
			{
				values.push({
					type: issue_type.fields[i].type[0].code,
					uuid: tools.uuidv4(),
					label: issue_type.fields[i].name,
					value: '',
					field_uuid: issue_type.fields[i].uuid,
					table_name: "field_values",
					issue_uuid: this.issue[0].uuid
				})
			}

			this.$store.state['issue']['selected_issue'].values = values
			this.$store.state['issue']['issue'][0].values = values
			this.$store.state['issue']['filtered_issue'][0].values = values

			this.$store.state['issue']['selected_issue'].type_uuid = type_uuid
			this.$store.state['issue']['issue'][0].type_uuid = type_uuid
			this.$store.state['issue']['filtered_issue'][0].type_uuid = type_uuid

	//		console.log('update_type3', values)
		},
		saved: function(issue)
		{
			this.add_action_to_history('edit', '')
			if(this.id!='') return
			
			//this.$router.push('/issue/' + issue[0].project_short_name + '-' + issue[0].num)
			window.location.href = '/issue/' + issue[0].project_short_name + '-' + issue[0].num

			//setTimeout(this.init, 1000)
		},
		deleted: function(issue)
		{
			window.location.href = '/issues/'
		},
		add_attachment: async function(att)
		{
			att.issue_uuid = this.issue[0].uuid
			this.$store.state['issue']['selected_issue'].attachments.push(att)
			let ans = await rest.run_method('upsert_attachments', att)
		},
		delete_attachment: async function(att)
		{
			let attachments = this.$store.state['issue']['selected_issue'].attachments
			for(let i in attachments)
			{
				if(attachments[i].uuid == att.uuid) 
					this.$store.state['issue']['selected_issue'].attachments.splice(i, 1)
			}
			let ans = await rest.run_method('delete_attachments', att)
		},
		get_available_values: function(field_uuid)
		{
	//		console.log('get_available_values', field_uuid)

			for(let i in this.fields)
			{
				if(this.fields[i].uuid == field_uuid)
				{
					if(this.fields[i].available_values == undefined) return
					let available_values = this.fields[i].available_values.split(',').map((v) => v.replace('\n', '').replace('\r', '').trim())
					return available_values
				}
			}
			return [1,2,3,6]
		},
		delete_relation: async function(relation_uuid)
		{
			for(let i in this.formated_relations)
			{
				if(this.formated_relations[i].uuid == relation_uuid) 
				{
					delete this.formated_relations[i]
				}
			}

			let ans = await rest.run_method('delete_relations', {uuid: relation_uuid})
		},
		add_relation: async function(options)
		{
			this.new_relation_modal_visible=false

			await rest.run_method('upsert_relations', options)
			this.get_formated_relations()

		},
		init: async function(delay)
		{
			if(this.issue==undefined || this.issue[0] == undefined )
			{
				setTimeout(this.init, 200)
				return
			}

			let ans = await rest.run_method('read_watcher', {issue_uuid: this.issue[0].uuid})
			this.watch = ans.length > 0
		},
		togle_watch: function()
		{
			if(this.watch) rest.run_method('delete_watcher', {issue_uuid: this.issue[0].uuid})	
			else rest.run_method('upsert_watcher', {issue_uuid: this.issue[0].uuid})	
			this.watch = !this.watch
		}


		

	}


  const data = 
  {
    name: 'issue',
    label: 'Поля',
	new_relation_modal_visible: false,
	relation_types: [],
    collumns:[
      
    ],
	formated_relations: [],
    inputs: [
		{
			label: 'Воркфлоу',
			id: 'workflow_uuid',
			dictionary: 'workflows',
			type: 'Select',
		},
		{
			label: 'Типы задач',
			id: 'type_uuid',
			dictionary: 'issue_types',
			type: 'Select',
			clearable:"false"
		},
		{
			label: 'Проекты',
			id: 'project_uuid',
			dictionary: 'projects',
			type: 'Select',
			clearable:"false"
		},
		{
			label: 'Поля',
			id: 'field_uuid',
			dictionary: 'fields',
			type: 'Select',
			clearable:"false"
		},
		{
			label: 'Спринты',
			id: 'sprint_uuid',
			dictionary: 'sprints',
			type: 'Select',
			clearable:"true"
		}
    ],
	comment: '',
	watch: false,
	comment_focused: false,
	transitions: [],
	statuses_to: [],
	statuses: [],
	max_status_buttons_count: 2,
	current_status: true,
	instance: {values:[
    {
        "type": "Text",
        "uuid": "008e6daf-eb79-48c0-bd13-69b779c268ee",
        "label": "Описание",
        "value": "",
        "field_uuid": "4a095ff5-c1c4-4349-9038-e3c35a2328b9",
        "issue_uuid": "",
        "table_name": "field_values",
    },
    {
        "type": "String",
        "uuid": "c5098dbf-0f12-4352-afb6-0a1279dcc1c4",
        "label": "Название",
        "value": "",
        "field_uuid": "c96966ea-a591-47a9-992c-0a2f6443bc80",
        "issue_uuid": "",
        "table_name": "field_values",
    },
    {
        "type": "User",
        "uuid": "d0bd2251-c88a-4731-b608-4d287684c215",
        "label": "Автор",
        "value": "9965cb94-17dc-46c4-ac1e-823857289e98",
        "field_uuid": "733f669a-9584-4469-a41b-544e25b8d91a",
        "issue_uuid": "",
        "table_name": "field_values",
    }
]}
  }
     
  const mod = await page_helper.create_module(data, methods)

  mod.props =
    {
      id:
      {
        type: String,
        default: ''
      }
    }

	
		
	

	mod.computed.history = function()
		{
	//		console.log('histissue', this.issue.length)
			if(this.issue.length != 1) return ''
	//		console.log('histissue2', this.issue.length)
			let history = ''

			let actions = tools.obj_clone(this.issue[0].actions)

			console.log('aaactions', actions)
			actions = actions.sort(tools.compare_obj_dt('created_at'))
			actions = actions.reverse()
			
			for(let i in actions)
			{
				if(i > 0) history += '\r\n\r\n'
				let action = actions[i]
				let dt = tools.format_dt(action.created_at)
				history += dt + ' ' + action.author + ' ' + action.name + '\r\n' + action.value
			}

			//this.available_transitions()

			return history
		}


		mod.computed.available_transitions =  function()
		{
	//		if(this.current_status) console.log('aa');
			

			let workflow
			for(let i in this.workflows)
			{
				if(this.workflows[i].uuid == this.issue[0].workflow_uuid) {workflow = this.workflows[i]; continue}	
			}

			if(workflow == undefined) return []
			//console.log('statusesstatusesstatuses0', workflow, this.issue[0].status_uuid)

			this.transitions = []
			for(let i in workflow.transitions)
			{
				if(workflow.transitions[i].status_from_uuid == this.issue[0].status_uuid) 
					this.transitions.push(workflow.transitions[i])
			}
			//console.log('statusesstatusesstatuses1', this.transitions)


			let curr_status = {}
			this.statuses = []
			this.statuses_to = []

			for(let j in workflow.workflow_nodes)
			{
				for(let i in this.transitions)
				{
					let status_to_uuid = this.transitions[i].status_to_uuid
					
					if(workflow.workflow_nodes[j].issue_statuses[0].uuid == status_to_uuid) 
					{
						this.statuses_to.push(workflow.workflow_nodes[j].issue_statuses[0])
						this.statuses.push(workflow.workflow_nodes[j].issue_statuses[0])
					}
				}

				if(workflow.workflow_nodes[j].issue_statuses[0].uuid == this.issue[0].status_uuid) 
				{
					curr_status = workflow.workflow_nodes[j].issue_statuses[0]
					
				}
			}

			this.statuses.push(curr_status)

	//		console.log('this.statuses', this.statuses)

			//TODO
			//this.issue_types = this.$store.state.issue_types.issue_types

			return this.transitions

			//console.log('statusesstatusesstatuses', this.statuses_to)
		}

		mod.mounted = async function()
		{
			let rt = await rest.run_method('read_relation_types')

			this.relation_types = []

			for(let i in rt)
			{
				this.relation_types.push({uuid: rt[i].uuid, name: rt[i].name, is_reverted: false})
				if(rt[i].name == rt[i].revert_name) continue 
				this.relation_types.push({uuid: rt[i].uuid, name: rt[i].revert_name, is_reverted: true})
			}

			this.get_formated_relations()

			this.init()	
		}

	export default mod
</script>



<template ref='issue'>
	<div>

	<Transition name="element_fade">
			<KNewRelationModal 
				v-if="new_relation_modal_visible" 
				@close_new_relation_modal="new_relation_modal_visible=false"
				@relation_added="add_relation"
				:relation_types="relation_types"
				:issue0_uuid="issue[0].uuid"
				
			/>
		

	</Transition>

    <div id="issue_top_panel" class="panel">
		<Transition name="element_fade">
		<StringInput 
		v-if="!loading"
		key="issue_code"
		class='issue-code' 
		label='' 
		:disabled="true"
		:value="id"
		>
		</StringInput>
		</Transition>
		<Transition name="element_fade">
		<SelectInput
		v-if="!loading"
		label=""
		key="issue_type_input"
		:value="get_type_uuid()"
		:values="get_types()"
		:disabled="id!=''"
		class="issue-type-input"
		:parameters="{clearable: false, reduce: obj => obj.uuid}"
		@update_parent_from_input="update_type"
		>
		</SelectInput>
		</Transition>
		<Transition name="element_fade">
		<SelectInput 
		v-if="!loading && id!=''"
		label=""
		:value="get_status()"
		:values="statuses"
		:disabled="transitions.length <= max_status_buttons_count"
		class="issue-status-input"
		:parameters="{clearable: false, reduce: obj => obj.uuid}"
		@update_parent_from_input="update_statuses"
		>
		</SelectInput>
		</Transition>

		<Transition name="element_fade">
		<div v-if="!loading && id!='' && transitions.length <= max_status_buttons_count" style="display: flex;">
		<KButton
		v-for="(transition, index) in available_transitions" 
		:key="index"
		class="status-btn"
		:name="transition.name"
		:func="''"
		@click="set_status(transition.status_to_uuid)"
		/>
		</div>
		
		</Transition >

		<Transition name="element_fade">
		<div v-if="!loading && id!=''" style="display: flex;" class="clone-btn">
		<KButton
		
		name="🐑➠🐑"	
		/>
		</div>	
		</Transition >


		<Transition name="element_fade">
		<div v-if="!loading && id!=''" style="display: flex;" class="new-issue-btn">
		<KButton
		@click="$router.push('/issue')"
		name="➕"	
		/>
		</div>	
		</Transition >

		<Transition name="element_fade">
		<div v-if="!loading && id!=''" style="display: flex;" class="watch" :class="{'watch-active' : watch}"
		@click="togle_watch">
			👁
		</div>	
		</Transition >

		
		
		

	</div>


    <div id=issue_down_panel>
      <div id="issue_main_panel" class="panel" >
        
		<Transition name="element_fade">
		<div class="issue-line" v-if="!loading">

		  <StringInput label='Название'
			:value="get_field_by_name('Название').value"
			  class="issue-name-input"
			  :class="{'issue-name-input-full': id!=''}"
              :id="'values.'+ get_field_by_name('Название').idx+'.value'"
              parent_name='issue'
			>
			</StringInput>
			<SelectInput
			v-if="id==''"
			label='Проект'
			key="issue_project_input"
			:value="issue[0].project_uuid"
			:values="projects"
			:disabled="id!=''"
			class="issue-project-input"
			:clearable="false"
			:parameters="{clearable: false, reduce: obj => obj.uuid}"
			id="project_uuid"
            parent_name='issue'
			>
			</SelectInput>
		</div>
		</Transition>

			<Transition name="element_fade">
			<TextInput label='Описание' v-if="!loading"
				:value="get_field_by_name('Описание').value"
				:id="'values.'+ get_field_by_name('Описание').idx+'.value'"
              	parent_name='issue'
			>
			</TextInput>
			</Transition>


			<Transition name="element_fade">
			<KRelations
				v-if="!loading && id!=''"
				label=''
				id="issue-relations"
				@new_relation="new_relation_modal_visible=true"
				:formated_relations="formated_relations"
				@relation_deleted="delete_relation"
			>
			</KRelations>
			</Transition>

			<Transition name="element_fade">
			<KAttachment
				v-if="!loading && id!=''"
				label=''
				id="issue-attachments"
				:attachments="issue[0].attachments"
				@attachment_added="add_attachment"
				@attachment_deleted="delete_attachment"
			>
			</KAttachment>
			</Transition>
			

			<Transition name="element_fade">
			<TextInput label='Комментарий' v-if="!loading && id!=''"
				id="comment_input"
				@update_parent_from_input="update_comment"
				:value="comment"
				@input_focus="comment_focus"

			>
			</TextInput>
			</Transition>
		

			<Transition name="element_fade">
			<KButton
				v-if="!loading && id!=''"
			  	id="send_comment_btn"
			  	name='Отправить'
				v-bind:class="{ outlined: comment_focused }"
				@click="send_comment()"
			/>
			</Transition>

			<Transition name="element_fade">
			<TextInput label='История'
				v-if="!loading && id!=''"
				:value="history"
				:disabled="true"
			>
			</TextInput>

			</Transition>


			



      </div>
      <div id="issue_card" class="panel">
		  <Transition name="element_fade">
		  <div id="issue_card_scroller" v-if="!loading">

			<SelectInput label="Спринт"
			  	v-if="!loading && id!=''"
				class="issue-sprint-input"
				:value="issue[0].sprint_uuid"
				:parent_name="'issue'"
				:values="sprints"
				:parameters="{clearable: true, reduce: obj => obj.uuid}"
				id="sprint_uuid"
			>
			</SelectInput>


		<component  v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in get_fields_exclude_names(['Название', 'Описание', 'Автор'])"
				
	  			:label="input.label"
	  			:key="index"
	  			:id="'values.'+ input.idx+'.value'"
	  			:value="input.value"
	  			:parent_name="'issue'"
	  			:disabled="input.disabled"
				:values="get_available_values(input.field_uuid)"
	  		></component>

			
			  <UserInput label="Автор"
			  	v-if="!loading && id!=''"
				:value="get_field_by_name('Автор').value"
				:disabled="true"
				class="issue-author-input"
			>
			</UserInput>

			<DateInput label="Создана"
				:v-if="id!=''"
				:value="issue[0].created_at"
				:disabled="true"
			>
			</DateInput>

			

			</div>
			</Transition>
			
        
        <div id="issue_card_footer_div" class="footer_div">
	  			<div id="issue_card_infooter_div">
			  		<KButton
					  	v-if="!loading"
			  			id="save_issue_btn"
			  			:name="'Сохранить'"
			  			:func="'save_issue'"
						@button_ans="saved"
			  		/>
			  		<KButton
					  	v-if="!loading && id!=''"
			  			id="delete_issue_btn"
			  			:name="'Удалить'"
			  			:func="'delete_issue'"
						@button_ans="deleted"
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

	$card-width: 400px;
  $code-width: 160px;
  $project-input-width: 250px;

  #issue_top_panel
  {
	  height: $top-menu-height;
	  display: flex;
  }

	#issue_table_panel, #issue_card {
    height: calc(100vh - $top-menu-height);
	}

	.issue-code
	{
		width: $code-width
	}

	#issue_main_panel
	{
		display: block;
    	width: calc(100% - $card-width);
		overflow-y: scroll;
	}
	 #issue_main_panel::-webkit-scrollbar{
    display:none;
  }


  #issue_card {
    width:  $card-width;
    margin-left: 0px;
	display: flex;
    flex-direction: column;
  }

  

  #save_issue_btn, #delete_issue_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }


  #save_issue_btn input, #delete_issue_btn input{
  	width: 100%

  }

  #issue_down_panel {
    display: flex;
	height: calc(100vh - $top-menu-height);
	width: calc(100vw - $main-menu-width);
	position: absolute;
  }

.issue-line
	{
		display: flex;
	}

	.status-btn, .status-btn 
	{
		padding: 10px 20px 10px 20px;
	}
  .status-btn, .status-btn .btn_input
	{
		height: $input-height !important;
		
		width: 200px  !important;

		margin-right: 20px;
	}

.issue-name-input{
	width: calc(100% -  $project-input-width)
}

.issue-name-input-full
{
	width: 100%
}

.issue-author-input{
	
}

#send_comment_btn
{

    padding: 0px 20px 10px 20px;
    margin-top: -21px;
    border-top-left-radius: 0px;
}
#send_comment_btn .btn_input
{
	height: 25px;
    width: 100%;
    border-top-left-radius: 0px;
    border-top-right-radius: 0px;
	border-width: 1px;
	border-left-color: $border-color;
    border-top-color: $border-color
}

.comment_input
{
	border-bottom-left-radius: 0px;
    border-bottom-right-radius: 0px;
}

.outlined input
{
	outline: 1px solid;
}

.issue-type-input{
	width: 200px;
}

.issue-type-input, .issue-code, .issue-status-input
{
	padding-right: 0px !important;
	width: 200px;
	
}


.issue-type-input .vs__dropdown-toggle, .issue-status-input .vs__dropdown-toggle
{
	border-width: 1px !important;
}

.issue-project-input
{
	width:  $project-input-width;
}

#issue_card_infooter_div
{
	width: $card-width;
	position: relative !important;
}

	#issue_card_scroller
	{
	 height: calc(100vh - $top-menu-height);
	overflow-y: scroll;
	}
	 #issue_card_scroller::-webkit-scrollbar{
    display:none;
	 }

	 #issue-attachments{
		 width: 100%;
	 }

.clone-btn input{
	width: calc(2*$input-height) !important;
    margin: 10px 20px 10px 20px;
}
	 
.watch
{

	display: flex;
    font-size: 35px;
    margin-left: 20px;
    margin-top: 2px;
    color: $table-row-color-selected;
	cursor: pointer;
}

.watch-active
{
	color: $text-color
}




/*
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}*/
    


</style>