import React, { useState } from 'react';
import floorplanImage from '../assets/floorplan.png';

// Rough table coordinates as percentages (left, top) based on the image
const TABLE_COORDS = {
  // Top left section
  22: { left: 8, top: 9 },
  21: { left: 19, top: 9 },
  16: { left: 30, top: 9 },
  23: { left: 8, top: 19 },
  20: { left: 19, top: 18 },
  17: { left: 30, top: 19 },
  19: { left: 19, top: 29 },
  18: { left: 31, top: 29 },

  // Top right section
  15: { left: 69, top: 10 },
  12: { left: 81, top: 10 },
  11: { left: 93, top: 10 },
  14: { left: 70, top: 21 },
  13: { left: 82, top: 21 },
  10: { left: 93, top: 21 },

  // Bottom left section
  33: { left: 8, top: 60 },
  34: { left: 8, top: 71 },
  35: { left: 8, top: 82 },
  32: { left: 20, top: 54 },
  31: { left: 20, top: 63 },
  30: { left: 20, top: 72 },
  29: { left: 20, top: 81 },
  26: { left: 31, top: 59 },
  27: { left: 32, top: 70 },
  28: { left: 32, top: 79 },
  24: { left: 41, top: 55 },
  25: { left: 42, top: 64 },

  // Bottom center/right section
  1: { left: 62, top: 58 },
  2: { left: 62, top: 68 },
  3: { left: 62, top: 81 },
  6: { left: 74, top: 58 },
  5: { left: 74, top: 68 },
  4: { left: 74, top: 81 },
  
  // Head table area
  "HT": { left: 93, top: 43 },
  7: { left: 93, top: 64 },
  8: { left: 93, top: 73 },
  9: { left: 93, top: 82 },
};

