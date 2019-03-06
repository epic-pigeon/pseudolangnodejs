let fs = require("fs");

function parseNumber (value) {
    if (parseFloat(value) == value) {
        return parseFloat(value);
    } else {
        return NaN;
    }
}

String.prototype.replaceAll = function (from, to) {
    return this.split(from).join(to);
};

function compare(val1, val2) {
    return JSON.stringify(val1) === JSON.stringify(val2);
}

Array.prototype.has = function (val, get_item_val = item => item) {
    let has = false;
    this.forEach(function (item) {
        if (compare(val, get_item_val(item))) {
            has = true;
        }
    });
    return has;
};

Array.prototype.split = function (separator) {
    let output = [];
    let arr = [];
    this.forEach((item) => {
        if (compare(item, separator)) {
            output.push(arr);
            arr = [];
        } else {
            arr.push(item);
        }
    });
    output.push(arr);
    return output;
};

function Variable(name) {
    this.name = name.value;
    this.value = undefined;
    this.type = "any";
    this.set = function (value) {
        if (value instanceof Variable) {
            value = value.value;
        } else if ((value instanceof Token) && (value.type.startsWith("VALUE_"))) {
            if (value.type === "VALUE_NUMBER")
                value = parseNumber(value.value);
            else
                value = value.value;
        }
        switch (this.type) {
            case "any":
                this.value = value;
                break;
            case "number":
                if (!isNaN(parseNumber(value))) {
                    //console.log(value);
                    this.value = parseNumber(value);
                    break;
                } else {
                    throw {message: "Invalid type"};
                }
            case "string":
                this.value = value + "";
                break;
            case "function":
                console.log(this);
                let func;
                try {
                    func = new Function(value + "");
                } catch (e) {
                    func = () => value;
                }
                this.value = func;
                break;
            case "boolean":
                this.value = !!value;
                break;
            default:
                throw {message: "Invalid type conversion"};
        }
    };
    this.setType = function (type) {
        //console.log(type);
        if (type.type === "TYPE") {
            type = type.value;
            this.type = type;
            if (this.value !== undefined) this.set(this.value);
        }
    };
    this.getValue = () => this.value;
}

function Token(type = "", value = "") {
    this.type = type;
    this.value = value;
    this.getValue = () => this.value;
}

