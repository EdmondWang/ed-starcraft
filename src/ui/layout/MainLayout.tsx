import { ReactNode } from 'react';

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Ed Starcraft</h1>
        <span className="app-subtitle">RTS Prototype</span>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}


