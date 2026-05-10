import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import styles from './FinancialPlanner.module.css';

const CATEGORIES = ['housing', 'debt_payment', 'subscription', 'insurance', 'utilities', 'other'];
const FREQUENCIES = ['monthly', 'annual', 'weekly'];

const EMPTY_FORM = {
  name: '', category: 'other', budgeted: '', actual: '', frequency: 'monthly',
  autopay: false, dueDay: '', loginUrl: '',
};

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const toMonthly = (amount, frequency) => {
  if (frequency === 'annual') return amount / 12;
  if (frequency === 'weekly') return amount * 52 / 12;
  return amount;
};

const diffColor = (diff) => {
  if (diff > 0) return '#81c784'; // under budget = good
  if (diff < 0) return '#e57373'; // over budget = bad
  return '#aaa';
};

const exportCSV = (bills) => {
  const rows = bills.map((b) => ({
    name: b.name,
    category: b.category,
    budgeted: b.budgeted ?? b.amount ?? 0,
    actual: b.actual ?? '',
    difference: b.actual != null ? ((b.budgeted ?? b.amount ?? 0) - b.actual) : '',
    frequency: b.frequency,
    autopay: b.autopay ? 'yes' : 'no',
    due_day: b.dueDay || '',
    login_url: b.loginUrl || '',
  }));
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'budget.csv'; a.click();
  URL.revokeObjectURL(url);
};

