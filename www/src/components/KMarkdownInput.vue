<script>
import {nextTick} from "vue";

export default {
  name: "KMarkdownInput",
  emits: ["update_parent_from_input", "input_focus", "attachment_added", "attachment_deleted", "save"],
  data() {
    return {
      val: "",
      imgSelectorVisible: false,
      fontSelectorVisible: false,
      savedSelectionStart: 0,
      savedSelectionEnd: 0,
      imageLink: ""
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
    attachments: {
      type: Array,
      default: [],
    }
  },
  methods: {
    resize() {
      let element = this.$refs["markdown_textarea_resizable"];
      element.style.height = "66px";
      element.style.height = element.scrollHeight + "px";
    },
    getSelectionVars() {
      let textArea = this.$refs["markdown_textarea_resizable"]
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
          document.execCommand('insertText', false, selectedVal.substring(leftSymbols.length).substring(0, selectedVal.length - symbolsLength))
          nextTick(() => {
            // complex selection movement
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
          document.execCommand('insertText', false, leftSymbols + selectedVal + rightSymbols)
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
        // insert symbols, move selection between them
        document.execCommand('insertText', false, leftSymbols + rightSymbols)
        nextTick(() => {
          textArea.setSelectionRange(startPos + leftSymbols.length, startPos + leftSymbols.length)
          this.resize()
        });
      }

    },
    leftPadSelectedLinesBySymbols(symbols) {
      // find first /n before selection start, or start of text, insert symbols there and select inserted
      // invert symbols if present
      let { textArea, startPos, endPos } = this.getSelectionVars()
      let text = this.val
      let textBeforeSelectionStart = text.substring(0, startPos)
      let textAfterSelectionEnd = text.substring(endPos)
      let lines = text.substring(startPos, endPos).split('\n')
      let editedTimes = 0
      lines.forEach( (value, i) => {
          if (value.startsWith(symbols)) {
            lines[i] = value.substring(symbols.length)
            editedTimes--
          } else {
            lines[i] = symbols + value
            editedTimes++
          }
      });
      document.execCommand('insertText', false, lines.join('\n'))
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
      if (this.val.substring(startPos, endPos) !== symbols) {
        document.execCommand('insertText', false, symbols)
        nextTick(() => {
          textArea.setSelectionRange(startPos, startPos + symbols.length)
          this.resize()
        });
      }
    },
    keyEvent(event) {
      //console.log('keyCode: ',event.keyCode,', event:', event)
      if (event.ctrlKey) {
        if (!event.shiftKey) { // Ctrl
          switch (event.keyCode) {
            case 66: { // Ctrl + B
              event.preventDefault()
              this.mdBold()
              break;
            }
            case 73: { // Ctrl + I
              event.preventDefault()
              this.mdItalic()
              break;
            }
            case 76: { // Ctrl + L
              event.preventDefault()
              this.mdLink()
              break;
            }
            case 85: { // Ctrl + U
              event.preventDefault()
              this.mdListUl()
              break;
            }
            case 79: { // Ctrl + O
              event.preventDefault()
              this.mdListOl()
              break;
            }
            case 82: { // Ctrl + R
              event.preventDefault()
              this.mdLine()
              break;
            }
            case 83: { // Ctrl + S
              event.preventDefault()
              this.$emit('save')
              break;
            }
          }
        } else { // Ctrl + Shift
          switch (event.keyCode) {
            case 83: { // Ctrl + Shift + S
              event.preventDefault()
              this.mdStrike()
              break;
            }
            case 81: { // Ctrl + Shift + Q
              event.preventDefault()
              this.mdQuote()
              break;
            }
            case 67: { // Ctrl + Shift + C
              event.preventDefault()
              this.mdCodeFragment()
              break;
            }
            case 77: { // Ctrl + Shift + M
              event.preventDefault()
              this.mdCodeBlock()
              break;
            }
          }
        }
      }
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
    toggleFontSize() {
      this.imgSelectorVisible = false
      this.fontSelectorVisible = !this.fontSelectorVisible
      // todo option selector
    },
    mdQuote() {
      this.leftPadSelectedLinesBySymbols('> ')
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
    mdImplant() {
      let { startPos, endPos } = this.getSelectionVars()
      let valLength = this.val.substring(startPos, endPos).length
      this.wrapSelectionBySymbols(' !implant(',')',valLength + 3, -1)
    },
    mdListUl() {
      this.leftPadSelectedLinesBySymbols('- ')
    },
    mdListOl() {
      this.leftPadSelectedLinesBySymbols('1. ')
    },
    mdListCheck() {
      this.leftPadSelectedLinesBySymbols('* [ ] ')
    },
    mdTable() {
      this.swapSelectionBySymbols('|  |  |\n| --- | --- |\n|  |  |')
    },
    toggleImgSelect() {
      this.fontSelectorVisible = false
      this.imgSelectorVisible = !this.imgSelectorVisible
    },
    mdImageSelect(image) {
      this.restoreSelection()
      this.swapSelectionBySymbols('![]('+ image.name + '.'+ image.extention + '){width=x%}')
      this.toggleImgSelect()
    },
    mdImageLink() {
      this.restoreSelection()
      this.swapSelectionBySymbols('![]('+ this.imageLink + '){width=x%}')
      this.toggleImgSelect()
    },
    mdLine() {
      this.swapSelectionBySymbols('---\n')
    },
    previewMd() {
      // todo
      // show/hide markdown preview
    },
    onTextareaBlur() {
      this.saveSelection()
      this.$emit('input_focus', false)
    },
    saveSelection() {
      // save selection for later reuse
      let { startPos, endPos } = this.getSelectionVars()
      this.savedSelectionStart = startPos
      this.savedSelectionEnd = endPos
    },
    restoreSelection() {
      let textArea = this.$refs["markdown_textarea_resizable"]
      textArea.select()
      textArea.selectionStart = this.savedSelectionStart
      textArea.selectionEnd = this.savedSelectionEnd
    },
    updateImgLink(link) {
      console.log('updateImgLink', link)
      this.imageLink = link
    }
  },
  watch: {
    value(val) {
      if (this.val === val) return;
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
  computed: {
    previewDescription() {
      if (this.textarea_id === 'issue_comment_textarea' ) {
        return 'Превью комментария'
      } else {
        return 'Превью описания'
      }
    }
  },
  mounted() {
    if (this.parent_name === 'issue') {
      nextTick(() => {
        // focus issue description
        this.$refs.markdown_textarea_resizable.setSelectionRange(0, 0)
        this.$refs.markdown_textarea_resizable.focus()
      })
    }
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
      <div class="markdown-input-buttons">
        <div class="markdown-input-button bx bx-bold"            @mousedown.prevent @click="mdBold"          title="Жирный (Ctrl + B)"></div>
        <div class="markdown-input-button bx bx-italic"          @mousedown.prevent @click="mdItalic"        title="Курсив (Ctrl + I)"></div>
        <div class="markdown-input-button bx bx-strikethrough"   @mousedown.prevent @click="mdStrike"        title="Перечёркнутый (Ctrl + Shift + S)"></div>
        <div class="markdown-input-button-separator"></div>
        <div class="markdown-input-button bx bx-font-size"
             @mousedown.prevent
             @click="toggleFontSize"
             title="Размер шрифта"
             :class="{ md_button_selected: fontSelectorVisible }"
             style="display: none"
        >
          <Transition :name="transition">
            <RelativeBox
                v-if="fontSelectorVisible"
                :childStyle="'margin: 2px 0 0 -2px'"
            >
            </RelativeBox>
          </Transition>
        </div>
        <div class="markdown-input-button-separator" style="display: none"></div>
        <div class="markdown-input-button bx bxs-quote-right"    @mousedown.prevent @click="mdQuote"         title="Цитата (Ctrl + Shift + Q)"></div>
        <div class="markdown-input-button bx bx-code-alt"        @mousedown.prevent @click="mdCodeFragment"  title="Фрагмент кода (Ctrl + Shift + C)" ></div>
        <div class="markdown-input-button bx bx-code-block"      @mousedown.prevent @click="mdCodeBlock"     title="Блок кода (Ctrl + Shift + M)" ></div>
        <div class="markdown-input-button bx bx-link"            @mousedown.prevent @click="mdLink"          title="Ссылка (Ctrl + L)" ></div>
        <div class="markdown-input-button-separator"></div>
        <div class="markdown-input-button bx bx-list-ul"         @mousedown.prevent @click="mdListUl"        title="Маркированный список (Ctrl + U)"></div>
        <div class="markdown-input-button bx bx-list-ol"         @mousedown.prevent @click="mdListOl"        title="Нумерованный список (Ctrl + O)"></div>
        <div class="markdown-input-button bx bx-list-check"      @mousedown.prevent @click="mdListCheck"     title="Чеклист"></div>
        <div class="markdown-input-button-separator"></div>
        <div class="markdown-input-button bx bx-table"           @mousedown.prevent @click="mdTable"         title="Таблица"></div>
        <div class="markdown-input-button bx bx-link-external"            @mousedown.prevent @click="mdImplant"       title="Описание из другой задачи" ></div>
        <div class="markdown-input-button bx bx-image"
             @click.self="toggleImgSelect"
             title="Изображение"
             :class="{ md_button_selected: imgSelectorVisible }">
          <Transition :name="transition">
            <RelativeBox
                :childStyle="'margin: 2px 0 0 -2px'"
                v-if="imgSelectorVisible"
            >
              <KTabPanel>
                <KTab title="Вложения" style="padding: 2px">
                  <KAttachment
                      style="width: max-content"
                      :show_icon="false"
                      :attachments="attachments.filter((attachment) => attachment.type.indexOf('image') > -1)"
                      @img_selected="mdImageSelect($event)"
                      @attachment_added="$emit('attachment_added', $event)"
                      @attachment_deleted="$emit('attachment_deleted', $event)"
                  >
                  </KAttachment>
                </KTab>
                <KTab title="Ссылка" style="padding: 10px">
                  <StringInput
                      label=""
                      placeholder="https://"
                      @update_parent_from_input="updateImgLink($event)"
                  />
                  <KButton
                      name="Вставить"
                      style="height: 25px; margin-top: 2px;"
                      @click="mdImageLink"
                  />
                </KTab>
              </KTabPanel>
            </RelativeBox>
          </Transition>
        </div>

        <div class="markdown-input-button bx bx-dots-horizontal"      @click="mdLine"         title="Горизонтальная линия (Ctrl + R)" style="display: none"></div>
        <div class="markdown-input-button md-preview bx bxl-markdown" @click="previewMd"     :title="previewDescription" style="display: none"></div>
      </div>
      <div class="markdown-input-container">
        <textarea
            ref="markdown_textarea_resizable"
            class="markdown-input-textarea"
            v-model="val"
            :id="textarea_id"
            :placeholder="placeholder"
            @input="resize"
            @keydown ="keyEvent"
            @focus="$emit('input_focus', true)"
            @blur="onTextareaBlur"
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

.md-preview {
  display: inline-block;
  align-self: flex-end;
}

.markdown-input:focus-within {
  outline: 1px solid;
}

.md_button_selected {
  background: var(--icon-hover-bg-color);
}

</style>
