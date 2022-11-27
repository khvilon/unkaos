<template>
  <div class="issue-actions" v-if="actions !== undefined">
    <div class="issue-actions-header">
      <SelectInput
        style="padding: 0"
        label=""
        :value="sortOrder"
        :values="sort_types"
        :parameters="{ clearable: false }"
        @update_parent_from_input="changeSortOrder"
      >
      </SelectInput>
    </div>
    <TransitionGroup name="element_fade">
      <Comment
        v-for="action in sorted_actions"
        :key="action.uuid"
        :action="action"
        style="margin-bottom: 10px"
        :images="images"
      />
    </TransitionGroup>
  </div>
</template>

<script>
export default {
  name: "CommentList",
  data() {
    return {
      sortOrder: true,
      sort_types: [
        { value: false, name: "Сначала новые" },
        { value: true, name: "Сначала старые" },
      ],
    };
  },
  props: {
    actions: {
      required: true,
    },
    images: {
      type: Array,
      default: [],
    },
  },
  computed: {
    sorted_actions() {
      if (this.actions !== undefined) {
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
  },
  methods: {
    changeSortOrder(sortOrder) {
      localStorage.comment_sort_order = sortOrder;
      this.sortOrder = sortOrder;
    },
  },
  mounted() {
    const sort = localStorage.comment_sort_order;
    if (sort !== undefined) {
      this.sortOrder = sort;
    } else {
      localStorage.comment_sort_order = true;
      this.sortOrder = true;
    }
  },
};
</script>

<style scoped>
.issue-actions {
  margin-top: 20px;
}

.issue-actions-header {
  background: black;
  display: none;
}
</style>
