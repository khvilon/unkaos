<script>
export default {
  emits: ["search", "update_parent_from_input", "updated", "value_selected", "value_deselected"],

  beforeCreate() {},
  watch: {},
  data() {
    let d = {
      modal_visible: false,
      edited_tag: {}
    };
    return d;
  },
  computed: {},
  props: {
    name_path: {
      type: String,
      default: "",
    },
    value: {
      type: String,
      default: "",
    },
    values: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    parameters: {
      type: Object,
      default: {},
    },
    id: {
      type: String,
      default: "",
    },
    parent_name: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    close_on_select: {
      type: Boolean,
      default: true,
    },
    isIssueTag: {
      type: Boolean,
      default: true,
    }
  },
  methods: {
    tag_clicked: function(tag)
    {
      console.log("tag_clicked",tag.name)
      this.edited_tag = tag
      this.modal_visible = true

    },
    tag_selected: function(tag)
    {
      this.$emit('value_selected', tag)
    },
    tag_deselected: function(tag)
    {
      this.$emit('value_deselected', tag)
    },
    tag_edited: function(tag)
    {

      console.log(tag)
    },
  },
  computed: {
    computedDropdownShouldOpen() {
        return !this.isIssueTag ? (noDrop, open, mutableLoading) => false : undefined;
      }
  }
};
</script>

<template>
  <SelectInput
    :taggable="true"
    :parameters="{ multiple: true, reduce: this.isIssueTag ? (obj) => obj.uuid : undefined}"
    :value="value"
    :values="values"
    class="tag-input"
    @tag_clicked="tag_clicked"
    @value_selected="tag_selected"
    @value_deselected="tag_deselected"
    :dropdownShouldOpen="computedDropdownShouldOpen"
    

  >
  </SelectInput>

  <EditTagModal
  v-show="modal_visible"
        @close_edit_tag_modal="modal_visible = false"
        :tag="edited_tag"
        @tag_edited="tag_edited"
        :isIssueTag="isIssueTag"
         >
    

  </EditTagModal>
</template>

<style lang="scss">
@import "../../css/global.scss";

.tag-input{
  width: fit-content;
}

.tag-input .vs__dropdown-toggle{
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
}

.tag-input .vs__selected{
  margin: 0 0 0 5px;
  padding-top: 0;
  background: none;
  cursor: pointer;
  border: none;
}

.tag-input .vs__search {
  margin: 0;
}

.tag-input .select-input-selected {
  margin-right: 5px !important;
  height: 23px;
  margin-bottom: 5px;
}

.tag-input .vs__selected-options {
  display: flex;
  align-items: center;
}


.tag-input i{
  margin-top: 4px;
    font-size: 20px;
    cursor: pointer;
}

.tag-input .vs__search:hover,
 .tag-input .vs__search:focus,
 .tag-input .vs__search:active{
  background-color: var(--input-bg-color);
  min-width: 100px;
  width: auto;
  max-width: 500px;
  border-color: var(--border-color) !important;
    border-style: var(--border-style) !important;
    border-width: var(--border-width) !important;
    border-radius: var(--border-radius) !important;
}

</style>
