import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import GuideMode from './components/GuideMode';
import LoadingScreen from './components/LoadingScreen';
import SeasonalBackdrop from './components/SeasonalBackdrop';
import AgentBot from './components/AgentBot';
import { AgentBotProvider } from './context/AgentBotContext';
import { AuthProvider } from './context/AuthContext';

// 전역 CSS — 바닐라 root-render 의 파일을 그대로 가져왔다(클래스명 동일). 순서는 바닐라 <head> 순서와 같다.
import './styles/theme.css';
import './styles/common.css';
import './styles/notice.css';
import './styles/Header_Footer.css';
import './styles/index-home.css';
import './styles/react-extra.css';
// 전 페이지 공용 마감(서체·초점·스크롤바) — 페이지 CSS 를 덮어야 하므로 반드시 맨 마지막
import './styles/design-system.css';
// 앱 뼈대(헤더·푸터·404·빈 상태) 마감 — 원본 뼈대 CSS 위에서 덮어쓰므로 design-system 바로 뒤
import './styles/app-shell.css';
// 가이드 모드(/guide 화면 + 켜진 동안의 오버레이)
import './styles/guide.css';
// 이벤트 디자인(계절 배경) — 페이지 기본 배경을 덮어야 하므로 맨 마지막
import './styles/season.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LoadingScreen />
        <SeasonalBackdrop />
        {/* 에이전트 봇 상태는 라우트 바깥에 둔다 — 페이지를 옮겨도, 모달을 닫아도 작업이 끝까지 진행된다 */}
        <AgentBotProvider>
          <App />
          <GuideMode />
          <AgentBot />
        </AgentBotProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
