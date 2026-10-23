import pytest
from app.tools import safe_eval_expression, execute_tool

def test_safe_math_arithmetic():
    assert safe_eval_expression("2 + 2") == 4.0
    assert safe_eval_expression("10 * 5 - (8 / 2)") == 46.0
    assert safe_eval_expression("2 ** 3") == 8.0

def test_safe_math_security_rejections():
    with pytest.raises(Exception):
        safe_eval_expression("__import__('os').system('ls')")
    with pytest.raises(Exception):
        safe_eval_expression("open('/etc/passwd').read()")
    with pytest.raises(ValueError):
        safe_eval_expression("2 ** 100") # Exponent bound failure

def test_tool_execution_dispatch():
    res = execute_tool("calculator", {"expression": "25 * 4"})
    assert res == "100.0"

    time_res = execute_tool("get_time", {"timezone_offset_hours": 0})
    assert "UTC" in time_res or ":" in time_res

    search_res = execute_tool("web_search", {"query": "python"})
    assert "Guido van Rossum" in search_res
