import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import LoadingScreen from './components/LoadingScreen';
import { AuthProvider } from './context/AuthContext';

// 전역 CSS — 바닐라 root-render 의 파일을 그대로 가져왔다(클래스명 동일). 순서는 바닐라 <head> 순서와 같다.
import './styles/theme.css';
import './styles/loading-screen.css';
import './styles/common.css';
import './styles/notice.css';
import './styles/Header_Footer.css';
import './styles/index-home.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LoadingScreen />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
