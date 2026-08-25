import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';
import { AdaptiveGroupedSection } from './ui/adaptive-grouped-list';
import { AdaptiveSheet } from './ui/adaptive-sheet';

interface TextInputModalProps {
  visible: boolean;
  title: string;
  placeholder: string;
  submitButtonText?: string;
  cancelButtonText?: string;
  onSubmit: (inputText: string) => boolean | void | Promise<boolean | void>;
  onClose: () => void;
  initialValue?: string;
  inputTestID?: string;
  submitButtonTestID?: string;
}

const TextInputModal: React.FC<TextInputModalProps> = ({
  visible,
  title,
  placeholder,
  submitButtonText = 'Submit',
  cancelButtonText = 'Cancel',
  onSubmit,
  onClose,
  initialValue = '',
  inputTestID,
  submitButtonTestID,
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setInputValue(initialValue);
    }
  }, [visible, initialValue]);

  const handleClose = () => {
    if (!isSubmittingRef.current) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    const trimmedInput = inputValue.trim();
    if (!trimmedInput) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    let shouldClose: boolean;
    try {
      shouldClose = (await onSubmit(trimmedInput)) !== false;
    } catch {
      shouldClose = false;
    }
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    if (shouldClose) {
      onClose();
    }
  };

  const isSubmitDisabled = isSubmitting || inputValue.trim().length === 0;

  return (
    <AdaptiveSheet
      leadingAction={{
        accessibilityLabel: cancelButtonText,
        disabled: isSubmitting,
        label: cancelButtonText,
        onPress: handleClose,
        testID: 'text-input-modal-cancel',
      }}
      onClose={handleClose}
      title={title}
      trailingAction={{
        accessibilityLabel: submitButtonText,
        busy: isSubmitting,
        disabled: isSubmitDisabled,
        label: submitButtonText,
        onPress: () => void handleSubmit(),
        testID: submitButtonTestID,
      }}
      visible={visible}
    >
      <View style={styles.content}>
        <AdaptiveGroupedSection>
          <TextInput
            accessibilityLabel={placeholder}
            autoCapitalize='words'
            autoCorrect={false}
            autoFocus
            editable={!isSubmitting}
            onChangeText={setInputValue}
            onSubmitEditing={() => void handleSubmit()}
            placeholder={placeholder}
            placeholderTextColor={semanticColors.placeholder}
            returnKeyType='done'
            style={styles.input}
            testID={inputTestID}
            value={inputValue}
          />
        </AdaptiveGroupedSection>
      </View>
    </AdaptiveSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingTop: mobileTheme.spacing.xl,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: mobileTheme.spacing.lg,
    color: semanticColors.text,
    fontSize: 17,
  },
});

export default TextInputModal;
