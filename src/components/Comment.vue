<template>
  <div class="issue-comment">
    <div class="issue-comment-header">{{ dt }} <strong>{{ action.author }}</strong> {{ action.name }}</div>
    <div class="issue-comment-text" v-if="action.value.length !== 0">
      <KMarked
          :val="action.value"
      >
      </KMarked>
    </div>
  </div>
</template>

<script>
import tools from "../tools";

export default {
  name: "Comment",
  props: {
    action: {
      required: true
    },
  },
  computed: {
    dt() {
      return tools.format_dt(this.action.created_at)
    }
  },
  methods: {

  }
}
</script>

<style scoped>

.issue-comment {
  user-select: all;
  margin-bottom: 4px;
}

.issue-comment-header {
  margin-bottom: 3px;
}

.issue-comment-text {
  background: var(--disabled-bg-color);
  border-color: var(--border-color);
  border-width: var(--border-width);
  border-style: var(--border-style);
  border-radius: var(--border-radius);
  padding: 6px 8px 6px 8px;
}

</style>