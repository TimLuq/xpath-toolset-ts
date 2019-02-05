
// tslint:disable:max-classes-per-file

export class XPathParseError extends Error {
    public constructor(public code: string, message: string, public tokens?: string[], public token?: number) {
        super(message);
    }
}

export class XPathUnexpectedTokenError extends XPathParseError {
    public expected: string | undefined;
    public constructor(tokens: string[], token: number, expected?: string) {
        const t = tokens[token];
        let message = `unexpected token ${t === undefined ? "[EOL]" : JSON.stringify(t)}`;
        if (expected) {
            message += " (expected " + expected + ")";
        }
        super("parse-token", message, tokens, token);
        this.expected = expected;
    }
}

export interface IPushable {
    push(...tokens: string[]): any;
}

export interface IXPathGrammar {
    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    render<T extends IPushable>(pushable: T): T;
}

export interface IXPathParser<E extends IXPathGrammar> {
    parse(tokens: string[], usedTokens: number): [E, number];
}

export interface ISingleOpExprInst<
    L extends IXPathGrammar, R extends IXPathGrammar,
    T extends SingleOperativeExpr<L, R> = SingleOperativeExpr<L, R>,
> {
    readonly operator: string[];
    new(left: L, op?: null, right?: null): T;
    new(left: L, op: string[], right: R): T;
    parseLeft(tokens: string[], usedTokens: number): [L, number];
    parseRight(tokens: string[], usedTokens: number): [R, number];
}

export abstract class SingleOperativeExpr<
    E extends IXPathGrammar, R extends IXPathGrammar,
