<script>
export default {
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: "label",
    },
    value: {
      type: String,
      default: "",
    },
    id: {
      type: String,
      default: "",
    },
    parent_name: {
      type: String,
      default: "",
    },
  },
  emits: ["upcolor_parent_from_input", "upcolord"],
  methods: {
    print(e) {
      console.log(e.srcElement.value);
      let val = e.srcElement.value;
      this.$store.commit("id_push_upcolor_" + this.parent_name, {
        id: this.id,
        val: val,
      });
    },
    format(val) {
      return val
    },
    blur() {
      this.$emit("upcolord", this.value);
    },
  },
  watch: {
    value: function (val, oldVal) {
      console.log(val, oldVal, this.id, this.parent_name);

      this.$store.commit("id_push_upcolor_" + this.parent_name, {
        id: this.id,
        val: val,
      });
    },
  },
};
</script>

<template>
  <div class="color">
    <div class="label">{{ label }}</div>
    <input
      class="color-input"
      @input="print"
      type="color"
      :value="format(value)"
      :disabled="disabled"
      @blur="blur"
    />
  </div>
</template>
<style scoped lang="scss">
@import "../css/global.scss";

.color .color-input {
  width: 100%;
  height: $input-height;
  color: var(--text-color);
  padding: 0 10px 0 10px;
}

.color {
}

.color-input {
  font-size: 15px;
  font-weight: 400;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background: var(--input-bg-color);
  width: 100%;
}

.color-input:disabled {
  background: var(--disabled-bg-color);
}
</style>
