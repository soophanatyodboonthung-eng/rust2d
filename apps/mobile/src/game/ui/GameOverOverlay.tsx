// Game-over overlay — shown when the Zustand UI store reports gameOver.
// Renders nothing while the game is running.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useUiStore } from '../../stores/uiStore';

export function GameOverOverlay({ onRestart }: { onRestart: () => void }) {
  const gameOver = useUiStore((s) => s.gameOver);
  const day = useUiStore((s) => s.day);
  const kills = useUiStore((s) => s.kills);
  if (!gameOver) return null;

  return (
    <View style={styles.gameOver}>
      <Text style={styles.gameOverTitle}>ตายแล้ว!</Text>
      <Text style={styles.gameOverText}>
        รอดมาได้ {day} วัน • ฆ่าซอมบี้ {kills} ตัว
      </Text>
      <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
        <Text style={styles.restartText}>เริ่มใหม่</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  gameOver: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  gameOverTitle: { color: '#ef4444', fontSize: 34, fontWeight: '800' },
  gameOverText: { color: '#fff', fontSize: 16 },
  restartBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  restartText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
