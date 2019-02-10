// tslint:disable:max-classes-per-file

import {
    ChainOperativeExpr, FollowingUnaryOpExpr,
    IPushable, IXPathGrammar, IXPathParser,
    LeadingUnaryOpExpr, MultiOperativeExpr, SingleOperativeExpr,
    XPathParseError, XPathUnexpectedTokenError,
} from "./xpath-ast-patterns";

import {
    IntegerLiteral, nameChar, nameStartChar, NCName, NumericLiteral, StringLiteral, TLiteral,
} from "./xpath-literals";
export * from "./xpath-literals";

export type TXPathGrammar
    = Expr | TExprSingle | SimpleBinding | TEQName | PrimaryExpr
    | ArrowExpr | ArrowFunctionExpr | ArgumentPlaceholder;

export class Expr implements IXPathGrammar<"Expr"> {
    public static parse(tokens: string[], usedTokens: number): [Expr, number] {
        const r: TExprSingle[] = [];
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        do {
            const [e, t] = ExprSingle.parse(tokens, tail);
            r.push(e);
            tail = tokens[t] === " " ? t + 1 : t;
        } while (tokens[tail] === "," && tail++);
        return [new Expr(r), tail];
    }

    public readonly syntaxType: "Expr" = "Expr";
    public constructor(public expressions: TExprSingle[]) {}

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

export type TExprSingle = ForExpr | LetExpr | QuantifiedExpr | IfExpr | TOrExpr;
export const ExprSingle = {
    parse(tokens: string[], usedTokens: number): [TExprSingle, number] {
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
    },
};

export class ForExpr implements IXPathGrammar<"ForExpr"> {
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

    public readonly syntaxType: "ForExpr" = "ForExpr";
    public constructor(public bindings: SimpleBinding[], public expression: TExprSingle) {}

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

    public toString(): string {
        return this.render([]).join("");
    }
}

export class LetExpr implements IXPathGrammar<"LetExpr"> {
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

    public readonly syntaxType: "LetExpr" = "LetExpr";
    public constructor(public bindings: SimpleBinding[], public expression: TExprSingle) {}

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

    public toString(): string {
        return this.render([]).join("");
    }
}

export class QuantifiedExpr implements IXPathGrammar<"QuantifiedExpr"> {
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

    public readonly syntaxType: "QuantifiedExpr" = "QuantifiedExpr";
    public constructor(
        public quantification: "some" | "every",
        public bindings: SimpleBinding[],
        public expression: TExprSingle,
    ) {}

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

    public toString(): string {
        return this.render([]).join("");
    }
}

export class IfExpr implements IXPathGrammar<"IfExpr"> {
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

        const [thenExpr, tt] = ExprSingle.parse(tokens, tail);
        tail = tokens[tt] === " " ? tt + 1 : tt; // allow space

        if (tokens[tail] !== "else") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'else'");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [elseExpr, et] = ExprSingle.parse(tokens, tail);
        tail = tokens[et] === " " ? et + 1 : et; // allow space

        return [new IfExpr(condition, thenExpr, elseExpr), tail];
    }

    public readonly syntaxType: "IfExpr" = "IfExpr";
    public constructor(
        public condition: Expr,
        public thenExpr: TExprSingle,
        public elseExpr: TExprSingle,
    ) {}

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

    public toString(): string {
        return this.render([]).join("");
    }
}

export type TOrExpr = OrExpr | TAndExpr;
export class OrExpr extends MultiOperativeExpr<"OrExpr", TAndExpr, "or"> {
    public static operators: ["or"] = ["or"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TOrExpr, number] {
        return MultiOperativeExpr.parseOp<TAndExpr, "or", OrExpr>(
            OrExpr, AndExpr, tokens, usedTokens);
    }
    public readonly syntaxType = "OrExpr";
}

export type TAndExpr = AndExpr | TComparisonExpr;
export class AndExpr extends MultiOperativeExpr<"AndExpr", TComparisonExpr, "and"> {
    public static operators: ["and"] = ["and"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TAndExpr, number] {
        return MultiOperativeExpr.parseOp<TComparisonExpr, "and", AndExpr>(
            AndExpr, ComparisonExpr, tokens, usedTokens,
        );
    }
    public readonly syntaxType = "AndExpr";
}

export type TComparisonExpr = ComparisonExpr | TStringConcatExpr;
export class ComparisonExpr implements IXPathGrammar<"ComparisonExpr"> {
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

    public readonly syntaxType: "ComparisonExpr" = "ComparisonExpr";
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

export type TStringConcatExpr = StringConcatExpr | TRangeExpr;
export class StringConcatExpr extends MultiOperativeExpr<"StringConcatExpr", TRangeExpr, "||"> {
    public static operators: ["||"] = ["||"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TStringConcatExpr, number] {
        return MultiOperativeExpr.parseOp<TRangeExpr, "||", StringConcatExpr>(
            StringConcatExpr, RangeExpr, tokens, usedTokens);
    }
    public readonly syntaxType = "StringConcatExpr";
}

export type TRangeExpr = RangeExpr | TAdditiveExpr;
export class RangeExpr extends SingleOperativeExpr<"RangeExpr", TAdditiveExpr, TAdditiveExpr> {
    public static readonly operator = ["to"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TRangeExpr, number] {
        return SingleOperativeExpr.parseSingleOp<TAdditiveExpr, TAdditiveExpr, RangeExpr>(
            RangeExpr, tokens, usedTokens);
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return AdditiveExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return AdditiveExpr.parse(tokens, usedTokens);
    }
    public readonly syntaxType = "RangeExpr";
}

export type TAdditiveExpr = AdditiveExpr | TMultiplicativeExpr;
export class AdditiveExpr extends MultiOperativeExpr<"AdditiveExpr", TMultiplicativeExpr, "+" | "-"> {
    public static readonly operators: ["+", "-"] = ["+", "-"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TAdditiveExpr, number] {
        return MultiOperativeExpr.parseOp<TMultiplicativeExpr, "+" | "-", AdditiveExpr>(
            AdditiveExpr, MultiplicativeExpr, tokens, usedTokens,
        );
    }
    public readonly syntaxType = "AdditiveExpr";
}

export type TMultiplicativeExpr = MultiplicativeExpr | TUnionExpr;
export class MultiplicativeExpr extends MultiOperativeExpr<
    "MultiplicativeExpr", TUnionExpr, "*" | "div" | "idiv" | "mod"
> {
    public static readonly operators: ["*", "div", "idiv", "mod"] = ["*", "div", "idiv", "mod"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TMultiplicativeExpr, number] {
        return MultiOperativeExpr.parseOp<TUnionExpr, "*" | "div" | "idiv" | "mod", MultiplicativeExpr>(
            MultiplicativeExpr, UnionExpr, tokens, usedTokens,
        );
    }
    public readonly syntaxType = "MultiplicativeExpr";
}

export type TUnionExpr = UnionExpr | TIntersectExceptExpr;
export class UnionExpr extends MultiOperativeExpr<"UnionExpr", TIntersectExceptExpr, "union" | "|"> {
    public static readonly operators: ["union", "|"] = ["union", "|"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TUnionExpr, number] {
        return MultiOperativeExpr.parseOp<TIntersectExceptExpr, "union" | "|", UnionExpr>(
            UnionExpr, IntersectExceptExpr, tokens, usedTokens,
        );
    }
    public readonly syntaxType = "UnionExpr";
}

export type TIntersectExceptExpr = IntersectExceptExpr | TInstanceofExpr;
export class IntersectExceptExpr extends MultiOperativeExpr<"IntersectExceptExpr", TInstanceofExpr, "union" | "|"> {
    public static readonly operators: ["union", "|"] = ["union", "|"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TIntersectExceptExpr, number] {
        return MultiOperativeExpr.parseOp<TInstanceofExpr, "union" | "|", IntersectExceptExpr>(
            IntersectExceptExpr, InstanceofExpr, tokens, usedTokens);
    }
    public readonly syntaxType = "IntersectExceptExpr";
}

export type TInstanceofExpr = InstanceofExpr | TTreatExpr;
export class InstanceofExpr extends SingleOperativeExpr<"InstanceofExpr", TTreatExpr, SequenceType> {
    public static readonly operator = ["instance", "of"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TInstanceofExpr, number] {
        return SingleOperativeExpr.parseSingleOp<"InstanceofExpr", TTreatExpr, SequenceType>(
            InstanceofExpr, tokens, usedTokens);
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return TreatExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return SequenceType.parse(tokens, usedTokens);
    }
    public readonly syntaxType = "InstanceofExpr";
}

export type TTreatExpr = TreatExpr | TCastableExpr;
export class TreatExpr extends SingleOperativeExpr<"TreatExpr", TCastableExpr, SequenceType> {
    public static readonly operator = ["treat", "as"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TTreatExpr, number] {
        return SingleOperativeExpr.parseSingleOp<"TreatExpr", TCastableExpr, SequenceType>(
            TreatExpr, tokens, usedTokens);
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return CastableExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return SequenceType.parse(tokens, usedTokens);
    }
    public readonly syntaxType = "TreatExpr";
}

export type TCastableExpr = CastableExpr | TCastExpr;
export class CastableExpr extends SingleOperativeExpr<"CastableExpr", TCastExpr, SingleType> {
    public static readonly operator = ["castable", "as"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TCastableExpr, number] {
        return SingleOperativeExpr.parseSingleOp<"CastableExpr", TCastExpr, SingleType>(
            CastableExpr, tokens, usedTokens);
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return CastExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return SingleType.parse(tokens, usedTokens);
    }
    public readonly syntaxType = "CastableExpr";
}

export class SingleType extends FollowingUnaryOpExpr<"SingleType", TEQName, "?"> {
    public static readonly operator: "?" = "?";
    public static parse(tokens: string[], usedTokens: number): [SingleType, number] {
        return FollowingUnaryOpExpr.parseFollowing<TEQName, "?", SingleType>(SingleType, EQName, tokens, usedTokens);
    }

