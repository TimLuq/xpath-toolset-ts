
import test from "ava";

import { Biggie } from "../src/helpers/biggie";

test("validate Biggie static functions", (t) => {
    t.is(Number(Biggie.magnitude(0)), 1);
    t.is(Number(Biggie.magnitude(3)), 1000);
});

test("validate basic Biggie usage", (t) => {
    t.is(new Biggie("123").toDouble(), 123);

    const b456 = new Biggie(456);
    t.is(b456.toDouble(), 456);
    t.is(b456.mul(2).toDouble(), 912);
    t.is(b456.mul(new Biggie(2)).toDouble(), 912);
    t.is(b456.idiv(2).toDouble(), 228);

    const b10001000 = new Biggie("10001000");
    t.deepEqual(b10001000.trimRightZero(2), [2, new Biggie("100010")]);
    t.deepEqual(b10001000.trimRightZero(5), [3, new Biggie("10001")]);

    t.is(new Biggie(9007199254740991).add(1).add(1).toString(), "9007199254740993");
});
