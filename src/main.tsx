import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const hideSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 600);
  }
};

createRoot(document.getElementById("root")!).render(<App />);

// Hide splash once React has painted
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    hideSplash();
  });
});
