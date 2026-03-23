import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Text, Button, StyleSheet, Alert, TextInput, ImageBackground, Image, TouchableOpacity } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as Print from 'expo-print';
import Markdown from 'react-native-markdown-display';
import * as SecureStore from 'expo-secure-store';
import DualSignature from '../components/DualSignature';
// Icon assets
const iconLock = require('../assets/icon_cloud_lock.png');
const iconSignature = require('../assets/icon_signature.png');
const iconPdf = require('../assets/icon_pdf.png');
const iconShield = require('../assets/icon_shield.png');

// Load NDA template as a bundled asset
const ndaAssetModule = require('../assets/templates/form-templates/nda_template.md');
// Visual assets
const bgForest = require('../assets/bg_forest_watercolor.png');
const leafPattern = require('../assets/pattern_leaf.png');
const signIcon = require('../assets/icon_signature.png');

const NdaScreen: React.FC<any> = () => {
  const [ndaText, setNdaText] = useState<string>('');
  const [signatureA, setSignatureA] = useState<string | null>(null);
  const [signatureB, setSignatureB] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sigRef = useRef<any>(null);
  // Form fields
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [disclosingParty, setDisclosingParty] = useState('');
  const [receivingParty, setReceivingParty] = useState('');
  const [scope, setScope] = useState('');
  const [term, setTerm] = useState('');
  const [governingLaw, setGoverningLaw] = useState('');

  // Load NDA markdown from bundled asset
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(ndaAssetModule);
      await asset.downloadAsync();
      let text = await FileSystem.readAsStringAsync(asset.localUri!);
      text = text.replace(/<!--[\s\S]*?-->/g, '');
      text = text.replace(/## Signatures[\s\S]*/g, '');
      setNdaText(text);
    })();
  }, []);

  const handleSignature = (party: 'disclosing' | 'receiving', sig: string) => {
    if (party === 'disclosing') setSignatureA(sig);
    else setSignatureB(sig);
  };

  const saveAgreement = async () => {
    if (!signatureA || !signatureB) {
      Alert.alert('Signature required', 'Please collect both signatures to continue.');
      return;
    }
    setSaving(true);
    try {
      const filled = ndaText
        .replace(/\[Date\]/g, date)
        .replace(/\[Disclosing Party\]/g, disclosingParty)
        .replace(/\[Receiving Party\]/g, receivingParty)
        .replace(/\[Scope\]/g, scope)
        .replace(/\[Term in years\]/g, term)
        .replace(/\[Governing Law\]/g, governingLaw);
      await SecureStore.setItemAsync(
        'ndaAgreement',
        JSON.stringify({ template: filled, signatureA, signatureB, date })
      );
      const check = await SecureStore.getItemAsync('ndaAgreement');
      console.log('NDA saved:', check);
      Alert.alert('Saved', 'NDA saved securely.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save NDA securely.');
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async () => {
    const filled = ndaText
      .replace(/\[Date\]/g, date)
      .replace(/\[Disclosing Party\]/g, disclosingParty)
      .replace(/\[Receiving Party\]/g, receivingParty)
      .replace(/\[Scope\]/g, scope)
      .replace(/\[Term in years\]/g, term)
      .replace(/\[Governing Law\]/g, governingLaw);
    const html = `<html><body><h1>Non-Disclosure Agreement</h1>${filled.replace(/\n/g,'<br/>')}<h2>Signatures</h2><img src="${signatureA}" width="200"/><img src="${signatureB}" width="200"/></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <ImageBackground source={bgForest} style={styles.background}>
      <Image source={leafPattern} style={styles.leaf as any} />
      <View style={styles.card}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Image source={iconLock} style={styles.headerIcon as any} />
            <Text style={styles.headingScreen}>Non-Disclosure Agreement</Text>
          </View>
          <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
          <TextInput style={styles.input} placeholder="Disclosing Party" value={disclosingParty} onChangeText={setDisclosingParty} />
          <TextInput style={styles.input} placeholder="Receiving Party" value={receivingParty} onChangeText={setReceivingParty} />
          <TextInput style={styles.input} placeholder="Scope of Confidential Information" value={scope} onChangeText={setScope} />
          <TextInput style={styles.input} placeholder="Term (years)" value={term} onChangeText={setTerm} />
          <TextInput style={styles.input} placeholder="Governing Law" value={governingLaw} onChangeText={setGoverningLaw} />
          <Text style={styles.previewLabel}>Agreement Preview:</Text>
          {ndaText ? (
            <Markdown style={markdownStyles}>
              {ndaText
                .replace(/\[Date\]/g, date)
                .replace(/\[Disclosing Party\]/g, disclosingParty)
                .replace(/\[Receiving Party\]/g, receivingParty)
                .replace(/\[Scope\]/g, scope)
                .replace(/\[Term in years\]/g, term)
                .replace(/\[Governing Law\]/g, governingLaw)
              }
            </Markdown>
          ) : <Text>Loading NDA...</Text>}
          <Text style={styles.signLabel}>Disclosing Party Signature:</Text>
          <View style={styles.signatureContainer}>
            <DualSignature onSignaturesCollected={(a, b) => {
              setSignatureA(a);
              setSignatureB(b);
            }} />
          </View>
          <Text style={styles.signLabel}>Receiving Party Signature:</Text>
          <View style={styles.signatureContainer}>
            <DualSignature onSignaturesCollected={(a, b) => {
              setSignatureA(a);
              setSignatureB(b);
            }} />
          </View>
          <View style={styles.buttonRow}>
            <Button
              title={saving ? 'Saving...' : 'Save'}
              onPress={saveAgreement}
              disabled={saving || !signatureA || !signatureB}
            />
            <Button
              title="Export PDF"
              onPress={exportPdf}
              disabled={!signatureA || !signatureB}
            />
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
  headingScreen: { fontSize: 24, fontWeight: '600', marginBottom: 16, color: '#222' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerIcon: { width: 24, height: 24, marginRight: 8 },
  signButton: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#eee', borderRadius: 4, marginVertical: 12 },
  signIcon: { width: 24, height: 24, marginRight: 8 },
  signatureContainer: { height: 200, borderWidth: 1, borderColor: '#ccc', marginVertical: 12 },
  signLabel: { fontSize: 18, marginVertical: 12, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 12, padding: 10, backgroundColor: '#fff' },
  previewLabel: { fontSize: 18, marginVertical: 12, fontWeight: '500' },
  leaf: { position: 'absolute', top: 16, right: 16, width: 80, height: 80, opacity: 0.5 },
  buttonText: { fontSize: 16 }
});

const markdownStyles = {
  heading1: { fontSize: 24, lineHeight: 32 },
  body: { fontSize: 16, lineHeight: 24 },
};

export default NdaScreen; 