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

    move_width_infos(html)
    {
      const w_search_text = '/>{width='
      const max_val_length = 20
      const max_image_count = 1000;
      let search_start = 0
      let w_start = html.indexOf(w_search_text, search_start)
      let count = 0
      while(w_start > -1 && search_start < html.length && count < max_image_count)
      {
          count++
          let w_end = html.indexOf('}', w_start)
          let substr = html.substring(w_start, w_end+1)
          let new_substr = substr.replace('/>{', ' ').replace('}', ' />')
          html =  html.substring(0, w_start) + new_substr + html.substring(w_end + 1)
          if((w_end < 0) || ((w_end - w_start - w_search_text.length) > max_val_length)) break
          search_start = w_end + 1
          w_start = html.indexOf(w_search_text, search_start)
      }
      return html
    },

    inject_images(html, start_search) {

      if(this.wait_for_recalc_count > 1)
      {
        this.wait_for_recalc_count--
        return html
      }
      html = this.move_width_infos(html)
      //console.log(html)

      let found_images = []

      for(let i = 0; i < this.images.length; i++)
      {
        let from = ' src="' + this.images[i].name + '.' + this.images[i].extention
        let to = ' src="' + this.images[i].data

        let start_idx = html.indexOf(from)
        if(start_idx < 0) continue
        let end_idx = start_idx + from.length

        found_images.push(
          {
            from: from,
            to: to,
            start_idx: start_idx,
            end_idx: end_idx
          }
        )
      }

      //console.log('found_images', found_images)
      found_images.sort(tools.compare_obj('start_idx'))

      let new_html = ''
      let old_html = html
      let last_end_idx = 0
      for(let i = 0; i < found_images.length; i++)
      {
          new_html += old_html.substring(last_end_idx, found_images[i].start_idx) + found_images[i].to
          last_end_idx = found_images[i].end_idx
      }
      new_html += old_html.substring(last_end_idx)

      //console.log(html)
      this.wait_for_recalc_count--;
      //console.log('recalced')
      return new_html
    },

    md: function (input) {
      let html = marked(input);
      html = html.replaceAll('<a href="http', '<a target="_ blank" href="http');
      html = this.inject_images(html);
      return html;
    },
    recalc_md: async function(val)
    {
      //let start = new Date()
      this.md_value = this.md(val);

      //console.log(new Date() - start)
    }




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
      md_value: '',
      wait_for_recalc_count: 0
    };
  },
  watch: {
    val: {
      handler: function (val, oldVal) {
     //   this.val.toString()
     // console.log('vvv', val, oldVal)
      nextTick(() => {
        this.wait_for_recalc_count++;

        setTimeout(this.recalc_md, 0, val)
      })
    },
    deep: true
  },
  images: {
    handler: function (val, oldVal) {
        this.val.toString()
      console.log('viiim', val, oldVal)
     // this.md_value = this.md(this.val);
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

}

.marked-container > * {
  font-size: 14px;
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

.marked-container a:hover {
  color: var(--link-hover-color);
}

.marked-container img {
  max-width: -webkit-fill-available;
  box-sizing: border-box;
  outline: var(--text-color) solid 1px;
  cursor: zoom-in;
}

.marked-container p img {
  margin-top: 4px;
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
    cursor: zoom-out;
  
}

.marked-container pre {
  border-radius: 4px;
  background-color: var(--code-block-bg-color);
  border: 10px solid transparent;
  max-height: 300px;
  max-width: -webkit-fill-available;
  overflow: auto;
  padding: 10px;
}

.marked-container pre code {
  position: relative;
  border: none;
  font-family: Menlo, "Bitstream Vera Sans Mono", "Ubuntu Mono", Consolas,
    "Courier New", Courier, monospace;
  font-size: 95%;
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

.marked-container blockquote {
  margin: 0 0 0 5px;
  padding: 4px 0 4px 16px;
  box-shadow: inset 2px 0 0;
}

.marked-container * {
  user-select: text !important;
}
</style>
