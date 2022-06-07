<template>   
  <div class="ktable" >
    <table>
      <thead>
        <tr>
          <th
            v-for="(collumn, index) in collumns"
            :key="index"
            @click="sort(collumn)"
          >
            <label>{{ collumn.name }}</label>  
            <label class='sort_arrow' v-bind:class="{ sorted_asc: collumn.asc}" >&#9660;</label> 
            <label class='sort_arrow' v-bind:class="{ sorted_desc: collumn.desc}" >&#9650;</label>   
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
            v-for="(row, index) in tableData"
            :key="index"
            :uuid="row.uuid" 
            v-bind:class="{ selected_row: row.selected }"       
        >
          <td
            v-for="(collumn, index) in collumns"
            :key="index"
            @click="select_row($event)"
            
          >
            <span v-if="collumn.type!='link'"  v-html="format_val(row, collumn)"></span>
            <router-link v-if="collumn.type=='link'" 
            :to="'/issue/'+get_json_val(row, collumn.id)" tag="li">{{get_json_val(row, collumn.id)}}
            </router-link>
          </td>     
        </tr>
      </tbody>
    </table>


  </div>
</template>

<script>
  import tools from '../tools.ts';

  export default 
  {
    methods:
    {
      sort(collumn)
      {
          for(let i in this.collumns)
          {
            if(this.collumns[i].id == collumn.id)
            {
              if(this.collumns[i].asc)
              {
                this.collumns[i].desc = true
                this.collumns[i].asc = false
              }
              else
              {
                this.collumns[i].desc = false
                this.collumns[i].asc = true
              }
            }
            else 
            {
              this.collumns[i].asc = this.collumns[i].desc = false
            }
          }
          this.$store.dispatch('sort_' + this.name, collumn.id)
      },
      select_row()
      {
        let uuid = event.path[1].getAttribute('uuid');
        this.$store.commit('select_' + this.name, uuid);
        //console.log("sel", this.name)
      },
      get_json_val: tools.obj_attr_by_path,
      format_val(row, collumn)
      {
        
        let type = collumn.type
        //let val = row[collumn.id]

        let val = this.get_json_val(row, collumn.id)

        //console.log('fff', val)

        //(collumn.id.indexOf('.') > -1) val = row[collumn.id.split('.')[0]][0][collumn.id.split('.')[1]]

        if (type == undefined) return val
        if (type == 'date') 
        {   
            var options = {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              timezone: 'Moscow',
            };
            return new Date(val).toLocaleString("ru", options)
        }
        if(type == 'boolean')
        {
          if(val == 'true' || val == true || val =='t') return '&#10004;'
          else return '&#10006;'
        }
        if(type == 'user')
        {
          let avatar
          if(row.avatar != null) avatar = row.avatar
          else avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAAe9JREFUSEvlVtFRHTEQkyqADggVABWEdAAdQAVABSQVABWkBOgAqACoAEqACsRoZp05fPZ5j8kMH+zPvbnzW3m18srEFwW/CBefApa0D2AnNv1I8n5tAauAJR0A+AtgswJ6BXBM8ia7gTSwpEsAJ4PEZyS9bhgp4KD2NrKZVie/I/kaLJwC+Bnff5G8GyFngR+jp08kd1tJJb0A2ALgnu/9L2BFoi6Vkn4DOPc6ksOChgsqmrs0ZtcVJjLAPwA8xx8Oe8qVdBSK99Jtkqa+G0Ng/1OSj8sGgCuSFtIsJqp/I1kft9n6LPD0KM3ormjubm6KngV2BT4iZVr5t5VuJjxUitK7qq9LTgEH3e61J1MBr3P5fB+NepsWV51dkns8rdKV32Qn1qeBR4Mh+z1FtST30BT72Zxc0XNX7z77uRiLwJIsKruRqV0T1oLdyuJrRhe4Y4FvUVkrmZnwWS+xaJVN4KD2YZLkyo40UqwkK9/im9rnXov6HnBxI1d4kLG5KQXB1nW8a7rVDHjqMgDSxt45dhfx/g9Ju9e/aAF7KtnU01OoJyBJhbl7kr6nLQIX753tco2svXbJoz9UXImqa4HZDVS9/iCyGth0lLtV6u60tImly0EN7IFRJpPV2B0AmapjADXzpUZmBmTtmu8H/A4J79EfjfUqWAAAAABJRU5ErkJggg=='

          val = '<div class=user><img src="' + avatar + '">' + val + '</div>'
          
         // if(row.avatar != null) val = btoa('<img src="' + row.avatar + '"/>') + val
          return val
        }
        return val
      }

    },
    props: 
    { 
      name: {
        type: String,
        default: '',
      },
      collumns: {
        type: Array,
        default: () => [
          {
            name: 'столбец 1',
            id: "aa"
          },
          {
            name: 'столбец 2',
            id: "bb"
          },
          {
            name: 'столбец 3',
            id: "cc"
          },
          {
            name: 'столбец 4',
            id: "dd"
          },
        ],
      },
      tableData:
      {
        default: () => 
        [
          {aa: "11", bb: "12", cc: "13", dd: "14" },
          {aa: "21", bb: "22", cc: "23", dd: "24" }
        ]
      }
    }
  }
</script>

<style>
  table
  {
    text-align: left;
    width: 100%;

    border-collapse: separate; 
    border-spacing: 0 10px; 
    margin-top: -10px; /* correct offset on first border spacing if desired */
  }
 td {
  padding-right: 10px;
  padding-left: 10px
 }


.selected_row td {
    background-color: rgb(50, 60, 70);
    border-color: rgb(50, 60, 70);
}
td {
    border: solid 2px #000;
    border-style: solid none;
    padding: 3px 3px 3px 3px;
    border-color: rgb(40, 45, 50);
    background-color: rgb(40, 45, 50);
}
td:first-child {
    border-left-style: solid;
    border-top-left-radius: 6px; 
    border-bottom-left-radius: 6px;
}
td:last-child {
    border-right-style: solid;
    border-bottom-right-radius: 6px; 
    border-top-right-radius: 6px; 
}
/*
 .selected_row
 {
    border-style: solid;
    border-color: white;
    border-width: 2px;
    border-radius: 6px;
 }*/

 .ktable {
    overflow-y: auto;
  }
   .ktable::-webkit-scrollbar{
    display:none;
  }

  .sort_arrow
  {
    display: none
  }
  .sorted_asc, .sorted_desc
  {
    display: inline
  }
  

  .user{
margin-top: -5px;
  }



  .user img {
    height: 18px;
    width: 18px;
    object-fit: cover;
    border-radius: 4px;
    margin-right: 10px;
    position: relative;
    top: 5px
}
</style>