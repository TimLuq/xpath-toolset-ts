// tslint:disable:max-classes-per-file

import {
    IPushable, IXPathGrammar,

    MultiOperativeExpr, SingleOperativeExpr,
    XPathParseError, XPathUnexpectedTokenError, FollowingUnaryOpExpr, ChainOperativeExpr, LeadingUnaryOpExpr,
} from "./xpath-ast-patterns";
import { Decie } from "../helpers/decie";
import { Biggie, IBiggie } from "../helpers/biggie";

class Expr implements IXPathGrammar {
    public static parse(tokens: string[], usedTokens: number): [Expr, number] {
        const r: ExprSingle[] = [];
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        do {
            const [e, t] = ExprSingle.parse(tokens, tail);
            r.push(e);
            tail = tokens[t] === " " ? t + 1 : t;
        } while (tokens[tail] === "," && tail++);
        return [new Expr(r), tail];
    }

    public constructor(public expressions: ExprSingle[]) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        let fst = true;
        for (const i of this.expressions) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",");
            }
            i.render(pushable);
        }
        return pushable;
    }
    public toString() {
        return this.expressions.join(",");
    }
}

/**
 * @abstract
 */
abstract class ExprSingle implements IXPathGrammar {
    public static parse(tokens: string[], usedTokens: number): [ExprSingle, number] {
        const tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        const t = tokens[tail];
        if (t === "for") {
            return ForExpr.parse(tokens, tail);
        } else if (t === "let") {
            return LetExpr.parse(tokens, tail);
        } else if (t === "some" || t === "every") {
            return QuantifiedExpr.parse(tokens, tail);
        } else if (t === "if") {
            return IfExpr.parse(tokens, tail);
        } else if (t === undefined) {
            throw new XPathParseError("parse", "expected single expressions token but no token found");
        } else {
            return OrExpr.parse(tokens, tail);
        }
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public abstract render<T extends IPushable>(pushable: T): T;

    public toString() {
        return this.render([]).join("");
    }
}

class ForExpr extends ExprSingle {
    public static parse(tokens: string[], usedTokens: number): [ForExpr, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space

        if (tokens[tail] !== "for") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'for'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const r: SimpleBinding[] = [];
        do {
            const [e, t] = SimpleBinding.parse(tokens, tail);
            r.push(e);
            tail = tokens[t] === " " ? t + 1 : t; // allow space
        } while (tokens[tail] === "," && tail++);

        if (tokens[tail] !== "return") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'return'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        {
            const [e, t] = ExprSingle.parse(tokens, tail);
            return [new ForExpr(r, e), t];
        }
    }

    public constructor(public bindings: SimpleBinding[], public expression: ExprSingle) {
        super();
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        let fst = true;
        pushable.push("for", " ");
        for (const i of this.bindings) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",");
            }
            i.render(pushable);
        }
        pushable.push(" ", "return", " ");
        this.expression.render(pushable);
        return pushable;
    }
}

class LetExpr extends ExprSingle {
    public static parse(tokens: string[], usedTokens: number): [LetExpr, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space

        if (tokens[tail] !== "let") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'let'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const r: SimpleBinding[] = [];
        do {
            const [e, t] = SimpleBinding.parse(tokens, tail);
            r.push(e);
            tail = tokens[t] === " " ? t + 1 : t;
        } while (tokens[tail] === "," && tail++);

        if (tokens[tail] !== "return") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'return'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        {
            const [e, t] = ExprSingle.parse(tokens, tail);
            return [new LetExpr(r, e), t];
        }
    }

    public constructor(public bindings: SimpleBinding[], public expression: ExprSingle) {
        super();
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        let fst = true;
        pushable.push("let", " ");
        for (const i of this.bindings) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",");
            }
            i.render(pushable);
        }
        pushable.push(" ", "return", " ");
        this.expression.render(pushable);
        return pushable;
    }
}

class QuantifiedExpr extends ExprSingle {
    public static parse(tokens: string[], usedTokens: number): [QuantifiedExpr, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space

        const q = tokens[tail];
        if (q !== "some" && q !== "every") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'some' | 'every'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const r: SimpleBinding[] = [];
        do {
            const [e, t] = SimpleBinding.parse(tokens, tail, "in");
            r.push(e);
            tail = tokens[t] === " " ? t + 1 : t; // allow space
        } while (tokens[tail] === "," && tail++);

        if (tokens[tail] !== "satisfies") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'satisfies'");
        }

        {
            const [e, t] = ExprSingle.parse(tokens, tail);
            return [new QuantifiedExpr(q, r, e), t];
        }
    }

    public constructor(
        public quantification: "some" | "every",
        public bindings: SimpleBinding[],
        public expression: ExprSingle,
    ) {
        super();
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        let fst = true;
        pushable.push(this.quantification, " ");
        for (const i of this.bindings) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",");
            }
            i.render(pushable);
        }
        pushable.push(" ", "satisfies", " ");
        this.expression.render(pushable);
        return pushable;
    }
}

