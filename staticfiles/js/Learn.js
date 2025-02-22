import React, { useEffect, useState,useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import Navbar from "./Main_Navbar";
import ChatInput from "./LearnChat";
import TypingEffect from "./TextType";
import PythonCodeEditor from "./Editor";
import TakeawaysPDF from "./Takeaways";

const LearnPage = () => {


    const [notebook, setNotebook] = useState([]);
    const [currentScreenIndex, setCurrentScreenIndex] = useState(0);

    //this section works for resizer
    
    const [contentWidth, setContentWidth] = useState(30); // Initial width percentage
    const resizerRef = useRef(null);
    const isResizing = useRef(false);

    const [isPracticeMode, setIsPracticeMode] = useState(false); // State to toggle practice mode
    const [practiceScreenIndex, setPracticeScreenIndex] = useState(null); // To capture current screen index in practice mode

    const practiceScreen = notebook[practiceScreenIndex];  // Screen data for practice mode (captured when Practice is clicked)
    // State to track typed text and typing completion
    const [typedInstructionText, setTypedInstructionText] = useState("");
    const [isTypingComplete, setIsTypingComplete] = useState(false);

    //notebook excluding data files to avoid them being listed in the modal

    const filteredNotebook = notebook.filter(item => item.type !== 'data');

    // takeaways section

    const takeawaysNotebook = notebook.filter(item=> item.type === 'takeaways')


    // Reset typing effect when entering practice mode
    useEffect(() => {
        if (isPracticeMode && practiceScreen?.instructions) {
            setTypedInstructionText("");  // Clear typed text
            setIsTypingComplete(false);   // Reset typing completion status
        }
    }, [isPracticeMode, practiceScreen?.instructions]);


    // Load notebook data from Django context variable
    useEffect(() => {
        if (window.notebookData) {
            console.log("Notebook Data: ", window.notebookData);
            setNotebook(window.notebookData); // Directly set the parsed JSON object
        } else {
            console.error("No data found in window.notebookData.");
        }
    }, []);
    
    
    useEffect(() => {
        if (notebook.length > 0 && notebook[currentScreenIndex]?.title) {
            document.title = notebook[currentScreenIndex].title;
        } else {
            document.title = "Jupyter Notebook Viewer";
        }
    }, [notebook, currentScreenIndex]);
    
       
    const startResizing = (event) => {
        isResizing.current = true;
        window.addEventListener("mousemove", resizeContent);
        window.addEventListener("mouseup", stopResizing);
    };   

    const resizeContent = (event) => {
        if (!isResizing.current) return;
        console.log("Resizing..."); // Check if this logs
        requestAnimationFrame(() => {
            const newWidth = (event.clientX / window.innerWidth) * 100;
            if (newWidth > 20 && newWidth < 80) {
                setContentWidth(newWidth);
            }
        });
    };  
   
    const stopResizing = () => {
        isResizing.current = false;
        window.removeEventListener("mousemove", resizeContent);
        window.removeEventListener("mouseup", stopResizing);
    };
    const handleSelectScreen = (newIndex) => {
        setCurrentScreenIndex(newIndex);
        setIsPracticeMode(false);  // Reset to learning mode when screen changes
    };

    const handlePracticeClick = () => {
        setPracticeScreenIndex(currentScreenIndex);  // Capture the current screen index
        setIsPracticeMode(true);  // Enable practice mode
    };
 
    //to handle copy feature
    const handleCopy = () => {
        navigator.clipboard.writeText(children).then(() => {
            alert('Code copied to clipboard!');
        });
    };

    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        "Here is the tutorial",
        "Your tutorial content goes here...",
        "I am called Cally(Ajwang Nyamin Odhis)-chuny min, your AI tutor. I understand every concept in this page. Feel free to engage me whenever you feel stuck. All the best in your Learning Career.",
        "Here is the demo...",
        "Assuming you have been asked to work out 1+1, you should understand that this is 2, and not '11' as many people think. These are some of the areas that I will assist you with to make sure you progress well in your career.",
      ]
    const handleNextStep = () => {
        setCurrentStep((prevStep) => prevStep + 1);
    }

    const highlightPythonCode = (str) => {
        const textPlaceholders = [];
        const processedStrWithText = String(str).replace(/```text([\s\S]*?)```/g, (match, content) => {
            textPlaceholders.push(content.trim());
            return `__TEXT_PLACEHOLDER_${textPlaceholders.length - 1}__`;
        });
    
        const stringPlaceholders = [];
        const processedStr = processedStrWithText.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
            stringPlaceholders.push(match);
            return `__STRING_PLACEHOLDER_${stringPlaceholders.length - 1}__`;
        });
    
        // Process comments first and ensure everything within the comment, including strings, is treated as a comment
        const commentPlaceholders = [];
        const processedStrWithComments = processedStr.replace(/(#.*?$)/gm, (match) => {
            commentPlaceholders.push(match);
            return `__COMMENT_PLACEHOLDER_${commentPlaceholders.length - 1}__`;
        });
    
        // Highlight Python syntax
        const highlightedStr = processedStrWithComments
            .replace(
                /(?<!["'`])\b(import|def|return|if|else|for|while|break|continue|class|try|except|finally|with|as|lambda|is|and|or|not|in)\b(?!["'`])/g,
                '<span class="keyword">$&</span>'
            )
            .replace(/\b\d+\b/g, '<span class="number">$&</span>')
            .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
    
        // Restore comments (including strings within them)
        const finalStrWithComments = highlightedStr.replace(/__COMMENT_PLACEHOLDER_(\d+)__/g, (_, index) => {
            const commentContent = commentPlaceholders[Number(index)];
            return `<span class="comment">${commentContent}</span>`;
        });
    
        // Restore strings
        const finalStrWithStrings = finalStrWithComments.replace(/__STRING_PLACEHOLDER_(\d+)__/g, (_, index) => {
            const stringContent = stringPlaceholders[Number(index)];
            return `<span class="string">${stringContent}</span>`;
        });
    
        // Restore text blocks
        const finalStr = finalStrWithStrings.replace(/__TEXT_PLACEHOLDER_(\d+)__/g, (_, index) => {
            const textContent = textPlaceholders[Number(index)];
            return `<div class="text-block">${textContent}</div>`;
        });
    
        return finalStr;
    };

    const highlightBlockquotes = (str) => {
    
        // Convert Markdown blockquotes into HTML blockquotes
        const formatted = String(str)
            .replace(/\n\n>/g, "\n> ")  // Fix blockquotes with leading newlines
            .replace(/^>\s?(.*)$/gm, '<blockquote class="custom-blockquote">$1</blockquote>')  // Wrap in blockquote
            .replace(/^>>\s?(.*)$/gm, '<blockquote class="custom-blockquote nested">$1</blockquote>'); // Handle nested blockquotes
    

        return formatted;
    };

    
    const renderMarkdown = (content) => {
        if (!content) {
            console.log("❌ No content passed to renderMarkdown.");
            return <p>No content available</p>;
        }   
        // ✅ **Step 1: Convert Markdown Tables to HTML Before Rendering**
        const formatMarkdownTables = (markdown) => {
            const tableRegex = /(?:\n\s*){2,}(\|(?:[^|]+\|)+)\n\n\s*(\|(?:-+\|)+)\n\n((?:\|(?:[^|]+\|)+\n?)+)/g;
    
            return markdown.replace(tableRegex, (match, header, separator, body) => {
                const headers = header
                    .split("|")
                    .filter((h) => h.trim() !== "")
                    .map((h) => `<th>${h.trim()}</th>`)
                    .join("");
    
                const rows = body
                    .trim()
                    .split("\n")
                    .map((row) =>
                        `<tr>${row
                            .split("|")
                            .filter((cell) => cell.trim() !== "")
                            .map((cell) => `<td>${cell.trim()}</td>`)
                            .join("")}</tr>`
                    )
                    .join("");
    
                return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
            });
        };
    
        // **🔥 Step 2: Apply the Transformation to Markdown Content**
        const formattedContent = formatMarkdownTables(highlightBlockquotes(content));
    
        return (
            <ReactMarkdown
                rehypePlugins={[rehypeRaw]} // Enables raw HTML processing
                components={{
                    // ✅ **Custom Table Handling (Styling)**
                    table({ children }) {
                        return (
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    margin: "20px 0",
                                    fontSize: "16px",
                                    textAlign: "left",
                                    backgroundColor: "#f8f9fa",
                                    border: "1px solid #ddd",
                                    maxHeight:"50vh",
                                    overflowY:"auto",
                        
                                }}
                            >
                                {children}
                            </table>
                        );
                    },
    
                    thead({ children }) {
                        return (
                            <thead
                                style={{
                                    backgroundColor: "#e6eeff",
                                    color: "black",
                                }}
                            >
                                {children}
                            </thead>
                        );
                    },
    
                    tbody({ children }) {
                        return <tbody>{children}</tbody>;
                    },
    
                    tr({ children }) {
                        return (
                            <tr
                                style={{
                                    borderBottom: "1px solid #dddddd",
                                }}
                            >
                                {children}
                            </tr>
                        );
                    },
    
                    th({ children }) {
                        return (
                            <th
                                style={{
                                    padding: "10px",
                                    border: "1px solid #dddddd",
                                    fontWeight: "bold",
                                    textAlign: "left",
                                }}
                            >
                                {children}
                            </th>
                        );
                    },
    
                    td({ children }) {
                        return (
                            <td
                                style={{
                                    padding: "10px",
                                    border: "1px solid #dddddd",
                                }}
                            >
                                {children}
                            </td>
                        );
                    },
    
                    // ✅ **Custom Images**
                    img({ src, alt, ...props }) {
                        return (
                            <img
                                src={src}
                                alt={alt || "Image description"}
                                className="custom-image"
                                {...props}
                            />
                        );
                    },
    
                    // ✅ **Custom Code Blocks**
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
    
                        if (!inline && match) {
                            const language = match[1];
    
                            if (language === "text") {
                                return (
                                    <div className="text-block">
                                        {String(children).trim()}
                                    </div>
                                );
                            }
    
                            return (
                                <div className="code_nav">
                                    <nav className="code-navbar">
                                        <span className="language-title">{language}</span>
                                        <button className="copy-button" onClick={handleCopy}>
                                            Copy
                                        </button>
                                    </nav>
                                    <div
                                        className={`custom-code-block language-${language}`}
                                        dangerouslySetInnerHTML={{
                                            __html: highlightPythonCode(String(children)),
                                        }}
                                    />
                                </div>
                            );
                        }
    
                        return (
                                <code
                                    style={{
                                        backgroundColor: "#FCE4EC",
                                        padding: "2px 5px",
                                        borderRadius: "4px",
                                        fontFamily: "monospace",
                                        color: "#d63384",
                                        fontSize: "0.9em",
                                    }}
                                >
                                    {children}
                                </code>
                                );
                    },


                    // ✅ **Custom Blockquotes**
                    blockquote({ children }) {
                        return (
                                <blockquote
                                    style={{
                                        borderLeft: "4px solid #ccc",
                                        paddingLeft: "5px",
                                        margin: "10px 0",
                                        color: "#555",
                                        fontStyle: "italic",
                                        backgroundColor: "#f8f9fa",
                                        padding: "15px",
                                        borderRadius: "5px",
                                        position: "relative",
                                        lineHeight: "1.4",
                                        marginLeft: "20px",
                                        paddingBottom: '5px',
                                        paddingTop: '5px',
                                        paddingRight: '5px'
                                    }}
                                >
                                    <span style={{ fontSize: "24px", fontWeight: "bold", color: "#999", marginRight: "5px" }}>
                                        “
                                    </span>
                                    <span>{children}</span>
                                    <span style={{ fontSize: "24px", fontWeight: "bold", color: "#999", marginLeft: "5px" }}>
                                        ”
                                    </span>
                                </blockquote>
                                );
                    },
    
                    // ✅ **Custom Lists**
                    ul({ children }) {
                        return (
                            <ul
                                style={{
                                    paddingLeft: "25px",
                                    listStyleType: "circle",
                                }}
                            >
                                {children}
                            </ul>
                        );
                    },
    
                    ol({ children }) {
                        return (
                            <ol
                                style={{
                                    paddingLeft: "25px",
                                    listStyleType: "decimal",
                                    margin: "0px",
                                }}
                            >
                                {children}
                            </ol>
                        );
                    },
    
                    li({ children }) {
                        return (
                            <li
                                style={{
                                    marginBottom: "5px",
                                    paddingLeft: "5px",
                                    lineHeight: "1.0",
                                    listStyleType: "inherit",
                                    marginTop: "10px",
                                    marginLeft: "20px",
                                }}
                            >
                                {children}
                            </li>
                        );
                    },
    
                    // ✅ **Custom Bold & Italic Text**
                    strong({ children }) {
                        return <strong style={{ fontWeight: "bold", color: "black" }}>{children}</strong>;
                    },
    
                    em({ children }) {
                        return <em style={{ fontStyle: "italic", color: "#6c757d" }}>{children}</em>;
                    },
                }}
            >
                {formattedContent}
            </ReactMarkdown>
        );
    };
    
    
    
    
    const renderScreen = () => {
            if (isPracticeMode) {
                return (
                    <div className="practice-mode">
                        <div className='instruct-practice-section' style={{ width: `${contentWidth}%` }} >
                            {/* Typing effect for instructions */}
                            {practiceScreen?.instructions && (
                                    <div id="instructions" className="instructions-section-page">
                                        <h2>Instruction</h2>

                            {/* While typing: show raw text */}
                            {!isTypingComplete && (
                            <TypingEffect
                                text={practiceScreen.instructions}
                                speed={5}
                                onTyping={(typedText) => setTypedInstructionText(typedText)}
                                onComplete={() => setIsTypingComplete(true)}  // Mark typing as complete
                            >
                                <p>{typedInstructionText}</p>
                            </TypingEffect>
                        )}

                        {/* After typing: render markdown-styled content */}
                        {isTypingComplete && (
                            <div className="typed-markdown-content">
                                {renderMarkdown(practiceScreen.instructions)}
                            </div>
                                    )}
                                </div>
                            )}

                        </div>
                        <div ref={resizerRef} className="resizers" onMouseDown={startResizing} style={{ left: `${contentWidth + 1}%` }}></div>
                        <div className='code-practice-section' key={contentWidth} style={{ width: `${100 - contentWidth}%` }}>
                            <PythonCodeEditor screenIndex={currentScreenIndex} notebook={notebook}/>
                        </div>           
                       {/*                         
                        <button onClick={() => setIsPracticeMode(false)}>Back to Learning</button> */}
                    </div>
                );
            }
            if (notebook.length === 0) {
                return <p className="loading">Loading...</p>;
            }
            const screen = notebook[currentScreenIndex];
    
            return (
                <div className="content-container">
                {notebook.length > 0 && notebook[currentScreenIndex]?.type !== "takeaways" ? (
                    <>
                        <div id="tutor-section" className="tutor-section" style={{ width: `${contentWidth}%` }}>
                            <div className="tutor-content">
                                {steps.map((text, index) => (
                                    <div key={index}>
                                        {currentStep === index && (
                                            <TypingEffect text={text} speed={50} onComplete={handleNextStep} />
                                        )}
                                        {currentStep > index && <p>{text}</p>}
                                    </div>
                                ))}
                            </div>
                            <ChatInput />
                        </div>

                        <div ref={resizerRef} className="resizers" onMouseDown={startResizing} style={{ left: `${contentWidth}%` }}></div>

                        <div id="content-sections" className="content-sections" key={contentWidth} style={{ width: `${100 - contentWidth}%` }}>
                            {screen.learn && (
                                <div id="learn" className="learn-section-page">
                                    <h2>{screen.title} {currentScreenIndex + 1} of {filteredNotebook.length}</h2>
                                    {renderMarkdown(screen.learn)}
                                </div>
                            )}

                            {screen.type === "code" && (
                                <div className="practice-button">
                                    <button onClick={handlePracticeClick}>Practice</button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (

                    
                    // If the type is "takeaways", wrap in a div with a title
                    notebook.length > 0 && notebook[currentScreenIndex]?.type === "takeaways" && (
                        <div className="takeaways-container">
                            <h2 className="takeaways-title">{notebook.tittle}</h2>
                            <TakeawaysPDF content={notebook[currentScreenIndex]?.learn || ""} lesson_title={notebook[0]?.title} />
                        </div>
                    )
                )}
            </div>

            
            );
        };

    
  return (
    <div className="page-container">
    <Navbar
        notebook={filteredNotebook}
        currentScreenIndex={currentScreenIndex}
        handleSelectScreen={handleSelectScreen}
    />
    <div>{renderScreen()}</div>

    </div>
  );
};

export default LearnPage;
