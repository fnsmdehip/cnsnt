import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Button, StyleSheet, Alert, ImageBackground, Image } from 'react-native';
import Markdown from 'react-native-markdown-display';
import SignatureCanvas from 'react-native-signature-canvas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import DualSignature from '../components/DualSignature';
import * as SecureStore from 'expo-secure-store';

// Visual assets
const bgPaper = require('../assets/bg_paper_texture.png');
const leafPattern = require('../assets/pattern_leaf.png');
const iconShield = require('../assets/icon_shield.png');
const iconPdf = require('../assets/icon_pdf.png');

// Load Waiver markdown template
const waiverTemplate = require('../assets/templates/form-templates/waiver_template.md');

const WaiverScreen: React.FC<any> = () => {
  const [template, setTemplate] = useState<string>('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [location, setLocation] = useState('');
  const [organization, setOrganization] = useState('');
  const [signatureA, setSignatureA] = useState<string | null>(null);
  const [signatureB, setSignatureB] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sigRef = useRef<any>(null);

  // Load markdown template
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(waiverTemplate);
      await asset.downloadAsync();
      let text = await FileSystem.readAsStringAsync(asset.localUri!);
      // remove placeholder signature section
      text = text.replace(/## Signature[\s\S]*/g, '');
      setTemplate(text);
    })();
  }, []);

  const saveWaiver = async () => {
    if (!signatureA || !signatureB) {
      Alert.alert('Signature required', 'Please collect both signatures to continue.');
      return;
    }
    setSaving(true);
    try {
      const filled = template
        .replace(/\[Name\]/g, name)
        .replace(/\[Date\]/g, date)
        .replace(/\[Location\]/g, location)
        .replace(/\[Organization\]/g, organization);
      await SecureStore.setItemAsync('waiver', JSON.stringify({ template: filled, signatureA, signatureB, date }));
      const check = await SecureStore.getItemAsync('waiver'); console.log('Waiver saved:', check);
      Alert.alert('Saved', 'Waiver saved securely.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save waiver.');
    } finally { setSaving(false); }
  };

  const exportWaiver = async () => {
    const filled = template
      .replace(/\[Name\]/g, name)
      .replace(/\[Date\]/g, date)
      .replace(/\[Location\]/g, location)
      .replace(/\[Organization\]/g, organization);
    const html = `<html><body><h1>Liability Waiver</h1>${filled.replace(/\n/g,'<br/>')}<h2>Signatures</h2><img src="${signatureA}" width="200"/><img src="${signatureB}" width="200"/></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <ImageBackground source={bgPaper} style={styles.background} imageStyle={styles.bgImage}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={leafPattern} style={styles.leaf} />
        <Text style={styles.heading}>Liability Waiver</Text>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
        <TextInput style={styles.input} placeholder="Location" value={location} onChangeText={setLocation} />
        <TextInput style={styles.input} placeholder="Organization" value={organization} onChangeText={setOrganization} />
        <Text style={styles.previewLabel}>Preview:</Text>
        {template ? <Markdown style={markdownStyles}>{template
            .replace(/\[Name\]/g, name)
            .replace(/\[Date\]/g, date)
            .replace(/\[Location\]/g, location)
            .replace(/\[Organization\]/g, organization)}
        </Markdown> : <Text>Loading...</Text>}
        <DualSignature onSignaturesCollected={(a, b) => { setSignatureA(a); setSignatureB(b); }} />
        <View style={styles.buttonRow}>
          <Button title={saving ? 'Saving...' : 'Save'} onPress={saveWaiver} disabled={saving || !signatureA || !signatureB} />
          <Button title="Export PDF" onPress={exportWaiver} disabled={!signatureA || !signatureB} />
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  bgImage: { resizeMode: 'repeat' },
  container: { padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 12, backgroundColor: '#fff' },
  previewLabel: { fontSize: 18, marginVertical: 12, fontWeight: '500' },
  signLabel: { fontSize: 18, marginVertical: 12, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  leaf: { position: 'absolute', top: 16, right: 16, width: 80, height: 80, opacity: 0.5 },
});

const markdownStyles = { heading1: { fontSize: 24, lineHeight: 32 }, body: { fontSize: 16, lineHeight: 24 } };

export default WaiverScreen; 