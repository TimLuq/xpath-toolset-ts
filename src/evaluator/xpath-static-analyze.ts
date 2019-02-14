import { Context } from "vm";
import { TXPathGrammar, FunctionCall, URIQualifiedName, BracedURILiteral, NCName } from "../ast/ast";
import { defaultFnNamespace } from "../functions/common";
import { getType } from "../ast/xpath-ast-gettype";

const defNs = new BracedURILiteral(defaultFnNamespace);
const concat = new URIQualifiedName(defNs, new NCName("concat"));

/**
 * Optimize AST and find static errors.
 *
 * @param context the static context
 * @param ast ast to analyze
 * @param parentType
 */
export function staticAnalyze(context: Context, ast: TXPathGrammar, parentType?: string): TXPathGrammar {
    if (ast.syntaxType === "StringConcatExpr") {
        return new FunctionCall(concat, [ast.first, ...ast.rest.map(([_, x]) => x)]);
    }
    // TODO
    return ast;
}
