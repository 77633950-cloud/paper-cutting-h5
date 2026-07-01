import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "@/pages/HomePage";
import PatternSelectPage from "@/pages/PatternSelectPage";
import SketchUploadPage from "@/pages/SketchUploadPage";
import CardEditorPage from "@/pages/CardEditorPage";
import ResultPage from "@/pages/ResultPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-full bg-[var(--color-bg)]">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/select" element={<PatternSelectPage />} />
          <Route path="/upload" element={<SketchUploadPage />} />
          <Route path="/editor" element={<CardEditorPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </div>
    </Router>
  );
}
