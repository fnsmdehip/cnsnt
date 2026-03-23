import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface PinScreenProps {
  onSuccess: () => void;
  pinExists: boolean;
}

const PinScreen: React.FC<PinScreenProps> = ({ onSuccess, pinExists }) => {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSetPin = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== pinConfirm) {
      setError('PINs do not match');
      return;
    }
    await SecureStore.setItemAsync('cnsnt-pin', pin);
    onSuccess();
  };

  const handleEnterPin = async () => {
    const storedPin = await SecureStore.getItemAsync('cnsnt-pin');
    if (storedPin === pin) {
      onSuccess();
    } else {
      setError('Incorrect PIN');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{pinExists ? 'Enter PIN' : 'Set a new PIN'}</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        keyboardType="numeric"
        placeholder="PIN"
        value={pin}
        onChangeText={setPin}
      />
      {!pinExists && (
        <TextInput
          style={styles.input}
          secureTextEntry
          keyboardType="numeric"
          placeholder="Confirm PIN"
          value={pinConfirm}
          onChangeText={setPinConfirm}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={pinExists ? 'Unlock' : 'Save PIN'}
        onPress={pinExists ? handleEnterPin : handleSetPin}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginBottom: 12 },
  error: { color: 'red', textAlign: 'center', marginBottom: 12 },
});

export default PinScreen; 