<template>   
  <div class="text">
    <div class="label">{{label}}</div>
    <textarea ref="text_input" @focus="$emit('input_focus', true);is_in_focus=true;if(value=='')this.fill_suggestions(0)" @blur="$emit('input_focus', false);blur()"
    class="text-input" :type="type"  v-model="value" :disabled="disabled" ></textarea>
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
        str_end_idx: 0

      }
    },

     methods: {
      resize() {
        console.log('resizing')
      //  if(this.$refs.text_input == undefined) return;
      //  this.$refs.text_input.style.height = "auto";
      //  this.$refs.text_input.style.height = `${this.$refs.text_input.scrollHeight+4}px`;
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
        console.log('use_suggestion')
        this.value = this.value.substring(0, this.str_start_idx) + suggestion + this.value.substring(this.str_end_idx+1)
      },

      convert_query(query){

        let waits_for_statuses = ['field', 'oper', 'val', 'logic']
        let waits_for_idx = 0

        
        console.log('query', query, this.fields)

        let converted_query = ''

        for(let i = 0; i < query.length; i++)
        {
          if(query[i] == ' ') 
          {
            if(i == query.length-1) this.fill_suggestions(waits_for_idx)
            continue
          }
        

          console.log('waits_for_idx', waits_for_idx, i)

          if(waits_for_idx == 0)
          {
            let br = this.have_words_at(query, this.brackets, i)
            if(br)
            {
              converted_query += br
              continue
            }

            let name

            let found_field = false
            for(let j in this.fields)
            {
              if(this.have_word_at(query, this.fields[j].name, i))
              {
                converted_query += 'fields#' + this.fields[j].uuid + '#'
                name = this.fields[j].name
                i += name.length-1
                found_field = true;
                console.log('conv query', converted_query)
                break;
              }
            }
            if(found_field)
            {
              waits_for_idx = 1
              this.fill_suggestions(waits_for_idx)
              //console.log('waits_for_idx', waits_for_idx, i)
              continue
            }

            let found_attr = false
            for(let j in this.attributes)
            {
              if(this.have_word_at(query, this.attributes[j], i))
              {
                converted_query += 'attr#' + this.attributes[j] + '#'
                name = this.attributes[j]
                i += name.length-1
                found_attr = true;
                console.log('conv query', converted_query)
                break;
              }
            }
            if(found_attr)
            {
              waits_for_idx = 1
              this.fill_suggestions(waits_for_idx)
              continue
            }

            
            name = query.substr(i, query.length-i)
            this.str_start_idx = i
            this.str_end_idx = query.length
            console.log('field not found', name, converted_query)
          
            this.fill_suggestions(waits_for_idx)


            this.suggestions = this.suggestions.filter((elem)=>elem.includes(name))
            return
            


          }
          else if(waits_for_idx == 2)
          {
            let end_idx
            if( query[i] == "'")
            {
              i++
              end_idx = query.indexOf("'", i)
              if(end_idx < 0)
              {
                console.log('string value end not found', converted_query)
                return 
              }
            }
            else
            {
              if(query.indexOf(' ', i) > 0) end_idx = query.indexOf(' ', i)
              else if(query.indexOf(')', i) > 0) end_idx = query.indexOf(')', i)
              
            }

            if(end_idx == undefined) end_idx = query.length-1;
            else waits_for_idx = 3
            
            let len = end_idx - i
            let val = query.substr(i, len)

            i+=len
            converted_query += val
          }
          else if(waits_for_idx == 1)
          {
            let found_oper = false
            for(let j in this.operations)
            {
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
              this.fill_suggestions(waits_for_idx)
              continue
            }

            console.log('operation not found', converted_query)
            this.str_start_idx = i
            this.str_end_idx = query.length-1
            this.fill_suggestions(1)
            return
            
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
              continue
            }

            this.str_start_idx = i
            this.str_end_idx = query.length-1
            this.fill_suggestions(3)
            return
          }

      }

      this.fill_suggestions(waits_for_idx)

      console.log('convvvvvvvvvvv query', converted_query)
    }
    },
    updated() {
      this.resize();
    },
    mounted() {
      this.resize();
    },
    
    watch: {
      value: function(val, oldVal) {
       // console.log(val, oldVal, this.id, this.parent_name)

        this.resize()

        this.$emit('update_parent_from_input', val)

        this.convert_query(val)

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