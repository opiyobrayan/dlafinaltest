import { createRoot } from 'react-dom/client';
import React, { useEffect, useState } from "react";
import LearnPage from './Learn';
const HomeViewer = () => {
    const [notebook, setNotebook] = useState([]);
    const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
    return (
        <div className='main-view'>
             <h1> Datalaernai(DLA)</h1>
             <p>Welcome to Datalearnai.com, Here you will about, Data Science,
                AI, Machine Learning and even how to create softwares and AI Agents
             </p>
            </div>
    );
};

const renderReactApp = (Component, rootId) => {
    const rootElement = document.getElementById(rootId);
    if (rootElement) {
        const root = createRoot(rootElement);
        root.render(<Component />);
    }
};
renderReactApp(HomeViewer, "home");
renderReactApp(LearnPage, "learn-lesson-id");

export default HomeViewer;