export default function TablePlanner({ guests, updateGuests, showToast }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapTable1, setSwapTable1] = useState("");
  const [swapTable2, setSwapTable2] = useState("");
  
  // Create a map of table number to list of guests assigned to it
  const guestsByTable = {};
  guests.forEach(g => {
    if (g.table != null && g.table !== "") {
      const t = String(g.table);
      if (!guestsByTable[t]) {
        guestsByTable[t] = [];
      }
      guestsByTable[t].push(g);
    }
  });

  const getAttending = (g) => g.attendingCount != null ? g.attendingCount : g.count;

  // Unassigned guests
  const unassignedGuests = guests.filter(g => g.table == null || g.table === "")
    .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRemoveGuest = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    updateGuests(guests.map(g => g.id === guestId ? { ...g, table: null } : g), {
      action: "guest_table_removed",
      details: { guestId, guestName: guest?.name, fromTable: selectedTable }
    });
    showToast("Removed from table");
  };

  const handleAddGuest = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    updateGuests(guests.map(g => g.id === guestId ? { ...g, table: selectedTable } : g), {
      action: "guest_table_assigned",
      details: { guestId, guestName: guest?.name, toTable: selectedTable }
    });
    showToast("Added to table");
  };

  const handleSwap = () => {
    if (!swapTable1 || !swapTable2 || swapTable1 === swapTable2) {
      showToast("Please select two different tables");
      return;
    }
    const newGuests = guests.map(g => {
      if (String(g.table) === swapTable1) return { ...g, table: swapTable2 };
      if (String(g.table) === swapTable2) return { ...g, table: swapTable1 };
      return g;
    });
    updateGuests(newGuests, { action: "tables_swapped", details: { table1: swapTable1, table2: swapTable2 } });
    showToast(`Swapped Table ${swapTable1} & ${swapTable2}`);
    setSwapModalOpen(false);
    setSwapTable1("");
    setSwapTable2("");
  };

  const allTables = Object.keys(TABLE_COORDS);

  return (
    <div className="table-planner-container">
      <div className="dashboard-hero" style={{marginBottom: 24, minHeight: 'auto', padding: '24px 30px', alignItems: 'center', display: 'flex', justifyContent: 'space-between'}}>
        <div>
          <div className="dashboard-kicker">Planner</div>
          <h2 style={{fontSize: 32, marginBottom: 8}}>Table Planner</h2>
          <p style={{margin: 0}}>Click on a table to manage its seated guests.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setSwapModalOpen(true)}>🔄 Swap Tables</button>
      </div>

      <div className="planner-map-wrap">
        <img 
          src={floorplanImage} 
          alt="Floor Plan" 
          className="planner-image"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
        <div className="planner-placeholder-notice" style={{display: 'none', background: '#FDF4F7', border: '1px dashed #B05278', padding: '40px', textAlign: 'center', borderRadius: '12px', color: '#8E3D5F', margin: '20px 0'}}>
          <h3>Missing Floor Plan Image</h3>
          <p>Please save your floor plan image as <code>src/assets/floorplan.png</code> and refresh.</p>
        </div>
        
        {Object.entries(TABLE_COORDS).map(([tableNum, coords]) => {
          const tNum = String(tableNum);
          const tableGuests = guestsByTable[tNum] || [];
          
          return (
            <div 
              key={tableNum}
              className={`planner-table-spot ${tNum === "HT" ? 'ht' : ''} ${selectedTable === tNum ? 'active' : ''} ${tableGuests.length > 0 ? 'occupied' : ''}`}
              style={{
                left: `${coords.left}%`,
                top: `${coords.top}%`,
              }}
              onClick={() => {
                setSelectedTable(tNum);
                setSearchTerm("");
              }}
            >
            </div>
          );
        })}
      </div>

      {selectedTable && (
        <div className="modal-overlay" onClick={() => setSelectedTable(null)}>
          <div className="modal-content table-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedTable(null)}>✕</button>
            <div className="modal-header">
              <h3>Table {selectedTable}</h3>
              <p>Manage guests for this table</p>
            </div>
            
            <div className="table-modal-split">
              {/* Seated Guests Section */}
              <div className="table-modal-section">
                <div className="table-modal-section-title">
                  Seated Guests
                  <span className="count-badge">
                    {(guestsByTable[selectedTable] || []).reduce((acc, g) => acc + getAttending(g), 0)}
                  </span>
                </div>
                <div className="table-modal-list">
                  {!(guestsByTable[selectedTable] || []).length ? (
                    <div className="empty-state">No guests assigned yet</div>
                  ) : (
                    (guestsByTable[selectedTable] || []).map(g => (
                      <div className="table-modal-row" key={g.id}>
                        <div className="table-modal-guest-info">
                          <span className="name">{g.name}</span>
                          <span className="count">x{getAttending(g)}</span>
                        </div>
                        <button className="btn-remove" onClick={() => handleRemoveGuest(g.id)}>✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Unassigned Guests Section */}
              <div className="table-modal-section">
                <div className="table-modal-section-title">
                  Add Guests
                </div>
                <input 
                  type="text" 
                  className="form-input table-modal-search" 
                  placeholder="Search unassigned guests..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="table-modal-list">
                  {unassignedGuests.length === 0 ? (
                    <div className="empty-state">No unassigned guests found</div>
                  ) : (
                    unassignedGuests.map(g => (
                      <div className="table-modal-row add-row" key={g.id} onClick={() => handleAddGuest(g.id)}>
                        <div className="table-modal-guest-info">
                          <span className="name">{g.name}</span>
                          <span className="count">x{getAttending(g)}</span>
                        </div>
                        <button className="btn-add">+</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {swapModalOpen && (
        <div className="modal-overlay" onClick={() => setSwapModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: 400}}>
            <button className="modal-close" onClick={() => setSwapModalOpen(false)}>✕</button>
            <h2 className="modal-title">Swap Tables</h2>
            <p style={{marginBottom: 20, color: '#7a4d63'}}>Select two tables to perfectly swap all guests between them.</p>
            <div style={{display: 'flex', gap: 15, marginBottom: 20}}>
              <div style={{flex: 1}}>
                <label className="form-label">Table 1</label>
                <select className="form-input" value={swapTable1} onChange={e => setSwapTable1(e.target.value)}>
                  <option value="">Select...</option>
                  {allTables.map(t => <option key={t} value={t}>Table {t}</option>)}
                </select>
              </div>
              <div style={{flex: 1}}>
                <label className="form-label">Table 2</label>
                <select className="form-input" value={swapTable2} onChange={e => setSwapTable2(e.target.value)}>
                  <option value="">Select...</option>
                  {allTables.map(t => <option key={t} value={t}>Table {t}</option>)}
                </select>
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10}}>
              <button className="btn btn-ghost" onClick={() => setSwapModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSwap}>Swap Guests</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