    public readonly syntaxType = "SingleType";
}

export type TCastExpr = CastExpr | TArrowExpr;
export class CastExpr extends SingleOperativeExpr<"CastExpr", TArrowExpr, SingleType> {
    public static readonly operator = ["cast", "as"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TCastExpr, number] {
        return SingleOperativeExpr.parseSingleOp<"CastExpr", TArrowExpr, SingleType>(CastExpr, tokens, usedTokens);
    }

    public static parseLeft(tokens: string[], usedTokens: number) {
        return ArrowExpr.parse(tokens, usedTokens);
    }
    public static parseRight(tokens: string[], usedTokens: number) {
        return SingleType.parse(tokens, usedTokens);
    }

    public readonly syntaxType = "CastExpr";
}

export type TArrowExpr = ArrowExpr | TUnaryExpr;
export class ArrowExpr extends ChainOperativeExpr<"ArrowExpr", TUnaryExpr, "=>", ArrowFunctionExpr> {
    public static readonly operators: ["=>"] = ["=>"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TArrowExpr, number] {
        return ChainOperativeExpr.parseChain<TUnaryExpr, "=>", ArrowFunctionExpr, ArrowExpr>(
            ArrowExpr, UnaryExpr, ArrowFunctionExpr, tokens, usedTokens,
        );
    }
    public readonly syntaxType = "ArrowExpr";
}

export class ArgumentPlaceholder implements IXPathGrammar<"ArgumentPlaceholder"> {

    public static readonly placeholder = new ArgumentPlaceholder();
    public static parse(tokens: string[], usedTokens: number): [ArgumentPlaceholder, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "?") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'?' of ArgumentPlaceholder");
        }
        return [ArgumentPlaceholder.placeholder, tail + 1];
    }

    public readonly syntaxType = "ArgumentPlaceholder";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("?");
        return pushable;
    }

    public toString() { return "?"; }
}

export class ContextItemExpr implements IXPathGrammar<"ContextItemExpr"> {

    public static readonly instance = new ContextItemExpr();
    public static parse(tokens: string[], usedTokens: number): [ContextItemExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== ".") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'.' of ContextItemExpr");
        }
        return [ContextItemExpr.instance, tail + 1];
    }

    public readonly syntaxType = "ContextItemExpr";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push(".");
        return pushable;
    }

    public toString() { return "."; }
}

export class Wildcard implements IXPathGrammar<"Wildcard"> {

    public static readonly instance = new Wildcard();
    public static parse(tokens: string[], usedTokens: number): [Wildcard, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "*") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'*' of Wildcard");
        }
        return [Wildcard.instance, tail + 1];
    }

    public readonly syntaxType = "Wildcard";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("*");
        return pushable;
    }

    public toString() { return "*"; }
}

export class EmptySequenceType implements IXPathGrammar<"EmptySequenceType"> {

    public static readonly instance = new EmptySequenceType();
    public static parse(tokens: string[], usedTokens: number): [EmptySequenceType, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "empty-sequence") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['empty-sequence', '(', ')'] of EmptySequenceType");
        }
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail ] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['(', ')'] of EmptyItemType");
        }
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of EmptyItemType");
        }
        return [EmptySequenceType.instance, tail + 1];
    }

    public readonly syntaxType = "EmptySequenceType";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("empty-sequence", "(", ")");
        return pushable;
    }

    public toString() { return "empty-sequence()"; }
}

export class EmptyItemType implements IXPathGrammar<"EmptyItemType"> {

    public static readonly instance = new EmptyItemType();
    public static parse(tokens: string[], usedTokens: number): [EmptyItemType, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "item") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['item', '(', ')'] of EmptyItemType");
        }
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail ] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['(', ')'] of EmptyItemType");
        }
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of EmptyItemType");
        }
        return [EmptyItemType.instance, tail + 1];
    }

    public readonly syntaxType = "EmptyItemType";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("item", "(", ")");
        return pushable;
    }

    public toString() { return "item()"; }
}

export class AnyKindTest implements IXPathGrammar<"AnyKindTest"> {

    public static readonly instance = new AnyKindTest();
    public static parse(tokens: string[], usedTokens: number): [AnyKindTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const t0 = tail;
        if (tokens[tail] !== "node") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['node', '(', ')'] of AnyKindTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['(', ')'] of AnyKindTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of AnyKindTest");
        }
        return [AnyKindTest.instance, tail + 1];
    }

    public readonly syntaxType = "AnyKindTest";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("node", "(", ")");
        return pushable;
    }

    public toString() { return "node()"; }
}

export class TextTest implements IXPathGrammar<"TextTest"> {

    public static readonly instance = new TextTest();
    public static parse(tokens: string[], usedTokens: number): [TextTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "text") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['text', '(', ')'] of TextTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['(', ')'] of TextTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of TextTest");
        }
        return [TextTest.instance, tail + 1];
    }

    public readonly syntaxType = "TextTest";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("text", "(", ")");
        return pushable;
    }

    public toString() { return "text()"; }
}

