// tslint:disable:max-classes-per-file

import { Biggie, IBiggie } from "../helpers/biggie";
import { Decie } from "../helpers/decie";
import { IPushable, IXPathGrammar, XPathUnexpectedTokenError } from "./xpath-ast-patterns";

export function nameStartChar(c: number) {
    return c && ((c >= 65 && c <= 90) || c === 95 || (c >= 97 && c <= 122)
        || (c >= 0xC0 && c <= 0x02FF && c !== 0xD7 && c !== 0xF7)
        || (c >= 0x0370 && c <= 0x1FFF && c !== 0x037E)
        || (c === 0x200C || c === 0x200D)
        || (c >= 0x2070 && c <= 0x218F)
        || (c >= 0x2C00 && c <= 0x2FEF)
        || (c >= 0x3001 && c <= 0xD7FF)
        || (c >= 0xF900 && c <= 0xFDCF)
        || (c >= 0xFDF0 && c <= 0xFFFD)
        || (c >= 0x10000 && c <= 0xEFFFF)
    );
}

export function nameChar(c: number) {
    return c && ((c >= 65 && c <= 90) || c === 95 || (c >= 97 && c <= 122)
        || (c >= 0xC0 && c <= 0x02FF && c !== 0xD7 && c !== 0xF7)
        || (c >= 0x0370 && c <= 0x1FFF && c !== 0x037E)
        || (c === 0x200C || c === 0x200D)
        || (c >= 0x2070 && c <= 0x218F)
        || (c >= 0x2C00 && c <= 0x2FEF)
        || (c >= 0x3001 && c <= 0xD7FF)
        || (c >= 0xF900 && c <= 0xFDCF)
        || (c >= 0xFDF0 && c <= 0xFFFD)
        || (c >= 0x10000 && c <= 0xEFFFF)
        || (c >= 0x0030 && c <= 0x0039)
        || c === 0x002E || c === 0x002D
        || (c >= 0x0300 && c <= 0x036F)
        || (c >= 0x203F && c <= 0x2040)
    );
}

export class NCName implements IXPathGrammar<"NCName"> {
    public static parse(tokens: string[], usedTokens: number): [NCName, number] {
        let name = "";
        let tail = usedTokens;
        let t = tokens[tail];
        let c = t ? t.charCodeAt(0) : 0;
        if (!nameStartChar(c)) {
            throw new XPathUnexpectedTokenError(tokens, usedTokens, "NameStartChar of NCName");
        }
        do {
            name += t;
            tail++;
            t = tokens[tail];
            c = t ? t.charCodeAt(0) : 0;
        } while (nameChar(c));
        return [new NCName(name), tail];
    }

    public readonly syntaxType: "NCName" = "NCName";
    public constructor(public name: string) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push(this.name);
        return pushable;
    }

    public toString(): string {
        return this.render([]).join("");
    }
}

export type TLiteral = TNumericLiteral | StringLiteral;
export type TNumericLiteral = IntegerLiteral | DecimalLiteral | DoubleLiteral;

export abstract class NumericLiteral<S extends string> implements IXPathGrammar<S> {
    public static parse(tokens: string[], usedTokens: number): [TNumericLiteral, number] {
        const tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (!tokens[tail]) {
            throw new XPathUnexpectedTokenError(tokens, tail, "NumericLiteral");
        }
        if (/^[0-9]$/.test(tokens[tail])) {
            if (tokens[tail + 1] !== ".") {
                return IntegerLiteral.parse(tokens, tail);
            }
            if (!tokens[tail + 2]) {
                throw new XPathUnexpectedTokenError(tokens, tail, "NumericLiteral");
            }
            if (/^[0-9]+$/.test(tokens[tail + 2])) {
                return DecimalLiteral.parse(tokens, tail);
            }
            if (/^[0-9]+[eE]/.test(tokens[tail + 2])) {
                return DoubleLiteral.parse(tokens, tail);
            }
            throw new XPathUnexpectedTokenError(tokens, tail, "NumericLiteral");
        }
        if (tokens[tail] === ".") {
            if (/^[0-9]+$/.test(tokens[tail + 1])) {
                return DecimalLiteral.parse(tokens, tail);
            }
            if (/^[0-9]+[Ee]/.test(tokens[tail + 1])) {
                return DoubleLiteral.parse(tokens, tail);
            }
        }
        if (/^[0-9]*\.[0-9]+[eE]/.test(tokens[tail])) {
            return DoubleLiteral.parse(tokens, tail);
        }
        if (/^[0-9]*\.[0-9]+$/.test(tokens[tail])) {
            return DecimalLiteral.parse(tokens, tail);
        }
        throw new XPathUnexpectedTokenError(tokens, tail, "NumericLiteral");
    }

    public abstract readonly syntaxType: S;
    public abstract render<T extends IPushable>(pushable: T): T;
}

