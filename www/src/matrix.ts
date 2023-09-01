const matrix_symbols_row: string = "01"//"1234567890";
const matrix_symbols: Array<string> = matrix_symbols_row.split("");
const matrix_font_size = 8

export default class MatrixRain {

public static initScreensaver(canvas_id: string)
{
		let screensaver_canvas = document.getElementById(canvas_id);

		if(!screensaver_canvas) return

		let ctx = screensaver_canvas.getContext("2d");

		let columns = screensaver_canvas.width/matrix_font_size; //number of columns for the rain
		//an array of drops - one per column
		let drops = [];
		//x below is the x coordinate
		//1 = y co-ordinate of the drop(same for every drop initially)
		for(var x = 0; x < columns; x++)
			drops[x] = 1; 

		MatrixRain.draw_matrix(ctx, screensaver_canvas, drops, false);

		
}


//drawing the characters
private static  draw_matrix(ctx: any,screensaver_canvas: any, drops: any, shown: boolean )
{

	//Black BG for the canvas
	//translucent BG to show trail
	ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
	ctx.fillRect(0, 0, screensaver_canvas.width, screensaver_canvas.height);
	
	ctx.fillStyle = "#0F0"; //green text
	ctx.fontSize = matrix_font_size + "px";
	//looping over drops
	for(var i = 0; i < drops.length; i++)
	{
		//a random matrix_symbols character to print
		var text = matrix_symbols[Math.floor(Math.random()*matrix_symbols.length)];
		//x = i*matrix_font_size, y = value of drops[i]*matrix_font_size
		ctx.fillText(text, i*matrix_font_size, drops[i]*matrix_font_size*1.5);
		
		//sending the drop back to the top randomly after it has crossed the screen
		//adding a randomness to the reset to make the drops scattered on the Y axis
		if(drops[i]*matrix_font_size > screensaver_canvas.height && Math.random() > 0.975)
			drops[i] = 0;
		
		//incrementing Y coordinate
		drops[i]++;
	}

	if(window.getComputedStyle(screensaver_canvas).display != "none") shown = true

	if(window.getComputedStyle(screensaver_canvas).display != "none" || !shown) setTimeout(MatrixRain.draw_matrix, 100, ctx, screensaver_canvas, drops, shown);
}

}







