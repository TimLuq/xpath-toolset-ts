// tslint:disable:max-classes-per-file

// tslint:disable-next-line:interface-name
export interface IBiggie {
    readonly value: unknown;
    readonly isBiggie: true;

    add(val: number | IBiggie): IBiggie;
    sub(val: number | IBiggie): IBiggie;
    mul(val: number | IBiggie): IBiggie;
    idiv(val: number | IBiggie): IBiggie;
    mod(val: number | IBiggie): IBiggie;

    eq(val: number | IBiggie): boolean;
    ne(val: number | IBiggie): boolean;
    gt(val: number | IBiggie): boolean;
    ge(val: number | IBiggie): boolean;
    lt(val: number | IBiggie): boolean;
    le(val: number | IBiggie): boolean;
    sameSign(val: number | IBiggie): boolean;

    trimRightZero(max: number): [number, IBiggie];

    ilog10(): IBiggie;
    abs(): IBiggie;

    toDouble(): number;
    toString(): string;
}

// tslint:disable-next-line:interface-name
export interface BiggieContructor {
    readonly zero: IBiggie;
    new(value: string | number | bigint): IBiggie;
    magnitude(order: number | bigint | IBiggie): IBiggie;
}

let biggie: BiggieContructor;

if (typeof BigInt !== "undefined") {
    biggie = class Biggie implements IBiggie {
        public static readonly zero = undefined as any as Biggie;
        public static magnitude(val: number | bigint | IBiggie): Biggie {
            const v = BigInt(10);
            let r = BigInt(1);
            const st = Number(typeof val !== "object" ? val : val.value);
            if (st < 0) {
                throw new RangeError("Negative magnitudes are impossible to represent usin integers.");
            }
            for (let i = 0; i < st; i++) {
                r = r * v;
            }
            return new Biggie(r);
        }

        public readonly value: bigint;

        public get isBiggie(): true { return true; }

        constructor(value: string | number | bigint) {
            this.value = BigInt(value);
        }
        public add(val: number | IBiggie): Biggie {
            const bv = BigInt(typeof val !== "object" ? val : val.value);
            return new Biggie(this.value + bv);
        }
        public sub(val: number | IBiggie): Biggie {
            const bv = BigInt(typeof val !== "object" ? val : val.value);
            return new Biggie(this.value - bv);
        }
        public mul(val: number | IBiggie): Biggie {
            const bv = BigInt(typeof val !== "object" ? val : val.value);
            return new Biggie(this.value * bv);
        }
        public idiv(val: number | IBiggie): Biggie {
            const bv = BigInt(typeof val !== "object" ? val : val.value);
            return new Biggie(this.value / bv);
        }
        public mod(val: number | IBiggie): Biggie {
            const bv = BigInt(typeof val !== "object" ? val : val.value);
            return new Biggie(this.value % bv);
        }

        public eq(val: number | IBiggie): boolean {
            // tslint:disable-next-line:triple-equals
            return this.value == (typeof val === "object" ? val.value as bigint : val);
        }
        public ne(val: number | IBiggie): boolean {
            // tslint:disable-next-line:triple-equals
            return this.value != (typeof val === "object" ? val.value as bigint : val);
        }
        public gt(val: number | IBiggie): boolean {
            return this.value > (typeof val === "object" ? val.value as bigint : val);
        }
        public ge(val: number | IBiggie): boolean {
            return this.value >= (typeof val === "object" ? val.value as bigint : val);
        }
        public lt(val: number | IBiggie): boolean {
            return this.value < (typeof val === "object" ? val.value as bigint : val);
        }
        public le(val: number | IBiggie): boolean {
            return this.value <= (typeof val === "object" ? val.value as bigint : val);
        }
        public sameSign(val: number | IBiggie): boolean {
            const v = (typeof val === "object" ? val.value as bigint : val);
            return (this.value < 0) === (v < 0);
        }

        public trimRightZero(max: number): [number, Biggie] {
            if (this.value === Biggie.zero.value) {
                return [max, Biggie.zero];
            }
            const s = this.value.toString();
            const sl = s.length;
            let n = 0;
            for (let i = 1; i <= max; i++) {
                if (s[sl - i] === "0") {
                    n++;
                } else {
                    break;
                }
            }
            return [n, n === 0 ? this : this.idiv(Biggie.magnitude(n))];
        }

        public ilog10(): Biggie {
            if (this.value <= 0) {
                throw RangeError("Cannot take the logarithm for a negative or zero value.");
            }
            const b = BigInt(10);
            let v = this.value;
            let n = 0;
            while (v >= b) {
                n++;
                v = v / b;
            }
            if (n === 0) {
                return Biggie.zero;
            }
            return new Biggie(n);
        }
        public abs(): Biggie {
            if (this.value >= 0) {
                return this;
            }
            return new Biggie(-this.value);
        }

        public toDouble(): number {
            return Number(this.value);
        }
        public toString(): string {
            return this.value.toString();
        }
    };
    (biggie as any).zero = new biggie(0);
} else {
    throw new Error("BigInt fallback is not complete.");
    /*
    biggie = class Biggie implements IBiggie {
        public static readonly zero = new Biggie(0);
        public static magnitude(val: number | bigint | IBiggie): Biggie {
            const v = 10;
            let r = 1;
            const st = Number(typeof val !== "object" ? val : val.value);
            if (st < 0) {
                throw new RangeError("Negative magnitudes are impossible to represent usin integers.");
            }
            for (let i = 0; i < st; i++) {
                r = r * v;
            }
            return new Biggie(v);
        }

        private static parseString(src: string): [boolean, Uint32Array] {
            src = src.trim();
            const sign = src[0] !== "-" ? "" : "-";
            src = src[0] === "+" || src[1] === "-" ? src.substring(1) : src;
            const f2 = src.substring(0, 2);
            if (f2 === "0x") {
                return this.parseHex(sign + src.substring(2));
            }
            return this.parseDec(sign + src);
        }
        private static parseDec(src: string): [boolean, Uint32Array] {
            src = src.trim();
            const sign = src[0] !== "-" ? "" : "-";
            src = src[0] === "+" || src[1] === "-" ? src.substring(1) : src;
            let r = "";
            const per = src.indexOf(".");
            if (per !== -1) {
                src = src.substring(0, per);
            }
            do {
                const l = src.length;
                let rem: number = 0;
                let n: number = 0;
                for (let i = 0; i < l; i++) {
                    const c = src.charCodeAt(i);
                    if (c < 0x30 || c > 0x39) {
                        throw new RangeError("Invalid character in `parseDec`.");
                    }
                    let v = (c - 0x30) + rem * 10;
                    while (v >= 16) {
                        v -= 16;
                        n++;
                    }
                    rem = v;
                }
                r = rem.toString(16) + r;
                if (n === 0) {
                    return this.parseHex(sign + r);
                }
                src = n.toString();
            } while (true);
        }
        private static parseHex(s: string): [boolean, Uint32Array] {
            const b = s[0] !== "-";
            if (s[0] === "+" || s[1] === "-") {
                s = s.substring(1);
            }
            const l = s.length;
            // tslint:disable-next-line:no-bitwise
            const y = Math.ceil(l / 4);
            const r = new Uint32Array(y + 1);
            for (let i = y; i >= 0; i--) {
                const p = l - (i * 8);
                r[i] = parseInt(s.substring(Math.max(p, 0), p + 8) || "0", 16);
            }
            return [b, r];
        }
        private static parseNumber(n: number): [boolean, Uint32Array] {
            if (!Number.isInteger(n)) {
                n = Math.floor(n + 0.00001);
            }
            return this.parseHex(n.toString(16));
        }
        private static parseValue(
            n: number | IBiggie | string | bigint | [boolean, Uint32Array],
        ): [boolean, Uint32Array] {
            if (typeof n === "number") {
                return this.parseNumber(n);
            }
            if (typeof n === "object") {
                if (n instanceof Array) {
                    return n;
                }
                return n.value as [boolean, Uint32Array];
            }
            return this.parseString(n.toString());
        }

        private static subtract(a: Uint32Array, b: Uint32Array, t?: Uint32Array): [boolean, Uint32Array] {
            const al = a.length;
            const bl = b.length;
            const m = Math.max(al, bl);
            if (!t || t.length < al || t.length < bl) {
                t = new Uint32Array(m);
            } else {
                for (let ti = t.length - m - 1; ti >= 0; ti--) {
                    t[ti] = 0;
                }
            }
            const tl = t.length;
            let rem = 0;
            for (let y = 0; y < m; y++) {
                const av = y < al ? a[al - y] : 0;
                const bv = y < bl ? b[bl - y] : 0;
                let tv = 0;
                let n = 1;
                do {
                    // tslint:disable-next-line:no-bitwise
                    if ((bv & n) !== 0) {
                        rem++;
                    }
                    // tslint:disable-next-line:no-bitwise
                    let v = av & n;
                    if (v !== 0 && rem !== 0) {
                        rem--;
                        v = 0;
                    }
                    if (rem === 1) {
                        // tslint:disable-next-line:no-bitwise
                        v = (v ^ n) & n;
                    } else if (rem !== 0) {
                        rem = 1;
                    }
                    // tslint:disable-next-line:no-bitwise
                    tv = tv | v;
                // tslint:disable-next-line:no-conditional-assignment no-bitwise
                } while ((n = n << 1) !== 0);
                t[tl - y] = tv;
            }
        }

        public readonly value: [boolean, Uint32Array];

        public get isBiggie(): true { return true; }

        constructor(value: string | number | bigint | [boolean, Uint32Array]) {
            this.value = Biggie.parseValue(value);
        }
        public add(val: number | IBiggie): Biggie {
            const bv = Biggie.parseValue(val);
            return new Biggie(this.value + bv);
        }
        public sub(val: number | IBiggie): Biggie {
            const bv = Biggie.parseValue(val);
            return new Biggie(this.value - bv);
        }
        public mul(val: number | IBiggie): Biggie {
            const bv = Number(typeof val !== "object" ? val : val.value);
            return new Biggie(this.value * bv);
        }
        public idiv(val: number | IBiggie): Biggie {
            const bv = Number(typeof val !== "object" ? val : val.value);
            return new Biggie((this.value - (this.value % bv)) / bv);
        }
        public mod(val: number | IBiggie): Biggie {
            const bv = Number(typeof val !== "object" ? val : val.value);
            return new Biggie(this.value % bv);
        }

        public eq(val: number | IBiggie): boolean {
            // tslint:disable-next-line:triple-equals
            return this.value == (typeof val === "object" ? val.value : val);
        }
        public ne(val: number | IBiggie): boolean {
            // tslint:disable-next-line:triple-equals
            return this.value != (typeof val === "object" ? val.value : val);
        }
        public gt(val: number | IBiggie): boolean {
            return this.value > (typeof val === "object" ? val.value : val);
        }
        public ge(val: number | IBiggie): boolean {
            return this.value >= (typeof val === "object" ? val.value : val);
        }
        public lt(val: number | IBiggie): boolean {
            return this.value < (typeof val === "object" ? val.value : val);
        }
        public le(val: number | IBiggie): boolean {
            return this.value <= (typeof val === "object" ? val.value : val);
        }
        public sameSign(val: number | IBiggie): boolean {
            const v = (typeof val === "object" ? val.value : val);
            return (this.value < 0) === (v < 0);
        }

        public ilog10(): Biggie {
            if (this.value <= Biggie.zero.value) {
                throw RangeError("Cannot take the logarithm for a negative or zero value.");
            }
            const b = 10;
            let v = this.value;
            let n = 0;
            while (v >= b) {
                n++;
                v = v / b;
            }
            if (n === 0) {
                return Biggie.zero;
            }
            return new Biggie(n);
        }
        public abs(): Biggie {
            if (this.value >= 0) {
                return this;
            }
            return new Biggie(-this.value);
        }

        public toDouble(): number {
            return Number(this.value);
        }
        public toString(): string {
            return this.value.toFixed(0);
        }
    };
    */
}

export { biggie as Biggie };
