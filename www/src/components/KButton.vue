<script>
import tools from "../tools.ts";
export default {
  props: {
    name: {
      type: String,
      default: "",
    },

    func: {
      type: String,
      default: "",
    },

    route: {
      type: String,
      default: "",
    },

    disabled: {
      type: Boolean,
      default: false,
    },

    stop: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["button_ans"],
  methods: {
    async click(btn) {
      if(btn.stop){
        this.$emit("button_ans", false);
        return;
      } 
      
      if (this.func != undefined && this.func != "") {
        let ans = await this.$store.dispatch(this.func);
        //console.log('btn aaans', ans)
        this.$emit("button_ans", ans);
      }
      if (this.route != undefined && this.route != "") {
        this.$router.push('/' + this.$store.state['common'].workspace + this.route);
      }
    },
  },
};
</script>

<template>
  <div class="btn" :class="{'bx-btn': name.substr(0, 3) == 'bx-'}">
    <input
      v-if="name.substr(0, 3) != 'bx-'"
      class="btn_input"
      type="button"
      :value="name"
      @click="click(this)"
      :disabled="disabled"
      :class="{ 'disabled-btn': disabled }"
    />
    <i
      v-if="name.substr(0, 3) == 'bx-'"
      :class="'btn_input bx ' + name"
      @click="click(this)"
    ></i>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

.btn .btn_input {
  user-select: none !important;
  width: 200px;
  height: $input-height;
  color: var(--text-color);
  background-color: var(--button-color);
  border-width: 1px;
  border-color: var(--border-color);
  border-style: solid;
  font-size: 14px;
  border-radius: var(--border-radius);
  border-style: outset;
  cursor: pointer;
}

.bx-btn .btn_input{
  width: $input-height !important;
  background-color: transparent;
  border: none;
  margin-left: 10px;
}

.btn .btn_input:hover {
  background-color: var(--button-color-hover);
}

.bx-btn .btn_input:hover {
  background-color: transparent;
}

.btn .disabled-btn {
  cursor: not-allowed;
  background-color: var(--button-color-disabled);
  color: var(--disabled-text-color);
}

.btn .disabled-btn:hover {
  background-color: var(--button-color-disabled);
}

.btn i {
  text-align: center;
  line-height: $input-height;
  font-size: 22px !important;
}

.btn i:hover {
//text-shadow: 0px 0px 2px var(--text-color); 
color: var(--link-color);
}
</style>