export class NamespaceNodeTest implements IXPathGrammar<"NamespaceNodeTest"> {

    public static readonly instance = new NamespaceNodeTest();
    public static parse(tokens: string[], usedTokens: number): [NamespaceNodeTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "namespace-node") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['namespace-node', '(', ')'] of NamespaceNodeTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['(', ')'] of NamespaceNodeTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of NamespaceNodeTest");
        }
        return [NamespaceNodeTest.instance, tail + 1];
    }

    public readonly syntaxType = "NamespaceNodeTest";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("namespace-node", "(", ")");
        return pushable;
    }

    public toString() { return "namespace-node()"; }
}

export class CommentTest implements IXPathGrammar<"CommentTest"> {

    public static readonly instance = new CommentTest();
    public static parse(tokens: string[], usedTokens: number): [CommentTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "comment") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['comment', '(', ')'] of CommentTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['(', ')'] of CommentTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of CommentTest");
        }
        return [CommentTest.instance, tail + 1];
    }

    public readonly syntaxType = "CommentTest";
    private constructor() {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("comment", "(", ")");
        return pushable;
    }

    public toString() { return "comment()"; }
}

export class ArgumentList implements IXPathGrammar<"ArgumentList"> {
    public static parseArgumentList(
        tokens: string[], usedTokens: number,
    ): [Array<TExprSingle | ArgumentPlaceholder>, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of ArgumentList");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] === ")") {
            return [[], tail + 1];
        }
        const r: Array<TExprSingle | ArgumentPlaceholder> = [];
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

    public static parse(tokens: string[], usedTokens: number): [ArgumentList, number] {
        const [v, t] = ArgumentList.parseArgumentList(tokens, usedTokens);
        return [new ArgumentList(v), t];
    }

    public readonly syntaxType: "ArgumentList" = "ArgumentList";
    public constructor(public expressions: Array<TExprSingle | ArgumentPlaceholder>) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("(");
        let fst = true;
        for (const e of this.expressions) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",", " ");
            }
            e.render(pushable);
        }
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export class ParenthesizedExpr implements IXPathGrammar<"ParenthesizedExpr"> {

    public static parse(tokens: string[], usedTokens: number): [ParenthesizedExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of ParenthesizedExpr");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] === ")") {
            return [new ParenthesizedExpr(), tail + 1];
        }
        const [r, t] = Expr.parse(tokens, tail);
        tail = tokens[t] === " " ? t + 1 : t; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of ParenthesizedExpr");
        }
        return [new ParenthesizedExpr(r), tail + 1];
    }

    public readonly syntaxType: "ParenthesizedExpr" = "ParenthesizedExpr";
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

export type TUnaryExpr = UnaryExpr | TValueExpr;
export type TValueExpr = TSimpleMapExpr;
export class UnaryExpr implements IXPathGrammar<"UnaryExpr"> {

    public static parse(tokens: string[], usedTokens: number): [TUnaryExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const uops: Array<"+" | "-"> = [];
        while (tokens[tail] === "-" || tokens[tail] === "+") {
            uops.push(tokens[tail] as "+" | "-");
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        }
        if (uops.length === 0) {
            return SimpleMapExpr.parse(tokens, tail);
        }
        const [r, t] = SimpleMapExpr.parse(tokens, tail);
        return [new UnaryExpr(uops, r), tail + 1];
    }

    public readonly syntaxType: "UnaryExpr" = "UnaryExpr";
    public constructor(public unaryOperations: Array<"+" | "-">, public expression: TValueExpr) {}

    public render<T extends IPushable>(pushable: T): T {
        for (const op of this.unaryOperations) {
            pushable.push(op);
        }
        pushable.push("(");
        return this.expression.render(pushable);
    }
}

export class ArrowFunctionExpr implements IXPathGrammar<"ArrowFunctionExpr"> {
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
        const [args, ft] = ArgumentList.parseArgumentList(tokens, tail);
        return [new ArrowFunctionExpr(spec, args), ft];
    }

    public readonly syntaxType: "ArrowFunctionExpr" = "ArrowFunctionExpr";
    public constructor(
        public specifier: TEQName | VarRef | ParenthesizedExpr,
        public argList: Array<TExprSingle | ArgumentPlaceholder>,
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

export class VarRef implements IXPathGrammar<"VarRef"> {

    public static parse(tokens: string[], usedTokens: number): [VarRef, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        if (tokens[tail] !== "$") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'$' of VarRef");
        }
        tail++;
        const [e, t] = EQName.parse(tokens, tail);
        return [new VarRef(e), t];
    }

    public readonly syntaxType: "VarRef" = "VarRef";
    public constructor(public name: TEQName) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("$");
        return this.name.render(pushable);
    }

    public toString() {
        return this.render([]).join("");
    }
}

export type TSimpleMapExpr = SimpleMapExpr | TPathExpr;
export class SimpleMapExpr extends MultiOperativeExpr<"SimpleMapExpr", TPathExpr, "!"> {
    public static readonly operators: ["!"] = ["!"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TSimpleMapExpr, number] {
        return MultiOperativeExpr.parseOp<TPathExpr, "!", SimpleMapExpr>(
            SimpleMapExpr, PathExpr, tokens, usedTokens,
        );
    }
    public readonly syntaxType: "SimpleMapExpr" = "SimpleMapExpr";
}

