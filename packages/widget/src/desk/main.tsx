import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Desk } from "./Desk";
import "../landing/landing.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Desk />
  </StrictMode>,
);
