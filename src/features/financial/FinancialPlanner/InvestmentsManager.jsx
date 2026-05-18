import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import styles from '@/features/financial/FinancialPlanner/FinancialPlanner.module.css';

const TYPES = ['savings', 'brokerage', 'retirement', 'ira', 'other'];
const OWNERS = ['Abi', 'Tiffany', 'Joint'];

const EMPTY_FORM = {
  name: '', type: 'brokerage', accountSuffix: '', balance: '', monthlyContribution: '',
  expectedReturn: '8', owner: 'Joint', loginUrl: '',
};

const fmt = (n, digits = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(n);

// FV with starting balance + monthly contributions
const futureValue = (balance, monthlyContrib, annualRate, years) => {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return balance + monthlyContrib * n;
  const balanceFV = balance * Math.pow(1 + r, n);
  const contribFV = monthlyContrib > 0 ? monthlyContrib * ((Math.pow(1 + r, n) - 1) / r) : 0;
  return balanceFV + contribFV;
};

const exportCSV = (investments) => {
  const rows = investments.map((inv) => ({
    name: inv.name,
    type: inv.type,
    suffix: inv.accountSuffix || '',
    owner: inv.owner,
    balance: inv.balance,
    monthly_contribution: inv.monthlyContribution,
    expected_return_pct: inv.expectedReturn,
    projected_1yr: futureValue(inv.balance || 0, inv.monthlyContribution || 0, inv.expectedReturn || 0, 1).toFixed(0),
    projected_5yr: futureValue(inv.balance || 0, inv.monthlyContribution || 0, inv.expectedReturn || 0, 5).toFixed(0),
  }));
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'investments.csv'; a.click();
  URL.revokeObjectURL(url);
};

function InvestmentsManager({ revealed }) {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentAge, setCurrentAge] = useState(38);
  const retirementAge = 67;
  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'userInvestments'));
    setInvestments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalBalance = investments.reduce((s, i) => s + (i.balance || 0), 0);
  const totalMonthly = investments.reduce((s, i) => s + (i.monthlyContribution || 0), 0);
  const total1yr = investments.reduce((s, i) => s + futureValue(i.balance || 0, i.monthlyContribution || 0, i.expectedReturn || 0, 1), 0);
  const total5yr = investments.reduce((s, i) => s + futureValue(i.balance || 0, i.monthlyContribution || 0, i.expectedReturn || 0, 5), 0);
  const totalAt67 = investments.reduce((s, i) => s + futureValue(i.balance || 0, i.monthlyContribution || 0, i.expectedReturn || 0, yearsToRetirement), 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const startEdit = (inv) => {
    setForm({
      name: inv.name || '',
      type: inv.type || 'brokerage',
      accountSuffix: inv.accountSuffix || '',
      balance: inv.balance ?? '',
      monthlyContribution: inv.monthlyContribution ?? '',
      expectedReturn: inv.expectedReturn ?? '8',
      owner: inv.owner || 'Joint',
      loginUrl: inv.loginUrl || '',
    });
    setEditingId(inv.id);
    setShowForm(true);
  };

  const cancelForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = {
      name: form.name.trim(),
      type: form.type,
      accountSuffix: form.accountSuffix.trim(),
      balance: parseFloat(form.balance) || 0,
      monthlyContribution: parseFloat(form.monthlyContribution) || 0,
      expectedReturn: parseFloat(form.expectedReturn) || 0,
      owner: form.owner,
      loginUrl: form.loginUrl.trim(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'userInvestments', editingId), data);
      } else {
        await addDoc(collection(db, 'userInvestments'), { ...data, createdAt: serverTimestamp() });
      }
      cancelForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account?')) return;
    await deleteDoc(doc(db, 'userInvestments', id));
    await load();
  };

  const val = (n, d = 0) => (revealed ? fmt(n, d) : <span className={styles.masked}>••••</span>);

  return (
    <>
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total balance</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(totalBalance)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Investing / mo</span>
          <span className={styles.summaryValue}>{val(totalMonthly)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Projected 1yr</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(total1yr)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Projected 5yr</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(total5yr)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>At age {retirementAge} ({yearsToRetirement}yrs)</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{val(totalAt67)}</span>
        </div>
        <div className={styles.summaryItem} style={{ borderLeft: '1px solid #33244a', paddingLeft: '1rem' }}>
          <label style={{ fontSize: '0.72rem', color: '#888', display: 'block', marginBottom: '0.2rem' }}>Your age</label>
          <input
            type="number"
            value={currentAge}
            onChange={(e) => setCurrentAge(parseInt(e.target.value) || 0)}
            style={{ width: 60, padding: '0.2rem 0.4rem', background: '#0d0a16', border: '1px solid #33244a', color: '#e0d8f0', borderRadius: 4, fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>Accounts</h3>
          <div className={styles.actionGroup}>
            {investments.length > 0 && (
              <button className={styles.btnSecondary} onClick={() => exportCSV(investments)}>Export CSV</button>
            )}
            <button className={styles.btnPrimary} onClick={() => { cancelForm(); setShowForm(true); }}>+ Add Account</button>
          </div>
        </div>

        {showForm && (
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input className={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Betterment IRA" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 120 }}>
              <label>Type</label>
              <select className={styles.select} name="type" value={form.type} onChange={handleChange}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 80 }}>
              <label>Acct suffix</label>
              <input className={styles.input} name="accountSuffix" value={form.accountSuffix} onChange={handleChange} placeholder="2044" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 110 }}>
              <label>Balance ($)</label>
              <input className={styles.input} name="balance" value={form.balance} onChange={handleChange} type="number" min="0" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 120 }}>
              <label>Monthly contrib.</label>
              <input className={styles.input} name="monthlyContribution" value={form.monthlyContribution} onChange={handleChange} type="number" min="0" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 90 }}>
              <label>Return (%)</label>
              <input className={styles.input} name="expectedReturn" value={form.expectedReturn} onChange={handleChange} type="number" min="0" step="0.25" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 100 }}>
              <label>Owner</label>
              <select className={styles.select} name="owner" value={form.owner} onChange={handleChange}>
                {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Login URL</label>
              <input className={styles.input} name="loginUrl" value={form.loginUrl} onChange={handleChange} placeholder="https://..." />
            </div>
            <div className={styles.formGroup} style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'flex-end', minWidth: 'auto' }}>
              <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className={styles.btnSecondary} onClick={cancelForm}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : investments.length === 0 ? (
          <p className={styles.empty}>No accounts yet. Go to Overview and click "Load My Spreadsheet Data" first.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Balance</th>
                <th>Monthly</th>
                <th>Rate</th>
                <th>1 yr</th>
                <th>5 yr</th>
                <th>At {retirementAge}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => {
                const bal = inv.balance || 0;
                const pmt = inv.monthlyContribution || 0;
                const rate = inv.expectedReturn || 0;
                const fv1 = futureValue(bal, pmt, rate, 1);
                const fv5 = futureValue(bal, pmt, rate, 5);
                const fv67 = futureValue(bal, pmt, rate, yearsToRetirement);
                return (
                  <tr key={inv.id}>
                    <td>
                      {inv.name}
                      {inv.accountSuffix && <span style={{ color: '#666', fontSize: '0.78rem' }}> ···{inv.accountSuffix}</span>}
                      {inv.loginUrl && (
                        <a href={inv.loginUrl} target="_blank" rel="noopener noreferrer" className={styles.btnLink} title="Open account"> 🔗</a>
                      )}
                    </td>
                    <td><span className={styles.badge}>{inv.type}</span></td>
                    <td><span style={{ fontSize: '0.82rem', color: '#aaa' }}>{inv.owner}</span></td>
                    <td>{val(bal)}</td>
                    <td>{val(pmt)}</td>
                    <td>{rate}%</td>
                    <td style={{ color: '#81c784' }}>{val(fv1)}</td>
                    <td style={{ color: '#81c784' }}>{val(fv5)}</td>
                    <td style={{ color: '#81c784', fontWeight: 600 }}>{val(fv67)}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button className={styles.btnSecondary} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }} onClick={() => startEdit(inv)}>Edit</button>
                        <button className={styles.btnDanger} onClick={() => handleDelete(inv.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default InvestmentsManager;
