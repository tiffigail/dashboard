import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const SEED_DEBTS = [
  { name: 'Wells Fargo (Abi)', type: 'credit_card', balance: 6242, interestRate: 0, minimumPayment: 60, loginUrl: 'https://wellsfargo.com', notes: 'Maintain' },
  { name: 'USAA (Abi)', type: 'credit_card', balance: 2000, interestRate: 0.89, minimumPayment: 60, loginUrl: 'https://usaa.com', notes: 'Focus here' },
];

const SEED_BILLS = [
  { name: 'Housing/Rent', category: 'housing', budgeted: 3300, actual: 3300, frequency: 'monthly', autopay: false, dueDay: 1, loginUrl: '' },
  { name: 'Utilities', category: 'utilities', budgeted: 300, actual: 280, frequency: 'monthly', autopay: false, dueDay: null, loginUrl: '' },
  { name: 'Planet Fitness', category: 'subscription', budgeted: 40, actual: 40, frequency: 'monthly', autopay: true, dueDay: null, loginUrl: 'https://planetfitness.com' },
  { name: 'Groceries', category: 'other', budgeted: 600, actual: 650, frequency: 'monthly', autopay: false, dueDay: null, loginUrl: '' },
  { name: 'Transportation', category: 'other', budgeted: 200, actual: 200, frequency: 'monthly', autopay: false, dueDay: null, loginUrl: '' },
  { name: 'Entertainment', category: 'subscription', budgeted: 200, actual: 250, frequency: 'monthly', autopay: false, dueDay: null, loginUrl: '' },
  { name: 'Miscellaneous', category: 'other', budgeted: 100, actual: 50, frequency: 'monthly', autopay: false, dueDay: null, loginUrl: '' },
];

const SEED_INVESTMENTS = [
  { name: 'High-Yield Savings', type: 'savings', accountSuffix: '', balance: 34000, monthlyContribution: 1000, expectedReturn: 3.25, owner: 'Joint', loginUrl: '' },
  { name: 'WF Fidelity', type: 'brokerage', accountSuffix: '2044', balance: 13528, monthlyContribution: 0, expectedReturn: 8, owner: 'Abi', loginUrl: 'https://fidelity.com' },
  { name: 'Vanguard', type: 'brokerage', accountSuffix: '', balance: 4737, monthlyContribution: 0, expectedReturn: 8, owner: 'Abi', loginUrl: 'https://vanguard.com' },
  { name: 'Principal (Tiffany)', type: 'retirement', accountSuffix: '4445', balance: 45191.17, monthlyContribution: 0, expectedReturn: 8, owner: 'Tiffany', loginUrl: 'https://principal.com' },
  { name: 'Principal', type: 'retirement', accountSuffix: '3920', balance: 9028.83, monthlyContribution: 0, expectedReturn: 8, owner: 'Abi', loginUrl: 'https://principal.com' },
  { name: 'Fidelity UHS (Abi)', type: 'retirement', accountSuffix: '266', balance: 19593.37, monthlyContribution: 0, expectedReturn: 8, owner: 'Abi', loginUrl: 'https://fidelity.com' },
  { name: 'Fidelity Brokerage (Tiffany)', type: 'brokerage', accountSuffix: '304', balance: 4137.85, monthlyContribution: 0, expectedReturn: 8, owner: 'Tiffany', loginUrl: 'https://fidelity.com' },
  { name: 'Wellstrade IRA', type: 'ira', accountSuffix: '7949', balance: 8576.37, monthlyContribution: 0, expectedReturn: 8, owner: 'Abi', loginUrl: 'https://wellsfargo.com' },
  { name: 'Betterment IRA', type: 'ira', accountSuffix: '', balance: 300, monthlyContribution: 333.33, expectedReturn: 8, owner: 'Joint', loginUrl: 'https://betterment.com' },
];

const SEED_INCOME = [
  { name: 'Primary Salary (Abi)', frequency: 'monthly', amount: 4500 },
  { name: 'Primary Salary (Tiffany)', frequency: 'monthly', amount: 6000 },
  { name: 'Side Projects', frequency: 'monthly', amount: 0 },
];

export const seedFinancialData = async () => {
  const [debtSnap, billSnap, invSnap, incSnap] = await Promise.all([
    getDocs(collection(db, 'userDebts')),
    getDocs(collection(db, 'userBills')),
    getDocs(collection(db, 'userInvestments')),
    getDocs(collection(db, 'userIncome')),
  ]);

  const writes = [];

  if (debtSnap.empty) {
    SEED_DEBTS.forEach((d) => writes.push(addDoc(collection(db, 'userDebts'), { ...d, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })));
  }
  if (billSnap.empty) {
    SEED_BILLS.forEach((b) => writes.push(addDoc(collection(db, 'userBills'), { ...b, createdAt: serverTimestamp() })));
  }
  if (invSnap.empty) {
    SEED_INVESTMENTS.forEach((i) => writes.push(addDoc(collection(db, 'userInvestments'), { ...i, createdAt: serverTimestamp() })));
  }
  if (incSnap.empty) {
    SEED_INCOME.forEach((i) => writes.push(addDoc(collection(db, 'userIncome'), { ...i, createdAt: serverTimestamp() })));
  }

  await Promise.all(writes);
  return { seeded: writes.length > 0, count: writes.length };
};
