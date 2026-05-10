import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import styles from './FinancialPlanner.module.css';

const DEBT_TYPES = ['credit_card', 'loan', 'mortgage', 'other'];

const EMPTY_FORM = {
  name: '', type: 'credit_card', balance: '', interestRate: '', minimumPayment: '', loginUrl: '',
};

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const monthlyInterest = (balance, apr) => balance * (apr / 100 / 12);

const exportCSV = (debts) => {
  const rows = debts.map((d) => ({
    name: d.name,
    type: d.type,
    balance: d.balance,
    apr: d.interestRate,
    minimum_payment: d.minimumPayment,
    monthly_interest: monthlyInterest(d.balance, d.interestRate).toFixed(2),
    login_url: d.loginUrl || '',
  }));
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'debts.csv'; a.click();
  URL.revokeObjectURL(url);
};

function DebtManager({ revealed }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'userDebts'));
    setDebts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalInterest = debts.reduce((sum, d) => sum + monthlyInterest(d.balance || 0, d.interestRate || 0), 0);
  const totalBalance = debts.reduce((sum, d) => sum + (d.balance || 0), 0);
  const totalMin = debts.reduce((sum, d) => sum + (d.minimumPayment || 0), 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const startEdit = (debt) => {
    setForm({
      name: debt.name || '',
      type: debt.type || 'credit_card',
      balance: debt.balance ?? '',
      interestRate: debt.interestRate ?? '',
      minimumPayment: debt.minimumPayment ?? '',
      loginUrl: debt.loginUrl || '',
    });
    setEditingId(debt.id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = {
      name: form.name.trim(),
      type: form.type,
      balance: parseFloat(form.balance) || 0,
      interestRate: parseFloat(form.interestRate) || 0,
      minimumPayment: parseFloat(form.minimumPayment) || 0,
      loginUrl: form.loginUrl.trim(),
      updatedAt: serverTimestamp(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'userDebts', editingId), data);
      } else {
        await addDoc(collection(db, 'userDebts'), { ...data, createdAt: serverTimestamp() });
      }
      cancelForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this debt?')) return;
    await deleteDoc(doc(db, 'userDebts', id));
    await load();
  };

  const val = (n) => (revealed ? fmt(n) : <span className={styles.masked}>••••</span>);
  const pct = (n) => `${(+n || 0).toFixed(2)}%`;

  return (
    <>
      {/* Summary */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total balance</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueRed}`}>{val(totalBalance)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Monthly interest</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueRed}`}>{val(totalInterest)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Min payments/mo</span>
          <span className={styles.summaryValue}>{val(totalMin)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Accounts</span>
          <span className={styles.summaryValue}>{debts.length}</span>
        </div>
      </div>

      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>Debts</h3>
          <div className={styles.actionGroup}>
            {debts.length > 0 && (
              <button className={styles.btnSecondary} onClick={() => exportCSV(debts)}>Export CSV</button>
            )}
            <button className={styles.btnPrimary} onClick={() => { cancelForm(); setShowForm(true); }}>+ Add Debt</button>
          </div>
        </div>

        {showForm && (
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nickname</label>
              <input className={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Chase Sapphire" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 140 }}>
              <label>Type</label>
              <select className={styles.select} name="type" value={form.type} onChange={handleChange}>
                {DEBT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 110 }}>
              <label>Balance ($)</label>
              <input className={styles.input} name="balance" value={form.balance} onChange={handleChange} placeholder="3000" type="number" min="0" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 100 }}>
              <label>APR (%)</label>
              <input className={styles.input} name="interestRate" value={form.interestRate} onChange={handleChange} placeholder="22" type="number" min="0" step="0.01" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 110 }}>
              <label>Min payment</label>
              <input className={styles.input} name="minimumPayment" value={form.minimumPayment} onChange={handleChange} placeholder="35" type="number" min="0" />
            </div>
            <div className={styles.formGroup}>
              <label>Login URL</label>
              <input className={styles.input} name="loginUrl" value={form.loginUrl} onChange={handleChange} placeholder="https://chase.com" />
            </div>
            <div className={styles.formGroup} style={{ justifyContent: 'flex-end', flexDirection: 'row', gap: '0.5rem', minWidth: 'auto' }}>
              <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className={styles.btnSecondary} onClick={cancelForm}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : debts.length === 0 ? (
          <p className={styles.empty}>No debts yet — click <strong>+ Add Debt</strong> to add a credit card, loan, or mortgage. Each entry tracks balance, APR, minimum payment, and gives you a one-click login link.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Balance</th>
                <th>APR</th>
                <th>Min/mo</th>
                <th>Interest/mo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {debts
                .slice()
                .sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))
                .map((debt) => (
                  <tr key={debt.id}>
                    <td>
                      {debt.name}
                      {debt.loginUrl && (
                        <a
                          href={debt.loginUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.btnLink}
                          title="Open account"
                        >
                          {' '}🔗
                        </a>
                      )}
                    </td>
                    <td><span className={styles.badge}>{(debt.type || '').replace('_', ' ')}</span></td>
                    <td>{val(debt.balance || 0)}</td>
                    <td>{pct(debt.interestRate)}</td>
                    <td>{val(debt.minimumPayment || 0)}</td>
                    <td style={{ color: '#e57373' }}>{val(monthlyInterest(debt.balance || 0, debt.interestRate || 0))}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button className={styles.btnSecondary} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }} onClick={() => startEdit(debt)}>Edit</button>
                        <button className={styles.btnDanger} onClick={() => handleDelete(debt.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default DebtManager;
