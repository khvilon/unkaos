<template>   
  <div class="date">
    <div class="label">{{label}}</div>
    <input class="date-input" 
    @input="print"
    type="date"  :value="format(value)" :disabled="disabled">

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
      }

    },
    methods:
    {
      print(e)
      {
        console.log(e.srcElement.value)
        let val = e.srcElement.value
        this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})
      },
      format(val)
      {

       
            var options = {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
            
            };
          
            if(val == undefined || val == null || val == '') return ''
            let date =  new Date(val)

            console.log(date.getFullYear)

            if(date.getFullYear() == 1970) return ''
            
            date = date.toISOString().split('T')[0]
            
            //toLocaleString("ru", options)
            if(date !== "Invalid Date") return date
            else return ''
      }
    },
    watch: {
      value: function(val, oldVal) {
        console.log(val, oldVal, this.id, this.parent_name)
        
        this.$store.commit('id_push_update_' + this.parent_name, {id: this.id, val:val})
      }
    }
  }
</script>

<style>
  .date .date-input
  {
    width: 100%;
    height: 35px;
    color: white;
    padding: 0 10px 0 10px;
  }

  .date
  {
    padding: 10px 20px 10px 20px;
  }


  .date-input {
    font-size: 15px;
    font-weight: 400;
    border-radius: 6px;
    transition: all 0.5s ease;
    background: rgb(29, 27, 49);
    width: 100%;
  }

  .date-input:disabled {
    background: rgb(30, 35, 38);
  }



</style>