// TODO move this to package
var tools:any = {}

import './string.extensions';

tools.translitMapEnToRu = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
        'zh': 'ж', 'z': 'з', 'i': 'и', 'j': 'й', 'k': 'к',
        'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р',
        's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'c': 'ц',
        'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'y': 'ы', 'yu': 'ю',
        'ya': 'я', 'x': 'кс', 'w': 'в', 'q': 'к'
};

tools.translitMapRuToEn = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};

tools.transliterateEnToRu = function(text: string){ return tools.transliterate(text, tools.translitMapEnToRu);}
tools.transliterateRuToEn = function(text: string){ return tools.transliterate(text, tools.translitMapRuToEn);}
tools.transliterate = function(text: string, translitMap: any){
  let result = '';

   
  for (let i = 0; i < text.length; i++) {
      let dblChar = text[i] + (text[i + 1] || '');
      let singleChar = text[i].toLowerCase();

      if (translitMap[dblChar] !== undefined) {
          result += translitMap[dblChar];
          i++; // Skip the next character as it was part of a double mapping
      } else if (translitMap[singleChar] !== undefined) {
          result += translitMap[singleChar];
      } else {
          // If no transliteration is found, keep the character as is
          result += text[i];
      }
  }

  return result;
}

tools.obj_length = function(obj:any){
    return Object.keys(obj).length
}

tools.obj_clone = function(obj:any){
	return JSON.parse(JSON.stringify(obj))
}

tools.obj_join = function(obj0:any, obj1:any){
    for (let i in obj1){
        obj0[i] = tools.obj_clone(obj1[i])
    }
    return obj0
}

tools.split2 = function(str:string, delim:any){
    let str1 = str.split(delim)[0]

    let str2 = str.substring(str.indexOf(delim)+1)

    return [str1, str2]
}

interface String {
    contains(substr:any): Boolean;
}

String.prototype.contains = function(substr:any){
    let str = this.toLowerCase()

    substr = substr.toString().toLowerCase() 

    return str.indexOf(substr) > -1
}

interface String {
    replaceAll(oldSubstr:string, newSubstr:string):  String;
}

String.prototype.replaceAll = function(oldSubstr:string, newSubstr:string){
    let str = this
 //   console.log('while replaceAll', str)
    let strParts = str.split(oldSubstr)
 //   console.log('while replaceAll2', str_parts)
    let newStr = strParts.join(newSubstr)
 //   console.log('while replaceAll3', str)
    
    return newStr
}

interface String {
    replaceFrom(oldSubstr:string, newSubstr:string, start:number):  String;
}

String.prototype.replaceFrom = function(oldSubstr:string, newSubstr:string, start:number){
    let str = this
    if(start == undefined) start = 0
    return str.substring(0, start) + str.substring(start).replace(oldSubstr, newSubstr)
}


tools.uuidv4 = function(): string {
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  const dt_options:Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Moscow',
    hour12: false,
    hour: '2-digit', minute:'2-digit'
  };
  
  tools.format_dt = function(dt:any){
    return new Date(dt).toLocaleString("ru", dt_options)
  }


  tools.write_at_same_line = function(text:string){
    process.stdout.clearLine(0);  // clear current text
    process.stdout.cursorTo(0);  // move cursor to beginning of line
    process.stdout.write(text);
  }

 
 
  tools.map_with_key = function(arr:any, key_path:any, func:Function){
      if(func == undefined) func = (o:any)=>o

      let arr_obj:any = {}
      for(let i in arr){
          let key 
          if((typeof key_path) == 'string') key = arr[i][key_path]
          else key = key_path(arr[i])
          arr_obj[key] = func(arr[i]) 
      }
      return arr_obj
  }  

  tools.jaroWinkler = function(s1: string, s2: string): number {
    const p = 0.1;
    const m = Math.floor(Math.min(s1.length, s2.length) / 2);
  
    let matches1 = Array(s1.length).fill(false);
    let matches2 = Array(s2.length).fill(false);
  
    let matches = 0;
    let transpositions = 0;
  
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - m);
      const end = Math.min(i + m + 1, s2.length);
  
      for (let j = start; j < end; j++) {
        if (matches2[j]) continue;
        if (s1[i] !== s2[j]) continue;
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
  
    if (matches === 0) return 0;
  
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!matches1[i]) continue;
      while (!matches2[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  
    const jaro = (1 / 3) * (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches);
    
    // Get the length of the common prefix (up to 4 characters)
    let commonPrefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) {
        commonPrefix++;
      } else {
        break;
      }
    }
  
    return jaro + commonPrefix * p * (1 - jaro);
  }
  

  export default tools