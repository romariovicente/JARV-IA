import React from "react";
import AppProviders from "./providers/AppProviders";

import TopBar from "../components/layout/TopBar";
import LeftSidebar from "../components/layout/LeftSidebar";
import RightDiagnostics from "../components/layout/RightDiagnostics";
import BottomComposer from "../components/layout/BottomComposer";
import ChatWindow from "../components/chat/ChatWindow";

import JarvisScene from "../scene/JarvisScene";

export default function App() {
  return (
    <AppProviders>
      <div className="jarvis-app">

        <TopBar />

        <div className="jarvis-layout">

          <LeftSidebar />

          <main className="jarvis-main">
            <JarvisScene />
            <ChatWindow />
          </main>

          <RightDiagnostics />

        </div>

        <BottomComposer />

      </div>
    </AppProviders>
  );
}
