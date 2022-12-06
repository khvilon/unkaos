<script>
import {nextTick} from "vue";

export default {
  name: "KMarkdownInput",
  data() {
    return {
      val: ""
    };
  },
  props: {
    value: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "",
    },
    textarea_id: {
      type: String,
      default: "",
    },
    transition: {
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
  methods: {
    resize() {
      let element = this.$refs["markdown-textarea-resizable"];
      element.style.height = "66px";
      element.style.height = element.scrollHeight + "px";
    },
    getSelectionVars() {
      let textArea = this.$refs["markdown-textarea-resizable"]
      let startPos = textArea.selectionStart
      let endPos = textArea.selectionEnd
      return {textArea, startPos, endPos}
    },
    wrapSelectionBySymbols(leftSymbols, rightSymbols, pushSelectionStart, pushSelectionEnd) {
      let { textArea, startPos, endPos } = this.getSelectionVars()
      let text = this.val
      let selectedVal = text.substring(startPos, endPos)
      let symbolsLength = leftSymbols.length + rightSymbols.length
      if (startPos < endPos) {
        if (selectedVal.startsWith(leftSymbols) &&
            selectedVal.endsWith(rightSymbols) ){
          // remove symbols
          this.val =
            text.substring(0, startPos) +
            selectedVal.substring(leftSymbols.length).substring(0, selectedVal.length - symbolsLength) +
            text.substring(endPos);
          nextTick(() => {
            if (pushSelectionStart !== undefined) {
              startPos = startPos + pushSelectionStart
            }
            if (pushSelectionEnd !== undefined) {
              endPos = endPos + pushSelectionEnd
            }
            textArea.setSelectionRange(startPos, endPos - symbolsLength)
            this.resize()
          });
        } else {
          // add symbols
          this.val =
            text.substring(0, startPos) +
            leftSymbols + selectedVal + rightSymbols +
            text.substring(endPos);
          nextTick(() => {
            if (pushSelectionStart !== undefined) {
              startPos = startPos + pushSelectionStart
            }
            if (pushSelectionEnd !== undefined) {
              endPos = endPos + pushSelectionEnd
            }
            textArea.setSelectionRange(startPos, endPos + symbolsLength)
            this.resize()
          });
        }
      } else {
        // no selection or only point selected
        // add symbols to selection start, move selection between symbols
        this.val =
            text.substring(0, startPos)  +
            leftSymbols + rightSymbols +
            text.substring(endPos);
        nextTick(() => {
          textArea.setSelectionRange(startPos + leftSymbols.length, startPos + leftSymbols.length)
          this.resize()
        });
      }

    },
    leftPadLineBySymbols(symbols) {
      // find first /n before selection start, or start of text, insert symbols there and select inserted
      // invert symbols if present
      let { textArea, startPos, endPos } = this.getSelectionVars()
      let text = this.val
      let textBeforeSelectionStart = text.substring(0, startPos)
      let textBeforeSelectionEnd = text.substring(0, endPos)
      let textAfterSelectionEnd = text.substring(endPos)
      let firstLine = (textBeforeSelectionStart.match(new RegExp("\n", "g")) || []).length
      let lastLine = (textBeforeSelectionEnd.match(new RegExp("\n", "g")) || []).length
      let lines = text.split('\n')
      let editedTimes = 0
      lines.forEach( (value, i) => {
        if ( (i >= firstLine) && (i <= lastLine) ) {
          if (value.startsWith(symbols)) {
            lines[i] = value.substring(symbols.length)
            editedTimes--
          } else {
            lines[i] = symbols + value
            editedTimes++
          }
        }
      });
      this.val = lines.join('\n')
      let selectionStart = textBeforeSelectionStart.lastIndexOf('\n') + 1
      let selectionEnd = textAfterSelectionEnd.contains('\n')
          ? endPos + textAfterSelectionEnd.indexOf('\n') + (symbols.length * editedTimes)
          : this.val.length
      nextTick(() => {
        textArea.setSelectionRange(selectionStart, selectionEnd)
        this.resize()
      });
    },
    swapSelectionBySymbols(symbols) {
      let { textArea, startPos, endPos } = this.getSelectionVars()
      this.val =
          this.val.substring(0, startPos)  +
          symbols +
          this.val.substring(endPos);
      nextTick(() => {
        textArea.setSelectionRange(startPos, endPos + symbols.length)
        this.resize()
      });
    },
    mdBold() {
      this.wrapSelectionBySymbols('**','**')
    },
    mdItalic() {
      this.wrapSelectionBySymbols('*','*')
    },
    mdStrike() {
      this.wrapSelectionBySymbols('~~','~~')
    },
    mdFontSize() {
      // todo
      // todo option selector
    },
    mdQuote() {
      this.leftPadLineBySymbols('> ')
    },
    mdCodeFragment() {
      this.wrapSelectionBySymbols('`','`')
    },
    mdCodeBlock() {
      this.wrapSelectionBySymbols('```\n','\n```')
    },
    mdLink() {
      let { startPos, endPos } = this.getSelectionVars()
      let valLength = this.val.substring(startPos, endPos).length
      this.wrapSelectionBySymbols('[','](https://)',valLength + 3, -1)
    },
    mdListUl() {
      this.leftPadLineBySymbols('- ')
    },
    mdListOl() {
      this.leftPadLineBySymbols('1. ')
    },
    mdListCheck() {
      this.leftPadLineBySymbols('* [ ] ')
    },
    mdTable() {
      this.swapSelectionBySymbols('|  |  |\n| --- | --- |\n|  |  |')
    },
    mdImage() {
      this.wrapSelectionBySymbols('![](','){width=x%}')
      // todo change selection pos
      // todo option selector
    },
    mdLine() {
      this.swapSelectionBySymbols('---\n')
    }
  },
  watch: {
    value(val) {
      this.val = val;
    },
    val(val) {
      this.$emit("update_parent_from_input", val);
      nextTick(() => {
        this.resize();
      })
      if (this.parent_name === undefined || this.parent_name === "") return;
      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });
    }
  },
  mounted() {
    this.val = this.value;
    nextTick(() => {
      this.resize();
    })
  },
};
</script>

