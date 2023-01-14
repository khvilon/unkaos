<script>
import rest from "../rest.ts";
import tools from "../tools.ts";

export default {
  emits: ["close_time_entry_modal", "ok_time_entry_modal", "delete_time_entry"],
  props: {
    time_entry:{
      type: Object,
      default: {}
    },
   
  },

  data() {
    return {
        modif_time_entry: {},
        saved_time_entry: {},
        save_try_done: false,
        alert_text: ['Введите валидную дату', 'Введите валидное время в часах']
    };
  },
  created() {},
  mounted() {
    //this.select_tab(0)

    this.init()
  },
  methods: {

    change_work_date(work_date){
      if(!tools.string_is_date(work_date)) this.modif_time_entry.work_date = null
      else this.modif_time_entry.work_date = new Date(work_date)
    },
    change_duration(duration){
      console.log('duration', duration)
      this.modif_time_entry.duration = duration},
    change_comment(comment){
      console.log('comment', comment)
      this.modif_time_entry.comment = comment},
   
    init(){
      if(!this.time_entry.author_uuid) {setTimeout(this.init, 200); return}
      this.modif_time_entry = this.time_entry
      this.saved_time_entry = tools.obj_clone(this.time_entry)
    },

    time_entry_ok() {
      this.save_try_done = true;

      if(!this.modif_time_entry.work_date || !this.modif_time_entry.duration || this.modif_time_entry.duration < 1) return
      this.$emit("ok_time_entry_modal", this.modif_time_entry);
    },
    close() {
      for(let i in this.saved_time_entry){
        this.modif_time_entry[i] = this.saved_time_entry[i]
      }
      this.$emit("close_time_entry_modal");
    },
    
  },
};
</script>
<template>
  <div class="modal-bg" @mousedown.self="close()">
    <div class="panel modal time-entry-modal">

      <i
        v-if="time_entry.uuid"
        class="delete-time-entry-btn bx bx-trash"
        @click="() => $emit('delete_time_entry', time_entry)"
      ></i>

      <div 
      v-if="save_try_done && (!modif_time_entry.work_date || !modif_time_entry.duration || modif_time_entry.duration < 1)"
      class="save-alert">{{ !modif_time_entry.work_date ? alert_text[0] : alert_text[1] }}</div>



      <DateInput
        label="Число"
        :value="modif_time_entry.work_date"
        @update_parent_from_input="change_work_date"
      >
      </DateInput>

      <NumericInput
        label="Время, ч"
        :value="modif_time_entry.duration"
        @update_parent_from_input="change_duration"
      >
      </NumericInput>

      <StringInput
        label="Комментарий"
        :value="modif_time_entry.comment"
        @update_parent_from_input="change_comment"
      >
      </StringInput>


      <div class="btn-container">
        <KButton
          :name="modif_time_entry.uuid ? 'Сохранить' : 'Создать'"
          id="time-entry-ok-btn"
          @click="time_entry_ok()"
        />
        <KButton name="Отменить" @click="close()" />

      </div>

      
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

.modal-bg {
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  position: absolute;
  z-index: 10;
}

.time-entry-modal {
  padding: 20px;
  position: absolute;
  width: 60%;
  height: fit-content;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.time-entry-modal-row {
  display:flex;
}

.time-entry-modal-row .string {
  width: 100%;
  padding-left: 50px;
}

.time-entry-modal > *:not(:last-child) {
  margin-bottom: 10px;
}

.time-entry-modal .btn-container {
  margin-top: 20px;
  margin-bottom: 0;
  padding: 0;
  display: flex;
  position: relative;
}

.time-entry-modal .btn {
  width: 100%;
}
.time-entry-modal #time-entry-ok-btn {
  padding-right: 20px;
}

.time-entry-modal .issue-search-input-btn{
  display: none;
}

.time-entry-modal .issue-search-div .text-input{
  margin-right: 0px !important;
}

.time-entry-modal .save-alert{
  width: 100%;
    position: absolute;
    text-align: center;
    color: red;
    top: 0px;
    left: 0px;
}

.time-entry-modal .delete-time-entry-btn{
  position: absolute;
  right: 6px;
  top: 6px;
  font-size: 16px;
  cursor: pointer;
}

.time-entry-modal .delete-time-entry-btn:hover{
  color:red;
}
</style>
