
from django.shortcuts import render
import json
from django.http import JsonResponse
from pathlib import Path
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.csrf import csrf_exempt
import subprocess
import sys
import json
import pandas as pd
import re
import textwrap
import sys
# Create your views here.

def home(request):

    return render(request, 'home.html', {})


# extracting metadata
def extract_metadata(notebook_content):
    """Extract metadata from the learn content."""
    import re
    metadata_match = re.search(r"<!---\s*(.*?)\s*--->", notebook_content)
    if metadata_match:
        metadata = {}
        for pair in metadata_match.group(1).split():
            key, value = pair.split("=")
            metadata[key] = value.strip("'\"")  # Remove surrounding quotes
        return metadata
    return None

# Merging the cells:
def merge_cells(cells):
    """Merge cells with the same screen_index, ensuring `answer_checker` is recorded only once."""
    merged = {}
    answer_checker_set = set()  # Track which screen indexes already have an answer_checker

    for cell in cells:
        index = cell["screen_index"]
        if index not in merged:
            merged[index] = cell
        else:
            # Merge additional data into the existing screen
            for key in ["display", "answer", "innitial"]:
                if key in cell and cell[key]:
                    merged[index][key] = (
                        (merged[index].get(key, "") or "") + "\n" + cell[key]
                    ).strip()
                    
        # ✅ Ensure answer_checker is only assigned once per screen_index
        if "answer_checker" in cell and cell["answer_checker"]:
            if index not in answer_checker_set:  # Only set if not already recorded
                merged[index]["answer_checker"] = cell["answer_checker"].strip()
                answer_checker_set.add(index)  # Mark as recorded

    return list(merged.values())

#processing notebook:
# Processing notebook:
# Processing notebook:
import ast

def process_notebook(content):
    """Process notebook cells into structured screens."""
    screens = []
    last_screen_index = None  # Store the last valid screen index

    for i, cell in enumerate(content.get("cells", [])):
        cell_source = "".join(cell.get("source", []))
        lines = cell_source.split("\n")

        title = None
        instructions = None
        hint = None
        display = None
        answer = None
        answer_checker = None
        innitial = None
        learn_content = []
        metadata = None

        processing_instructions = False
        processing_hint = False
        processing_display = False
        processing_answer = False
        processing_innitial = False

        instruction_lines = []

        for line in lines:
            stripped_line = line.rstrip()  # Preserve spaces for indentation

            if stripped_line.startswith("# ") and not title:
                title = stripped_line.strip("# ").strip()
            elif stripped_line.startswith("<!---"):
                metadata = extract_metadata(stripped_line)
            elif stripped_line.startswith("## Display"):
                processing_display = True
                processing_answer = processing_innitial = processing_hint = False
                display = ""
                continue
            elif stripped_line.startswith("## Answer"):
                processing_answer = True
                processing_display = processing_innitial = processing_hint = False
                answer = ""
                answer_checker = ""
                continue
            elif stripped_line.startswith("## Innitial"):
                processing_innitial = True
                processing_display = processing_answer = processing_hint = False
                innitial = ""
                continue
            elif stripped_line.startswith("## Instructions"):
                processing_instructions = True
                processing_hint = processing_display = processing_answer = processing_innitial = False
                instruction_lines = []
                continue
            elif stripped_line.startswith("## Hint"):
                processing_hint = True
                processing_instructions = processing_display = processing_answer = processing_innitial = False
                hint = ""
                continue

            elif processing_instructions:
                if instruction_lines and stripped_line.startswith("- "):
                    instruction_lines.append("")  # Add extra newline before nested list
                instruction_lines.append(stripped_line)
                continue
            elif processing_hint:
                hint += stripped_line + "\n"
            elif processing_display:
                display += stripped_line + "\n"
            elif processing_answer:
                answer += stripped_line + "\n"
                answer_checker =textwrap.dedent("""
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
""")
            elif processing_innitial:
                innitial += stripped_line + "\n"
            elif "<img" in line:
                learn_content.append(line.strip())
            elif not ("<center>" in line or "</center>" in line):
                learn_content.append(line)

        learn_content = "\n\n".join([line for line in learn_content if line]).strip()

        if metadata and "screen_index" in metadata:
            screen_index = metadata["screen_index"]
        elif processing_display or processing_answer or processing_innitial:
            screen_index = last_screen_index
        else:
            screen_index = f"{i + 1}"

        last_screen_index = screen_index
        lesson_number = screen_index.split(".")[0]

        screen = {
            'lesson_number': lesson_number,
            "screen_index": screen_index,
            "sequence": metadata["sequence"] if metadata and "sequence" in metadata else None,
            "title": title,
            "type": metadata["type"] if metadata and "type" in metadata else None,
            "experimental": metadata["experimental"] if metadata and "experimental" in metadata else None,
            "learn": learn_content if learn_content else None,
            "instructions": "\n".join(instruction_lines).strip() if instruction_lines else None,
            "hint": hint.strip() if hint else None,
            "display": display.strip() if display else None,
            "answer": answer.strip() if answer and answer.strip() else None,
            "answer_checker": answer_checker.strip() if answer_checker and answer_checker.strip() else None,
            "innitial": innitial.strip() if innitial else None,
        }

        screens.append(screen)

    return merge_cells(screens)

