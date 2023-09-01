<script>
import page_helper from "../page_helper.ts";

export default {
  emits: ["ok", "cancel"],
  data()
  {
    return {
      current_name: '',
      work_user: {},
      date_from: new Date(),
      date_to: new Date(),
    }
  },
  props: {
    name: {
      type: String,
      default: undefined,
    },
    config: {
      type: Object,
      default: undefined
    },
  },
  methods: {
    user_updated(val) { this.work_user = val},
    date_from_updated(val) {this.date_from = val},
    date_to_updated(val) {this.date_to = val},
    name_updated(val) { this.current_name = val},
    init(){
      if(this.name == undefined){
        setTimeout(this.init, 200)
        return
      }
      this.current_name = this.name
      console.log('loaded_config', this.config)
      if(!this.config) return
      console.log('loaded_config u', this.config.user)
      if(this.config.user) this.work_user = this.config.user
      if(this.config.date_from) this.date_from = this.config.date_from
      if(this.config.date_to) this.date_to = this.config.date_to
      console.log('loaded_config u', this.work_user)
    }
  },
  mounted() {
    this.init();
  },
  computed: {
    config: function () {
      return {user: this.work_user, date_from: this.date_from, date_to: this.date_to}
    },
    user_uuid: function () {
    
      if(this.work_user != undefined && this.work_user.uuid != undefined) return this.work_user.uuid
      return 'null'
    },
  },

};
</script>

<template ref="config" v-if="config">
  <div class="panel gadget-config">
    <div class="gadget-config-fields">
      <StringInput class="gadget-config-field" @updated="name_updated" label="Название" :value="current_name"> </StringInput>
      <UserInput  class="gadget-config-field" @updated_full_user="user_updated" label="Пользователь" :value="user_uuid"> </UserInput>
      <DateInput class="gadget-config-field" @updated="date_from_updated" label="С" :value="date_from"> </DateInput>
      <DateInput class="gadget-config-field" @updated="date_to_updated" label="По" :value="date_to"> </DateInput>
    </div>

    <div class="gadget-edit-mode-btn-container">
      <KButton @click="$emit('ok', {config: config, name: current_name})" class="save-gadget-config-btn" name="Сохранить" />
      <KButton @click="$emit('cancel')" class="cancel-gadget-config-btn" name="Отменить" />
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
