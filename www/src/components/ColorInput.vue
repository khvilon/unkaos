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
  data() {
    let d = {
      curr_value: '#101010',
    };
    return d;
  },
  emits: ["update_parent_from_input", "updated"],
  methods: {
    print(e) {
      console.log(e.srcElement.value);
      let val = e.srcElement.value;

      this.curr_value = e.srcElement.value
      console.log("taaag0", this.value)

      if(this.parent_name == undefined) return
      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });
    },
    format(val) {
      var ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = val;
        return ctx.fillStyle;
    },
    blur() {
      console.log("blur", this.curr_value)
      this.$emit("updated", this.curr_value);
    }
  },
  watch: {
    value: function (val, oldVal) {

      if(this.curr_value == val) return
      this.curr_value = this.format(val)

      if(this.parent_name == undefined) return
      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });
    },
  },
};
</script>

<template>
  <div class="color input">
    <div class="label">{{ label }}</div>
    <input
      class="color-input"
      @input="print"
      type="color"
      :value="curr_value"
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
 // width: 100%;

 margin: 5px;
  width: 50px !important;
    background: none;
    border: none;

    -webkit-appearance: none;
}

.color-input:disabled {
  background: var(--disabled-bg-color);
}



input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;   
  border-color: var(--border-color);
  border-style: inset;
  border-width: calc(var(--border-width) + 0);
  border-radius: 50%;
}

input[type="color"]::-webkit-color-swatch {
  border: none;  
  border-radius: 50%;
  
}
</style>