function BillsManager({ revealed }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'userBills'));
    setBills(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalBudgeted = bills.reduce((s, b) => s + toMonthly(b.budgeted ?? b.amount ?? 0, b.frequency), 0);
  const totalActual = bills.reduce((s, b) => {
    const actual = b.actual ?? b.budgeted ?? b.amount ?? 0;
    return s + toMonthly(actual, b.frequency);
  }, 0);
  const totalDiff = totalBudgeted - totalActual;

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = bills.filter((b) => b.category === cat);
    return acc;
  }, {});

  const handleChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm((f) => ({ ...f, [name]: t === 'checkbox' ? checked : value }));
  };

  const startEdit = (bill) => {
    setForm({
      name: bill.name || '',
      category: bill.category || 'other',
      budgeted: bill.budgeted ?? bill.amount ?? '',
      actual: bill.actual ?? '',
      frequency: bill.frequency || 'monthly',
      autopay: bill.autopay || false,
      dueDay: bill.dueDay ?? '',
      loginUrl: bill.loginUrl || '',
    });
    setEditingId(bill.id);
    setShowForm(true);
  };

  const cancelForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const budgeted = parseFloat(form.budgeted) || 0;
    const data = {
      name: form.name.trim(),
      category: form.category,
      budgeted,
      amount: budgeted,
      actual: form.actual !== '' ? parseFloat(form.actual) : null,
      frequency: form.frequency,
      autopay: form.autopay,
      dueDay: form.dueDay ? parseInt(form.dueDay, 10) : null,
      loginUrl: form.loginUrl.trim(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'userBills', editingId), data);
      } else {
        await addDoc(collection(db, 'userBills'), { ...data, createdAt: serverTimestamp() });
      }
      cancelForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill?')) return;
    await deleteDoc(doc(db, 'userBills', id));
    await load();
  };

  const val = (n) => (revealed ? fmt(n) : <span className={styles.masked}>••••</span>);

  return (
    <>
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total budgeted / mo</span>
          <span className={styles.summaryValue}>{val(totalBudgeted)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total actual / mo</span>
          <span className={`${styles.summaryValue} ${totalActual > totalBudgeted ? styles.summaryValueRed : ''}`}>{val(totalActual)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Difference</span>
          <span className={styles.summaryValue} style={{ color: diffColor(totalDiff) }}>
            {revealed ? (totalDiff >= 0 ? '+' : '') + fmt(totalDiff) : <span className={styles.masked}>••••</span>}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Line items</span>
          <span className={styles.summaryValue}>{bills.length}</span>
        </div>
      </div>

      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>Monthly Budget</h3>
          <div className={styles.actionGroup}>
            {bills.length > 0 && (
              <button className={styles.btnSecondary} onClick={() => exportCSV(bills)}>Export CSV</button>
            )}
            <button className={styles.btnPrimary} onClick={() => { cancelForm(); setShowForm(true); }}>+ Add Item</button>
          </div>
        </div>

        {showForm && (
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input className={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Rent" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 140 }}>
              <label>Category</label>
              <select className={styles.select} name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 110 }}>
              <label>Budgeted ($)</label>
              <input className={styles.input} name="budgeted" value={form.budgeted} onChange={handleChange} placeholder="1200" type="number" min="0" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 110 }}>
              <label>Actual ($)</label>
              <input className={styles.input} name="actual" value={form.actual} onChange={handleChange} placeholder="leave blank if fixed" type="number" min="0" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 110 }}>
              <label>Frequency</label>
              <select className={styles.select} name="frequency" value={form.frequency} onChange={handleChange}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 70 }}>
              <label>Due day</label>
              <input className={styles.input} name="dueDay" value={form.dueDay} onChange={handleChange} placeholder="1" type="number" min="1" max="31" />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 80 }}>
              <label>Autopay</label>
              <input className={styles.checkbox} type="checkbox" name="autopay" checked={form.autopay} onChange={handleChange} />
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
        ) : bills.length === 0 ? (
          <p className={styles.empty}>No budget items yet. Go to Overview and click "Load My Spreadsheet Data" first.</p>
        ) : (
          CATEGORIES.map((cat) => {
            const catBills = byCategory[cat];
            if (!catBills.length) return null;
            const catBudgeted = catBills.reduce((s, b) => s + toMonthly(b.budgeted ?? b.amount ?? 0, b.frequency), 0);
            const catActual = catBills.reduce((s, b) => s + toMonthly(b.actual ?? b.budgeted ?? b.amount ?? 0, b.frequency), 0);
            const catDiff = catBudgeted - catActual;
            return (
              <div key={cat} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className={styles.badge} style={{ fontSize: '0.82rem', padding: '0.2rem 0.7rem' }}>
                    {cat.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#888' }}>
                    {revealed ? (
                      <>
                        {fmt(catActual)} actual / {fmt(catBudgeted)} budgeted
                        <span style={{ marginLeft: '0.5rem', color: diffColor(catDiff) }}>
                          ({catDiff >= 0 ? '+' : ''}{fmt(catDiff)})
                        </span>
                      </>
                    ) : <span className={styles.masked}>••••</span>}
                  </span>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Budgeted</th>
                      <th>Actual</th>
                      <th>Difference</th>
                      <th>Freq.</th>
                      <th>Due</th>
                      <th>Autopay</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {catBills.map((bill) => {
                      const budgeted = bill.budgeted ?? bill.amount ?? 0;
                      const actual = bill.actual ?? budgeted;
                      const diff = budgeted - actual;
                      return (
                        <tr key={bill.id}>
                          <td>
                            {bill.name}
                            {bill.loginUrl && (
                              <a href={bill.loginUrl} target="_blank" rel="noopener noreferrer" className={styles.btnLink} title="Open account"> 🔗</a>
                            )}
                          </td>
                          <td>{val(budgeted)}</td>
                          <td style={{ color: actual > budgeted ? '#e57373' : 'inherit' }}>{val(actual)}</td>
                          <td style={{ color: diffColor(diff) }}>
                            {revealed ? (diff >= 0 ? '+' : '') + fmt(diff) : <span className={styles.masked}>••••</span>}
                          </td>
                          <td>{bill.frequency}</td>
                          <td>{bill.dueDay ? `Day ${bill.dueDay}` : '—'}</td>
                          <td>{bill.autopay ? '✓' : '—'}</td>
                          <td>
                            <div className={styles.actionGroup}>
                              <button className={styles.btnSecondary} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }} onClick={() => startEdit(bill)}>Edit</button>
                              <button className={styles.btnDanger} onClick={() => handleDelete(bill.id)}>✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default BillsManager;
