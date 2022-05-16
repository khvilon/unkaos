<template>
  <div class="tab" v-show="title===selected">
    <slot></slot>
  </div>
</template>

<script>
  export default {
    props: {
      title: {
        type: String,
        default: 'Tab'
      }
    },
    data () {
      return {
        isActive: true
      }
    },
    computed:
    {
      selected: function() {
        console.log(this.$parent.selected)
        return this.$parent.selected
        }
    }
  }
</script>

<style lang="css"></style>