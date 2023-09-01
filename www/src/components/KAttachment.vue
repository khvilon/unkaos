<script>
import tools from "../tools.ts";
import rest from "../rest.ts";

export default {
  emits: ["attachment_added", "attachment_deleted", "img_selected", "img_zoomed"],
  props: {
    value: {
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
    transition: {
      type: String,
      default: "",
    },
    show_icon: {
      type: Boolean,
      default: true,
    }
  },
  methods: {
    copy_img_markdown: function (img) {
      if(img.type.indexOf('image') === -1) return
      this.$emit('img_selected', img)
    },
    img_zoomed: function (img) {
      if(img.type.indexOf('image') === -1) return
      this.$emit('img_zoomed', img.data)
    },
    get_src: function (value) {
      if (value) return value;
    },
    open_file_dialog: function (e) {
      this.$refs.attachments_input.click();
    },
    preview_files: async function (event) {
      let file = event.target.files[0];

      if (file === undefined) return;

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
      this.$emit("attachment_deleted", att);
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
  <Transition :name="transition">
  <div class="attachment">
    <div class="label" v-if="show_icon">
      <i class="bx bx-paperclip"></i>
    </div>
    <div class="attachment-input">
      <div
        class="attachment-file"
        v-for="(attachment, index) in attachments"
        :style="[attachment.type.indexOf('image') > -1 ? {'background-image': 'url(' + attachment.data + ')'} : {'background-image': 'none'}]"
        :class="{'attachment-image-file':attachment.type.indexOf('image') > -1}"
        :key="index"
        @click.self="img_zoomed(attachment)"
      >
        <span @click="img_zoomed(attachment)">{{ attachment.extention }}<br />{{ attachment.name }}</span>
        <div>
          <i
            class="bx bxs-download"
            @click="download_attachment(attachment)"
          ></i>
          <i class="bx bx-trash" @click="delete_attachment(attachment)"></i>
        </div>
      </div>
      <div
          class="attachment-placeholder"
          @click="open_file_dialog($event)"
          title="Добавить вложение"
      >
        <i class='bx bx-plus' style="font-size: 30px"></i>
      </div>
    </div>
    <input
        type="file"
        ref="attachments_input"
        accept="*"
        v-on:change="preview_files"
        style="display: none"
    />
  </div>
  </Transition>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$attachment_input_border_width: 2px;


.attachment .attachment-input {
  width: 100%;
}

.attachment {
  display: block;
}

.attachment-input {
  padding: 6px;
  min-height: 86px;
  min-width: 125px;
  font-size: 20px;
  font-weight: 400;
  transition: all 0.5s ease;
  background-color: transparent;
  text-align: center;
  border-radius: var(--border-radius);
  border-color: var(--table-row-color);
  border-width: $attachment_input_border_width;
  border-style: solid;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.attachment-placeholder {
  display: flex;
  width: calc(($input-height * 2.6 - $attachment_input_border_width * 2) * 1.7);
  height: calc($input-height * 2.6 - $attachment_input_border_width * 2);
  border-style: dashed;
  border-width: var(--border-width);
  border-color: var(--border-color);
  border-radius: var(--border-radius);
  justify-content: center;
  align-items: center;
}

.attachment-placeholder :hover {
  color: green;
  cursor: pointer;
}

.attachment-input > *:not(:last-child) {
  margin-right: 6px;
}

.attachment-input:hover {
  border-style: dashed;
}

.attachment-file {
  width: calc(($input-height * 2.6 - $attachment_input_border_width * 2) * 1.7);
  height: calc($input-height * 2.6 - $attachment_input_border_width * 2);
  background-color: var(--table-row-color);
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
  border-radius: var(--border-radius);
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-color: var(--border-color);
  backface-visibility: hidden;
  position: relative;
}

.attachment-file span {
  padding-top: 5px;
}

.attachment-file div {
  bottom: 5px;
  position: absolute;
  width: 100%;
}

.attachment-image-file span{
  cursor: zoom-in;
}


.attachment-image-file {
  cursor: zoom-in;
}


.attachment-image-file span, .attachment-image-file div {
  opacity: 0;
}

.attachment-image-file:hover span, .attachment-image-file:hover div {
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

[type="file"] {
  visibility: hidden;
  width: 0px;
}
</style>
