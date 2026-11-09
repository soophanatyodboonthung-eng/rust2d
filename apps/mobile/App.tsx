import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';
import {
  makeMutable,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import {
  ATTACK_CD,
  ATTACK_RANGE,
  BERRY_HUNGER,
  DAY_LEN,
  HUNGER_HP_DRAIN,
  HUNGER_RATE,
  NIGHT_LEN,
  NODE_CENTER_MIN_DIST,
  NODE_COUNTS,
  NODE_HP,
  NODE_MARGIN,
  NODE_MIN_DIST,
  NODE_RESPAWN,
  NODE_SEED,
  PLAYER_R,
  PLAYER_SPEED,
  RECIPES,
  WORLD_H,
  WORLD_W,
  ZOMBIE_DMG,
  ZOMBIE_HIT_COOLDOWN,
  ZOMBIE_HP,
  ZOMBIE_MAX,
  ZOMBIE_R,
  ZOMBIE_SPAWN_DIST,
  ZOMBIE_SPAWN_INTERVAL,
  ZOMBIE_SPEED,
  type ItemId,
  type NodeKind,
} from '@rust2d/shared';

// Rust-like 2D survival — v1. Top-down, Expo + Skia native, no WebView.
// Systems: virtual-joystick movement, gather wood/stone/berries, craft axe/pickaxe,
// zombies at night, HP + hunger, day/night cycle, game over + restart.
// Rendering: fixed entity pools (makeMutable) + useFrameCallback game loop on the
// UI thread; Skia reads the shared values directly, no React re-render per frame.
// HUD (HP bars, counts, craft buttons) syncs from shared values at 4 Hz.
// Game data (world constants, items, recipes) comes from @rust2d/shared —
// the single source of truth. This file still owns the local simulation;
// the server-authoritative version arrives in Phase 2+.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type NodeDef = { kind: NodeKind; x: number; y: number; maxHp: number };
type NodePool = NodeDef & {
  hp: SharedValue<number>;
  vis: SharedValue<number>;
  respawnAt: SharedValue<number>;
};
type ZombiePool = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  hp: SharedValue<number>;
  active: SharedValue<number>;
  lastHit: SharedValue<number>;
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic node layout: same map every run.
function buildNodeDefs(): NodeDef[] {
  const rand = mulberry32(NODE_SEED);
  const defs: NodeDef[] = [];
  const kinds: NodeKind[] = [
    ...Array<NodeKind>(NODE_COUNTS.tree).fill('tree'),
    ...Array<NodeKind>(NODE_COUNTS.rock).fill('rock'),
    ...Array<NodeKind>(NODE_COUNTS.bush).fill('bush'),
  ];
  for (const kind of kinds) {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 40; attempt++) {
      x = NODE_MARGIN + rand() * (WORLD_W - NODE_MARGIN * 2);
      y = NODE_MARGIN + rand() * (WORLD_H - NODE_MARGIN * 2);
      const dc = Math.hypot(x - WORLD_W / 2, y - WORLD_H / 2);
      const okFar = defs.every((d) => Math.hypot(x - d.x, y - d.y) > NODE_MIN_DIST);
      if (dc > NODE_CENTER_MIN_DIST && okFar) break;
    }
    defs.push({ kind, x, y, maxHp: NODE_HP[kind] });
  }
  return defs;
}

const NODE_DEFS = buildNodeDefs();
const PATCHES = (() => {
  const rand = mulberry32(777);
  return Array.from({ length: 14 }, () => ({
    x: rand() * WORLD_W,
    y: rand() * WORLD_H,
    r: 40 + rand() * 70,
  }));
})();

