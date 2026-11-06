import { ImageResponse } from "next/og";

// Shared link preview for every page; generated once at build time.
export const alt = "SpendFlow: know where your money went and choose what comes next";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const bars = [44, 66, 50, 79, 60, 91, 70, 56];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#172321", color: "#ffffff", padding: "72px 80px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: "#265be8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 28, height: 22, border: "4px solid #ffffff", borderRadius: 5, display: "flex" }} />
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>spendflow</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
            <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>Know where it went.</div>
            <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, color: "#8fb0ff" }}>Choose what comes next.</div>
          </div>
          <div style={{ fontSize: 26, color: "#b8c5c0" }}>Spending, budgets and bills in one private place.</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, width: 330, height: 300, alignSelf: "center", borderBottom: "3px solid #35403c", paddingBottom: 4 }}>
          {bars.map((height, index) => (
            <div key={index} style={{ display: "flex", alignItems: "flex-end", gap: 4, height: "100%" }}>
              <div style={{ width: 14, height: `${height}%`, background: "#265be8", borderRadius: "3px 3px 0 0" }} />
              <div style={{ width: 14, height: `${Math.max(16, 94 - height)}%`, background: "#f4c84a", borderRadius: "3px 3px 0 0" }} />
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
