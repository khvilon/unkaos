interface String {
    contains(): Boolean;  
    contains(substr: string): boolean;  
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
    replaceAll(searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
    replaceFrom(oldSubstr: string, newSubstr: string, start?: number): string;
}

String.prototype.contains = function(substr?: string): boolean {
    if (substr === undefined) {
        return false; 
    }
    const str = this.toLowerCase();
    const substrLower = substr.toString().toLowerCase();
    return str.indexOf(substrLower) > -1;
}

String.prototype.replaceAll = function(
    searchValue: string | RegExp,
    replaceValue: string | ((substring: string, ...args: any[]) => string)
): string {
    if (typeof replaceValue === 'function') {
        return this.replace(new RegExp(searchValue, 'g'), replaceValue);
    }
    if (searchValue instanceof RegExp) {
        return this.replace(searchValue, replaceValue);
    }
    return this.split(searchValue).join(replaceValue);
}

String.prototype.replaceFrom = function(oldSubstr: string, newSubstr: string, start: number = 0): string {
    return this.substring(0, start) + this.substring(start).replace(oldSubstr, newSubstr);
}
