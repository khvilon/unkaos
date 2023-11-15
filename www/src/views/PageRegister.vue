<script>



	import KButton from '../components/KButton.vue'
	import StringInput from '../components/StringInput.vue'

	
	import rest from '../rest.ts'
	import tools from '../tools.ts'

	var register_page = {}

	const label = 
	[
		'Вы находитесь на Московском портале иновационных проектов "Галилей"',
		'Регистрация',
		//d['Система бесплатна и распространяется под лицензией Apache 2.0, вы можете как пользоваться облачной версией, так и установить коробочную версию. Исходный код открыт и доступен в репозитории https://github.com/khvilon/unkaos.'],
		//d['Связаться с автором можно по почте n@khvilon.ru (Николй Хвилон)']
	]

		
	
    register_page.methods =
    {
		update_user_name(val) {
			this.user_name = val
    	},

		update_mail(val) {
			this.mail = val
    	},

    	update_pass(val) {
			this.pass = val
    	},

		async register() {
			this.try_done = true

			console.log(this.try_done, this.user_name)

			if(this.user_name == '') return;
			if(this.mail == '') return;
			if(this.pass == '') return;

			let my_uuid = tools.uuidv4()

			let ans = await rest.run_method('create_register_user', {name: this.user_name, mail: this.mail, password: this.pass, uuid: my_uuid})

			//if(ans == null) return

			console.log('aans' + ans)

			let token = await rest.get_token(this.mail, this.pass)
			console.log(token)

			if(token == null) return


			window.location.href = '/profile/' + my_uuid

    	},

		

    	
	}

	

	register_page.data= function()
  	{
    	return {label, user_name: '',mail: '', pass: '', wrong: false, try_done: false}
    } 


	register_page.components =
    {
    	StringInput,
    	KButton
    }

	register_page.computed = {}
	register_page.computed.mail_is_valid = function()
	{
		if(this.mail == undefined || this.mail == '') return false
		var re = /\S+@\S+\.\S+/;
  		return re.test(this.mail);
	}

	register_page.mounted = function()
	{
		(function() {

var width, height, largeHeader, canvas, ctx, points, target, animateHeader = true;

// Main
initHeader();
initAnimation();
addListeners();

function initHeader() {
	width = window.innerWidth/2;
	height = window.innerHeight;
	target = {x: width/2, y: height/2};

	largeHeader = document.getElementById('large-header');
	largeHeader.style.height = height+'px';

	canvas = document.getElementById('demo-canvas');
	canvas.width = width;
	canvas.height = height;
	ctx = canvas.getContext('2d');


	console.log('aaaaa111111')

	// create points
	points = [];
	for(var x = 0; x < width; x = x + width/20) {
		for(var y = 0; y < height; y = y + height/20) {
			var px = x + Math.random()*width/20;
			var py = y + Math.random()*height/20;
			var p = {x: px, originX: px, y: py, originY: py };
			points.push(p);
		}
	}

	// for each point find the 5 closest points
	for(var i = 0; i < points.length; i++) {
		var closest = [];
		var p1 = points[i];
		for(var j = 0; j < points.length; j++) {
			var p2 = points[j]
			if(!(p1 == p2)) {
				var placed = false;
				for(var k = 0; k < 5; k++) {
					if(!placed) {
						if(closest[k] == undefined) {
							closest[k] = p2;
							placed = true;
						}
					}
				}

				for(var k = 0; k < 5; k++) {
					if(!placed) {
						if(getDistance(p1, p2) < getDistance(p1, closest[k])) {
							closest[k] = p2;
							placed = true;
						}
					}
				}
			}
		}
		p1.closest = closest;
	}

	// assign a circle to each point
	for(var i in points) {
		var c = new Circle(points[i], 2+Math.random()*2, 'rgba(255,255,255,0.3)');
		points[i].circle = c;
	}
}

// Event handling
function addListeners() {
	if(!('ontouchstart' in window)) {
		window.addEventListener('mousemove', mouseMove);
	}
	
	
}

function mouseMove(e) {
	return
	let posx = 0
	let posy = 0;
	if (e.pageX || e.pageY) {
		posx = e.pageX;
		posy = e.pageY;
	}
	else if (e.clientX || e.clientY)    {
		posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}
	target.x = posx;
	target.y = posy;
}



// animation
function initAnimation() {
	animate();
	for(var i in points) {
		shiftPoint(points[i]);
	}
}

function animate() {
	if(animateHeader) {
		ctx.clearRect(0,0,width,height);
		for(var i in points) {
			// detect points in range
			if(Math.abs(getDistance(target, points[i])) < 4000) {
				points[i].active = 0.3;
				points[i].circle.active = 0.6;
			} else if(Math.abs(getDistance(target, points[i])) < 20000) {
				points[i].active = 0.1;
				points[i].circle.active = 0.3;
			} else if(Math.abs(getDistance(target, points[i])) < 40000) {
				points[i].active = 0.02;
				points[i].circle.active = 0.1;
			} else {
				points[i].active = 0;
				points[i].circle.active = 0;
			}

			drawLines(points[i]);
			points[i].circle.draw();
		}
	}
	requestAnimationFrame(animate);
}

function shiftPoint(p) {
	TweenLite.to(p, 1+1*Math.random(), {x:p.originX-50+Math.random()*100,
		y: p.originY-50+Math.random()*100, ease:Circ.easeInOut,
		onComplete: function() {
			shiftPoint(p);
		}});
}

// Canvas manipulation
function drawLines(p) {
	if(!p.active) return;
	for(var i in p.closest) {
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		ctx.lineTo(p.closest[i].x, p.closest[i].y);
		ctx.strokeStyle = 'rgba(156,217,249,'+ p.active+')';
		ctx.stroke();
	}
}

function Circle(pos,rad,color) {
	var _this = this;

	// constructor
	(function() {
		_this.pos = pos || null;
		_this.radius = rad || null;
		_this.color = color || null;
	})();

	this.draw = function() {
		if(!_this.active) return;
		ctx.beginPath();
		ctx.arc(_this.pos.x, _this.pos.y, _this.radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = 'rgba(156,217,249,'+ _this.active+')';
		ctx.fill();
	};
}

// Util
function getDistance(p1, p2) {
	return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
}

})();

	}

	export default register_page
	
</script>



<template >


	
	<div class="register-panel panel">

		<div id="large-header" class="large-header">
			<img src="http://unkaos.oboz.local:3000/login_microchip.png" width="713" height="713">

			</div>
		

			<div class="register-title"> 
				<svg version="1.0" xmlns="http://www.w3.org/2000/svg"
				width="278.000000pt" height="267.000000pt" viewBox="0 0 278.000000 267.000000"
				preserveAspectRatio="xMidYMid meet">
				<g class="honeypot0" transform="translate(0.000000,267.000000) scale(0.020000,-0.020000)"
				fill="#304D5AFF" stroke="#304D5AFF">
				<path d="M1420 2420 c-18 -14 -75 -116 -162 -290 -106 -212 -134 -277 -134
				-309 0 -62 258 -573 303 -601 30 -18 53 -19 389 -19 196 0 363 3 371 6 16 6
				212 384 271 521 23 54 32 89 29 109 -3 16 -63 149 -134 295 -71 147 -129 271
				-129 277 0 28 -48 32 -408 32 -361 0 -370 0 -396 -21z m716 -414 l93 -185 -93
				-185 -92 -185 -238 0 -237 0 -93 185 -92 185 92 185 93 185 237 0 238 0 92
				-185z"/>
				</g>
				<g class="honeypot1" transform="translate(0.000000,267.000000) scale(0.100000,-0.100000)"
				fill="#304D5AFF" stroke="#304D5AFF">
				<path d="M508 1943 c-14 -16 -84 -147 -157 -292 -95 -190 -131 -273 -131 -299
				0 -26 38 -111 137 -310 110 -220 144 -279 168 -294 28 -17 56 -18 409 -16
				l380 3 122 242 c156 311 168 341 161 398 -6 40 -12 56 -38 105 -45 83 -182
				368 -200 415 -12 33 -27 63 -33 67 -6 4 -187 8 -402 8 l-390 0 -26 -27z m723
				-402 c49 -95 89 -181 89 -190 0 -9 -40 -95 -88 -191 l-88 -175 -231 -3 -231
				-2 -92 186 -93 187 94 183 94 184 229 -2 229 -3 88 -174z"/>
				</g>
				<g class="honeypot2" transform="translate(0.000000,267.000000) scale(0.100000,-0.100000)"
				fill="#304D5AFF" stroke="#304D5AFF">
				<path d="M1396 1469 c-18 -14 -75 -116 -162 -290 -106 -212 -134 -277 -134
				-309 0 -62 258 -573 303 -601 30 -18 53 -19 389 -19 196 0 363 3 371 6 16 6
				212 384 271 521 23 54 32 89 29 109 -3 16 -63 149 -134 295 -71 147 -129 271
				-129 277 0 28 -48 32 -408 32 -361 0 -370 0 -396 -21z m716 -414 l93 -185 -93
				-185 -92 -185 -238 0 -237 0 -93 185 -92 185 92 185 93 185 237 0 238 0 92
				-185z"/>
				</g>
				</svg>

				<Span >Unkaos
			</Span></div>	
			
		<div class="register-title2"> 
			
			
		<Span >
			Регистрация</Span>
		</div>
		<div class="registration-down-panel">
		<div class="register-panel-part">


			
			


			<StringInput
			label="Имя"
			v-model:value="user_name"
			v-on:update_parent_from_input="update_user_name"
			:class="{'error-field': (try_done && (user_name == ''))}"
			>
			</StringInput>
			<StringInput
			label="Почта"
			v-model:value="mail"
			v-on:update_parent_from_input="update_mail"
			:class="{'error-field': try_done && !mail_is_valid}"
			>
			</StringInput>
			<StringInput
			label="Пароль"
			:type="'password'"
			v-model:value="pass"
			v-on:update_parent_from_input="update_pass"
			:class="{'error-field': (try_done && (pass == ''))}"
			>
			</StringInput>
			<KButton name="Зарегистрироваться"
			@click="register"/>


			<div class="register-about">
				
				

				
			</div>
			
		</div>

		

	</div>
		

	<a href="/login">Войти</a>

	</div>
</template>




<style lang="scss">
	.register-panel {
    height: 100vh;
	width: 100vw;
	position: fixed;;
	top: 0px;
	left: 0px;
	display:flex;
	flex-direction: column;
	padding: 30px;
	}

	.registration-down-panel
	{
		display: flex;
		z-index: 1;
	}
	

	@keyframes registerWeelAnimation {
    from {transform:rotateZ(0deg);}
    to {transform:rotateZ(360deg);}
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


	.honeypot0 {
     	animation: moveHoneypot0 4s linear infinite;
     //	transform-box: fill-box;
  		//transform-origin: center center;
   }
   .honeypot1 {
     	animation: moveHoneypot1 4s linear infinite;
   }

   .honeypot2 {
     	animation: moveHoneypot2 4s linear infinite;
   }


   .register-panel g{
	fill:var(--text-color);
	stroke:none;
   }

   .register-panel-part{
	width:50%;
   }


   .register-panel-part .btn{
   padding: 25px 20px 10px 20px;
   }

   .register-panel-part .btn_input{
   	width: 100%;
   }

   .register-title{
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

   .register-title span{
	font-size: 40px;
	text-align: center;
	font-weight: 100;
	
   }

   .register-title2{
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

   .register-title2 span{
	font-size: 22px;
	text-align: center;
	font-weight: 100;
	
   }

   .register-panel a{
	position:absolute;
	top: 10px;
	right: 20px;
	font-size: 14px;
	cursor: pointer;
	font-weight: 400;
   }

   .register-about{
	display: flex;
	padding: 60px 20px 10px 20px;
	flex-direction: column;
   }
   .register-about span{
   padding-bottom: 20px;
   font-size: 14px;
   }

   .register-title svg{
	width:50px;
	height: 50px;
   }





   /* Header */
.large-header {
	
	width: 100%;
	height:100%;
	//background: #333;
	overflow: hidden;

	background-position: center center;
	z-index: 0;
	position: fixed;
	left: 50%;
	top: 30px;
	bottom: 0px;
	right: 0px;
	
	
}


.error-field input{
	border-color: rgb(166, 13, 13);

}





</style>