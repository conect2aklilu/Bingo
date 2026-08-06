import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { inputStyle, buttonStyle } from './Login';

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('bank_transfer');
  const [depositRef, setDepositRef] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank_transfer');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const res = await api.get('/wallet/me');
    setBalance(res.data.user.balance);
    setTransactions(res.data.transactions);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitDeposit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/wallet/deposit-request', { amount: depositAmount, method: depositMethod, reference: depositRef });
      setMessage('Deposit request submitted. An admin will verify and credit your wallet.');
      setDepositAmount('');
      setDepositRef('');
      load();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Deposit request failed');
    }
  }

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/wallet/withdraw-request', { amount: withdrawAmount, method: withdrawMethod, account_details: withdrawAccount });
      setMessage('Withdrawal request submitted. Funds are reserved pending admin approval.');
      setWithdrawAmount('');
      setWithdrawAccount('');
      load();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Withdrawal request failed');
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '30px auto', padding: 16 }}>
      <Link to="/lobby">← Back to Lobby</Link>
      <h2>💰 Wallet — Balance: {Number(balance).toFixed(2)} Birr</h2>
      {message && <div style={{ color: '#fbbf24', margin: '10px 0' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <form onSubmit={submitDeposit} style={{ background: '#1a2432', padding: 16, borderRadius: 10 }}>
          <h3>Deposit</h3>
          <p style={{ fontSize: 13, color: '#9fb0c3' }}>
            Send money via bank transfer or mobile money to the platform's account, then submit the details below for admin verification.
          </p>
          <input placeholder="Amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={inputStyle} />
          <select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} style={inputStyle}>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="telebirr">Telebirr</option>
            <option value="cbe_birr">CBE Birr</option>
          </select>
          <input placeholder="Transaction reference" value={depositRef} onChange={(e) => setDepositRef(e.target.value)} style={inputStyle} />
          <button type="submit" style={buttonStyle}>Submit Deposit Request</button>
        </form>

        <form onSubmit={submitWithdraw} style={{ background: '#1a2432', padding: 16, borderRadius: 10 }}>
          <h3>Withdraw</h3>
          <p style={{ fontSize: 13, color: '#9fb0c3' }}>
            Funds are held in your wallet until an admin sends the payout and approves the request.
          </p>
          <input placeholder="Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} style={inputStyle} />
          <select value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)} style={inputStyle}>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="telebirr">Telebirr</option>
            <option value="cbe_birr">CBE Birr</option>
          </select>
          <input placeholder="Account details" value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} style={inputStyle} />
          <button type="submit" style={buttonStyle}>Submit Withdrawal Request</button>
        </form>
      </div>

      <h3 style={{ marginTop: 24 }}>History</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#9fb0c3' }}>
            <th>Type</th><th>Amount</th><th>Status</th><th>Method</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} style={{ borderTop: '1px solid #29384a' }}>
              <td>{t.type}</td>
              <td>{Number(t.amount).toFixed(2)}</td>
              <td>{t.status}</td>
              <td>{t.method || '-'}</td>
              <td>{new Date(t.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
