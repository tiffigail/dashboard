import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import styles from './FinancialPlanner.module.css';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// Months to pay off a single debt with extra cash added on top of minimum payment
// Returns { months, totalInterest }
const calcPayoff = (balance, apr, minPayment, extra) => {
  if (balance <= 0) return { months: 0, totalInterest: 0 };
  const monthly = apr / 100 / 12;
  if (monthly === 0) {
    const payment = (minPayment || 0) + extra;
    if (payment <= 0) return { months: Infinity, totalInterest: 0 };
    return { months: Math.ceil(balance / payment), totalInterest: 0 };
  }
  let bal = balance;
  let months = 0;
  let totalInterest = 0;
  const payment = Math.max((minPayment || 0) + extra, bal * monthly + 0.01); // at minimum cover interest
  while (bal > 0.01 && months < 600) {
    const interest = bal * monthly;
    totalInterest += interest;
    bal = bal + interest - payment;
    if (bal < 0) bal = 0;
    months++;
  }
  return { months, totalInterest };
};

// Avalanche: pay minimums on all, pour extra into highest-APR first
const avalanchePayoff = (debts, extraMonthly) => {
  if (!debts.length) return { totalMonths: 0, totalInterestPaid: 0, totalInterestWithMin: 0, order: [] };

  // Calculate total interest paying minimums only (for comparison)
  const minOnlyInterest = debts.reduce((sum, d) => {
    const { totalInterest } = calcPayoff(d.balance || 0, d.interestRate || 0, d.minimumPayment || 0, 0);
    return sum + totalInterest;
  }, 0);

  // Simulate avalanche
  const sorted = debts
    .filter((d) => (d.balance || 0) > 0)
    .map((d) => ({ ...d, remaining: d.balance || 0 }))
    .sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));

  const result = sorted.map((d) => ({ ...d, monthsToPayoff: 0, interestPaid: 0 }));
  let month = 0;
  let freed = 0; // minimums freed up from paid-off debts

  while (result.some((d) => d.remaining > 0.01) && month < 600) {
    month++;
    let extraLeft = extraMonthly + freed;

    for (const d of result) {
      if (d.remaining <= 0.01) continue;
      const monthly = (d.interestRate || 0) / 100 / 12;
      const interest = d.remaining * monthly;
      d.interestPaid += interest;
      d.remaining += interest;

      // Pay minimum first
      const payment = Math.min(d.minimumPayment || 0, d.remaining);
      d.remaining -= payment;

      if (d.remaining <= 0.01) {
        d.remaining = 0;
        d.monthsToPayoff = month;
        freed += d.minimumPayment || 0;
      }
    }

    // Pour extra into highest-APR with remaining balance
    for (const d of result) {
      if (d.remaining <= 0.01 || extraLeft <= 0) continue;
      const pay = Math.min(extraLeft, d.remaining);
      d.remaining -= pay;
      extraLeft -= pay;
      if (d.remaining <= 0.01) {
        d.remaining = 0;
        d.monthsToPayoff = month;
        freed += d.minimumPayment || 0;
      }
    }
  }

  const totalInterestPaid = result.reduce((s, d) => s + d.interestPaid, 0);

  return {
    totalMonths: month,
    totalInterestPaid,
    totalInterestWithMin: minOnlyInterest,
    interestSaved: minOnlyInterest - totalInterestPaid,
    order: result,
  };
};

// Future value of monthly contributions: PMT × ((1+r)^n − 1) / r
const investmentValue = (pmt, annualRate, years) => {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return pmt * n;
  return pmt * ((Math.pow(1 + r, n) - 1) / r);
};

const HORIZONS = [1, 3, 5, 10];

