<template>
  <div class="issue-actions" v-if="actions !== undefined">
    <div class="issue-actions-header">
      <div class="issue-actions-buttons">
        <div
          class="issue-actions-button bx bx-message-dots"
          v-bind:class="{ shadowed: !showComments }"
          @click="toggleComments"
        ></div>
        <div
          class="issue-actions-button bx bxs-time"
          style="display: none"
          v-bind:class="{ shadowed: !showTime }"
          @click="toggleTime"
        ></div>
        <div
          class="issue-actions-button bx bx-edit"
          v-bind:class="{ shadowed: !showEdits }"
          @click="toggleEdits"
        ></div>
        <div
          class="issue-actions-button bx bx-transfer"
          v-bind:class="{ shadowed: !showTransitions }"
          @click="toggleTransitions"
        ></div>
        <div
          class="issue-actions-button"
          @click="invertSortOrder"
          v-bind:class="{
            'bx bxs-up-arrow': sortOrder,
            'bx bxs-down-arrow': !sortOrder,
          }"
        ></div>
      </div>
    </div>
    <div class="issue-actions-list">
      <TransitionGroup name="element_fade">
        <Comment
          v-for="action in sorted_filtered_actions"
          :key="action.uuid"
          :action="action"
          style="margin-bottom: 10px"
          :images="images"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<script>
export default {
  name: "CommentList",
  data() {
    return {
      showComments: true,
      showTime: true,
      showEdits: true,
      showTransitions: true,
      sortOrder: true,
    };
  },
  props: {
    actions: {
      required: true,
    },
    images: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    sorted_actions() {
      if (this.actions !== undefined && this.actions.length > 0) {
        return [...this.actions].sort((a, b) => {
          if (this.sortOrder) {
            return new Date(b.created_at) - new Date(a.created_at);
          } else {
            return new Date(a.created_at) - new Date(b.created_at);
          }
        });
      } else {
        return [];
      }
    },
    sorted_filtered_actions() {
      let sf = this.sorted_actions;
      if (!this.showComments) {
        sf = sf.filter((action) => action.name !== "💬");
      }
      if (!this.showTime) {
        sf = sf.filter((action) => action.name !== "time");
      }
      if (!this.showEdits) {
        sf = sf.filter((action) => action.name !== "📝");
      }
      if (!this.showTransitions) {
        sf = sf.filter((action) => action.name !== "🔁");
      }
      return sf;
    },
  },
  methods: {
    invertSortOrder() {
      localStorage.actions_sort_order = !this.sortOrder;
      this.sortOrder = !this.sortOrder;
    },
    toggleComments() {
      localStorage.actions_show_comments = !this.showComments;
      this.showComments = !this.showComments;
    },
    toggleTime() {
      localStorage.actions_show_time = !this.showTime;
      this.showTime = !this.showTime;
    },
    toggleEdits() {
      localStorage.actions_show_edits = !this.showEdits;
      this.showEdits = !this.showEdits;
    },
    toggleTransitions() {
      localStorage.actions_show_transitions = !this.showTransitions;
      this.showTransitions = !this.showTransitions;
    },
  },
  mounted() {
    const sortOrder = localStorage.actions_sort_order;
    if (sortOrder !== undefined) {
      this.sortOrder = JSON.parse(sortOrder);
    } else {
      localStorage.actions_sort_order = true;
      this.sortOrder = true;
    }

    const showComments = localStorage.actions_show_comments;
    if (showComments !== undefined) {
      this.showComments = JSON.parse(showComments);
    } else {
      localStorage.actions_show_comments = true;
      this.showComments = true;
    }

    const showTime = localStorage.actions_show_time;
    if (showTime !== undefined) {
      this.showTime = JSON.parse(showTime);
    } else {
      localStorage.actions_show_time = true;
      this.showTime = true;
    }

    const showEdits = localStorage.actions_show_edits;
    if (showEdits !== undefined) {
      this.showEdits = JSON.parse(showEdits);
    } else {
      localStorage.actions_show_edits = true;
      this.showEdits = true;
    }

    const showTransitions = localStorage.actions_show_transitions;
    if (showTransitions !== undefined) {
      this.showTransitions = JSON.parse(showTransitions);
    } else {
      localStorage.actions_show_transitions = true;
      this.showTransitions = true;
    }
  },
};
</script>

<style scoped>
.issue-actions {
  margin-top: 20px;
}

.issue-actions-header {
  user-select: none;
  margin-bottom: 10px;
}

.issue-actions-buttons {
  display: flex;
  justify-content: flex-start;
}

.issue-actions-button {
  font-size: 16px;
  height: 20px;
  width: 20px;
}

.issue-actions-button:hover {
  cursor: pointer;
}

.shadowed {
  opacity: 40%;
}
</style>