export type TPathExpr = PathExpr;
export class PathExpr implements IXPathGrammar<"PathExpr"> {
    public static parse(tokens: string[], usedTokens: number): [TPathExpr, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        let leading: "/" | "//" | undefined;
        if (tokens[tail] === "/" || tokens[tail] === "//") {
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

    public readonly syntaxType: "PathExpr" = "PathExpr";
    public constructor(leading: "/");
    public constructor(leading: undefined | "/" | "//", path: TRelativePathExpr);
    public constructor(public leading: undefined | "/" | "//", public path?: TRelativePathExpr) {}

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

export type TRelativePathExpr = RelativePathExpr | TStepExpr;
export class RelativePathExpr extends MultiOperativeExpr<"RelativePathExpr", TStepExpr, "/" | "//"> {
    public static readonly operators: ["/", "//"] = ["/", "//"];
    public static readonly collapse: true = true;
    public static parse(tokens: string[], usedTokens: number): [TRelativePathExpr, number] {
        return MultiOperativeExpr.parseOp<TStepExpr, "/" | "//", RelativePathExpr>(
            RelativePathExpr as any, StepExpr as any, tokens, usedTokens);
    }
    public readonly syntaxType = "RelativePathExpr";
    public render<T extends IPushable>(pushable: T): T {
        this.first.render(pushable);
        for (const [o, i] of this.rest) {
            pushable.push(o);
            i.render(pushable);
        }
        return pushable;
    }
}

export class Predicate implements IXPathGrammar<"Predicate"> {
    public static parse(tokens: string[], usedTokens: number): [Predicate, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "[") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'[' of Predicate");
        }
        const [pe, pt] = Expr.parse(tokens, tail + 1);
        tail = tokens[pt] === " " ? pt + 1 : pt;
        if (tokens[tail] !== "]") {
            throw new XPathUnexpectedTokenError(tokens, tail, "']' of Predicate");
        }
        return [new Predicate(pe), tail + 1];
    }

    public readonly syntaxType: "Predicate" = "Predicate";
    public constructor(
        public expression: Expr,
    ) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push("[");
        this.expression.render(pushable);
        pushable.push("]");
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export type TPostfixExpr = PostfixExpr | PrimaryExpr;
export class PostfixExpr implements IXPathGrammar<"PostfixExpr"> {
    public static parse(tokens: string[], usedTokens: number): [TRelativePathExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const [pe, pt] = PrimaryExpr.parse(tokens, tail);
        const pfs: Array<Predicate | ArgumentList | UnaryLookup> = [];
        tail = tokens[pt] === " " ? pt + 1 : pt;
        do {
            if (tokens[tail] === "[") {
                const [xe, xp] = Predicate.parse(tokens, tail);
                tail = tokens[xp] === " " ? xp + 1 : xp;
                pfs.push(xe);
            } else if (tokens[tail] === "(") {
                const [xe, xp] = ArgumentList.parse(tokens, tail);
                tail = tokens[xp] === " " ? xp + 1 : xp;
                pfs.push(xe);
            } else if (tokens[tail] === "!") {
                const [xe, xp] = UnaryLookup.parse(tokens, tail);
                tail = tokens[xp] === " " ? xp + 1 : xp;
                pfs.push(xe);
            }
        } while (tokens[tail] === "[" || tokens[tail] === "(" || tokens[tail] === "!");
        return [pe, tail];
    }

    public readonly syntaxType: "PostfixExpr" = "PostfixExpr";
    public constructor(
        public expression: PrimaryExpr,
        public postfixes: Array<Predicate | ArgumentList | UnaryLookup>,
    ) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        this.expression.render(pushable);
        for (const pf of this.postfixes) {
            pf.render(pushable);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export type TStepExpr = TPostfixExpr | TAxisStep;
export const StepExpr = {
    parse(tokens: string[], usedTokens: number): [TRelativePathExpr, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if ((tokens[tail + 1] === "::" || (tokens[tail + 1] === " " && tokens[tail + 2] === "::")) && (
            AxisStep.forwardKeywords.indexOf(tokens[tail] as any) !== -1 ||
            AxisStep.reverseKeywords.indexOf(tokens[tail] as any) !== -1
        )) {
            return AxisStep.parse(tokens, tail);
        }
        if (PrimaryExpr.couldBe(tokens, tail)) {
            return PrimaryExpr.parse(tokens, tail);
        }
        return AxisStep.parse(tokens, tail);
    },
};

export type TAxisStep = AxisStep | ParentAxisStep;
export class AxisStep implements IXPathGrammar<"AxisStep"> {
    public static forwardKeywords: [
        "child", "descendant", "attribute", "self", "descendant-or-self",
        "following-sibling", "following", "namespace"
    ] = [
        "child", "descendant", "attribute", "self", "descendant-or-self",
        "following-sibling", "following", "namespace",
    ];
    public static reverseKeywords: [
        "parent", "ancestor", "preceding-sibling", "preceding", "ancestor-or-self"
    ] = [
        "parent", "ancestor", "preceding-sibling", "preceding", "ancestor-or-self",
    ];
    public static parse(tokens: string[], usedTokens: number): [TAxisStep, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === "..") {
            return [ParentAxisStep.instance, tail + 1];
        }
        let axis;
        if ((tokens[tail + 1] === "::" || (tokens[tail + 1] === " " && tokens[tail + 2] === "::")) && (
            AxisStep.forwardKeywords.indexOf(tokens[tail] as any) !== -1 ||
            AxisStep.reverseKeywords.indexOf(tokens[tail] as any) !== -1
        )) {
            axis = tokens[tail];
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1;
            tail = tokens[tail] === " " ? tail + 1 : tail;
        } else if (tokens[tail] === "@") {
            axis = "@";
            tail = tokens[tail] === " " ? tail + 2 : tail + 1;
        }
        const [nodeTest, nt] = NodeTest.parse(tokens, tail);
        tail = tokens[nt] === " " ? nt + 1 : nt;
        const predicates: Predicate[] = [];
        while (tokens[tail] === "[") {
            const [p, pt] = Predicate.parse(tokens, tail);
            predicates.push(p);
            tail = pt;
            tail = tokens[tail] === " " ? tail + 1 : tail;
        }
        return [new AxisStep(axis, nodeTest, predicates), tail];
    }

    public readonly syntaxType: "AxisStep" = "AxisStep";
    public constructor(public axis: string | undefined, public nodeTest: TNodeTest, public predicates: Predicate[]) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        if (this.axis) {
            pushable.push(this.axis);
        }
        this.nodeTest.render(pushable);
        for (const p of this.predicates) {
            p.render(pushable);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export type TNodeTest = TKindTest | TNameTest;
export const NodeTest = {
    parse(tokens: string[], usedTokens: number): [TNodeTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (KindTest.hasKind(tokens[tail])) {
            return KindTest.parse(tokens, tail);
        }
        return NameTest.parse(tokens, tail);
    },
};

export class ParentAxisStep implements IXPathGrammar<"ParentAxisStep"> {
    public static readonly instance = new ParentAxisStep();
    public static parse(tokens: string[], usedTokens: number): [ParentAxisStep, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "..") {
            throw new XPathUnexpectedTokenError(tokens, usedTokens, "'..' of ParentAxisStep");
        }
        return [ParentAxisStep.instance, tail + 1];
    }

    public readonly syntaxType = "ParentAxisStep";
    public isReverse() {
        return true;
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push("..");
        return pushable;
    }

    public toString() {
        return "..";
    }
}

export type PrimaryExpr
    = TLiteral | ParenthesizedExpr | VarRef | ContextItemExpr
    | FunctionCall | FunctionItemExpr | MapCons | TArrayCons | UnaryLookup;
export type FunctionItemExpr = NamedFunctionRef | InlineFunctionExpr;
export const PrimaryExpr = {
    parse(tokens: string[], usedTokens: number): [PrimaryExpr, number] {
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
        if (tokens[tail] === "function" && (
            tokens[tail + 1] === "(" || (tokens[tail + 1] === " " && tokens[tail + 2] === "(")
        )) {
            return InlineFunctionExpr.parse(tokens, tail);
        }
        if (tokens[tail] === "$") {
            return VarRef.parse(tokens, tail);
        }
        if (tokens[tail] === "?") {
            return UnaryLookup.parse(tokens, tail);
        }
        if (tokens[tail] === "\"" || tokens[tail] === "'") {
            return StringLiteral.parse(tokens, tail);
        }
        if (tokens[tail] && /^[0-9]/.test(tokens[tail])) {
            return NumericLiteral.parse(tokens, tail);
        }
        if (tokens[tail] === "map" && (
            tokens[tail + 1] === "{" || (tokens[tail + 1] === " " && tokens[tail + 2] === "{")
        )) {
            return MapCons.parse(tokens, tail);
        }
        if (tokens[tail] === "[" || (tokens[tail] === "array" && (
            tokens[tail + 1] === "{" || (tokens[tail + 1] === " " && tokens[tail + 2] === "{")
        ))) {
            return ArrayCons.parse(tokens, tail);
        }

        {
            const [r, t] = EQName.parse(tokens, tail);
            tail = t;
            tail = tokens[tail] === " " ? tail + 1 : tail;
            if (tokens[tail] === "#") {
                return NamedFunctionRef.parse(tokens, t, r);
            }
            if (tokens[tail] === "(") {
                return FunctionCall.parse(tokens, tail, r);
            }
        }
        throw new XPathUnexpectedTokenError(tokens, usedTokens, "PrimaryExpr");
    },
    couldBe(tokens: string[], usedTokens: number): boolean {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === "(" || tokens[tail] === "." || tokens[tail] === "$" ||
            tokens[tail] === "?" || tokens[tail] === "\"" || tokens[tail] === "'" ||
            tokens[tail] && /^[0-9]/.test(tokens[tail])
        ) {
            return true;
        }
        if (tokens[tail] === "function" && (
            tokens[tail + 1] === "(" || (tokens[tail + 1] === " " && tokens[tail + 2] === "(")
        )) {
            return true;
        }
        if (tokens[tail] === "map" && (
            tokens[tail + 1] === "{" || (tokens[tail + 1] === " " && tokens[tail + 2] === "{")
        )) {
            return true;
        }
        if (tokens[tail] === "[" || (tokens[tail] === "array" && (
            tokens[tail + 1] === "{" || (tokens[tail + 1] === " " && tokens[tail + 2] === "{")
        ))) {
            return true;
        }

        try {
            const [r, t] = EQName.parse(tokens, tail);
            tail = t;
            tail = tokens[tail] === " " ? tail + 1 : tail;
            if (tokens[tail] === "#") {
                return true;
            }
            if (tokens[tail] === "(") {
                return true;
            }
        } catch (e) { /* do nothing */ }

        return false;
    },
};

export type TArrayCons = SquareArrayCons | CurlyArrayCons;
export const ArrayCons = {
    parse(tokens: string[], usedTokens: number): [TArrayCons, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === "array") {
            return CurlyArrayCons.parse(tokens, tail);
        }
        if (tokens[tail] === "[") {
            return SquareArrayCons.parse(tokens, tail);
        }
        throw new XPathUnexpectedTokenError(tokens, usedTokens, "ArrayCons");
    },
};

export class CurlyArrayCons implements IXPathGrammar<"CurlyArrayCons"> {
    public static parse(tokens: string[], usedTokens: number): [CurlyArrayCons, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] !== "array") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'array' of CurlyArrayCons");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "{") {
            throw new XPathUnexpectedTokenError(tokens, tail, "['function', '('] of InlineFunctionExpr");
        }
        const [ee, bt] = EnclosedExpr.parse(tokens, tail);
        return [new CurlyArrayCons(ee), bt];
    }

