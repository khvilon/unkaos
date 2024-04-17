<script>
import page_helper from "../page_helper.ts";

import { gadgetConfigMixin } from './gadgetConfigMixin';

let methods = {
	
}

const data =
{
	curr_sprint_num: 0,
	query: '',
	encoded_query: '',
	issues_table_issues: [],	
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
	
	
  </GadgetConfig>
</template>