import ast

def calculate_quality_score(total_lines, dead_count):
    if total_lines == 0:
        return 100
    dead_ratio = dead_count / max(total_lines, 1)
    score = max(0, 100 - int(dead_ratio * 200) - (dead_count * 3))
    return max(0, min(100, score))

def clean_code(source_code, dead_names):
    lines = source_code.split('\n')
    cleaned = []
    skip_block = False
    skip_indent = 0

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Skip unused imports
        skip_line = False
        for name in dead_names.get('imports', set()):
            if stripped.startswith(f'import {name}') or stripped.startswith(f'from {name}'):
                skip_line = True
                break

        if skip_line:
            continue

        # Skip unused functions
        for name in dead_names.get('functions', set()):
            if stripped.startswith(f'def {name}('):
                skip_block = True
                skip_indent = len(line) - len(line.lstrip())
                break

        if skip_block:
            if stripped == '' or (len(line) - len(line.lstrip())) > skip_indent:
                continue
            else:
                skip_block = False

        # Skip unused variables
        skip_var = False
        for name in dead_names.get('variables', set()):
            if stripped.startswith(f'{name} =') or stripped.startswith(f'{name}='):
                skip_var = True
                break

        if not skip_var:
            cleaned.append(line)

    return '\n'.join(cleaned)

def analyze_code(source_code):
    tree = ast.parse(source_code)

    defined_functions = set()
    called_functions = set()
    defined_variables = set()
    used_variables = set()
    imported_modules = set()
    used_modules = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            defined_functions.add(node.name)
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                called_functions.add(node.func.id)
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    defined_variables.add(target.id)
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            used_variables.add(node.id)
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported_modules.add(alias.asname or alias.name)
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                imported_modules.add(alias.asname or alias.name)
        if isinstance(node, ast.Attribute):
            if isinstance(node.value, ast.Name):
                used_modules.add(node.value.id)

    dead_functions = defined_functions - called_functions
    dead_variables = defined_variables - used_variables
    dead_imports = imported_modules - used_modules - used_variables

    results = []

    for func in dead_functions:
        results.append({"type": "Unused Function", "name": func,
            "message": f"Function '{func}' is defined but never called"})
    for var in dead_variables:
        results.append({"type": "Unused Variable", "name": var,
            "message": f"Variable '{var}' is assigned but never used"})
    for imp in dead_imports:
        results.append({"type": "Unused Import", "name": imp,
            "message": f"'{imp}' is imported but never used"})

    total_lines = len(source_code.split('\n'))
    score = calculate_quality_score(total_lines, len(results))

    dead_names = {
        'functions': dead_functions,
        'variables': dead_variables,
        'imports': dead_imports
    }
    cleaned = clean_code(source_code, dead_names)

    return results, score, cleaned