import { BracedURILiteral, NCName, TItemType, URIQualifiedName } from "../ast/xpath-ast";

const defNs = new BracedURILiteral(""); // TODO
const xsString = new URIQualifiedName(defNs, new NCName(""));

export function commonType(a: TItemType, b: TItemType): TItemType | undefined {
    // TODO
}