<template>
  <Transition :name="transition">
    <div class="markdown-input">
      <div class="markdown-input-buttons" @mousedown.prevent>
        <div class="markdown-input-button bx bx-bold"               @click="mdBold"         title="Жирный (Ctrl + B)"></div>
        <div class="markdown-input-button bx bx-italic"             @click="mdItalic"       title="Курсив (Ctrl + I)"></div>
        <div class="markdown-input-button bx bx-strikethrough"      @click="mdStrike"       title="Перечёркнутый (Ctrl + S)"></div>
        <div class="markdown-input-button-separator"></div>
        <div class="markdown-input-button bx bx-font-size"          @click="mdFontSize"     title="Размер шрифта" style="display: none"></div>
        <div class="markdown-input-button-separator"                                                         style="display: none"></div>
        <div class="markdown-input-button bx bxs-quote-right"       @click="mdQuote"        title="Цитата (Ctrl + Shift + Q)"></div>
        <div class="markdown-input-button bx bx-code-alt"           @click="mdCodeFragment" title="Фрагмент кода (Ctrl + Shift + C)" ></div>
        <div class="markdown-input-button bx bx-code-block"         @click="mdCodeBlock"    title="Блок кода (Ctrl + Shift + M)" ></div>
        <div class="markdown-input-button bx bx-link"               @click="mdLink"         title="Ссылка (Ctrl + L)" ></div>
        <div class="markdown-input-button-separator"></div>
        <div class="markdown-input-button bx bx-list-ul"            @click="mdListUl"       title="Маркированный список (Ctrl + U)"></div>
        <div class="markdown-input-button bx bx-list-ol"            @click="mdListOl"       title="Нумерованный список (Ctrl + O)"></div>
        <div class="markdown-input-button bx bx-list-check"         @click="mdListCheck"    title="Чеклист"></div>
        <div class="markdown-input-button-separator"></div>
        <div class="markdown-input-button bx bx-table"              @click="mdTable"        title="Таблица"></div>
        <div class="markdown-input-button bx bx-image"              @click="mdImage"        title="Изображение"   style="display: none"></div>
        <div class="markdown-input-button bx bx-dots-horizontal"    @click="mdLine"         title="Горизонтальная линия (Ctrl + R)" style="display: none"></div>
      </div>
      <div class="markdown-input-container">
        <textarea
            ref="markdown-textarea-resizable"
            class="markdown-input-textarea"
            :id="textarea_id"
            @input="resize"
            @placeholder="placeholder"

            @keydown.ctrl.b         ="mdBold"
            @keydown.ctrl.i         ="mdItalic"
            @keydown.ctrl.s         ="mdStrike"
            @keydown.ctrl.shift.q   ="mdQuote"
            @keydown.ctrl.shift.c   ="mdCodeFragment"
            @keydown.ctrl.shift.m   ="mdCodeBlock"
            @keydown.ctrl.l         ="mdLink"
            @keydown.ctrl.u         ="mdListUl"
            @keydown.ctrl.o         ="mdListOl"
            @keydown.ctrl.r         ="mdLine"

            @keydown.ctrl.s.prevent
            @keydown.ctrl.shift.q.prevent
            @keydown.ctrl.shift.m.prevent
            @keydown.ctrl.shift.c.prevent
            @keydown.ctrl.l.prevent
            @keydown.ctrl.u.prevent
            @keydown.ctrl.o.prevent
            @keydown.ctrl.r.prevent

            v-model="val"
            :placeholder="placeholder"
        ></textarea>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
@import "../css/global.scss";

.markdown-input {
  background: var(--input-bg-color);
  border-color: var(--border-color);
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-radius: var(--border-radius);
}

.markdown-input-buttons {
  display: flex;
  padding: 3px;
}

.markdown-input-button {
  margin: 1px;
  padding: 2px;
  border-radius: 4px;
  font-size: 18px;
}

.markdown-input-button:hover {
  cursor: pointer;
  background: var(--icon-hover-bg-color);
}

.markdown-input-button-separator {
  display: inline;
  border-left: 2px solid var(--text-color) ;
  margin: 2px 4px;
  opacity: .2;
}

.markdown-input-textarea {
  transition: none;
  font-size: 14px;
  padding: 4px 10px 6px 10px;
  height: $input-height * 2;
  min-height: 60px;
  width: 100%;
  resize: none;
  overflow: hidden;
  background: var(--input-bg-color);
  outline: none;
  border: none;
}

</style>
