// home.js - ULverse Homepage Interactive Features
// 위치: /home/workdir/artifacts/home.js

document.addEventListener('DOMContentLoaded', () => {
  initTailwind();
  initSmoothScroll();
  initTierCardInteractions();
  initSearchFilter();
  initBackToTop();
  initRandomHighlight();
  initHeaderLoadingState();
  initKonamiCode();
});

// Tailwind 동적 설정
function initTailwind() {
  const style = document.createElement('style');
  style.innerHTML = `
    .tier-card {
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
                  box-shadow 0.4s ease,
                  border-color 0.3s ease;
    }
    .tier-card:hover {
      transform: translateY(-12px) scale(1.02);
      box-shadow: 0 30px 70px -15px rgb(99 102 241 / 0.25);
    }
    .section-header {
      background: linear-gradient(90deg, #fff, #a5b4fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .glass {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .nav-active {
      color: white;
      position: relative;
    }
    .nav-active:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(to right, #6366f1, transparent);
    }
  `;
  document.head.appendChild(style);
}

// 부드러운 스크롤 (티어 섹션으로)
function initSmoothScroll() {
  const scrollBtn = document.getElementById('scroll-to-tiers');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const tiersSection = document.getElementById('tiers');
      if (tiersSection) {
        tiersSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    });
  }
}

// 티어 카드 상호작용 강화
function initTierCardInteractions() {
  const cards = document.querySelectorAll('.tier-card');
  
  cards.forEach((card, index) => {
    // 호버 시 글로우 효과
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = `0 0 0 1px rgb(99 102 241 / 0.3), 
                              0 25px 50px -12px rgb(0 0 0 / 0.4)`;
      
      // 아이콘 애니메이션
      const icon = card.querySelector('.tier-icon');
      if (icon) {
        icon.style.transform = 'scale(1.15) rotate(5deg)';
        icon.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      }
    });

    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
      const icon = card.querySelector('.tier-icon');
      if (icon) icon.style.transform = '';
    });

    // 클릭 시 리플 효과
    card.addEventListener('click', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const ripple = document.createElement('div');
      ripple.className = 'absolute pointer-events-none rounded-full bg-white/30';
      ripple.style.left = `${x}%`;
      ripple.style.top = `${y}%`;
      ripple.style.width = '0';
      ripple.style.height = '0';
      ripple.style.transform = 'translate(-50%, -50%)';
      ripple.style.transition = 'width 0.6s ease, height 0.6s ease, opacity 0.6s ease';
      
      card.style.position = 'relative';
      card.style.overflow = 'hidden';
      card.appendChild(ripple);
      
      setTimeout(() => {
        ripple.style.width = '300px';
        ripple.style.height = '300px';
        ripple.style.opacity = '0';
      }, 10);
      
      setTimeout(() => ripple.remove(), 700);
    });

    // 키보드 접근성
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

// 티어 검색 / 필터 기능
function initSearchFilter() {
  const searchContainer = document.createElement('div');
  searchContainer.className = 'max-w-md mx-auto mb-8';
  searchContainer.innerHTML = `
    <div class="relative group">
      <input 
        type="text" 
        id="tier-search" 
        placeholder="티어 또는 설명 검색... (예: 신계, 플래티넘)" 
        class="w-full bg-zinc-900 border border-zinc-700 focus:border-indigo-500 text-white placeholder-zinc-500 rounded-2xl py-3 pl-12 pr-5 text-sm outline-none transition-all"
      >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-5 top-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <div class="absolute right-3 top-3 text-xs px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-md hidden group-focus-within:block">
        ESC
      </div>
    </div>
  `;
  
  const tiersSection = document.getElementById('tiers');
  if (tiersSection) {
    tiersSection.parentNode.insertBefore(searchContainer, tiersSection);
    
    const searchInput = document.getElementById('tier-search');
    
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.tier-card');
      
      let visibleCount = 0;
      
      cards.forEach(card => {
        const title = card.querySelector('h2')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.text-xs.text-zinc-500')?.textContent.toLowerCase() || '';
        
        if (title.includes(term) || desc.includes(term)) {
          card.style.display = '';
          card.style.opacity = '1';
          visibleCount++;
        } else {
          card.style.opacity = '0.3';
          setTimeout(() => {
            if (card.style.opacity === '0.3') card.style.display = 'none';
          }, 200);
        }
      });
      
      // 검색 결과 없을 때 안내
      const noResult = document.getElementById('no-result-message');
      if (visibleCount === 0 && term.length > 0) {
        if (!noResult) {
          const msg = document.createElement('div');
          msg.id = 'no-result-message';
          msg.className = 'text-center py-12 text-zinc-400';
          msg.innerHTML = `"<span class="text-white">${term}</span>" 에 대한 검색 결과가 없습니다.<br><span class="text-xs">다른 키워드로 검색해보세요.</span>`;
          tiersSection.appendChild(msg);
        }
      } else if (noResult) {
        noResult.remove();
      }
    });
    
    // ESC 키로 검색 초기화
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.blur();
      }
    });
  }
}

