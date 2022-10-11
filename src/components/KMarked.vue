<template>   
  <div class="marked-container"	>
				<iframe class="marked-iframe"
				:srcdoc="md(val)"
        scrolling="no"
        @load="get_iframe_height"
				>
				</iframe>
			</div>
</template>

<script>
  import tools from '../tools.ts'
  import { marked } from 'marked'
  import palette from '../css/palette.scss?type=style&index=0&lang=scss&module=1'

  export default 
  {
    
    props: {

      val: {
        type: String,
        default: '',
      },
      images:
      {
        type: Array,
        default: [],
      }

    },
    methods:
    {
      get_palette_param : function(name)
      {
        let theme =  '[theme=' + localStorage.theme + ']'  
        let val = palette.split(theme)
        val = val[1]
        val = val.split(name + ': ')
        val = val[1]
        val = val.split(';')[0]
        return val;
      },

      get_iframe_height(e)
      {
        let rect = e.target.contentWindow.document.body.getBoundingClientRect()
        //console.log('contentWindow.document.body.scrollHeight............', iframe.contentWindow.document.body.getBoundingClientRect())
        this.iframe_height = Math.ceil( Number(rect.top) + Number(rect.bottom)) + 'px'
      },

      inject_images(html, start_search)
      {

        

        const img_opener = '<img src="'

        if(start_search == undefined)
        {
          start_search = 0
          this.found_img = {}
        }

        let img_start = html.indexOf(img_opener, start_search)

        if(img_start < 0) 
        {
          for(let i = 0; i < this.images.length; i++)
          {
            if(this.found_img[this.images[i].uuid]) continue

            html += '<img maxWidth="100%" height="auto" src="' + this.images[i].data + '"></img>'
          }

          return html
        }
          

        img_start += img_opener.length

        let img_end = html.indexOf('"', img_start)
        let img_name = html.substring(img_start, img_end)

        let w_start = html.indexOf('{', img_end) + 1

        const max_w_diff = 20
        let width = 'maxWidth="70%" height="auto"'
        console.log(w_start, img_end, '+++++++++++++++++++')
        if(w_start > 0 && (w_start - img_end) < max_w_diff)
        {
          let w_end = html.indexOf('}', w_start)
          width = html.substring(w_start, w_end)
          html = html.replace('{' + width + '}', '')
        }
       

        for(let i = 0; i < this.images.length; i++)
        {
          if(this.images[i].name + '.' + this.images[i].extention == img_name)
          {
            html = html.replace('src="' + img_name, width + ' src="' + this.images[i].data)
            this.found_img[this.images[i].uuid] = true
            break
          } 
        }

      
        return this.inject_images(html, img_end)
      },

      md: function(input)
      {


        let text_color = this.get_palette_param('--text-color')
        let link_color = this.get_palette_param('--link-color')
        
        const styles = `
        <style>
          *{
            color:` + text_color + `;
            font-family: Inter, system-ui,Roboto,sans-serif;
            font-size: 13px;
          }
          a{color: ` + link_color + `}
        </style>
        `

        let html = marked(input)

        html = html.replaceAll( '<a href="http', '<a target="_ blank" href="http')
        
        html = this.inject_images(html)

        return  html + styles
      }  

      
    },
    
    mounted()
    {
      marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      breaks: true,
      xhtml: true
      });
    },
    data () {
      return {
        iframe_height: 0,
        found_img: {}
      }
    }


    
    
  }
</script>

<style lang="scss">

  @import '../css/global.scss';

  .marked-container
  {
    
    border-width: 0px;
    border-style: outset;
    cursor: pointer;
  }

.marked-iframe{
  border-width: 0px;
  width:100%;
  height: v-bind(iframe_height);
}
  
.marked-iframe::-webkit-scrollbar{
    display:none;
  }



</style>