const mongoose = require('mongoose');

/* ====== SiteSetting 스키마 ======
 * 사이트 전체에 한 개씩만 있는 운영 설정(키-값). 관리자가 바꾸면 모든 방문자에게 바로 적용된다.
 * 지금 쓰는 키:
 *   seasonalTheme — 이벤트 디자인(계절 배경). 'none' | 'halloween' | 'christmas'. 값이 하나라서
 *                   한 배경을 켜면 다른 배경은 자동으로 꺼진다(관리자 페이지 "이벤트 디자인 적용").
 * 읽기·쓰기는 controllers/siteSettingController.js 한 곳을 거친다.
 */
const siteSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  // 마지막으로 바꾼 관리자 이름(기록용)
  updatedBy: { type: String, default: '' },
}, {
  timestamps: true,
});

const SiteSetting = mongoose.model('SiteSetting', siteSettingSchema);

module.exports = SiteSetting;
