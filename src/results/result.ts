import { XPathFunctionValue } from "../functions/common";

export abstract class Result implements XPathResult {

    public static readonly ANY_TYPE: 0 = 0;
    public static readonly NUMBER_TYPE: 1 = 1;
    public static readonly STRING_TYPE: 2 = 2;
    public static readonly BOOLEAN_TYPE: 3 = 3;
    public static readonly UNORDERED_NODE_ITERATOR_TYPE: 4 = 4;
    public static readonly ORDERED_NODE_ITERATOR_TYPE: 5 = 5;
    public static readonly UNORDERED_NODE_SNAPSHOT_TYPE: 6 = 6;
    public static readonly ORDERED_NODE_SNAPSHOT_TYPE: 7 = 7;
    public static readonly ANY_UNORDERED_NODE_TYPE: 8 = 8;
    public static readonly FIRST_ORDERED_NODE_TYPE: 9 = 9;

    public static wrap(
        value: XPathFunctionValue,
        castType?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
        reuse?: Result,
    ): Result {
        // TODO
        throw new Error("Result.wrap is not implemented");
    }

    public readonly ANY_TYPE: 0 = 0;
    public readonly NUMBER_TYPE: 1 = 1;
    public readonly STRING_TYPE: 2 = 2;
    public readonly BOOLEAN_TYPE: 3 = 3;
    public readonly UNORDERED_NODE_ITERATOR_TYPE: 4 = 4;
    public readonly ORDERED_NODE_ITERATOR_TYPE: 5 = 5;
    public readonly UNORDERED_NODE_SNAPSHOT_TYPE: 6 = 6;
    public readonly ORDERED_NODE_SNAPSHOT_TYPE: 7 = 7;
    public readonly ANY_UNORDERED_NODE_TYPE: 8 = 8;
    public readonly FIRST_ORDERED_NODE_TYPE: 9 = 9;

    public abstract readonly booleanValue: boolean;
    public abstract readonly invalidIteratorState: boolean;
    public abstract readonly numberValue: number;
    public abstract readonly resultType: number;
    public abstract readonly singleNodeValue: Node;
    public abstract readonly snapshotLength: number;
    public abstract readonly stringValue: string;

    public abstract readonly extendedResultType: string;

    public abstract iterateNext(): Node;
    public abstract snapshotItem(index: number): Node;

    public abstract iterateAnyNext(): Node | Result | null;
    public abstract snapshotAnyItem(index: number): Node | Result | null;

}
