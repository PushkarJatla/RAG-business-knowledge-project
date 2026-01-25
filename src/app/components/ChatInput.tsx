"use client";

import { useState } from "react";

export default function ChatInput() {
  const [message, setMessage] = useState("");

  return (
    <form className="p-4 bg-dark border-t flex gap-2">
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a question..."
        className="flex-1 border rounded px-4 py-2"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Send
      </button>
    </form>
  );
}
