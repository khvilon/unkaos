export default class tools {

  static copyToClipboard = (text:string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  };


  static dt_options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Europe/Moscow",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  };

  static date_options: Intl.DateTimeFormatOptions = {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    timeZone: "Europe/Moscow",
  };

  static str_contains(str: string, substr: string): boolean {
    str = str.toString().toLowerCase();
    substr = substr.toString().toLowerCase();
    return str.indexOf(substr) > -1;
  }

  static row_contains(row: any, val: any, columns: any): boolean {
    //console.log('cont', val, columns, row)
    if (columns == undefined || columns.length == 0) columns = Object.keys(row);
    for (const i in columns) {
      if (tools.str_contains(row[columns[i]], val)) return true;
    }
    return false;
  }

  static filter_data(data: any[], val: any, columns: any): any {
    return data.filter((row) => tools.row_contains(row, val, columns));
  }

  static uuidv4(): string {
    return (String(1e7) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        Number(c) ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
      ).toString(16)
    );
  }

  // WHAT?
  static obj_clone(obj: any): string {
    return JSON.parse(JSON.stringify(obj));
  }

  static clone_obj(obj: any): string {
    return JSON.parse(JSON.stringify(obj));
  }

  static string_is_date(str): boolean{
    return (new Date(str) !== "Invalid Date") && !isNaN(new Date(str))
  }
  /*
  tools.clone_obj = tools.obj_clone = function(obj) {
    //  if(obj.boards_columns != undefined) console.log('cloneclone', JSON.stringify(obj))
      if(obj.toBuffer != undefined) return obj.clone()
      var clone = {};
      if(Array.isArray(obj))
      {
          clone = []
          for(var i in obj) {
              if(obj[i] != null &&  typeof(obj[i])=="object" && obj[i].naturalHeight == undefined)
                  clone.push(tools.obj_clone(obj[i]))
              else
              clone.push(obj[i])

          }
      }
      else
      {
          for(var i in obj) {
              if(obj[i] != null &&  typeof(obj[i])=="object" && obj[i].naturalHeight == undefined)
                  clone[i] = tools.obj_clone(obj[i]);
              else
                  clone[i] = obj[i];
          }
      }
     // if(obj.boards_columns != undefined) console.log('cloneclone2', JSON.stringify(clone))
      return clone;
  }
  */

  static obj_length(obj: any): number {
    return Object.keys(obj).length;
  }

  static obj_join(obj0: any, obj1: any) {
    for (const i in obj1) {
      if (obj0[i] !== obj1[i]) {
        if (typeof obj0[i] == "object")
          obj0[i] = tools.obj_join(obj0[i], obj1[i]);
        else obj0[i] = tools.obj_clone(obj1[i]);
      }
    }
    return obj0;
  }

  static obj_set_val(obj: any, path: string, val: any) {
    if (path == "") {
      //obj = this.obj_clone(val)
      return;
    }
    const parts = path.split(".");
    const limit = parts.length - 1;
    for (let i = 0; i < limit; ++i) {
      const key = parts[i];
      obj = obj[key] ?? (obj[key] = {});
    }
    const key = parts[limit];
    obj[key] = val;
  }

  static obj_attr_by_path(obj: any, path: string): string {
    if (obj == undefined) return "";
     console.log('obj_attr_by_path0', JSON.stringify(obj), path)
    if (Array.isArray(path)) {
      let ans = "";
      for (const i in path) {
        //console.log('pp', path[i])
        ans += tools.obj_attr_by_path(obj, path[i]);
      }
      // ans = '<a href="/issue/' + ans + '">' + ans + '</a>'
      return ans;
    }
    if (path[0] == "'") return path.replace("'", "").replace("'", "");
    const path_parts = path.split(".");
    let data_part = obj;
    // console.log('obj_attr_by_path1', path_parts, data_part)
    if (path_parts[0] == "values") {
      for (const i in obj.values) {
        //  console.log('vaal', obj.values[i].label, path_parts[1])
        if (obj.values[i].label == path_parts[1]) return obj.values[i].value;
      }
    }
    for (const i in path_parts) {
      // console.log('obj_attr_by_path11', data_part, path_parts[i])
      data_part = data_part[path_parts[i]];
      if (data_part == undefined) return "";
    }
    console.log('obj_attr_by_path2', path, data_part)
    return data_part;
  }

  static compare_obj(sort_name: string): (a: any, b: any) => number {
    return function (a, b) {
      //console.log(a, b, sort_name)
      let fa = a[sort_name]
      if(fa.toLowerCase) fa = fa.toLowerCase()
      let fb = b[sort_name]
      if(fb.toLowerCase) fb = fb.toLowerCase()
      if (fa < fb) return -1;
      if (fa > fb) return 1;
      return 0;
    };
  }

  static compare_obj_dt(sort_name: string): (a: any, b: any) => number {
    return function (a, b) {
      const fa = new Date(a[sort_name]),
        fb = new Date(b[sort_name]);
      if (fa < fb) return -1;
      if (fa > fb) return 1;
      return 0;
    };
  }

  static readUploadedFile(inputFile: Blob): Promise<any> {
    const temporaryFileReader = new FileReader();
    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException("Problem parsing input file."));
      };
      temporaryFileReader.onload = () => {
        resolve(temporaryFileReader.result);
      };
      //console.log(inputFile)
      temporaryFileReader.readAsDataURL(inputFile);
    });
  }

  static readUploadedFileAsImg(inputFile: Blob): Promise<any> {
    // <duplicated code was here>
    return tools.readUploadedFile(inputFile);
  }

  static get_uri_params(uriString: string): any {
    const uri = decodeURI(uriString).split("?")[1];
    if (uri == undefined) return {};
    const vars = uri.split("&");
    const params: any = {};
    for (const i in vars) {
      const tmp = vars[i].split("=");
      // console.log('u', tmp, name)
      if (tmp.length == 2) {
        params[tmp[0]] = tmp[1];
      }
    }
    //console.log('up', JSON.stringify(params))
    return params;
  }

  static get_uri_param(uri: string, name: string): string {
    uri = uri.split("?")[1];
    if (uri == undefined) return "";
    const vars = uri.split("&");
    for (const i in vars) {
      const tmp = vars[i].split("=");
      // console.log('u', tmp, name)
      if (tmp.length == 2 && tmp[0] === name) {
        // console.log('u', tmp[1], name,tmp.length )
        return tmp[1];
      }
    }
    return "";
  }

  static split2(str: string, delim: string): string[] {
    const str1 = str.split(delim)[0];
    const str2 = str.substring(str.indexOf(delim) + 1);
    return [str1, str2];
  }

  static format_dt(dt: number | string | Date): string {
    return new Date(dt).toLocaleString("ru", tools.dt_options);
  }
  static format_date(dt: number | string | Date): string {
    return new Date(dt).toLocaleString("ru", tools.date_options);
  }

  static roundDate(dt: number | string | Date){
    return new Date(dt).setHours(0, 0, 0, 0);
  }

  static isValidJSON(str: string) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  static copy_text_to_clipboard(text:string) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  //avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        var successful = document.execCommand('copy');
    } catch (err) {
        console.log( err);
    }
    document.body.removeChild(textArea)
    return;
  }  

  static encodeURIComponent(filter:string) {
    return encodeURIComponent(filter).replace(/\./g, '%2E').replace(/-/g, '%2D')
  }
}



declare global {
  interface String {
    contains(s: string): boolean;
    replaceAll(s1: string, s2: string): string;
  }
}

String.prototype.contains = function (substr): boolean {
  const str = this.toLowerCase();
  substr = substr.toString().toLowerCase();
  return str.indexOf(substr) > -1;
};

String.prototype.replaceAll = function (old_substr, new_substr): string {
 // return this.replace(old_substr, new_substr);
   return this.split(old_substr).join(new_substr);
  // while(str.contains(old_substr)) str = str.replace(old_substr, new_substr)
};


