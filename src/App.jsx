import React, { useState, useEffect } from 'react';
import { db } from './FirebaseConfig';
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    deleteDoc
} from 'firebase/firestore';

const TOTAL_VOTERS = 29; // Hardcoded total body size

const STATUS_OPTIONS = [
    'Pre-Comm',
    'Killed Pre-Comm',
    'Killed In Comm',
    'Passed Comm',
    'Passed House',
];

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [bills, setBills] = useState([]);

    // Filters
    const [filterPhase, setFilterPhase] = useState('All');
    const [filterParty, setFilterParty] = useState('All');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBill, setNewBill] = useState({
        id: '',
        title: '',
        author: '',
        isNavyBlue: true,
        isAgendaAligned: true,
        isSupermajority: false,
        status: 'Pre-Comm',
        votesYes: 0,
        votesUndecided: 0,
        votesNo: 0
    });

    useEffect(() => {
        const savedAuth = localStorage.getItem('navyBlueAuth');
        if (savedAuth === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;

        const billsRef = collection(db, 'bills');
        const unsubscribe = onSnapshot(billsRef, (snapshot) => {
            const billsData = snapshot.docs.map(doc => ({
                _firestoreId: doc.id,
                ...doc.data()
            }));
            setBills(billsData);
        });

        return () => unsubscribe();
    }, [isAuthenticated]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'NAVY2026') {
            setIsAuthenticated(true);
            localStorage.setItem('navyBlueAuth', 'true');
        } else {
            alert('Incorrect Password');
        }
    };

    const calculateScore = () => {
        let score = 0;
        bills.forEach(bill => {
            if (bill.status === 'Passed House') {
                if (bill.isNavyBlue) score += 10;
                if (bill.isAgendaAligned) score += 2;
                if (!bill.isNavyBlue && !bill.isAgendaAligned) score -= 5;
            }
        });
        return score;
    };

    const handleUpdateBill = async (firestoreId, field, value) => {
        try {
            const billRef = doc(db, 'bills', firestoreId);
            await updateDoc(billRef, {
                [field]: value
            });
        } catch (error) {
            console.error("Error updating document: ", error);
            alert("Error updating document. Check console.");
        }
    };

    const handleAddBill = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'bills'), {
                ...newBill,
                votesYes: Number(newBill.votesYes) || 0,
                votesUndecided: Number(newBill.votesUndecided) || 0,
                votesNo: Number(newBill.votesNo) || 0,
            });
            setIsModalOpen(false);
            // Reset form
            setNewBill({
                id: '', title: '', author: '', isNavyBlue: true, isAgendaAligned: true,
                isSupermajority: false, status: 'Pre-Comm', votesYes: 0, votesUndecided: 0, votesNo: 0
            });
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error adding bill. Check rules.");
        }
    };

    const handleDeleteBill = async (firestoreId) => {
        if (window.confirm("Are you sure you want to delete this bill?")) {
            try {
                await deleteDoc(doc(db, 'bills', firestoreId));
            } catch (error) {
                console.error("Error deleting document: ", error);
            }
        }
    }

    const adjustVote = (firestoreId, currentVal, field, delta) => {
        const newVal = Math.max(0, currentVal + delta);
        handleUpdateBill(firestoreId, field, newVal);
    };

    if (!isAuthenticated) {
        return (
            <div className="password-gate">
                <div className="password-card">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <h2>Navy Blue War Room</h2>
                    <p style={{ color: 'var(--slate)' }}>Authorized Personnel Only</p>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            className="password-input"
                            placeholder="Enter Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="btn-primary">Acess Dashboard</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="header">
                <div>
                    <h1>Navy Blue War Room</h1>
                    <div style={{ color: 'var(--slate)' }}>Real-time Legislative Dashboard</div>
                </div>
                <div className="score-board">
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Projected Score</div>
                    <div className="score-value">{calculateScore() > 0 ? `+${calculateScore()}` : calculateScore()}</div>
                </div>
            </header>

            <div className="dashboard-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="add-bill-btn" onClick={() => setIsModalOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add New Bill
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--slate)' }}>Party:</label>
                        <select
                            className="input-control"
                            style={{ width: 'auto', padding: '6px 10px' }}
                            value={filterParty}
                            onChange={e => setFilterParty(e.target.value)}
                        >
                            <option value="All">All Parties</option>
                            <option value="Navy Blue">Navy Blue</option>
                            <option value="Royal Blue">Royal Blue</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--slate)' }}>Phase:</label>
                        <select
                            className="input-control"
                            style={{ width: 'auto', padding: '6px 10px' }}
                            value={filterPhase}
                            onChange={e => setFilterPhase(e.target.value)}
                        >
                            <option value="All">All Phases</option>
                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bills-grid">
                {bills
                    .filter(bill => {
                        if (filterPhase !== 'All' && bill.status !== filterPhase) return false;
                        if (filterParty === 'Navy Blue' && !bill.isNavyBlue) return false;
                        if (filterParty === 'Royal Blue' && bill.isNavyBlue) return false;
                        return true;
                    })
                    .map(bill => {
                        const isVetoWarning = !bill.isNavyBlue && !bill.isAgendaAligned && bill.status === 'Passed Comm';
                        const totalVotesCast = bill.votesYes + bill.votesNo + bill.votesUndecided;
                        const requiredFraction = bill.isSupermajority ? 0.66 : 0.51;
                        const requiredVotes = Math.ceil(TOTAL_VOTERS * requiredFraction);
                        const hasMajority = bill.votesYes >= requiredVotes;

                        return (
                            <div key={bill._firestoreId} className={`bill-card ${isVetoWarning ? 'veto-warning' : ''}`}>
                                {isVetoWarning && (
                                    <div className="veto-banner">
                                        🚨 STOP THIS BILL 🚨
                                    </div>
                                )}

                                <div className="card-header">
                                    <h3 style={{ margin: '0' }}>{bill.id}</h3>
                                    <button
                                        onClick={() => handleDeleteBill(bill._firestoreId)}
                                        style={{ background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', padding: '0' }}
                                        title="Delete Bill"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>

                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--white)', marginBottom: '5px' }}>{bill.title}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--slate)' }}>By {bill.author}</div>
                                </div>

                                <div className="bill-badges">
                                    <span className={`badge ${bill.isNavyBlue ? 'badge-navy' : 'badge-royal'}`}>
                                        {bill.isNavyBlue ? 'Navy Blue' : 'Royal Blue'}
                                    </span>
                                    {bill.isAgendaAligned && <span className="badge badge-agenda">Agenda Aligned (+2)</span>}
                                    {bill.isSupermajority && <span className="badge badge-super">Supermajority (66%)</span>}
                                </div>

                                <div className="attribute-row">
                                    <span style={{ color: 'var(--slate)' }}>Status:</span>
                                    <select
                                        value={bill.status}
                                        onChange={(e) => handleUpdateBill(bill._firestoreId, 'status', e.target.value)}
                                    >
                                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div className="whip-tools">
                                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--slate)', fontWeight: '600', marginBottom: '5px' }}>
                                        Whip Tallies
                                    </div>

                                    <div className="vote-row">
                                        <span className="vote-label" style={{ color: 'var(--success-green)' }}>YES</span>
                                        <div className="vote-controls">
                                            <button className="vote-btn" onClick={() => adjustVote(bill._firestoreId, bill.votesYes, 'votesYes', -1)}>-</button>
                                            <span className="vote-count">{bill.votesYes}</span>
                                            <button className="vote-btn" onClick={() => adjustVote(bill._firestoreId, bill.votesYes, 'votesYes', 1)}>+</button>
                                        </div>
                                    </div>

                                    <div className="vote-row">
                                        <span className="vote-label" style={{ color: 'var(--slate-light)' }}>UNDECIDED</span>
                                        <div className="vote-controls">
                                            <button className="vote-btn" onClick={() => adjustVote(bill._firestoreId, bill.votesUndecided, 'votesUndecided', -1)}>-</button>
                                            <span className="vote-count">{bill.votesUndecided}</span>
                                            <button className="vote-btn" onClick={() => adjustVote(bill._firestoreId, bill.votesUndecided, 'votesUndecided', 1)}>+</button>
                                        </div>
                                    </div>

                                    <div className="vote-row">
                                        <span className="vote-label" style={{ color: 'var(--warning-red)' }}>NO</span>
                                        <div className="vote-controls">
                                            <button className="vote-btn" onClick={() => adjustVote(bill._firestoreId, bill.votesNo, 'votesNo', -1)}>-</button>
                                            <span className="vote-count">{bill.votesNo}</span>
                                            <button className="vote-btn" onClick={() => adjustVote(bill._firestoreId, bill.votesNo, 'votesNo', 1)}>+</button>
                                        </div>
                                    </div>

                                    <div className={`majority-indicator ${hasMajority ? 'majority-met' : ''}`} style={{ marginTop: '10px' }}>
                                        {hasMajority
                                            ? `✓ Majority Secured (${bill.votesYes}/${requiredVotes})`
                                            : `Needs ${requiredVotes - bill.votesYes} more YES votes`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                {bills.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--slate)', backgroundColor: 'var(--navy-blue)', borderRadius: '12px' }}>
                        No bills found. Add a new bill to start.
                    </div>
                ) : bills.filter(bill => {
                    if (filterPhase !== 'All' && bill.status !== filterPhase) return false;
                    if (filterParty === 'Navy Blue' && !bill.isNavyBlue) return false;
                    if (filterParty === 'Royal Blue' && bill.isNavyBlue) return false;
                    return true;
                }).length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--slate)', backgroundColor: 'var(--navy-blue)', borderRadius: '12px' }}>
                        No bills match your filters.
                    </div>
                ) : null}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginBottom: '20px' }}>Add New Bill</h2>
                        <form onSubmit={handleAddBill}>
                            <div className="form-group">
                                <label>Bill ID (e.g., HB 101)</label>
                                <input required className="input-control" style={{ width: '100%' }} value={newBill.id} onChange={e => setNewBill({ ...newBill, id: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Title</label>
                                <input required className="input-control" style={{ width: '100%' }} value={newBill.title} onChange={e => setNewBill({ ...newBill, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Author</label>
                                <input required className="input-control" style={{ width: '100%' }} value={newBill.author} onChange={e => setNewBill({ ...newBill, author: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={newBill.isNavyBlue} onChange={e => setNewBill({ ...newBill, isNavyBlue: e.target.checked })} />
                                    Is Navy Blue Bill? (Our Party)
                                </label>
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={newBill.isAgendaAligned} onChange={e => setNewBill({ ...newBill, isAgendaAligned: e.target.checked })} />
                                    Is Agenda Aligned? (+2 Bonus)
                                </label>
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={newBill.isSupermajority} onChange={e => setNewBill({ ...newBill, isSupermajority: e.target.checked })} />
                                    Requires Supermajority? (66%)
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-primary" style={{ borderColor: 'var(--slate)', color: 'var(--slate)' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="add-bill-btn" style={{ margin: '0' }}>Save Bill</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
