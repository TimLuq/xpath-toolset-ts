import { Expr } from "./xpath-ast";
import { XPathParseError } from "./xpath-ast-patterns";
import { tokenize } from "./xpath-ast-tokenize";

export function parse(tokens: string[] | string) {
    tokens = typeof tokens === "string" ? tokenize(tokens) : tokens;
    return Expr.parse(tokens, 0);
}

export function parseAll(tokens: string[] | string) {
    tokens = typeof tokens === "string" ? tokenize(tokens) : tokens;
    const r = Expr.parse(tokens, 0);
    let i = r[1];
    while (tokens[i] === " ") {
        i++;
    }
    if (tokens.length !== i) {
        const e = new XPathParseError(
            "trailing-tokens", "Unable to parse all tokens, expected EOF but found trailing tokens", tokens, i,
        );
        (e as any).code = 51;
        throw e;
    }
    return r[0];
}
