<template>   
  <label class="relations">
    <div class="label"><i class='bx bx-link'></i><i class='add-relation-btn bx bx-plus'></i>{{label}}</div>
    <div class="relation"
      v-for="(relation, index) in relations"
            :key="index"
          >
          <span>
            {{relation.type}}
            <a :href="'/issue/' + relation.id">{{relation.id}} {{relation.name}}</a>
            <i class='bx bx-unlink' @click="delete_relation(relation)"></i>
          </span>
      </div>
      
  </label>

  <input type="file" ref="relations_input"  accept="*" v-on:change="preview_files" style="display: none" />
</template>


<script>
  import tools from '../tools.ts'
  import rest from '../rest.ts'

  export default 
  {

    emits: ['relation_added', 'relation_deleted'],
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
      },
      relations:
      {
        type: Array,
        default: [
          {
            uuid: 'aaa',
            id: 'OR-3',
            name: 'Захватить вселенную',
            type: "Связана с",
          },
          {
            uuid: 'bbb',
            id: 'OR-2',
            name: 'Выпить пива',
            type: "Дублирует",
          }]
      }

    },
    methods: {
      get_src: function(value) 
      {
        if (value) return value
      },
      open_file_dialog: function(e)
      {
        this.$refs.relations_input.click()
      },
      preview_files: async function(event) 
      {
        let file = event.target.files[0]

        if(file == undefined) return;

        let name, extention
        let dot_idx = file.name.lastIndexOf('.')
        if(dot_idx < 0)
        {
          name = file.name
          extention = ''
        }
        else
        {
          name = file.name.substr(0, dot_idx)
          extention = file.name.substr(dot_idx+1)
        }
        
        const val = await tools.readUploadedFile(file)

        let relation = {
          name: name,
          extention: extention,
          uuid: tools.uuidv4(),
          data: val,
          type: file.type,
          table_name: 'relations'
        }
        
        this.$emit('relation_added', relation)

        //this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})

        //console.log(event.path[1].children[2].src=val)

        //this.changed_value = 'aaa'                   
      },
      download_relation: async function(att){

        let file = await rest.run_method('read_relations', {uuid: att.uuid})

        let file_url = file[0].data

        let file_link = document.createElement('a')

        file_link.href = file_url
        file_link.setAttribute('download', file[0].name + '.' + file[0].extention)

        document.body.appendChild(file_link)
        file_link.click()
      },
      delete_relation: function(att){
        this.$emit('relation_deleted', att)
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

<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $relation_input_border_width: 2px;

  .relations .relations-input
  {
    width: 100%;
    height: $input-height*2;
    
  }

  .relations
  {
        padding: 10px 20px 10px 20px;
        display: block;
  }

  .relations-input {
    font-size: 20px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background-color: transparent;
    text-align: center;  
    border-color: $table-row-color;
    border-width: relation_input_border_width;
    border-style: solid; 
    display: flex;  
  }


  .relation{
    margin-top:2px;
    margin-left:10px;
    margin-bottom:3px;
  }

.add-relation-btn{
  margin-top:5px;
    margin-left:10px;
    margin-bottom:3px;
    font-size: $font-size*1.4;
    cursor: pointer;
}

.add-relation-btn:hover{
  color:green
}
  

.relation span{
  white-space: nowrap;
  line-height: $input-height/2;
}

.relation i{
padding-left: 10px;
    padding-right: 10px;
    cursor: pointer;
}

.relation .bx-unlink:hover{
  color:red;
}

.relation a:hover{
  color:green
}

.relations .bx-link{
  font-size: $font-size*1.4;
}



</style>