class IfExpr extends ExprSingle {
    public static parse(tokens: string[], usedTokens: number): [IfExpr, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space

        if (tokens[tail] !== "if") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'if'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'('");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [condition, ct] = Expr.parse(tokens, tail);
        tail = tokens[ct] === " " ? ct + 1 : ct; // allow space

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "then") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'then'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [thenExpr, tt] = Expr.parse(tokens, tail);
        tail = tokens[tt] === " " ? tt + 1 : tt; // allow space

        if (tokens[tail] !== "else") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'else'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [elseExpr, et] = Expr.parse(tokens, tail);
        tail = tokens[et] === " " ? et + 1 : et; // allow space

        return [new IfExpr(condition, thenExpr, elseExpr), tail];
    }

    public constructor(
        public condition: Expr,
        public thenExpr: ExprSingle,
        public elseExpr: ExprSingle,
    ) {
        super();
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push("if", " ", "(");
        this.condition.render(pushable);
        pushable.push(")", " ", "then", " ");
        this.thenExpr.render(pushable);
        pushable.push(" ", "else", " ");
        this.elseExpr.render(pushable);
        return pushable;
    }
}

type TOrExpr = OrExpr | TAndExpr;
class OrExpr extends MultiOperativeExpr<TAndExpr, "or"> {
    public static operators: ["or"] = ["or"];
    public static parse(tokens: string[], usedTokens: number): [TOrExpr, number] {
        const r = MultiOperativeExpr.parseOp<TAndExpr, "or">(OrExpr, AndExpr, tokens, usedTokens);
        if (r[0].rest) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

type TAndExpr = AndExpr | TComparisonExpr;
class AndExpr extends MultiOperativeExpr<TComparisonExpr, "and"> {
    public static operators: ["and"] = ["and"];
    public static parse(tokens: string[], usedTokens: number): [TAndExpr, number] {
        const r = MultiOperativeExpr.parseOp<TComparisonExpr, "and">(
            AndExpr, ComparisonExpr, tokens, usedTokens,
        );
        if (r[0].rest) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

type TComparisonExpr = ComparisonExpr | TStringConcatExpr;
class ComparisonExpr implements IXPathGrammar {
    public static comparators = [
        // ValueComp
        "eq", "ne", "lt", "le", "gt", "ge",

        // GeneralComp
        "=", "!=", "<", "<=", ">", ">=",

        // NodeComp
        "is", "<<", ">>",
    ];
    public static parse(tokens: string[], usedTokens: number): [TComparisonExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        const [l, lt] = StringConcatExpr.parse(tokens, tail);
        tail = tokens[lt] === " " ? lt + 1 : lt; // allow space

        if (ComparisonExpr.comparators.indexOf(tokens[tail]) === -1) {
            return [l, tail];
        }

        const o = tokens[tail];
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [r, rt] = StringConcatExpr.parse(tokens, tail);
        tail = tokens[rt] === " " ? rt + 1 : rt; // allow space

        return [new ComparisonExpr(l, o, r), tail];
    }

    public get isComparison() {
        return Boolean(this.operator && this.right);
    }

    public constructor(
        public left: TStringConcatExpr,
        public operator: string,
        public right: TStringConcatExpr,
    ) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        this.left.render(pushable);
        if (this.operator && this.right) {
            pushable.push(" ", this.operator, " ");
            this.right.render(pushable);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

type TStringConcatExpr = StringConcatExpr | TRangeExpr;
class StringConcatExpr extends MultiOperativeExpr<TRangeExpr, "||"> {
    public static operators: ["||"] = ["||"];
    public static parse(tokens: string[], usedTokens: number): [TStringConcatExpr, number] {
        const r = MultiOperativeExpr.parseOp<TRangeExpr, "||">(StringConcatExpr, RangeExpr, tokens, usedTokens);
        if (r[0].rest) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

type TRangeExpr = RangeExpr | TAdditiveExpr;
class RangeExpr extends SingleOperativeExpr<TAdditiveExpr, TAdditiveExpr> {
    public static readonly operator = ["to"];
    public static parse(tokens: string[], usedTokens: number): [TRangeExpr, number] {
        const r = SingleOperativeExpr.parseSingleOp<TAdditiveExpr, TAdditiveExpr>(RangeExpr, tokens, usedTokens);
        if (r[0].right) {
            return r;
        }
        return [r[0].first, r[1]];
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return AdditiveExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return AdditiveExpr.parse(tokens, usedTokens);
    }
}

type TAdditiveExpr = AdditiveExpr | TMultiplicativeExpr;
class AdditiveExpr extends MultiOperativeExpr<TMultiplicativeExpr, "+" | "-"> {
    public static readonly operators: ["+", "-"] = ["+", "-"];
    public static parse(tokens: string[], usedTokens: number): [TAdditiveExpr, number] {
        const r = super.parseOp<TMultiplicativeExpr, "+" | "-">(
            AdditiveExpr, MultiplicativeExpr, tokens, usedTokens,
        );
        if (r[0].rest.length) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

type TMultiplicativeExpr = MultiplicativeExpr | TUnionExpr;
class MultiplicativeExpr extends MultiOperativeExpr<TUnionExpr, "*" | "div" | "idiv" | "mod"> {
    public static readonly operators: ["*", "div", "idiv", "mod"] = ["*", "div", "idiv", "mod"];
    public static parse(tokens: string[], usedTokens: number): [TMultiplicativeExpr, number] {
        const r = super.parseOp<TUnionExpr, "*" | "div" | "idiv" | "mod">(
            MultiplicativeExpr, UnionExpr, tokens, usedTokens,
        );
        if (r[0].rest.length) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

type TUnionExpr = UnionExpr | TIntersectExceptExpr;
class UnionExpr extends MultiOperativeExpr<TIntersectExceptExpr, "union" | "|"> {
    public static readonly operators: ["union", "|"] = ["union", "|"];
    public static parse(tokens: string[], usedTokens: number): [TUnionExpr, number] {
        const r = super.parseOp<TIntersectExceptExpr, "union" | "|">(
            UnionExpr, IntersectExceptExpr, tokens, usedTokens,
        );
        if (r[0].rest.length) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

type TIntersectExceptExpr = IntersectExceptExpr | TInstanceofExpr;
class IntersectExceptExpr extends MultiOperativeExpr<TInstanceofExpr, "union" | "|"> {
    public static readonly operators: ["union", "|"] = ["union", "|"];
    public static parse(tokens: string[], usedTokens: number): [TIntersectExceptExpr, number] {
        const r = super.parseOp<TInstanceofExpr, "union" | "|">(
            IntersectExceptExpr, InstanceofExpr, tokens, usedTokens);
        if (r[0].rest.length) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

type TInstanceofExpr = InstanceofExpr | TTreatExpr;
class InstanceofExpr extends SingleOperativeExpr<TTreatExpr, SequenceType> {
    public static readonly operator = ["instance", "of"];
    public static parse(tokens: string[], usedTokens: number): [TInstanceofExpr, number] {
        const r = SingleOperativeExpr.parseSingleOp<TTreatExpr, SequenceType>(InstanceofExpr, tokens, usedTokens);
        if (r[0].right) {
            return r;
        }
        return [r[0].first, r[1]];
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return TreatExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return SequenceType.parse(tokens, usedTokens);
    }
}

type TTreatExpr = TreatExpr | TCastableExpr;
class TreatExpr extends SingleOperativeExpr<TCastableExpr, SequenceType> {
    public static readonly operator = ["treat", "as"];
    public static parse(tokens: string[], usedTokens: number): [TTreatExpr, number] {
        const r = SingleOperativeExpr.parseSingleOp<TCastableExpr, SequenceType>(TreatExpr, tokens, usedTokens);
        if (r[0].right) {
            return r;
        }
        return [r[0].first, r[1]];
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return CastableExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return SequenceType.parse(tokens, usedTokens);
    }
}

type TCastableExpr = CastableExpr | TCastExpr;
class CastableExpr extends SingleOperativeExpr<TCastExpr, SingleType> {
    public static readonly operator = ["castable", "as"];
    public static parse(tokens: string[], usedTokens: number): [TCastableExpr, number] {
        const r = SingleOperativeExpr.parseSingleOp<TCastExpr, SingleType>(CastableExpr, tokens, usedTokens);
        if (r[0].right) {
            return r;
        }
        return [r[0].first, r[1]];
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return CastableExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return SingleType.parse(tokens, usedTokens);
    }
}

class SingleType extends FollowingUnaryOpExpr<EQName, "?"> {
    public static readonly operator: "?" = "?";
    public static parse(tokens: string[], usedTokens: number): [SingleType, number] {
        return FollowingUnaryOpExpr.parseFollowing<EQName, "?">(SingleType, EQName, tokens, usedTokens);
    }
}

type TCastExpr = CastExpr | TArrowExpr;
class CastExpr extends SingleOperativeExpr<TArrowExpr, SingleType> {
    public static readonly operator = ["cast", "as"];
    public static parse(tokens: string[], usedTokens: number): [TCastExpr, number] {
        const r = SingleOperativeExpr.parseSingleOp<TArrowExpr, SingleType>(CastExpr, tokens, usedTokens);
        if (r[0].right) {
            return r;
        }
        return [r[0].first, r[1]];
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return ArrowExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return SingleType.parse(tokens, usedTokens);
    }
}

type TArrowExpr = ArrowExpr | TUnaryExpr;
class ArrowExpr extends ChainOperativeExpr<TUnaryExpr, "=>", ArrowFunctionExpr> {
    public static readonly operators: ["=>"] = ["=>"];
    public static parse(tokens: string[], usedTokens: number): [TCastExpr, number] {
        const r = ChainOperativeExpr.parseChain<TUnaryExpr, "=>", ArrowFunctionExpr>(
            ArrowExpr, UnaryExpr, ArrowFunctionExpr, tokens, usedTokens,
        );
        if (r[0].rest) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

class ArgumentPlaceholder implements IXPathGrammar {

    public static readonly placeholder = new ArgumentPlaceholder();
    public static parse(tokens: string[], usedTokens: number): [ArgumentPlaceholder, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "?") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'?' of ArgumentPlaceholder");
        }
        return [ArgumentPlaceholder.placeholder, tail + 1];
    }

    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("?");
        return pushable;
    }

    public toString() { return "?"; }
}

class ContextItemExpr implements IXPathGrammar {

    public static readonly instance = new ContextItemExpr();
    public static parse(tokens: string[], usedTokens: number): [ContextItemExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== ".") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'.' of ContextItemExpr");
        }
        return [ContextItemExpr.instance, tail + 1];
    }

    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push(".");
        return pushable;
    }

    public toString() { return "."; }
}

class Wildcard implements IXPathGrammar {

    public static readonly instance = new Wildcard();
    public static parse(tokens: string[], usedTokens: number): [ContextItemExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "*") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'*' of Wildcard");
        }
        return [Wildcard.instance, tail + 1];
    }

    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("*");
        return pushable;
    }

    public toString() { return "*"; }
}

class EmptySequenceType implements IXPathGrammar {

    public static readonly instance = new EmptySequenceType();
    public static parse(tokens: string[], usedTokens: number): [ContextItemExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "empty-sequence" || tokens[tail + 1] !== "(" || tokens[tail + 2] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['empty-sequence', '(', ')'] of EmptySequenceType");
        }
        return [EmptySequenceType.instance, tail + 3];
    }

    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("empty-sequence", "(", ")");
        return pushable;
    }

    public toString() { return "empty-sequence()"; }
}

class EmptyItemType implements IXPathGrammar {

    public static readonly instance = new EmptyItemType();
    public static parse(tokens: string[], usedTokens: number): [ContextItemExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "item" || tokens[tail + 1] !== "(" || tokens[tail + 2] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['item', '(', ')'] of EmptyItemType");
        }
        return [EmptyItemType.instance, tail + 3];
    }

    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("item", "(", ")");
        return pushable;
    }

    public toString() { return "item()"; }
}

function parseArgumentList(tokens: string[], usedTokens: number): [Array<ExprSingle | ArgumentPlaceholder>, number] {
    let tail = usedTokens;
    tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
    if (tokens[tail] !== "(") {
        throw new XPathUnexpectedTokenError(tokens, tail, "'(' of ArgumentList");
    }
    tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
    if (tokens[tail] === ")") {
        return [[], tail + 1];
    }
    const r: Array<ExprSingle | ArgumentPlaceholder> = [];
    do {
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === "?") {
            r.push(ArgumentPlaceholder.placeholder);
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        } else {
            const [e, t] = ExprSingle.parse(tokens, tail);
            r.push(e);
            tail = tokens[t] === " " ? t + 1 : t; // allow space
        }
    } while (tokens[tail] === "," && tail++);

    return [r, tail];
}

class ParenthesizedExpr implements IXPathGrammar {

    public static parse(tokens: string[], usedTokens: number): [ParenthesizedExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of ArgumentList");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] === ")") {
            return [new ParenthesizedExpr(), tail + 1];
        }
        const [r, t] = Expr.parse(tokens, tail);
        tail = tokens[t] === " " ? t + 1 : t; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of ArgumentList");
        }
        return [new ParenthesizedExpr(r), tail + 1];
    }

    public constructor(public expr?: Expr) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("(");
        if (this.expr) {
            this.expr.render(pushable);
        }
        pushable.push(")");
        return pushable;
    }
}

