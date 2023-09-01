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
    placeholder: {
      type: String,
      default: ""
    }
  },

  emits: ["update_parent_from_input", "updated"],

  methods: {
    blur:function() {
      this.$emit("updated", this.value);
    },
  },

  watch: {
    value: function (val, oldVal) {
      //console.log(val, oldVal, this.id, this.parent_name);

      this.$emit("update_parent_from_input", val);

      if (this.parent_name == undefined || this.parent_name == "") return;

      /*
        
        let data = val

        let id_parts = this.id.split('.')

        let i = id_parts.length-1;
        let id = id_parts[i]
         
        while (id != undefined)
        {
          let new_data = {}
          new_data[id] = data
          data = new_data
          i--
          id = id_parts[i]
        }
        */

      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });

      //data[this.id] = val
      //this.$store.commit('push_update_' + this.parent_name, data)
    },
    
  },
};
</script>

<template>
  <div class="string">
    <div class="label">{{ label }}</div>
    <input
      class="string-input"
      v-model="value"
      :type="type"
      :disabled="disabled"
      :placeholder="placeholder"
      @blur="blur"
    />
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";
.string .string-input {
  width: 100%;
  height: $input-height;
  color: var(--text-color);
  padding: 0 10px 0 10px;
}

.string {
}

.string-input {
  font-size: 14px;
  font-weight: 400;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background: var(--input-bg-color);
  width: 100%;
}

.string-input:disabled {
  background: var(--disabled-bg-color);
}
</style>