def process_data_file(file_path):
    """Process CSV or Excel file and return as a notebook-like screen."""
    try:
        if file_path.suffix == '.csv':
            df = pd.read_csv(file_path)
        elif file_path.suffix == '.xlsx':
            df = pd.read_excel(file_path)
        else:
            return None  # Skip unsupported formats

        # Convert DataFrame to styled HTML table
        table_html = df.to_html(classes='styled-table', border=1)

        # Create a screen-like structure for the file
        screen = {
            "screen_index": f"file_{file_path.stem}",
            "title": file_path.name,
            "type": "data",  # Mark this as data for frontend handling
            "learn": None,
            "instructions": None,
            "hint": None,
            "display": None,
            "answer": None,
            "custom": None,
            "file_content": table_html,  # Include the HTML table for frontend rendering
        }
        return screen

    except Exception as e:
        print(f"Error processing file {file_path.name}: {e}")
        return None


def lesson_list(request):
    """List all available courses by scanning the content directory."""
    content_dir = Path(settings.BASE_DIR) / "data" / "static" / "content"
    lessons = []

    if content_dir.exists():
        for folder in content_dir.iterdir():
            if folder.is_dir():  # Ensure it's a directory
                lesson_id = folder.name  # Assuming folder name is course_id
                lessons.append({
                    'id': lesson_id,
                    'name': f"Lesson {lesson_id}"  # Adjust as needed
                })

    context = {'lessons': lessons}
    return render(request, 'lesson_list.html', context)

def learn(request, lesson_id):
    """Display course details including the corresponding Jupyter notebook."""
    notebook_path = Path(settings.BASE_DIR) / "data" / "static" / "content" / str(lesson_id) / f"lesson{lesson_id}.ipynb"
    notebook_dir = Path(settings.BASE_DIR) / "data" / "static" / "content" / str(lesson_id)  # Directory where both notebook and data files are stored

    try:
        # Load notebook content
        with open(notebook_path, "r", encoding="utf-8") as file:
            notebook_content = json.load(file)
        notebook_screens = process_notebook(notebook_content)

        # Detect and process CSV/Excel files in the same directory
        file_screens = []
        for file in notebook_dir.iterdir():
            if file.suffix in ['.csv', '.xlsx']:
                file_screen = process_data_file(file)
                if file_screen:
                    file_screens.append(file_screen)
        # Merge notebook screens with file screens
        all_screens = notebook_screens + file_screens
        all_screens_json = json.dumps(all_screens, cls=DjangoJSONEncoder)

        return render(request, "learn.html", {"notebook_data": all_screens_json})

    except FileNotFoundError:
        return JsonResponse({"error": "Notebook file not found."}, status=404)


@csrf_exempt

