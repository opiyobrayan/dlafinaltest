import React from "react";

const ChatInput = () => {
  return (
    <div className="chat-container">
      <input
        type="text"
        placeholder="Ask me anything"
        className="chat-input"
      />
      <button className="send-button">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="send-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10l9-6 9 6M3 10l9 6 9-6M3 10v4l9 6 9-6v-4"
          />
        </svg>
      </button>
    </div>
  );
};

export default ChatInput;
