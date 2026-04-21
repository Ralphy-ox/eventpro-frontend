export const PASSWORD_MIN_LENGTH = 8;

const SPECIAL_CHARACTER_REGEX = /[^A-Za-z0-9\s]/;
const UPPERCASE_REGEX = /[A-Z]/;

export type PasswordValidationResult = {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasSpecialCharacter: boolean;
  isValid: boolean;
};

export function validatePasswordRules(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasUppercase = UPPERCASE_REGEX.test(password);
  const hasSpecialCharacter = SPECIAL_CHARACTER_REGEX.test(password);

  return {
    hasMinLength,
    hasUppercase,
    hasSpecialCharacter,
    isValid: hasMinLength && hasUppercase && hasSpecialCharacter,
  };
}

export function getPasswordRuleMessage(password: string): string {
  const rules = validatePasswordRules(password);

  if (!rules.hasMinLength) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!rules.hasUppercase) {
    return 'Password must include at least 1 uppercase letter.';
  }
  if (!rules.hasSpecialCharacter) {
    return 'Password must include at least 1 special character.';
  }

  return '';
}