function NodeView({ node }: { node: NodePool }) {
  if (node.kind === 'tree') {
    return (
      <Group opacity={node.vis}>
        <Rect x={node.x - 6} y={node.y} width={12} height={28} color="#7c4a21" />
        <Circle cx={node.x} cy={node.y - 8} r={26} color="#2f9e44" />
        <Circle cx={node.x - 11} cy={node.y + 2} r={14} color="#37b24d" />
      </Group>
    );
  }
  if (node.kind === 'rock') {
    return (
      <Group opacity={node.vis}>
        <Circle cx={node.x} cy={node.y} r={26} color="#868e96" />
        <Circle cx={node.x - 8} cy={node.y - 8} r={10} color="#adb5bd" />
      </Group>
    );
  }
  return (
    <Group opacity={node.vis}>
      <Circle cx={node.x} cy={node.y} r={22} color="#2b8a3e" />
      <Circle cx={node.x - 8} cy={node.y - 6} r={4} color="#e03131" />
      <Circle cx={node.x + 8} cy={node.y - 4} r={4} color="#e03131" />
      <Circle cx={node.x} cy={node.y + 8} r={4} color="#e03131" />
    </Group>
  );
}

function ZombieView({ z }: { z: ZombiePool }) {
  // Skia transform entries are plain numbers, so the whole transform array
  // is driven by one derived shared value (the documented Skia pattern).
  const t = useDerivedValue(() => [
    { translateX: z.x.value },
    { translateY: z.y.value },
  ]);
  return (
    <Group transform={t} opacity={z.active}>
      <Circle cx={0} cy={0} r={20} color="#5c7c3a" />
      <Circle cx={-7} cy={-5} r={3.5} color="#ff0000" />
      <Circle cx={7} cy={-5} r={3.5} color="#ff0000" />
      <Circle cx={0} cy={9} r={5} color="#3a4d22" />
    </Group>
  );
}

type Hud = {
  hp: number;
  hunger: number;
  wood: number;
  stone: number;
  berry: number;
  day: number;
  night: boolean;
  kills: number;
  hasAxe: boolean;
  hasPickaxe: boolean;
  gameOver: boolean;
};

