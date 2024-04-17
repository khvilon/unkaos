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
  data()
  {
    return {
      current_value: null,
    }
  },
  emits: ["update_parent_from_input", "updated"],
  methods: {
    print(e) {
      console.log(e.srcElement.value);
      let val = e.srcElement.value;

      this.current_value = val
      
      this.$emit("update_parent_from_input", val);

      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });
    },
    format(val) {

      

      var options = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      };

      if (val == undefined || val == null || val == "") return "";
      let date = new Date(val);

      console.log(date.getFullYear);

      if (date.getFullYear() == 1970) return "";

      date = date.toISOString().split("T")[0];

      //toLocaleString("ru", options)
      if (date !== "Invalid Date") return date;
      else return "";
    },
    blur() {
      this.$emit("updated", this.current_value);
    },
  },
  watch: {
    value: function (val, oldVal) {
      console.log(val, oldVal, this.id, this.parent_name);

      //console.log('chch')

      //this.$emit("update_parent_from_input", val);

      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });
    },
  },
};
</script>

<template>
  <div class="date input">
    <div class="label">{{ label }}</div>
    <input
      class="date-input"
      @input="print"
      type="date"
      :value="format(value)"
      :disabled="disabled"
      @blur="blur"
    />
  </div>
</template>
<style scoped lang="scss">
@import "../css/global.scss";

.date .date-input {
  width: 100%;
  height: $input-height;
  color: var(--text-color);
  padding: 0 10px 0 10px;
}

.date {
}

.date-input {
  font-size: 15px;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background: var(--input-bg-color);
  width: 100%;
}

.date-input:disabled {
  background: var(--disabled-bg-color);
  color: var(--disabled-text-color);
}
</style>