function PseudoLangParser () {
    this.parse = function (filename) {
        let tokenizeCode = this.tokenizeCode;
        let self = this;
        return new Promise(function (resolve, reject) {
            fs.readFile(filename, 'utf8', function (err, data) {
                tokenizeCode(data, resolve, reject, self);
            });
        });
    };
    this.operators = [
        {
            "name": "=",
            "precedence": -1,
            "type": "binary",
            "action": function (variable, value) {
                //console.log(variable, value);
                if (variable instanceof Variable) {
                    variable.set(value);
                    return variable;
                } else {
                    variable = new Variable(variable);
                    variable.set(value);
                    return variable;
                }
            }
        },
        {
            "name": "+",
            "precedence": 0,
            "type": "binary",
            "action": function (value1, value2) {
                if (value1.getValue) value1 = value1.getValue();
                if (value2.getValue) value2 = value2.getValue();
                return value1 + value2;
            }
        },
        {
            "name": "-",
            "precedence": 0,
            "type": "binary",
            "action": function (value1, value2) {
                if (value1.getValue) value1 = value1.getValue();
                if (value2.getValue) value2 = value2.getValue();
                return value1 - value2;
            }
        },
        {
            "name": "*",
            "precedence": 1,
            "type": "binary",
            "action": function (value1, value2) {
                if (value1.getValue) value1 = value1.getValue();
                if (value2.getValue) value2 = value2.getValue();
                return value1 * value2;
            }
        },
        {
            "name": "/",
            "precedence": 1,
            "type": "binary",
            "action": function (value1, value2) {
                if (value1.getValue) value1 = value1.getValue();
                if (value2.getValue) value2 = value2.getValue();
                return value1 / value2;
            }
        },
        {
            "name": ":",
            "precedence": 100500,
            "type": "binary",
            "action": function (variable, type) {
                //console.log(variable, type);

                if (variable instanceof Variable) {
                    variable.setType(type);
                } else if (variable instanceof Token && variable.type === "TYPE") {
                    let value = type.getValue ? type.getValue() : type;
                    switch (variable.value) {
                        case "number":
                            if (!isNaN(parseNumber(value))) {
                                return new Token("VALUE_NUMBER", parseNumber(value));
                            } else {
                                throw {message: "Invalid type conversion"};
                            }
                        case "string":
                            return new Token("VALUE_STRING", value + "");
                        case "function":
                            let func;
                            try {
                                func = new Function(value + "");
                            } catch (e) {
                                func = () => value;
                            }
                            return new Token("VALUE_FUNCTION", func);
                        case "boolean":
                            return new Token("VALUE_BOOLEAN", !!value);
                    }
                } else if (variable instanceof Token && variable.type === "IDENTIFIER") {
                    //console.log(variable);
                    variable = new Variable(variable);
                    variable.setType(type);
                }
                return variable;
            }
        }
    ];
    this.functions = [
        {
            "name": "print",
            "num_args": 1,
            "action": function (...args) {
                args.forEach((arg) => {
                    console.log(typeof arg.getValue() === "string" ? '"' + arg.getValue() + '"' : arg.getValue());
                });
            }
        },
        {
            "name": "if",
            "num_args": 1,
            "action": function (arg) {
                if (arg && (!arg.getValue || arg.getValue())) {
                    console.log(true);
                } else {
                    console.log(false);
                }
            }
        }
    ];
    this.tokenizeCode = function (code, resolve, reject, self) {
        let operators = self.operators;
        let functions = self.functions;
        let tokens = [];
        code = code.replaceAll("{", " { ").replaceAll("}", " } ").replaceAll("(", " ( ").replaceAll(")", " ) ")
                   .replaceAll(":", " : ").replaceAll(";", " ; ").replaceAll("\n", " \n ").replaceAll("\\\\", " \\\\ ")
                   .replaceAll("\\*", " \\* ").replaceAll("*\\", " *\\ ");
        operators.forEach(function (item) {
            code = code.replaceAll(item.name, " " + item.name + " ");
        });
        code = code.trim();
        while (code.length > 0) {
            let token = new Token();
            if (code.match(/^"[^"]*"/i) || code.match(/^'[^']*'/i)) {
                token.type = "VALUE_STRING";
                token.value = token.value.slice(1, -1);
            }
        }
        /*
        code.trim().split(/[ \t\r,]+/).forEach(function (item) {
            let token = new Token("", item);
            if (item.match(/"[^"]*"/i) || item.match(/'[^']*'/i)) {
                token.type = "VALUE_STRING";
                token.value = token.value.slice(1, -1);
            } else if (item === "{") {
                token.type = "COMPOUND_STATEMENT_START";
            } else if (item === "}") {
                token.type = "COMPOUND_STATEMENT_END";
            } else if (item === "(") {
                token.type = "EXPRESSION_START";
            } else if (item === ")") {
                token.type = "EXPRESSION_END";
            } else if (item === ";") {
                token.type = "STATEMENT_END";
            } else if (item === "\n") {
                token.type = "NEW_LINE";
            } else if (item === "\\\\") {
                token.type = "SINGLE_LINE_COMMENT";
            } else if (item === "\\*") {
                token.type = "MULTILINE_COMMENT_START";
            } else if (item === "*\\") {
                token.type = "MULTILINE_COMMENT_END";
            } else if (item === "number" || item === "string" || item === "boolean" || item === "any" || item === "function") {
                token.type = "TYPE";
            } else if (item === "true" || item === "false") {
                token.type = "VALUE_BOOLEAN";
                token.value = item === "true";
            } else if (operators.has(item, item => item.name)) {
                token.type = "OPERATOR";
                let operator;
                operators.forEach((item) => {
                    if (item.name === token.value) {
                        operator = item;
                    }
                });
                if (operator) token.precedence = operator.precedence;
            } else if (item.match(/(\d+)(\.\d+)?/i)) {
                token.type = "VALUE_NUMBER";
            } else if (functions.has(item, item => item.name)) {
                token.type = "FUNCTION";
            } else {
                token.type = "IDENTIFIER";
            }
            tokens.push(token);
        });*/
        let parsed = [];
        let parseTokens = self.parseTokens;
        let rejected = false;
        //console.log(tokens, "\n", tokens.split({type: "STATEMENT_END", value: ";"}));
        let variables = [];
        tokens.split(new Token("STATEMENT_END", ";")).forEach((item) => {
            //console.log(item);
            if (!rejected) {
                try {
                    item.readNext = () => item.shift();
                    parsed.push(parseTokens(item, self, variables));
                } catch (e) {
                    rejected = true;
                    reject(e);
                }
            }
        });
        if (!rejected) resolve(parsed);
    };
    this.parseTokens = function (tokens, self, variables) {
        let token;
        let output = [], stack = [];
        let multiline_comment = false;
        let singleline_comment = false;
        while (token = tokens.readNext()) {
            if (multiline_comment) {
                if (token.type === "MULTILINE_COMMENT_END") {
                    multiline_comment = false;
                }
            } else if (singleline_comment) {
                if (token.type === "NEW_LINE") {
                    singleline_comment = false;
                }
            } else {
                if (token.type.startsWith("VALUE_") || token.type === "IDENTIFIER" || token.type === "TYPE") {
                    output.push(token);
                } else if (token.type === "FUNCTION" || (token.type === "IDENTIFIER" && ((token) => {
                    let func = false;
                    variables.forEach((item) => {
                        if (item.name === token.value) func = item;
                    });
                    return (func) && (typeof func.getValue() === "function");
                })(token))) {
                    token.type = "FUNCTION";
                    stack.push(token);
                } else if (token.type === "OPERATOR") {
                    while ((stack.length > 0) && (((stack[stack.length - 1].type === "FUNCTION") || ((stack[stack.length - 1].type === "OPERATOR") && (stack[stack.length - 1].precedence >= token.precedence)))
                          && (stack[stack.length - 1].type !== 'EXPRESSION_START'))) {
                        output.push(stack.pop());
                    }
                    stack.push(token);
                } else if (token.type === "EXPRESSION_START") {
                    stack.push(token);
                } else if (token.type === "EXPRESSION_END") {
                    while (stack[stack.length - 1].type !== "EXPRESSION_START") {
                        output.push(stack.pop());
                    }
                    if (stack.pop().type !== "EXPRESSION_START") throw {message: "Invalid expression"};
                } else if (token.type === "MULTILINE_COMMENT_START") {
                    multiline_comment = true;
                } else if (token.type === "SINGLE_LINE_COMMENT") {
                    singleline_comment = true;
                }
            }
        }
        return self.parsePNR(output.concat(stack.reverse()), self, variables);
        //return output.concat(stack.reverse());
    };
    this.parsePNR = function (pnr, self, variables) {
        let operators = self.operators;
        let functions = self.functions;
        let output = [];
        let prepareArgs = (args, variables) => {
            args.forEach((item, i) => {
                if (variables.has(item.value, item => item.name)) {
                    let variable;
                    variables.forEach((it) => {
                        if (it.name === item.value) {
                            variable = it;
                        }
                    });
                    args [i] = variable;
                }
            });
            return args;
        };
        pnr.forEach((token) => {
                if (token.type === "IDENTIFIER" || token.type.startsWith("VALUE_") || token.type === "TYPE") {
                    output.push(token);
                } else if (token.type === "OPERATOR") {
                    let operator;
                    operators.forEach((item) => {
                        if (item.name === token.value) operator = item;
                    });
                    if (operator) {
                        if (operator.type === "binary") {
                            let args = [];
                            for (let i = 0; i < 2; i++) args.push(output.pop());
                            args = args.reverse();
                            args = prepareArgs(args, variables);
                            let result = operator.action(...args);
                            output.push(result);
                            if (result instanceof Variable && !(variables.has(result.name, item => item.name))) variables.push(result);
                        }
                    }
                } else if (token.type === "FUNCTION") {
                    let func;
                    functions.forEach((item) => {
                        if (item.name === token.value) func = item;
                    });
                    if (func) {
                        let args = [];
                        for (let i = 0; i < func.num_args; i++) args.push(output.pop());
                        args = args.reverse();
                        args = prepareArgs(args, variables);
                        output.push(func.action(...args));
                    } else if (typeof token.getValue() === "function") {
                        let args = [];
                        for (let i = 0; i < token.getValue().length; i++) args.push(output.pop());
                        args = args.reverse();
                        args = prepareArgs(args, variables);
                        output.push(token.getValue()(...args));
                    }
                }
        });
        return output;
    }
}

module.exports = PseudoLangParser;