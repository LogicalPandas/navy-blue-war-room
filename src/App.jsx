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
    'In Committee',
    'In Committee (Tabled)',
    'Killed in Committee',
    'In House',
    'Killed In House',
    'Passed House',
    'Signed into Law'
];

const COMMITTEE_OPTIONS = [
    'Curriculum and Academic Standards',
    'General Affairs and Oversight',
    'Infrastructure and Campus Development',
    'Student Life and Campus Culture'
];

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [bills, setBills] = useState([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPhase, setFilterPhase] = useState('All');
    const [filterParty, setFilterParty] = useState('All');
    const [filterCommittee, setFilterCommittee] = useState('All');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [editingBill, setEditingBill] = useState(null);
    const [newBill, setNewBill] = useState({
        id: '',
        title: '',
        author: '',
        committee: '', // Blank initially until assigned
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

    // Calculate Dashboard Metrics
    const validNavyBills = bills.filter(b => b.isNavyBlue && b.status !== 'Killed in Committee');
    const totalNavyBillsAlive = validNavyBills.length;
    const totalNavyBillsPassed = bills.filter(b => b.isNavyBlue && b.status === 'Passed House').length;

    const navyBillsByCommittee = validNavyBills.reduce((acc, bill) => {
        const comm = bill.committee || 'Unassigned';
        if (!acc[comm]) acc[comm] = 0;
        acc[comm]++;
        return acc;
    }, {});

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
                id: '', title: '', author: '', committee: '', isNavyBlue: true, isAgendaAligned: true,
                isSupermajority: false, status: 'Pre-Comm', votesYes: 0, votesUndecided: 0, votesNo: 0
            });
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error adding bill. Check rules.");
        }
    };

    const handleBulkAdd = async (e) => {
        e.preventDefault();
        const records = bulkText.split('\n').map(r => r.trim()).filter(Boolean);
        let count = 0;
        for (let record of records) {
            const parts = record.split('\t');
            if (parts.length < 3) continue;

            const id = parts[0]?.trim() || '';
            const title = parts[1]?.trim() || '';
            const author = parts[2]?.trim() || '';
            const navyBlue = parts[3] ? parts[3].trim().toLowerCase() === 'true' : true;
            const agenda = parts[4] ? parts[4].trim().toLowerCase() === 'true' : true;
            const supermaj = parts[5] ? parts[5].trim().toLowerCase() === 'true' : false;

            let status = parts[6]?.trim() || 'Pre-Comm';
            if (!STATUS_OPTIONS.includes(status)) {
                status = 'Pre-Comm';
            }

            let committee = parts[7]?.trim() || '';
            if (committee && !COMMITTEE_OPTIONS.includes(committee)) {
                committee = '';
            }

            try {
                await addDoc(collection(db, 'bills'), {
                    id, title, author,
                    committee,
                    isNavyBlue: navyBlue,
                    isAgendaAligned: agenda,
                    isSupermajority: supermaj,
                    status,
                    votesYes: 0,
                    votesUndecided: 0,
                    votesNo: 0
                });
                count++;
            } catch (error) {
                console.error("Error adding document in bulk: ", error);
            }
        }
        alert(`Successfully imported ${count} bills.`);
        setIsBulkModalOpen(false);
        setBulkText('');
    };

    const handleEditBill = async (e) => {
        e.preventDefault();
        try {
            const billRef = doc(db, 'bills', editingBill._firestoreId);
            await updateDoc(billRef, {
                id: editingBill.id,
                title: editingBill.title,
                author: editingBill.author,
                isNavyBlue: editingBill.isNavyBlue,
                isAgendaAligned: editingBill.isAgendaAligned,
                isSupermajority: editingBill.isSupermajority
            });
            setEditingBill(null);
        } catch (error) {
            console.error("Error updating document: ", error);
            alert("Error updating bill.");
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
            <header className="header" style={{ flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div>
                        <h1>Navy Blue War Room</h1>
                        <div style={{ color: 'var(--slate)' }}>Real-time Legislative Dashboard</div>
                    </div>
                    <div className="score-board">
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Passed Bills</div>
                        <div className="score-value">{bills.filter(b => b.status === 'Signed into Law' && b.isNavyBlue).length}</div>
                    </div>
                </div>

                <div className="metrics-bar" style={{ display: 'flex', gap: '15px', width: '100%', flexWrap: 'wrap' }}>
                    <div className="metric-card">
                        <div className="metric-title">Bills Alive</div>
                        <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>{totalNavyBillsAlive}</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-title">Passed House</div>
                        <div className="metric-value" style={{ color: 'var(--success-green)' }}>{totalNavyBillsPassed}</div>
                    </div>
                    {COMMITTEE_OPTIONS.map(comm => (
                        <div key={comm} className="metric-card">
                            <div className="metric-title" title={comm}>
                                {comm.split(' ').map(w => w[0]).join('')}
                            </div>
                            <div className="metric-value">{navyBillsByCommittee[comm] || 0}</div>
                        </div>
                    ))}
                </div>
            </header>
            <div className="dashboard-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="add-bill-btn" onClick={() => setIsModalOpen(true)} style={{ whiteSpace: 'nowrap' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Bill
                    </button>
                    <button className="add-bill-btn" onClick={() => setIsBulkModalOpen(true)} style={{ whiteSpace: 'nowrap', backgroundColor: 'var(--slate)', borderColor: 'var(--slate)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Bulk Import
                    </button>
                </div>
                <div className="filter-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, minWidth: '200px' }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className="input-control"
                                style={{ width: '100%', paddingLeft: '35px', paddingRight: '10px' }}
                                placeholder="Search ID, title, or author..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--slate)' }}>Committee:</label>
                        <select
                            className="input-control"
                            style={{ width: 'auto', padding: '6px 10px' }}
                            value={filterCommittee}
                            onChange={e => setFilterCommittee(e.target.value)}
                        >
                            <option value="All">All Committees</option>
                            {COMMITTEE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bills-grid">
                {bills
                    .filter(bill => {
                        // Global Search
                        if (searchTerm) {
                            const term = searchTerm.toLowerCase();
                            const matchesId = bill.id?.toLowerCase().includes(term);
                            const matchesTitle = bill.title?.toLowerCase().includes(term);
                            const matchesAuthor = bill.author?.toLowerCase().includes(term);
                            if (!matchesId && !matchesTitle && !matchesAuthor) return false;
                        }

                        if (filterPhase !== 'All' && bill.status !== filterPhase) return false;
                        if (filterParty === 'Navy Blue' && !bill.isNavyBlue) return false;
                        if (filterParty === 'Royal Blue' && bill.isNavyBlue) return false;
                        if (filterCommittee !== 'All' && bill.committee !== filterCommittee) return false;
                        return true;
                    })
                    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
                    .map(bill => {
                        const totalVotesCast = bill.votesYes + bill.votesNo + bill.votesUndecided;
                        const requiredFraction = bill.isSupermajority ? 0.66 : 0.51;
                        const requiredVotes = Math.ceil(TOTAL_VOTERS * requiredFraction);
                        const hasMajority = bill.votesYes >= requiredVotes;

                        return (
                            <div key={bill._firestoreId} className={`bill-card ${!bill.isNavyBlue ? 'royal-blue-card' : ''}`}>

                                <div className="card-header">
                                    <h3 style={{ margin: '0' }}>{bill.id}</h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => setEditingBill({ ...bill })}
                                            style={{ background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', padding: '0' }}
                                            title="Edit Bill"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteBill(bill._firestoreId)}
                                            style={{ background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', padding: '0' }}
                                            title="Delete Bill"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--white)', marginBottom: '5px' }}>{bill.title}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--slate)' }}>By {bill.author}</div>
                                    {bill.status === 'In Committee' || bill.status === 'In Committee (Tabled)' || bill.status === 'Killed in Committee' ? (
                                        <select
                                            style={{ backgroundColor: 'transparent', border: '1px solid var(--navy-lighter)', color: 'var(--slate-light)', fontSize: '12px', padding: '2px 4px', marginTop: '4px', width: '100%' }}
                                            value={bill.committee || ''}
                                            onChange={(e) => handleUpdateBill(bill._firestoreId, 'committee', e.target.value)}
                                        >
                                            <option value="" disabled>Select Committee...</option>
                                            {COMMITTEE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    ) : (
                                        <div style={{ fontSize: '12px', color: 'var(--slate-light)', marginTop: '4px', fontStyle: 'italic' }}>
                                            {(bill.status === 'In House' || bill.status === 'Killed In House' || bill.status === 'Passed House' || bill.status === 'Signed into Law') ? '' : (bill.committee || 'Pending Committee')}
                                        </div>
                                    )}
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
                    if (filterCommittee !== 'All' && bill.committee !== filterCommittee) return false;
                    return true;
                }).length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--slate)', backgroundColor: 'var(--navy-blue)', borderRadius: '12px' }}>
                        No bills match your filters.
                    </div>
                ) : null}
            </div>

            {
                isModalOpen && (
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
                                <div className="form-group" style={{ display: 'none' }}>
                                    <label>Committee</label>
                                    <select
                                        className="input-control"
                                        style={{ width: '100%' }}
                                        value={newBill.committee}
                                        onChange={e => setNewBill({ ...newBill, committee: e.target.value })}
                                    >
                                        <option value="">Pending Assignment</option>
                                        {COMMITTEE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={newBill.isSupermajority} onChange={e => setNewBill({ ...newBill, isSupermajority: e.target.checked })} />
                                            Requires Supermajority? (66%)
                                        </label>
                                        <span style={{ fontSize: '11px', color: 'var(--slate)', marginLeft: '24px', fontStyle: 'italic' }}>
                                            Bills that deal with classes/curriculum or parking require a supermajority
                                        </span>
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-primary" style={{ borderColor: 'var(--slate)', color: 'var(--slate)' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="add-bill-btn" style={{ margin: '0' }}>Save Bill</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                editingBill && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2 style={{ marginBottom: '20px' }}>Edit Bill</h2>
                            <form onSubmit={handleEditBill}>
                                <div className="form-group">
                                    <label>Bill ID (e.g., HB 101)</label>
                                    <input required className="input-control" style={{ width: '100%' }} value={editingBill.id} onChange={e => setEditingBill({ ...editingBill, id: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Title</label>
                                    <input required className="input-control" style={{ width: '100%' }} value={editingBill.title} onChange={e => setEditingBill({ ...editingBill, title: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Author</label>
                                    <input required className="input-control" style={{ width: '100%' }} value={editingBill.author} onChange={e => setEditingBill({ ...editingBill, author: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={editingBill.isNavyBlue} onChange={e => setEditingBill({ ...editingBill, isNavyBlue: e.target.checked })} />
                                        Is Navy Blue Bill? (Our Party)
                                    </label>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={editingBill.isAgendaAligned} onChange={e => setEditingBill({ ...editingBill, isAgendaAligned: e.target.checked })} />
                                        Is Agenda Aligned? (+2 Bonus)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={editingBill.isSupermajority} onChange={e => setEditingBill({ ...editingBill, isSupermajority: e.target.checked })} />
                                            Requires Supermajority? (66%)
                                        </label>
                                        <span style={{ fontSize: '11px', color: 'var(--slate)', marginLeft: '24px', fontStyle: 'italic' }}>
                                            Bills that deal with classes/curriculum or parking require a supermajority
                                        </span>
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-primary" style={{ borderColor: 'var(--slate)', color: 'var(--slate)' }} onClick={() => setEditingBill(null)}>Cancel</button>
                                    <button type="submit" className="add-bill-btn" style={{ margin: '0' }}>Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isBulkModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '600px' }}>
                            <h2 style={{ marginBottom: '10px' }}>Bulk Import Bills</h2>
                            <p style={{ color: 'var(--slate)', fontSize: '14px', marginBottom: '20px' }}>
                                Paste data from Excel or Google Sheets. The columns must be in this exact order:<br /><br />
                                <strong>ID | Title | Author | IsNavyBlue | IsAgendaAligned | IsSupermajority | Status | Committee</strong><br /><br />
                                <em>(Boolean columns can be 'true' or 'false'. Status must exactly match a valid phase or it defaults to 'Pre-Comm'. Committee must exactly match a valid committee if provided.)</em>
                            </p>
                            <form onSubmit={handleBulkAdd}>
                                <div className="form-group">
                                    <textarea
                                        className="input-control"
                                        style={{ width: '100%', height: '200px', resize: 'vertical', fontFamily: 'monospace', whiteSpace: 'pre' }}
                                        placeholder="HB 101&#9;Education Reform&#9;Smith&#9;true&#9;true&#9;false&#9;Pre-Comm&#9;General Affairs and Oversight"
                                        value={bulkText}
                                        onChange={e => setBulkText(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="modal-actions" style={{ marginTop: '20px' }}>
                                    <button type="button" className="btn-primary" style={{ borderColor: 'var(--slate)', color: 'var(--slate)' }} onClick={() => setIsBulkModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="add-bill-btn" style={{ margin: '0' }}>Import Bills</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default App;
