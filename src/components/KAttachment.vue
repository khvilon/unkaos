<template>   
  <label class="attachment">
    <div class="label"><i class='bx bx-paperclip'></i>{{label}}</div>
    <div class="attachment-input" @click.self="open_file_dialog($event)">
      
      <div
      class="attachment-file"
      
      v-for="(attachment, index) in attachments"
            :key="index"
          >
          <span>{{attachment.extention}}<br>{{attachment.name}}</span>
          <div>
            <i class='bx bxs-download' @click="download_attachment(attachment)"></i>
            <i class='bx bx-trash' @click="delete_attachment(attachment)"></i>
          </div>
      </div>
      
          
    </div>
    
  
  
  </label>

  <input type="file" ref="attachments_input"  accept="*" v-on:change="preview_files" style="display: none" />
</template>


<script>
  import tools from '../tools.ts'
  import rest from '../rest.ts'

  export default 
  {

    emits: ['attachment_added', 'attachment_deleted'],
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
      attachments:
      {
        type: Array,
        default: [
          {
            name: 'Файл 11',
            type: "txt",
            link: 'lnk 11'
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
        this.$refs.attachments_input.click()
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

        let attachment = {
          name: name,
          extention: extention,
          uuid: tools.uuidv4(),
          data: val,
          type: file.type,
          table_name: 'attachments'
        }
        
        this.$emit('attachment_added', attachment)

        //this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})

        //console.log(event.path[1].children[2].src=val)

        //this.changed_value = 'aaa'                   
      },
      download_attachment: async function(att){

        let file = await rest.run_method('read_attachments', {uuid: att.uuid})

        let file_url = file[0].data

        let file_link = document.createElement('a')

        file_link.href = file_url
        file_link.setAttribute('download', file[0].name + '.' + file[0].extention)

        document.body.appendChild(file_link)
        file_link.click()
      },
      delete_attachment: function(att){
        this.$emit('attachment_deleted', att)
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

  $attachment_input_border_width: 2px;

  .attachment .attachment-input
  {
    width: 100%;
    height: $input-height*2;
    
  }

  .attachment
  {
        padding: 10px 20px 10px 20px;
        display: block;
  }

  .attachment-input {
    font-size: 20px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background-color: transparent;
    text-align: center;  
    border-color: $table-row-color;
    border-width: attachment_input_border_width;
    border-style: solid; 
    display: flex;  
  }
  .attachment-input:hover{
    border-style: dashed; 
    cursor: pointer;
  }

  .attachment-file{
    
    width: calc(($input-height * 1.6 - $attachment_input_border_width * 2) * 2);
    height: calc($input-height * 1.6 -  $attachment_input_border_width * 2);
    background-color: $table-row-color;
    border-radius: $border-radius;
    margin-top:$input-height*0.2;
    margin-left:$input-height*0.2;
    margin-bottom:$input-height*0.2;
    overflow: hidden;
    cursor: default;

    display: flex;
    flex-direction: column;

  }

.attachment-file span{
  white-space: nowrap;
  line-height: $input-height/2;
}

.attachment-file i{
padding-left: 10px;
    padding-right: 10px;
    cursor: pointer;
}

.attachment-file .bx-trash:hover{
  color:red;
}

.attachment-file .bxs-download:hover{
  color:green;
}

.attachment .bx-paperclip{
  font-size: $font-size*1.4;
}


  [type=file] {
    visibility: hidden;
    width: 0px
  }

</style>