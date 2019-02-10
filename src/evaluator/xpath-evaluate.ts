import { Context } from "vm";
import { TXPathGrammar } from "../ast/ast";

export function evaluateAst(context: Context, ast: TXPathGrammar, parentType?: string): TXPathGrammar {
    // TODO
    throw new Error("Unable to evaluate " + parentType + "/" + ast.syntaxType + ": " + JSON.stringify(ast));
}
