import { TEQName } from "../ast/xpath-ast";
import { NCName, TLiteral, StringLiteral, IntegerLiteral, DoubleLiteral, DecimalLiteral } from "../ast/xpath-literals";
import { Context } from "../evaluator/context";
import { DefaultTypeNamespace, defaultTypeNamespace } from "../types/common";

export type DefaultFnNamespace = "http://www.w3.org/2005/xpath-functions";
export const defaultFnNamespace: DefaultFnNamespace = "http://www.w3.org/2005/xpath-functions";

export type XPathBoolean = boolean;
export type EmptySequence = null;
export type XPathFunctionSingleton = TLiteral | NCName | TEQName | EmptySequence | XPathBoolean;
export type Sequence<T extends XPathFunctionValue = XPathFunctionSingleton | Sequence<any>>
    = EmptySequence | T[];
export type XPathFunctionValue = XPathFunctionSingleton | Sequence;
export type XV = XPathFunctionValue;

export type XF0 = (ctx: Context) => XV;
export type XF1<T1 extends XV = XV>
    = (ctx: Context, p1: T1) => XV;
export type XF2<T1 extends XV = XV, T2 extends XV = XV>
    = (ctx: Context, p1: T1, p2: T2) => XV;
export type XF3<T1 extends XV = XV, T2 extends XV = XV, T3 extends XV = XV>
    = (ctx: Context, p1: T1, p2: T2, p3: T3) => XV;
export type XF4<T1 extends XV = XV, T2 extends XV = XV, T3 extends XV = XV, T4 extends XV = XV>
    = (ctx: Context, p1: T1, p2: T2, p3: T3, p4: T4) => XV;
export type XFN<T1 extends XV = XV, T2 extends XV = XV, T3 extends XV = XV, T4 extends XV = XV, TN extends XV = XV>
    = (ctx: Context, p1: T1, p2: T2, p3: T3, p4: T4, ...rest: TN[]) => XV;

export type FnTyped = [string, string, XV];

export type FnString = [DefaultTypeNamespace, "string", StringLiteral];
export const xsString = [defaultTypeNamespace, "string"];

export type FnNumeric = [DefaultTypeNamespace, "numeric", IntegerLiteral | DoubleLiteral | DecimalLiteral];
export const xsNumeric = [defaultTypeNamespace, "numeric"];
export type FnInteger = [DefaultTypeNamespace, "integer", IntegerLiteral];
export const xsInteger = [defaultTypeNamespace, "integer"];
export type FnDouble = [DefaultTypeNamespace, "double", DoubleLiteral];
export const xsDouble = [defaultTypeNamespace, "double"];
export type FnFloat = [DefaultTypeNamespace, "float", DoubleLiteral];
export const xsFloat = [defaultTypeNamespace, "float"];
export type FnDecimal = [DefaultTypeNamespace, "decimal", DecimalLiteral];
export const xsDecimal = [defaultTypeNamespace, "decimal"];
export type FnBoolean = [DefaultTypeNamespace, "boolean", true | false];
export const xsBoolean = [defaultTypeNamespace, "boolean"];

const defCache: { [t: string]: [string, string]; } = {};
const typCache: { [ns: string]: { [t: string]: [string, string]; }; } = {
    [defaultTypeNamespace]: defCache,
};
export function defType(t: string) {
    if (!defCache.hasOwnProperty(t)) {
        defCache[t] = [defaultTypeNamespace, t];
    }
    return defCache[t];
}

const seqCache: { [ns: string]: { [t: string]: [string, string]; }; } = {};
export function seqOf([ns, ln]: [string, string]) {
    if (!seqCache.hasOwnProperty(ns)) {
        seqCache[ns] = {};
    }
    const p = seqCache[ns];
    if (!p.hasOwnProperty(ns)) {
        p[ln] = [ns, ln.replace(/[\*\?]/g, "") + "*"];
    }
    return p[ln];
}

const optCache: { [ns: string]: { [t: string]: [string, string]; }; } = {};
export function optOf([ns, ln]: [string, string]) {
    if (!optCache.hasOwnProperty(ns)) {
        optCache[ns] = {};
    }
    const p = optCache[ns];
    if (!p.hasOwnProperty(ns)) {
        p[ln] = [ns, ln.replace(/[\*\?]/g, "") + "?"];
    }
    return p[ln];
}

export function defSeq(t: string) {
    return seqOf(defType(t));
}

export function defOpt(t: string) {
    return optOf(defType(t));
}

export interface IFn<
    P extends Array<[string, string]>,
    R extends [string, string],
    A extends number,
    F extends (ctx: Context, ...args: XV[]) => XV
> { ptypes: P; rtype: R; a: A; f: F; }

export type Fn0<R extends FnTyped = FnTyped> = IFn<
    [],
    [R[0], R[1]],
    0,
    (ctx: Context) => R[2]
>;

export type Fn1<P1 extends FnTyped, R extends FnTyped = FnTyped> = IFn<
    [[P1[0], P1[1]]],
    [R[0], R[1]],
    1,
    (ctx: Context, p1: P1[2]) => R[2]
>;

export type Fn2<P1 extends FnTyped, P2 extends FnTyped, R extends FnTyped = FnTyped> = IFn<
    [[P1[0], P1[1]], [P2[0], P2[1]]],
    [R[0], R[1]],
    2,
    (ctx: Context, p1: P1[2], p2: P2[2]) => R[2]
>;

export type Fn3<P1 extends FnTyped, P2 extends FnTyped, P3 extends FnTyped, R extends FnTyped = FnTyped> = IFn<
    [[P1[0], P1[1]], [P2[0], P2[1]], [P3[0], P3[1]]],
    [R[0], R[1]],
    3,
    (ctx: Context, p1: P1[2], p2: P2[2], p3: P3[2]) => R[2]
>;

export type Fn4<
    P1 extends FnTyped, P2 extends FnTyped, P3 extends FnTyped, P4 extends FnTyped, R extends FnTyped = FnTyped
> = IFn<
    [[P1[0], P1[1]], [P2[0], P2[1]], [P3[0], P3[1]], [P4[0], P4[1]]],
    [R[0], R[1]],
    4,
    (ctx: Context, p1: P1[2], p2: P2[2], p3: P3[2], p4: P4[2]) => R[2]
>;

export type FnN<
    P1 extends FnTyped, P2 extends FnTyped, P3 extends FnTyped, P4 extends FnTyped, R extends FnTyped = FnTyped
> = IFn<
    [[P1[0], P1[1]], [P2[0], P2[1]], [P3[0], P3[1]], [P4[0], P4[1]]],
    [R[0], R[1]],
    number,
    (ctx: Context, p1: P1[2], p2: P2[2], p3: P3[2], p4: P4[2]) => R[2]
>;

export type XPathFunction<
    F extends (ctx: Context, ...args: any[]) => XV = (ctx: Context, ...args: any[]) => XV
> = IFn<
    Array<[string, string]>, [string, string], number, F
>;
