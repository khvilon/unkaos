<script>
export default {
  name: "RelativeBox",
  props: {
    visible: {
      type: Boolean,
      default: true,
    },
    child_style: {
      type: String,
      default: ""
    }
  }
}
</script>

<template>
  <div class="relative-box-container">
    <div
        class="relative-box"
        title=""
        v-show="visible"
        :style="child_style"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
@import "../css/global.scss";
@import "../css/palette.scss";

.relative-box-container {
  position: relative;
  width: 0;
  height: 0;
  cursor: default !important;
}

.relative-box {
  display: inline-block;
  position: relative;
  min-width: 10px;
  min-height: 10px;
  padding: 2px;
  z-index: 1;
  background: var(--panel-bg-color);
  border-color: var(--border-color);
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-radius: var(--border-radius);
}

</style>