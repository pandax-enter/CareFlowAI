'use client'

import { useState, useEffect } from 'react'
import { subscribeToInventory, updateInventoryStock, realDb } from '@/lib/firebase'
import { collection, addDoc } from 'firebase/firestore'

export default function InventoryPage() {
  const [inventory, setInventory]         = useState([])
  const [loading, setLoading]             = useState(false)
  const [insights, setInsights]           = useState(null)
  const [restockInput, setRestockInput]   = useState({}) // { [itemId]: quantity string }
  const [restocking, setRestocking]       = useState({}) // { [itemId]: boolean }

  // New features
  const [hiddenItems, setHiddenItems]     = useState(new Set())
  const [showAddForm, setShowAddForm]     = useState(false)
  const [newItem, setNewItem]             = useState({ name: '', stock: 0, minThreshold: 10, unit: 'units', dailyUsage: 2 })
  const [isAdding, setIsAdding]           = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeToInventory((data) => {
      setInventory(data);
    });
    return () => unsubscribe();
  }, []);

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventory),
      })
      const data = await res.json()
      setInsights(data)
    } catch (error) {
      console.error('Inventory error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdjust = async (itemId, delta) => {
    try {
      await updateInventoryStock(itemId, delta, false)
    } catch (err) {
      console.error('Stock adjust error:', err)
    }
  }

  const handleRestock = async (itemId) => {
    const qty = parseInt(restockInput[itemId] || '0', 10)
    if (!qty || qty <= 0) {
      alert('Please enter a valid restock quantity.')
      return
    }
    setRestocking(prev => ({ ...prev, [itemId]: true }))
    try {
      await updateInventoryStock(itemId, qty, false)
      setRestockInput(prev => ({ ...prev, [itemId]: '' }))
    } catch (err) {
      console.error('Restock error:', err)
      alert('Failed to restock item.')
    } finally {
      setRestocking(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const handleAddNewItem = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      await addDoc(collection(realDb, 'hospital_inventory'), {
        ...newItem,
        stock: parseInt(newItem.stock),
        minThreshold: parseInt(newItem.minThreshold),
        dailyUsage: parseInt(newItem.dailyUsage),
        lastRestocked: new Date().toISOString()
      });
      alert("New supply added to system.");
      setShowAddForm(false);
      setNewItem({ name: '', stock: 0, minThreshold: 10, unit: 'units', dailyUsage: 2 });
    } catch (err) {
      console.error(err);
      alert("Failed to add item to Firestore.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromUI = (itemId) => {
    if (window.confirm("Remove this item from the current view? (Note: It will remain in the permanent database)")) {
      setHiddenItems(prev => new Set([...prev, itemId]));
    }
  };

  const getStatusLabel = (item) => {
    if (item.stock <= 0) return { label: 'OUT OF STOCK', bg: '#fee2e2', color: '#ef4444' }
    if (item.stock < item.minThreshold) return { label: 'LOW STOCK', bg: '#ffedd5', color: '#f97316' }
    return { label: 'SUFFICIENT', bg: '#dcfce7', color: '#22c55e' }
  }

  const sortedInventory = inventory
    .filter(item => !hiddenItems.has(item.id))
    .sort((a, b) => {
    const getScore = item => item.stock <= 0 ? 0 : item.stock < item.minThreshold ? 1 : 2;
    return getScore(a) - getScore(b);
  });

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title">Supply Intelligence</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time inventory monitoring and predictive replenishment.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="btn"
            style={{ background: '#f1f5f9', border: '1px solid var(--border)' }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '✕ Close Form' : '➕ Add Item'}
          </button>
          <button
            id="inventory-analysis-btn"
            className="btn btn-primary"
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Run AI Replenishment Analysis'}
          </button>
        </div>
      </header>

      {showAddForm && (
        <section className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--success)' }}>
          <h2 className="title" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Add New Clinical Supply</h2>
          <form onSubmit={handleAddNewItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
             <div>
               <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>Item Name</label>
               <input type="text" className="btn" style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)' }} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
             </div>
             <div>
               <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>Initial Stock</label>
               <input type="number" className="btn" style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)' }} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} required />
             </div>
             <div>
               <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>Unit (vials, boxes, bags)</label>
               <input type="text" className="btn" style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} required />
             </div>
             <div>
               <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>Min Threshold</label>
               <input type="number" className="btn" style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)' }} value={newItem.minThreshold} onChange={e => setNewItem({...newItem, minThreshold: e.target.value})} required />
             </div>
             <div>
               <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>Avg Daily Usage</label>
               <input type="number" className="btn" style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)' }} value={newItem.dailyUsage} onChange={e => setNewItem({...newItem, dailyUsage: e.target.value})} required />
             </div>
             <div style={{ display: 'flex', alignItems: 'flex-end' }}>
               <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isAdding}>{isAdding ? 'Adding...' : 'Add to Inventory'}</button>
             </div>
          </form>
        </section>
      )}

      <div className="dashboard-grid">
        {sortedInventory.map(item => {
          const status  = getStatusLabel(item)
          const daysLeft = item.dailyUsage > 0 ? Math.floor(item.stock / item.dailyUsage) : '∞'
          const restockQty = restockInput[item.id] || ''

          return (
            <div key={item.id} className="card" style={{ borderLeft: `6px solid ${status.color}` }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 className="title" style={{ margin: 0, fontSize: '1.05rem' }}>{item.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {item.id}</span>
                    <button 
                      onClick={() => handleRemoveFromUI(item.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#ef4444', padding: 0 }}
                      title="Remove from UI view"
                    >🗑️ Remove</button>
                  </div>
                </div>
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: status.bg,
                  color: status.color
                }}>
                  {status.label}
                </span>
              </div>

              {/* Current Stock with +/- controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    onClick={() => handleAdjust(item.id, -1)}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold', color: '#b91c1c' }}
                  >−</button>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                    {item.stock}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{item.unit}</span>
                  <button
                    onClick={() => handleAdjust(item.id, 1)}
                    style={{ background: '#dcfce7', border: 'none', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold', color: '#15803d' }}
                  >+</button>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div>{daysLeft} days remaining</div>
                  <div>Min: {item.minThreshold} {item.unit}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (item.stock / (item.minThreshold * 2)) * 100)}%`,
                    background: status.color,
                    borderRadius: '3px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>Daily usage: {item.dailyUsage} {item.unit}</span>
                  <span>Min threshold</span>
                </div>
              </div>

              {/* Restock Panel */}
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <input
                  type="number"
                  placeholder="Restock qty..."
                  min="1"
                  value={restockQty}
                  onChange={e => setRestockInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }}
                />
                <button
                  onClick={() => handleRestock(item.id)}
                  disabled={restocking[item.id]}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
                >
                  {restocking[item.id] ? '...' : '📦 Restock'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {insights && (
        <section style={{ marginTop: '2.5rem' }}>
          <h2 className="title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            AI Predictive Insights <span className="badge badge-low">RAG Enhanced</span>
          </h2>
          <div className="card" style={{ borderLeft: '8px solid var(--primary)' }}>
            <p style={{ fontSize: '1rem', marginBottom: '1rem' }}><strong>Analysis:</strong> {insights.analysis}</p>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '1rem' }}>Recommended Actions</h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', margin: 0 }}>
              {(insights.actions || []).map((action, i) => (
                <li key={i} style={{ marginBottom: '0.5rem', color: '#1e293b' }}>{action}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
