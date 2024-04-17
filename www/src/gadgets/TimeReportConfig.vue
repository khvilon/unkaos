<script>
import page_helper from "../page_helper.ts";

import { gadgetConfigMixin } from './gadgetConfigMixin';

let methods = {
	updateUser(val){
    console.log('>>>>>updateUser', val)
		this.currentConfig.user=val
	}
}

const data =
{
	inputs: []
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
    :title="title"
  >
    <UserInput 
      class="gadget-config-field" 
      @updated_full_user="updateUser" 
      label="Пользователь" 
      :value="currentConfig.user"
    ></UserInput>
    <DateInput 
      class="gadget-config-field" 
      @updated="(val)=>{currentConfig.date_from=val}" 
      label="С" 
      :value="currentConfig.date_from"
    ></DateInput>
    <DateInput 
      class="gadget-config-field" 
      @updated="(val)=>{currentConfig.date_to=val}" 
      label="По" 
      :value="currentConfig.date_to"
    ></DateInput>
  </GadgetConfig>
</template>


<style lang="scss">
@import "../css/global.scss";

.gadget-config {
  width: 100%;
  height: 100%;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
}

.gadget-config .gadget-config-field{
  padding-bottom: 20px;
}

.gadget-config-fields {
  width: 100%;
  height: calc(100% - 30px);
  overflow: auto;
}

.gadget-config-fields .string {
  padding-left: 0px;
  padding-right: 0px;
  padding-top: 0px;
}

.gadget-edit-mode-btn-container {
  width: 100%;
  height: 30px;
  display: flex;
}

.gadget-edit-mode-btn-container .btn {
  width: 50%;
}
.gadget-edit-mode-btn-container .btn .btn_input {
  height: 100%;
  width: 100%;
}

.gadget-config .issue-search-input {
  width: 100%;
}

.save-gadget-config-btn {
  padding-right: 10px;
}

.cancel-gadget-config-btn {
  padding-left: 10px;
}
</style>