    public readonly syntaxType: "CurlyArrayCons" = "CurlyArrayCons";
    public constructor(
        public expression: EnclosedExpr,
    ) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push("array", " ");
        return this.expression.render(pushable);
    }

    public toString() {
        return this.render([]).join("");
    }
}

export class SquareArrayCons implements IXPathGrammar<"SquareArrayCons"> {
    public static operators: [","] = [","];
    public static parse(tokens: string[], usedTokens: number): [SquareArrayCons, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] !== "[") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'[' of SquareArrayCons");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1;
        if (tokens[tail] === "]") {
            throw new XPathUnexpectedTokenError(tokens, tail, "']' of SquareArrayCons");
        }
        const r: TExprSingle[] = [];
        do {
            tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
            const [e, t] = ExprSingle.parse(tokens, tail);
            r.push(e);
            tail = tokens[t] === " " ? t + 1 : t; // allow space
        } while (tokens[tail] === "," && tail++);

        if (tokens[tail] !== "]") {
            throw new XPathUnexpectedTokenError(tokens, tail, "']' of SquareArrayCons");
        }

        return [new SquareArrayCons(r), tail + 1];
    }

    public readonly syntaxType: "SquareArrayCons" = "SquareArrayCons";
    public constructor(public expressions: TExprSingle[]) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("[");
        let fst = true;
        for (const a of this.expressions) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",", " ");
            }
            a.render(pushable);
        }
        pushable.push("]");
        return pushable;
    }
}

export class MapCons implements IXPathGrammar<"MapCons"> {
    public static operators: [","] = [","];
    public static parse(tokens: string[], usedTokens: number): [MapCons, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] !== "map") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'map' of MapCons");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1;
        if (tokens[tail] === "]") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'{' of MapCons");
        }
        const r: Array<[TExprSingle, TExprSingle]> = [];
        do {
            tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
            const [k, kt] = ExprSingle.parse(tokens, tail);
            tail = tokens[kt] === " " ? kt + 1 : kt; // allow space
            const [v, vt] = ExprSingle.parse(tokens, tail);
            tail = tokens[vt] === " " ? vt + 1 : vt; // allow space
            r.push([k, v]);
        } while (tokens[tail] === "," && tail++);

        if (tokens[tail] !== "}") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'}' of MapCons");
        }

        return [new MapCons(r), tail + 1];
    }

    public readonly syntaxType: "MapCons" = "MapCons";
    public constructor(public mappings: Array<[TExprSingle, TExprSingle]>) {}

    public render<T extends IPushable>(pushable: T): T {
        pushable.push("[");
        let fst = true;
        for (const a of this.mappings) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",", " ");
            }
            a[0].render(pushable);
            pushable.push(" ", ":", " ");
            a[0].render(pushable);
        }
        pushable.push("]");
        return pushable;
    }
}

export class UnaryLookup extends LeadingUnaryOpExpr<"UnaryLookup", TKeySpecifier, "?"> {
    public static operator: "?" = "?";
    public static parse(tokens: string[], usedTokens: number): [UnaryLookup, number] {
        return LeadingUnaryOpExpr.parseLeading<TKeySpecifier, "?", UnaryLookup>(
            UnaryLookup, KeySpecifier, tokens, usedTokens);
    }
    public readonly syntaxType = "UnaryLookup";
}

export type TKeySpecifier = NCName | IntegerLiteral | ParenthesizedExpr | Wildcard;
export const KeySpecifier = {
    parse(tokens: string[], usedTokens: number): [TKeySpecifier, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === "*") {
            return [Wildcard.instance, tail + 1];
        }
        if (tokens[tail] === "(") {
            return ParenthesizedExpr.parse(tokens, tail);
        }
        if (/^[0-9]+$/.test(tokens[tail])) {
            return IntegerLiteral.parse(tokens, tail);
        }
        return NCName.parse(tokens, tail);
    },
};

