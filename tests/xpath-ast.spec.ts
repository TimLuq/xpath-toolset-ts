
import test from "ava";

import { XPath } from "../build/cjs/ast.js";

test("Basic xpath usage", (t) => {
    t.notThrows(() => {
        const [r] = XPath.parse("//book"); // [author/@name = 'Tolkien']/title;
        t.log(r);
    });
});
