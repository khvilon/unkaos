<script>
import tools from "../tools.ts";
import rest from "../rest.ts";

export default {
  emits: ["attachment_added", "attachment_deleted"],
  data() {
    return {
      show_copy_msg: false,
    };
  },
  props: {
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
    attachments: {
      type: Array,
      default: [
       
      ],
    },
  },
  methods: {
    copy_img_markdown: function (img) {
      if(img.type.indexOf('image') == -1) return
      this.show_copy_msg = img.uuid
      tools.copy_text_to_clipboard('![](' + img.name + '.' + img.extention + '){width=x%}')
      setTimeout(this.hide_copy_msg, 1500)
    },
    hide_copy_msg: function (value) {
      this.show_copy_msg = undefined
    },
    get_src: function (value) {
      if (value) return value;
    },
    open_file_dialog: function (e) {
      this.$refs.attachments_input.click();
    },
    preview_files: async function (event) {
      let file = event.target.files[0];

      if (file == undefined) return;

      let name, extention;
      let dot_idx = file.name.lastIndexOf(".");
      if (dot_idx < 0) {
        name = file.name;
        extention = "";
      } else {
        name = file.name.substr(0, dot_idx);
        extention = file.name.substr(dot_idx + 1);
      }

      const val = await tools.readUploadedFile(file);

      let attachment = {
        name: name,
        extention: extention,
        uuid: tools.uuidv4(),
        data: val,
        type: file.type,
        table_name: "attachments",
      };

      this.$emit("attachment_added", attachment);

      //this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})

      //console.log(event.path[1].children[2].src=val)

      //this.changed_value = 'aaa'
    },
    download_attachment: async function (att) {
      let file = await rest.run_method("read_attachments", { uuid: att.uuid });

      let file_url = file[0].data;

      let file_link = document.createElement("a");

      file_link.href = file_url;
      file_link.setAttribute(
        "download",
        file[0].name + "." + file[0].extention
      );

      document.body.appendChild(file_link);
      file_link.click();
    },
    delete_attachment: function (att) {
      this.$emit("attachment_deleted", {uuid:att.uuid});
    },
  },
  watch: {
    value: function (val, oldVal) {
      //  console.log('vch', val, oldVal, this.id, this.parent_name)
      let data = {};
      data[this.id] = val;
      this.$store.commit("push_update_" + this.parent_name, data);
      //event.path[1].children[2].src=val
    },
  },
};
</script>

<template>
  <label class="attachment">
    <div class="label"><i class="bx bx-paperclip"></i>{{ label }}</div>
    <div class="attachment-input" @click.self="open_file_dialog($event)">
      <div
        class="attachment-file"
        v-for="(attachment, index) in attachments"
        :style="[attachment.type.indexOf('image') > -1 ? {'background-image': 'url(' + attachment.data + ')'} : {'background-image': 'none'}]"
        :class="{'attachment-image-file':attachment.type.indexOf('image') > -1}"
        :key="index"
      >
        <span @click="copy_img_markdown(attachment)">{{ attachment.extention }}<br />{{ attachment.name }}</span>
        <span class="copy-msg" :class="{'copy-msg-shown': show_copy_msg==attachment.uuid}">Ссылка скопирована</span>
        <div>
          <i
            class="bx bxs-download"
            @click="download_attachment(attachment)"
          ></i>
          <i class="bx bx-trash" @click="delete_attachment(attachment)"></i>
        </div>
      </div>
    </div>
  </label>

  <input
    type="file"
    ref="attachments_input"
    accept="*"
    v-on:change="preview_files"
    style="display: none"
  />
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$attachment_input_border_width: 2px;


.attachment .attachment-input {
  width: 100%;
  height: $input-height * 3;
}

.attachment {
  margin-top: 20px;
  display: block;
}

.attachment-input {
  font-size: 20px;
  font-weight: 400;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background-color: transparent;
  text-align: center;
  border-color: var(--table-row-color);
  border-width: attachment_input_border_width;
  border-style: solid;
  display: flex;
  display:flex;flex-direction:row;flex-wrap:wrap;
}
.attachment-input:hover {
  border-style: dashed;
  cursor: pointer;
}

.attachment-file {
  width: calc(($input-height * 2.6 - $attachment_input_border_width * 2) * 1.7);
  height: calc($input-height * 2.6 - $attachment_input_border_width * 2);
  background-color: var(--table-row-color);
  border-radius: var(--border-radius);
  margin-top: $input-height * 0.2;
  margin-left: $input-height * 0.2;
  margin-bottom: $input-height * 0.2;
  overflow: hidden;
  cursor: default;

  display: flex;
  flex-direction: column;
  background-repeat:no-repeat;
    background-position: center center;
    -webkit-background-size: cover;
-moz-background-size: cover;
-o-background-size: cover;
background-size: cover;

  //background-image: url('data:image/png;base64,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');
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-color: var(--border-color);
  //background-color: red;
  backface-visibility: hidden;
  position: relative;
}

.attachment-file span
{
  padding-top: 5px;
  
}

.attachment-file div
{
  bottom: 5px;
  position: absolute;
  width: 100%;
}

.attachment-image-file span{
  cursor: pointer;
}
.attachment-image-file span:hover{
  color: green;
}



.attachment-image-file span, .attachment-image-file div
{
  opacity: 0;
  
}

.attachment-image-file:hover span, .attachment-image-file:hover div
{
  opacity: 1;
  
}

.attachment-file:hover {
  background-image: none !important;
}

.attachment-file span {
  white-space: nowrap;
  line-height: calc($input-height/2);
}

.attachment-file i {
  padding-left: 10px;
  padding-right: 10px;
  cursor: pointer;
}


.attachment-file .bx-trash:hover {
  color: red;
}

.attachment-file .bxs-download:hover {
  color: green;
}

.attachment .bx-paperclip {
  font-size: $font-size * 1.4;
}

.copy-msg
{
  margin-top: 0px;
  display: none;
}

.attachment-image-file .copy-msg-shown
{
  display: block;
  animation: show-copy forwards;
  animation-duration: 1s;
  animation-iteration-count: 1;
}

@keyframes show-copy {
  from {
    opacity:0;
    font-size: 10px;
    font-weight: 100;
    margin-top: -15px;
  }
  70% {
    font-size: 12px;
    opacity:1;
    font-weight: 700;
  }
  to {
    opacity:0;
    margin-top: 5px;
    font-size: 14px;
  }
}

[type="file"] {
  visibility: hidden;
  width: 0px;
}
</style>