type TUnaryExpr = UnaryExpr | TValueExpr;
type TValueExpr = TSimpleMapExpr;
class UnaryExpr implements IXPathGrammar {

    public static parse(tokens: string[], usedTokens: number): [ParenthesizedExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const uops: Array<"+" | "-"> = [];
        while (tokens[tail] === "-" || tokens[tail] === "+") {
            uops.push(tokens[tail] as "+" | "-");
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        }
        if (tokens[tail] === "") {
            return [new ParenthesizedExpr(), tail + 1];
        }
        const [r, t] = Expr.parse(tokens, tail);
        tail = tokens[t] === " " ? t + 1 : t; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of ArgumentList");
        }
        return [new ParenthesizedExpr(r), tail + 1];
    }

    public constructor(public expr?: Expr) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("(");
        if (this.expr) {
            this.expr.render(pushable);
        }
        pushable.push(")");
        return pushable;
    }
}

class ArrowFunctionExpr {
    public static parse(tokens: string[], usedTokens: number): [ArrowFunctionExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        let spec;
        if (tokens[tail] === "$") {
            const [e, t] = VarRef.parse(tokens, tail);
            spec = e;
            tail = t;
        } else if (tokens[tail] === "(") {
            const [e, t] = ParenthesizedExpr.parse(tokens, tail);
            spec = e;
            tail = t;
        } else {
            const [e, t] = EQName.parse(tokens, tail);
            spec = e;
            tail = t;
        }
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const [args, ft] = parseArgumentList(tokens, tail);
        return [new ArrowFunctionExpr(spec, args), ft];
    }

