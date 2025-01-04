interface String {
    contains(): Boolean;
}

export interface Tools {
    readonly translitMapEnToRu: { readonly [key: string]: string };
    readonly translitMapRuToEn: { readonly [key: string]: string };
    transliterateEnToRu(text: string): string;
    transliterateRuToEn(text: string): string;
    transliterate(text: string, translitMap: { [key: string]: string }): string;
    obj_length(obj: any): number;
    obj_clone<T>(obj: T): T;
    obj_join<T, U>(obj0: T, obj1: U): T & U;
    split2(str: string, delim: string): [string, string];
    uuidv4(): string;
    format_dt(dt: Date | string | number): string;
    write_at_same_line(text: string): void;
    map_with_key<T, R>(arr: T[], key_path: string, func: (key: any, item: T) => R): R[];
    jaroWinkler(s1: string, s2: string): number;
}

declare const tools: Tools;
export default tools;