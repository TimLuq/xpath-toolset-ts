const defaultNamespaces: { [ns: string]: string; } = {

};

const defaultResolver = {
    lookupNamespaceURI(prefix: string): string | null {
        return defaultNamespaces[prefix] || null;
    },
} as XPathNSResolver;

export class Resolver implements XPathNSResolver {

    protected readonly nodeResolver?: Node;
    protected readonly funcResolver?: (prefix: string) => string | null;
    public constructor(nodeResolver?: Node | ((prefix: string) => string | null) | null) {
        this.nodeResolver = nodeResolver && typeof (nodeResolver as Node).nodeType === "number"
            ? nodeResolver as Node : undefined;
        this.funcResolver = nodeResolver && typeof (nodeResolver as Node) === "function"
            ? nodeResolver as (prefix: string) => string | null : undefined;
    }
    public lookupNamespaceURI(prefix: string): string | null {
        return (this.nodeResolver && this.lookupNamespaceURIForNode(prefix, this.nodeResolver))
            || (this.funcResolver && this.funcResolver(prefix))
            || defaultResolver.lookupNamespaceURI(prefix);
    }

    protected lookupNamespaceURIForNode(prefix: string, node?: Node | null) {
        while (node) {
            if (node.nodeType === 1) {
                const uri = (node as Element).getAttribute(prefix ? "xmlns:" + prefix : "xmlns");
                if (uri) {
                    return uri;
                }
            }
            node = node.parentNode;
        }
    }
}
