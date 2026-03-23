import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Button, StyleSheet, Alert, Switch } from 'react-native';
import Markdown from 'react-native-markdown-display';
import SignatureCanvas from 'react-native-signature-canvas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

// Load Sexual Consent markdown template as a bundled asset
const consentAsset = require('../assets/templates/nda_sexual_consent.md');

const SexualConsentScreen: React.FC<any> = () => {
  const [template, setTemplate] = useState<string>('');
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [includeSTI, setIncludeSTI] = useState(true);  // toggle for optional STI section
  const [includeMedia, setIncludeMedia] = useState(true);  // toggle for optional Media & Publicity
  const [includeNonDisparagement, setIncludeNonDisparagement] = useState(true);  // toggle for optional Non-Disparagement
  const [includeIndemnification, setIncludeIndemnification] = useState(true);  // toggle for optional Indemnification
  const sigRef = useRef<any>(null);

  // load markdown file
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(consentAsset);
      await asset.downloadAsync();
      const text = await FileSystem.readAsStringAsync(asset.localUri!);
      setTemplate(text);
    })();
  }, []);

  // helper to include or strip optional STI section
  const getProcessedTemplate = () => {
    let processed = template;
    if (!includeSTI) {
      processed = processed.replace(/<!-- STI_SCREENING_START -->[\s\S]*?<!-- STI_SCREENING_END -->\n?/, '');
    }
    if (!includeMedia) {
      processed = processed.replace(/<!-- MEDIA_RELEASE_START -->[\s\S]*?<!-- MEDIA_RELEASE_END -->\n?/, '');
    }
    if (!includeNonDisparagement) {
      processed = processed.replace(/<!-- NON_DISPARAGEMENT_START -->[\s\S]*?<!-- NON_DISPARAGEMENT_END -->\n?/, '');
    }
    if (!includeIndemnification) {
      processed = processed.replace(/<!-- INDEMNIFICATION_START -->[\s\S]*?<!-- INDEMNIFICATION_END -->\n?/, '');
    }
    return processed;
  };

  const handleSignature = (sig: string) => setSignature(sig);

  const saveConsent = async () => {
    if (!signature) { Alert.alert('Signature required', 'Please sign to continue.'); return; }
    setSaving(true);
    try {
      const processed = getProcessedTemplate();
      const filled = processed
        .replace(/\[Date\]/g, date)
        .replace(/\[Party A\]/g, partyA)
        .replace(/\[Party B\]/g, partyB);
      const record = { template: filled, signature, date };
      await AsyncStorage.setItem('sexualConsent', JSON.stringify(record));
      Alert.alert('Saved', 'Sexual Consent Agreement saved locally.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save agreement.');
    } finally { setSaving(false); }
  };

  const exportPdf = async () => {
    const processed = getProcessedTemplate();
    const filled = processed
      .replace(/\[Date\]/g, date)
      .replace(/\[Party A\]/g, partyA)
      .replace(/\[Party B\]/g, partyB);
    const html = `<html><body><h1>Sexual Consent Agreement</h1>${filled.replace(/\n/g,'<br/>')}<h2>Signature</h2><img src="${signature}" width="300"/></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Text>Include STI Screening</Text>
          <Switch value={includeSTI} onValueChange={setIncludeSTI} />
        </View>
        <View style={styles.switchRow}>
          <Text>Include Media & Publicity</Text>
          <Switch value={includeMedia} onValueChange={setIncludeMedia} />
        </View>
        <View style={styles.switchRow}>
          <Text>Include Non-Disparagement</Text>
          <Switch value={includeNonDisparagement} onValueChange={setIncludeNonDisparagement} />
        </View>
        <View style={styles.switchRow}>
          <Text>Include Indemnification</Text>
          <Switch value={includeIndemnification} onValueChange={setIncludeIndemnification} />
        </View>
      </View>
      <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <TextInput style={styles.input} placeholder="Party A" value={partyA} onChangeText={setPartyA} />
      <TextInput style={styles.input} placeholder="Party B" value={partyB} onChangeText={setPartyB} />
      <Text style={styles.previewLabel}>Agreement Preview:</Text>
      {template ? <Markdown style={markdownStyles}>{getProcessedTemplate()
        .replace(/\[Date\]/g, date)
        .replace(/\[Party A\]/g, partyA)
        .replace(/\[Party B\]/g, partyB)}
      </Markdown> : <Text>Loading...</Text>}
      <Text style={styles.signLabel}>Sign Below:</Text>
      <SignatureCanvas
        ref={sigRef}
        onOK={handleSignature}
        descriptionText="Sign above"
        clearText="Clear"
        confirmText="Save Signature"
        webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}   
      />
      <View style={styles.buttonRow}>
        <Button title={saving ? 'Saving...' : 'Save'} onPress={saveConsent} disabled={saving} />
        <Button title="Export PDF" onPress={exportPdf} disabled={!signature} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  switchContainer: { marginBottom: 12 },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 12 },
  previewLabel: { fontSize: 18, marginVertical: 12, fontWeight: '500' },
  signLabel: { fontSize: 18, marginVertical: 12, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
});

const markdownStyles = { heading1: { fontSize: 24, lineHeight: 32 }, body: { fontSize: 16, lineHeight: 24 } };

export default SexualConsentScreen;