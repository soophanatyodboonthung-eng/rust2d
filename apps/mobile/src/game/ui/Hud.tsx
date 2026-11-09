// HUD — top bar: HP / hunger bars, day + night indicator, inventory
// counts. Reads the Zustand UI store (synced at 4 Hz); never touches
// the game simulation directly.

import { StyleSheet, Text, View } from 'react-native';

import { useUiStore } from '../../stores/uiStore';

export function Hud() {
  const hp = useUiStore((s) => s.hp);
  const hunger = useUiStore((s) => s.hunger);
  const day = useUiStore((s) => s.day);
  const night = useUiStore((s) => s.night);
  const wood = useUiStore((s) => s.wood);
  const stone = useUiStore((s) => s.stone);
  const berry = useUiStore((s) => s.berry);
  const kills = useUiStore((s) => s.kills);

  return (
    <View style={styles.topBar} pointerEvents="none">
      <View style={styles.bars}>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>❤️ {hp}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFillHp, { width: `${hp}%` }]} />
          </View>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>🍖 {hunger}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFillHunger, { width: `${hunger}%` }]} />
          </View>
        </View>
      </View>
      <Text style={styles.dayText}>
        วันที่ {day} {night ? '🌙 กลางคืน' : '☀️ กลางวัน'}
      </Text>
      <Text style={styles.invText}>
        🪵 {wood} 🪨 {stone} 🫐 {berry} 💀 {kills}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 54,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bars: { width: 150, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { color: '#fff', fontSize: 13, fontWeight: '700', width: 52 },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFillHp: { height: '100%', backgroundColor: '#ef4444' },
  barFillHunger: { height: '100%', backgroundColor: '#f59e0b' },
  dayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  invText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
