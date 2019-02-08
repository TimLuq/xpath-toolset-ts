
// tslint:disable:max-classes-per-file

export class XPathError<C extends string = string> extends Error {
    public constructor(public code: C, message: string) {
        super(message);
    }
}

export class XPathParseError<C extends string = string> extends XPathError<C> {
    public constructor(code: C, message: string, public tokens?: string[], public token?: number) {
        super(code, message);
    }
}

export class XPathUnexpectedTokenError extends XPathParseError<"parse-token"> {
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

export interface IXPathGrammar<SyntaxType extends string> {
    readonly syntaxType: SyntaxType;
    /**
     * Push the tokens for this expression to an object.
     * @template T
     * @param {T} pushable the object to `push` to
     * @returns {T}
     */
    render<T extends IPushable>(pushable: T): T;
}

export interface IXPathParser<S extends string, E extends IXPathGrammar<S> = IXPathGrammar<S>> {
    parse(tokens: string[], usedTokens: number): [E, number];
}

export interface ISingleOpExprInst<
    S extends string,
    L extends IXPathGrammar<string>, R extends IXPathGrammar<string>,
    T extends SingleOperativeExpr<S, L, R> = SingleOperativeExpr<S, L, R>,
> {
    readonly operator: string[];
    new(left: L, op?: null, right?: null): T;
    new(left: L, op: string[], right: R): T;
    parseLeft(tokens: string[], usedTokens: number): [L, number];
    parseRight(tokens: string[], usedTokens: number): [R, number];
}

export abstract class SingleOperativeExpr<
    S extends string,
    E extends IXPathGrammar<string>, R extends IXPathGrammar<string>,
> implements IXPathGrammar<S> {

    protected static parseSingleOp<
        S extends string,
        L extends IXPathGrammar<string>, R extends IXPathGrammar<string>,
        T extends SingleOperativeExpr<S, L, R> = SingleOperativeExpr<S, L, R>,
        C extends ISingleOpExprInst<S, L, R> = ISingleOpExprInst<S, L, R>
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
    public abstract readonly syntaxType: S;

    public constructor(
        public first: E,
        public operator?: string[] | null,
        public right?: R | null,
    ) {}

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
    S extends string,
    E extends IXPathGrammar<string>, O extends string, T extends UnaryOpExpr<S, E, O> = UnaryOpExpr<S, E, O>
> {
    readonly operator: O;
    new(fst: E, op?: O | null): T;
}

abstract class UnaryOpExpr<
    S extends string,
    E extends IXPathGrammar<string>,
    O extends string
> implements IXPathGrammar<S> {
    public abstract readonly syntaxType: S;
    public abstract render<T extends IPushable>(pushable: T): T;

    public toString() {
        return this.render([]).join("");
    }
}

export abstract class FollowingUnaryOpExpr<
    S extends string,
    E extends IXPathGrammar<string>,
    O extends string
> extends UnaryOpExpr<S, E, O> {

    protected static parseFollowing<
        E extends IXPathGrammar<string>, O extends string,
        T extends FollowingUnaryOpExpr<string, E, O> = FollowingUnaryOpExpr<string, E, O>,
        C extends IUnaryOpExprInst<string, E, O> = IUnaryOpExprInst<string, E, O, T>
    >(
        clss: C,
        childClss: IXPathParser<string, E>,
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

    public abstract readonly syntaxType: S;
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

export abstract class LeadingUnaryOpExpr<
    S extends string,
    E extends IXPathGrammar<S>,
    O extends string
> extends UnaryOpExpr<S, E, O> {

    protected static parseLeading<
        E extends IXPathGrammar<string>, O extends string,
        T extends LeadingUnaryOpExpr<string, E, O> = LeadingUnaryOpExpr<string, E, O>,
        C extends IUnaryOpExprInst<string, E, O, T> = IUnaryOpExprInst<string, E, O, T>
    >(
        clss: C,
        childClss: IXPathParser<E["syntaxType"], E>,
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
    X extends true | false,
    L extends IXPathGrammar<string>, O extends string, R extends IXPathGrammar<string>,
    T extends ChainOperativeExpr<string, L, O, R> = ChainOperativeExpr<string, L, O, R>,
> {
    readonly collapse: X;
    readonly operators: O[];
    new(fst: L, rest: Array<[O, R]>): T;
}

export abstract class ChainOperativeExpr<
    S extends string,
    L extends IXPathGrammar<string>, O extends string, R extends IXPathGrammar<string>,
> implements IXPathGrammar<S> {

    protected static parseChain<
        L extends IXPathGrammar<string>, O extends string, R extends IXPathGrammar<string>,
        T extends ChainOperativeExpr<string, L, O, R> = ChainOperativeExpr<string, L, O, R>,
        C extends IChainOpExprInst<true, L, O, R, T> = IChainOpExprInst<true, L, O, R, T>,
    >(
        clss: C,
        leftClss: IXPathParser<L["syntaxType"], L>,
        restClss: IXPathParser<R["syntaxType"], R>,
        tokens: string[],
        usedTokens: number,
    ): [T | L, number];
    protected static parseChain<
        L extends IXPathGrammar<string>, O extends string, R extends IXPathGrammar<string>,
        T extends ChainOperativeExpr<string, L, O, R> = ChainOperativeExpr<string, L, O, R>,
        C extends IChainOpExprInst<false, L, O, R, T> = IChainOpExprInst<false, L, O, R, T>,
    >(
        clss: C,
        leftClss: IXPathParser<L["syntaxType"], L>,
        restClss: IXPathParser<R["syntaxType"], R>,
        tokens: string[],
        usedTokens: number,
    ): [T, number];
    protected static parseChain<
        L extends IXPathGrammar<string>, O extends string, R extends IXPathGrammar<string>,
        T extends ChainOperativeExpr<string, L, O, R> = ChainOperativeExpr<string, L, O, R>,
        C extends IChainOpExprInst<boolean, L, O, R, T> = IChainOpExprInst<boolean, L, O, R, T>,
    >(
        clss: C,
        leftClss: IXPathParser<L["syntaxType"], L>,
        restClss: IXPathParser<R["syntaxType"], R>,
        tokens: string[],
        usedTokens: number,
    ): [T | L, number] {
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

        if (clss.collapse && r.length === 0) {
            return [fst, tail];
        }

        return [new clss(fst, r), tail] as [T, number];
    }

    public abstract readonly syntaxType: S;
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
    X extends true | false,
    E extends IXPathGrammar<string>,
    O extends string,
    T extends MultiOperativeExpr<string, E, O> = MultiOperativeExpr<string, E, O>
> extends IChainOpExprInst<X, E, O, E, T> {}

export abstract class MultiOperativeExpr<
    S extends string,
    E extends IXPathGrammar<string>, O extends string,
> extends ChainOperativeExpr<S, E, O, E> {

    protected static parseOp<
        E extends IXPathGrammar<string>, O extends string,
        T extends MultiOperativeExpr<string, E, O> = MultiOperativeExpr<string, E, O>,
        C extends IMultiOpExprInst<true, E, O, T> = IMultiOpExprInst<true, E, O, T>
    >(
        clss: C,
        childClss: IXPathParser<E["syntaxType"], E>,
        tokens: string[],
        usedTokens: number,
    ): [T | E, number];
    protected static parseOp<
        E extends IXPathGrammar<string>, O extends string,
        T extends MultiOperativeExpr<string, E, O> = MultiOperativeExpr<string, E, O>,
        C extends IMultiOpExprInst<false, E, O, T> = IMultiOpExprInst<false, E, O, T>
    >(
        clss: C,
        childClss: IXPathParser<E["syntaxType"], E>,
        tokens: string[],
        usedTokens: number,
    ): [T, number];
    protected static parseOp<
        E extends IXPathGrammar<string>, O extends string,
        T extends MultiOperativeExpr<string, E, O> = MultiOperativeExpr<string, E, O>,
        C extends IMultiOpExprInst<true | false, E, O, T> = IMultiOpExprInst<true | false, E, O, T>
    >(
        clss: C,
        childClss: IXPathParser<E["syntaxType"], E>,
        tokens: string[],
        usedTokens: number,
    ): [T | E, number] {
        return ChainOperativeExpr.parseChain<E, O, E, T>(clss as any, childClss, childClss, tokens, usedTokens);
    }
}