    public constructor(
        public specifier: EQName | VarRef | ParenthesizedExpr,
        public argList: Array<ExprSingle | ArgumentPlaceholder>,
    ) {}

    public render<T extends IPushable>(pushable: T): T {
        this.specifier.render(pushable);
        pushable.push("(");
        let fst = true;
        for (const a of this.argList) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",");
            }
            a.render(pushable);
        }
        pushable.push(")");
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

class VarRef implements IXPathGrammar {

    public static parse(tokens: string[], usedTokens: number): [VarRef, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        if (tokens[tail] !== "$") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'$'");
        }
        tail++;
        const [e, t] = EQName.parse(tokens, tail);
        return [new VarRef(e), t];
    }

    public constructor(public name: EQName) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("$");
        return this.name.render(pushable);
    }

    public toString() {
        return this.render([]).join("");
    }
}

type TSimpleMapExpr = SimpleMapExpr | TPathExpr;
class SimpleMapExpr extends MultiOperativeExpr<TPathExpr, "!"> {
    public static readonly operators: ["!"] = ["!"];
    public static parse(tokens: string[], usedTokens: number): [TSimpleMapExpr, number] {
        const r = super.parseOp<TPathExpr, "!">(
            SimpleMapExpr, PathExpr, tokens, usedTokens,
        );
        if (r[0].rest.length) {
            return r;
        }
        return [r[0].first, r[1]];
    }
}

