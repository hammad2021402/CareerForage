"""
/code/execute — Judge0 CE with React/JSX support.
- Accepts 'input' field from frontend (was 'stdin')
- Transforms React JSX to runnable Node.js for practice tests
"""
import os, re, json, time, base64
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")
JUDGE0_OPEN_URL = "https://ce.judge0.com"
JUDGE0_RAPID_URL = "https://judge0-ce.p.rapidapi.com"

LANGUAGE_ID_MAP = {
    "javascript": 63,
    "typescript": 74,
    "python":     71,
    "java":       62,
    "cpp":        54,
    "c":          50,
}


class TestCase(BaseModel):
    model_config = {"extra": "allow"}   # accept unknown fields from frontend

    id: Optional[str] = None
    description: Optional[str] = None
    stdin: Optional[str] = None
    input: Optional[str] = None         # frontend sends 'input', not 'stdin'
    expected_output: Optional[str] = None

    def get_input(self) -> str:
        return (self.input or self.stdin or "").strip()


class CodeRequest(BaseModel):
    model_config = {"extra": "allow"}

    language: str
    code: str
    stdin: Optional[str] = None
    test_cases: Optional[List[TestCase]] = None


# ── Judge0 ────────────────────────────────────────────────────────────────────

def _judge0_headers():
    h = {"Content-Type": "application/json"}
    if JUDGE0_API_KEY:
        h["X-RapidAPI-Key"] = JUDGE0_API_KEY
        h["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com"
    return h


def _run_judge0(language: str, code: str, stdin: str = "") -> dict:
    lang_id = LANGUAGE_ID_MAP.get(language.lower(), 63)
    base_url = JUDGE0_RAPID_URL if JUDGE0_API_KEY else JUDGE0_OPEN_URL
    payload = {
        "source_code": base64.b64encode(code.encode()).decode(),
        "language_id": lang_id,
        "stdin": base64.b64encode(stdin.encode()).decode() if stdin else "",
        "base64_encoded": True,
    }
    try:
        r = requests.post(f"{base_url}/submissions?base64_encoded=true&wait=false",
                          json=payload, headers=_judge0_headers(), timeout=15)
        r.raise_for_status()
        token = r.json().get("token")
        if not token:
            raise HTTPException(502, "Judge0 returned no token")

        for _ in range(20):
            time.sleep(0.5)
            r2 = requests.get(f"{base_url}/submissions/{token}?base64_encoded=true",
                              headers=_judge0_headers(), timeout=10)
            r2.raise_for_status()
            result = r2.json()
            if result.get("status", {}).get("id", 0) >= 3:
                break

        def dec(v):
            if not v: return ""
            try: return base64.b64decode(v).decode("utf-8", errors="replace")
            except: return str(v)

        return {
            "stdout": dec(result.get("stdout")),
            "stderr": dec(result.get("stderr")) or dec(result.get("compile_output")),
            "exit_code": result.get("exit_code") or 0,
        }
    except HTTPException:
        raise
    except requests.RequestException as exc:
        raise HTTPException(502, f"Code execution error: {exc}") from exc


# ── React transformer ─────────────────────────────────────────────────────────

def _is_react(code: str) -> bool:
    return bool(re.search(r"from\s+['\"]react['\"]", code, re.IGNORECASE))


def _build_react_js(user_code: str, test_input: str) -> str:
    """
    Convert a React JSX component to plain Node.js that tests state logic.

    Strategy:
    1. Work line-by-line — much more reliable than regex on JSX
    2. Skip lines that are `import`, `export default`, or pure JSX
    3. Transform `const [x, setX] = useState(v)` → module-level let + setter
    4. Keep arrow-function handlers (increment/decrement/reset/etc.)
    5. Append a natural-language test runner
    """
    lines = user_code.splitlines()

    # ── Pass 1: collect only the "logic" lines ────────────────────────────────
    in_jsx_block = False   # True once we hit 'return ('
    brace_depth = 0        # track {} inside non-JSX code
    in_component = False   # True once we enter the component function body
    logic_lines = []

    for line in lines:
        stripped = line.strip()

        # Skip imports and export default
        if re.match(r'import\s+', stripped) or re.match(r'export\s+default', stripped):
            continue

        # Detect component function start: function Counter() {
        if re.match(r'function\s+[A-Z]\w*\s*\(', stripped) and not in_component:
            in_component = True
            brace_depth = 0
            continue   # skip the function declaration line itself

        if not in_component:
            continue

        # Track brace depth (but not once we're inside JSX return block)
        if not in_jsx_block:
            brace_depth += stripped.count('{') - stripped.count('}')

        # Detect start of JSX return block
        if re.match(r'return\s*\(', stripped) or re.match(r'return\s*<', stripped):
            in_jsx_block = True
            continue

        # Detect end of component function (when we're not in JSX and depth hits 0/-1)
        if not in_jsx_block and brace_depth <= 0 and '}' in stripped:
            break   # end of component

        # Skip JSX lines (lines that start with < or end the return block)
        if in_jsx_block:
            # Close of return block: bare ')' or ');'
            if re.match(r'^\s*\)\s*;?\s*$', line):
                in_jsx_block = False
            continue

        # Skip lines that are just closing braces of the component
        if stripped in ('}', '};'):
            continue

        logic_lines.append(line)

    logic = "\n".join(logic_lines).strip()

    # ── Pass 2: transform useState calls ─────────────────────────────────────
    # const [count, setCount] = useState(0);
    # → var count = 0;
    #   function setCount(_v) { count = typeof _v === 'function' ? _v(count) : _v; }
    def rewrite_state(m):
        vname = m.group(1)
        sname = m.group(2)
        init  = m.group(3).strip().rstrip(';')
        return (
            f"var {vname} = {init};\n"
            f"function {sname}(_v) {{ {vname} = typeof _v === 'function' ? _v({vname}) : _v; }}"
        )

    logic = re.sub(
        r'const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\(([^)]*)\)\s*;?',
        rewrite_state,
        logic,
    )

    # Convert remaining arrow functions to regular functions for old Node.js
    # e.g. const increment = () => setCount((prev) => prev + 1);
    #    → function increment() { setCount(function(prev){ return prev + 1; }); }
    def _convert_line(line):
        # Match: const NAME = () => BODY;
        m = re.match(r'(\s*)const\s+(\w+)\s*=\s*\(\)\s*=>\s*(.+)', line)
        if not m:
            return line
        indent, name, body = m.group(1), m.group(2), m.group(3).strip().rstrip(';')

        # Replace inner arrow: (param) => expr  within the body
        # Must be careful not to eat the closing paren of the outer call
        def _inner_arrow(im):
            param = im.group(1)
            # Find the expression after => up to matching end
            rest = im.group(2)
            # Count parens  to find where the expression ends
            depth = 0
            end = 0
            for i, ch in enumerate(rest):
                if ch == '(': depth += 1
                elif ch == ')':
                    if depth == 0:
                        end = i
                        break
                    depth -= 1
                elif ch == ',' and depth == 0:
                    end = i
                    break
            else:
                end = len(rest)
            expr = rest[:end].strip()
            remainder = rest[end:]
            return f"function({param}){{ return {expr}; }}{remainder}"

        body = re.sub(r'\((\w+)\)\s*=>\s*(.+)', _inner_arrow, body)
        return f"{indent}function {name}() {{ {body}; }}"

    logic = "\n".join(_convert_line(l) for l in logic.split("\n"))

    # ── Detect first state var name for the test runner ───────────────────────
    sv = re.findall(r'^var\s+(\w+)\s*=', logic, re.MULTILINE)
    first_var   = sv[0] if sv else "count"
    setter_name = "set" + first_var[0].upper() + first_var[1:]  # count → setCount

    # ── Hooks no-ops (ES5-compatible) ────────────────────────────────────────
    hooks = (
        "function useState(){}\n"
        "function useEffect(){}\n"
        "function useCallback(f){return f;}\n"
        "function useMemo(f){return f();}\n"
        "function useRef(v){return{current:v||null};}\n"
        "function useContext(){return{};}\n"
    )

    # ── Natural-language test runner ──────────────────────────────────────────
    inp_js  = json.dumps(test_input.lower())
    runner = f"""
var _inp = {inp_js};
var _nw  = {{one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10}};
(function(){{
  if (_inp === 'render' || _inp.includes('render') || _inp.includes('initial')) {{
    console.log('Count: ' + {first_var});

  }} else if (_inp.includes('increment')) {{
    if      (typeof increment       !== 'undefined') increment();
    else if (typeof handleIncrement !== 'undefined') handleIncrement();
    console.log('Count: ' + {first_var});

  }} else if (_inp.includes('decrement')) {{
    var _m = _inp.match(/(\\w+)\\s+times?/);
    var _n = _m ? (_nw[_m[1]] || parseInt(_m[1]) || 1) : 1;
    for (var _i = 0; _i < _n; _i++) {{
      if      (typeof decrement       !== 'undefined') decrement();
      else if (typeof handleDecrement !== 'undefined') handleDecrement();
    }}
    console.log('Count: ' + {first_var});

  }} else if (_inp.includes('reset')) {{
    var _sm = _inp.match(/set count (\\d+)/);
    if (_sm) {{
      var _sv = parseInt(_sm[1]);
      if (typeof {setter_name} !== 'undefined') {setter_name}(_sv);
      else {first_var} = _sv;
    }}
    if      (typeof reset       !== 'undefined') reset();
    else if (typeof handleReset !== 'undefined') handleReset();
    console.log('Count: ' + {first_var});

  }} else {{
    console.log('Count: ' + {first_var});
  }}
}})();
"""

    return hooks + "\n" + logic + "\n" + runner


# ── Function-call runner (for Groq-generated plain JS exercises) ──────────────

def _looks_like_call_expr(test_input: str) -> bool:
    """True when the input looks like a JS call expression e.g. solution(2,3)."""
    s = test_input.strip()
    return bool(re.match(r'^[A-Za-z_$][\w$]*\s*\(', s))


def _build_function_js(user_code: str, test_input: str) -> str:
    """
    Wrap the user's plain-JS function and evaluate the test call expression,
    printing the result in the same format the expected_output was generated.
    Works for: numbers, booleans, strings, arrays, objects.
    """
    safe = test_input.strip()
    return (
        f"{user_code}\n"
        f"(function() {{\n"
        f"  try {{\n"
        f"    var __r = {safe};\n"
        f"    if (__r === null) {{ console.log('null'); }}\n"
        f"    else if (__r === undefined) {{ console.log('undefined'); }}\n"
        f"    else if (Array.isArray(__r) || typeof __r === 'object') {{ console.log(JSON.stringify(__r)); }}\n"
        f"    else {{ console.log(String(__r)); }}\n"
        f"  }} catch(e) {{ console.error(e.message); }}\n"
        f"}})();\n"
    )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/execute")
def execute_code(req: CodeRequest):
    # ── Plain run (no test cases) ──────────────────────────────────────────────
    if not req.test_cases:
        result = _run_judge0(req.language, req.code, req.stdin or "")
        ok = result["exit_code"] == 0 and not result["stderr"].strip()
        return {
            "results": [{"status": "passed" if ok else "failed",
                         "stdout": result["stdout"], "stderr": result["stderr"], "time": None}],
            "summary": {"total": 1, "passed": int(ok), "failed": int(not ok)},
        }

    # ── Test-case mode ─────────────────────────────────────────────────────────
    is_react = _is_react(req.code)
    results  = []

    for tc in req.test_cases:
        tc_input = tc.get_input()
        expected = (tc.expected_output or "").strip()

        if is_react:
            # React component: use the natural-language runner (Counter-style)
            js     = _build_react_js(req.code, tc_input)
            result = _run_judge0("javascript", js, "")
        elif _looks_like_call_expr(tc_input) and req.language.lower() in ("javascript", "typescript"):
            # Groq-generated plain function exercise: evaluate the call expression
            js     = _build_function_js(req.code, tc_input)
            result = _run_judge0("javascript", js, "")
        else:
            # Fallback: pass input as stdin (Python, Java, C++, etc.)
            result = _run_judge0(req.language, req.code, tc_input)

        actual = result["stdout"].strip()
        passed = (actual == expected and not result["stderr"].strip())
        results.append({
            "status": "passed" if passed else "failed",
            "stdout": result["stdout"],
            "stderr": result["stderr"],
            "time":   None,
            "expected_output": tc.expected_output,
        })

    total  = len(results)
    passed_count = sum(1 for r in results if r["status"] == "passed")
    return {
        "results": results,
        "summary": {"total": total, "passed": passed_count, "failed": total - passed_count},
    }
