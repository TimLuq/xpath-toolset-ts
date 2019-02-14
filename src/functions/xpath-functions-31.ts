import { Context } from "../evaluator/context";
import { defOpt, defSeq, defType, Sequence, XPathFunction } from "./common";

const funcs = {
    "sum": {
        a: 1,
        ptypes: [defSeq("anyAtomicType")],
        rtype: defType("anyAtomicType"),
        f(
            c: Context,
            target: Sequence<any>,
        ) {
            return null; // TODO
        },
    },
    "sum#2": {
        a: 2,
        ptypes: [defSeq("anyAtomicType"), defOpt("anyAtomicType")],
        rtype: defType("anyAtomicType"),
        f(
            c: Context,
            target: Sequence<any>,
        ) {
            return null; // TODO
        },
    },
};

export default funcs as { [nameArity: string]: XPathFunction; };
