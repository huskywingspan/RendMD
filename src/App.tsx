import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';

function App(): JSX.Element {
  return (
    <div className="h-screen flex flex-col bg-[var(--theme-bg-primary)]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Editor />
        </main>
      </div>
    </div>
  );
}

export default App;
