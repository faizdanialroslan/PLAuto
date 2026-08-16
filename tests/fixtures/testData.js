const validApplicant = {
  monthlyIncome: 5_000,
  loanAmount: 20_000, // within 5,000 x 15 = 75,000 max
  tenure: '36 Months',
};

const incomeBoundaries = [
  { label: 'below minimum (1,999)', value: 1_999, expectValid: false },
  { label: 'at minimum (2,000)', value: 2_000, expectValid: true },
  { label: 'just above minimum (2,001)', value: 2_001, expectValid: true },
];

const loanAmountBoundaries = [
  { label: 'below minimum (1,999)', value: 1_999, expectValid: false },
  { label: 'at minimum (2,000)', value: 2_000, expectValid: true },
  { label: 'just above minimum (2,001)', value: 2_001, expectValid: true },
];

// income -> expected max loan amount (confirmed as income x 15 against the live site)
const incomeToMaxLoan = [
  { income: 2_000, maxLoan: 30_000 },
  { income: 3_000, maxLoan: 45_000 },
  { income: 5_000, maxLoan: 75_000 },
  { income: 10_000, maxLoan: 150_000 },
];

const ERROR_MESSAGES = {
  minIncome: 'Minimum gross monthly income is MYR 2,000.',
  minLoanAmount: 'Minimum loan amount is MYR 2,000.',
  maxLoanAmount: (max) => `Maximum loan amount is MYR ${max.toLocaleString('en-US')}.`,
};

// Bahasa Malaysia strings, pulled straight off the live page after toggling the language switch
const BM_TEXT = {
  fieldLabels: ['Pendapatan Kasar Bulanan', 'Jumlah Pinjaman', 'Tempoh Pinjaman'],
  nextButton: 'Seterusnya',
  minIncomeError: 'Pendapatan kasar bulanan minimum adalah MYR 2,000.',
  minLoanAmountError: 'Jumlah pinjaman minimum adalah MYR 2,000.',
};

module.exports = {
  validApplicant,
  incomeBoundaries,
  loanAmountBoundaries,
  incomeToMaxLoan,
  ERROR_MESSAGES,
  BM_TEXT,
};