def run_code(request, lesson_id):
    """API Endpoint to execute Python code for the correct lesson notebook."""
    if request.method != "POST":
        return JsonResponse({"error": "This API only supports POST requests."}, status=405)

    try:
        print(f"📝 Received Lesson ID: {lesson_id}")

        # ✅ Define the correct lesson path
        lesson_folder = Path(settings.BASE_DIR) / "data" / "static" / "content" / str(lesson_id)
        script_path = lesson_folder / "temp_script.py"

        # ✅ Read user input
        try:
            data = json.loads(request.body.decode("utf-8"))
            code = data.get("code", "")
        except json.JSONDecodeError as e:
            print("❌ JSON Decode Error:", e)
            return JsonResponse({"error": "Invalid JSON format."}, status=400)

        print("📤 Received Code:\n", code)

        if not code.strip():
            print("❌ Error: No code provided")
            return JsonResponse({"error": "No code provided"}, status=400)

        # ✅ Remove plt.show() before execution
        modified_code = re.sub(r'\bplt\.show\(\)\s*', '', code)  # ✅ Remove plt.show()

        # ✅ Write the modified user's code into a temporary script
        with open(script_path, "w", encoding="utf-8") as script_file:
            script_file.write(modified_code + "\n\n")
            script_file.write(""" 
import json
import io
import base64
import matplotlib.pyplot as plt
import numpy as np
from pandas import DataFrame

# ✅ Define a set of excluded system variables
excluded_vars = {"json", "pd", "plt", "np", "io", "base64", "DataFrame", "excluded_vars", "get_user_variables", "capture_plot"}

# ✅ Capture all user-defined variables, excluding system objects
def get_user_variables():
    return {
        k: v for k, v in globals().items()
        if not k.startswith("__") and k != "__annotations__" 
        and k not in excluded_vars
    }

# ✅ Function to capture and encode Matplotlib plots
def capture_plot():
    buf = io.BytesIO()  # Create buffer for image
    plt.savefig(buf, format="png", bbox_inches='tight')  # Save figure to buffer
    plt.close()  # Close the plot to prevent overlapping figures
    buf.seek(0)  # Move to beginning of buffer
    return base64.b64encode(buf.read()).decode("utf-8")  # Convert to Base64 string

global_vars = get_user_variables()  # ✅ Extract only valid user-defined variables

# ✅ Process and print detected variables
for var_name, value in global_vars.items():
    try:
        if isinstance(value, DataFrame):
            table_html = value.to_html(border=1, classes="styled-table")  
            print(f"##VAR##{var_name}##HTML##{table_html}")  
        else:
            json_value = json.dumps(value, default=str)  
            print(f"##VAR##{var_name}##JSON##{json_value}")
    except Exception as e:
        print(f"##VAR##{var_name}##ERROR##{str(e)}")  

# ✅ Capture Matplotlib output if any figures exist
if plt.get_fignums():  
    plot_base64 = capture_plot()
    # print(f"##VAR##matplotlib_plot##IMG##{plot_base64}")  
""")

        # ✅ Run the script inside the correct lesson folder
        result = subprocess.run(
            [sys.executable, script_path], 
            cwd=lesson_folder,  
            capture_output=True, 
            text=True,
            encoding="utf-8"
        )

        print("📜 Execution Output:\n", result.stdout if result.stdout else result.stderr)

        output = result.stdout if result.stdout else result.stderr

        # ✅ Extract structured variables separately
        lines = output.split("\n")
        formatted_output = []
        variables = {}

        current_var = None
        current_content = []

        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if "##VAR##" in line:
                if current_var and current_content:
                    if current_var['type'] == "HTML":
                        variables[current_var['name']] = {
                            "type": "table",
                            "content": "\n".join(current_content)
                        }
                    current_var = None
                    current_content = []

                parts = line.split("##")
                if len(parts) < 5:
                    print(f"❌ Error Parsing Variable: {line}")
                    continue

                var_name = parts[2]
                var_type = parts[3]
                var_value = "##".join(parts[4:])

                if var_type == "HTML":
                    current_var = {"name": var_name, "type": "HTML"}
                    current_content.append(var_value)
                elif var_type == "JSON":
                    try:
                        variables[var_name] = {"type": "text", "content": json.loads(var_value)}
                    except json.JSONDecodeError:
                        variables[var_name] = {"type": "text", "content": var_value}
                elif var_type == "IMG":
                    variables[var_name] = {"type": "image", "content": var_value}
                elif var_type == "ERROR":
                    variables[var_name] = {"type": "error", "content": var_value}
            else:
                if current_var and current_var['type'] == "HTML":
                    current_content.append(line)
                else:
                    formatted_output.append(line)

        if current_var and current_content:
            if current_var['type'] == "HTML":
                variables[current_var['name']] = {
                    "type": "table",
                    "content": "\n".join(current_content)
                }

        output_text = "\n".join(formatted_output)

        return JsonResponse({"output": output_text, "variables": variables})

    except Exception as e:
        print("❌ Internal Server Error:", str(e))
        return JsonResponse({"error": str(e)}, status=500)



@csrf_exempt
def validate_code(request, lesson_id):
    """API Endpoint to validate Python code by comparing it to the expected answer."""
    if request.method != "POST":
        return JsonResponse({"error": "This API only supports POST requests."}, status=405)

    try:
        print(f"📝 Received Lesson ID: {lesson_id}")

        # ✅ Read JSON input safely
        try:
            data = json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError as e:
            print("❌ JSON Decode Error:", e)
            return JsonResponse({"error": "Invalid JSON format."}, status=400)

        # ✅ Validate JSON structure
        if not all(key in data for key in ["code"]):
            return JsonResponse({"error": "Missing required fields in request"}, status=400)

        final_code = data["code"].strip()

        if not final_code:
            return JsonResponse({"error": "Code is missing"}, status=400)

        # ✅ Prevent multiple occurrences of `answer_checker`
        # If `execute_and_validate()` is already inside `final_code`, do not append it
        print("📜 Final Code for Validation:\n", final_code)

        # ✅ Define script path
        lesson_folder = Path(settings.BASE_DIR) / "data" / "static" / "content" / str(lesson_id)
        script_path = lesson_folder / "validate_script.py"

        # ✅ Write script to file
        with open(script_path, "w", encoding="utf-8") as script_file:
            script_file.write(final_code)

        # ✅ Run script
        result = subprocess.run(
            [sys.executable, script_path], 
            cwd=lesson_folder,  
            capture_output=True, 
            text=True,
            encoding="utf-8"
        )

        print("📜 Execution Output:\n", result.stdout if result.stdout else result.stderr)

        # ✅ Extract the last line of output to avoid duplicates
        output_lines = result.stdout if result.stdout else result.stderr
        cleaned_output = output_lines[-1].strip()

        return JsonResponse({"output":output_lines})

    except Exception as e:
        print("❌ Internal Server Error:", str(e))
        return JsonResponse({"error": str(e)}, status=500)
