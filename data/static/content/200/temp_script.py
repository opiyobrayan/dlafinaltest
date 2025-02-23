another='Another display section'

 
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
