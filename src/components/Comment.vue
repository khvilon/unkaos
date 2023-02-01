<script>
import tools from "../tools";

export default {
  name: "Comment",
  props: {
    action: {
      required: true,
    },
    images: {
      type: Array,
      default: [],
    },
  },
  computed: {
    dt() {
      return tools.format_dt(this.action.created_at);
    },
    id() {
      return 'action' + this.action.uuid
    },
  },
  methods: {

    copyToClipboard(){
      tools.copyToClipboard(document.location.href.split('#')[0] + '#' + this.id)
    }
  },
};
</script>

<template>
  <div class="issue-comment" :ref="id" :id="id">
    <div class="issue-comment-header"  @click="copyToClipboard">
      <span>{{ dt }}</span> <strong>{{ action.author }}</strong> 
      <div v-if="action.name=='💬'" class="issue-action-icon bx bx-message-dots"></div>
      <div v-if="action.name=='📝'" class="issue-action-icon bx bx-edit"></div>
      <div v-if="action.name=='🔁'" class="issue-action-icon bx bx-transfer"></div>
      <div v-if="action.name=='time_entry'" class="issue-action-icon bx bx-time"></div>
    </div>
    <div class="issue-comment-text" v-if="action.value.length !== 0">
      <KMarked :val="action.value" :images="images"> </KMarked>
    </div>
  </div>
</template>

<style scoped>
.issue-comment {
  user-select: all;
  margin-bottom: 4px;
}

.issue-comment-header {
  display: flex;
  margin-bottom: 3px;
  text-align: center;
}

.issue-comment-header * {
  margin-right: 5px;
  cursor: pointer;
}

.issue-comment-text {
  background: var(--disabled-bg-color);
  border-color: var(--border-color);
  border-width: var(--border-width);
  border-style: var(--border-style);
  border-radius: var(--border-radius);
  padding: 6px 8px 6px 8px;
}

.issue-action-icon
{
  margin-top: 4px;
  font-size: 14px !important;
}
</style>
