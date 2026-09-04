/* ======================================================================
 * 행운 뽑기용 캐릭터 데이터 풀
 * ----------------------------------------------------------------------
 * 오늘의 행운 티어용 캐릭터 풀 (1차: 티어당 4~8명만 안전 등록).
 * luckDrawController.js가 DAILY_TIER_WEIGHTS로 먼저 티어(1~9)를 하나 뽑은 뒤,
 * 이 객체에서 해당 티어 키(module.exports[tier])의 배열 중 한 명을
 * pickCharacter()로 균등 확률(랜덤 인덱스)로 골라 결과에 사용한다.
 *
 * 데이터 형태: { [티어번호]: [{ name, imagePath }, ...] }
 *  - name      : 캐릭터 표시 이름(한국어).
 *  - imagePath : tier-class/tierN.html 의 <img src>를 그대로 따르는,
 *                사이트 루트 기준 상대경로. 실제 사용 시 프론트에서
 *                getBasePath() + encodeURI(imagePath) 로 절대 URL을 조립한다.
 * ====================================================================== */
module.exports = {
  1: [
    { name: '우류 타츠오미', imagePath: 'tier-media/1 tier/uryu2paze.jpg' },
    { name: '츠루기 시노부', imagePath: 'tier-media/1 tier/tsurugi.jpg' },
    { name: '사카키 쵸스케', imagePath: 'tier-media/1 tier/sakaki choske.jpg' },
    { name: '오리온', imagePath: 'tier-media/1 tier/orion.jpg' },
    { name: '스오 리츠', imagePath: 'tier-media/1 tier/suo ritsu.jpg' },
    { name: '시덴', imagePath: 'tier-media/1 tier/shiden.jpg' },
  ],
  2: [
    { name: '하카마다 히데코', imagePath: 'tier-media/2 tier/hakamada hidero.jpg' },
    { name: '모리와카 토시로', imagePath: 'tier-media/2 tier/moriwaka.jpg' },
    { name: '이치죠 코메이', imagePath: 'tier-media/2 tier/ichijyo komei.jpg' },
    { name: '코사카 신타로', imagePath: 'tier-media/2 tier/kosaka shintaro.jpg' },
    { name: '다비츠', imagePath: 'tier-media/2 tier/davits.jpg' },
    { name: '호자키 킷페이', imagePath: 'tier-media/2 tier/hozaki kikpei.jpg' },
  ],
  3: [
    { name: '긴다 에이카쿠', imagePath: 'tier-media/3 tier/ginda eikaku.jpg' },
    { name: '타츠미 하루키', imagePath: 'tier-media/3 tier/tatsumi haruki.jpg' },
    { name: '이부 하야토', imagePath: 'tier-media/3 tier/ibu hayato.jpg' },
    { name: '와나카 소이치로', imagePath: 'tier-media/3 tier/wanaka soichiro.png' },
    { name: '아소 세나', imagePath: 'tier-media/3 tier/aso sena.jpg' },
    { name: '루이스', imagePath: 'tier-media/3 tier/louis.jpg' },
  ],
  4: [
    { name: '왓산', imagePath: 'tier-media/4 tier/what san.jpg' },
    { name: '나가세 코이치', imagePath: 'tier-media/4 tier/nagase koichi.jpg' },
    { name: '탄탄', imagePath: 'tier-media/4 tier/tantan.jpg' },
    { name: '반바 유지로', imagePath: 'tier-media/4 tier/banba yuziro.jpg' },
    { name: '쿠레바야시 지로', imagePath: 'tier-media/4 tier/kurebayashi ziro.jpg' },
    { name: '아시자와 츠네히코', imagePath: 'tier-media/4 tier/ashizawa.jpg' },
  ],
  5: [
    { name: '우미세 쇼고', imagePath: 'tier-media/5 tier/umise shogo.jpg' },
    { name: '카미도 신이치', imagePath: 'tier-media/5 tier/kamido.jpg' },
    { name: '토가시 소지', imagePath: 'tier-media/5 tier/togashi soji.jpg' },
    { name: '사이온지 켄고', imagePath: 'tier-media/5 tier/saionji kengo.jpg' },
    { name: '키토 죠지', imagePath: 'tier-media/5 tier/kito jyoji.jpg' },
    { name: '무카데즈카', imagePath: 'tier-media/5 tier/mukadetsuka.jpg' },
  ],
  6: [
    { name: '루카와 타카오', imagePath: 'tier-media/6 tier/rokawa takao.webp' },
    { name: '모리카와', imagePath: 'tier-media/6 tier/moriwaka.webp' },
    { name: '쿠로사와 코타로', imagePath: 'tier-media/6 tier/kurosawa kotaro.webp' },
    { name: '히나가타 지에이', imagePath: 'tier-media/6 tier/hinagata chiei.webp' },
    { name: '누마타', imagePath: 'tier-media/6 tier/numata.webp' },
    { name: '니카이도 쇼헤이', imagePath: 'tier-media/6 tier/nikaido shohei.webp' },
  ],
  7: [
    { name: '니시키도', imagePath: 'tier-media/7 tier/nikishido.webp' },
    { name: '한다 타미오', imagePath: 'tier-media/7 tier/handa tamio.webp' },
    { name: '혼다', imagePath: 'tier-media/7 tier/honda.webp' },
    { name: '마츠야마 유우스케', imagePath: 'tier-media/7 tier/matsuyama yusuke.webp' },
    { name: '노자키', imagePath: 'tier-media/7 tier/nozaki.webp' },
    { name: '닉 야마오카', imagePath: 'tier-media/7 tier/nick yamaoka.webp' },
  ],
  8: [
    { name: '이에이리', imagePath: 'tier-media/8 tier/ieiri.webp' },
    { name: '미야모토', imagePath: 'tier-media/8 tier/miyamoto.webp' },
    { name: '야마이 미츠루', imagePath: 'tier-media/8 tier/yamai mitsuru.webp' },
    { name: '무라이', imagePath: 'tier-media/8 tier/murai.webp' },
    { name: '후루야', imagePath: 'tier-media/8 tier/furuya.webp' },
  ],
  9: [
    { name: '긴다 에이잔', imagePath: 'tier-media/9 tier/ginda eizan.webp' },
    { name: '아키즈키 기이치', imagePath: 'tier-media/9 tier/akizuki kiichi.webp' },
    { name: '아키즈키 슈이치', imagePath: 'tier-media/9 tier/akizuki shuichi.webp' },
    { name: '미쿠니 사다하루', imagePath: 'tier-media/9 tier/mikuni sadaharu.webp' },
    { name: '아모우 케이지', imagePath: 'tier-media/9 tier/amou keiji.webp' },
    { name: '쿠사카 코지로', imagePath: 'tier-media/9 tier/kusaka kojirou.webp' },
  ],
};
