<script>

export default {
  emits: ["gadget_ok", "gadget_cancel", "gadget_title_updated"],
  props: {
    config: {
      type: Object,
      default: {}
    },
    title: {
      type: Object,
      default: ''
    },
  }
};
</script>

<template>
    <div class="panel gadget-config">
      <div class="gadget-config-fields">
        <StringInput class="gadget-config-field" @updated="(val)=>{$emit('gadget_title_updated', val)}" label="Название" :value="title" />
        <slot></slot>
      </div>

      <div class="gadget-edit-mode-btn-container">
        <KButton @click="$emit('gadget_ok')" class="save-gadget-config-btn" name="Сохранить" />
        <KButton @click="$emit('gadget_cancel')" class="cancel-gadget-config-btn" name="Отменить" />
      </div>
    </div>
</template>


<style lang="scss">
@import "../css/global.scss";

.gadget-config {
  width: 100%;
  height: 100%;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
}

.gadget-config .gadget-config-field{
  padding-bottom: 20px;
}

.gadget-config-fields {
  width: 100%;
  height: calc(100% - 30px);
  overflow: auto;
}

.gadget-config-fields .string {
  padding-left: 0px;
  padding-right: 0px;
  padding-top: 0px;
}

.gadget-edit-mode-btn-container {
  width: 100%;
  height: 30px;
  display: flex;
}

.gadget-edit-mode-btn-container .btn {
  width: 50%;
}
.gadget-edit-mode-btn-container .btn .btn_input {
  height: 100%;
  width: 100%;
}

.gadget-config .issue-search-input {
  width: 100%;
}

.save-gadget-config-btn {
  padding-right: 10px;
}

.cancel-gadget-config-btn {
  padding-left: 10px;
}
</style>
