import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { seedFinancialData } from './seedData';
import styles from './FinancialPlanner.module.css';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const toMonthly = (amount, freq) => {
  if (freq === 'annual') return amount / 12;
  if (freq === 'weekly') return amount * 52 / 12;
  return amount;
};

function OverviewPanel({ revealed }) {
  const [data, setData] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const load = async () => {
    const [debtSnap, billSnap, invSnap, incSnap] = await Promise.all([
      getDocs(collection(db, 'userDebts')),
      getDocs(collection(db, 'userBills')),
      getDocs(collection(db, 'userInvestments')),
      getDocs(collection(db, 'userIncome')),
    ]);

    const debts = debtSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const bills = billSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const investments = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const income = incSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const totalIncome = income.reduce((s, i) => s + toMonthly(i.amount || 0, i.frequency), 0);
    const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
    const totalMinPayments = debts.reduce((s, d) => s + (d.minimumPayment || 0), 0);
    const totalMonthlyInterest = debts.reduce((s, d) => s + (d.balance || 0) * ((d.interestRate || 0) / 100 / 12), 0);
    const totalBills = bills.reduce((s, b) => s + toMonthly(b.budgeted || b.amount || 0, b.frequency), 0);
    const totalInvestments = investments.reduce((s, i) => s + (i.balance || 0), 0);
    const totalMonthlyInvest = investments.reduce((s, i) => s + (i.monthlyContribution || 0), 0);
    const monthlySurplus = totalIncome - totalBills - totalMinPayments;
    const isEmpty = debts.length === 0 && bills.length === 0 && investments.length === 0;

    setData({ debts, bills, investments, income, totalIncome, totalDebt, totalMinPayments, totalMonthlyInterest, totalBills, totalInvestments, totalMonthlyInvest, monthlySurplus, isEmpty });
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg('');
    try {
      const result = await seedFinancialData();
      setSeedMsg(result.seeded ? `Loaded ${result.count} records from your spreadsheet.` : 'Data already loaded.');
      await load();
    } catch (e) {
      setSeedMsg('Error loading data: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const val = (n) => (revealed ? fmt(n) : <span className={styles.masked}>••••</span>);

  if (!data) return <p className={styles.empty}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {data.isEmpty && (
        <div style={{ background: '#1a1126', border: '1px dashed #927aaa', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#beaccf', marginBottom: '1rem' }}>Your spreadsheet data is ready to load.</p>
          <button className={styles.btnPrimary} onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Loading…' : 'Load My Spreadsheet Data'}
          </button>
          {seedMsg && <p style={{ marginTop: '0.75rem', color: '#81c784', fontSize: '0.85rem' }}>{seedMsg}</p>}
        </div>
      )}

      {!data.isEmpty && seedMsg && (
        <p style={{ color: '#81c784', fontSize: '0.85rem', margin: 0 }}>{seedMsg}</p>
      )}

      {/* Income */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Monthly Income</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          {data.income.map((inc) => (
            <div key={inc.id} className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{inc.name}</span>
              <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(toMonthly(inc.amount || 0, inc.frequency))}</span>
            </div>
          ))}
          <div className={styles.summaryItem} style={{ borderLeft: '1px solid #33244a', paddingLeft: '1rem' }}>
            <span className={styles.summaryLabel}>Total / month</span>
            <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(data.totalIncome)}</span>
          </div>
        </div>
      </div>

      {/* Key numbers */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total debt</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueRed}`}>{val(data.totalDebt)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Monthly interest</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueRed}`}>{val(data.totalMonthlyInterest)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Monthly bills</span>
          <span className={styles.summaryValue}>{val(data.totalBills)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total investments</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(data.totalInvestments)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Investing / month</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(data.totalMonthlyInvest)}</span>
        </div>
        <div className={styles.summaryItem} style={{ borderLeft: '1px solid #33244a', paddingLeft: '1rem' }}>
          <span className={styles.summaryLabel}>Monthly surplus</span>
          <span className={`${styles.summaryValue} ${data.monthlySurplus >= 0 ? styles.summaryValueGreen : styles.summaryValueRed}`}>
            {val(data.monthlySurplus)}
          </span>
        </div>
      </div>

      {/* Save vs Pay recommendation */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Save vs. Pay — Current Recommendation</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className={`${styles.calcPanel} ${styles.calcPanelRed}`} style={{ flex: 1, minWidth: 200 }}>
            <div className={`${styles.calcPanelTitle} ${styles.calcPanelTitleRed}`}>Paying Debt</div>
            <div className={styles.calcRow}>
              <span className={styles.calcRowLabel}>Rate</span>
              <span className={styles.calcRowValue}>24% (credit card)</span>
            </div>
            <div className={styles.calcRow}>
              <span className={styles.calcRowLabel}>$500/mo → 12-month impact</span>
              <span className={`${styles.calcRowValue} ${styles.calcRowValueGood}`}>{val(6120)} saved</span>
            </div>
          </div>
          <div className={`${styles.calcPanel} ${styles.calcPanelGreen}`} style={{ flex: 1, minWidth: 200 }}>
            <div className={`${styles.calcPanelTitle} ${styles.calcPanelTitleGreen}`}>Investing</div>
            <div className={styles.calcRow}>
              <span className={styles.calcRowLabel}>Rate</span>
              <span className={styles.calcRowValue}>8% (market avg)</span>
            </div>
            <div className={styles.calcRow}>
              <span className={styles.calcRowLabel}>$500/mo → 12-month impact</span>
              <span className={styles.calcRowValue}>{val(6040)} gained</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#120d1e', borderRadius: '5px', fontSize: '0.85rem', color: '#beaccf' }}>
          ✓ <strong>Mathematical winner: Pay Debt first.</strong> At 24% APR vs 8% market return, every dollar toward debt saves more than investing it.
        </div>
      </div>

    </div>
  );
}

export default OverviewPanel;
