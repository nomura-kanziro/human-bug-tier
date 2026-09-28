/* ====================================================================
 * 앱 발송 메일 공용 HTML 템플릿
 * ------------------------------------------------------------------
 * 회원가입 인증 / 아이디 찾기 / 비밀번호 재설정 메일이 같은 틀을 쓴다
 * (2026-09-29 창시자 예시문 기준):
 *   로고 → 제목 → 감사 인사 → 안내 문구 → [버튼] → 버튼 아래 안내
 *   → 문의 안내(문의하기 페이지·카카오톡 오픈채팅) → "감사합니다."
 *   → 구분선 → 한 줄 띄우고 발신전용 안내
 *
 * 메일 앱은 <style>·flex·외부 CSS 를 제대로 지원하지 않으므로 표(table) 레이아웃 +
 * 인라인 스타일만 쓴다. 로고는 webp 를 못 여는 메일 앱(Outlook 등)이 있어 PNG 를 쓰고,
 * 메일 안에서는 상대경로가 안 되므로 getAppBaseUrl() 로 만든 절대 주소를 넘겨받는다.
 * ==================================================================== */

// 메일 로고(PNG) — root-cloudflare/public/tier-media/tier-image/logo2.png (빌드 시 dist 로 복사됨)
const LOGO_PATH = '/tier-media/tier-image/logo2.png';
// 문의 안내에 함께 넣는 카카오톡 오픈채팅 주소(창시자 예시문에 있던 값)
const SUPPORT_KAKAO_URL = 'https://open.kakao.com/o/sX6H0F7h';
const SEND_ONLY_NOTICE = '본 메일은 발신전용 메일입니다. 이메일 수신 설정은 카카오디벨로퍼스 알림설정을 이용해주시길 바랍니다.';

// 닉네임처럼 사용자가 입력한 값이 메일 HTML 로 해석되지 않도록 이스케이프한다
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FONT = "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif";

/**
 * @param {object} opts
 * @param {string} opts.appUrl   getAppBaseUrl(req) 결과(끝 슬래시 없음)
 * @param {string} opts.title    본문 큰 제목(예: '회원가입 인증')
 * @param {string} opts.message  버튼 위 안내 문구(텍스트, 이스케이프됨)
 * @param {string} [opts.bodyHtml] 안내 문구 아래에 넣을 HTML(호출하는 쪽에서 값 이스케이프 책임)
 * @param {{label:string,url:string}} [opts.button] 가운데 파란 버튼
 * @param {string} [opts.note]   버튼 아래 작은 안내(텍스트, 이스케이프됨)
 */
function buildAppMailHtml({ appUrl, title, message, bodyHtml = '', button, note }) {
  const base = String(appUrl || '').replace(/\/$/, '');
  const inquiryUrl = `${base}/inquiry`;
  const linkStyle = 'color:#9b4a6b;text-decoration:underline;';

  const buttonHtml = button ? `
          <tr>
            <td align="center" style="padding:4px 0 8px;">
              <a href="${escapeHtml(button.url)}" target="_blank"
                 style="display:inline-block;min-width:220px;padding:16px 40px;background-color:#0070c0;color:#ffffff;text-decoration:none;border-radius:10px;font-size:22px;font-weight:bold;letter-spacing:1px;font-family:${FONT};">
                ${escapeHtml(button.label)}
              </a>
            </td>
          </tr>` : '';

  const noteHtml = note ? `
          <tr>
            <td align="center" style="padding:0 0 40px;font-size:15px;color:#222222;font-family:${FONT};">${escapeHtml(note)}</td>
          </tr>` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;background-color:#f2f2f2;border:1px solid #1f2d4d;">
          <tr>
            <td align="center" style="padding:32px 24px 8px;">
              <img src="${escapeHtml(base + LOGO_PATH)}" width="120" height="120" alt="human-bug-tier"
                   style="display:block;width:120px;height:120px;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 40px;font-size:28px;font-weight:bold;color:#111111;font-family:${FONT};">${escapeHtml(title)}</td>
          </tr>
          <tr>
            <td style="padding:0 28px;font-size:16px;line-height:1.7;color:#222222;font-family:${FONT};">
              <p style="margin:0 0 16px;">항상 human-bug-tier를 이용해 주셔서 감사합니다.</p>
              <p style="margin:0 0 16px;">${escapeHtml(message)}</p>
              ${bodyHtml}
            </td>
          </tr>${buttonHtml}${noteHtml}
          <tr>
            <td align="center" style="padding:0 28px 32px;font-size:13px;line-height:1.6;color:#222222;font-family:${FONT};">
              도움이 필요하시거나 문의 사항이 있으시면 고객지원 이메일로 연락해 주세요:<br>
              <a href="${escapeHtml(inquiryUrl)}" target="_blank" style="${linkStyle}">${escapeHtml(inquiryUrl)}</a><br>
              <a href="${SUPPORT_KAKAO_URL}" target="_blank" style="${linkStyle}">${SUPPORT_KAKAO_URL}</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 32px;font-size:14px;color:#222222;font-family:${FONT};">감사합니다.</td>
          </tr>
          <tr>
            <td style="padding:0 28px;"><hr style="border:0;border-top:1px solid #c8c8c8;margin:0;"></td>
          </tr>
          <tr>
            <td style="padding:0 28px;font-size:12px;line-height:1.6;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 28px;font-size:12px;line-height:1.6;color:#777777;font-family:${FONT};">${SEND_ONLY_NOTICE}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { buildAppMailHtml, escapeHtml };
