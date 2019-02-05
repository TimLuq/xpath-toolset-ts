import { Biggie, IBiggie } from "./biggie";

export class Decie {
    private static normalizePrecision(a: Decie, b: Decie): [number, IBiggie, IBiggie] {
        if (a.precision === b.precision) {
            return [a.precision, a.integer, b.integer];
        }
        if (a.precision > b.precision) {
            return [a.precision, a.integer, b.integer.mul(Biggie.magnitude(b.precision - a.precision))];
        }
        if (a.precision < b.precision) {
            return [b.precision, a.integer.mul(Biggie.magnitude(b.precision - a.precision)), b.integer];
        }
        throw new Error("comp `normalizePrecision`");
    }

    public readonly integer: IBiggie;
    public readonly precision: number;

    public get isBiggie(): true { return true; }

    constructor(value: string);
    constructor(value: bigint | IBiggie, precision?: number);
    constructor(value: number, precision: number);
    constructor(value: string | number | bigint | IBiggie, precision?: number) {
        // tslint:disable-next-line:no-bitwise
        precision = Math.max((precision || 0) | 0, 0);
        let intval: IBiggie = Biggie.zero;
        if (typeof value === "string") {
            const f = value.charAt(0);
            const pos = value.indexOf(".");
            if (pos === -1) {
                intval = new Biggie(value);
                precision = 0;
            } else if (pos === 0) {
                intval = new Biggie(value.substring(1));
                precision = value.length - 1;
            } else {
                intval = new Biggie(value.substring(0, pos) + value.substring(pos + 1));
                precision = value.length - pos - 1;
            }
        } else if (typeof value === "object") {
            intval = value;
        } else if (typeof value === "bigint") {
            // tslint:disable-next-line:triple-equals
            if (value != intval.value) {
                intval = new Biggie(value);
            }
        } else if (value) {
            if (precision === 0) {
                intval = new Biggie(value);
            } else {
                const f = Math.round(value * Math.pow(10, precision));
                intval = new Biggie(f);
            }
        }
        this.integer = intval;
        this.precision = precision;
    }

    public add(val: number | Decie | IBiggie): Decie {
        if (typeof val !== "object") {
            val = new Decie(val.toString());
        }
        if (val instanceof Decie) {
            const [p, a, b] = Decie.normalizePrecision(this, val);
            return new Decie(a.add(b), p);
        }
        return new Decie(this.integer.add(val.mul(Biggie.magnitude(this.precision))), this.precision);
    }
    public sub(val: number | Decie | IBiggie): Decie {
        if (typeof val !== "object") {
            val = new Decie(val.toString());
        }
        if (val instanceof Decie) {
            const [p, a, b] = Decie.normalizePrecision(this, val);
            return new Decie(a.sub(b), p);
        }
        return new Decie(this.integer.sub(val.mul(Biggie.magnitude(this.precision))), this.precision);
    }
    public mul(val: number | Decie | IBiggie): Decie {
        if (typeof val !== "object") {
            val = new Decie(val.toString());
        }
        if (val instanceof Decie) {
            const [p, a, b] = Decie.normalizePrecision(this, val);
            return new Decie(a.mul(b), p + p).trimPrecision();
        }
        return new Decie(this.integer.mul(val), this.precision);
    }
    public idiv(val: number | Decie | IBiggie): IBiggie {
        if (typeof val !== "object") {
            val = new Decie(val.toString());
        }
        if (val instanceof Decie) {
            const [_, a, b] = Decie.normalizePrecision(this, val);
            return a.idiv(b);
        }
        return this.integer.idiv(val.mul(Biggie.magnitude(this.precision)));
    }
    public div(val: number | Decie | IBiggie, precision?: number): Decie {
        if (typeof val !== "object") {
            val = new Decie(val.toString());
        }
        if (!(val instanceof Decie)) {
            val = new Decie(val);
        }
        const [p, a, b] = Decie.normalizePrecision(this, val);
        let rem = a.mod(b);
        let v = a.idiv(b);
        if (typeof precision !== "number" || precision < 0 || isNaN(precision)) {
            precision = Math.max(p, 24);
        }
        let pr = p;
        for (let i = p; i < precision && rem.value !== Biggie.zero.value; i++) {
            const nxt = rem.mul(10);
            rem = nxt.mod(b);
            v = v.mul(10).add(nxt.idiv(b));
            pr++;
        }
        const [tr, ev] = v.trimRightZero(pr);
        pr -= tr;
        return new Decie(ev, pr);
    }
    public mod(val: number | Decie | IBiggie): Decie {
        if (typeof val !== "object") {
            val = new Decie(val.toString());
        }
        if (!(val instanceof Decie)) {
            val = new Decie(val);
        }
        const [p, a, b] = Decie.normalizePrecision(this, val);
        const [tr, ev] = a.mod(b).trimRightZero(p);
        return new Decie(ev, p - tr);
    }

    public round(val?: number): Decie {
        // tslint:disable-next-line:no-bitwise
        val = Math.round(val || 0);
        if (val === this.precision) {
            return this;
        }
        if (val > this.precision) {
            return new Decie(this.integer.mul(Biggie.magnitude(val - this.precision)), val);
        }
        const mag = Biggie.magnitude(this.precision - val - 1);
        let n = this.integer.idiv(mag);
        const rem = n.mod(10);
        n = n.idiv(10);
        if (rem.ge(5)) {
            n = n.add(1);
        }
        if (val < 0) {
            n = n.mul(Biggie.magnitude(-val));
            val = 0;
        }
        return new Decie(n, val);
    }
    public ceil(): Decie {
        if (this.precision === 0) {
            return this;
        }
        const mag = Biggie.magnitude(this.precision - 1);
        const o = this.integer.idiv(mag);
        const rem = o.mod(10);
        let n = o.idiv(10);
        // console.log("\n\n\nCeil: " + new Decie(o, 1) + " : " + n + " : " + rem + "\n\n\n");
        if (rem.gt(0)) {
            n = n.add(1);
        }
        return new Decie(n, 0);
    }
    public floor(): Decie {
        if (this.precision === 0) {
            return this;
        }
        return new Decie(this.toIntegral(), 0);
    }

    public trimPrecision(): Decie {
        if (!this.precision) {
            return this;
        }
        const [n, i] = this.integer.trimRightZero(this.precision);
        if (n === 0) {
            return this;
        }
        return new Decie(i, n);
    }

    public toIntegral(): IBiggie {
        return this.integer.idiv(Biggie.magnitude(this.precision));
    }
    public toDouble(): number {
        return this.integer.toDouble() / Math.pow(10, this.precision);
    }
    public toFixed(prec: number): string {
        const v = this.round(prec).toString();
        if (!prec) {
            return v.replace(/\.0$/, "");
        }
        return v;
    }
    public toString(): string {
        let s = this.integer.toString();
        while (s.length <= this.precision) {
            s = "0" + s;
        }
        const p = s.length - this.precision;
        return s.substring(0, p) + "." + (this.precision === 0 ? "0" : s.substring(p));
    }
}
