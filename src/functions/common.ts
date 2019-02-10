import { TEQName } from "../ast/xpath-ast";
import { NCName, TLiteral } from "../ast/xpath-literals";
import { Context } from "../evaluator/context";

export const fnNamespace = "";

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

export type XPathFunction = XF0 | XF1 | XF2 | XF3 | XF4 | XFN;
