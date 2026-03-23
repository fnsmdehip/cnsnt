import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Button, StyleSheet, Alert, ImageBackground, Image } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import DualSignature from '../components/DualSignature';
import * as SecureStore from 'expo-secure-store';

// Visual assets
const bgForest = require('../assets/bg_forest_watercolor.png');
const leafPattern = require('../assets/pattern_leaf.png');

// Load template
const mrTemplate = require('../assets/templates/form-templates/mutual_release_template.md');

const MutualReleaseScreen: React.FC<any> = () => {
  const [template, setTemplate] = useState<string | null>(null);
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [signatureA, setSignatureA] = useState<string | null>(null);
  const [signatureB, setSignatureB] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(mrTemplate);
      await asset.downloadAsync();
      let text = await FileSystem.readAsStringAsync(asset.localUri!);
      text = text.replace(/## Signatures[\s\S]*/g, '');
      setTemplate(text);
    })();
  }, []);

  const saveRelease = async () => {
    if (!signatureA || !signatureB) {
      Alert.alert('Signature required', 'Please collect both signatures to continue.');
      return;
    }
    setSaving(true);
    try {
      const filled = template!
        .replace(/\[Date\]/g, date)
        .replace(/\[Party A\]/g, partyA)
        .replace(/\[Party B\]/g, partyB)
        .replace(/\[Description\]/g, description);
      await SecureStore.setItemAsync('mutualRelease', JSON.stringify({ template: filled, signatureA, signatureB, date }));
      const check = await SecureStore.getItemAsync('mutualRelease'); console.log('MR saved:', check);
      Alert.alert('Saved', 'Mutual Release saved securely.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save release.');
    } finally { setSaving(false); }
  };

  const exportPdf = async () => {
    const filled = template!
      .replace(/\[Date\]/g, date)
      .replace(/\[Party A\]/g, partyA)
      .replace(/\[Party B\]/g, partyB)
      .replace(/\[Description\]/g, description);
    const html = `<html><body><h1>Mutual Release of Claims</h1>${filled.replace(/\n/g,'<br/>')}<h2>Signatures</h2><img src="${signatureA}" width="200"/><img src="${signatureB}" width="200"/></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <ImageBackground source={bgForest} style={styles.background}>
      <Image source={leafPattern} style={styles.leaf} />
      <View style={styles.card}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.heading}>Mutual Release of Claims</Text>
          <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
          <TextInput style={styles.input} placeholder="Party A" value={partyA} onChangeText={setPartyA} />
          <TextInput style={styles.input} placeholder="Party B" value={partyB} onChangeText={setPartyB} />
          <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} multiline />
          <Text style={styles.previewLabel}>Preview:</Text>
          {template === null ? (
            <Text>Loading...</Text>
          ) : (
            <Markdown style={markdownStyles}>
              {template!
                .replace(/\[Date\]/g, date)
                .replace(/\[Party A\]/g, partyA)
                .replace(/\[Party B\]/g, partyB)
                .replace(/\[Description\]/g, description)
              }
            </Markdown>
          )}
          <DualSignature onSignaturesCollected={(a, b) => { setSignatureA(a); setSignatureB(b); }} />
          <View style={styles.buttonRow}>
            <Button title={saving ? 'Saving...' : 'Save'} onPress={saveRelease} disabled={saving || !signatureA || !signatureB} />
            <Button title="Export PDF" onPress={exportPdf} disabled={!signatureA || !signatureB} />
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  card: { flex: 1, margin: 16, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  container: { padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 12, backgroundColor: '#fff' },
  previewLabel: { fontSize: 18, marginVertical: 12, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  leaf: { position: 'absolute', top: 16, right: 16, width: 80, height: 80, opacity: 0.5 },
});

const markdownStyles = { heading1: { fontSize: 24, lineHeight: 32 }, body: { fontSize: 16, lineHeight: 24 } };

export default MutualReleaseScreen; 