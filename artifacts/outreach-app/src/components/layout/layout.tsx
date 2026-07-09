import { Sidebar } from "./sidebar";
import { AIChatbot } from "../chat/ai-chatbot";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <AIChatbot />
    </div>
  );
}