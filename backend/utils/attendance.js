/* ====================================================================
 * 출석체크 — 로그인할 때마다 하루(한국 시간 00:00 ~ 24:00)에 한 번, 연속 출석 일차별 포인트 자동 지급
 * ------------------------------------------------------------------
 * 사용자가 따로 누르는 버튼은 없다. 로그인 성공 직후 authController.login 이 grantDailyAttendance() 를 부른다.
 *
 *  일차   1   2   3   4   5   6   7
 *  포인트 10  10  10  25  10  10  50      (ATTENDANCE_REWARDS)
 *
 *  - "하루"는 한국 시간(KST) 달력 날짜 기준이다(utils/kstDate.js). 서버가 UTC 여도 자정 KST 에 바뀐다.
 *  - 바로 전날에 이어서 로그인하면 연속 출석 → 다음 일차로 넘어간다(지난 날은 체크된 채로 유지).
 *  - 7일차를 받은 다음 날 로그인하면 1일차부터 다시 시작한다(7일 지나면 초기화).
 *  - 하루라도 빠지면 연속이 끊겨 다음 로그인은 1일차다.
 *  - 같은 날 몇 번을 로그인해도 첫 로그인에서만 지급한다. LuckProfile.lastAttendanceDate / attendanceStreak 에 남긴다.
 *  - 읽어 둔 상태(마지막 출석일) 그대로일 때만 갱신하는 조건부 갱신(findOneAndUpdate)이라, 같은 계정이 동시에 여러 번
 *    로그인해도 한 번만 들어간다.
 *  - 지급 내역은 포인트 원장(LuckPointLog, source 'attendance')에 남아 관리자 "행운 뽑기 관리 → 포인트 내역"에서 보인다.
 *  - 출석체크 때문에 로그인이 실패하면 안 되므로 어떤 오류도 던지지 않고 { granted:false } 로 돌려준다.
 * ==================================================================== */
const LuckProfile = require('../models/LuckProfile');
const { getKstDateString } = require('./kstDate');
const { recordPointChange } = require('./luckPointLog');

const ATTENDANCE_REWARDS = [10, 10, 10, 25, 10, 10, 50];
const CYCLE_DAYS = ATTENDANCE_REWARDS.length;
const DAY_MS = 24 * 60 * 60 * 1000;

// 프로필의 출석 상태를 "출석판" 모양으로 풀어 준다. 지급 판정과 마이페이지 출석판이 같은 계산을 쓴다.
//   checkedDays : 지금 화면에서 체크돼 있는 일차 수(1일차부터 연속으로)
//   todayDone   : 오늘(KST) 이미 출석했는지
//   nextDay     : todayDone 이면 "내일" 받을 일차, 아니면 "오늘 로그인하면" 받을 일차
function describeAttendance(profile, now = new Date()) {
  const today = getKstDateString(now);
  const yesterday = getKstDateString(new Date(now.getTime() - DAY_MS));
  const last = (profile && profile.lastAttendanceDate) || '';
  const streak = Math.min(CYCLE_DAYS, Math.max(0, Number(profile && profile.attendanceStreak) || 0));

  if (last === today && streak >= 1) {
    return { today, last, checkedDays: streak, todayDone: true, nextDay: streak >= CYCLE_DAYS ? 1 : streak + 1 };
  }
  if (last === yesterday && streak >= 1 && streak < CYCLE_DAYS) {
    return { today, last, checkedDays: streak, todayDone: false, nextDay: streak + 1 };
  }
  // 연속이 끊겼거나, 7일차를 마치고 새 주기가 시작되는 경우 → 판이 비고 1일차부터
  return { today, last, checkedDays: 0, todayDone: false, nextDay: 1 };
}

async function grantDailyAttendance(userId, now = new Date()) {
  const today = getKstDateString(now);
  try {
    const profile = await LuckProfile.findOne({ userId }).select('lastAttendanceDate attendanceStreak').lean();
    const state = describeAttendance(profile, now);
    if (state.todayDone) return { granted: false, already: true, date: today };

    const day = state.nextDay;
    const reward = ATTENDANCE_REWARDS[day - 1];
    // 읽었을 때의 마지막 출석일 그대로일 때만 갱신된다(옛 문서에는 필드가 없을 수 있어 빈 값/없음을 같이 본다)
    const lastFilter = state.last ? state.last : { $in: ['', null] };
    const updated = await LuckProfile.findOneAndUpdate(
      { userId, lastAttendanceDate: lastFilter },
      { $set: { lastAttendanceDate: today, attendanceStreak: day }, $inc: { points: reward } },
      { upsert: true, new: true },
    );
    await recordPointChange({
      userId,
      source: 'attendance',
      delta: reward,
      balanceAfter: updated.points,
      detail: `출석체크 ${day}일차 (${today})`,
    });
    return { granted: true, day, points: reward, balance: updated.points, date: today };
  } catch (err) {
    // 동시에 다른 로그인이 먼저 받았다면 조건이 안 맞아 upsert 가 같은 userId 를 만들려다 unique 오류(11000)가 난다 = 이미 받음
    if (err && err.code === 11000) return { granted: false, already: true, date: today };
    console.error('출석체크 지급 실패:', err.message);
    return { granted: false, date: today };
  }
}

module.exports = { grantDailyAttendance, describeAttendance, ATTENDANCE_REWARDS, CYCLE_DAYS };