export class DecimalLiteral extends NumericLiteral<"DecimalLiteral"> {
    public static parse(tokens: string[], usedTokens: number): [DecimalLiteral, number] {
        const tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (!tokens[tail]) {
            throw new XPathUnexpectedTokenError(tokens, tail, "DecimalLiteral");
        }
        if (tokens[tail] === ".") {
            if (!tokens[tail + 1] || !/^[0-9]+$/.test(tokens[tail + 1])) {
                throw new XPathUnexpectedTokenError(tokens, tail, "DecimalLiteral");
            }
            return [new DecimalLiteral(new Decie("." + tokens[tail + 1])), tail + 2];
        }
        if (/^[0-9]*\.[0-9]+$/.test(tokens[tail])) {
            return [new DecimalLiteral(new Decie(tokens[tail])), tail + 1];
        }
        if (/^[0-9]+$/.test(tokens[tail])) {
            if (tokens[tail + 1] === ".") {
                if (tokens[tail + 2] && /^[0-9]+$/.test(tokens[tail + 2])) {
                    return [new DecimalLiteral(new Decie(tokens[tail] + "." + tokens[tail + 2])), tail + 3];
                }
            }
            return [new DecimalLiteral(new Decie(tokens[tail])), tail + 1];
        }
        throw new XPathUnexpectedTokenError(tokens, tail, "DecimalLiteral");
    }

    public readonly syntaxType: "DecimalLiteral" = "DecimalLiteral";
    public constructor(public value: Decie) {
        super();
    }

    public render<T extends IPushable>(pushable: T): T {
        pushable.push(this.value.toString());
        return pushable;
    }

    public toString() {
        return this.value.toString();
    }
}

export class DoubleLiteral extends NumericLiteral<"DoubleLiteral"> {
    public static parse(tokens: string[], usedTokens: number): [DoubleLiteral, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (!tokens[tail]) {
            throw new XPathUnexpectedTokenError(tokens, tail, "DoubleLiteral");
        }
        const matches: string[] = [];
        if (/^[0-9]+$/.test(tokens[tail])) {
            matches.push(tokens[tail++]);
        }
        if (tokens[tail] === ".") {
            if (!tokens[tail + 1] || !/^[0-9]+$/.test(tokens[tail + 1])) {
                throw new XPathUnexpectedTokenError(tokens, tail, "DoubleLiteral");
            }
            matches.push("." + tokens[tail + 1]);
            tail += 2;
        }
        if (matches.length === 0 && /^[0-9]*\.[0-9]+$/.test(tokens[tail])) {
            matches.push(tokens[tail++]);
        }
        if (matches.length === 0) {
            throw new XPathUnexpectedTokenError(tokens, tail, "DoubleLiteral");
        }
        if (tokens[tail] === "E" || tokens[tail] === "e") {
            matches.push(tokens[tail++]);
            if (tokens[tail] === "+" || tokens[tail] === "-") {
                matches.push(tokens[tail++]);
            }
            if (!/^[0-9]+$/.test(tokens[tail])) {
                throw new XPathUnexpectedTokenError(tokens, tail, "DoubleLiteral");
            }
            matches.push(tokens[tail++]);
        }
        return [new DoubleLiteral(parseFloat(matches.join(""))), tail];
    }

    public readonly syntaxType: "DoubleLiteral" = "DoubleLiteral";
    public constructor(public value: number) {
        super();
    }

    public render<T extends IPushable>(pushable: T): T {
        pushable.push(this.value.toExponential());
        return pushable;
    }

    public toString() {
        return this.value.toExponential();
    }
}

export class IntegerLiteral extends NumericLiteral<"IntegerLiteral"> {
    public static parse(tokens: string[], usedTokens: number): [IntegerLiteral, number] {
        const tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (!tokens[tail]) {
            throw new XPathUnexpectedTokenError(tokens, tail, "IntegerLiteral");
        }
        if (/^[0-9]+$/.test(tokens[tail])) {
            return [new IntegerLiteral(new Biggie(tokens[tail])), tail + 1];
        }
        throw new XPathUnexpectedTokenError(tokens, tail, "IntegerLiteral");
    }

    public readonly syntaxType: "IntegerLiteral" = "IntegerLiteral";
    public constructor(public value: IBiggie) {
        super();
    }

    public render<T extends IPushable>(pushable: T): T {
        pushable.push(this.value.toString());
        return pushable;
    }

    public toString() {
        return this.value.toString();
    }
}

export class StringLiteral implements IXPathGrammar<"StringLiteral"> {
    public static parse(tokens: string[], usedTokens: number, defToken: string = ":="): [StringLiteral, number] {
        const tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] !== "'" && tokens[tail] !== "\"") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'\\'' | '\"'");
        }
        if (tokens[tail] !== tokens[tail + 2]) {
            throw new XPathUnexpectedTokenError(tokens, tail + 2, "end of string literal");
        }
        return [new StringLiteral(tokens[tail] as "\"" | "'", tokens[tail + 1]), tail + 3];
    }

    public readonly syntaxType: "StringLiteral" = "StringLiteral";
    public constructor(public wrapperToken: "\"" | "'", public value: string) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push(
            this.wrapperToken,
            this.value.replace(new RegExp(this.wrapperToken, "g"), "$0$0"),
            this.wrapperToken,
        );
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}
