<template>   
  <label class="avatar">
    <div class="label">{{label}}</div>
    <input type="file" accept="image/*" v-on:change="preview_files"/>
    <img class="avatar-input" :src="get_src(value)"/>
  </label>
</template>


<script>
  import tools from '../tools.ts'

  export default 
  {

    props:
    {
      label:
      {
        type: String,
        default: 'label'
      },
      value:
      {
        type: String,
        default: ''
      },
      id:
      {
        type: String,
        default: ''
      },
      parent_name:
      {
        type: String,
        default: ''
      }

    },
    methods: {
      get_src: function(value) 
      {
        if (value) return value
        else return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAAe9JREFUSEvlVtFRHTEQkyqADggVABWEdAAdQAVABSQVABWkBOgAqACoAEqACsRoZp05fPZ5j8kMH+zPvbnzW3m18srEFwW/CBefApa0D2AnNv1I8n5tAauAJR0A+AtgswJ6BXBM8ia7gTSwpEsAJ4PEZyS9bhgp4KD2NrKZVie/I/kaLJwC+Bnff5G8GyFngR+jp08kd1tJJb0A2ALgnu/9L2BFoi6Vkn4DOPc6ksOChgsqmrs0ZtcVJjLAPwA8xx8Oe8qVdBSK99Jtkqa+G0Ng/1OSj8sGgCuSFtIsJqp/I1kft9n6LPD0KM3ormjubm6KngV2BT4iZVr5t5VuJjxUitK7qq9LTgEH3e61J1MBr3P5fB+NepsWV51dkns8rdKV32Qn1qeBR4Mh+z1FtST30BT72Zxc0XNX7z77uRiLwJIsKruRqV0T1oLdyuJrRhe4Y4FvUVkrmZnwWS+xaJVN4KD2YZLkyo40UqwkK9/im9rnXov6HnBxI1d4kLG5KQXB1nW8a7rVDHjqMgDSxt45dhfx/g9Ju9e/aAF7KtnU01OoJyBJhbl7kr6nLQIX753tco2svXbJoz9UXImqa4HZDVS9/iCyGth0lLtV6u60tImly0EN7IFRJpPV2B0AmapjADXzpUZmBmTtmu8H/A4J79EfjfUqWAAAAABJRU5ErkJggg=='
      },
      preview_files: async function(event) 
      {
        const val = await tools.readUploadedFileAsImg(event.target.files[0])

        console.log(val)

        

        this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})

       // console.log(event.path[1].children[2].src=val)

        //this.changed_value = 'aaa'                   
      }
    },
    watch: {
      value: function(val, oldVal) {
        console.log('vch', val, oldVal, this.id, this.parent_name)
        let data = {}
        data[this.id] = val
        this.$store.commit('push_update_' + this.parent_name, data)
        //event.path[1].children[2].src=val
      }
    }
  }
</script>

<style scoped lang="scss">

  @import '../css/global.scss';
  
  .avatar .avatar-input
  {
    width: 35px;
    height: 35px;
    color: var(--text-color);
  }

  .avatar
  {
        padding: 10px 20px 10px 20px;
        display: block;
  }

  .avatar-input {
    font-size: 20px;
    font-weight: 400;
    border-radius: var(--border-radius);
    transition: all 0.5s ease;
    background: var(--input-bg-color);
    display: inline-block;
    text-align: center;  
    border-color: var(--border-color);
    border-width: var(--border-width);
    border-style: var(--border-style);
  }

  [type=file] {
    visibility: hidden;
    width: 0px
  }

</style>