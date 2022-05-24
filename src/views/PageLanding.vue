<script>

	import KButton from '../components/KButton.vue'
	import StringInput from '../components/StringInput.vue'

	import d from '../dict.ts'


	var login_page = {}

	const label = 
	[
		d['Вы находитесть на странице проекта Unkaos. Данный инструмент создан в целях борьбы с хаосом в разработке программного обеспечения и других проектах, нуждающихся в качественном трекере задач.'],
		d['Система бесплатна и распространяется под лицензией Apache 2.0, вы можете как пользоваться облачной версией, так и установить коробочную версию. Исходный код открыт и доступен в репозитории https://github.com/khvilon/unkaos.'],
		d['Связаться с автором можно по почте n@khvilon.ru (Николй Хвилон)']
	]

		
	
    methods: 
    {
    	/*add_project(event) 
    	{
      		console.log('ttt ' + this)
      // `event` — нативное событие DOM
      		if (event) console.log(event.target.tagName)
        }*/
	}

	login_page.data= function()
  	{
    	return {label}
    } 

	login_page.components =
    {
    	StringInput,
    	KButton
    }

	export default login_page
	
</script>



<template ref='issues' >
	<div class="landing-panel panel">
    <span id="landing-span-0" class="landing-span">{{ label[0] }}</span>
	<span id="landing-span-1" class="landing-span">{{ label[1] }}</span>
	<span id="landing-span-2" class="landing-span">{{ label[2] }}</span>
	</div>
</template>




<style>
	.landing-panel {
    margin: 1px;
    height: 100vh;
	width: 100vw;
	position: absolute;
	top: 0px;
	left: 0px;
	}

	.landing-span{
		font-size: 15px;
		position: absolute;
		width: 90vw;
		left: 5vw;
	}

	#landing-span-0{
		top: 10vh;
	}
	#landing-span-1{
		top: 30vh;
	}
	#landing-span-2{
		top: 80vh;
		text-align: end;
	}


</style>