type TPathExpr = PathExpr;
class PathExpr implements IXPathGrammar {
    public static readonly operator: ["/", "//"] = ["/", "//"];
    public static parse(tokens: string[], usedTokens: number): [TPathExpr, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        let leading: "/" | "//" | undefined;
        if (tokens[tail] === "/" || tokens[tail] === "/") {
            leading = tokens[tail] as "/" | "//";
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        }
        try {
            const [e, t] = RelativePathExpr.parse(tokens, tail);
            return [new PathExpr(leading, e), t];
        } catch (e) {
            // leading-lone-slash
            if (e instanceof XPathUnexpectedTokenError && e.token === tail && leading === "/") {
                return [new PathExpr("/"), tail];
            }
            throw e;
        }
    }

    public constructor(leading: "/");
    public constructor(leading: undefined | "/" | "//", path: RelativePathExpr);
    public constructor(public leading: undefined | "/" | "//", public path?: RelativePathExpr) {}

    public render<T extends IPushable>(pushable: T): T {
        if (this.leading) {
            pushable.push(this.leading);
        }
        if (this.path) {
            return this.path.render(pushable);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

type TRelativePathExpr = RelativePathExpr | TStepExpr;
class RelativePathExpr extends MultiOperativeExpr<TStepExpr, "/" | "//"> {
    public static readonly operators: ["/", "//"] = ["/", "//"];
    public static parse(tokens: string[], usedTokens: number): [TRelativePathExpr, number] {
        return MultiOperativeExpr.parseOp<EQName, "/" | "//">(RelativePathExpr, StepExpr, tokens, usedTokens);
    }
}

type PrimaryExpr
    = TLiteral | ParenthesizedExpr | VarRef | ContextItemExpr
    | FunctionCall | FunctionItemExpr | MapCons | ArrayCons | UnaryLookup;
type TLiteral = TNumericLiteral | StringLiteral;
type TNumericLiteral = IntegerLiteral | DecimalLiteral | DoubleLiteral;
type FunctionItemExpr = NamedFunctionRef | InlineFunctionExpr;
function parsePrimaryExpr(tokens: string[], usedTokens: number): [PrimaryExpr, number] {
    let tail = usedTokens;
    tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
    if (tokens[tail] === "(") {
        return ParenthesizedExpr.parse(tokens, tail);
    }
    if (tokens[tail] === ".") {
        const c = tokens[tail + 1] ? tokens[tail + 1].charCodeAt(0) : 0;
        if (c >= 0x30 && c <= 0x39) {
            return NumericLiteral.parse(tokens, tail);
        }
        return [ContextItemExpr.instance, tail + 1];
    }
    if (tokens[tail] === "function" && tokens[tail + 1] === "(") {
        return InlineFunctionExpr.parse(tokens, tail);
    }
    if (tokens[tail] === "$") {
        return VarRef.parse(tokens, tail);
    }
    if (tokens[tail] === "\"" || tokens[tail] === "'") {
        return StringLiteral.parse(tokens, tail);
    }
}

class InlineFunctionExpr implements IXPathGrammar {
    public static parse(tokens: string[], usedTokens: number): [InlineFunctionExpr, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] !== "function") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'function' of InlineFunctionExpr");
        }
        if (tokens[tail + 1] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['function', '('] of InlineFunctionExpr");
        }
        tail = tokens[tail + 2] === " " ? usedTokens + 3 : usedTokens + 2; // allow space
        let paramList;
        if (tokens[tail] !== ")") {
            const [e, t] = ParamList.parse(tokens, tail);
            paramList = e;
            tail = tokens[t] === " " ? t + 1 : t; // allow space
            if (tokens[tail] !== ")") {
                throw new XPathUnexpectedTokenError(tokens, tail, "')' of InlineFunctionExpr");
            }
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        let asType: undefined | SequenceType;
        if (tokens[tail] !== "as") {
            const [e, t] = SequenceType.parse(tokens, tail);
            asType = e;
            tail = tokens[t] === " " ? t + 1 : t; // allow space
        }
        const [body, bt] = EnclosedExpr.parse(tokens, tail);
        return [new InlineFunctionExpr(paramList, asType, body), bt];
    }

    public constructor(
        public paramList: ParamList | undefined, public asType: SequenceType | undefined, public body: EnclosedExpr,
    ) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push("function", "(");
        if (this.paramList) {
            this.paramList.render(pushable);
        }
        pushable.push(")", " ");
        if (this.asType) {
            pushable.push("as", " ");
            this.asType.render(pushable);
            pushable.push(" ");
        }
        return this.body.render(pushable);
    }

