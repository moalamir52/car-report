import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import AuthGuard from "./AuthGuard.tsx";
import DailyBookingReport from "./report.tsx";
import ContractsReport from "./ContractsReport.tsx";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);

function App() {
  const [view, setView] = useState<"daily" | "contracts">("daily");

  return (
    <AuthGuard>
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "Cairo, Arial, sans-serif" }}>
      {view === "daily" ? (
        <>
          <DailyBookingReport />
          <div style={{ height: 70 }} /> {/* هذا السطر يضيف مساحة فارغة أسفل الصفحة */} 
          <div
  style={{
    position: 'fixed',
    left: '50%',
    bottom: '20px',
    transform: 'translateX(-50%)',
    width: '20%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(244, 238, 247, 0)',
    padding: '16px',
    boxShadow: '0 2px 12px #6A1B9A',
    borderRadius: '12px',
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
    </AuthGuard>
  );
}