// Back to Top 버튼
function initBackToTop() {
  const btn = document.createElement('button');
  btn.id = 'back-to-top';
  btn.className = `fixed bottom-8 right-8 z-50 w-12 h-12 rounded-2xl 
                   bg-zinc-900 border border-zinc-700 flex items-center justify-center
                   text-white opacity-0 pointer-events-none transition-all duration-300
                   hover:bg-zinc-800 hover:border-zinc-600`;
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  `;
  
  document.body.appendChild(btn);
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 600) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
  });
  
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 랜덤 티어 하이라이트 (이스터에그)
function initRandomHighlight() {
  const highlightBtn = document.createElement('button');
  highlightBtn.className = `fixed bottom-8 left-8 z-50 px-4 py-2 text-xs rounded-2xl
                            bg-zinc-900 border border-zinc-700 text-zinc-400
                            hover:text-white hover:border-zinc-600 transition-colors flex items-center gap-x-2`;
  highlightBtn.innerHTML = `
    <span>🎲</span>
    <span>랜덤 티어</span>
  `;
  
  document.body.appendChild(highlightBtn);
  
  highlightBtn.addEventListener('click', () => {
    const cards = Array.from(document.querySelectorAll('.tier-card'));
    if (cards.length === 0) return;
    
    // 모든 카드 초기화
    cards.forEach(c => c.style.borderColor = '');
    
    // 랜덤 선택
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    randomCard.style.borderColor = '#6366f1';
    randomCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 2초 후 강조 해제
    setTimeout(() => {
      randomCard.style.borderColor = '';
    }, 2200);
  });
}

// 헤더 로딩 상태 표시
function initHeaderLoadingState() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  if (!headerPlaceholder) return;
  
  // common.js가 header를 로드하기 전에 로딩 표시
  const loading = document.createElement('div');
  loading.className = 'h-20 flex items-center justify-center bg-zinc-900 border-b border-zinc-800';
  loading.innerHTML = `
    <div class="flex items-center gap-x-3 text-xs text-zinc-500">
      <div class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
      <span>헤더 로딩 중...</span>
    </div>
  `;
  
  headerPlaceholder.appendChild(loading);
  
  // common.js가 로드 완료되면 제거 (약간의 지연)
  setTimeout(() => {
    if (loading.parentNode) loading.parentNode.removeChild(loading);
  }, 800);
}

// 코나미 코드 이스터에그 (위 → ↑ → ↓ → ← → → ← → B A)
function initKonamiCode() {
  let konami = [];
  const secret = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  
  document.addEventListener('keydown', (e) => {
    konami.push(e.key);
    if (konami.length > secret.length) konami.shift();
    
    if (konami.join('') === secret.join('')) {
      triggerUltimateMode();
      konami = [];
    }
  });
}

function triggerUltimateMode() {
  const body = document.body;
  body.style.transition = 'filter 1.5s ease';
  body.style.filter = 'hue-rotate(180deg) saturate(1.4)';
  
  // 모든 카드에 파티클 효과
  const cards = document.querySelectorAll('.tier-card');
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.style.boxShadow = '0 0 60px -10px rgb(129 140 248)';
      setTimeout(() => {
        card.style.boxShadow = '';
      }, 800);
    }, i * 80);
  });
  
  // 3초 후 원래대로
  setTimeout(() => {
    body.style.filter = '';
  }, 3000);
  
  // 콘솔에 메시지
  console.log('%c[ULverse] Ultimate Mode Activated! 🌌', 'color:#6366f1');
}