<script>
export default {
  emits: ["update_parent_from_input", "updated"],
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
      type: Boolean,
      default: true,
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
  watch: {
    value: function (val, oldVal) {
      console.log(val, oldVal, this.id, this.parent_name);
      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });
      this.$emit("update_parent_from_input", val); //val_obj == undefined? val : val_obj)

      this.$emit("updated", val);
    },
  },
};
</script>

<template>
  <label class="boolean">
    <div class="label">{{ label }}</div>
    <input type="checkbox" v-model="value" :disabled="disabled" style="display: none"/>
    <span class="boolean-input" v-bind:class="{ disabled: disabled }"> </span>
  </label>
</template>

<style scoped lang="scss">
@import "../css/global.scss";

.boolean .boolean-input {
  width: $input-height;;
  height: $input-height;
  color: var(--text-color);
}

.boolean {
  display: block;
}

.boolean-input {
  font-size: 18px;
  font-weight: 400;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background: var(--input-bg-color);
  display: inline-block;
  text-align: center;
  border-color: var(--border-color);
  border-width: var(--border-width);
  border-style: var(--border-style);
}

[type="checkbox"] {
  visibility: hidden;
  width: 0px;
}

.boolean input:checked ~ .boolean-input:after {
  display: inline-block;
}

.boolean-input:after {
  content: "\2714";
  display: none;
}

.boolean .disabled {
  background: var(--disabled-bg-color);
}
</style>
