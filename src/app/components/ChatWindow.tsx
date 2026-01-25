import ChatInput from "./ChatInput";
import Message from "./Message";

export default function ChatWindow() {
  return (
    <main className="flex-1 flex flex-col bg-gray-100">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <Message role="assistant" content="Hi! Ask me anything about your documents." />
        <Message role="user" content="What is the leave policy?" />
      </div>

      <ChatInput />
    </main>
  );
}
