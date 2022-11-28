<script>
export default {
  emits: ["search", "update_parent_from_input", "updated", "value_selected", "value_deselected"],

  beforeCreate() {},
  watch: {},
  data() {
    let d = {
      modal_visible: true,
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
  },
  methods: {
    tag_clicked: function(tag)
    {
      console.log("tag_clicked",tag.name)

    },
    tag_selected: function(sel_val)
    {
      this.$emit('value_selected', sel_val)
    },
    tag_deselected: function(sel_val)
    {
      this.$emit('value_deselected', sel_val)
    },
  },
};
</script>

<template>
  <SelectInput
    :taggable="true"
    :parameters="{ multiple: true, reduce: (obj) => obj.uuid}"
    :value="value"
    :values="values"
    class="tag-input"
    @tag_clicked="tag_clicked"
    @value_selected="tag_selected"
    @value_deselected="tag_deselected"
  >
  </SelectInput>

  <EditTagModal >
    v-if="modal_visible"
        @close_edit_tag_modal="modal_visible = false"
        @tag_edited=""

  </EditTagModal>
</template>

<style lang="scss">
@import "../css/global.scss";

.tag-input{
  width: fit-content;
}

.tag-input .vs__dropdown-toggle{
  background: none;
  border: none;
}

.tag-input .vs__selected{
  margin: 0;
    padding-top: 0;
  background: none;
  cursor: pointer;
  border: none;
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
  
}


</style>
