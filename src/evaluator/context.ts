import { XPathFunction, XPathFunctionValue } from "../functions/common";

export class Context implements XPathNSResolver {
    protected readonly functions: { [func: string]: XPathFunction; };
    protected readonly variables: { [func: string]: XPathFunctionValue; };

    public constructor(public resolver: XPathNSResolver) {
        const r = resolver as Context;
        this.functions = r.functions && typeof r.functions === "object" ? Object.create(r.functions) : {};
        this.variables = r.variables && typeof r.variables === "object" ? Object.create(r.variables) : {};
    }
    public lookupNamespaceURI(prefix: string): string | null {
        return this.resolver.lookupNamespaceURI(prefix);
    }
    public lookupFunction(ns: string, name: string, arity: number): XPathFunction | undefined {
        const qn = "Q{" + ns + "}" + name;
        return this.functions[qn + "#" + arity] || this.functions[qn];
    }
    public lookupVariable(ns: string, name: string): XPathFunctionValue | undefined {
        const qn = "Q{" + ns + "}" + name;
        return this.variables[qn];
    }
    public defineFunction(ns: string, name: string, func: XPathFunction, arity?: number) {
        if (name.indexOf("#") === -1) {
            name += "#" + (typeof arity === "number" && !isNaN(arity) ? arity : func.length - 1);
        }
        this.functions["Q{" + ns + "}" + name] = func;
    }
    public defineVariable(ns: string, name: string, value: XPathFunctionValue) {
        this.variables["Q{" + ns + "}" + name] = value;
    }
    public derive(): Context {
        return new Context(this);
    }
}
