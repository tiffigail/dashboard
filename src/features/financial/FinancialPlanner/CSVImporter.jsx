import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, where,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import styles from '@/features/financial/FinancialPlanner/FinancialPlanner.module.css';

// ── Column mappings: CSV header → Firestore field ─────────────────────────────

const DEBT_MAP = {
  'card name': 'name', 'name': 'name', 'account': 'name',
  'balance': 'balance',
  'apr %': 'interestRate', 'apr': 'interestRate', 'interest rate': 'interestRate',
  'min payment': 'minimumPayment', 'minimum payment': 'minimumPayment', 'min': 'minimumPayment',
  'login url': 'loginUrl', 'url': 'loginUrl', 'website': 'loginUrl',
  'notes': 'notes', 'priority status': 'notes',
};

const BILL_MAP = {
  'name': 'name', 'category': 'category',
  'budgeted': 'budgeted', 'budget': 'budgeted', 'budgeted amount': 'budgeted',
  'actual': 'actual', 'actual amount': 'actual',
  'frequency': 'frequency',
  'autopay': 'autopay',
  'due day': 'dueDay', 'due': 'dueDay',
  'login url': 'loginUrl', 'url': 'loginUrl',
};

const INVESTMENT_MAP = {
  'account name': 'name', 'name': 'name', 'account': 'name',
  'account #': 'accountSuffix', 'account#': 'accountSuffix', 'suffix': 'accountSuffix',
  'current balance': 'balance', 'balance': 'balance',
  'monthly contribution': 'monthlyContribution', 'contribution': 'monthlyContribution', 'monthly contrib': 'monthlyContribution',
  'expected return (annual %)': 'expectedReturn', 'expected return': 'expectedReturn', 'return %': 'expectedReturn', 'rate': 'expectedReturn',
  'owner': 'owner',
  'login url': 'loginUrl', 'url': 'loginUrl',
};

const SECTIONS = [
  { id: 'debts', label: 'Debts', collection: 'userDebts', map: DEBT_MAP, keyField: 'name' },
  { id: 'budget', label: 'Budget / Bills', collection: 'userBills', map: BILL_MAP, keyField: 'name' },
  { id: 'investments', label: 'Investments', collection: 'userInvestments', map: INVESTMENT_MAP, keyField: 'name' },
];

// Strip currency formatting from values
const cleanNumber = (v) => {
  if (v == null || v === '') return null;
  const s = String(v).replace(/[$,%]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const mapRow = (raw, fieldMap) => {
  const result = {};
  Object.entries(raw).forEach(([header, value]) => {
    const key = header.toLowerCase().trim();
    const field = fieldMap[key];
    if (!field || value == null || String(value).trim() === '') return;
    const strVal = String(value).trim();

    if (['balance', 'interestRate', 'minimumPayment', 'budgeted', 'actual', 'monthlyContribution', 'expectedReturn', 'dueDay'].includes(field)) {
      const n = cleanNumber(strVal);
      if (n !== null) result[field] = n;
    } else if (field === 'autopay') {
      result[field] = /yes|true|1/i.test(strVal);
    } else {
      result[field] = strVal;
    }
  });
  return result;
};

function CSVImporter() {
  const [section, setSection] = useState('debts');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [replaceAll, setReplaceAll] = useState(false);
  const [status, setStatus] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const sectionDef = SECTIONS.find((s) => s.id === section);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    setHeaders([]);
    setStatus('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const mapped = data
          .map((row) => mapRow(row, sectionDef.map))
          .filter((row) => row[sectionDef.keyField]);
        setHeaders(meta.fields || []);
        setRows(mapped);
        if (mapped.length === 0) {
          setStatus('No recognisable rows found. Check that your CSV has a header row and matches the expected columns.');
        }
      },
      error: (err) => setStatus('Parse error: ' + err.message),
    });
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setStatus('');
    try {
      const col = collection(db, sectionDef.collection);

      if (replaceAll) {
        const snap = await getDocs(col);
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, sectionDef.collection, d.id))));
        await Promise.all(rows.map((row) => addDoc(col, { ...row, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })));
        setStatus(`Replaced all data. ${rows.length} records imported.`);
      } else {
        // Upsert by name: update if exists, add if not
        const snap = await getDocs(col);
        const existing = new Map(snap.docs.map((d) => [d.data()[sectionDef.keyField]?.toLowerCase(), d.id]));
        let updated = 0, added = 0;
        await Promise.all(rows.map(async (row) => {
          const key = (row[sectionDef.keyField] || '').toLowerCase();
          if (existing.has(key)) {
            await updateDoc(doc(db, sectionDef.collection, existing.get(key)), { ...row, updatedAt: serverTimestamp() });
            updated++;
          } else {
            await addDoc(col, { ...row, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            added++;
          }
        }));
        setStatus(`Done. ${added} added, ${updated} updated.`);
      }

      // Reset file input
      if (fileRef.current) fileRef.current.value = '';
      setRows([]);
      setHeaders([]);
      setFileName('');
    } catch (e) {
      setStatus('Import failed: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Section picker */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Import CSV</h3>
        <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 1rem' }}>
          Upload a CSV exported from Excel. Column headers are matched automatically — they don't need to be exact. On re-import, existing records are matched by name and updated (not duplicated).
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={s.id === section ? styles.btnPrimary : styles.btnSecondary}
              onClick={() => { setSection(s.id); setRows([]); setHeaders([]); setFileName(''); setStatus(''); }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Expected columns hint */}
        <div style={{ background: '#120d1e', border: '1px solid #33244a', borderRadius: '5px', padding: '0.6rem 0.75rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#888' }}>
          <strong style={{ color: '#beaccf' }}>Recognised columns for {sectionDef.label}:</strong>{' '}
          {Object.keys(sectionDef.map).filter((_, i) => i % 2 === 0).join(', ')}…
        </div>

        {/* File input */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            style={{ color: '#beaccf', fontSize: '0.85rem' }}
          />
          {fileName && <span style={{ fontSize: '0.8rem', color: '#888' }}>{fileName}</span>}
        </div>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Preview — {rows.length} rows recognised</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {Object.keys(rows[0]).map((k) => <th key={k}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j}>{String(v ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && (
              <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                …and {rows.length - 10} more rows
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', color: '#beaccf', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={replaceAll}
                onChange={(e) => setReplaceAll(e.target.checked)}
                className={styles.checkbox}
              />
              Replace all existing {sectionDef.label} data
            </label>
            <button className={styles.btnPrimary} onClick={handleImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${rows.length} rows into ${sectionDef.label}`}
            </button>
          </div>
        </div>
      )}

      {status && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          background: status.startsWith('Import failed') || status.startsWith('Parse') ? '#3a1a1a' : '#1a3a1a',
          border: `1px solid ${status.startsWith('Import failed') || status.startsWith('Parse') ? '#7a3a3a' : '#3a6b3a'}`,
          color: status.startsWith('Import failed') || status.startsWith('Parse') ? '#e57373' : '#81c784',
          fontSize: '0.9rem',
        }}>
          {status}
        </div>
      )}

      {/* How to export from Excel hint */}
      <div style={{ background: '#120d1e', border: '1px solid #33244a', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#666' }}>
        <strong style={{ color: '#888' }}>Exporting from Excel:</strong> Open the tab you want → File → Save As → CSV (Comma delimited). Do one tab at a time, then import each one here.
      </div>
    </div>
  );
}

export default CSVImporter;
