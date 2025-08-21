import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { FigtreeLoader } from "./lib/fontLoader";

// Initialize font loading
const fontLoader = FigtreeLoader.getInstance();
fontLoader.loadFigtree();

createRoot(document.getElementById("root")!).render(<App />);
