type Props = {
  role: "user" | "assistant";
  content: string;
};

export default function Message({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-lg px-4 py-2 rounded-lg ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-800"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
