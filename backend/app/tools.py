import ast
import operator
import datetime

# Safe Math Evaluator using pure AST analysis (ZERO eval() usage)
_ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.Mod: operator.mod,
    ast.FloorDiv: operator.floordiv
}

def safe_eval_expression(expr: str) -> float:
    cleaned = expr.strip()
    if len(cleaned) > 100:
        raise ValueError("Expression exceeds max length of 100 characters")

    # Restrict power exponent magnitude to eliminate CPU locks
    if "**" in cleaned:
        parts = cleaned.split("**")
        for exponent in parts[1:]:
            cleaned_exp = exponent.split()[0].replace('(', '').replace(')', '')
            try:
                val = float(cleaned_exp)
                if val > 16:
                    raise ValueError("Exponents greater than 16 are disabled to protect host resources.")
            except ValueError as ve:
                if "Exponents greater than" in str(ve):
                    raise
                pass

    tree = ast.parse(cleaned, mode='eval')

    def _verify_depth(node, depth=0):
        if depth > 10:
            raise ValueError("Expression exceeds max AST complexity depth of 10.")
        for child in ast.iter_child_nodes(node):
            _verify_depth(child, depth + 1)

    _verify_depth(tree)

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError(f"Unsupported constant type: {type(node.value)}")
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            op_type = type(node.op)
            if op_type in _ALLOWED_OPERATORS:
                return _ALLOWED_OPERATORS[op_type](left, right)
            raise ValueError(f"Disallowed operator: {op_type}")
        elif isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            op_type = type(node.op)
            if op_type in _ALLOWED_OPERATORS:
                return _ALLOWED_OPERATORS[op_type](operand)
            raise ValueError(f"Disallowed unary operator: {op_type}")
        else:
            raise TypeError(f"Unsupported expression construct: {type(node)}")

    return float(_eval(tree))

def get_current_time(timezone_offset_hours: int = 0) -> str:
    tz = datetime.timezone(datetime.timedelta(hours=timezone_offset_hours))
    return datetime.datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S %Z")

def mock_web_search(query: str) -> str:
    # Deterministic offline knowledge base for robust demo evaluator testing
    q = query.lower()
    if "python" in q:
        return "Python was created by Guido van Rossum and released on February 20, 1991. The latest stable branch is 3.12/3.13."
    elif "ollama" in q:
        return "Ollama is an open-source framework designed to package, deploy, and run large language models locally using llama.cpp."
    elif "weather" in q:
        return "Current simulated conditions: 22°C, Sunny, Humidity 45%, Wind 10 km/h."
    elif "college" in q or "project" in q:
        return "Ollama LLM Tool College Project: A full-stack, secure, self-hosted LLM demonstration platform with tool execution and RAG."
    return f"Simulated Search Result: No live network queries permitted in offline evaluation sandbox for '{query}'. Context verified."

DEFINED_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Evaluate an arithmetic mathematical expression securely. Supports +, -, *, /, %, // and **.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Mathematical expression, e.g. '((250 * 4) / 10) + 15'"
                    }
                },
                "required": ["expression"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_time",
            "description": "Retrieve current time and date formatted as an ISO timestamp.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone_offset_hours": {
                        "type": "integer",
                        "description": "UTC offset in hours, e.g. 0 for UTC, 5 for UTC+5"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the local knowledge repository for facts, concepts, definitions, and events.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query keywords"
                    }
                },
                "required": ["query"]
            }
        }
    }
]

def execute_tool(name: str, args: dict) -> str:
    try:
        if name == "calculator":
            expr = str(args.get("expression", "0"))
            res = safe_eval_expression(expr)
            return str(res)
        elif name == "get_time":
            offset = int(args.get("timezone_offset_hours", 0))
            return get_current_time(offset)
        elif name == "web_search":
            query = str(args.get("query", ""))
            return mock_web_search(query)
        else:
            return f"Error: Tool '{name}' is not recognized."
    except Exception as e:
        return f"Tool Execution Failure: {str(e)}"
