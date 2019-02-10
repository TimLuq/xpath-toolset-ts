import * as ast from "./xpath-ast";

import { parse, parseAll } from "./xpath-ast-parse";
import { tokenize } from "./xpath-ast-tokenize";
import { astTreeVisit } from "./xpath-ast-walker";

export const XPathAST = {
    astTreeVisit,
    parse,
    parseAll,
    tokenize,
};

export default ast;
export * from "./xpath-ast";
