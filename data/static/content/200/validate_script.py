EXPECTED_CODE = """
my_name = "Alice"
my_age = 25
my_height = 1.68

print(my_name)
print(my_age)
print(my_height)
"""
LEARNER_CODE = """
my_name = "Alice"
my_age = 25
my_height = 1.68

print(my_name)
print(my_age)
print(my_height)
"""
import ast
import io
import sys

def capture_print_output(code):
    # Captures the printed output of a code execution.
    captured_output = io.StringIO()
    original_stdout = sys.stdout  # Save the original stdout
    sys.stdout = captured_output  # Redirect stdout to StringIO

    try:
        exec(code, {}, {})
    except Exception as e:
        sys.stdout = original_stdout  # Restore stdout even if an error occurs
        print(f"Error executing print statements: {e}")
        return ""
    finally:
        sys.stdout = original_stdout  # Always restore stdout

    return captured_output.getvalue().strip()                                                
def execute_and_validate():

    #  Executes the expected solution and learner's code, then validates dynamically.

    expected_globals = {}  # Store expected answer variables
    learner_globals = {}  # Store learner's answer variables
    expected_ast = ast.parse(EXPECTED_CODE)  # Parse expected function/class structure
    learner_ast = ast.parse(LEARNER_CODE)  # Parse learner function/class structure

    try:
        # ✅ Capture expected print output
        expected_output = capture_print_output(EXPECTED_CODE)
        learner_output = capture_print_output(LEARNER_CODE)

        # ✅ Execute expected code to learn variables
        exec(EXPECTED_CODE, {}, expected_globals)

        # ✅ Extract all user-defined variables, functions, classes
        expected_variables = {var: expected_globals[var] for var in expected_globals if not var.startswith("__")}

        # ✅ Execute learner's code
        exec(LEARNER_CODE, {}, learner_globals)

        feedback = []

        # ✅ Validate Variables
        for var_name, expected_value in expected_variables.items():
            if var_name in ["my_function", "MyClass"]:  # Skip functions and classes here
                continue

            if var_name not in learner_globals:
                feedback.append(f"Error: Variable `{var_name}` is missing!")
                continue

            learner_value = learner_globals[var_name]
            expected_type = type(expected_value)

            if not isinstance(learner_value, expected_type):
                feedback.append(f"Incorrect! Expected `{var_name}` to be `{expected_type.__name__}`, but got `{type(learner_value).__name__}`")
                continue

            if hasattr(expected_value, '__len__'):  # Check length for lists, dicts, tuples, sets
                expected_length = len(expected_value)
                learner_length = len(learner_value)
                if learner_length != expected_length:
                    feedback.append(f"Incorrect! Expected `{var_name}` to have `{expected_length}` elements, but got `{learner_length}`")

            if learner_value != expected_value:
                feedback.append(f"Warning: `{var_name}` has the correct structure but different values.")

        # ✅ Validate Functions
        expected_functions = {node.name: node for node in expected_ast.body if isinstance(node, ast.FunctionDef)}
        learner_functions = {node.name: node for node in learner_ast.body if isinstance(node, ast.FunctionDef)}

        for func_name, expected_func_node in expected_functions.items():
            if func_name not in learner_functions:
                feedback.append(f"Error: Function `{func_name}()` is missing!")
                continue

            learner_func_node = learner_functions[func_name]
            if ast.dump(learner_func_node) != ast.dump(expected_func_node):
                feedback.append(f"Warning: Function `{func_name}()` is defined but has different logic.")

        # ✅ Validate Classes
        expected_classes = {node.name: node for node in expected_ast.body if isinstance(node, ast.ClassDef)}
        learner_classes = {node.name: node for node in learner_ast.body if isinstance(node, ast.ClassDef)}

        for class_name, expected_class_node in expected_classes.items():
            if class_name not in learner_classes:
                feedback.append(f"Error: Class `{class_name}` is missing!")
                continue

            learner_class_node = learner_classes[class_name]
            if ast.dump(learner_class_node) != ast.dump(expected_class_node):
                feedback.append(f"Warning: Class `{class_name}` is defined but has different methods or structure.")

            # ✅ Validate Print Output
            if learner_output != expected_output:
                feedback.append(f"Incorrect print output! Expected `{expected_output}`, but got `{learner_output}`")

            # ✅ Ensure feedback is printed properly
            # ✅ Ensure feedback is printed properly with escaped newlines
            # ✅ Properly escape newlines before returning
            result = ("; ".join(feedback) if feedback else "All variables, functions, classes, and print outputs are correct!")
            print(result)  # Ensures output is displayed
            return result


    except Exception as e:
        return f"Error executing code: {e}"
feedback=execute_and_validate()
print(feedback)