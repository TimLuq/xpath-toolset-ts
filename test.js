// require("./tests/_register.js");
// require("./tests/xpath-ast.spec.ts");
const { XPath } = require("./build/cjs/ast.js");

const r = XPath.parse("//book[1]/title");
console.log(JSON.stringify(r, undefined, 2));
console.log(r[0].render([]));
