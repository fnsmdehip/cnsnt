import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Button, Alert, ImageBackground, Image } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Visual assets
const paperTexture = require('../assets/bg_paper_texture.png');
const checklistIcon = require('../assets/icon_checklist.png');
const kodamaSprite = require('../assets/sprite_kodama.png');

// Placeholder consent checklist items; replace with actual template content when available
const initialItems: string[] = [
  'I have read and understood the purpose of this consent.',
  'I agree to the terms and conditions laid out.',
  'I allow the recording of my voice and video (if applicable).',
  'I understand my data will be stored locally and encrypted.',
  'I can revoke consent at any time by deleting the vault.',
];

const ConsentBuilderScreen: React.FC = () => {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    initialItems.map(() => false)
  );
  const [exporting, setExporting] = useState(false);

  const toggleItem = (index: number) => {
    const updated = [...checkedItems];
    updated[index] = !updated[index];
    setCheckedItems(updated);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // generate HTML and create PDF via expo-print
      const html = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8" /><style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 24px; }
        h1 { color: #222; }
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 12px; font-size: 16px; }
        </style></head><body>
        <h1>Consent Checklist</h1>
        <ul>
          ${initialItems.map((item, i) => `<li>${checkedItems[i] ? '[X] ' : '[ ] '}${item}</li>`).join('')}
        </ul>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ImageBackground source={paperTexture} style={styles.background}>
      <Image source={kodamaSprite} style={styles.kodama} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Image source={checklistIcon} style={styles.headerIcon} />
          <Text style={styles.heading}>Consent Checklist</Text>
        </View>
        {initialItems.map((label, idx) => (
          <Pressable key={idx} style={styles.itemRow} onPress={() => toggleItem(idx)}>
            <View style={[styles.checkbox, checkedItems[idx] && styles.checkboxChecked]} />
            <Text style={styles.itemLabel}>{label}</Text>
          </Pressable>
        ))}
        <View style={{ marginTop: 20 }}>
          <Button title={exporting ? 'Exporting...' : 'Export PDF'} onPress={handleExport} disabled={exporting} />
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { padding: 16 },
  heading: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '500',
    marginBottom: 20,
    color: '#222',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#222',
    borderRadius: 4,
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#3DDC97',
    borderColor: '#3DDC97',
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#222',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerIcon: { width: 28, height: 28, marginRight: 12 },
  kodama: { position: 'absolute', bottom: 16, right: 16, width: 60, height: 60, opacity: 0.7 },
});

export default ConsentBuilderScreen; 