import { TItemType, TXPathGrammar, ParenthesizedItemType, BracedURILiteral, URIQualifiedName } from "./xpath-ast";

export function getType(ast: TXPathGrammar): TItemType | undefined {
    if (ast.syntaxType === "Expr") {
        return undefined; // TODO
    }
    if (ast.syntaxType === "StringLiteral") {

    }
}