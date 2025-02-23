import React, { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { Decoration, EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { tags } from "@lezer/highlight"; // ✅ Correct import
import { RotateCcw } from "lucide-react"; // Refresh icon from Lucide



const PythonCodeEditor = ({ screenIndex, notebook }) => {
  // Local Storage Keys
  const getCodeKey = (index) => `python_code_editor_content_screen_${index}`;
  const getOutputKey = (index) => `python_code_editor_output_screen_${index}`;
  const getVariablesKey = (index) => `python_code_editor_selected_variables_screen_${index}`;

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [variables, setVariables] = useState({});
  const [selectedVariables, setSelectedVariables] = useState([]);
  const [outputHeight, setOutputHeight] = useState(200);
  const isResizingOutput = useRef(false);

  // Extract all data files from the notebook
  const dataFiles = notebook.filter(file => file.type === "data");

  const [activeView, setActiveView] = useState("editor");
  const [activeFile, setActiveFile] = useState(dataFiles.length > 0 ? dataFiles[0] : null);

  // processing FaTruckLoading...
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const savedCode = localStorage.getItem(getCodeKey(screenIndex));

    // Find the corresponding notebook entry with the same screen_index
    const notebookEntry = notebook.find(entry => Number(entry.sequence) === Number(screenIndex));
    // Ensure the display value exists and is not null/undefined
    const notebookCode = notebookEntry && notebookEntry.display ? notebookEntry.display : "";

    // Set code, prioritizing savedCode if available
    setCode(savedCode || notebookCode);
  }, [screenIndex, notebook]);



  const handleCodeChange = (value) => {
    setCode(value);
    localStorage.setItem(getCodeKey(screenIndex), value);
  };

  // List of common Python libraries
  const pythonLibraries = new Set([
    "pandas", "numpy", "matplotlib", "seaborn", "scipy", "sklearn",
    "tensorflow", "torch", "requests", "json", "sys", "os", "re","pd", 'matplotlib.pyplot','plt'
  ]);

 
  // Apply dynamic styling to known libraries
  const highlightLibraryNames = EditorView.decorations.compute(["doc"], state => {
    let builder = new RangeSetBuilder();
    let text = state.doc.toString();  
    let lines = text.split("\n");     
    let pos = 0;                      

    for (let line of lines) {
        let words = line.split(/\s+/);
        for (let word of words) {
            if (pythonLibraries.has(word)) {
                let start = pos + line.indexOf(word);
                let end = start + word.length;

                // ✅ Use `replace` instead of `mark`, preventing deletion bugs
                builder.add(start, end, Decoration.mark({ class: "cm-library" }));

            }
        }
        pos += line.length + 1;
    }

    return builder.finish();
});



  // ✅ Define syntax highlighting styles
  const customHighlightStyle = syntaxHighlighting(HighlightStyle.define([
    { tag: tags.keyword, color: "#569CD6", fontWeight: "bold" }, // Keywords (import, return, def)
    { tag: tags.function(tags.variableName), color: "#804ab5" }, // Functions like print(),range() and so on
    // { tag: tags.variableName, color: "#0000b3" }, // Variables
    { tag: [tags.definition(tags.variableName)], color: "#aaff80" }, // User-defined variables only like def my_func()
    { tag: tags.string, color: "#CE9178" }, // Strings
    { tag: tags.comment, color: "#6A9955", fontStyle: "italic" }, // Comments
  ]));


  // ✅ Custom Theme (Background, Cursor, Active Line)
  const customTheme = EditorView.theme({
    "& .cm-library": { color: "#6666ff", fontWeight: "bold" }, // ✅ Force higher priority
    "&.cm-selected": { backgroundColor: "rgba(75, 75, 75, 0.5)" }, // ✅ Ensure selection is visible
  });

  const refreshEditor = () => {
      // ✅ Find the notebook entry for the current screenIndex
      const notebookEntry = notebook.find(entry => Number(entry.sequence) === Number(screenIndex));

      // ✅ Keep only the `display` code; reset everything else
      const displayCode = notebookEntry?.display ? notebookEntry.display : "";

      // ✅ Reset state, keeping only display code
      setCode(displayCode);
      setOutput("");
      setVariables({});
      setSelectedVariables([]);

      // ✅ Remove saved code & execution results from localStorage
      localStorage.removeItem(getCodeKey(screenIndex));
      localStorage.removeItem(getOutputKey(screenIndex));
      localStorage.removeItem(getVariablesKey(screenIndex));

      console.log("Editor refreshed! Code reset to display code:", displayCode);
  };


  
  const executeCode = async () => {
      setLoading(true); // Show loading indicator
      setOutput("");
      setSelectedVariables([]);

      // ✅ Find the notebook entry for the current screenIndex
      const notebookEntry = notebook.find(entry => Number(entry.sequence) === Number(screenIndex));

      // ✅ Extract initial code from the notebook entry (fallback to empty string)
      const initialCode = notebookEntry?.innitial ? notebookEntry.innitial + "\n\n" : "";

      // ✅ Extract variables from the initial code (to track which ones to ignore)
      const initialVariables = new Set([...initialCode.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s*=)/g)].map(match => match[1]));

      // ✅ Extract variables from user-entered code (these should be kept)
      const userDefinedVariables = new Set([...code.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s*=)/g)].map(match => match[1]));

      console.log("Variables in Initial Code (Potentially Ignored):", initialVariables);
      console.log("Variables in User Code (Kept):", userDefinedVariables);

      // ✅ Merge initial code with user-entered code
      const finalCode = initialCode + code;

      // ✅ Debugging logs
      console.log("Initial Code:", initialCode);
      console.log("User Code:", code);
      console.log("Final Code to Execute:", finalCode);

      // ✅ Ensure lesson number is available
      if (!Array.isArray(notebook) || notebook.length === 0 || !notebook[0].lesson_number) {
          console.error("❌ Error: Lesson number is missing or notebook is empty!");
          setOutput("Error: Lesson number is missing.");
          setLoading(false); // Hide loading indicator
          return;
      }

      // ✅ Extract lesson number for API call
      const lessonNumber = notebook[0].lesson_number;

      try {
          const response = await fetch(`/api/run_code/${lessonNumber}/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: finalCode }), // ✅ Send merged code
          });

          if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

          const data = await response.json();

          // ✅ Filter variables: Ignore those from initial code unless they exist in user code
          const filteredVariables = Object.fromEntries(
              Object.entries(data.variables || {}).filter(([varName]) => 
                  !initialVariables.has(varName) || userDefinedVariables.has(varName) 
              )
          );

          setOutput(data.output ? data.output.trim() : "");
          setVariables(filteredVariables); // ✅ Store only relevant user-defined variables

          localStorage.setItem(getOutputKey(screenIndex), data.output ? data.output.trim() : "");
          localStorage.setItem(getVariablesKey(screenIndex), JSON.stringify(filteredVariables));
      } catch (error) {
          console.error("❌ API Request Failed:", error);
          setOutput("Error connecting to the server.");
          localStorage.setItem(getOutputKey(screenIndex), "Error connecting to the server.");
      } finally {
          setLoading(false); // Hide loading indicator
      }
  };




  const decodeEscapedHtml = (htmlString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    return doc.body.innerHTML;
  };

  const showEditor = () => {
    setActiveView("editor");
    setActiveFile(null);
  };

  const showFilePreview = (file) => {
    setActiveView("file");
    setActiveFile(file);
  };

  const handleVariableClick = (varName) => {
    if (!selectedVariables.includes(varName)) {
      // Add the variable to the selectedVariables state
      setSelectedVariables((prevSelected) => [...prevSelected, varName]);
    }
  
    // Scroll instantly after React updates the DOM
    requestAnimationFrame(() => {
      const element = document.getElementById(varName);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };
  

  const handleRemoveVariable = (varName) => {
    setSelectedVariables(selectedVariables.filter(v => v !== varName));
  };

  const startResizingOutput = (event) => {
      isResizingOutput.current = true;
      const startY = event.clientY;
      const startHeight = outputHeight;

      event.preventDefault(); // ✅ Prevents page scrolling during resizing

      const onMouseMove = (moveEvent) => {
          if (!isResizingOutput.current) return;

          // ✅ Invert the movement: Moving UP increases, moving DOWN decreases
          const newHeight = startHeight - (moveEvent.clientY - startY);

          // ✅ Set a minimum and maximum height
          setOutputHeight(Math.max(100, Math.min(500, newHeight)));
      };

      const onMouseUp = () => {
          isResizingOutput.current = false;
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
  };



  return (
    <div className="editor-container">
      <h3 className="editor-title">
        <button
          onClick={showEditor}
          className={activeView === "editor" ? "tab-button active-tab" : "tab-button"}
        >
          script.py
        </button>

        {dataFiles.map((file) => (
          <button
            key={file.title}
            onClick={() => showFilePreview(file)}
            className={activeView !== "editor" && activeFile?.title === file.title ? "tab-button active-tab" : "tab-button"}
          >
            {file.title}
          </button>
          
        ))}
        <button onClick={refreshEditor} className="refresh-button">
          <RotateCcw size={20} />
        </button>

        </h3>


      {activeView === "editor" && (
        <div className="editor-section">
          <CodeMirror 
            value={code} 
            extensions={[python(), highlightLibraryNames, customHighlightStyle, customTheme]} 
            onChange={handleCodeChange}
            className="code-mirror-editor"
            basicSetup={{ 
              lineNumbers: true,
              highlightActiveLine: true,
              allowMultipleSelections: true,  // ✅ Allows proper line highlighting
     
            }}
          />
        </div>
      )}

      {activeView === "file" && activeFile && (
        <div className="editor-section">
          <h3 className="editor-title">{activeFile.title}</h3>
          <div className="styled-table-container" dangerouslySetInnerHTML={{ __html: activeFile.file_content }} />

        </div>
      )}

      {activeView === "editor" && (output || Object.keys(variables).length > 0) && (
        <>
          <div className="output-resizer" onMouseDown={startResizingOutput}></div>
          <div className="output-section" style={{ height: `${outputHeight}px` }}>
            {Object.keys(variables).length > 0 && (
              <div className="variable-list">
                {Object.keys(variables).map((varName) => (
                  <button
                    key={varName}
                    className="variable-button"
                    onClick={() => handleVariableClick(varName)}
                  >
                    {varName}
                  </button>
                ))}
              </div>
            )}

            <div className="output-content">
              {output && (
                <div className="print-output-section">
                  <h4>Console Output:</h4>
                  <pre className="print-output">{output}</pre>
                </div>
              )}
              {selectedVariables.map((varName) => (
                <div key={varName} id={varName} className="variable-output">
                  <div className="variable-header">
                    <strong>{varName}</strong>
                    <button className="close-button" onClick={() => handleRemoveVariable(varName)}>×</button>
                  </div>

                  {variables[varName]?.type === "table" ? (
                    <div 
                      className="styled-table-container" 
                      dangerouslySetInnerHTML={{ __html: decodeEscapedHtml(variables[varName]?.content) }}
                    />
                  ) : variables[varName]?.type === "image" ? (
                    <img 
                      src={`data:image/png;base64,${variables[varName]?.content}`} 
                      alt="Generated Plot"
                      className="output-plot"
                    />
                  ) : variables[varName]?.type === "text" ? (
                    <pre style={{ whiteSpace: "pre-wrap" }}> 
                      {JSON.stringify(variables[varName]?.content, null, 2)}
                    </pre>
                  ) : (
                    <pre>{JSON.stringify(variables[varName]?.content, null, 2)}</pre>
                  )}
                </div>
              ))}


            </div>
          </div>
        </>
      )}
      <button onClick={executeCode} className="run-button" disabled={loading}>
        {loading ? (
          <>
            <span className="spinner"></span> Running...
          </>
        ) : (
          "Run Code"
        )}
      </button>
    </div>
  );
};

export default PythonCodeEditor;
