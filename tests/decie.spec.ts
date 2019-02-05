
import test from "ava";

import { Decie } from "../src/helpers/decie";

test("validate basic Decie usage", (t) => {
    t.is(new Decie("123").toDouble(), 123);
    t.is(new Decie("0.1").toDouble(), 0.1);
    t.is(new Decie("3.14").toDouble(), 3.14);
    t.is(new Decie(3.14, 2).toDouble(), 3.14);
    t.is(new Decie(3.14, 2).toString(), "3.14");
    t.is(new Decie(3.14, 4).toString(), "3.1400");
    t.is(new Decie("0.0000100").toString(), "0.0000100");
    t.is(new Decie(0.00001, 7).toString(), "0.0000100");

    t.is(new Decie(1000.70001, 7).ceil().toFixed(0), "1001");
    t.is(new Decie(0.00001, 7).ceil().toFixed(0), "1");
    t.is(new Decie(-0.00001, 7).ceil().toFixed(0), "0");

    t.is(new Decie(0.00001, 7).round().toFixed(0), "0");
    t.is(new Decie(-0.00001, 7).round().toFixed(0), "0");
    t.is(new Decie(1000.70001, 7).round().toFixed(0), "1001");
    t.is(new Decie(1000.70500, 7).round(2).toString(), "1000.71");
    t.is(new Decie(1000.70490, 7).round(2).toString(), "1000.70");
});
