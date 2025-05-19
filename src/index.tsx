import React from "react";
import ReactDOM from "react-dom/client";
import DailyBookingReport from "./report.tsx";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <DailyBookingReport />
  </React.StrictMode>
);
