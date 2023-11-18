<script lang="ts">
  export default {
    props: {
      name: {
        type: String,
        default: "aa",
      }
    },
  };
</script>

<template>
  <div class="maintop">
    <div  class="maintop-title"> 
      <svg 
        version="1.0" 
        xmlns="http://www.w3.org/2000/svg"
        width="278.000000pt" height="267.000000pt" 
        viewBox="0 0 278.000000 267.000000"
        preserveAspectRatio="xMidYMid meet"
      >
        <g class="honeypot0" transform="translate(0.000000,267.000000) scale(0.020000,-0.020000)">
        <path d="M1420 2420 c-18 -14 -75 -116 -162 -290 -106 -212 -134 -277 -134
        -309 0 -62 258 -573 303 -601 30 -18 53 -19 389 -19 196 0 363 3 371 6 16 6
        212 384 271 521 23 54 32 89 29 109 -3 16 -63 149 -134 295 -71 147 -129 271
        -129 277 0 28 -48 32 -408 32 -361 0 -370 0 -396 -21z m716 -414 l93 -185 -93
        -185 -92 -185 -238 0 -237 0 -93 185 -92 185 92 185 93 185 237 0 238 0 92
        -185z"/>
        </g>
        <g class="honeypot1" transform="translate(0.000000,267.000000) scale(0.100000,-0.100000)">
        <path d="M508 1943 c-14 -16 -84 -147 -157 -292 -95 -190 -131 -273 -131 -299
        0 -26 38 -111 137 -310 110 -220 144 -279 168 -294 28 -17 56 -18 409 -16
        l380 3 122 242 c156 311 168 341 161 398 -6 40 -12 56 -38 105 -45 83 -182
        368 -200 415 -12 33 -27 63 -33 67 -6 4 -187 8 -402 8 l-390 0 -26 -27z m723
        -402 c49 -95 89 -181 89 -190 0 -9 -40 -95 -88 -191 l-88 -175 -231 -3 -231
        -2 -92 186 -93 187 94 183 94 184 229 -2 229 -3 88 -174z"/>
        </g>
        <g class="honeypot2" transform="translate(0.000000,267.000000) scale(0.100000,-0.100000)">
        <path d="M1396 1469 c-18 -14 -75 -116 -162 -290 -106 -212 -134 -277 -134
        -309 0 -62 258 -573 303 -601 30 -18 53 -19 389 -19 196 0 363 3 371 6 16 6
        212 384 271 521 23 54 32 89 29 109 -3 16 -63 149 -134 295 -71 147 -129 271
        -129 277 0 28 -48 32 -408 32 -361 0 -370 0 -396 -21z m716 -414 l93 -185 -93
        -185 -92 -185 -238 0 -237 0 -93 185 -92 185 92 185 93 185 237 0 238 0 92
        -185z"/>
        </g>
      </svg>

			<a href="/">Unkaos</a>
    </div>	
			
		<div class="maintop-title2"> 	
		  <Span >{{name}}</Span>
		</div>

  </div>
</template>

<style lang="scss">
  @import "../css/palette.scss";
  @import "../css/global.scss";

  .maintop-title{
    font-size: 20px;
    text-align: center;
    padding-bottom: 5px;
    z-index: 1;
    display: flex;
    width: 100%;
    text-align: center;
    align-items: center;
    justify-content: center;
    
  }

  .maintop-title a{
    font-size: 40px;
    text-align: center;
    font-weight: 350;
    text-decoration: none;
    color:var(--text-color);
    z-index: 1;
  }

  .maintop-title2{
    font-size: 20px;
    text-align: center;
    padding-bottom: 70px;
    z-index: 1;
    display: flex;
    width: 100%;
    text-align: center;
    align-items: center;
    justify-content: center;
  }

  .maintop-title2 span{
    font-size: 22px;
    text-align: center;
    font-weight: 100;
  }

  .maintop-title svg{
    width:50px;
    height: 50px;
  }

  .maintop-title g{
	fill:var(--text-color);
	stroke:none;
   }

  @keyframes moveHoneypot0 {
    0%, 100% {
      transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
    }
    20% {
      transform: translate(10pt,180pt) scale(0.080000,-0.080000);
    }
    40% {
      transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
    }
  }

  @keyframes moveHoneypot1{
    0%, 100% {
      transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
    }
    20% {
      transform: translate(-20pt,200pt) scale(0.080000,-0.080000);
    }
    40% {
      transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
    }
  }

  @keyframes moveHoneypot2 {
    0%, 100% {
      transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
    }
    20% {
      transform: translate(10pt,220pt) scale(0.080000,-0.080000);
    }
    40% {
      transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
    }
  }


  .maintop-title .honeypot0 {
    animation: moveHoneypot0 4s linear infinite;
    //	transform-box: fill-box;
    //transform-origin: center center;
  }
  .maintop-title .honeypot1 {
    animation: moveHoneypot1 4s linear infinite;
  }

  .maintop-title .honeypot2 {
    animation: moveHoneypot2 4s linear infinite;
  }

</style>
