<template>   
  <div class="text">
    <div class="label">{{label}}</div>
    <div class="issue-search-div">
    <div contenteditable="" ref="issues_search_input" 
    @focus="focus" @blur="blur"
    @input="handleInput"
    class="text-input" :type="type"   :disabled="disabled" 
    v-html="get_html"
    v-on:keyup.enter="emit_query"
    @keydown.enter.prevent
    ></div>
    <KButton 
		name='bx-search-alt-2'
		class='issue-search-input-btn'
		@click="emit_query"
		/>
    </div>
    <div ref="suggestion_area"  
    class="suggestion-area"
    v-show="is_in_focus && suggestions.length > 0"
    >
    
      <span
        v-for="(suggestion, index) in get_suggestions()"
        :key="index"
        @mousedown.prevent
        @click="use_suggestion(suggestion, $event)"
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
      },
      projects:
      {
        type: Array,
        default: []
      },
      issue_statuses:
      {
        type: Array,
        default: []
      },
      issue_types:
      {
        type: Array,
        default: []
      },
      users:
      {
        type: Array,
        default: []
      },

    },

/*
    "Select"
"Duration"
"String"
"Date"
"Text"
"Boolean"
"Time"
"Timestamp"
"Numeric"
"User"
*/

    emits: ['update_parent_from_input', 'input_focus', 'search_issues'],
    data() {
      return {
        suggestions: [],
        is_in_focus: false,
        attributes: [  
          {
            name: 'Тип',
            type: 'Type',
            field: 'type_uuid'
          },
          {
            name: 'Создана',
            type: 'Timestamp',
            field: 'created_at'
          },
          {
            name: 'Изменена',
            type: 'Timestamp',
            field: 'updated_at'
          },
          {
            name: 'Проект',
            type: 'Project',
            field: 'project_uuid'
          },
          {
            name: 'Статус',
            type: 'Status',
            field: 'status_uuid'
          },
        ],
        brackets: ['(', ')'],
        operations: ['=', '<', '>'],
        logic_operators: ['and', 'or'],
        fields_and_attributes: [],
        value: '',
        str_start_idx: 0,
        str_end_idx: 0,
        position: 0,
        waits_for_statuses: ['field', 'oper', 'val', 'logic'],
        waits_colors: ['green', 'yellow', 'blue', 'orange'],
        converted_query: '',
        select_values: []
      }
    },
    computed: {
    // геттер вычисляемого свойства
    vals_dict() {

      let v = 
      {
        Type: this.issue_types,
          Project: this.projects,
          Status: this.issue_statuses,
          User: this.users
      }
      return v
    },

    get_html()
      {
        this.value = this.value.replaceAll('\n', '').replaceAll('\r', '')
        let chars = this.value.split('')
        console.log(chars)
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

  },

     methods: {
      get_suggestions(){return this.suggestions},
      emit_query()
      {
        if(this.value == undefined) return
        if(!this.convert_query(this.value, true)) return
        let base64_query = btoa(encodeURIComponent(this.converted_query))  
        this.$emit('search_issues', base64_query)
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

      set_focus_false()
      {
        this.is_in_focus=false
      },

      blur(e)
      {
        this.$emit('input_focus', false)
        console.log('blur', e)
        //this.is_in_focus=false
        setTimeout(this.set_focus_false, 300)
      },

      have_word_at(arr, word, idx)
      {
        word = word.replaceAll(' ', ' ')
        let word_in_text = arr.substr(idx, word.length).replaceAll(' ', ' ')
        let found = word_in_text == word
        console.log('have_word_at2', found, '#' + arr.substr(idx, word.length) + '#', '#' + word + '#')
        return found
      },

      have_words_at(arr, words, idx)
      {
        for(let i in words)
        {
          if(this.have_word_at(arr, words[i], idx)) return words[i]
        }
        return false
      },

      fill_suggestions(waits_for_idx, field_type)
      {
        console.log('fill_suggestions', waits_for_idx)
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
            this.fields_and_attributes.push(this.attributes[i].name)
          }
          this.fields_and_attributes = this.fields_and_attributes.sort();
          this.suggestions = this.fields_and_attributes
        }
        else if(waits_for_idx == 1)  this.suggestions = this.operations
        else if(waits_for_idx == 2)
        {
          if(this.vals_dict[field_type] != undefined) this.suggestions = this.vals_dict[field_type].map((p) => p.name)
          else if (field_type == 'Select')
          {
            this.suggestions = this.select_values
          }        
        }
        else if(waits_for_idx == 3)  this.suggestions = this.logic_operators
        console.log('this.suggestions', this.suggestions)
      },


      

      use_suggestion(suggestion, e)
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
            setTimeout(this.set_focus_true, 300)
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
            qd.name = this.fields[j].name
            qd.field_type = this.fields[j].type[0].code
            found = true;

            if(qd.field_type == 'Select')
            {
              this.select_values = this.fields[j].available_values.split(',').map((v) => v.replace('\n', '').trim())
            }

            break;
          }
        }

        if (found) return found

        for(let j in this.attributes)
        {
          
          if(this.have_word_at(qd.query, this.attributes[j].name, qd.i))
          {
            qd.converted_query += 'attr#' + this.attributes[j].field + '#'
            qd.name = this.attributes[j].name
            qd.field_type = this.attributes[j].type
            found = true;
            break;
          }
        }

        return found
      },

      update_waits_for_idx(waits_for_idx)
      {
        if(waits_for_idx == this.waits_for_statuses.length-1) waits_for_idx = 0
        else waits_for_idx++
        return waits_for_idx;
      },

      

      convert_query(query, use_to_end){


        this.color_text(0, query.length, 'white')
        
        let waits_for_idx = 0 

        //query data
        let qd = 
        {
          query: use_to_end ? query : query.substring(0, this.position),
          i: 0,
          converted_query: ''
        }

        

        let found
        let name = ''

        this.str_start_idx = this.str_end_idx = 0;

        for(qd.i = 0; qd.i < qd.query.length; qd.i++)
        {

          found = false
          qd.name = ''
          
          console.log('aaaaaaaaaa', qd, qd.query[qd.i])

          while (qd.query.indexOf(' ') < -1) 
          {
            qd.query = qd.query.replace(' ', ' ')
          }

          if(qd.query[qd.i] == ' ' || qd.query[qd.i] == ' ') 
          {
            console.log('void')
            //this.fill_suggestions(waits_for_idx, qd.field_type)
            continue
          }
        
          console.log('waits_for_idx', waits_for_idx, qd.i)

          if(waits_for_idx == 0)
          {
            let br = this.have_words_at(qd.query, this.brackets, qd.i)
            if(br)
            {
              qd.converted_query += br
              continue
            }

            found = this.try_find_field(qd)            
          }
          else if(waits_for_idx == 1)
          {
            for(let j in this.operations)
            {
              if(this.have_word_at(qd.query, this.operations[j], qd.i))
              {
                qd.converted_query += this.operations[j]
                qd.name = this.operations[j]
                found = true;
                break;
              }
            }
          }
          else if(waits_for_idx == 2)
          {
            if(this.vals_dict[qd.field_type] != undefined)
            {
              
              let vals = this.vals_dict[qd.field_type].map((p) => p.name)
              console.log(this.vals_dict)
              console.log('search infields values dits', qd, vals)
              for(let j in vals)
              {
                console.log(qd.query, vals[j], qd.i)
                if(this.have_word_at(qd.query, vals[j], qd.i))
                {
                  qd.converted_query += "'" + this.vals_dict[qd.field_type][j].uuid + "'#"
                  qd.name = vals[j]
                  found = true;
                  break;
                }
              }
              console.log('end search infields values dits', found)
            }
            else if (qd.field_type == 'Select')
            {
              for(let j in this.select_values)
              {
                if(this.have_word_at(qd.query, this.select_values[j], qd.i))
                {
                  qd.converted_query += "'" + this.select_values[j] + "'#"
                  qd.name = this.select_values[j]
                  found = true;
                  break;
                }
              }
            }
            else{
              let end_idx = -1
              if( qd.query[qd.i] == "'") end_idx = qd.query.indexOf("'", qd.i+1) + 1
              else
              {
                let end_idx0 =  qd.query.indexOf(' ', qd.i+1)
                console.log('end_idx 0 ', qd.query, qd.i, end_idx0)
                end_idx0 =  qd.query.indexOf(' ', qd.i+1)
                console.log('end_idx 00 ', qd.query, qd.i, end_idx0)
                let end_idx1 =  qd.query.indexOf(')', qd.i+1)
                console.log('end_idx 01 ', qd.query, qd.i, end_idx0, end_idx1)
                if(end_idx0 > 0 && end_idx1 > 0) end_idx = Math.min(end_idx0, end_idx1)
                else if(end_idx0 > 0) end_idx = end_idx0
                else if(end_idx1 > 0) end_idx = end_idx1
              }
              if(end_idx > 0)
              {
                found = true
                qd.name = qd.query.substring(qd.i, end_idx)
                qd.converted_query += qd.name + '#'
                console.log('found val ', qd.query.name)
              }
            }
          }
          else if(waits_for_idx == 3)
          {
            for(let j in this.logic_operators)
            {
              if(this.have_word_at(qd.query, this.logic_operators[j], qd.i))
              {
                qd.converted_query += ' ' + this.logic_operators[j] + ' '
                qd.name = this.logic_operators[j]
                found = true;
                break;
              }
            }
          }


          


          if(found)
          {
            console.log('found', qd, qd.query.length)
            this.color_text(qd.i, qd.i + qd.name.length, this.waits_colors[waits_for_idx])
            waits_for_idx = this.update_waits_for_idx(waits_for_idx)           
            if(qd.i == qd.query.length-1) this.fill_suggestions(waits_for_idx, qd.field_type)
            qd.i += qd.name.length-1
          }
          else{
            console.log('not found', qd, this.str_start_idx, qd.query.length)
            name = qd.query.substring(qd.i, qd.query.length)

            //else this.suggestions = ['aa', 'bb']
            this.color_text(qd.i, query.length, 'red')
            break
          }
      }

      this.str_start_idx = qd.i
      this.str_end_idx = qd.query.length-1

      this.fill_suggestions(waits_for_idx, qd.field_type)
      if(name.length > 0) this.suggestions = this.suggestions.filter((elem)=>elem.includes(name))

      this.converted_query = qd.converted_query

      console.log('convvvvvvvvvvv query', qd)

      return (qd.i == qd.query.length && qd.query.length > 0 && waits_for_idx == 3)



      
    }
    },

    
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

    height: 200px;
    overflow: auto;
  }

  .suggestion-area::-webkit-scrollbar{
    display:none;
  } 

  .suggestion-area span {
    cursor: pointer;
    font-size: 15px;
    font-weight: 300;
  }

  .text-input:disabled {
    background: rgb(30, 35, 38);
  }

  .text-input::-webkit-scrollbar {
    display: none; 
}

.issue-search-div{
  display: flex;
}



</style>