export class FunctionCall implements IXPathGrammar<"FunctionCall"> {
    public static parse(tokens: string[], usedTokens: number, parsedName?: TEQName): [FunctionCall, number] {
        let tail = usedTokens;
        let name = parsedName;
        if (!name) {
            tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
            const [eqn, t] = EQName.parse(tokens, tail);
            tail = t;
            name = eqn;
        }
        tail = tokens[tail] === " " ? tail + 1 : tail;
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of FunctionCall");
        }
        const [args, tr] = ArgumentList.parseArgumentList(tokens, tail);
        return [new FunctionCall(name, args), tr];
    }

    public readonly syntaxType: "FunctionCall" = "FunctionCall";
    public constructor(public name: TEQName, public args: Array<TExprSingle | ArgumentPlaceholder>) {}
    public render<T extends IPushable>(pushable: T): T {
        this.name.render(pushable);
        pushable.push("(");
        let fst = true;
        for (const a of this.args) {
            if (fst) {
                fst = false;
            } else {
                pushable.push(",", " ");
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

export class NamedFunctionRef implements IXPathGrammar<"NamedFunctionRef"> {
    public static parse(tokens: string[], usedTokens: number, parsedName?: TEQName): [NamedFunctionRef, number] {
        let tail = usedTokens;
        let name = parsedName;
        if (!name) {
            tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
            const [eqn, t] = EQName.parse(tokens, tail);
            tail = t;
            name = eqn;
        }
        tail = tokens[tail] === " " ? tail + 1 : tail;
        if (tokens[tail] !== "#") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'#' of NamedFunctionRef");
        }
        const [n, tr] = IntegerLiteral.parse(tokens, tail + 1);
        return [new NamedFunctionRef(name, n), tr];
    }

    public readonly syntaxType: "NamedFunctionRef" = "NamedFunctionRef";
    public constructor(public name: TEQName, public arity: IntegerLiteral) {}
    public render<T extends IPushable>(pushable: T): T {
        this.name.render(pushable);
        pushable.push("#");
        return this.arity.render(pushable);
    }
}

export class InlineFunctionExpr implements IXPathGrammar<"InlineFunctionExpr"> {
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

    public readonly syntaxType: "InlineFunctionExpr" = "InlineFunctionExpr";
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

export class ParamList extends MultiOperativeExpr<"ParamList", Param, ","> {
    public static operators: [","] = [","];
    public static collapse: false = false;
    public static parse(tokens: string[], usedTokens: number): [ParamList, number] {
        return MultiOperativeExpr.parseOp<Param, ",", ParamList>(ParamList, Param, tokens, usedTokens);
    }
    public readonly syntaxType = "ParamList";
}

export class Param implements IXPathGrammar<"Param"> {

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

    public readonly syntaxType: "Param" = "Param";
    public constructor(public name: TEQName, public asType?: SequenceType) {}

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

export class EnclosedExpr implements IXPathGrammar<"EnclosedExpr"> {

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

    public readonly syntaxType: "EnclosedExpr" = "EnclosedExpr";
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

export class SequenceType implements IXPathGrammar<"SequenceType"> {
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

    public readonly syntaxType: "SequenceType" = "SequenceType";
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

export class ParenthesizedItemType implements IXPathGrammar<"ParenthesizedItemType"> {
    public static parse(tokens: string[], usedTokens: number): [ParenthesizedItemType, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of ParenthesizedItemType");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        const [v, vt] = ItemType.parse(tokens, tail);
        tail = vt;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of ParenthesizedItemType");
        }
        return [new ParenthesizedItemType(v), tail + 1];
    }

    public readonly syntaxType: "ParenthesizedItemType" = "ParenthesizedItemType";
    public constructor(public itemType: TItemType) {}

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        pushable.push("(");
        this.itemType.render(pushable);
        pushable.push(")");
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export type TItemType
    = EmptyItemType | TEQName | ParenthesizedItemType
    | TFunctionTest | TMapTest | TArrayTest | TKindTest;
export const ItemType = {
    parse(tokens: string[], usedTokens: number): [TItemType, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] === "(") {
            return ParenthesizedItemType.parse(tokens, tail);
        }
        if (tokens[tail + 1] === "(" || (tokens[tail + 1] === " " && tokens[tail + 2] === "(")) {
            const fn = tokens[tail];
            if (fn === "item") {
                tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
                tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
                if (tokens[tail] !== ")") {
                    throw new XPathUnexpectedTokenError(tokens, tail, "')' of ItemType");
                }
                return [EmptyItemType.instance, tail + 1];
            }
            if (fn === "function") {
                return FunctionTest.parse(tokens, tail);
            }
            if (fn === "map") {
                return MapTest.parse(tokens, tail);
            }
            if (fn === "array") {
                return ArrayTest.parse(tokens, tail);
            }
            if (KindTest.hasKind(fn)) {
                return KindTest.parse(tokens, tail);
            }
        }
        return EQName.parse(tokens, tail);
    },
};

export type TFunctionTest = FunctionTest<SequenceType[], SequenceType> | Readonly<FunctionTest<Wildcard, undefined>>;
export class FunctionTest<
    T extends SequenceType[] | Wildcard,
    R extends SequenceType | undefined
> implements IXPathGrammar<"FunctionTest"> {
    public static readonly anyFunction = Object.freeze(
        new FunctionTest<Wildcard, undefined>(Wildcard.instance, undefined),
    );

    public static parse(tokens: string[], usedTokens: number): [TFunctionTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const t0 = tail;
        if (tokens[tail] !== "function") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['function', '('] of FunctionTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of FunctionTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] === "*") {
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            if (tokens[tail] !== ")") {
                throw new XPathUnexpectedTokenError(tokens, tail, "')' of FunctionTest");
            }
            return [FunctionTest.anyFunction, tail + 1];
        }
        const args: SequenceType[] = [];

        if (tokens[tail] !== ")") {
            do {
                tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
                const [a, t] = SequenceType.parse(tokens, tail);
                args.push(a);
                tail = tokens[t] === " " ? t + 1 : t; // allow space
            } while (tokens[tail] === "," && tail++);
        }

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of FunctionTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "as") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'as' of FunctionTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [r, rt] = SequenceType.parse(tokens, tail + 1);

        return [new FunctionTest(args, r), rt];
    }

    public readonly syntaxType = "FunctionTest";
    private constructor(public args: T, public ret: R) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("function", "(");
        if (this.args instanceof Wildcard) {
            pushable.push("*");
        } else {
            let fst = true;
            for (const a of (this.args as SequenceType[])) {
                if (fst) {
                    fst = false;
                } else {
                    pushable.push(",", " ");
                }
                a.render(pushable);
            }
        }
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export class DocumentTest implements IXPathGrammar<"DocumentTest"> {
    public static parse(tokens: string[], usedTokens: number): [DocumentTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "document-node") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['document-node', '('] of DocumentTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of DocumentTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        let v: undefined | TElementTest | SchemaElementTest;
        if (tokens[tail] === "element") {
            const [vv, vt] = ElementTest.parse(tokens, tail);
            v = vv;
            tail = tokens[vt] === " " ? vt + 1 : vt; // allow space
        } else if (tokens[tail] === "element-schema") {
            const [vv, vt] = ElementTest.parse(tokens, tail);
            v = vv;
            tail = tokens[vt] === " " ? vt + 1 : vt; // allow space
        }
        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "')' of DocumentTest",
            );
        }
        return [new DocumentTest(v), tail + 1];
    }

    public readonly syntaxType = "DocumentTest";
    private constructor(public root: undefined | TElementTest | SchemaElementTest) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("document-node", "(");
        if (this.root) {
            this.root.render(pushable);
        }
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export type TAttributeTest
    = AttributeTest<TEQName, TEQName | undefined>
    | AttributeTest<Wildcard, TEQName> | Readonly<AttributeTest<Wildcard>>;

export class AttributeTest<
    N extends TEQName | Wildcard,
    T extends TEQName | undefined = undefined
> implements IXPathGrammar<"AttributeTest"> {
    public static readonly anyAttribute = Object.freeze(
        new AttributeTest<Wildcard>(Wildcard.instance, undefined),
    );

    public static parse(tokens: string[], usedTokens: number): [TAttributeTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const t0 = tail;
        if (tokens[tail] !== "attribute") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['attribute', '('] of AttributeTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of AttributeTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] === ")") {
            return [AttributeTest.anyAttribute, tail + 1];
        }
        let n: Wildcard | TEQName;
        if (tokens[tail] === "*") {
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            if (tokens[tail] === ")") {
                return [AttributeTest.anyAttribute, tail + 1];
            }
            n = Wildcard.instance;
        } else {
            const [tv, tp] = EQName.parse(tokens, tail);
            n = tv;
            tail = tp;
        }
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === ")") {
            return [new AttributeTest(n as any, undefined), tail + 1];
        }
        if (tokens[tail] !== ",") {
            throw new XPathUnexpectedTokenError(tokens, tail, "',' of AttributeTest");
        }
        tail = tokens[tail] === " " ? tail + 2 : tail + 1; // allow space

        const [t, vt] = EQName.parse(tokens, tail);
        tail = tokens[vt] === " " ? vt + 1 : vt; // allow space

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of AttributeTest");
        }
        return [new AttributeTest(n as any, t), tail + 1];
    }

    public readonly syntaxType = "AttributeTest";
    private constructor(public name: N, public type: T) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("element", "(");
        this.name.render(pushable);
        if (this.type) {
            pushable.push(",", " ");
            this.type.render(pushable);
        }
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export type TElementTest
    = ElementTest<TEQName, TEQName | undefined>
    | ElementTest<Wildcard, TEQName> | Readonly<ElementTest<Wildcard>>;
