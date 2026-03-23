import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

export type DualSignatureProps = {
  onSignaturesCollected: (disclosing: string, receiving: string) => void;
};

const DualSignature: React.FC<DualSignatureProps> = ({ onSignaturesCollected }) => {
  const [sigA, setSigA] = useState<string | null>(null);
  const [sigB, setSigB] = useState<string | null>(null);
  const refA = useRef<any>(null);
  const refB = useRef<any>(null);

  const handleOKA = (signature: string) => {
    setSigA(signature);
    if (sigB) onSignaturesCollected(signature, sigB);
  };

  const handleOKB = (signature: string) => {
    setSigB(signature);
    if (sigA) onSignaturesCollected(sigA, signature);
  };

  return (
    <View>
      <Text style={styles.label}>Disclosing Party Signature:</Text>
      <View style={styles.container}>
        <SignatureCanvas
          ref={refA}
          onOK={handleOKA}
          onEnd={() => refA.current?.readSignature()}
          descriptionText="Sign as Disclosing Party"
          clearText="Clear"
          confirmText="Save"
        />
      </View>

      <Text style={styles.label}>Receiving Party Signature:</Text>
      <View style={styles.container}>
        <SignatureCanvas
          ref={refB}
          onOK={handleOKB}
          onEnd={() => refB.current?.readSignature()}
          descriptionText="Sign as Receiving Party"
          clearText="Clear"
          confirmText="Save"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 18, marginVertical: 12, fontWeight: '500' },
  container: { height: 200, borderWidth: 1, borderColor: '#ccc', marginBottom: 16 },
});

export default DualSignature; 