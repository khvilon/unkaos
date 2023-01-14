<script>
import rest from "../rest.ts";
import tools from "../tools.ts";

export default {
  emits: ["close_board_filter_modal", "ok_board_filter_modal"],
  props: {
    filter:{
      type: Object,
      default: {}
    },
    fields: {
      type: Array,
      default: [],
    },
    projects: {
      type: Array,
      default: [],
    },
    issue_statuses: {
      type: Array,
      default: [],
    },
    issue_types: {
      type: Array,
      default: [],
    },
    users: {
      type: Array,
      default: [],
    },
    sprints: {
      type: Array,
      default: [],
    },
    issue_tags: {
      type: Array,
      default: [],
    },
  },

  data() {
    return {
        modif_filter: {},
        saved_filter: {},
        save_try_done: false,
        alert_text: ['Введите название', 'Введите валидный запрос']
    };
  },
  created() {},
  mounted() {
    //this.select_tab(0)

    this.init()
  },
  computed: {
    visible: function () {
      this.vvisible;
      return !this.vvisible;
    },
  },
  methods: {

    change_name(name){this.modif_filter.name = name},
    change_query(query){this.modif_filter.query = query},
    change_is_private(is_private){this.modif_filter.is_private = is_private},
    change_converted_query(converted_query){this.modif_filter.converted_query = converted_query},
  
    init(){
      if(!this.filter.name) {setTimeout(this.init, 200); return}
      this.modif_filter = this.filter
      this.saved_filter = tools.obj_clone(this.filter)
    },

    filter_ok() {
      this.save_try_done = true;

      if(!this.modif_filter.name || !this.modif_filter.converted_query) return
      this.$emit("ok_board_filter_modal", this.modif_filter);
    },
    close() {
      for(let i in this.saved_filter){
        this.modif_filter[i] = this.saved_filter[i]
      }
      this.$emit("close_board_filter_modal");
    },
    
  },
};
</script>
<template>
  <div class="modal-bg" @mousedown.self="close()">
    <div class="panel modal board-filter-modal">

      <div 
      v-if="save_try_done && (!modif_filter.name || !modif_filter.converted_query)"
      class="save-alert">{{ !modif_filter.name ? alert_text[0] : alert_text[1] }}</div>

      <StringInput
        label="Название"
        :value="modif_filter.name"
        @update_parent_from_input="change_name"
      >
      </StringInput>


    <IssuesSearchInput
		label="Условие"
		class='board-filter-issue-search-input'

		@update_parent_from_input="change_query"
    @converted="change_converted_query"
		:fields="fields"
		:projects="projects"
		:issue_statuses="issue_statuses"
		:tags="issue_tags"
		:issue_types="issue_types"
		:users="users"
		:sprints="sprints"
		id='filter_query'
		:parent_query="modif_filter.query"
		/>

    
    <BooleanInput
        label="Персональный"
        :value="modif_filter.is_private"
        @update_parent_from_input="change_is_private"
      >
      </BooleanInput>

      <div class="btn-container">
        <KButton
          :name="modif_filter.uuid ? 'Сохранить' : 'Создать'"
          id="filter-ok-btn"
          @click="filter_ok()"
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

.board-filter-modal {
  padding: 20px;
  position: absolute;
  width: 60%;
  height: fit-content;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.board-filter-modal-row {
  display:flex;
}

.board-filter-modal-row .string {
  width: 100%;
  padding-left: 50px;
}

.board-filter-modal > *:not(:last-child) {
  margin-bottom: 10px;
}

.board-filter-modal .btn-container {
  margin-top: 20px;
  margin-bottom: 0;
  padding: 0;
  display: flex;
  position: relative;
}

.board-filter-modal .btn {
  width: 100%;
}
.board-filter-modal #filter-ok-btn {
  padding-right: 20px;
}

.board-filter-modal .issue-search-input-btn{
  display: none;
}

.board-filter-modal .issue-search-div .text-input{
  margin-right: 0px !important;
}

.board-filter-modal .save-alert{
  width: 100%;
    position: absolute;
    text-align: center;
    color: red;
    top: 0px;
    left: 0px;
}
</style>
