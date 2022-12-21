<template>
  <div class="issue-actions" v-if="actions !== undefined">
    <div class="issue-actions-header">
      <div class="issue-actions-buttons">
        <div
          class="issue-actions-button bx bx-message-dots"
          title="Отображать комментарии"
          v-bind:class="{ shadowed: !showComments }"
          @click="toggleComments"
        ></div>
        <div
          class="issue-actions-button bx bxs-time"
          title="Отображать затраченное время"
          style="display: none"
          v-bind:class="{ shadowed: !showTime }"
          @click="toggleTime"
        ></div>
        <div
          class="issue-actions-button bx bx-edit"
          title="Отображать изменения в полях задачи"
          v-bind:class="{ shadowed: !showEdits }"
          @click="toggleEdits"
        ></div>
        <div
          class="issue-actions-button bx bx-transfer"
          title="Отображать изменения статусов"
          v-bind:class="{ shadowed: !showTransitions }"
          @click="toggleTransitions"
        ></div>
        <div
          class="issue-actions-button"
          title="Порядок сортировки по дате создания"
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
import cache from "../cache.ts";
export default {
  name: "CommentList",
  data() {
    return {
      showComments:    cache.getObject("actions_show_comments"),
      showTime:        cache.getObject("actions_show_time"),
      showEdits:       cache.getObject("actions_show_edits"),
      showTransitions: cache.getObject("actions_show_transitions"),
      sortOrder:       cache.getObject("actions_sort_order"),
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
      cache.setObject('actions_sort_order', !this.sortOrder);
      this.sortOrder = !this.sortOrder;
    },
    toggleComments() {
      cache.setObject('actions_show_comments', !this.showComments);
      this.showComments = !this.showComments;
    },
    toggleTime() {
      cache.setObject('actions_show_time', !this.showTime);
      this.showTime = !this.showTime;
    },
    toggleEdits() {
      cache.setObject('actions_show_edits', !this.showEdits);
      this.showEdits = !this.showEdits;
    },
    toggleTransitions() {
      cache.setObject('actions_show_transitions', !this.showTransitions);
      this.showTransitions = !this.showTransitions;
    },
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
  padding: 2px;
  margin-right: 2px;
  border-radius: 2px;
  font-size: 16px;
  height: 20px;
  width: 20px;
}

.issue-actions-button:hover {
  cursor: pointer;
  background: var(--icon-hover-bg-color);
}

.shadowed {
  opacity: 40%;
}
</style>
