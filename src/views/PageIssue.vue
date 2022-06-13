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
			return fields
		},
		add_action_to_history: async function(type, val)
		{
			if(this.issue[0] == undefined || this.issue[0].actions == undefined) return;
			const action_icons = 
			{
				comment: '🗩',
				edit: '🖉'
			}
			let new_action = {
				name: action_icons[type], 
				created_at: new Date, 
				value: val,
				author: JSON.parse(localStorage.profile).name
			}

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
		update_parent_from_input: function(val)
		{
			
			this.comment = val
		},
		comment_focus: function(val)
		{
			console.log('tyyyyypesffffff', this.$store.state.issue_types)
			this.comment_focused=val
		},
		available_transitions2: function()
		{
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

			console.log('this.statuses', this.statuses)

			//TODO
			//this.issue_types = this.$store.state.issue_types.issue_types

			return this.transitions

			//console.log('statusesstatusesstatuses', this.statuses_to)
		},
		get_type_uuid: function()
		{
			if(this.issue != undefined && this.issue[0] != undefined && this.issue[0].type_name != '') return this.issue[0].type_uuid
			if(this.issue_statuses != undefined) return Object.values(this.issue_statuses)[0].uuid
			return ''
		},
		get_types: function()
		{
			console.log('tyyyyypes', this.issue_types)
			if(this.issue_types == undefined) return []
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
		update_statuses: function(val)
		{
			console.log('uuuupppppaaarrrr', this.issue[0].status_uuid , val )

			//this.issue[0].status_uuid = val
			this.current_status = !this.current_status//val + '' + new Date()
			this.set_status(val)
			console.log(this.available_transitions)
		}

	}


  const data = 
  {
    name: 'issue',
    label: 'Поля',
    collumns:[
      
    ],
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
		}
    ],
	comment: '',
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
        "issue_uuid": "cf80f5b4-ba05-472e-80ea-4805ffc2f431",
        "table_name": "field_values",
        "issue_type_uuid": "94de7306-a8f2-40c5-9460-f927ebbb9062"
    },
    {
        "type": "User",
        "uuid": "d0bd2251-c88a-4731-b608-4d287684c215",
        "label": "Автор",
        "value": "9965cb94-17dc-46c4-ac1e-823857289e98",
        "field_uuid": "733f669a-9584-4469-a41b-544e25b8d91a",
        "issue_uuid": "cf80f5b4-ba05-472e-80ea-4805ffc2f431",
        "table_name": "field_values",
        "issue_type_uuid": "94de7306-a8f2-40c5-9460-f927ebbb9062"
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
			console.log('histissue', this.issue.length)
			if(this.issue.length != 1) return ''
			console.log('histissue2', this.issue.length)
			let history = ''

			let actions = tools.obj_clone(this.issue[0].actions)
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
			if(this.current_status) console.log('aa');
			

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

			console.log('this.statuses', this.statuses)

			//TODO
			//this.issue_types = this.$store.state.issue_types.issue_types

			return this.transitions

			//console.log('statusesstatusesstatuses', this.statuses_to)
		}

	export default mod
</script>



<template ref='issue'>
	<div>

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
		:disabled="issue[0]!=undefined"
		class="issue-type-input"
		:parameters="{clearable: false, reduce: obj => obj.uuid}"
		>
		</SelectInput>
		</Transition>
		<Transition name="element_fade">
		<SelectInput 
		v-if="!loading"
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
		<div v-if="!loading && transitions.length <= max_status_buttons_count" style="display: flex;">
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

	</div>


    <div id=issue_down_panel>
      <div id="issue_main_panel" class="panel" >
        
		<Transition name="element_fade">
		<div class="issue-line" v-if="!loading">

		  <StringInput label='Название'
			:value="get_field_by_name('Название').value"
			  class="issue-name-input"
              :id="'values.'+ get_field_by_name('Название').idx+'.value'"
              parent_name='issue'
			>
			</StringInput>
			<SelectInput
			label='Проект'
			key="issue_project_input"
			:value="issue[0].project_uuid"
			:values="projects"
			:disabled="false"
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
			<TextInput label='Комментарий' v-if="!loading"
				id="comment_input"
				@update_parent_from_input="update_parent_from_input"
				:value="comment"
				@input_focus="comment_focus"

			>
			</TextInput>
			</Transition>
		

			<Transition name="element_fade">
			<KButton
				v-if="!loading"
			  	id="send_comment_btn"
			  	name='Отправить'
				v-bind:class="{ outlined: comment_focused }"
				@click="send_comment()"
			/>
			</Transition>

			<Transition name="element_fade">
			<TextInput label='История'
				v-if="!loading"
				:value="history"
				:disabled="true"
			>
			</TextInput>

			</Transition>



      </div>
      <div id="issue_card" class="panel">
		  <Transition name="element_fade">
		  <div id="issue_card_scroller" v-if="!loading">
		<component  v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in get_fields_exclude_names(['Название', 'Описание', 'Автор'])"
				
	  			:label="input.label"
	  			:key="index"
	  			:id="'values.'+ input.idx+'.value'"
	  			:value="input.value"
	  			:parent_name="'issue'"
	  			:disabled="input.disabled"
	  		></component>

			
			  <UserInput label="Автор"
				:value="get_field_by_name('Автор').value"
				:disabled="true"
				class="issue-author-input"
			>
			</UserInput>

			

			</div>
			</Transition>
			
        
        <div id="issue_card_footer_div" class="footer_div">
	  			<div id="issue_card_infooter_div">
			  		<KButton
			  			id="save_issue_btn"
			  			:name="'Сохранить'"
			  			:func="'save_issue'"
						:click="add_action_to_history('edit', '')"
			  		/>
			  		<KButton
			  			id="delete_issue_btn"
			  			:name="'Удалить'"
			  			:func="'delete_issue'"
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
    display: table;
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
}

	#issue_card_scroller
	{
	 height: calc(100vh - $top-menu-height);
	overflow-y: scroll;
	}
	 #issue_card_scroller::-webkit-scrollbar{
    display:none;
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