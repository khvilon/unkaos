<script>
import page_helper from "../page_helper.ts";

export default {
  /*  data()
    {
        return {name}
    },*/
  props: {
    title: {
      type: String,
      default: "",
    },

    collumns: {
      type: Array,
      default: () => [],
    },

    //! Styles
  },
};
</script>

<template ref="config" v-if="config">
  <div class="panel gadget-config">
    <div class="gadget-config-fields">
      <StringInput label="Название" :value="title"> </StringInput>
      <IssuesSearchInput
        label="Запрос"
        class="issue-search-input"
        @update_parent_from_input="update_search_query"
        :fields="fields"
        @search_issues="get_issues"
        :projects="projects"
        :issue_statuses="issue_statuses"
        :issue_types="issue_types"
        :users="users"
        :sprints="sprints"
        :parent_query="search_query"
      >
      </IssuesSearchInput>

      <SelectInput label="Столбцы"> </SelectInput>
    </div>

    <div class="gadget-edit-mode-btn-container">
      <KButton class="save-gadget-config-btn" name="Сохранить" />
      <KButton class="cancel-gadget-config-btn" name="Отменить" />
    </div>
  </div>
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

.gadget-config-fields {
  width: 100%;
  height: 100%;
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
