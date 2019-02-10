// tslint:disable:max-classes-per-file

import { Expr, XPathAST, StringLiteral, IntegerLiteral, DoubleLiteral, ParenthesizedExpr } from "../ast/ast";
import { XPathFunction, XPathFunctionValue } from "../functions/common";
import { Result } from "../results/xpath-result";
import { Context } from "./context";
import { evaluateAst } from "./xpath-evaluate";
import { Biggie } from "../helpers/biggie";

export abstract class Expression implements XPathExpression {
    protected readonly context: Context;
    public constructor(protected ast: Expr, protected resolver: XPathNSResolver) {
        this.context = new Context(resolver);
    }

    public evaluate(contextNode: Node, type?: number, result?: XPathResult | null): Result {
        const r = XPathAST.astTreeVisit(
            this.ast,
            (ast, parent) => evaluateAst(this.context, ast, parent),
            undefined,
            true,
        );
        return Result.wrap(r as XPathFunctionValue, type, result && result instanceof Result ? result : undefined);
    }

    public defineFunctions(namespaceURI: string, functions: Iterable<[string, XPathFunction]>): this {
        for (const [name, func] of functions) {
            this.context.defineFunction(namespaceURI, name, func);
        }
        return this;
    }

    public defineVariables(
        namespaceURI: string,
        vars: Iterable<[string, string | number | bigint | XPathFunctionValue]>,
    ): this {
        for (const [name, val] of vars) {
            this.context.defineVariable(namespaceURI, name,
                typeof val === "string" ? new StringLiteral("'", val) :
                typeof val === "number" ? Number.isInteger(val) ?
                    new IntegerLiteral(new Biggie(val)) : new DoubleLiteral(val) :
                typeof val === "bigint" ? new IntegerLiteral(new Biggie(val)) :
                val,
            );
        }
        return this;
    }

}

export class StringExpression extends Expression {
    public constructor(protected expression: string, protected resolver: XPathNSResolver) {
        super(XPathAST.parseAll(expression), resolver);
    }
}
