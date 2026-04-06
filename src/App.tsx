import Sidebar from "./components/sidebar";
import Editor from "./components/editor";
import Toolbar from "./components/toolbar";

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Editor />
      </div>
      <Toolbar />
    </div>
  );
}
