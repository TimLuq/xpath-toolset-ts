
import {
    AdditiveExpr, AndExpr, ArgumentPlaceholder, ArrowExpr, ArrowFunctionExpr,
    Expr, LetExpr, ParenthesizedExpr, SimpleBinding, TComparisonExpr,
    TEQName, TExprSingle, TMultiplicativeExpr,
    TUnaryExpr, TXPathGrammar, VarRef,
} from "./xpath-ast";

export function astTreeVisit(
    ast: TXPathGrammar,
    f: <T>(ast: TXPathGrammar, parentType: string | undefined) => TXPathGrammar | T,
    parentType?: string,
    lazy?: boolean,
): TXPathGrammar {
    if (ast.syntaxType === "Expr") {
        const r: TExprSingle[] = [];
        let ed = false;
        for (const e of ast.expressions) {
            const ir = astTreeVisit(e, f, ast.syntaxType);
            r.push(ir as TExprSingle);
            if (ir !== e) {
                ed = true;
            }
        }
        if (ed) {
            ast = new Expr(r);
        }
    } else if (ast.syntaxType === "LetExpr") {
        let ed = false;
        const bs: SimpleBinding[] = [];
        for (const b of ast.bindings) {
            const ir = astTreeVisit(b, f, ast.syntaxType);
            bs.push(ir as SimpleBinding);
            if (ir !== b) {
                ed = true;
            }
        }
        const x = ast.expression;
        const r = lazy ? x : astTreeVisit(x, f, ast.syntaxType);
        if (ed || x !== r) {
            ast = new LetExpr(bs, r as TExprSingle);
        }
    } else if (ast.syntaxType === "AdditiveExpr") {
        let ed = false;
        const fst = astTreeVisit(ast.first, f, ast.syntaxType);
        const rest: Array<["+" | "-", TMultiplicativeExpr]> = [];
        for (const re of ast.rest) {
            const ir = astTreeVisit(re[1], f, ast.syntaxType);
            if (ir !== re[1]) {
                rest.push([re[0], ir as TMultiplicativeExpr]);
                ed = true;
            } else {
                rest.push(re);
            }
        }
        if (ed || fst !== ast.first) {
            ast = new AdditiveExpr(fst as TMultiplicativeExpr, rest);
        }
    } else if (ast.syntaxType === "AndExpr") {
        let ed = false;
        const fst = astTreeVisit(ast.first, f, ast.syntaxType);
        const rest: Array<["and", TComparisonExpr]> = [];
        for (const re of ast.rest) {
            const ir = astTreeVisit(re[1], f, ast.syntaxType);
            if (ir !== re[1]) {
                rest.push([re[0], ir as TComparisonExpr]);
                ed = true;
            } else {
                rest.push(re);
            }
        }
        if (ed || fst !== ast.first) {
            ast = new AndExpr(fst as TComparisonExpr, rest);
        }
    } else if (ast.syntaxType === "ArrowExpr") {
        let ed = false;
        const fst = astTreeVisit(ast.first, f, ast.syntaxType);
        const rest: Array<["=>", ArrowFunctionExpr]> = [];
        for (const re of ast.rest) {
            const ir = astTreeVisit(re[1], f, ast.syntaxType);
            if (ir !== re[1]) {
                rest.push([re[0], ir as ArrowFunctionExpr]);
                ed = true;
            } else {
                rest.push(re);
            }
        }
        if (ed || fst !== ast.first) {
            ast = new ArrowExpr(fst as TUnaryExpr, rest);
        }
    } else if (ast.syntaxType === "ArrowFunctionExpr") {
        let ed = false;
        const fst = astTreeVisit(ast.specifier, f, ast.syntaxType);
        const rest: Array<TExprSingle | ArgumentPlaceholder> = [];
        for (const re of ast.argList) {
            const ir = astTreeVisit(re, f, ast.syntaxType);
            rest.push(ir as TExprSingle | ArgumentPlaceholder);
            if (ir !== re) {
                ed = true;
            }
        }
        if (ed || fst !== ast.specifier) {
            ast = new ArrowFunctionExpr(fst as TEQName | VarRef | ParenthesizedExpr, rest);
        }
    }
    if (ast.syntaxType) {
        return f(ast, parentType);
    }
    return ast;
}