    public toString() {
        return this.render([]).join("");
    }
}

class ParamList extends MultiOperativeExpr<Param, ","> {
    public static operators: [","] = [","];
    public static parse(tokens: string[], usedTokens: number): [ParamList, number] {
        return MultiOperativeExpr.parseOp<Param, ",">(ParamList, Param, tokens, usedTokens);
    }
}

class Param implements IXPathGrammar {

    public static parse(tokens: string[], usedTokens: number): [Param, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        if (tokens[tail] !== "$") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'$'");
        }
        const [e, t] = EQName.parse(tokens, tail + 1);
        tail = tokens[t] === " " ? t + 1 : t; // allow space
        if (tokens[tail] !== "as") {
            return [new Param(e), t];
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        const [asType, et] = SequenceType.parse(tokens, tail);
        return [new Param(e, asType), et];
    }

    public constructor(public name: EQName, public asType?: SequenceType) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("$");
        this.name.render(pushable);
        if (this.asType) {
            pushable.push(" ", "as", " ");
            this.asType.render(pushable);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

class EnclosedExpr implements IXPathGrammar {

    public static parse(tokens: string[], usedTokens: number): [EnclosedExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        if (tokens[tail] !== "{") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'{'");
        }
        const [e, t] = Expr.parse(tokens, tail + 1);
        tail = tokens[t] === " " ? t + 1 : t; // allow space
        if (tokens[tail] !== "}") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'}'");
        }
        return [new EnclosedExpr(e), tail];
    }

