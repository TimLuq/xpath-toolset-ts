import { XPathParseError } from "./xpath-ast-patterns";

import { nameChar, nameStartChar } from "./xpath-literals";

export function tokenize(xpath: string) {
    let i = 0;
    const l = xpath.length;
    const r: string[] = [];
    while (i !== l) {
        let c = xpath.charCodeAt(i);
        if (c === 8 || c === 10 || c === 13 || c === 32) {
            r.push(" ");
            do {
                c = xpath.charCodeAt(++i);
            } while (c === 8 || c === 10 || c === 13 || c === 32);
            continue;
        }
        if (c === 0x21) {
            if (xpath.charCodeAt(++i) === 0x3D) {
                r.push("!=");
                i++;
            } else {
                r.push("!");
            }
            continue;
        }
        if (c === 0x22 || c === 0x27) {
            let s = "";
            const ch = c === 0x22 ? "\"" : "'";
            i++;
            while (i < l) {
                const pos = xpath.indexOf(ch, i);
                if (pos === -1) {
                    throw new XPathParseError(
                        "tokenize-strlit", "Mismatching number of quote characters `" + ch + "`", undefined, i,
                    );
                }
                if (xpath.charCodeAt(pos + 1) === c) {
                    s += xpath.substring(i, pos + 1);
                    i = pos + 2;
                    continue;
                }
                s += xpath.substring(i, pos);
                i = pos;
                break;
            }
            if (xpath.charCodeAt(i) !== c) {
                throw new XPathParseError(
                    "tokenize-strlit", "Mismatching number of quote characters `" + ch + "`", undefined, i,
                );
            }
            i++;
            r.push(ch, s, ch);
            continue;
        }
        if (c >= 0x23 && c <= 0x2D) {
            r.push(xpath.charAt(i++));
            continue;
        }
        if (c === 0x2E) {
            let s = ".";
            let n = xpath.charAt(++i);
            while (n === ".") {
                s += n;
                n = xpath.charAt(++i);
            }
            r.push(s);
            continue;
        }
        if (c === 0x2F) {
            let s = "/";
            let n = xpath.charAt(++i);
            while (n === "/") {
                s += n;
                n = xpath.charAt(++i);
            }
            r.push(s);
            continue;
        }
        if (c >= 0x30 && c <= 0x39) {
            let s = "";
            let n = c;
            while (n >= 0x30 && n <= 0x39) {
                s += String.fromCharCode(n);
                n = xpath.charCodeAt(++i);
            }
            r.push(s);
            continue;
        }
        if (c === 0x3A) {
            let s = ":";
            let n = xpath.charAt(++i);
            while (n === ":" || n === "=") {
                s += n;
                n = xpath.charAt(++i);
            }
            r.push(s);
            continue;
        }
        if (c === 0x3B) {
            r.push(";");
            i++;
            continue;
        }
        if (c >= 0x3C && c <= 0x3E) {
            let s = "";
            let n = xpath.charAt(i);
            while (n === "<" || n === "=" || n === ">") {
                s += n;
                n = xpath.charAt(++i);
            }
            r.push(s);
            continue;
        }
        if (c >= 0x3F && c <= 0x40) {
            r.push(xpath.charAt(i++));
            continue;
        }
        if (c >= 0x5B && c <= 0x60) {
            r.push(xpath.charAt(i++));
            continue;
        }
        if (c === 0x7B || c === 0x7E) {
            r.push(xpath.charAt(i++));
            continue;
        }
        if (c === 0x7C) {
            let s = "";
            while (xpath.charAt(i++) === "|") {
                s += "|";
            }
            r.push(s);
            continue;
        }
        if (nameStartChar(c)) {
            const start = i;
            while (i < l && nameChar(xpath.charCodeAt(++i))) {
                // incr `i`
            }
            r.push(xpath.substring(start, i));
            continue;
        }
        throw new XPathParseError(
            "tokenize-unexpected", "Unexpected character with code `" + c + "`", undefined, i,
        );
    }
    return r;
}
