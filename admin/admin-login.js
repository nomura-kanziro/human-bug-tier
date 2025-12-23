exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { id, pw } = JSON.parse(event.body);

  if (
    id === process.env.ADMIN_ID &&
    pw === process.env.ADMIN_PW
  ) {
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  }

  return {
    statusCode: 401,
    body: JSON.stringify({ success: false }),
  };
};

async function login() {
  const id = document.getElementById("adminId").value;
  const pw = document.getElementById("adminPw").value;

  const res = await fetch("/.netlify/functions/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, pw }),
  });

  if (res.ok) {
    localStorage.setItem("isAdmin", "true");
    location.href = "../Contact us/index.html";
  } else {
    alert("아이디 또는 비밀번호가 틀렸습니다.");
  }
}
