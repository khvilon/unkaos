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
    type: {
      type: String,
      default: "text",
    },
    min: {
      type: Number,
      default: -Number.MAX_SAFE_INTEGER,
    }
  },

  emits: ["update_parent_from_input", "updated"],

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
        this.$emit("update_parent_from_input", val);
        
        if (this.parent_name == undefined || this.parent_name == "") return;
        
        this.$store.commit("id_push_update_" + this.parent_name, {
          id: this.id,
          val: val,
        });
      }
    }
  },

  methods: {
    blur() {
      this.$emit("updated");
    },
  },

  watch: {
    value: function (newVal) {
      this.localValue = newVal;
    },
  },
};
</script>

<template>
  <div class="numeric input">
    <div class="label">{{ label }}</div>
    <input
      type="number"
      class="numeric-input"
      v-model="inputValue"
      :disabled="disabled"
      @blur="blur"
    />
  </div>
</template>

<style lang="scss">
@import "../../css/global.scss";
.numeric .numeric-input {
  width: 100%;
  height: 30px;
  color: var(--text-color);
  padding: 0 10px 0 10px;
}

.numeric {
}

.numeric-input {
  font-size: 14px;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background: var(--input-bg-color);
  width: 100%;
}

.numeric-input:disabled {
  background: var(--disabled-bg-color);
  color: var(--disabled-text-color);
}

input[type="number"] {
  -webkit-appearance: textfield;
  -moz-appearance: textfield;
  appearance: textfield;
}
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
</style>
