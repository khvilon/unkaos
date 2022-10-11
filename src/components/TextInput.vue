<template>   
  <div class="text" >
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
        if(this.$refs.text_input == undefined) return;
        this.$refs.text_input.style.height = "auto";
        this.$refs.text_input.style.height = `${this.$refs.text_input.scrollHeight+4}px`;
      },
      pasted(e)
      {
        console.log(e)
      }
    },
    updated() {
      //this.resize();
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

<style lang="scss" >

@import '../css/global.scss';

  .text .text-input
  {
    width: 100%;
    height: $input-height*2;
    min-height: $input-height*2;
    color: var(--text-color);
    padding: 0 10px 0 10px;
    resize: none;
  }

  .text
  {
    padding: 10px 20px 10px 20px;
  }


  .text-input {
    font-size: 13px;
    font-weight: 400;
    border-radius: var(--border-radius);
    transition: all 0.5s ease;
    background: var(--input-bg-color);
    width: 100%;

     border-color: var(--border-color);
    border-style: inset;
    border-width: var(--border-width);
    border-radius: var(--border-radius);
  }

  .text-input:disabled {
    background: var(--disabled-bg-color);
  }

  .text-input::-webkit-scrollbar {
    display: none; 
}



</style>