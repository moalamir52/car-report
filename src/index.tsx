import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import DailyBookingReport from "./report.tsx";
import ContractsReport from "./ContractsReport.tsx";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);

function App() {
  const [view, setView] = useState<"daily" | "contracts">("daily");

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "Cairo, Arial, sans-serif" }}>
      {view === "daily" ? (
        <>
          <DailyBookingReport />
          <div style={{ height: 90 }} /> {/* هذا السطر يضيف مساحة فارغة أسفل الصفحة */} 
          <div
            style={{
              position: 'fixed',
              left: 0,
              bottom: 0,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.95)',
              padding: '24px 0',
              boxShadow: '0 -2px 12px #6A1B9A',
              zIndex: 100
            }}
          >
            <button
              onClick={() => setView("contracts")}
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                border: '2.5px solid #6A1B9A',
                backgroundColor: '#FFD600',
                color: '#4A148C',
                fontWeight: 'bold',
                fontSize: '18px',
                boxShadow: '0 2px 12pxrgb(176, 24, 236)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#FFC300')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#FFD600')}
            >
              📄 Open Contracts Report
            </button>
          </div>
        </>
      ) : (
        <ContractsReport onBack={() => setView("daily")} />
      )}
    </div>
  );
}
