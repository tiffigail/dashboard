import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/features/financial/FinancialPlanner/FinancialPlanner.module.css';
import OverviewPanel from '@/features/financial/FinancialPlanner/OverviewPanel';
import DebtManager from '@/features/financial/FinancialPlanner/DebtManager';
import BillsManager from '@/features/financial/FinancialPlanner/BillsManager';
import InvestmentsManager from '@/features/financial/FinancialPlanner/InvestmentsManager';
import PayoffCalculator from '@/features/financial/FinancialPlanner/PayoffCalculator';
import CSVImporter from '@/features/financial/FinancialPlanner/CSVImporter';

const TABS = [
  { id: 'Overview',     label: 'Overview' },
  { id: 'Debts',        label: 'Debts' },
  { id: 'Budget',       label: 'Budget' },
  { id: 'Investments',  label: 'Investments' },
  { id: 'Calculator',   label: 'Pay vs. Invest' },
  { id: 'Import',       label: 'Import CSV' },
];

function FinancialPlanner() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [revealed, setRevealed] = useState(false);
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        setBlurred(true);
        setRevealed(false);
      } else {
        setBlurred(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const toggleReveal = useCallback(() => setRevealed((r) => !r), []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Financial Planner</h2>
          <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.2rem' }}>
            Amounts hidden by default · Screen blurs on tab switch
          </div>
        </div>
        <button className={styles.revealBtn} onClick={toggleReveal}>
          {revealed ? '🙈 Hide amounts' : '👁 Reveal amounts'}
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`${styles.tabPanel} ${blurred ? styles.blurred : ''}`}>
        {activeTab === 'Overview'    && <OverviewPanel revealed={revealed} />}
        {activeTab === 'Debts'       && <DebtManager revealed={revealed} />}
        {activeTab === 'Budget'      && <BillsManager revealed={revealed} />}
        {activeTab === 'Investments' && <InvestmentsManager revealed={revealed} />}
        {activeTab === 'Calculator'  && <PayoffCalculator revealed={revealed} />}
        {activeTab === 'Import'      && <CSVImporter />}
      </div>
    </div>
  );
}

export default FinancialPlanner;
