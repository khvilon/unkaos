<script>

	import tools from '../tools.ts'
	import page_helper from '../page_helper.ts'
	import rest from '../rest.ts'

	let methods = {
		get_field_by_name: function(name)
		{
			
			console.log('histissue', this.issue)
			if(this.issue == undefined || this.issue.length != 1) return {}
			for(let i in this.issue[0].values) 
			{
				if(this.issue[0].values[i].label == name) return this.issue[0].values[i]
			}
		},
		get_fields_exclude_names: function(names)
		{
			console.log('histissue', this.issue)
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
				if(!match) fields.push(this.issue[0].values[i])
			}
			return fields
		},
		get_history: function()
		{
			console.log('histissue', this.issue)
			if(this.issue.length != 1) return ''
			let history = ''
			console.log('histissue', this.issue)

			this.issue[0].actions = this.issue[0].actions.sort(tools.compare_obj_dt('created_at')).reverse()

			for(let i in this.issue[0].actions)
			{
				if(i > 0) history += '\r\n\r\n'
				let action = this.issue[0].actions[i]
				let dt = tools.format_dt(action.created_at)
				history += dt + ' ' + action.author + ' ' + action.name + '\r\n' + action.value
			}

			//TODO
			this.available_transitions()
			this.$forceUpdate()

			return history
		},
		send_comment: async function()
		{
			let params = {}
			params.issue_uuid = this[this.name][0].uuid
			params.value = this.comment
			params.uuid = tools.uuidv4()

			let ans = await rest.run_method('upsert_issue_actions', params)

			let new_action = {
				name: '🗩', 
				created_at: new Date, 
				value: params.value,
				author: JSON.parse(localStorage.profile).name
			}
			
			this.issue[0].actions.unshift(new_action)

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
		available_transitions: function()
		{
			let workflow
			for(let i in this.workflows)
			{
				if(this.workflows[i].uuid == this.issue[0].workflow_uuid) {workflow = this.workflows[i]; continue}	
			}

			if(workflow == undefined) return []
			console.log('statusesstatusesstatuses0', workflow, this.issue[0].status_uuid)

			this.transitions = []
			for(let i in workflow.transitions)
			{
				if(workflow.transitions[i].status_from_uuid == this.issue[0].status_uuid) 
					this.transitions.push(workflow.transitions[i])
			}
			console.log('statusesstatusesstatuses1', this.transitions)


			this.statuses = []
			this.statuses_to = []
			for(let i in this.transitions)
			{
				let status_to_uuid = this.transitions[i].status_to_uuid
				console.log('statusesstatusesstatuses2', status_to_uuid)
				for(let j in workflow.workflow_nodes)
				{console.log('statusesstatusesstatuses3', workflow.workflow_nodes[j].issue_statuses[0].uuid)
					if(workflow.workflow_nodes[j].issue_statuses[0].uuid == status_to_uuid) 
					{
						this.statuses_to.push(workflow.workflow_nodes[j].issue_statuses[0])
						this.statuses.push(workflow.workflow_nodes[j].issue_statuses[0])
					}
					else if(workflow.workflow_nodes[j].issue_statuses[0].uuid == this.issue[0].status_uuid) 
					{
						this.statuses.push(workflow.workflow_nodes[j].issue_statuses[0])
					}
				}
			}

			//TODO
			this.issue_types = this.$store.state.issue_types.issue_types

			return this.transitions

			console.log('statusesstatusesstatuses', this.statuses_to)
		},
		get_type_uuid: function()
		{
			if(this.issue != undefined && this.issue[0] != undefined && this.issue[0].type_name != '') return this.issue[0].type_name
			if(this.issue_statuses != undefined) return Object.values(this.issue_statuses)[0].name
			return ''
		},
		get_types()
		{
			console.log('tyyyyypes', this.issue_types)
			if(this.issue_types == undefined) return []
			return this.issue_types
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
			
		}
    ],
	comment: '',
	comment_focused: false,
	transitions: [],
	statuses_to: [],
	statuses: [],
	loaded: false
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

	export default mod
</script>



<template ref='issue'>
    <div id="issue_top_panel" class="panel">
		<SelectInput
		v-if="issue != undefined || issue_types != undefined"
		label=""
		key="issue_type_input"
		:value="get_type_uuid()"
		:values="get_types()"
		:reduce= "obj => obj.uuid"
		:disabled="false"
		class="issue-type-input"
		:clearable="false"
		>
		</SelectInput>
		<StringInput 
		v-if="issue != undefined && issue[0] != undefined"
		key="issue_code"
		class='issue-code' 
		label='' 
		disabled="true"
		:value="id"
		>
		</StringInput>
		<SelectInput v-if="issue != undefined && issue[0] != undefined" label=""
		:value="issue[0].status_name"
		:values="statuses"
		:reduce= "obj => obj.uuid"
		:disabled="true"
		class="issue-status-input"
		:clearable="false"
		>
		</SelectInput>
		<KButton
		v-for="(transition, index) in transitions"
		:key="index"
		class="status-btn"
		:name="transition.name"
		:func="''"
		/>
	</div>


    <div id=issue_down_panel >
      <div id="issue_main_panel" class="panel" >
        
		<div class="issue-line">

		  <StringInput label='Название'
				:value="get_field_by_name('Название').value"
				class="issue-name-input"
			>
			</StringInput>
			<UserInput label="Автор"
				:value="get_field_by_name('Автор').value"
				:disabled="true"
				class="issue-author-input"
			>
			</UserInput>
		</div>

			<TextInput label='Описание'
				:value="get_field_by_name('Описание').value"
			>
			</TextInput>

			<TextInput label='Комментарий'
				v-if="issue != undefined && issue[0] != undefined"
				id="comment_input"
				@update_parent_from_input="update_parent_from_input"
				:value="comment"
				@input_focus="comment_focus"

			>
			</TextInput>


			<KButton
				v-if="issue != undefined && issue[0] != undefined"
			  	id="send_comment_btn"
			  	name='Отправить'
				v-bind:class="{ outlined: comment_focused }"
				@click="send_comment()"
			/>


			<TextInput label='История'
				v-if="issue != undefined && issue[0] != undefined"
				:value="get_history()"
				:disabled="true"
			>
			</TextInput>



      </div>
      <div id="issue_card" class="panel">

		<component  v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in get_fields_exclude_names(['Название', 'Описание', 'Автор'])"
				
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="input.value"
	  			:parent_name="'issue'"
	  			:disabled="input.disabled"
	  		></component>
        
        <div id="issue_card_footer_div" class="footer_div">
	  			<div id="issue_card_infooter_div">
			  		<KButton
			  			id="save_issue_btn"
			  			:name="'Сохранить'"
			  			:func="'save_issue'"
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
</template>





<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

	$card-width: 400px;
  $code-width: 160px;
  $author-input-width: 250px;

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
	width: calc(100% - $author-input-width)
}

.issue-author-input{
	width: $author-input-width;
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



    


</style>