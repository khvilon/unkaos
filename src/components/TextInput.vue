<template>   
  <div class="text">
    <div class="label">{{label}}</div>
    <textarea ref="text_input" @focus="$emit('input_focus', true)" @blur="$emit('input_focus', false)"
    class="text-input" :type="type"  v-model="value" :disabled="disabled" ></textarea>
  </div>
</template>

<script>
  export default 
  {

    props:
    {
      disabled:
      {
        type: Boolean,
        default: false
      },
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
      },
      type:
      {
        type: String,
        default: 'text'
      },

    },

    emits: ['update_parent_from_input', 'input_focus'],

     methods: {
      resize() {
        console.log('resizing')
        this.$refs.text_input.style.height = "auto";
        this.$refs.text_input.style.height = `${this.$refs.text_input.scrollHeight+4}px`;
      },
    },
    updated() {
      this.resize();
    },
    mounted() {
      this.resize();
    },
    
    watch: {
      value: function(val, oldVal) {
        console.log(val, oldVal, this.id, this.parent_name)

        this.resize()

        this.$emit('update_parent_from_input', val)

        if(this.parent_name == undefined || this.parent_name == '') return;

        
        this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})
      }
    }
  }
</script>

<style lang="scss">

@import '../css/palette.scss';
@import '../css/global.scss';

  .text .text-input
  {
    width: 100%;
    height: $input-height*2;
    min-height: $input-height*2;
    color: white;
    padding: 0 10px 0 10px;
    resize: none;
  }

  .text
  {
    padding: 10px 20px 10px 20px;
  }


  .text-input {
    font-size: 14px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background: rgb(29, 27, 49);
    width: 100%;

     border-color: $border-color;
    border-style: inset;
    border-width: 2px;
    border-radius: $border-radius;
  }

  .text-input:disabled {
    background: rgb(30, 35, 38);
  }

  .text-input::-webkit-scrollbar {
    display: none; 
}



</style>