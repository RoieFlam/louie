import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, Screen, Txt, Wrap } from '@/components/ui';
import { DEFAULT_STAPLES, STAPLES } from '@/data/mock';
import { useStore } from '@/state/store';
import { C } from '@/theme';

// Shown only on the first "going shopping" tap.
export default function Staples() {
  const s = useStore();
  const [picked, setPicked] = useState<string[]>(s.staples ?? DEFAULT_STAPLES);
  const toggle = (x: string) => setPicked(picked.includes(x) ? picked.filter((p) => p !== x) : [...picked, x]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Txt size={26} weight="bold">
          לפני הקנייה הראשונה: מה תמיד צריך להיות בבית?
        </Txt>
        <Txt size={15} color={C.muted}>
          רק הפעם. מעכשיו Louie יבדוק בתמונה מה חסר.
        </Txt>
        <Wrap style={{ marginTop: 12 }}>
          {STAPLES.map((x) => (
            <Chip key={x} label={x} selected={picked.includes(x)} onPress={() => toggle(x)} />
          ))}
        </Wrap>
      </ScrollView>
      <View style={styles.bottom}>
        <Button
          label={`בנה לי רשימה · ${picked.length} נבחרו`}
          disabled={picked.length === 0}
          onPress={() => {
            s.setStaples(picked);
            router.replace('/shopping');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 8 },
  bottom: { paddingHorizontal: 24, paddingVertical: 12 },
});
