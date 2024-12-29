import './string.extensions';

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

const translitMapEnToRu = {
    'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
    'zh': 'ж', 'z': 'з', 'i': 'и', 'j': 'й', 'k': 'к',
    'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р',
    's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'c': 'ц',
    'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'y': 'ы', 'yu': 'ю',
    'ya': 'я'
} as const;

const translitMapRuToEn = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k',
    'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ы': 'y', 'ю': 'yu',
    'я': 'ya'
} as const;

const tools: Tools = {
    translitMapEnToRu,
    translitMapRuToEn,

    transliterateEnToRu(text: string): string {
        return this.transliterate(text, this.translitMapEnToRu);
    },

    transliterateRuToEn(text: string): string {
        return this.transliterate(text, this.translitMapRuToEn);
    },

    transliterate(text: string, translitMap: { [key: string]: string }): string {
        let result = text.toLowerCase();
        
        for (const key in translitMap) {
            result = result.replaceAll(key, translitMap[key]);
        }
        
        return result;
    },

    obj_length(obj: any): number {
        return Object.keys(obj).length;
    },

    obj_clone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    },

    obj_join<T, U>(obj0: T, obj1: U): T & U {
        return { ...obj0, ...obj1 };
    },

    split2(str: string, delim: string): [string, string] {
        const parts = str.split(delim);
        const str1 = parts[0];
        const str2 = parts.slice(1).join(delim);
        return [str1, str2];
    },

    uuidv4(): string {
        let timestamp = new Date().getTime();
        let perf = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;
        
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = Math.random() * 16;
            if(timestamp > 0){
                r = (timestamp + r)%16 | 0;
                timestamp = Math.floor(timestamp/16);
            } else {
                r = (perf + r)%16 | 0;
                perf = Math.floor(perf/16);
            }
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    },

    format_dt(dt: Date | string | number): string {
        return new Date(dt).toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
    },

    write_at_same_line(text: string): void {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(text);
    },

    map_with_key<T, R>(arr: T[], key_path: string, func: (key: any, item: T) => R): R[] {
        const result: R[] = [];
        const key_parts = key_path.split('.');
        
        for(const item of arr) {
            let key: any = item;
            for(const part of key_parts) {
                key = key[part];
            }
            result.push(func(key, item));
        }
        
        return result;
    },

    jaroWinkler(s1: string, s2: string): number {
        const p = 0.1; // Winkler's constant
        const bt = 0.7; // Winkler's boost threshold
        
        if (s1 === s2) return 1.0;
        
        const s1_len = s1.length;
        const s2_len = s2.length;
        
        const match_distance = Math.floor(Math.max(s1_len, s2_len) / 2) - 1;
        
        const s1_matches: boolean[] = new Array(s1_len).fill(false);
        const s2_matches: boolean[] = new Array(s2_len).fill(false);
        
        let matches = 0;
        let transpositions = 0;
        
        // Find matching characters within match_distance
        for (let i = 0; i < s1_len; i++) {
            const start = Math.max(0, i - match_distance);
            const end = Math.min(i + match_distance + 1, s2_len);
            
            for (let j = start; j < end; j++) {
                if (!s2_matches[j] && s1[i] === s2[j]) {
                    s1_matches[i] = true;
                    s2_matches[j] = true;
                    matches++;
                    break;
                }
            }
        }
        
        if (matches === 0) return 0.0;
        
        // Count transpositions
        let k = 0;
        for (let i = 0; i < s1_len; i++) {
            if (!s1_matches[i]) continue;
            while (!s2_matches[k]) k++;
            if (s1[i] !== s2[k]) transpositions++;
            k++;
        }
        
        // Jaro Distance
        const jaro = ((matches / s1_len) +
                     (matches / s2_len) +
                     ((matches - transpositions/2) / matches)) / 3;
        
        // Common prefix up to 4 characters
        let l = 0;
        for (let i = 0; i < Math.min(4, Math.min(s1_len, s2_len)); i++) {
            if (s1[i] === s2[i]) l++;
            else break;
        }
        
        // Winkler's modification
        return jaro < bt ? jaro : jaro + l * p * (1 - jaro);
    }
};

export default tools;