// Craft panel — craft axe / pickaxe / eat berry. Disabled state comes
// from the Zustand UI store; the actions are passed in from App.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useUiStore } from '../../stores/uiStore';

export function CraftPanel({
  onCraftAxe,
  onCraftPickaxe,
  onEatBerry,
}: {
  onCraftAxe: () => void;
  onCraftPickaxe: () => void;
  onEatBerry: () => void;
}) {
  const hasAxe = useUiStore((s) => s.hasAxe);
  const hasPickaxe = useUiStore((s) => s.hasPickaxe);
  const wood = useUiStore((s) => s.wood);
  const stone = useUiStore((s) => s.stone);
  const berry = useUiStore((s) => s.berry);
  const hunger = useUiStore((s) => s.hunger);

  return (
    <View style={styles.craftPanel}>
      <TouchableOpacity
        style={[styles.craftBtn, (hasAxe || wood < 3) && styles.btnDisabled]}
        onPress={onCraftAxe}
        disabled={hasAxe || wood < 3}
      >
        <Text style={styles.craftText}>{hasAxe ? '🪓 มีแล้ว' : '🪓 ขวาน (ไม้ 3)'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.craftBtn, (hasPickaxe || wood < 3 || stone < 3) && styles.btnDisabled]}
        onPress={onCraftPickaxe}
        disabled={hasPickaxe || wood < 3 || stone < 3}
      >
        <Text style={styles.craftText}>{hasPickaxe ? '⛏️ มีแล้ว' : '⛏️ พลั่ว (ไม้ 3 + หิน 3)'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.craftBtn, (berry < 1 || hunger >= 100) && styles.btnDisabled]}
        onPress={onEatBerry}
        disabled={berry < 1 || hunger >= 100}
      >
        <Text style={styles.craftText}>🫐 กินเบอร์รี่ (+30)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  craftPanel: { position: 'absolute', top: 108, right: 12, gap: 6, width: 168 },
  craftBtn: {
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  btnDisabled: { opacity: 0.45 },
  craftText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
