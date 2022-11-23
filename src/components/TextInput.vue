<template>   
  <div class="text" >
    <div class="label">{{label}}</div>
    <textarea ref="text_input_shadow" class="text-input text-input-shadow" :type="type" v-model="value"></textarea>
    

    <textarea ref="text_input" @focus="$emit('input_focus', true)" @blur="$emit('input_focus', false)"
    @keyup="resize"
    @keydown.ctrl.b="make_bold"
    :id="'text_input_' + id"
    class="text-input" :type="type"  v-model="val" :disabled="disabled" ></textarea>
  </div>
</template>

<script>
  import { nextTick } from 'vue'

  export default 
  {
    data()
    {
      let d = 
      {
        val: ''
      }
      return d
    },

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
        //this.$refs.text_input.style.height = "auto";
        //this.$refs.text_input.style.height = 0
     
          this.$refs.text_input.style.height = `${this.$refs.text_input_shadow.scrollHeight+4}px`;

      },
      getCaretIndex(element) {
        let position = 0;
        const isSupported = typeof window.getSelection !== "undefined";
        if (isSupported) {
          const selection = window.getSelection();
          if (selection.rangeCount !== 0) {
            try{
              const range = window.getSelection().getRangeAt(0);
              const preCaretRange = range.cloneRange();
              preCaretRange.selectNodeContents(element);
              preCaretRange.setEnd(range.endContainer, range.endOffset);
              position = preCaretRange.toString().length;
            }
            catch(e){}
          }
        }
        return position;
      },
      make_bold(e)
      {
        const bold_tag = '**'
        console.log('make_bold', e.target)
       // console.log(e)
        var elInput = e.target//document.getElementById('tempid') // Select the object according to the id selector
        var startPos = elInput.selectionStart// input the 0th character to the selected character
        var endPos = elInput.selectionEnd// The selected character to the last character

        if(startPos < endPos){
        //console.log(e, startPos, endPos)
          this.val = this.val.substring(0, startPos) + bold_tag  + this.val.substring(startPos, endPos) + bold_tag + this.val.substring(endPos);

          nextTick(() => {
            elInput.selectionStart = endPos + bold_tag.length*2
          elInput.selectionEnd = endPos + bold_tag.length*2

          })
          
        }
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
      this.val = this.value
      this.resize();
    },
    computed:
    {
      
        scroll_height: function(){
          if(this.$refs == undefined || this.$refs.text_input_shadow == undefined) return 0
          return this.$refs.text_input_shadow.scrollHeight
        }
      
    },
  
    
    watch: {
      scroll_height: function()
      {

        this.resize()
      },
      value: function(val, oldVal) {
        if(this.val == val) return
        this.val = val
        
        this.resize()
      },
    
      val: function(val, oldVal) {
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
    background: var(--input-bg-color);
    width: 100%;

    border-color: var(--border-color);
    border-style: inset;
    border-width: var(--border-width);
    border-radius: var(--border-radius);

  }

  .text-input-shadow{
    height: 0px !important;
    max-height: 0px !important;
    min-height: 0px !important;
    border: none;
    border-style: none !important;
    padding: 0px !important;
    transition: none !important;
    overflow: scroll !important;
    scroll-behavior: auto !important;
  }

  .text-input:disabled {
    background: var(--disabled-bg-color);
  }

  .text-input::-webkit-scrollbar {
    display: none; 
}



</style>