<script>
export default {
  emits: ["search", "update_parent_from_input", "updated"],

  beforeCreate() {},
  watch: {},
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
  methods: {},
};
</script>

<template>
  <SelectInput
    :taggable="true"
    :parameters="{ multiple: true }"
    :values="[
      { uuid: 1, name: 'rrr', color: 'red' },
      { uuid: 1, name: 'ggg', color: 'green' },
    ]"
  >
  </SelectInput>
</template>

<style lang="scss">
@import "../css/global.scss";
</style>
