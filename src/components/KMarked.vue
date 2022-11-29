<script>
import tools from "../tools.ts";
import { marked } from "marked";
import palette from "../css/palette.scss?type=style&index=0&lang=scss&module=1";
import { nextTick } from "vue";

export default {
  
  props: {
    val: {
      type: String,
      default: "",
    },
    images: {
      type: Array,
      default: [],
    },
    use_bottom_images: {
      type: Boolean,
      default: false,
    },
  },
  computed:
  {
    images_len: function(){return this.images.length}
  },
  methods: {
    get_palette_param: function (name) {
      let theme = "[theme=" + localStorage.theme + "]";
      let val = palette.split(theme);
      val = val[1];
      val = val.split(name + ": ");
      val = val[1];
      val = val.split(";")[0];
      return val;
    },

    inject_images(html, start_search) {

      
      console.log(html)

      for(let i = 0; i < this.images.length; i++)
      {
        let from = ' src="' + this.images[i].name + '.' + this.images[i].extention
        let to = ' src="' + this.images[i].data

        

        let from_idx = html.indexOf(from)

        let width = 'style="max-width:40%; height:auto"';

        console.log('++++++++++++++++++++++++++0', from_idx)
        if(from_idx < 0) continue

        const max_img_diff = 10; 
        const max_w_diff = 20; 

        let img_end = html.indexOf('"', from_idx+max_img_diff);

        let w_start = html.indexOf("{", img_end) + 1;

             
        console.log('++++++++++++++++++++++++++', from_idx, img_end, w_start)

        if (w_start > 0 && w_start - img_end < max_w_diff) {
          let w_end = html.indexOf("}", w_start);
          width = html.substring(w_start, w_end);
          html = html.replace("{" + width + "}", "");
        }

       // console.log('froooom', from, to)
        html = html.replace(from,  ' ' + width + to)
        html = html.replace(from, '')
      }

      console.log(html)

      return html

      const img_opener = '<img src="';

      if (start_search == undefined) {
        start_search = 0;
        this.found_img = {};
      }

      let img_start = html.indexOf(img_opener, start_search);
      console.log(html, start_search, img_start);

      if (img_start < 0) {
        console.log('this.use_bottom_images', this.use_bottom_images, this.images_len)
        if (this.use_bottom_images && false) {
          for (let i = 0; i < this.images.length; i++) {

            console.log(this.images[i].name)
            if (this.found_img[this.images[i].uuid]) continue;

            html +=
              '<img class="attachment-img" src="' +
              this.images[i].data +
              '"></img>';
          }
        }

        return html;
      }

      img_start += img_opener.length;

      let img_end = html.indexOf('"', img_start);
      let img_name = html.substring(img_start, img_end);

      let w_start = html.indexOf("{", img_end) + 1;

      const max_w_diff = 20;
      let width = 'maxWidth="70%" height="auto"';
      console.log(w_start, img_end, "+++++++++++++++++++");
      if (w_start > 0 && w_start - img_end < max_w_diff) {
        let w_end = html.indexOf("}", w_start);
        width = html.substring(w_start, w_end);
        html = html.replace("{" + width + "}", "");
      }

      for (let i = 0; i < this.images.length; i++) {
        if (this.images[i].name + "." + this.images[i].extention == img_name) {
          html = html.replace(
            'src="' + img_name,
            width + ' src="' + this.images[i].data
          );
          this.found_img[this.images[i].uuid] = true;
          break;
        }
      }

      return this.inject_images(html, img_end);
    },

    md: function (input) {

      marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      breaks: true,
      xhtml: true,
    });


      let html = marked(input);
      html = html.replaceAll('<a href="http', '<a target="_ blank" href="http');
      html = this.inject_images(html);
      return html;
    },
  },

  mounted() {
    marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      breaks: true,
      xhtml: true,
    });

    this.images_len
    
    nextTick(() => {
      this.md_value = this.md(this.val);
    })
  },
  data() {
    return {
      found_img: {},
      md_value: ''
    };
  },
  watch: {
    val: {
      handler: function (val, oldVal) {
        this.val.toString()
      console.log('vvv', val, oldVal)
      nextTick(() => {
      this.md_value = this.md(val);
      })
    },
    deep: true
  },
  images: {
    handler: function (val, oldVal) {
        this.val.toString()
      console.log('viiim', val, oldVal)
      this.md_value = this.md(this.val);
    },
    deep: true,
      immediate: true
  },
  },
};
</script>

<template>
  <div class="marked-container" v-html="md_value" scrolling="no"></div>
</template>

<style lang="scss">
@import "../css/global.scss";

a {
  color: var(--link-color);
}

.marked-container {
  overflow-wrap: anywhere;
  user-select: text !important;
  border-width: 0;
  width: 100%;
  color: var(--text-color);
  font-family: Inter, system-ui, Roboto, sans-serif;
  font-size: 13px;
}

.marked-container p:first-child {
  margin-top: 0;
}

.marked-container p:last-child {
  margin-bottom: 0;
}

.marked-container::-webkit-scrollbar {
  display: none;
}

.marked-container img {
  max-width: -webkit-fill-available;
  box-sizing: border-box;
  outline: var(--text-color) solid 1px;
  cursor: pointer;
}

.attachment-img {
  max-width: -webkit-fill-available;
  box-sizing: border-box;
  outline: var(--text-color) solid 1px;
}

.marked-container img:active {
    max-width: 100% !important; 
    height: auto;
    position: fixed ;
    left: 0px ;
    top: 0px ;
    width: 100% ;
    /* max-width: 100vw; */
    z-index: 100;
    border-left-width: 100px;
    border-right-width: 100px;
    border-top-width: 30px;
    border-bottom-width: 30px;
    border-style: solid;
    border-color: var(--loading-bar-color);
}

.marked-container pre {
  border-radius: 4px;
  background-color: var(--code-block-bg-color);
  border: 10px solid transparent;
  max-height: 400px;
  max-width: -webkit-fill-available;
  overflow: auto;
  padding: 10px;
}

.marked-container pre code {
  position: relative;
  font-family: Menlo, "Bitstream Vera Sans Mono", "Ubuntu Mono", Consolas,
    "Courier New", Courier, monospace;
  font-size: 95%;
  border: 4px solid transparent;
  color: inherit;
}

.marked-container code {
  padding: 0 2px;
  color: var(--code-fragment-text-color);
  border-radius: 2.5px;
  background-color: inherit;
  font-family: Menlo, "Bitstream Vera Sans Mono", "Ubuntu Mono", Consolas,
    "Courier New", Courier, monospace;
  font-size: 95%;
  border-color: var(--code-fragment-border-color);
  border-width: 1px;
  border-style: solid;
}

.marked-container pre::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}

.marked-container pre::-webkit-scrollbar-track {
  background-color: var(--code-scroll-track-bg-color);
  border-radius: 10px;
}

.marked-container pre::-webkit-scrollbar-thumb {
  background-color: var(--code-scroll-thumb-bg-color);
  border-radius: 10px;
  border: 40px solid transparent;
  margin: 10px;
}

.marked-container pre::-webkit-scrollbar-thumb:hover {
  background-color: var(--code-scroll-thumb-hover-color);
}

.marked-container pre::-webkit-scrollbar-corner {
  background: var(--code-block-bg-color);
}

.marked-container ol {
  padding-left: 20px;
}

.marked-container ul {
  padding-left: 20px;
}

.marked-container dl {
  padding-left: 20px;
}

.marked-container * {
  user-select: text !important;
}
</style>
