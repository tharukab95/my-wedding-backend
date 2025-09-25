/**
 * Utility function to calculate age from birthday
 * @param birthday - The birthday date
 * @returns The calculated age in years, or null if birthday is not provided
 */
export function calculateAge(birthday: Date | null): number | null {
  if (!birthday) return null;

  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}
