<script>
import { nextTick } from "vue";

export default {
  data() {
    let d = {
      val: "",
    };
    return d;
  },

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
    textarea_id: {
      type: String,
      default: "",
    },
    resize: {
      type: Boolean,
      default: true,
    },
  },

  emits: ["update_parent_from_input", "input_focus"],

  methods: {
    resize() {
      if(!this.resize) return
      console.log("resizing");
      if (this.$refs.text_input == undefined) return;
      this.$refs.text_input.style.height = `${
        this.$refs.text_input_shadow.scrollHeight + 10
      }px`;
    },
    getCaretIndex(element) {
      let position = 0;
      const isSupported = typeof window.getSelection !== "undefined";
      if (isSupported) {
        const selection = window.getSelection();
        if (selection.rangeCount !== 0) {
          try {
            const range = window.getSelection().getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            position = preCaretRange.toString().length;
          } catch (e) {}
        }
      }
      return position;
    },
    pasted(e) {
      console.log(e);
    },
    
    countTextareaCapacity(event) {
      const textarea = event.target;

      console.log('ta', (textarea))
      console.log('tas',  textarea.maxlength)
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      console.log('lh', getComputedStyle(textarea).lineHeight)
      const paddingTop = parseInt(getComputedStyle(textarea).paddingTop);
      const paddingBottom = parseInt(getComputedStyle(textarea).paddingBottom);
      const height = textarea.clientHeight - paddingTop - paddingBottom;
      const rows = Math.floor(height / lineHeight);
      const cols = this.defaultCols && !isNaN(this.defaultCols) ? Math.floor(textarea.clientWidth / this.defaultCols) : 0;
      const capacity = cols * rows;
      console.log(`Textarea capacity: ${capacity}, ${cols}, ${rows}`);
    }
  },
  updated() {
    //this.resize();
  },
  mounted() {
    this.val = this.value;
    nextTick(() => {
      this.resize();
    })
  },
  /*computed: {
    scroll_height: function () {
      if (this.$refs == undefined || this.$refs.text_input_shadow == undefined)
        return 0;
      return this.$refs.text_input_shadow.scrollHeight;
    },
  },*/

  watch: {
    /*scroll_height: function () {
      this.resize();
    },*/
    value: function (val, oldVal) {
      if (this.val == val) return;
      this.val = val;
    },

    val: function (val, oldVal) {
      //console.log(val, oldVal, this.id, this.parent_name);
      this.$emit("update_parent_from_input", val);
      nextTick(() => {
        this.resize();
      })
      if (this.parent_name == undefined || this.parent_name == "") return;
      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });

      
    },
  },
};
</script>

<template>
  <div class="text input">
    <div class="label">{{ label }}</div>
    <textarea
      ref="text_input_shadow"
      class="text-input text-input-shadow"
      :type="type"
      v-model="value"
    ></textarea>

    <textarea
      ref="text_input"
      @focus="$emit('input_focus', true)"
      @blur="$emit('input_focus', false)"
      :id="textarea_id"
      class="text-input"
      :type="type"
      v-model="val"
      :disabled="disabled"
      @click="countTextareaCapacity"
    ></textarea>
  </div>
</template>

<style lang="scss" scoped>
@import "../css/global.scss";

.text .text-input {
  width: 100%;
  height: $input-height * 2;
  min-height: $input-height * 2;
  color: var(--text-color);
  padding: 4px 10px 4px 10px;
  resize: none;
}

.text-input {
  width: 100%;
  font-size: 14px;
  font-weight: 400;
  background: var(--input-bg-color);
  border-color: var(--border-color);
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-radius: var(--border-radius);
  overflow: clip;
}

.text-input-shadow {
  height: 0px !important;
  max-height: 0px !important;
  min-height: 0px !important;
  border: none;
  border-style: none !important;
  padding: 0px !important;
  transition: none !important;
  overflow: scroll !important;
  scroll-behavior: auto !important;
  display: inherit;
}

.text-input:disabled {
  background: var(--disabled-bg-color);
}

.text-input::-webkit-scrollbar {
  display: none;
}
</style>
