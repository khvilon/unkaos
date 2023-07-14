<script>
export default {
  name: "KAvatar",
  data() {
    return {
      defaultAvatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAAe9JREFUSEvlVtFRHTEQkyqADggVABWEdAAdQAVABSQVABWkBOgAqACoAEqACsRoZp05fPZ5j8kMH+zPvbnzW3m18srEFwW/CBefApa0D2AnNv1I8n5tAauAJR0A+AtgswJ6BXBM8ia7gTSwpEsAJ4PEZyS9bhgp4KD2NrKZVie/I/kaLJwC+Bnff5G8GyFngR+jp08kd1tJJb0A2ALgnu/9L2BFoi6Vkn4DOPc6ksOChgsqmrs0ZtcVJjLAPwA8xx8Oe8qVdBSK99Jtkqa+G0Ng/1OSj8sGgCuSFtIsJqp/I1kft9n6LPD0KM3ormjubm6KngV2BT4iZVr5t5VuJjxUitK7qq9LTgEH3e61J1MBr3P5fB+NepsWV51dkns8rdKV32Qn1qeBR4Mh+z1FtST30BT72Zxc0XNX7z77uRiLwJIsKruRqV0T1oLdyuJrRhe4Y4FvUVkrmZnwWS+xaJVN4KD2YZLkyo40UqwkK9/im9rnXov6HnBxI1d4kLG5KQXB1nW8a7rVDHjqMgDSxt45dhfx/g9Ju9e/aAF7KtnU01OoJyBJhbl7kr6nLQIX753tco2svXbJoz9UXImqa4HZDVS9/iCyGth0lLtV6u60tImly0EN7IFRJpPV2B0AmapjADXzpUZmBmTtmu8H/A4J79EfjfUqWAAAAABJRU5ErkJggg==",
  }
  },
  props: {
    userUuid: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: false
    }
  },
  computed: {
    getAvatar() {
      return this.$store.state.users?.users?.find(user => user.uuid === this.userUuid)?.avatar ?? this.defaultAvatar;
    }
  }
}
</script>

<template>
  <div class="user-avatar">
    <img :src="getAvatar" alt="Аватар">
  </div>
</template>

<style scoped>
.user-avatar {

}

.user-avatar img {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius);
  border-style: outset;
  border-width: 1px;
}
</style>