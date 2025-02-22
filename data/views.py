
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
    """Merge cells with the same screen_index."""
    merged = {}
    for cell in cells:
        index = cell["screen_index"]
        if index not in merged:
            merged[index] = cell
        else:
            # Merge additional data into the existing screen
            for key in ["display", "answer", "innitial"]:
                if key in cell and cell[key]:
                    # Convert the value to a string to avoid NoneType errors
                    merged[index][key] = (
                        (merged[index].get(key, "") or "") + "\n" + cell[key]
                    ).strip()
    return list(merged.values())


#processing notebook:
# Processing notebook:
# Processing notebook:
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
        innitial = None
        learn_content = []
        metadata = None

        processing_instructions = False
        processing_hint = False
        processing_display = False
        processing_answer = False
        processing_innitial = False

        # **🔹 Store instructions with extra line breaks**
        instruction_lines = []

        for line in lines:
            stripped_line = line.rstrip()  # Preserve spaces for indentation

            # Capture the title (Markdown H1)
            if stripped_line.startswith("# ") and not title:
                title = stripped_line.strip("# ").strip()

            # Extract metadata from the notebook cell
            elif stripped_line.startswith("<!---"):
                metadata = extract_metadata(stripped_line)

            # Handling different sections of the cell
            elif stripped_line.startswith("## Display"):
                processing_display = True
                processing_answer = processing_innitial = processing_hint = False
                display = ""
                continue

            elif stripped_line.startswith("## Answer"):
                processing_answer = True
                processing_display = processing_innitial = processing_hint = False
                answer = ""
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

            # **Handle instructions (preserve correct list structure)**
            elif processing_instructions:
                if instruction_lines and stripped_line.startswith("- "):
                    instruction_lines.append("")  # Add an extra newline before nested list
                instruction_lines.append(stripped_line)
                continue  # Move to next line

            # Handle hints
            elif processing_hint:
                hint += stripped_line + "\n"

            # Handle display content
            elif processing_display:
                display += stripped_line + "\n"

            # Handle answers
            elif processing_answer:
                answer += stripped_line + "\n"

            # Handle initial code blocks
            elif processing_innitial:
                innitial += stripped_line + "\n"

            # Preserve images and text content in Learn section
            elif "<img" in line:
                learn_content.append(line.strip())

            # Ignore center tags but preserve other content
            elif not ("<center>" in line or "</center>" in line):
                learn_content.append(line)

        # Convert learn content into properly formatted Markdown
        learn_content = "\n\n".join([line for line in learn_content if line]).strip()

        # **Ensure screen_index is properly assigned**
        if metadata and "screen_index" in metadata:
            screen_index = metadata["screen_index"]
        elif processing_display or processing_answer or processing_innitial:
            screen_index = last_screen_index  # Inherit from previous valid screen
        else:
            screen_index = f"{i + 1}"  # Generate a dynamic screen index

        last_screen_index = screen_index  # Update last valid screen index
        lesson_number = screen_index.split(".")[0]  # ✅ Get the first part


        # Store processed screen data
        screen = {
            'lesson_number':lesson_number,
            "screen_index": screen_index,
            "sequence": metadata["sequence"] if metadata and "sequence" in metadata else None,
            "title": title,
            "type": metadata["type"] if metadata and "type" in metadata else None,
            "experimental": metadata["experimental"] if metadata and "experimental" in metadata else None,
            "learn": learn_content if learn_content else None,
            
            # **Ensure extra newlines for nested lists in instructions**
            "instructions": "\n".join(instruction_lines).strip() if instruction_lines else None,

            "hint": hint.strip() if hint else None,
            "display": display.strip() if display else None,
            "answer": answer.strip() if answer else None,
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
