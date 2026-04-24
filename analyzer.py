import ast

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
        results.append({
            "type": "Unused Function",
            "name": func,
            "message": f"Function '{func}' is defined but never called"
        })

    for var in dead_variables:
        results.append({
            "type": "Unused Variable",
            "name": var,
            "message": f"Variable '{var}' is assigned but never used"
        })

    for imp in dead_imports:
        results.append({
            "type": "Unused Import",
            "name": imp,
            "message": f"'{imp}' is imported but never used"
        })

    return results