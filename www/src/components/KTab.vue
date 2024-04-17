<script>
export default {
  props: {
    title: {
      type: String,
      default: "Tab",
    },
    visible: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      isActive: true,
    };
  },
  computed: {
    selected: function () {
      //   console.log(this.$parent.selected)
      return this.$parent.selected;
    },
  },
};
</script>

<template>
  <div class="tab" v-show="title === selected">
    <slot></slot>
  </div>
</template>

<style lang="css"></style>
