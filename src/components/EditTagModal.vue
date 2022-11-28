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
    this.color = this.tag.color
  },
  
  methods: {
    async save_tag() {

      this.tag.color = this.color
      await rest.run_method("update_issue_tags", this.tag);
      this.$emit("tag_edited", this.tag);
      this.close()
    },
    close() {
      this.$emit("close_edit_tag_modal");
    },
    color_updated(color){
      this.color = color
    },
   
  },
};
</script>
<template>
  
    <div class="panel modal edit-tag-modal">
      <ColorInput
        label="Цвет"
        :value="tag.color"
        @updated="color_updated"
      >
      </ColorInput>

     

      <div class="btn-container">
        <KButton
          name="Сохранить"
          id="create-tag-btn"
          @click="save_tag()"
        />
        <KButton name="Отменить" @click="close()" />
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
  width: 350px;
  height: fit-content;
  left:  $top-menu-height;
  top: $top-menu-height;
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
