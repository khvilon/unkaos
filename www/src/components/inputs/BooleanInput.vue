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
      default: "",
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
  data() {
    return {
      localValue: this.value
    }
  },
  computed: {
    inputValue: {
      get() {
        return this.localValue;
      },
      set(val) {
        this.localValue = val;
        this.$store.commit("id_push_update_" + this.parent_name, {
          id: this.id,
          val: val,
        });
        this.$emit("update_parent_from_input", val);
        this.$emit("updated", val);
      }
    }
  },
  watch: {
    value: function (newVal) {
      this.localValue = newVal;
    },
  },
};
</script>

<template>
  <label class="boolean input">
    <div class="label" v-if="label != ''">{{ label }}</div>
    <input type="checkbox" v-model="inputValue" :disabled="disabled" style="display: none"/>
    <span class="boolean-input" v-bind:class="{ disabled: disabled }"> </span>
  </label>
</template>

<style scoped lang="scss">
@import "../../css/global.scss";

.boolean .boolean-input {
  width: $input-height;;
  height: $input-height;
  color: var(--text-color);
}

.boolean {
  display: block;
  width: $input-height;
}

.boolean-input {
  font-size: 18px;
  font-weight: 400;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background: var(--input-bg-color);
  display: block;
  text-align: center;
  border-color: var(--border-color);
  border-width: var(--border-width);
  border-style: var(--border-style);
  position: relative;
  cursor: pointer;
}

[type="checkbox"] {
  visibility: hidden;
  width: 0px;
}

.boolean input:checked ~ .boolean-input:after {
  display: inline-block;
}

.boolean-input:after {
  // Стили для псевдоэлемента, отображающего галочку
  content: "\2714";
  position: absolute; // Позиционирование галочки независимо от других элементов
  top: 50%; // Центрирование по вертикали
  left: 50%; // Центрирование по горизонтали
  transform: translate(-50%, -50%); // Точное центрирование галочки
  display: none; // Изначально скрыта
  font-size: 18px; // Размер галочки
}

.boolean .disabled {
  background: var(--disabled-bg-color);
  color: var(--disabled-text-color);
}
</style>
