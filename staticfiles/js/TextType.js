import React, { useState, useEffect } from "react";

const TypingEffect = ({ text, speed = 50, onComplete }) => {
  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete(); // Trigger the callback when typing is complete
    }
  }, [index, text, speed, onComplete]);

  return <span>{displayText}</span>;
};

export default TypingEffect;
