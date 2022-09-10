<template>   
  <div class="text">
    <div class="label">{{label}}</div>
    <div contenteditable="" ref="issues_search_input" 
    @focus="focus" @blur="$emit('input_focus', false);blur()"
    @input="handleInput"
    class="text-input" :type="type"   :disabled="disabled" 
    v-html="get_html()"
    ></div>
    <div ref="suggestion_area"  
    class="suggestion-area"
    v-show="is_in_focus"
    >
    
      <span
        v-for="(suggestion, index) in suggestions"
        :key="index"
        @click="use_suggestion(suggestion)"
      >
        {{suggestion}}
      </span>
    </div>
  </div>
</template>

<script>
  import { nextTick } from 'vue'

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
      fields:
      {
        type: Array,
        default: []
      }

    },

    emits: ['update_parent_from_input', 'input_focus'],
    data() {
      return {
        suggestions: ['aa', 'bb'],
        is_in_focus: false,
        attributes: ['Тип', 'Номер'],
        brackets: ['(', ')'],
        operations: ['=', '<', '>'],
        logic_operators: ['and', 'or'],
        fields_and_attributes: [],
        value: '',
        str_start_idx: 0,
        str_end_idx: 0,
        position: 0

      }
    },

     methods: {
      resize() {
        console.log('resizing')
      //  if(this.$refs.text_input == undefined) return;
      //  this.$refs.text_input.style.height = "auto";
      //  this.$refs.text_input.style.height = `${this.$refs.text_input.scrollHeight+4}px`;
      },
      get_html()
      {
        let chars = this.value.split('')
        let html = ''
        for(let i in chars)
        {
          if(chars[i] == ' ') chars[i] = '&nbsp;'
          html += '<span class="issues-search-char char-' + i + '">' + chars[i] + '</span>'
        }
        
        let pos0 = this.position
        let pos1 = this.getCaretIndex(this.$refs.issues_search_input)
        console.log(pos0, pos1)
        if(pos0 > 0) this.setCaretIndex(this.$refs.issues_search_input, pos0)
        
        return html
      },
      getCaretIndex(element) {
        let position = 0;
        const isSupported = typeof window.getSelection !== "undefined";
        if (isSupported) {
          const selection = window.getSelection();
          if (selection.rangeCount !== 0) {
            const range = window.getSelection().getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            position = preCaretRange.toString().length;
          }
        }
        return position;
      },
      setCaretIndex(element, pos) {
        const isSupported = typeof window.getSelection !== "undefined";
         nextTick(() => {
        if (isSupported) {
              
              console.log('popopo', pos-1)
              const node = element.childNodes[pos-1]
              if(node == undefined) return
              const range = document.createRange()
              range.setStart(node, 1)
              range.setEnd(node, 1)

              const selection = window.getSelection()
              selection.removeAllRanges()
              selection.addRange(range)          
          }
        });
        
      },
      color_text(start_idx, end_idx, color)
      {

        for(let i = start_idx; i < end_idx; i++)
        {
          this.createClass('char-' + i, '{color: ' + color + '}')
        }
          
      },
      handleInput(e) 
      {
     
          this.position = this.getCaretIndex(e.target)
          console.log('pospos', e, this.position)
          this.value = e.target.innerText.replace(' ', ' ')

          if(this.value == undefined) return ''
          this.convert_query(this.value)
  
    },

    focus(e)
    {
      console.log('fff', e)
      this.$emit('input_focus', true);
      this.is_in_focus=true;
      if(this.value=='') this.fill_suggestions(0)
      

      
    },

      blur()
      {
        setTimeout("this.is_in_focus=false", 100)
      },

      have_word_at(arr, word, idx)
      {
        return arr.substr(idx, word.length) == word
      },

      have_words_at(arr, words, idx)
      {
        for(let i in words)
        {
          if(this.have_word_at(arr, words[i], idx)) return words[i]
        }
        return false
      },

      fill_suggestions(waits_for_idx)
      {
        this.suggestions = []
        if(waits_for_idx == 0)
        {
          this.fields_and_attributes = []
          for(let i in this.fields)
          {
            this.fields_and_attributes.push(this.fields[i].name)
          }
          for(let i in this.attributes)
          {
            this.fields_and_attributes.push(this.attributes[i])
          }
          this.fields_and_attributes = this.fields_and_attributes.sort();
          this.suggestions = this.fields_and_attributes
        }
        else if(waits_for_idx == 1)  this.suggestions = this.operations
        else if(waits_for_idx == 3)  this.suggestions = this.logic_operators
      },


      

      use_suggestion(suggestion)
      {
        console.log('use_suggestion', this.str_start_idx, this.str_end_idx)
        if(this.str_start_idx > 0 && this.value[this.str_start_idx] != ' ') suggestion = ' ' + suggestion
        suggestion += ' '
        console.log('ssss', suggestion + '#')
        this.value = this.value.substring(0, this.str_start_idx) + suggestion + this.value.substring(this.str_end_idx+1)
        this.position = this.str_start_idx + suggestion.length
        console.log('ssss2', this.value + '#')
        this.$refs.issues_search_input.focus();

        nextTick(() => {
          this.setCaretIndex(this.$refs.issues_search_input, this.position)

           nextTick(() => {
            this.convert_query(this.value)
           })
        })

        

        //this.color_text(this.$refs.issues_search_input, this.str_start_idx, this.str_start_idx + suggestion.length, 'red')        
      },

      createClass(name,rules)
      {
        let style = document.getElementById(name)
        if(!style) 
        {
          style = document.createElement('style');
          style.id = name
          style.type = 'text/css';
          document.getElementsByTagName('head')[0].appendChild(style);  
        }
        
        style.innerHTML = '.' + name + ' ' + rules;
         
        console.log(name)    
      },


      try_find_field(qd)
      {
        let found = false

        for(let j in this.fields)
        {
          if(this.have_word_at(qd.query, this.fields[j].name, qd.i))
          {
            qd.converted_query += 'fields#' + this.fields[j].uuid + '#'
            qd.i += this.fields[j].name.length-1
            found = true;
            break;
          }
        }

        if (found) return found

        for(let j in this.attributes)
        {
          if(this.have_word_at(qd.query, this.attributes[j], qd.i))
          {
            converted_query += 'attr#' + this.attributes[j] + '#'
            i += this.attributes[j].length-1
            qd.found_attr = true;
            break;
          }
        }

        return found
      },

      

      convert_query(query){



        //query = query.substring(0, this.position)

        let waits_for_statuses = ['field', 'oper', 'val', 'logic']
        let waits_for_idx = 0 

        //query data
        let qd = 
        {
          query: query,
          i: 0,
          converted_query: ''
        }

        
        console.log('query', query, this.fields)

        let converted_query = ''

        for(qd.i = 0; qd.i < query.length; qd.i++)
        {
          
          console.log('aaaaaaaaaa', qd)

          if(query[qd.i] == ' ') 
          {
            this.str_start_idx = i
            this.end_idx = qd.query.length
            if(i == qd.query.length-1) this.fill_suggestions(waits_for_idx)
            continue
          }
        
          console.log('waits_for_idx', waits_for_idx, qd.i)

          if(waits_for_idx == 0)
          {
            let br = this.have_words_at(query, this.brackets, qd.i)
            if(br)
            {
              qd.converted_query += br
              continue
            }

            let found = this.try_find_field(qd)

            if(found)
            {
              waits_for_idx = 1
              this.color_text(this.str_start_idx, qd.i+1, 'green')
              this.str_start_idx = qd.i+1
              this.str_end_idx = qd.i+1
            }
            else
            {
              this.str_start_idx = qd.i
              this.str_end_idx = qd.query.length
              let name = query.substr(qd.i, qd.query.length-qd.i)
              this.fill_suggestions(waits_for_idx)
              this.suggestions = this.suggestions.filter((elem)=>elem.includes(name))
              console.log('field not found', name, qd.converted_query)
              this.color_text(this.str_start_idx, this.str_end_idx, 'red')
              return
            }
          }
          else if(waits_for_idx == 1)
          {
            let found_oper = false
            for(let j in this.operations)
            {
              console.log('opoper', query, i)
              if(this.have_word_at(query, this.operations[j], i))
              {
                converted_query += this.operations[j]
                i += this.operations[j].length-1
                found_oper = true;
                break;
              }
            }


            if(found_oper)
            {
                waits_for_idx = 2
                console.log('draw y', this.str_start_idx, i)
                this.color_text(this.str_start_idx, i+1, 'yellow')
                this.str_start_idx = i+1
                this.str_end_idx = i+1
                this.fill_suggestions(2)
            }
            else
            {
              console.log('operation not found', converted_query)
              this.str_start_idx = i
              this.str_end_idx = query.length-1
              this.fill_suggestions(1)
              return
            }
            
          }
          else if(waits_for_idx == 2)
          {
            let end_idx = -1

            if( query[i] == "'") end_idx = query.indexOf("'", i+1)
            else
            {
              let end_idx0 =  query.indexOf(' ', i)
              let end_idx1 =  query.indexOf(')', i)
              if(end_idx0 > 0 && end_idx1 > 0) end_idx = Math.min(end_idx0, end_idx1)
              else if(end_idx0 > 0) end_idx = end_idx0
              else if(end_idx1 > 0) end_idx = end_idx1
            }

            console.log('end_idx', end_idx)

            if(end_idx > 0)
            {
              let val = query.substring(i, end_idx)
              converted_query += val
              console.log('value finalised', converted_query)
              this.color_text(i, end_idx+1, 'blue')
              waits_for_idx = 3
              this.fill_suggestions(waits_for_idx)
              this.suggestions = this.suggestions.filter((elem)=>elem.includes(name))
              i+= val.length +1
              this.str_start_idx = i+1;
              this.str_end_idx = i+1;
              
            }
            else
            {
              console.log('value not finalised', converted_query)
              this.color_text(i, query.length, 'red')
              return
            }
            

          }
          
          else if(waits_for_idx == 3)
          {
            let found_oper = false
            for(let j in this.logic_operators)
            {
              if(this.have_word_at(query, this.logic_operators[j], i))
              {
                converted_query += ' ' + this.logic_operators[j] + ' '
                i += this.logic_operators[j].length-1
                found_oper = true;
                console.log('conv query', converted_query)
                break;
              }
            }
            if(found_oper)
            {
              waits_for_idx = 0
              this.fill_suggestions(waits_for_idx)

              console.log('oper found', converted_query)
              this.color_text(i, end_idx+1, 'orange')

              this.fill_suggestions(waits_for_idx)
              this.suggestions = this.suggestions.filter((elem)=>elem.includes(name))
              this.str_start_idx = i+1;
              this.str_end_idx = i+1;
              continue
            }
            else
            {
              this.fill_suggestions(waits_for_idx)
              return
            }
            
          }

      }

      //this.fill_suggestions(waits_for_idx)

      console.log('convvvvvvvvvvv query', converted_query)
    }
    },
    updated() {
      this.resize();
    },
    mounted() {
      this.resize();
    },
   /* 
    watch: {
      value: function(val, oldVal) {
       // console.log(val, oldVal, this.id, this.parent_name)

        this.resize()

        this.$emit('update_parent_from_input', val)

        this.convert_query(val)

        if(this.parent_name == undefined || this.parent_name == '') return;

        
        this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})
      }
    }*/
  }
</script>

<style lang="scss">

@import '../css/palette.scss';
@import '../css/global.scss';

  .issues-search-char
  {
    margin: 0px !important;
    font-size: 15px !important;
  }

  .text .text-input
  {
    width: 100%;
    height: $input-height;
    min-height: $input-height;
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
    transition: all 0.5s ease;
    background: rgb(29, 27, 49);
    width: 100%;

     border-color: $border-color;
    border-style: inset;
    border-width: 2px;
    border-radius: $border-radius;
  }

  .suggestion-area {
    font-size: 12px;
    font-weight: 300;
    transition: all 0.5s ease;
    background:  rgb(30, 35, 38);
    width: 50%;

     border-color: $border-color;
    border-style:groove;
    border-width: 2px;
    border-radius: $border-radius;

    display: flex;
    flex-direction: column;
  }

  .suggestion-area span {
    cursor: pointer;
  }

  .text-input:disabled {
    background: rgb(30, 35, 38);
  }

  .text-input::-webkit-scrollbar {
    display: none; 
}



</style>