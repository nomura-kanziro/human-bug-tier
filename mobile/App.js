// ========================================================
// 휴버대 티어표 모바일 앱 — 뼈대 단계
// ========================================================
// 지금은 "앱이 서버에 연결되는지"만 확인하는 한 화면이다(사이트 API · 공지 · AI 도우미 · 에이전트 봇).
// 기능 화면(티어표·커스텀 메이커·게시판·에이전트 봇)은 다음 단계에서 같은 /api 를 그대로 붙인다.
//
// 가볍게 만든 이유와 방법(웹보다 기기 사양·회선이 약하다):
//   - 화면 이동 라이브러리·상태 라이브러리를 넣지 않았다(필요해지면 그때 추가).
//   - 큰 이미지·폰트를 넣지 않는다. 아이콘 하나만 묶는다(app.json assetBundlePatterns).
//   - 요청은 동시에 보내고 8초에 끊는다. 화면은 받은 결과를 한 번에 그린다(요청마다 다시 그리지 않음).
//   - Android 릴리스 빌드는 코드·리소스 축소(ProGuard·shrinkResources)를 켰다(app.json expo-build-properties).
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View,
} from 'react-native';
import { runChecks } from './src/api';
import { DEFAULT_API_BASE, normalizeBase, SITE_URL } from './src/config';

const APP_VERSION = '0.1.0';

const LIGHT = { bg: '#ffffff', card: '#f7f7f8', text: '#171717', sub: '#55565c', border: '#e2e2e6', brand: '#f59e0b' };
const DARK = { bg: '#111111', card: '#1c1c1f', text: '#f2f2f3', sub: '#a1a1aa', border: '#2e2e33', brand: '#f59e0b' };

export default function App() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? DARK : LIGHT;
  const [base, setBase] = useState(DEFAULT_API_BASE);
  const [input, setInput] = useState(DEFAULT_API_BASE);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async (target) => {
    setBusy(true);
    try {
      setReport(await runChecks(target));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { check(base); }, [base, check]);

  const allOk = report && report.results.every((r) => r.ok);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: c.text }]}>휴버대 티어표</Text>
        <Text style={[styles.sub, { color: c.sub }]}>모바일 앱 {APP_VERSION} · 서버 연결 확인</Text>

        <View style={[styles.summary, { borderColor: allOk ? '#22c55e' : c.border, backgroundColor: c.card }]}>
          {busy && !report ? <ActivityIndicator color={c.brand} /> : (
            <Text style={[styles.summaryText, { color: allOk ? '#16a34a' : c.text }]}>
              {report ? (allOk ? '모든 연결이 정상이에요' : '일부 연결에 문제가 있어요') : '확인 전'}
            </Text>
          )}
          {report && <Text style={{ color: c.sub, fontSize: 12 }}>{report.at.toLocaleTimeString()} 확인</Text>}
        </View>

        {report?.results.map((r) => (
          <View key={r.key} style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.dot, { backgroundColor: r.ok ? '#22c55e' : '#ef4444' }]} />
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: c.text }]}>{r.label}</Text>
              <Text style={{ color: c.sub, fontSize: 13 }} numberOfLines={2}>{r.text}</Text>
            </View>
            <Text style={{ color: c.sub, fontSize: 12 }}>{r.ms}ms</Text>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: c.brand, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}
          onPress={() => check(base)}
          disabled={busy}
        >
          <Text style={styles.buttonText}>{busy ? '확인 중…' : '다시 확인'}</Text>
        </Pressable>

        <Text style={[styles.section, { color: c.text }]}>서버 주소</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://human-bug-tier.com 또는 http://192.168.0.10:5000"
          placeholderTextColor={c.sub}
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
        />
        <View style={styles.inline}>
          <Pressable style={[styles.small, { borderColor: c.border }]} onPress={() => setBase(normalizeBase(input))}>
            <Text style={{ color: c.text }}>이 주소로 확인</Text>
          </Pressable>
          <Pressable style={[styles.small, { borderColor: c.border }]} onPress={() => { setInput(DEFAULT_API_BASE); setBase(DEFAULT_API_BASE); }}>
            <Text style={{ color: c.text }}>운영 주소로</Text>
          </Pressable>
        </View>
        <Text style={{ color: c.sub, fontSize: 12, marginTop: 6 }}>
          로컬 개발 서버는 같은 Wi-Fi 의 PC 주소(http://PC-IP:5000)를 넣어요. 휴대폰의 localhost 는 PC 가 아니에요.
        </Text>

        <Pressable style={[styles.link]} onPress={() => Linking.openURL(SITE_URL)}>
          <Text style={{ color: c.brand, fontWeight: '700' }}>웹 사이트 열기 →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 20, paddingTop: 36, gap: 10 },
  title: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 14, marginBottom: 8 },
  summary: { borderWidth: 2, borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  summaryText: { fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  button: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#2a1c05', fontSize: 16, fontWeight: '800' },
  section: { fontSize: 15, fontWeight: '700', marginTop: 18 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inline: { flexDirection: 'row', gap: 8 },
  small: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  link: { marginTop: 18, alignItems: 'center' },
});