export class ElementTest<
    N extends TEQName | Wildcard,
    T extends TEQName | undefined = undefined
> implements IXPathGrammar<"ElementTest"> {
    public static readonly anyElement = Object.freeze(
        new ElementTest<Wildcard>(Wildcard.instance, undefined),
    );

    public static parse(tokens: string[], usedTokens: number): [TElementTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const t0 = tail;
        if (tokens[tail] !== "element") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['element', '('] of ElementTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of ElementTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] === ")") {
            return [ElementTest.anyElement, tail + 1];
        }
        let n: Wildcard | TEQName;
        if (tokens[tail] === "*") {
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            if (tokens[tail] === ")") {
                return [ElementTest.anyElement, tail + 1];
            }
            n = Wildcard.instance;
        } else {
            const [tv, tp] = EQName.parse(tokens, tail);
            n = tv;
            tail = tp;
        }
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === ")") {
            return [new ElementTest(n as any, undefined), tail + 1];
        }
        if (tokens[tail] !== ",") {
            throw new XPathUnexpectedTokenError(tokens, tail, "',' of ElementTest");
        }
        tail = tokens[tail] === " " ? tail + 2 : tail + 1; // allow space

        const [t, vt] = EQName.parse(tokens, tail);
        tail = tokens[vt] === " " ? vt + 1 : vt; // allow space

        let tn = false;
        if (tokens[tail] === "?") {
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            tn = true;
        }

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of ElementTest");
        }
        return [new ElementTest(n as any, t, tn), tail + 1];
    }

    public readonly syntaxType = "ElementTest";
    private constructor(public name: N, public type: T, public typeNullable: boolean = true) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("element", "(");
        this.name.render(pushable);
        if (this.type) {
            pushable.push(",", " ");
            this.type.render(pushable);
        }
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export type TMapTest = MapTest<[TEQName, SequenceType]> | Readonly<MapTest<Wildcard>>;
export class MapTest<
    T extends [TEQName, SequenceType] | Wildcard
> implements IXPathGrammar<"MapTest"> {
    public static readonly anyMap = Object.freeze(
        new MapTest<Wildcard>(Wildcard.instance),
    );

    public static parse(tokens: string[], usedTokens: number): [TMapTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const t0 = tail;
        if (tokens[tail] !== "map") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['map', '('] of MapTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of MapTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] === "*") {
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            if (tokens[tail] !== ")") {
                throw new XPathUnexpectedTokenError(tokens, tail, "')' of MapTest");
            }
            return [MapTest.anyMap, tail + 1];
        }

        const [k, kt] = EQName.parse(tokens, tail);
        tail = tokens[kt] === " " ? kt + 1 : kt; // allow space

        if (tokens[tail] !== ",") {
            throw new XPathUnexpectedTokenError(tokens, tail, "',' of MapTest");
        }
        tail = tokens[tail] === " " ? tail + 2 : tail + 1; // allow space

        const [v, vt] = SequenceType.parse(tokens, tail);
        tail = tokens[vt] === " " ? vt + 1 : vt; // allow space

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of MapTest");
        }
        return [new MapTest([k, v]), tail + 1];
    }

    public readonly syntaxType = "MapTest";
    private constructor(public type: T) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("map", "(");
        if (this.type instanceof Wildcard) {
            pushable.push("*");
        } else {
            let fst = true;
            for (const a of (this.type as SequenceType[])) {
                if (fst) {
                    fst = false;
                } else {
                    pushable.push(",", " ");
                }
                a.render(pushable);
            }
        }
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export type TArrayTest = ArrayTest<SequenceType> | Readonly<ArrayTest<Wildcard>>;
export class ArrayTest<
    T extends SequenceType | Wildcard
> implements IXPathGrammar<"ArrayTest"> {
    public static readonly anyArray = Object.freeze(
        new ArrayTest<Wildcard>(Wildcard.instance),
    );

    public static parse(tokens: string[], usedTokens: number): [TArrayTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const t0 = tail;
        if (tokens[tail] !== "array") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['array', '('] of ArrayTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of ArrayTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] === "*") {
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            if (tokens[tail] !== ")") {
                throw new XPathUnexpectedTokenError(tokens, tail, "')' of ArrayTest");
            }
            return [ArrayTest.anyArray, tail + 1];
        }

        const [v, vt] = SequenceType.parse(tokens, tail);
        tail = tokens[vt] === " " ? vt + 1 : vt; // allow space

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of ArrayTest");
        }
        return [new ArrayTest(v), tail + 1];
    }

    public readonly syntaxType = "ArrayTest";
    private constructor(public type: T) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("array", "(");
        this.type.render(pushable);
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export class SchemaElementTest implements IXPathGrammar<"SchemaElementTest"> {

    public static parse(tokens: string[], usedTokens: number): [SchemaElementTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const t0 = tail;
        if (tokens[tail] !== "schema-element") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['schema-element', '('] of SchemaElementTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of SchemaElementTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [v, vt] = EQName.parse(tokens, tail);
        tail = tokens[vt] === " " ? vt + 1 : vt; // allow space

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of SchemaElementTest");
        }
        return [new SchemaElementTest(v), tail + 1];
    }

    public readonly syntaxType = "SchemaElementTest";
    private constructor(public name: TEQName) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("schema-element", "(");
        this.name.render(pushable);
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export class SchemaAttributeTest implements IXPathGrammar<"SchemaAttributeTest"> {

    public static parse(tokens: string[], usedTokens: number): [SchemaAttributeTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        const t0 = tail;
        if (tokens[tail] !== "schema-attribute") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['schema-attribute', '('] of SchemaAttributeTest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of SchemaAttributeTest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [v, vt] = EQName.parse(tokens, tail);
        tail = tokens[vt] === " " ? vt + 1 : vt; // allow space

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of SchemaAttributeTest");
        }
        return [new SchemaAttributeTest(v), tail + 1];
    }

    public readonly syntaxType = "SchemaAttributeTest";
    private constructor(public name: TEQName) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("schema-attribute", "(");
        this.name.render(pushable);
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export class PITest implements IXPathGrammar<"PITest"> {

    public static parse(tokens: string[], usedTokens: number): [PITest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] !== "processing-instruction") {
            throw new XPathUnexpectedTokenError(
                tokens, usedTokens,
                "['processing-instruction', '('] of PITest",
            );
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        if (tokens[tail] !== "(") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'(' of PITest");
        }
        tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space

        const [v, vt] = EQName.parse(tokens, tail);
        tail = tokens[vt] === " " ? vt + 1 : vt; // allow space

        if (tokens[tail] !== ")") {
            throw new XPathUnexpectedTokenError(tokens, tail, "')' of PITest");
        }
        return [new PITest(v), tail + 1];
    }

    public readonly syntaxType = "PITest";
    private constructor(public name: TEQName) {}

    public render<P extends IPushable>(pushable: P): P {
        pushable.push("processing-instruction", "(");
        this.name.render(pushable);
        pushable.push(")");
        return pushable;
    }

    public toString() { return this.render([]).join(""); }
}

