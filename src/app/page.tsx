import Image from "next/image";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

export default function Home() {
  return (
     <div className="flex h-screen">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
