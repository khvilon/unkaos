<script>
import page_helper from "../page_helper.ts";

import d from "../dict.ts";
import rest from "../rest";
import tools from "../tools";

let methods = {


  load_time_entries: async function () {
    console.log('>>>load_time_entries')
    let options = {date_from: this.config.date_from, date_to: this.config.date_to}
    if(this.config.user && this.config.user.uuid) options.author_uuid = this.config.user.uuid, 
    this.time_entries = await rest.run_method("read_time_report", options);

    this.total_duration = 0
    for(let i = 0; i < this.time_entries.length; i++){
      this.total_duration += Number(this.time_entries[i].duration)
    }
  },
  format_date: function(dt){return tools.format_date(dt)}
};

const data = {
  time_entries: [],
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
};

const mod = await page_helper.create_module(data, methods);

mod.props = {
  config: {
    type: Object,
    default: {date_from: '1970-01-01', date_to: new Date(), user:{}}
  }
};

mod.watch = {
  config: {
    deep: true,
    handler: function(newVal, oldVal) {
      
      if(!newVal || !newVal.date_from || !newVal.date_to || !newVal.user) return;
      if(oldVal && oldVal.toString() == newVal.toString() ) return;

      this.load_time_entries();
    },
    immediate: true
  }
};

export default mod;
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