    public constructor(public expression: Expr) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("{", " ");
        this.expression.render(pushable);
        pushable.push(" ", "}");
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

class SequenceType implements IXPathGrammar {
    public static parse(tokens: string[], usedTokens: number): [SequenceType, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] === "empty-sequence"
                && (tokens[tail + 1] === " " ? tokens[tail + 2] : tokens[tail + 1]) === "(") {
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
            if (tokens[tail] !== ")") {
                throw new XPathUnexpectedTokenError(tokens, tail, "')' of SequenceType");
            }
            return [new SequenceType(EmptySequenceType.instance), tail + 1];
        }
        const [e, t] = ItemType.parse(tokens, tail);
        const hasocc = tokens[t] === "?" || tokens[t] === "+" || tokens[t] === "*";
        const occ = hasocc ? tokens[t] as "?" | "*" | "+" : undefined;
        return  [new SequenceType(e, occ), hasocc ? t + 1 : t];
    }

    public constructor(
        public itemType: EmptySequenceType | TItemType, public occurrence?: "?" | "*" | "+",
    ) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        this.itemType.render(pushable);
        if (this.occurrence) {
            pushable.push(this.occurrence);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

type TItemType = EmptyItemType;
class ItemType implements IXPathGrammar {
    public static parse(tokens: string[], usedTokens: number): [TItemType, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] === "items"
                && (tokens[tail + 1] === " " ? tokens[tail + 2] : tokens[tail + 1]) === "(") {
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
            if (tokens[tail] !== ")") {
                throw new XPathUnexpectedTokenError(tokens, tail, "')' of ItemType");
            }
            return [EmptyItemType.instance, tail + 1];
        }
        const [e, t] = ItemType.parse(tokens, tail);
        const hasocc = tokens[t] === "?" || tokens[t] === "+" || tokens[t] === "*";
        const occ = hasocc ? tokens[t] as "?" | "*" | "+" : undefined;
        return  [new SequenceType(e, occ), hasocc ? t + 1 : t];
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        this.itemType.render(pushable);
        if (this.occurrence) {
            pushable.push(this.occurrence);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

abstract class NumericLiteral implements IXPathGrammar {
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

    public abstract render<T extends IPushable>(pushable: T): T;
}

class DecimalLiteral extends NumericLiteral {
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

    public constructor(public value: Decie) {
        super();
    }

    public render<T extends IPushable>(pushable: T): T {
        pushable.push(this.value.toString());
        return pushable;
    }
}

class DoubleLiteral extends NumericLiteral {
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

    public constructor(public value: number) {
        super();
    }

    public render<T extends IPushable>(pushable: T): T {
        pushable.push(this.value.toExponential());
        return pushable;
    }
}

class IntegerLiteral extends NumericLiteral {
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

    public constructor(public value: IBiggie) {
        super();
    }

    public render<T extends IPushable>(pushable: T): T {
        pushable.push(this.value.toString());
        return pushable;
    }
}

class StringLiteral implements IXPathGrammar {
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

class SimpleBinding implements IXPathGrammar {
    public static parse(tokens: string[], usedTokens: number, defToken: string = ":="): [SimpleBinding, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] !== "$") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'$'");
        }
        tail++;
        let varName: EQName;
        {
            const [e, t] = EQName.parse(tokens, tail);
            varName = e;
            tail = tokens[t] === " " ? t + 1 : t; // allow space
        }
        if (tokens[tail] !== defToken) {
            throw new XPathUnexpectedTokenError(tokens, tail, "'" + defToken + "'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        {
            const [e, t] = ExprSingle.parse(tokens, tail);
            return [new SimpleBinding(varName, e, defToken), t];
        }
    }

    public constructor(public varName: EQName, public expression: ExprSingle, public defToken: string = ":=") {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push("$");
        this.varName.render(pushable);
        pushable.push(this.defToken);
        this.expression.render(pushable);
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

abstract class EQName implements IXPathGrammar {
    public static parse(tokens: string[], usedTokens: number): [EQName, number] {
        if (tokens[usedTokens] === "Q" && tokens[usedTokens + 1] === "{") {
            return URIQualifiedName.parse(tokens, usedTokens);
        } else {
            return QName.parse(tokens, usedTokens);
        }
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public abstract render<T extends IPushable>(pushable: T): T;

    public toString() {
        return this.render([]).join("");
    }
}

class URIQualifiedName extends EQName {
    public static parse(tokens: string[], usedTokens: number): [URIQualifiedName, number] {
        if (tokens[usedTokens] !== "Q" || tokens[usedTokens + 1] !== "{"
            || (tokens[usedTokens + 2] !== "}" && tokens[usedTokens + 3] !== "}")) {
            throw new XPathUnexpectedTokenError(tokens, usedTokens, "['Q', '{', uri?, '}']");
        }
        const [uri, tail]
            = tokens[usedTokens + 2] === "}"
            ? ["", usedTokens + 3]
            : [tokens[usedTokens + 2], usedTokens + 4];
        const [e, t] = NCName.parse(tokens, tail);
        return [new URIQualifiedName(uri, e), t];
    }

    public constructor(public uri: string, public localName: NCName) {
        super();
        if (uri && (uri.indexOf("{") !== -1 || uri.indexOf("}") !== -1)) {
            throw new XPathParseError("invalid-token", "an URI for a URIQualifiedName may not contain braces");
        }
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push("Q", "{");
        if (this.uri) {
            pushable.push(this.uri);
        }
        pushable.push("}");
        this.localName.render(pushable);
        return pushable;
    }
}

class QName extends EQName {
    public static parse(tokens: string[], usedTokens: number): [QName, number] {
        const [prefix, tail] = NCName.parse(tokens, usedTokens);
        if (tokens[tail] !== ":") {
            return [new QName(null, prefix), tail];
        }
        const [e, t] = NCName.parse(tokens, tail);
        return [new QName(prefix, e), t];
    }

    public get prefixed() {
        return this.prefix !== null;
    }

    public constructor(public prefix: NCName | null, public localName: NCName) {
        super();
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        if (this.prefix) {
            this.prefix.render(pushable);
            pushable.push(":");
        }
        this.localName.render(pushable);
        return pushable;
    }
}

function nameStartChar(c: number) {
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

function nameChar(c: number) {
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

class NCName implements IXPathGrammar {
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

export class XPath {
    public static tokenize(xpath: string) {
        let i = 0;
        const l = xpath.length;
        const r: string[] = [];
        while (i !== l) {
            let c = xpath.charCodeAt(i);
            if (c === 8 || c === 10 || c === 13 || c === 32) {
                r.push(" ");
                do {
                    c = xpath.charCodeAt(++i);
                } while (c === 8 || c === 10 || c === 13 || c === 32);
                continue;
            }
            if (c === 0x21) {
                if (xpath.charCodeAt(++i) === 0x3D) {
                    r.push("!=");
                    i++;
                } else {
                    r.push("!");
                }
                continue;
            }
            if (c === 0x22 || c === 0x27) {
                let s = "";
                const ch = c === 0x22 ? "\"" : "'";
                i++;
                while (i < l) {
                    const pos = xpath.indexOf(ch, i);
                    if (pos === -1) {
                        throw new XPathParseError(
                            "tokenize-strlit", "Mismatching number of quote characters `" + ch + "`", undefined, i,
                        );
                    }
                    if (xpath.charCodeAt(pos + 1) === c) {
                        s += xpath.substring(i, pos + 1);
                        i = pos + 2;
                        continue;
                    }
                    s += xpath.substring(i, pos);
                    i = pos;
                }
                if (xpath.charCodeAt(i) !== c) {
                    throw new XPathParseError(
                        "tokenize-strlit", "Mismatching number of quote characters `" + ch + "`", undefined, i,
                    );
                }
                i++;
                r.push(ch, s, ch);
                continue;
            }
            if (c >= 0x23 && c <= 0x2D) {
                r.push(xpath.charAt(i++));
                continue;
            }
            if (c === 0x2E) {
                let s = ".";
                let n = xpath.charAt(++i);
                while (n === ".") {
                    s += n;
                    n = xpath.charAt(++i);
                }
                r.push(s);
                continue;
            }
            if (c === 0x2F) {
                let s = "/";
                let n = xpath.charAt(++i);
                while (n === "/") {
                    s += n;
                    n = xpath.charAt(++i);
                }
                r.push(s);
                continue;
            }
            if (c >= 0x30 && c <= 0x39) {
                let s = "";
                let n = xpath.charAt(i);
                while (n === ":" || n === "=") {
                    s += n;
                    n = xpath.charAt(++i);
                }
                r.push(s);
                continue;
            }
            if (c === 0x3A) {
                let s = ":";
                let n = xpath.charAt(++i);
                while (n === ":" || n === "=") {
                    s += n;
                    n = xpath.charAt(++i);
                }
                r.push(s);
                continue;
            }
            if (c === 0x3B) {
                r.push(";");
                i++;
                continue;
            }
            if (c >= 0x3C && c <= 0x3E) {
                let s = "";
                let n = xpath.charAt(i);
                while (n === "<" || n === "=" || n === ">") {
                    s += n;
                    n = xpath.charAt(++i);
                }
                r.push(s);
                continue;
            }
            if (c >= 0x3F && c <= 0x40) {
                r.push(xpath.charAt(i++));
                continue;
            }
            if (c >= 0x5C && c <= 0x60) {
                r.push(xpath.charAt(i++));
                continue;
            }
            if (c >= 0x7B && c <= 0x7E) {
                r.push(xpath.charAt(i++));
                continue;
            }
            if (nameStartChar(c)) {
                const start = i;
                while (i < l && nameChar(xpath.charCodeAt(++i))) {
                    // incr `i`
                }
                r.push(xpath.substring(start, i));
                continue;
            }
            throw new XPathParseError(
                "tokenize-unexpected", "Unexpected character with code `" + c + "`", undefined, i,
            );
        }
        return r;
    }

    public static parse(tokens: string[] | string) {
        tokens = typeof tokens === "string" ? XPath.tokenize(tokens) : tokens;
        return Expr.parse(tokens, 0);
    }
}
