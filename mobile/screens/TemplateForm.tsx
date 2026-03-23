/**
 * Template Form Screen - Creates consent records from templates.
 *
 * Dynamically renders form fields based on template definition.
 * Handles signatures, saving to encrypted DB, and PDF export.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureCanvas from 'react-native-signature-canvas';
import ErrorBoundary from '../components/ErrorBoundary';
import StatusBadge from '../components/StatusBadge';
import { getTemplateById, fillTemplate } from '../data/templates';
import db from '../services/database';
import exportService from '../services/export';
import purchaseService from '../services/purchases';
import type { ConsentTemplate, ConsentRecord, SignatureData, PartyInfo } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface TemplateFormProps {
  navigation: any;
  route: {
    params: {
      templateId: string;
    };
  };
}

const TemplateForm: React.FC<TemplateFormProps> = ({ navigation, route }) => {
  const template = getTemplateById(route.params.templateId);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [signatureA, setSignatureA] = useState<string | null>(null);
  const [signatureB, setSignatureB] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRecord, setSavedRecord] = useState<ConsentRecord | null>(null);

  if (!template) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Template not found.</Text>
      </SafeAreaView>
    );
  }

  const filledText = useMemo(() => {
    return fillTemplate(template, fieldValues);
  }, [template, fieldValues]);

  const updateField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const isFormValid = (): boolean => {
    // Check required fields
    for (const field of template.fields) {
      if (field.required && !fieldValues[field.key]?.trim()) {
        return false;
      }
    }
    // Check signatures
    if (!signatureA) return false;
    if (template.requiresDualSignature && !signatureB) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      Alert.alert(
        'Incomplete Form',
        'Please fill in all required fields and provide signature(s).'
      );
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();

      // Build parties from fields
      const parties: PartyInfo[] = [];
      const nameFields = template.fields.filter(
        (f) =>
          f.key.toLowerCase().includes('name') ||
          f.key.toLowerCase().includes('party')
      );
      for (const f of nameFields) {
        if (fieldValues[f.key]) {
          parties.push({
            name: fieldValues[f.key],
            role: f.label,
          });
        }
      }

      // Build signatures
      const signatures: SignatureData[] = [];
      if (signatureA) {
        signatures.push({
          partyName: parties[0]?.name || 'Party A',
          signatureImage: signatureA,
          timestamp: now,
        });
      }
      if (signatureB && template.requiresDualSignature) {
        signatures.push({
          partyName: parties[1]?.name || 'Party B',
          signatureImage: signatureB,
          timestamp: now,
        });
      }

      // Calculate expiry
      let expiresAt: string | null = null;
      if (template.defaultExpiryDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + template.defaultExpiryDays);
        expiresAt = expiry.toISOString();
      }

      const record = await db.createRecord({
        templateId: template.id,
        templateName: template.name,
        title: `${template.name} - ${parties[0]?.name || 'Untitled'}`,
        status: 'active',
        createdAt: now,
        expiresAt,
        revokedAt: null,
        parties,
        consentText: filledText,
        signatures,
        recordingUri: null,
        recordingDuration: null,
        pdfUri: null,
        documentHash: null,
        metadata: fieldValues,
      });

      // Update record count for entitlement tracking
      const count = await db.getRecordCount();
      await purchaseService.updateRecordCount(count);

      setSavedRecord(record);
      setSaved(true);
      Alert.alert('Saved', 'Consent record saved and encrypted.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save consent record.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!savedRecord) {
      Alert.alert('Save First', 'Please save the consent record before exporting.');
      return;
    }
    try {
      await exportService.exportAndShare(savedRecord);
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export PDF.');
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Template Header */}
            <View style={styles.templateHeader}>
              <Text style={styles.templateIcon}>{template.icon}</Text>
              <View style={styles.templateHeaderText}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDescription}>
                  {template.description}
                </Text>
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Details</Text>
              {template.fields.map((field) => (
                <View key={field.key} style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>
                    {field.label}
                    {field.required && (
                      <Text style={styles.requiredStar}> *</Text>
                    )}
                  </Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      field.type === 'multiline' && styles.fieldInputMultiline,
                    ]}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.textTertiary}
                    value={fieldValues[field.key] || ''}
                    onChangeText={(text) => updateField(field.key, text)}
                    multiline={field.type === 'multiline'}
                    numberOfLines={field.type === 'multiline' ? 4 : 1}
                    keyboardType={
                      field.type === 'email'
                        ? 'email-address'
                        : field.type === 'number'
                        ? 'numeric'
                        : 'default'
                    }
                    textAlignVertical={
                      field.type === 'multiline' ? 'top' : 'center'
                    }
                  />
                </View>
              ))}
            </View>

            {/* Consent Text Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Consent Text Preview</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewText}>{filledText}</Text>
              </View>
            </View>

            {/* Signatures */}
            <View style={styles.signatureSection}>
              <Text style={styles.sectionTitle}>
                {template.requiresDualSignature
                  ? 'Signature - Party A'
                  : 'Signature'}
              </Text>
              <View style={styles.signatureCanvas}>
                <SignatureCanvas
                  onOK={(sig: string) => setSignatureA(sig)}
                  onEnd={() => {}}
                  descriptionText="Sign here"
                  clearText="Clear"
                  confirmText="Save Signature"
                  webStyle=".m-signature-pad--footer {display: flex;} .m-signature-pad {box-shadow: none; border: none;}"
                />
              </View>
              {signatureA && (
                <Text style={styles.signatureConfirm}>
                  {'\u2713'} Signature captured
                </Text>
              )}

              {template.requiresDualSignature && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
                    Signature - Party B
                  </Text>
                  <View style={styles.signatureCanvas}>
                    <SignatureCanvas
                      onOK={(sig: string) => setSignatureB(sig)}
                      onEnd={() => {}}
                      descriptionText="Sign here"
                      clearText="Clear"
                      confirmText="Save Signature"
                      webStyle=".m-signature-pad--footer {display: flex;} .m-signature-pad {box-shadow: none; border: none;}"
                    />
                  </View>
                  {signatureB && (
                    <Text style={styles.signatureConfirm}>
                      {'\u2713'} Signature captured
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* Expiry Notice */}
            {template.defaultExpiryDays && (
              <View style={styles.expiryNotice}>
                <Text style={styles.expiryText}>
                  This consent will expire {template.defaultExpiryDays} days
                  after signing.
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsContainer}>
              {!saved ? (
                <Pressable
                  style={[
                    styles.saveButton,
                    !isFormValid() && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving || !isFormValid()}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save Consent Record'}
                  </Text>
                </Pressable>
              ) : (
                <>
                  <View style={styles.savedIndicator}>
                    <Text style={styles.savedText}>
                      {'\u2713'} Record Saved and Encrypted
                    </Text>
                  </View>
                  <Pressable
                    style={styles.exportButton}
                    onPress={handleExport}
                  >
                    <Text style={styles.exportButtonText}>Export PDF</Text>
                  </Pressable>
                  <Pressable
                    style={styles.newButton}
                    onPress={() => navigation.goBack()}
                  >
                    <Text style={styles.newButtonText}>Done</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xxxl,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  templateIcon: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  templateHeaderText: {
    flex: 1,
  },
  templateName: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  templateDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  requiredStar: {
    color: Colors.error,
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  fieldInputMultiline: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  previewSection: {
    marginBottom: Spacing.lg,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxHeight: 300,
  },
  previewText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  signatureSection: {
    marginBottom: Spacing.lg,
  },
  signatureCanvas: {
    height: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  signatureConfirm: {
    ...Typography.bodySmall,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  expiryNotice: {
    backgroundColor: '#FFF3E0',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  expiryText: {
    ...Typography.bodySmall,
    color: '#E65100',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.textInverse,
  },
  savedIndicator: {
    backgroundColor: '#E8F5E9',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  savedText: {
    ...Typography.body,
    color: '#2E7D32',
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  exportButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },
  newButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  newButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
});

export default TemplateForm;