> implements IXPathGrammar {

    protected static parseSingleOp<
        L extends IXPathGrammar, R extends IXPathGrammar,
        T extends SingleOperativeExpr<L, R> = SingleOperativeExpr<L, R>,
        C extends ISingleOpExprInst<L, R> = ISingleOpExprInst<L, R>
    >(
        clss: C,
        tokens: string[],
        usedTokens: number,
    ) {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        const [fst, ft] = clss.parseLeft(tokens, tail);
        tail = tokens[ft] === " " ? ft + 1 : ft; // allow space

        if (clss.operator[0] !== tokens[tail]) {
            return [new clss(fst), tail] as [T, number];
        }
        const op: string[] = clss.operator;
        for (const o of op) {
            if (o !== tokens[tail]) {
                throw new XPathUnexpectedTokenError(tokens, tail, o);
            }
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
        }
        const [r, t] = clss.parseRight(tokens, tail);
        tail = tokens[t] === " " ? t + 1 : t; // allow space

        return [new clss(fst, op, r), tail] as [T, number];
    }

    public constructor(public first: E, public operator?: string[] | null, public right?: R | null) {}

    public render<T extends IPushable>(pushable: T): T {
        this.first.render(pushable);
        if (this.operator && this.right) {
            for (const o of this.operator) {
                pushable.push(" ", o);
            }
            pushable.push(" ");
            this.right.render(pushable);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export interface IUnaryOpExprInst<
    E extends IXPathGrammar, O extends string, T extends UnaryOpExpr<E, O> = UnaryOpExpr<E, O>
> {
    readonly operator: O;
    new(fst: E, op?: O | null): T;
}

abstract class UnaryOpExpr<E extends IXPathGrammar, O extends string> implements IXPathGrammar {
    public abstract render<T extends IPushable>(pushable: T): T;

    public toString() {
        return this.render([]).join("");
    }
}

export abstract class FollowingUnaryOpExpr<E extends IXPathGrammar, O extends string> extends UnaryOpExpr<E, O> {

    protected static parseFollowing<
        E extends IXPathGrammar, O extends string,
        T extends FollowingUnaryOpExpr<E, O> = FollowingUnaryOpExpr<E, O>,
        C extends IUnaryOpExprInst<E, O> = IUnaryOpExprInst<E, O, T>
    >(
        clss: C,
        childClss: IXPathParser<E>,
        tokens: string[],
        usedTokens: number,
    ) {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        const [fst, ft] = childClss.parse(tokens, tail);
        tail = tokens[ft] === " " ? ft + 1 : ft; // allow space

        if (clss.operator !== tokens[tail]) {
            return [new clss(fst), tail] as [T, number];
        }

        return [new clss(fst, clss.operator), tail + 1] as [T, number];
    }

    public constructor(public first: E, public operator?: O | null) {
        super();
    }

    public render<T extends IPushable>(pushable: T): T {
        this.first.render(pushable);
        if (this.operator) {
            pushable.push(" ", this.operator);
        }
        return pushable;
    }
}

export abstract class LeadingUnaryOpExpr<E extends IXPathGrammar, O extends string> extends UnaryOpExpr<E, O> {

    protected static parseLeading<
        E extends IXPathGrammar, O extends string,
        T extends LeadingUnaryOpExpr<E, O> = LeadingUnaryOpExpr<E, O>,
        C extends IUnaryOpExprInst<E, O> = IUnaryOpExprInst<E, O, T>
    >(
        clss: C,
        childClss: IXPathParser<E>,
        tokens: string[],
        usedTokens: number,
    ) {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        const [fst, ft] = childClss.parse(tokens, tail);
        tail = tokens[ft] === " " ? ft + 1 : ft; // allow space

        if (clss.operator !== tokens[tail]) {
            return [new clss(fst), tail] as [T, number];
        }

        return [new clss(fst, clss.operator), tail + 1] as [T, number];
    }

    public constructor(public first: E, public operator?: O | null) {
        super();
    }

    public render<T extends IPushable>(pushable: T): T {
        this.first.render(pushable);
        if (this.operator) {
            pushable.push(" ", this.operator);
        }
        return pushable;
    }
}

export interface IChainOpExprInst<
    L extends IXPathGrammar, O extends string, R extends IXPathGrammar,
    T extends ChainOperativeExpr<L, O, R> = ChainOperativeExpr<L, O, R>,
> {
    readonly operators: O[];
    new(fst: L, rest: Array<[O, R]>): T;
}

export abstract class ChainOperativeExpr<
    L extends IXPathGrammar, O extends string, R extends IXPathGrammar,
> implements IXPathGrammar {

    protected static parseChain<
        L extends IXPathGrammar, O extends string, R extends IXPathGrammar,
        T extends ChainOperativeExpr<L, O, R> = ChainOperativeExpr<L, O, R>,
        C extends IChainOpExprInst<L, O, R> = IChainOpExprInst<L, O, R, T>,
    >(
        clss: C,
        leftClss: IXPathParser<L>,
        restClss: IXPathParser<R>,
        tokens: string[],
        usedTokens: number,
    ) {
        let tail = usedTokens;
        tail = tokens[tail] === " " ? tail + 1 : tail; // allow space

        const [fst, ft] = leftClss.parse(tokens, tail);
        tail = tokens[ft] === " " ? ft + 1 : ft; // allow space

        const r: Array<[O, R]> = [];
        while (clss.operators.indexOf(tokens[tail] as O) !== -1) {
            const op = tokens[tail] as O;
            tail = tokens[tail + 1] === " " ? tail + 2 : tail + 1; // allow space
            const [e, t] = restClss.parse(tokens, tail);
            r.push([op, e]);
            tail = tokens[t] === " " ? t + 1 : t; // allow space
        }

        return [new clss(fst, r), tail] as [T, number];
    }

    public constructor(public first: L, public rest: Array<[O, R]>) {}

    public render<T extends IPushable>(pushable: T): T {
        this.first.render(pushable);
        for (const [o, i] of this.rest) {
            pushable.push(" ", o, " ");
            i.render(pushable);
        }
        return pushable;
    }

    public toString() {
        return this.render([]).join("");
    }
}

export interface IMultiOpExprInst<
    E extends IXPathGrammar, O extends string, T extends MultiOperativeExpr<E, O> = MultiOperativeExpr<E, O>
> extends IChainOpExprInst<E, O, E, T> {
    readonly operators: O[];
    new(fst: E, rest: Array<[O, E]>): T;
}

export abstract class MultiOperativeExpr<
    E extends IXPathGrammar, O extends string,
> extends ChainOperativeExpr<E, O, E> {

    protected static parseOp<
        E extends IXPathGrammar, O extends string,
        T extends MultiOperativeExpr<E, O> = MultiOperativeExpr<E, O>,
        C extends IMultiOpExprInst<E, O, T> = IMultiOpExprInst<E, O, T>
    >(
        clss: C,
        childClss: IXPathParser<E>,
        tokens: string[],
        usedTokens: number,
    ) {
        return ChainOperativeExpr.parseChain<E, O, E, T>(clss, childClss, childClss, tokens, usedTokens);
    }
}
