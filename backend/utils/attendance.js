/* ====================================================================
 * 출석체크 — 로그인할 때마다 하루(한국 시간 00:00 ~ 24:00)에 한 번 10포인트 자동 지급
 * ------------------------------------------------------------------
 * 사용자가 따로 누르는 버튼은 없다. 로그인 성공 직후 authController.login 이 grantDailyAttendance() 를 부른다.
 *  - "하루"는 한국 시간(KST) 달력 날짜 기준이다(utils/kstDate.js). 서버가 UTC 여도 자정 KST 에 바뀐다.
 *  - 같은 날 몇 번을 로그인해도 첫 로그인에서만 지급한다. 지급 여부는 LuckProfile.lastAttendanceDate 에 남긴다.
 *  - 판정과 지급을 한 번의 원자적 갱신(findOneAndUpdate)으로 처리해, 같은 계정이 동시에 여러 번 로그인해도 한 번만 들어간다.
 *  - 지급 내역은 포인트 원장(LuckPointLog, source 'attendance')에 남아 관리자 "행운 뽑기 관리 → 포인트 내역"에서 보인다.
 *  - 출석체크 때문에 로그인이 실패하면 안 되므로 어떤 오류도 던지지 않고 { granted:false } 로 돌려준다.
 * ==================================================================== */
const LuckProfile = require('../models/LuckProfile');
const { getKstDateString } = require('./kstDate');
const { recordPointChange } = require('./luckPointLog');

const ATTENDANCE_POINTS = 10;

async function grantDailyAttendance(userId, now = new Date()) {
  const today = getKstDateString(now);
  try {
    // 오늘 아직 출석하지 않은 프로필만 갱신된다. 프로필이 없으면 새로 만들며 같은 갱신이 적용된다.
    const profile = await LuckProfile.findOneAndUpdate(
      { userId, lastAttendanceDate: { $ne: today } },
      { $set: { lastAttendanceDate: today }, $inc: { points: ATTENDANCE_POINTS } },
      { upsert: true, new: true },
    );
    await recordPointChange({
      userId,
      source: 'attendance',
      delta: ATTENDANCE_POINTS,
      balanceAfter: profile.points,
      detail: `출석체크 (${today})`,
    });
    return { granted: true, points: ATTENDANCE_POINTS, balance: profile.points, date: today };
  } catch (err) {
    // 오늘 이미 출석한 프로필은 조건에 안 맞아 upsert 가 같은 userId 를 새로 만들려다 unique 오류(11000)가 난다 = 이미 받음
    if (err && err.code === 11000) return { granted: false, already: true, date: today };
    console.error('출석체크 지급 실패:', err.message);
    return { granted: false, date: today };
  }
}

module.exports = { grantDailyAttendance, ATTENDANCE_POINTS };
