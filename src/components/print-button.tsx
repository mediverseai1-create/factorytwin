"use client";
export function PrintButton() {
  return <button className="btn-line" onClick={() => window.print()}>Print / Save as PDF</button>;
}
