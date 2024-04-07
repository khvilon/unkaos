<script>
import page_helper from "../page_helper.ts";

import { gadgetConfigMixin } from './gadgetConfigMixin';

let methods = {
	updateSprint(val){
		this.currentConfig.sprint=val; 
		console.log('>>>sprint', val)
		if(!val) return;
		this.currentConfig.from = val.start_date;
		this.currentConfig.to = val.end_date;
	}
}

const data =
{
	curr_sprint_num: 0,
	query: '',
	encoded_query: '',
	burndown_issues: [],	
	inputs: [

		{
			id: '',
			dictionary: 'issue_statuses',
			type: 'User',
		},
		{
			id: 'issue_tags',
			dictionary: 'issue_tags',
			type: 'Tag',
		},
		{
			id: '',
			dictionary: 'fields',
			type: 'Select',
		},
		{
			id: '',
			dictionary: 'users',
			type: 'User',
		},
		{
			id: '',
			dictionary: 'projects'
		},
		{
			id: '',
			dictionary: 'issue_types'
		},      
    {
      label: "sprints",
      id: "",
      dictionary: "sprints",
    }
	]
}

const mod = await page_helper.create_module(data, methods)

mod.mixins = [gadgetConfigMixin];

mod.computed.config2 = function () {
    return {query: this.search_query}
}

mod.computed.costFields = function () {
    return this.fields.filter((f)=>f.type[0].code=='Numeric')
}

export default mod

</script>

<template>
  <GadgetConfig 
    @gadget_ok="handleOk" 
    @gadget_cancel="handleCancel" 
    @gadget_title_updated="titleUpdated" 
    :config="config" 
    :title="title">
    <IssuesSearchInput
      class="gadget-config-field"
      label="Фильтр задач"
      @update_parent_from_input="(val)=>{currentConfig.query=val.trim()}"
      :fields="fields"
      @search_issues="(val)=>{currentConfig.encoded_query=val}"
      :projects="projects"
      :issue_statuses="issue_statuses"
      :tags="issue_tags"
      :issue_types="issue_types"
      :users="users"
      :sprints="sprints"
      :parent_query="currentConfig.query"
    >
    </IssuesSearchInput>
	<SelectInput 
		v-if="this.$store.state['common'].use_sprints"
		class="gadget-config-field" 
		label='Спринт'
		:value="currentConfig.sprint"
		:values="sprints"
		@updated="updateSprint"
	>
	</SelectInput>
	<date-input
		class="gadget-config-field"
		label='С'
		:value="currentConfig.from"
		@updated="(val)=>{currentConfig.from=val}"
		:disabled="currentConfig.sprint"
	>
	</date-input>
	<date-input
		class="gadget-config-field"
		label='По'
		:value="currentConfig.to"
		@updated="(val)=>{currentConfig.to=val}"
		:disabled="currentConfig.sprint"
	>
	</date-input>
	<SelectInput 
		v-if="this.$store.state['common'].use_sprints"
		class="gadget-config-field" 
		label='Считать объем задач'
		:value="currentConfig.cost_field"
		:values="costFields"
		@updated="(val)=>{currentConfig.cost_field=val}"
	>
	</SelectInput>
  </GadgetConfig>
</template>