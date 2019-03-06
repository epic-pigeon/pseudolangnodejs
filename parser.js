class Operator {
    type; // 0 - unary, 1 - binary
    precedence;
    action;
    name;
    constructor(name, action, type, precedence) {
        this.name = name;
        this.action = action;
        this.type = type;
        this.precedence = precedence;
    }
}

class Variable {
    type;
    value;
    constructor(value = undefined, type = 'any') {
        this.value = value;
        this.type = type;
    }
}

class Environment {
    operators = [];
    variables = [];
    types = [];
    __defaultOperators = [];
    __defaultVariables = [];
    __defaultTypes = [];
    constructor(operators = this.__defaultOperators, variables = this.__defaultVariables, types = this.__defaultTypes) {
        this.operators = operators;
        this.variables = variables;
        this.types = types;
    }
    addOperator(operator = new Operator()) {
        this.operators.push(operator);
        return this;
    }
    addVariable(variable = new Variable()) {
        this.variables.push(variable);
        return this;
    }
    addType()
}

class PseudoLangParser {
    parse = function (code = "", environment = new Environment()) {

    }
}

module.exports = PseudoLangParser;