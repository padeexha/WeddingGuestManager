import React, { useState } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function GuestNamesTab({ guests, updateGuests, showToast }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("table");

  const getAttending = (g) => g.attendingCount != null ? g.attendingCount : g.count;
  
  const filteredGuests = guests
    .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a,b) => {
        if (sortOption === "alpha") {
          return a.name.localeCompare(b.name);
        }
        // Sort by table first, then name
        const tA = a.table || 'Unassigned';
        const tB = b.table || 'Unassigned';
        if (tA !== tB) return tA.toString().localeCompare(tB.toString(), undefined, {numeric: true});
        return a.name.localeCompare(b.name);
    });

  const handleNameChange = (guest, index, newName) => {
    const newNames = [...(guest.inviteeNames || [])];
    newNames[index] = newName;
    const newGuests = guests.map(g => g.id === guest.id ? { ...g, inviteeNames: newNames } : g);
    updateGuests(newGuests, { action: "updated_invitee_names", details: { guestId: guest.id, guestName: guest.name } });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let yPos = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Guest Names List (For Hotel)", pageW / 2, yPos, { align: "center" });
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Generated on " + new Date().toLocaleDateString(), pageW / 2, yPos, { align: "center" });
    yPos += 15;

    const allAttendees = [];
    guests.forEach(g => {
        const count = getAttending(g);
        const names = g.inviteeNames || [];
        const t = g.table || "Unassigned";
        for(let i=0; i<count; i++) {
           allAttendees.push({
             givenName: names[i] || `${g.name} (Guest ${i+1})`,
             table: t
           });
        }
    });

    allAttendees.sort((a,b) => {
        if (sortOption === "alpha") {
            return a.givenName.localeCompare(b.givenName);
        }
        const tA = a.table;
        const tB = b.table;
        if (tA === "HT" && tB === "HT") return a.givenName.localeCompare(b.givenName);
        if (tA === "HT") return -1;
        if (tB === "HT") return 1;
        if (tA === "Unassigned" && tB === "Unassigned") return a.givenName.localeCompare(b.givenName);
        if (tA === "Unassigned") return 1;
        if (tB === "Unassigned") return -1;
        if (tA !== tB) return tA.toString().localeCompare(tB.toString(), undefined, {numeric: true});
        return a.givenName.localeCompare(b.givenName);
    });

    const rows = allAttendees.map(a => [a.givenName, `Table ${a.table}`]);

    autoTable(doc, {
      startY: yPos,
      head: [['Invitee Name', 'Table']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [176, 82, 120], fontSize: 12, fontStyle: 'bold' },
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 50, halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Guest_Names_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("PDF Exported!");
  };

  return (
    <div>
      <div className="top-bar dashboard-topbar">
        <div>
          <p className="page-eyebrow">Hotel Provision</p>
          <h2 className="page-title">Guest Names</h2>
        </div>
        <button className="btn btn-primary" onClick={handleExportPDF}>Export to PDF</button>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search groups..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="filter-select" value={sortOption} onChange={e => setSortOption(e.target.value)}>
          <option value="table">Sort by Table</option>
          <option value="alpha">Sort Alphabetically</option>
        </select>
        <div className="results-info">Showing {filteredGuests.length} groups</div>
      </div>

      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {filteredGuests.map(g => {
          const count = getAttending(g);
          const names = g.inviteeNames || [];
          return (
            <div key={g.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", margin: "0 0 4px 0", color: "#2C1220" }}>{g.name}</h3>
                  <span className="table-tag">{g.table ? `Table ${g.table}` : 'Unassigned'}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#7A4D63", fontWeight: 600 }}>{count} Pax</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {Array.from({ length: count }).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    className="form-input"
                    placeholder={`Guest ${i + 1} Name`}
                    value={names[i] || ""}
                    onChange={e => handleNameChange(g, i, e.target.value)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
