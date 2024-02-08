<script>

export default {
  /*  data()
    {
        return {name}
    },*/
  props: {
    name: {
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
      <StringInput label="Название" :value="name"> </StringInput>
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

</style>
