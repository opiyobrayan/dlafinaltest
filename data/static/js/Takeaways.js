import React, { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import html2pdf from "html2pdf.js";

/**
 * ✅ TakeawaysPDF Component
 * - Displays Markdown content with styling
 * - Exports styled content as a PDF
 */
const TakeawaysPDF = ({ content,lesson_title }) => {
  const componentRef = useRef();
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [formattedContent, setFormattedContent] = useState("");

  // ✅ Ensure content is loaded before allowing download
  useEffect(() => {
    if (content && content.trim() !== "") {
      console.log("✅ Markdown content detected, processing...");
      setFormattedContent(formatMarkdownTables(String(content).trim()));
      setIsContentLoaded(true);
    } else {
      console.error("❌ No takeaways content provided!");
      setIsContentLoaded(false);
    }
  }, [content]);

  // ✅ Function to format markdown tables into HTML tables
  const formatMarkdownTables = (markdown) => {
    console.log("📄 Processing Markdown:", markdown);

    const tableRegex = /(?:\n\s*){2,}(\|(?:[^|]+\|)+)\n\n\s*(\|(?:-+\|)+)\n\n((?:\|(?:[^|]+\|)+\n?)+)/g;

    return markdown.replace(tableRegex, (match, header, separator, body) => {
      console.log("🔍 Processing table:", match);

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

  // ✅ Function to generate PDF using html2pdf.js
  const generatePDF = () => {
    if (!componentRef.current) {
      console.error("❌ Nothing to capture for PDF.");
      return;
    }

    console.log("🖨 Generating PDF...");

    const element = componentRef.current;
    const options = {
      margin: 10, // Margin around the content
      filename: "Takeaways.pdf", // Output filename
      image: { type: "jpeg", quality: 0.98 }, // Image quality
      html2canvas: { scale: 2 }, // Scale for better resolution
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }, // PDF format
      pagebreak: { mode: "avoid-all", before: ".page-break" }, // Avoid cutting text
    };

    html2pdf().set(options).from(element).save().then(() => {
      console.log("✅ PDF successfully saved!");
    });
  };

  return (
    <div>
      {/* ✅ Download Button */}
      <button
        onClick={generatePDF}
        style={styles.downloadButton}
        disabled={!isContentLoaded}
      >
        {isContentLoaded ? "Download PDF" : "Loading..."}
      </button>

      {/* ✅ Content Section for PDF */}
      <div ref={componentRef} style={styles.contentContainer}>
        <h2 style={styles.title}>{lesson_title}</h2>
        <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
          {formattedContent}
        </ReactMarkdown>
        
        <div className="page-break" style={styles.pageBreak}></div>
      </div>
    </div>
  );
};

// ✅ Python Syntax Highlighter Function (as provided)
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

// ✅ Custom Markdown Components for Styling
const markdownComponents = {
  table({ children }) {
    return <table style={styles.table}>{children}</table>;
  },

  thead({ children }) {
    return <thead style={styles.thead}>{children}</thead>;
  },

  tbody({ children }) {
    return <tbody>{children}</tbody>;
  },

  tr({ children }) {
    return <tr style={styles.tr}>{children}</tr>;
  },

  th({ children }) {
    return <th style={styles.th}>{children}</th>;
  },

  td({ children }) {
    return <td style={styles.td}>{children}</td>;
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
            <div style={styles.codeNavTakeaways}>
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


  blockquote({ children }) {
    return <blockquote style={styles.blockquote}>{children}</blockquote>;
  },

  ul({ children }) {
    return <ul style={styles.ul}>{children}</ul>;
  },

  ol({ children }) {
    return <ol style={styles.ol}>{children}</ol>;
  },

  li({ children }) {
    return <li style={styles.li}>{children}</li>;
  },

  strong({ children }) {
    return <strong style={styles.strong}>{children}</strong>;
  },

  em({ children }) {
    return <em style={styles.em}>{children}</em>;
  },
};

// ✅ Styles for Markdown Content & PDF
const styles = {
  contentContainer: {
    padding: "20px",
    backgroundColor: "#e6eeff",
    borderRadius: "10px",
    boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)",
    width: "80%",
    margin: "auto",
    border: "2px solid #ddd",
    overflowY:'auto',
    color:'#011d4a',
    marginTop:'0px',
    paddingTop:'0px'
    
  },
  codeNavTakeaways:{
    position: 'relative',  // Required for sticky positioning
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.4)',
    maxHeight: '60vh',
    overflowX: 'auto',
    lineHeight:'1.2',
    border: "3px solid white",
    marginTop:"10px"
  },

  title: {
    textAlign: "center",
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "10px",
    color:'#011d4a'
  },

  downloadButton: {
    position: "sticky",
    top: 0, // Keeps it at the top while scrolling
    backgroundColor: "#011d4a", // Ensure it remains visible
    color: "#e6eeff",
    padding: "10px 15px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    zIndex: 10, // Ensures it stays above content
    marginBottom:'20px',
    marginTop:'0px',
    marginRight:'30px'
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    margin: "20px 0",
    fontSize: "16px",
    textAlign: "left",
    backgroundColor: "#f8f9fa",
    border: "1px solid #ddd",
  },

  thead: {
    backgroundColor: "#e6eeff",
    color: "black",
  },

  tr: {
    borderBottom: "1px solid #ddd",
  },

  th: {
    padding: "10px",
    border: "1px solid #ddd",
    fontWeight: "bold",
    textAlign: "left",
  },

  td: {
    padding: "10px",
    border: "1px solid #ddd",
  },

  codeBlock: {
    backgroundColor: "#1e1e1e",
    color: "#ffffff",
    padding: "10px",
    borderRadius: "5px",
    overflowX: "auto",
    fontSize: "14px",
    lineHeight: "1.4",
    fontFamily: "monospace",
  },

  inlineCode: {
    backgroundColor: "#FCE4EC",
    padding: "2px 5px",
    borderRadius: "4px",
    fontFamily: "monospace",
    color: "#d63384",
    fontSize: "0.9em",
  },
};

export default TakeawaysPDF;