export default function App() {
  // Player / camera / time
  const playerX = useSharedValue(WORLD_W / 2);
  const playerY = useSharedValue(WORLD_H / 2);
  const camTX = useSharedValue(0);
  const camTY = useSharedValue(0);
  const clock = useSharedValue(0);
  const timeT = useSharedValue(0);
  const day = useSharedValue(1);
  const nightOp = useSharedValue(0);
  const spawnTimer = useSharedValue(0);
  const lastAttack = useSharedValue(-10);
  const attackQueued = useSharedValue(0);
  const gameOver = useSharedValue(0);

  // Survival state
  const hp = useSharedValue(100);
  const hunger = useSharedValue(100);
  const wood = useSharedValue(0);
  const stone = useSharedValue(0);
  const berry = useSharedValue(0);
  const kills = useSharedValue(0);
  const hasAxe = useSharedValue(0);
  const hasPickaxe = useSharedValue(0);

  // Joystick
  const joyBaseX = useSharedValue(0);
  const joyBaseY = useSharedValue(0);
  const joyKx = useSharedValue(0);
  const joyKy = useSharedValue(0);
  const joyDx = useSharedValue(0);
  const joyDy = useSharedValue(0);
  const joyOp = useSharedValue(0);
  const joyTouchId = useRef<number | null>(null);

  // Entity pools (stable across renders; makeMutable, not hooks in a loop)
  const nodes = useMemo<NodePool[]>(
    () =>
      NODE_DEFS.map((d) => ({
        ...d,
        hp: makeMutable(d.maxHp),
        vis: makeMutable(1),
        respawnAt: makeMutable(0),
      })),
    [],
  );
  const zombies = useMemo<ZombiePool[]>(
    () =>
      Array.from({ length: ZOMBIE_MAX }, () => ({
        x: makeMutable(0),
        y: makeMutable(0),
        hp: makeMutable(0),
        active: makeMutable(0),
        lastHit: makeMutable(-10),
      })),
    [],
  );

  // Animated transforms: one derived shared value per moving Group
  // (transform entries themselves are plain numbers in Skia 2.x types).
  const camTransform = useDerivedValue(() => [
    { translateX: camTX.value },
    { translateY: camTY.value },
  ]);
  const playerTransform = useDerivedValue(() => [
    { translateX: playerX.value },
    { translateY: playerY.value },
  ]);
  const joyTransform = useDerivedValue(() => [
    { translateX: joyKx.value },
    { translateY: joyKy.value },
  ]);

  const [hud, setHud] = useState<Hud>({
    hp: 100,
    hunger: 100,
    wood: 0,
    stone: 0,
    berry: 0,
    day: 1,
    night: false,
    kills: 0,
    hasAxe: false,
    hasPickaxe: false,
    gameOver: false,
  });

  // Game loop — runs on the UI thread every frame.
  useFrameCallback((fi) => {
    const dt = Math.min((fi.timeSincePreviousFrame ?? 16.7) / 1000, 0.05);
    if (gameOver.value === 1) return;
    clock.value += dt;

    // Day / night cycle
    timeT.value += dt;
    const cycle = DAY_LEN + NIGHT_LEN;
    if (timeT.value >= cycle) {
      timeT.value -= cycle;
      day.value += 1;
      for (let i = 0; i < ZOMBIE_MAX; i++) zombies[i].active.value = 0;
    }
    const night = timeT.value >= DAY_LEN ? 1 : 0;
    const targetOp = night === 1 ? 0.5 : 0;
    nightOp.value += (targetOp - nightOp.value) * Math.min(1, dt * 2);

    // Hunger drains HP when empty
    hunger.value = Math.max(0, hunger.value - HUNGER_RATE * dt);
    if (hunger.value <= 0) hp.value = Math.max(0, hp.value - HUNGER_HP_DRAIN * dt);

    // Movement (joystick) + collision with solid nodes
    const mx = joyDx.value;
    const my = joyDy.value;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0.02) {
      const nx = mx / Math.max(1, len);
      const ny = my / Math.max(1, len);
      let px = playerX.value + nx * PLAYER_SPEED * dt;
      let py = playerY.value + ny * PLAYER_SPEED * dt;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.kind === 'bush' || n.vis.value === 0) continue;
        const dx = px - n.x;
        const dy = py - n.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const minD = PLAYER_R + 24;
        if (d < minD && d > 0.001) {
          px = n.x + (dx / d) * minD;
          py = n.y + (dy / d) * minD;
        }
      }
      playerX.value = Math.min(WORLD_W - PLAYER_R, Math.max(PLAYER_R, px));
      playerY.value = Math.min(WORLD_H - PLAYER_R, Math.max(PLAYER_R, py));
    }

    // Camera follows player (negative translate, clamped to the world)
    camTX.value = -Math.min(
      WORLD_W - SCREEN_W,
      Math.max(0, playerX.value - SCREEN_W / 2),
    );
    camTY.value = -Math.min(
      WORLD_H - SCREEN_H,
      Math.max(0, playerY.value - SCREEN_H / 2),
    );

    // Node respawn
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.vis.value === 0 && clock.value >= n.respawnAt.value) {
        n.hp.value = n.maxHp;
        n.vis.value = 1;
      }
    }

    // Attack / gather (queued by the attack button)
    if (attackQueued.value === 1) {
      attackQueued.value = 0;
      if (clock.value - lastAttack.value >= ATTACK_CD) {
        lastAttack.value = clock.value;
        let bestD = ATTACK_RANGE;
        let bestNode: NodePool | null = null;
        let bestZombie: ZombiePool | null = null;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.vis.value === 0) continue;
          const d = Math.hypot(playerX.value - n.x, playerY.value - n.y);
          if (d < bestD) {
            bestD = d;
            bestNode = n;
            bestZombie = null;
          }
        }
        for (let i = 0; i < ZOMBIE_MAX; i++) {
          const z = zombies[i];
          if (z.active.value === 0) continue;
          const d = Math.hypot(playerX.value - z.x.value, playerY.value - z.y.value);
          if (d < bestD) {
            bestD = d;
            bestZombie = z;
            bestNode = null;
          }
        }
        if (bestNode !== null) {
          const n = bestNode;
          let dmg = 1;
          if (n.kind === 'tree' && hasAxe.value === 1) dmg = 3;
          if (n.kind === 'rock' && hasPickaxe.value === 1) dmg = 3;
          const gain = Math.min(dmg, n.hp.value);
          n.hp.value -= dmg;
          if (n.kind === 'tree') wood.value += gain;
          else if (n.kind === 'rock') stone.value += gain;
          else berry.value += gain;
          if (n.hp.value <= 0) {
            n.vis.value = 0;
            n.respawnAt.value = clock.value + NODE_RESPAWN;
          }
        } else if (bestZombie !== null) {
          const z = bestZombie;
          const dmg = hasAxe.value === 1 || hasPickaxe.value === 1 ? 2 : 1;
          z.hp.value -= dmg;
          if (z.hp.value <= 0) {
            z.active.value = 0;
            kills.value += 1;
          }
        }
      }
    }

    // Zombie spawning (night only)
    if (night === 1) {
      spawnTimer.value += dt;
      if (spawnTimer.value >= ZOMBIE_SPAWN_INTERVAL) {
        spawnTimer.value = 0;
        let activeCount = 0;
        let freeIdx = -1;
        for (let i = 0; i < ZOMBIE_MAX; i++) {
          if (zombies[i].active.value === 1) activeCount++;
          else if (freeIdx === -1) freeIdx = i;
        }
        if (activeCount < ZOMBIE_MAX && freeIdx !== -1) {
          const z = zombies[freeIdx];
          const ang = Math.random() * Math.PI * 2;
          z.x.value = Math.min(
            WORLD_W - 30,
            Math.max(30, playerX.value + Math.cos(ang) * ZOMBIE_SPAWN_DIST),
          );
          z.y.value = Math.min(
            WORLD_H - 30,
            Math.max(30, playerY.value + Math.sin(ang) * ZOMBIE_SPAWN_DIST),
          );
          z.hp.value = ZOMBIE_HP;
          z.active.value = 1;
        }
      }
    }

    // Zombie AI: walk to player, hit when close
    for (let i = 0; i < ZOMBIE_MAX; i++) {
      const z = zombies[i];
      if (z.active.value === 0) continue;
      const dx = playerX.value - z.x.value;
      const dy = playerY.value - z.y.value;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.01) {
        const step = Math.min(d, ZOMBIE_SPEED * dt);
        z.x.value += (dx / d) * step;
        z.y.value += (dy / d) * step;
      }
      if (d < PLAYER_R + ZOMBIE_R + 6 && clock.value - z.lastHit.value >= ZOMBIE_HIT_COOLDOWN) {
        z.lastHit.value = clock.value;
        hp.value = Math.max(0, hp.value - ZOMBIE_DMG);
      }
    }

    if (hp.value <= 0) gameOver.value = 1;
  });

  // HUD sync at 4 Hz (cheap; the canvas itself never re-renders from React)
  useEffect(() => {
    const id = setInterval(() => {
      setHud({
        hp: Math.ceil(hp.value),
        hunger: Math.ceil(hunger.value),
        wood: wood.value,
        stone: stone.value,
        berry: berry.value,
        day: day.value,
        night: timeT.value >= DAY_LEN,
        kills: kills.value,
        hasAxe: hasAxe.value === 1,
        hasPickaxe: hasPickaxe.value === 1,
        gameOver: gameOver.value === 1,
      });
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Joystick touch (left half of the screen, dynamic origin)
  const onTouchStart = (e: GestureResponderEvent) => {
    const { locationX, locationY, identifier } = e.nativeEvent;
    if (locationX < SCREEN_W * 0.5 && joyTouchId.current === null) {
      joyTouchId.current = identifier;
      joyBaseX.value = locationX;
      joyBaseY.value = locationY;
      joyKx.value = locationX;
      joyKy.value = locationY;
      joyDx.value = 0;
      joyDy.value = 0;
      joyOp.value = 1;
    }
  };
  const onTouchMove = (e: GestureResponderEvent) => {
    const { locationX, locationY, identifier } = e.nativeEvent;
    if (joyTouchId.current === null || identifier !== joyTouchId.current) return;
    let dx = locationX - joyBaseX.value;
    let dy = locationY - joyBaseY.value;
    const len = Math.sqrt(dx * dx + dy * dy);
    const max = 55;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    joyDx.value = dx / max;
    joyDy.value = dy / max;
    joyKx.value = joyBaseX.value + dx;
    joyKy.value = joyBaseY.value + dy;
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    if (joyTouchId.current === null || e.nativeEvent.identifier !== joyTouchId.current) return;
    joyTouchId.current = null;
    joyOp.value = 0;
    joyDx.value = 0;
    joyDy.value = 0;
  };

  const doAttack = () => {
    attackQueued.value = 1;
  };
  // Crafting reads its costs from @rust2d/shared RECIPES (single source
  // of truth) instead of hardcoding them here. Behaviour is identical
  // to v1: axe = 3 wood, pickaxe = 3 wood + 3 stone, one of each.
  const tryCraft = (recipeId: 'axe' | 'pickaxe') => {
    const recipe = RECIPES[recipeId];
    const have: Record<ItemId, number> = {
      wood: wood.value,
      stone: stone.value,
      berry: berry.value,
      axe: hasAxe.value,
      pickaxe: hasPickaxe.value,
    };
    const owned = recipeId === 'axe' ? hasAxe.value === 1 : hasPickaxe.value === 1;
    if (owned) return;
    if (!recipe.inputs.every((i) => have[i.itemId] >= i.qty)) return;
    for (const i of recipe.inputs) {
      if (i.itemId === 'wood') wood.value -= i.qty;
      else if (i.itemId === 'stone') stone.value -= i.qty;
      else if (i.itemId === 'berry') berry.value -= i.qty;
    }
    if (recipe.output.itemId === 'axe') hasAxe.value = 1;
    else if (recipe.output.itemId === 'pickaxe') hasPickaxe.value = 1;
  };
  const craftAxe = () => tryCraft('axe');
  const craftPickaxe = () => tryCraft('pickaxe');
  const eatBerry = () => {
    if (berry.value >= 1 && hunger.value < 100) {
      berry.value -= 1;
      hunger.value = Math.min(100, hunger.value + BERRY_HUNGER);
    }
  };
  const restart = () => {
    playerX.value = WORLD_W / 2;
    playerY.value = WORLD_H / 2;
    clock.value = 0;
    timeT.value = 0;
    day.value = 1;
    nightOp.value = 0;
    spawnTimer.value = 0;
    hp.value = 100;
    hunger.value = 100;
    wood.value = 0;
    stone.value = 0;
    berry.value = 0;
    kills.value = 0;
    hasAxe.value = 0;
    hasPickaxe.value = 0;
    attackQueued.value = 0;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].hp.value = nodes[i].maxHp;
      nodes[i].vis.value = 1;
      nodes[i].respawnAt.value = 0;
    }
    for (let i = 0; i < ZOMBIE_MAX; i++) {
      zombies[i].active.value = 0;
      zombies[i].hp.value = 0;
    }
    gameOver.value = 0;
  };

  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Group transform={camTransform}>
          <Rect x={0} y={0} width={WORLD_W} height={WORLD_H} color="#3f7a34" />
          {PATCHES.map((p, i) => (
            <Circle key={`p${i}`} cx={p.x} cy={p.y} r={p.r} color="#356b2c" />
          ))}
          {nodes.map((n, i) => (
            <NodeView key={`n${i}`} node={n} />
          ))}
          {zombies.map((z, i) => (
            <ZombieView key={`z${i}`} z={z} />
          ))}
          <Group transform={playerTransform}>
            <Circle cx={0} cy={0} r={21} color="#ffffff" opacity={0.85} />
            <Circle cx={0} cy={0} r={18} color="#3b82f6" />
            <Circle cx={0} cy={-6} r={3} color="#dbeafe" />
            <Circle cx={-6} cy={4} r={3} color="#1e3a8a" />
            <Circle cx={6} cy={4} r={3} color="#1e3a8a" />
          </Group>
        </Group>
        <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} color="#0b1530" opacity={nightOp} />
        <Circle
          cx={joyBaseX}
          cy={joyBaseY}
          r={55}
          color="rgba(255,255,255,0.15)"
          opacity={joyOp}
        />
        <Group transform={joyTransform} opacity={joyOp}>
          <Circle cx={0} cy={0} r={24} color="rgba(255,255,255,0.4)" />
        </Group>
      </Canvas>

      {/* HUD */}
      <View style={styles.topBar} pointerEvents="none">
        <View style={styles.bars}>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>❤️ {hud.hp}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFillHp, { width: `${hud.hp}%` }]} />
            </View>
          </View>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>🍖 {hud.hunger}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFillHunger, { width: `${hud.hunger}%` }]} />
            </View>
          </View>
        </View>
        <Text style={styles.dayText}>
          วันที่ {hud.day} {hud.night ? '🌙 กลางคืน' : '☀️ กลางวัน'}
        </Text>
        <Text style={styles.invText}>
          🪵 {hud.wood} 🪨 {hud.stone} 🫐 {hud.berry} 💀 {hud.kills}
        </Text>
      </View>

      <View style={styles.craftPanel}>
        <TouchableOpacity
          style={[styles.craftBtn, (hud.hasAxe || hud.wood < 3) && styles.btnDisabled]}
          onPress={craftAxe}
          disabled={hud.hasAxe || hud.wood < 3}
        >
          <Text style={styles.craftText}>{hud.hasAxe ? '🪓 มีแล้ว' : '🪓 ขวาน (ไม้ 3)'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.craftBtn,
            (hud.hasPickaxe || hud.wood < 3 || hud.stone < 3) && styles.btnDisabled,
          ]}
          onPress={craftPickaxe}
          disabled={hud.hasPickaxe || hud.wood < 3 || hud.stone < 3}
        >
          <Text style={styles.craftText}>
            {hud.hasPickaxe ? '⛏️ มีแล้ว' : '⛏️ พลั่ว (ไม้ 3 + หิน 3)'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.craftBtn, (hud.berry < 1 || hud.hunger >= 100) && styles.btnDisabled]}
          onPress={eatBerry}
          disabled={hud.berry < 1 || hud.hunger >= 100}
        >
          <Text style={styles.craftText}>🫐 กินเบอร์รี่ (+30)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.attackBtn} onPress={doAttack} activeOpacity={0.7}>
        <Text style={styles.attackText}>⚔️</Text>
      </TouchableOpacity>

      <Text style={styles.hint} pointerEvents="none">
        ลากนิ้วซ้ายเพื่อเดิน • ปุ่ม ⚔️ เก็บของ / โจมตี
      </Text>

      {hud.gameOver && (
        <View style={styles.gameOver}>
          <Text style={styles.gameOverTitle}>ตายแล้ว!</Text>
          <Text style={styles.gameOverText}>
            รอดมาได้ {hud.day} วัน • ฆ่าซอมบี้ {hud.kills} ตัว
          </Text>
          <TouchableOpacity style={styles.restartBtn} onPress={restart}>
            <Text style={styles.restartText}>เริ่มใหม่</Text>
          </TouchableOpacity>
        </View>
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  canvas: { flex: 1 },
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
  attackBtn: {
    position: 'absolute',
    right: 22,
    bottom: 44,
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attackText: { fontSize: 32 },
  hint: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
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
