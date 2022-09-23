<template >
  <div class="modal-bg"
  @click.self="close()">
  <div
    class="panel modal new-relation-modal"
  >  
  <SelectInput
  label="Тип связи"
		:value="relation_types[0]"
		:values="relation_types"
		:parameters="{clearable: false}"
    @update_parent_from_input="select_reletion_type"
   >
   </SelectInput>

 <SelectInput
 @search="get_issues_sugestions"
  label="Задача"
		:values=issues_info
		:parameters="{clearable: false, reduce: obj => obj.uuid}"
    @update_parent_from_input="select_issue1"
   >
   </SelectInput>
    
<div class="btn-container">
  <KButton 
  name="Создать"
  id="create-relation-btn"
  @click="save_relation()"
  />
   <KButton 
  name="Отменить"
  @click="close()"
  />
  </div>

  </div>
  </div>
</template>

<script>
  
  import rest from '../rest.ts'
  import tools from '../tools.ts'

  export default {

    
  
    emits: ['close_new_relation_modal', 'relation_added'],
    props:
    {
      relation_types:
      {
        type: Array,
        default: []
      },
      issue0_uuid:
      {
        type: String,
        default: 'aa'
      }
    },

    data () {
      return{
        issues_info: [],
        issue1_uuid: '',
        relation_type: {}
      }
      
    },
    created () {
      
    },
    mounted () {
      //this.select_tab(0)
      if(this.relation_types!= undefined) this.relation_type = this.relation_types[0]

      console.log(this.issue0_uuid)
      
    },
    computed:
    {
      visible:function(){this.vvisible; return !this.vvisible}
    },
    methods:
    {
      select_issue1(issue1_uuid)
      {
        console.log(issue1_uuid)
        this.issue1_uuid = issue1_uuid
      },
      select_reletion_type(relation_type)
      {
        console.log(relation_type)
        this.relation_type = relation_type
      },
    
    
      async save_relation(){

        if(this.issue1_uuid == undefined || this.issue1_uuid == null  || this.issue1_uuid == ''
        || this.issue0_uuid == undefined || this.issue0_uuid == null  || this.issue0_uuid == ''
        || this.relation_type == undefined || this.relation_type.uuid == null  || this.relation_type.uuid == '')
        {
          console.log('error saving relation', '#' + this.issue0_uuid + '#', '#' + this.issue1_uuid + '#', '#' + this.relation_type.uuid + '#')
          return
        }

        let options0 = {
          uuid: tools.uuidv4(),
          issue0_uuid: this.relation_type.is_reverted ? this.issue1_uuid : this.issue0_uuid,
          issue1_uuid: this.relation_type.is_reverted ? this.issue0_uuid : this.issue1_uuid,
          type_uuid: this.relation_type.uuid
        }

    
        this.$emit('relation_added', options0) 
      },
      close () {
        this.$emit('close_new_relation_modal')
      },
      async get_issues_sugestions(text)
      {
        if(text == undefined || text == '') return
        let options = {}
        options.like = text
        let ans = await rest.run_method('read_short_issue_info', options)
        if(ans == null) return
        this.issues_info = ans.sort()
      },
      search_event_handle(p1, p2)
      {
        console.log(p1, p2)
      }

    }
  }
</script>


<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  .modal-bg{
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.3);
    position: absolute;
    z-index: 10;
  }

  .new-relation-modal{
    position: absolute;
    width: 40%;
    height: $input-height*6;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .new-relation-modal SelectInut{
    width: 100%;
    height: $input-height;
  }

 .new-relation-modal .btn-container{
   display: flex;
  padding: 10px 20px 10px 20px;
 }

 .new-relation-modal #create-relation-btn{
 width: 100%;
 }




</style>