function PayoffCalculator({ revealed }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extra, setExtra] = useState(200);
  const [marketRate, setMarketRate] = useState(7);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, 'userDebts'));
      setDebts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, []);

  const val = (n) => (revealed ? fmt(n) : <span className={styles.masked}>••••</span>);
  const monthsToYrs = (m) => {
    if (!isFinite(m)) return '∞';
    const yrs = Math.floor(m / 12);
    const mos = m % 12;
    return yrs > 0 ? `${yrs}y ${mos}m` : `${mos}m`;
  };

  const payoff = avalanchePayoff(debts, extra);
  const totalMinMonthly = debts.reduce((s, d) => s + (d.minimumPayment || 0), 0);
  const totalDebtInterest = debts.reduce((s, d) => s + ((d.balance || 0) * ((d.interestRate || 0) / 100 / 12)), 0);

  return (
    <div>
      {/* Controls */}
      <div className={styles.calcInputRow}>
        <label>Extra cash per month:</label>
        <input
          className={styles.calcInput}
          type="number"
          min="0"
          value={extra}
          onChange={(e) => setExtra(parseFloat(e.target.value) || 0)}
        />
        <label style={{ marginLeft: '1rem' }}>Market return (%):</label>
        <input
          className={styles.calcInput}
          type="number"
          min="0"
          max="30"
          step="0.5"
          value={marketRate}
          onChange={(e) => setMarketRate(parseFloat(e.target.value) || 0)}
        />
      </div>

      {loading ? (
        <p className={styles.empty}>Loading debts…</p>
      ) : debts.length === 0 ? (
        <p className={styles.empty}>Add debts in the Debts tab first.</p>
      ) : (
        <>
          {/* Current monthly interest cost reminder */}
          <div className={styles.summaryBar} style={{ marginBottom: '1rem' }}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Current monthly interest cost</span>
              <span className={`${styles.summaryValue} ${styles.summaryValueRed}`}>{val(totalDebtInterest)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Min payments/mo</span>
              <span className={styles.summaryValue}>{val(totalMinMonthly)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Extra available</span>
              <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(extra)}</span>
            </div>
          </div>

          <div className={styles.calcGrid}>
            {/* Left: Pay Debt First (Avalanche) */}
            <div className={`${styles.calcPanel} ${styles.calcPanelRed}`}>
              <h3 className={`${styles.calcPanelTitle} ${styles.calcPanelTitleRed}`}>
                Pay Debt First (Avalanche)
              </h3>
              <div className={styles.calcRow}>
                <span className={styles.calcRowLabel}>Debt-free in</span>
                <span className={styles.calcRowValue}>{monthsToYrs(payoff.totalMonths)}</span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcRowLabel}>Total interest paid</span>
                <span className={`${styles.calcRowValue} ${styles.calcRowValueBad}`}>{val(payoff.totalInterestPaid)}</span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcRowLabel}>vs. minimums only</span>
                <span className={`${styles.calcRowValue} ${styles.calcRowValueGood}`}>Save {val(payoff.interestSaved)}</span>
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid #33244a', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Payoff order (highest APR first)
                </div>
                {payoff.order.map((d) => (
                  <div key={d.id} className={styles.calcRow}>
                    <span className={styles.calcRowLabel}>{d.name} ({(d.interestRate || 0).toFixed(1)}%)</span>
                    <span className={styles.calcRowValue}>{monthsToYrs(d.monthsToPayoff || payoff.totalMonths)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Invest Instead */}
            <div className={`${styles.calcPanel} ${styles.calcPanelGreen}`}>
              <h3 className={`${styles.calcPanelTitle} ${styles.calcPanelTitleGreen}`}>
                Invest Instead ({marketRate}% annual)
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>
                {val(extra)}/mo invested, compounded monthly
              </div>
              {HORIZONS.map((yrs) => {
                const fv = investmentValue(extra, marketRate, yrs);
                const debtInterestOverPeriod = totalDebtInterest * yrs * 12;
                const worthIt = fv > debtInterestOverPeriod;
                return (
                  <div key={yrs} className={styles.calcRow}>
                    <span className={styles.calcRowLabel}>{yrs} year{yrs > 1 ? 's' : ''}</span>
                    <span className={`${styles.calcRowValue} ${worthIt ? styles.calcRowValueGood : ''}`}>{val(fv)}</span>
                  </div>
                );
              })}

              <div style={{ marginTop: '1rem', borderTop: '1px solid #33244a', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Crossover: when investment growth &gt; monthly interest cost
                </div>
                {(() => {
                  // Find the year where annual investment return > annual debt interest cost
                  for (let y = 1; y <= 30; y++) {
                    const fv = investmentValue(extra, marketRate, y);
                    const annualReturn = fv * (marketRate / 100);
                    const annualInterest = totalDebtInterest * 12;
                    if (annualReturn >= annualInterest) {
                      return (
                        <div className={styles.calcRow}>
                          <span className={styles.calcRowLabel}>Crossover point</span>
                          <span className={`${styles.calcRowValue} ${styles.calcRowValueGood}`}>Year {y}</span>
                        </div>
                      );
                    }
                  }
                  return (
                    <div className={styles.calcRow}>
                      <span className={styles.calcRowLabel}>Crossover point</span>
                      <span className={styles.calcRowValue}>Not in 30 years</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#120d1e', border: '1px solid #33244a', borderRadius: '6px', fontSize: '0.82rem', color: '#888', lineHeight: 1.5 }}>
            <strong style={{ color: '#beaccf' }}>Recommendation:</strong>{' '}
            {totalDebtInterest * 12 > investmentValue(extra, marketRate, 1) * (marketRate / 100)
              ? `Your debt costs ${fmt(totalDebtInterest)}/mo in interest. Avalanche payoff likely beats investing at ${marketRate}% until debt is cleared.`
              : `Your debt interest rate is relatively low. Investing the extra ${fmt(extra)}/mo may outperform payoff long-term.`
            }
          </div>
        </>
      )}
    </div>
  );
}

export default PayoffCalculator;
