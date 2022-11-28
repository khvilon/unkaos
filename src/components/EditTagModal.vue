<script>
import rest from "../rest.ts";
import tools from "../tools.ts";

export default {
  emits: ["close_edit_tag_modal", "tag_edited"],
  props: {
    tag: {
      type: Object,
      default: {},
    }
  },

  data() {
    return {
      color: undefined,
    };
  },
  created() {},
  mounted() {
    //this.select_tab(0)
  },
  
  methods: {
    select_issue1(issue1_uuid) {
      console.log(issue1_uuid);
      this.issue1_uuid = issue1_uuid;
    },
    select_reletion_type(tag_type) {
      console.log(tag_type);
      this.tag_type = tag_type;
    },

    async save_tag() {
      if (
        this.issue1_uuid == undefined ||
        this.issue1_uuid == null ||
        this.issue1_uuid == "" ||
        this.issue0_uuid == undefined ||
        this.issue0_uuid == null ||
        this.issue0_uuid == "" ||
        this.tag_type == undefined ||
        this.tag_type.uuid == null ||
        this.tag_type.uuid == ""
      ) {
        console.log(
          "error saving tag",
          "#" + this.issue0_uuid + "#",
          "#" + this.issue1_uuid + "#",
          "#" + this.tag_type.uuid + "#"
        );
        return;
      }

      let options0 = {
        uuid: tools.uuidv4(),
        issue0_uuid: this.tag_type.is_reverted
          ? this.issue1_uuid
          : this.issue0_uuid,
        issue1_uuid: this.tag_type.is_reverted
          ? this.issue0_uuid
          : this.issue1_uuid,
        type_uuid: this.tag_type.uuid,
      };

      this.$emit("tag_edited", options0);
    },
    close() {
      this.$emit("close_edit_tag_modal");
    },
    async get_issues_sugestions(text) {
      if (text == undefined || text == "") return;
      let options = {};
      options.like = text;
      let ans = await rest.run_method("read_short_issue_info", options);
      if (ans == null) return;
      this.issues_info = ans.sort();
    },
    search_event_handle(p1, p2) {
      console.log(p1, p2);
    },
  },
};
</script>
<template>
  <div class="modal-bg" @click.self="close()">
    <div class="panel modal edit-tag-modal">
      <ColorInput
        label="Цвет"
      >
      </ColorInput>

     

      <div class="btn-container">
        <KButton
          name="Создать"
          id="create-tag-btn"
          @click="save_tag()"
        />
        <KButton name="Отменить" @click="close()" />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

.modal-bg {
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  position: absolute;
  z-index: 10;
}

.edit-tag-modal {
  padding: 20px;
  position: absolute;
  width: 60%;
  height: fit-content;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.edit-tag-modal > div {
  margin-bottom: 10px;
}

.edit-tag-modal SelectInut {
  width: 100%;
  height: $input-height;
}

.edit-tag-modal .btn-container {
  margin-top: 20px;
  margin-bottom: 0;
  padding: 0;
  display: flex;
  position: relative;
}

.edit-tag-modal .btn {
  width: 100%;
}
.edit-tag-modal #create-tag-btn {
  padding-right: 20px;
}
</style>
