<script>

import d from "../dict.ts";
import rest from "../rest";
import tools from "../tools";

export default {
  data()
  {
    return {
      time_entries: [],
      name: 'users',
      total_duration: 0,
      collumns: [
        {
          name: 'Дата',
          id: "work_date",
          type: "date",
        },
        {
          name: 'Часов',
          id: "duration",
        },
        {
          name: " Задача №",
          id: ["short_name", "'-'", "num"],
          search: true,
          type: "link",
          link: "/issue/",
          link_id: ["short_name", "'-'", "num"],
        },
        {
          name: "Комментарий",
          id: "comment",
        },
        {
          name: "Занесено",
          id: "created_at",
          type: "dt",
        }
      ]
    }
  },
  props: {
    config: {
      type: Object,
      default: {date_from: '1970-01-01', date_to: new Date(), user:{}}
    },
  },
  methods: {
    load_time_entries: async function () {
    this.time_entries = await rest.run_method("read_time_report", 
    {author_uuid: this.config.user.uuid, date_from: this.config.date_from, date_to: this.config.date_to});

      this.total_duration = 0
      for(let i = 0; i < this.time_entries.length; i++){
      this.total_duration += Number(this.time_entries[i].duration)
    }
  },
    init(){
      if(this.config == undefined){
        setTimeout(this.init, 200)
        return
      }
      
    },
    format_date(val){
      return tools.format_date(val)
    }
  },
  mounted() {
    this.load_time_entries()
  },
  computed: {

    conf_str: function () {
      return JSON.stringify(this.config)
    },
  },
  watch:{
    conf_str: function(val, old_val){
      this.load_time_entries()
    }
  }

};
</script>


<template ref="time_entries">
  <div>
    <div v-if="config.user" class="time-report-head">
      <img v-if="config.user.avatar" :src="config.user.avatar" />
      <div>{{ config.user.name }} с {{ format_date(config.date_from) }} по {{ format_date(config.date_to) }} {{ total_duration }}ч</div>
    </div>

      <div class="gadget_issues_table_panel panel">
        <Transition name="element_fade">
          <KTable
            v-if="!loading"
            :collumns="collumns"
            :table-data="time_entries"
            :name="'time_entries'"
            :dicts="{ users: users }"
          />
        </Transition>
      </div>

  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

.gadget_issues_table_panel {
  height: auto;
  width: 100%;
  border: none !important;
}

.gadget_issues_table_panel .ktable {
  margin: 0px;
  padding: 10px;
}

.time-report-head{
  margin: 10px 10px 10px 10px;
  font-weight: bold;
  display: flex;
  align-items: baseline;
}

.time-report-head img {
  height: 18px;
  width: 18px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
  top: 5px;
}
</style>
