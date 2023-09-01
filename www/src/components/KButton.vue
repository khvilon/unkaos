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
  },
  emits: ["button_ans"],
  methods: {
    async click(btn) {
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
  <div class="btn">
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
  height: 100%;
  color: var(--text-color);
  background-color: var(--button-color);
  border-width: 1px;
  border-color: var(--text-color);
  border-style: solid;
  font-size: 15px;
  border-radius: var(--border-radius);
  border-style: outset;
  cursor: pointer;
}

.btn .disabled-btn {
  cursor: not-allowed;
  background-color: var(--input-bg-color-disabled);
}

.btn i {
  text-align: center;
  line-height: $input-height;
  font-size: 18px !important;
}
</style>