export type TNameTest = TEQName | TNsWildcard;
export type TNsWildcard = Wildcard | NsWildcard<NCName, Wildcard>
    | NsWildcard<Wildcard, NCName> | NsWildcard<BracedURILiteral, Wildcard>;

export const NameTest = {
    parse(tokens: string[], usedTokens: number): [TNameTest, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === "*") {
            return NsWildcard.parse(tokens, tail);
        }

        if (tokens[tail] === "Q" && tokens[tail + 1] === "{") {
            const [n, nt] = BracedURILiteral.parse(tokens, tail);
            if (tokens[nt] !== "*") {
                const [x, xt] = NCName.parse(tokens, nt + 1);
                return [new URIQualifiedName(n, x), xt];
            }
            return [new NsWildcard(n, Wildcard.instance), nt + 1];
        }
        {
            const [n, nt] = NCName.parse(tokens, tail);
            if (tokens[nt] !== ":") {
                return [new QName(null, n), nt];
            }
            if (tokens[nt + 1] !== "*") {
                const [x, xt] = NCName.parse(tokens, nt + 1);
                return [new QName(x, n), xt];
            }
            return [new NsWildcard(n, Wildcard.instance), nt + 2];
        }
    },
};

export class NsWildcard<
    NS extends Wildcard | NCName | BracedURILiteral,
    EN extends Wildcard | NCName
> implements IXPathGrammar<"NsWildcard"> {
    public static parse(tokens: string[], usedTokens: number): [TNsWildcard, number] {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space
        if (tokens[tail] === "*") {
            if (tokens[tail + 1] !== ":") {
                return [Wildcard.instance, tail + 1];
            }
            const [n, nt] = NCName.parse(tokens, tail + 2);
            return [new NsWildcard(Wildcard.instance, n), nt];
        }
        if (tokens[tail] === "Q" && tokens[tail + 1] === "{") {
            const [n, nt] = BracedURILiteral.parse(tokens, tail);
            if (tokens[nt] !== "*") {
                throw new XPathUnexpectedTokenError(tokens, nt, "'*' of NsWildcard");
            }
            return [new NsWildcard(n, Wildcard.instance), nt + 1];
        }
        {
            const [n, nt] = NCName.parse(tokens, tail);
            if (tokens[nt] !== ":") {
                throw new XPathUnexpectedTokenError(tokens, nt, "':' of NsWildcard");
            }
            if (tokens[nt + 1] !== "*") {
                throw new XPathUnexpectedTokenError(tokens, nt + 1, "'*' of NsWildcard");
            }
            return [new NsWildcard(n, Wildcard.instance), nt + 2];
        }
    }

    public readonly syntaxType: "NsWildcard" = "NsWildcard";
    public constructor(public namespace: NS, public elementName: EN) {}

    public render<T extends IPushable>(pushable: T): T {
        this.namespace.render(pushable);
        pushable.push(":");
        this.elementName.render(pushable);
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export type TKindTest
    = DocumentTest | TElementTest | TAttributeTest | SchemaElementTest | SchemaAttributeTest
    | PITest | CommentTest | TextTest | NamespaceNodeTest | AnyKindTest;
export const KindTest = {
    kinds: {
        "attribute": AttributeTest,
        "document-node": DocumentTest,
        "element": ElementTest,
        "processing-instruction": PITest,
        "schema-attribute": SchemaAttributeTest,
        "schema-element": SchemaElementTest,

        "comment": CommentTest,
        "namespace-node": NamespaceNodeTest,
        "node": AnyKindTest,
        "text": TextTest,
    } as { [k: string]: IXPathParser<string, TKindTest>; },
    get kindNames() {
        return Object.keys(this.kinds);
    },
    hasKind(name: string) {
        return Boolean(this.kinds[name]);
    },
    parse(tokens: string[], usedTokens: number): [TKindTest, number] {
        const tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space

        const f = this.kinds[tokens[tail]];
        if (!f) {
            const avail = this.kindNames.map((x) => "'" + x + "'").join(" | ");
            throw new XPathUnexpectedTokenError(tokens, tail,  avail + " of ItemType");
        }
        return f.parse(tokens, tail);
    },
};

export class SimpleBinding implements IXPathGrammar<"SimpleBinding"> {
    public static parse(tokens: string[], usedTokens: number, defToken: string = ":="): [SimpleBinding, number] {
        let tail = tokens[usedTokens] === " " ? usedTokens + 1 : usedTokens; // allow space
        if (tokens[tail] !== "$") {
            throw new XPathUnexpectedTokenError(tokens, tail, "'$'");
        }
        tail++;
        let varName: TEQName;
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

    public readonly syntaxType: "SimpleBinding" = "SimpleBinding";
    public constructor(public varName: TEQName, public expression: TExprSingle, public defToken: string = ":=") {}

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

export type TEQName = QName | URIQualifiedName;
export abstract class EQName<S extends "QName" | "URIQualifiedName"> implements IXPathGrammar<S> {
    public static parse(tokens: string[], usedTokens: number): [TEQName, number] {
        if (tokens[usedTokens] === "Q" && tokens[usedTokens + 1] === "{") {
            return URIQualifiedName.parse(tokens, usedTokens);
        } else {
            return QName.parse(tokens, usedTokens);
        }
    }

    public abstract readonly syntaxType: S;

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

export class BracedURILiteral implements IXPathGrammar<"BracedURILiteral"> {
    public static parse(tokens: string[], usedTokens: number): [BracedURILiteral, number] {
        if (tokens[usedTokens] !== "Q" || tokens[usedTokens + 1] !== "{"
            || (tokens[usedTokens + 2] !== "}" && tokens[usedTokens + 3] !== "}"
        )) {
            throw new XPathUnexpectedTokenError(tokens, usedTokens, "['Q', '{', uri?, '}'] of BracedURILiteral");
        }
        const [uri, tail]
            = tokens[usedTokens + 2] === "}"
            ? ["", usedTokens + 3]
            : [tokens[usedTokens + 2], usedTokens + 4];
        return [new BracedURILiteral(uri), tail];
    }

    public readonly syntaxType: "BracedURILiteral" = "BracedURILiteral";
    public constructor(public uri: string) {
        if (uri && (uri.indexOf("{") !== -1 || uri.indexOf("}") !== -1)) {
            throw new XPathParseError("invalid-token", "an URI for a BracedURILiteral may not contain braces");
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
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export class URIQualifiedName extends EQName<"URIQualifiedName"> {
    public static parse(tokens: string[], usedTokens: number): [URIQualifiedName, number] {
        const [uri, tail] = BracedURILiteral.parse(tokens, usedTokens);
        const [e, t] = NCName.parse(tokens, tail);
        return [new URIQualifiedName(uri, e), t];
    }

    public readonly syntaxType: "URIQualifiedName" = "URIQualifiedName";
    public constructor(public uri: BracedURILiteral, public localName: NCName) {
        super();
    }

    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    public render<T extends IPushable>(pushable: T): T {
        this.uri.render(pushable);
        this.localName.render(pushable);
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export class QName extends EQName<"QName"> {
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

    public readonly syntaxType: "QName" = "QName";
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
