"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Something went wrong
          </h2>
          <p style={{ color: "#64748b", marginTop: 8 }}>
            The application hit an unexpected error.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              borderRadius: 8,
              background: "#0084cd",
              color: "white",
              padding: "8px 16px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
