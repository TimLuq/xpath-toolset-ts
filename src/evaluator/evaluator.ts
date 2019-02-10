import { Result } from "../results/result";
import { Expression, StringExpression } from "./expression";
import { Resolver } from "./resolver";

export class Evaluator implements XPathEvaluator {
    public createExpression(expression: string, resolver?: XPathNSResolver | null): Expression {
        return new StringExpression(expression, resolver || new Resolver());
    }
    public createNSResolver(nodeResolver?: Node | undefined): Resolver {
        return new Resolver(nodeResolver);
    }
    public evaluate(
        expression: string, contextNode: Node,
        resolver?: XPathNSResolver | ((prefix: string) => string | null) | null,
        type?: number,
        result?: XPathResult | null,
    ): Result {
        if (!resolver || typeof resolver === "function") {
            resolver = new Resolver(resolver);
        }
        const expr = this.createExpression(expression, resolver);
        return expr.evaluate(contextNode, type, result);
    }
}
