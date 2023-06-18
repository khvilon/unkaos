<script>
import tools from "../tools";
import rest from "@/rest";
import cache from "@/cache";

export default {
  name: "Comment",
  emits: ["selected"],
  data() {
    return {
      hovered: false,
      settingsBoxActive: false,
    }
  },
  props: {
    action: {
      required: true,
    },
    images: {
      type: Array,
      default: [],
    },
    showAvatar: {
      type: Boolean,
      default: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    dateTime() {
      return tools.format_dt(this.action.created_at);
    },
    id() {
      return 'action' + this.action.uuid;
    },
    commentIsArchived() {
      return (this.action.archived_at) !== null;
    },
    removalAvailable() {
      const currentUserUuid = cache.getObject("profile").uuid
      return (this.hovered || this.selected)
          && currentUserUuid === this.action.author_uuid
          && this.action.name === '💬'
          && !this.commentIsArchived
    }
  },
  methods: {
    copyToClipboard() {
      tools.copyToClipboard(document.location.href.split('#')[0] + '#' + this.id);
    },
    onSelected() {
      this.$emit("selected");
    },
    toggleSettingsBox() {
      this.settingsBoxActive = !this.settingsBoxActive;
    },
    disableSettingsBox() {
      this.settingsBoxActive = false;
    },
    deleteComment() {
      this.action.archived_at = new Date().toISOString();
      rest.run_method("delete_issue_actions", {uuid: this.action.uuid});
    },
  },
};
</script>

<template>
  <div
      class="comment"
      :ref="id"
      :id="id"
      :class="{ selected: selected }"
      @click="onSelected"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      v-click-outside="disableSettingsBox"
  >
    <div class="comment-left-section">
      <KAvatar
          v-if="showAvatar"
          :userUuid="action.author_uuid"
      />
      <div v-else class="comment-type-icon">
        <div v-if="action.name === '💬'" class="issue-action-icon bx bx-message-dots"/>
        <div v-if="action.name === '📝'" class="issue-action-icon bx bx-edit"/>
        <div v-if="action.name === '🔁'" class="issue-action-icon bx bx-transfer"/>
        <div v-if="action.name === 'time_entry'" class="issue-action-icon bx bx-time"/>
      </div>
    </div>
    <div class="comment-right-section">
      <div class="comment-header-container">
        <div class="comment-header" @click="copyToClipboard">
          <strong>{{ action.author }}</strong>
          <label class="comment-date-time">{{ dateTime }}</label>
        </div>
        <div
            class="comment-actions"
            v-if="removalAvailable"
        >
          <div
               @click.self="toggleSettingsBox"
               class='comment-action-button bx bx-dots-horizontal-rounded'
          >
            <RelativeBox
                :childStyle="'margin: 3px 0 0 -192px;'"
                style=""
                v-if="settingsBoxActive"
            >
              <KButton
                  name="Удалить"
                  @click="deleteComment"
              />
            </RelativeBox>
          </div>
        </div>
      </div>
      <div class="comment-text" v-if="action.value.length !== 0">
        <div v-if="commentIsArchived">
          <i>Комментарий удалён.</i>
        </div>
        <KMarked
            v-else
            :val="action.value"
            :images="images"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment {
  display: flex;
  user-select: all;
  padding: 6px;
}

.comment-left-section {
  width: 40px;
}

.comment-type-icon {
  width: 40px;
  opacity: 40%;
  display: flex;
  justify-content: center;
}

.issue-action-icon {
  font-size: 16px !important;
  user-select: none;
}

.comment-right-section {
  width: 100%;
  margin-left: 8px;
}

.comment-header-container {
  display: flex;
  justify-content: space-between;
}

.comment-header {
  display: flex;
  text-align: center;
}

.comment-header * {
  margin-right: 5px;
  cursor: pointer;
}

.comment-date-time {
  opacity: 60%;
  font-size: 11px;
  align-self: flex-end;
}

.comment-actions {
  display: flex;
  height: 16px;
}

.comment-action-button {
  height: 16px;
  width: 16px;
  padding: 2px;
  border-radius: 4px;
  font-size: 12px;
}

.comment-action-button:hover {
  background: var(--icon-hover-bg-color);
  cursor: pointer;
}

.selected {
  background-color: var(--input-bg-color);
}
</style>
