import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface TextInputModalProps {
  visible: boolean;
  title: string;
  placeholder: string;
  submitButtonText?: string;
  cancelButtonText?: string;
  onSubmit: (inputText: string) => boolean | void | Promise<boolean | void>; // Return false to keep the modal open
  onClose: () => void;
  initialValue?: string; // Optional initial value for the input
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

  // Reset input value when modal becomes visible or initialValue changes
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
      // Optional: Add validation feedback (e.g., Alert or inline message)
      alert('Input cannot be empty.');
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.modalContainer}>
          {/* Clickable overlay to close */}
          <TouchableOpacity
            disabled={isSubmitting}
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            activeOpacity={1}
            testID='text-input-modal-overlay'
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TextInput
              accessibilityLabel={placeholder}
              style={styles.input}
              placeholder={placeholder}
              value={inputValue}
              onChangeText={setInputValue}
              editable={!isSubmitting}
              autoFocus={true} // Focus input when modal opens
              testID={inputTestID}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                accessibilityRole='button'
                accessibilityState={{ disabled: isSubmitting }}
                disabled={isSubmitting}
                style={styles.cancelButton}
                onPress={handleClose}
                testID='text-input-modal-cancel'
              >
                <Text style={styles.buttonText}>{cancelButtonText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole='button'
                accessibilityState={{
                  busy: isSubmitting,
                  disabled: isSubmitting,
                }}
                disabled={isSubmitting}
                style={styles.submitButton}
                onPress={() => void handleSubmit()}
                testID={submitButtonTestID}
              >
                <Text style={styles.buttonText}>{submitButtonText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Styles adapted from HistoryScreen and SelectionModal for consistency
const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center', // Center modal vertically
    alignItems: 'center', // Center modal horizontally
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '85%', // Adjust width as needed
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 45, // Slightly taller input
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 5,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TextInputModal;
