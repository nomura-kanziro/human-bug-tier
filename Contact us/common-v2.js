const isAdmin = localStorage.getItem("isAdmin") === "true";

function goHome() {
  window.location.href = '../home.html'; // 본 사이트의 실제 경로로 수정
}

function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  if (menu.style.right === "0px") {
    menu.style.right = "-260px";
  } else {
    menu.style.right = "0px";
  }
}


function closeMenu() {
  const menu = document.getElementById("sideMenu");
  menu.style.right = "-100%";
}

// 관리자 로그인 & 아웃

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (isAdmin) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

// 문의사항 (서버 기반으로 교체)

document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("commentList");
  const btn = document.getElementById("submitBtn");

  let comments = [];

  function render() {
    listEl.innerHTML = "";

    comments.forEach((c, index) => {
      const div = document.createElement("div");
      div.className = "comment";

      div.innerHTML = `
        <div class="name">${c.name || "익명"}</div>
        <div class="msg">${c.message}</div>
        ${c.answer ? `<div class="answer">관리자 답변: ${c.answer}</div>` : ""}
      `;

      if (isAdmin) {
        div.innerHTML += `
          <div class="admin-actions">
            <button onclick="replyComment('${c.id}')">답변</button>
            <button onclick="deleteComment('${c.id}')">삭제</button>
          </div>
        `;
      }

      listEl.appendChild(div);
    });
  }

  async function loadComments() {
    try {
      const res = await fetch('/.netlify/functions/get-comments');
      if (res.ok) {
        comments = await res.json();
        render();
      } else {
        console.error('댓글 로드 실패', res.status);
      }
    } catch (err) {
      console.error('댓글 로드 에러', err);
    }
  }

  async function addComment(name, message) {
  try {
    const res = await fetch('/.netlify/functions/add-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message })
    });

    // 🔴 서버가 실제로 뭐라고 응답했는지 확인용
    const text = await res.text();
    console.log("서버 응답:", res.status, text);

    if (res.ok) {
      loadComments();
    } else {
      alert('댓글 등록 실패');
    }
  } catch (err) {
    console.error(err);
    alert('댓글 등록 실패');
  }
}


  btn.addEventListener("click", async () => {
    const name = document.getElementById("name").value || "익명";
    const message = document.getElementById("message").value.trim();

    if (!message) {
      alert("댓글을 입력하세요.");
      return;
    }

    await addComment(name, message);
    document.getElementById("message").value = "";
  });

  // 페이지 로드 시 서버에서 댓글 불러오기
  loadComments();
});

function replyComment(commentId) {
  const reply = prompt("관리자 답변을 입력하세요:");
  if (!reply || reply.trim() === "") return;

  fetch('/.netlify/functions/reply-comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentId, answer: reply.trim() })
  }).then(res => {
    if (res.ok) {
      location.reload();
    } else {
      alert("답변 등록 실패");
    }
  }).catch(() => alert("답변 등록 실패"));
}

function deleteComment(commentId) {
  if (!confirm("이 댓글을 삭제할까요?")) return;

  fetch('/.netlify/functions/delete-comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentId })
  }).then(res => {
    if (res.ok) {
      location.reload();
    } else {
      alert("삭제 실패");
    }
  }).catch(() => alert("삭제 실패"));
}