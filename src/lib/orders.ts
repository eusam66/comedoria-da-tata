export function generateOrderCode() {
  // Gerar código curtinho: 3 letras + 4 dígitos, ex: TAT1234
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randLetters = Array.from({ length: 3 })
    .map(() => letters[Math.floor(Math.random() * letters.length)])
    .join('');
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${randLetters}${digits}`;
}
