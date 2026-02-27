"use client";

interface AlertMessageProps {
  error?: string;
  success?: string;
}

export default function AlertMessage({ error, success }: AlertMessageProps) {
  if (!error && !success) return null;

  if (error) {
    return (
      <div
        className="mb-4 p-3 text-sm text-center"
        style={{
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          color: "#991b1b",
          borderRadius: 3,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      className="mb-4 p-3 text-sm text-center"
      style={{
        background: "#d1fae5",
        border: "1px solid #6ee7b7",
        color: "#065f46",
        borderRadius: 3,
      }}
    >
      {success}
    </div>
  );
}
