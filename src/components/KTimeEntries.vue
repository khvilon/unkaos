<script>
import tools from "../tools.ts";
import rest from "../rest.ts";
import cache from "../cache";

export default {
  emits: ["new_time_entry", "edit_time_entry"],
  props: {
    time_entries: {
      type: Array,
      default: [
      ],
    },
  },
  methods: {
    format_date: function (value) {
      return tools.format_date(value)
    },
    sort_time_entries: function(time_entries)
    {
      return time_entries.sort(tools.compare_obj_dt('work_date'))
    }
  },
  computed: {
    authors_time_entries: function () {
      let authors_time_entries = {}
      for(let i = 0; i < this.time_entries.length; i++){
        let author = this.time_entries[i].author[0]
        if(authors_time_entries[author.uuid] == undefined) authors_time_entries[author.uuid] = {author: author, sum:0, entries:[]}
        authors_time_entries[author.uuid].entries.push(this.time_entries[i])
        authors_time_entries[author.uuid].sum += Number.isInteger(this.time_entries[i].duration) ? this.time_entries[i].duration : 0
      }
      return authors_time_entries
    },
    my_uuid :()=>cache.getObject("profile").uuid
  },
};
</script>

<template>
  <label class="time-entries">
    <div class="label">
      <i class="bx bx-time"></i
      ><i
        class="add-time-entry-btn bx bx-plus"
        @click="() => $emit('new_time_entry')"
      ></i
      >
    </div>
    <div
    v-for="(author_time_entries) in authors_time_entries"
    class="author-time-entries"
    >
    <img v-if="author_time_entries.author.avatar" :src="author_time_entries.author.avatar" />
    <span class="time-entries-author-name">{{ author_time_entries.author.name }} {{ author_time_entries.sum }}ч</span>
    <div
      class="time-entry"
      v-for="(time_entry) in sort_time_entries(author_time_entries.entries)"
    >
      <span>{{ format_date(time_entry.work_date) }}</span>
      <span class="time-entry-duration">{{ time_entry.duration }}ч</span>
      <span class="time-entry-comment">{{ time_entry.comment }}</span>
      <i
        v-if="time_entry.author[0].uuid == my_uuid"
        class="bx bx-pencil"
        @click="() => $emit('edit_time_entry', time_entry)"
      ></i>
    </div>
  
  </div>

    
  </label>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$time_entry_input_border_width: 2px;

.time-entries .time-entries-input {
  width: 100%;
  height: $input-height * 2;
}

.time-entries {
  display: block;
  margin-top: 20px;
}

.time-entries .label{
  display: flex;
  align-items: center;
}
.time-entries .bx-time{
  font-size: 15px;
}

.time-entries-input {
  font-size: 20px;
  font-weight: 400;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  background-color: transparent;
  text-align: center;
  border-color: var(--table-row-color);
  border-width: $time_entry_input_border_width;
  border-style: solid;
  display: flex;
}

.time-entry {
  margin-top: 2px;
  margin-left: 10px;
  margin-bottom: 3px;
  display: flex;
  align-items: end;
  width: fit-content;
}

.time-entry-resolved {
  text-decoration: line-through;
  opacity: .7;
}

.time-entries * {
  user-select: text;
} 

.add-time-entry-btn {
  margin-top: 5px;
  margin-left: 10px;
  margin-bottom: 3px;
  font-size: $font-size * 1.4;
  cursor: pointer;
}

.add-time-entry-btn:hover {
  color: green;
}

.time-entry span {
 // white-space: nowrap;
  line-height: calc($input-height/2);
  padding-right: 5px;
}

.time-entries .author-time-entries{
  width: fit-content;
}

.time-entry i {
  padding-left: 10px;
  padding-right: 10px;
  cursor: pointer;
}

.time-entry .bx-pencil {
  font-size: 14px;
  margin-top: 2px;
  padding-left: 0px;
  opacity: 0;
}
.time-entry .bx-pencil:hover {
  color: green;
}
.time-entries .author-time-entries:hover .bx-pencil {
  opacity: 1;
}

.time-entry .time-entry-comment{
  //font-style: italic;
}
.time-entry .time-entry-duration{
  font-weight: 600;
}

.time-entries .bx-link {
  font-size: $font-size * 1.4;
}

.time-entries img {
  height: 18px;
  width: 18px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
  top: 5px;
}

.time-entries .time-entries-author-name{
  font-size: 15px;
}
</style>
