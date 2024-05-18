<script>

import dict from "../dict.ts";
import rest from "../rest.ts";

var readme_page = {};

readme_page.methods = {
  t: dict.get,
  init: async function(){
    if(this.readme) return;
    this.readme = (await rest.readme('ru')).readme;
  }
};

readme_page.data = function () {
  return { readme: ''};
};

readme_page.mounted = function(){
      this.init()
}

export default readme_page;
</script>

<template ref="readme">
  <div class="readme-panel panel">
    <MainTop :name="t('Документация')"></MainTop>
    <div class="readme-down-panel">

      <div class="panel readme-small-panel readme-small-panel-main">
        

      <KMarked 
              class="readme-marked"
              :val="readme" 
              :disabled="true" 
              label=""
              :resize="false"

            />
      <br>


      
      </div>

      
      
    </div>

    

    <img class="main-bg-img" src="/b3-1.webp"/>

   
  </div>
</template>

<style lang="scss">
.readme-panel {
  height: 100vh;
	width: 100vw;
	position: fixed;
	top: 0px;
	left: 0px;
	display:flex;
	flex-direction: column;
	padding: 30px;
  background-color: rgb(30, 30, 37) !important;
}

.readme-down-panel{
		display: flex;
		z-index: 1;
		flex-direction: column;
		width: 55vw;
    height: 100%;
    padding-left: 5vw;
	}

.readme-span {
  font-size: 14px;
  font-weight: 100;
}

.readme-span *{
  font-size: 14px;
  text-decoration: auto;
}

.readme-span-last {
  text-align: end;
  margin-bottom: 6px;
}



.readme-small-panel{
  background-color: var(--table-row-color);

  z-index: 2;
  
  position: fixed;

  display: flex;
  flex-direction: column;
  justify-content: center;

  padding: 20px;

  
}
.readme-panel span{
  opacity: 0.9;
}

.readme-small-panel-main{
  left: 50vw;
  top: 140px; 
  bottom: 20px;
  transform: translateX(-50%);
  width: calc(100% - 40px);
  overflow: scroll;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(168, 186, 197, 0.1) inset;
  //background: rgba(21, 24, 26, 0.8) !important;
  border-radius: 4px !important;
  border-style: outset !important;
  border-color: rgba(71, 81, 89, 0.5) !important;
  display: block;
}

.readme-marked{
  position: relative;
}

.readme-marked img{
  border: none !important;
  outline: none !important;
}

.mobile-view .readme-small-panel-main{
  background: rgba(21, 24, 26, 0.4) !important;
  border-color: rgba(71, 81, 89, 0.4) !important;
  width: 95%;
}





.readme-list {
  padding-left: 10px;
  padding-top: 10px; 
  display: flex;
  flex-direction: column;
}


.readme-list a {
  text-decoration: none; 
  color: rgb(108, 146, 211);
  margin-bottom: 6px;
  font-weight: 300;
}

.readme-list i{
  width: 22px;
  height: 22px;
  color: rgb(108, 146, 211);
}


</style>
