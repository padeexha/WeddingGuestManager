import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { db, auth } from "./firebase";
import LoginScreen from "./LoginScreen";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";


const T = {
  bg:"#FDF4F7", surface:"#FFFFFF", surfaceAlt:"#FBF0F4",
  border:"#EDD8E2", borderLight:"#F5E8ED",
  header:"#3D1829", headerText:"#F5DCEB", headerMuted:"#C49AB5",
  primary:"#B05278", primaryDark:"#8E3D5F", primaryBg:"#F7E0EA",
  accent:"#C49A6C",
  text:"#2C1220", textMid:"#7A4D63", textMuted:"#B89AAA",
  tag:"#F0DCE5", tagText:"#8E3D5F",
};

const INVITE_STATUS = {
  not_sent:  { label:"Not Sent",  bg:"#F5E8ED", color:"#8E3D5F", dot:"#D4789A" },
  sent:      { label:"Sent",      bg:"#EAF0FB", color:"#2A4A8E", dot:"#4A7ADE" },
  delivered: { label:"Delivered", bg:"#E6F6EE", color:"#1A6B40", dot:"#2DBD72" },
};

const DEFAULT_CATEGORIES = [
  { name:"Sanjeeva's Invites", color:"#A0547A" },
  { name:"Ushani's Invites",   color:"#7A6BAA" },
  { name:"Neighbours",         color:"#6A8FAA" },
  { name:"Lihini's Invites",   color:"#AA7A6A" },
  { name:"Thulani's Invites",  color:"#7AAA8F" },
];

const PALETTE = [
  "#A0547A","#7A6BAA","#6A8FAA","#AA7A6A","#7AAA8F",
  "#B07A54","#547AB0","#B05490","#54B07A","#AA9054",
  "#7A54B0","#B05454","#549090","#906AA0","#6A90B0",
];

const RSVP_CONFIG = {
  confirmed: { label:"Confirmed", bg:"#E6F6EE", color:"#1A6B40", dot:"#2DBD72" },
  pending:   { label:"Pending",   bg:"#FDF4E3", color:"#7A5000", dot:"#E8A020" },
  declined:  { label:"Declined",  bg:"#FCE8EC", color:"#7A1830", dot:"#E84060" },
};

const MK = (id, name, cat, count, table=null, notes="") =>
  ({ id, name, category:cat, count, attendingCount:null, rsvp:"pending", table, notes, inviteStatus:"not_sent", inviteSentDate:null });

const INITIAL_GUESTS = [
  MK(1,"Anusha & Family","Sanjeeva's Invites",6),
  MK(2,"Kavinda","Sanjeeva's Invites",6,null,"Maneesa & Amma Included"),
  MK(3,"Ran Mama","Sanjeeva's Invites",2),
  MK(4,"Daya Nanda","Sanjeeva's Invites",2),
  MK(5,"Dilani Family","Sanjeeva's Invites",4),
  MK(6,"Sudumanike","Sanjeeva's Invites",2),
  MK(7,"Parakrama","Sanjeeva's Invites",2),
  MK(8,"Prabath","Sanjeeva's Invites",2),
  MK(9,"Sudu Akki","Sanjeeva's Invites",1),
  MK(10,"Baby & Rohini","Sanjeeva's Invites",2),
  MK(11,"Sanjaya","Sanjeeva's Invites",2),
  MK(12,"Duminda","Sanjeeva's Invites",2,null,"Panadura"),
  MK(13,"Pushpa","Sanjeeva's Invites",2,null,"Panadura"),
  MK(14,"Caldera Malani","Sanjeeva's Invites",2),
  MK(15,"Dr Mahawedage Family","Sanjeeva's Invites",5),
  MK(16,"Awissawella","Sanjeeva's Invites",4,null,"Charlet"),
  MK(17,"Deepi","Sanjeeva's Invites",2),
  MK(18,"Chooti Nanda","Sanjeeva's Invites",2),
  MK(19,"Saman Welagedara","Sanjeeva's Invites",2),
  MK(20,"Giruka Perusinghe","Sanjeeva's Invites",2),
  MK(21,"Salinda Samarakoon","Sanjeeva's Invites",2),
  MK(22,"Prasanna Ayya","Sanjeeva's Invites",2),
  MK(23,"Harsahna Mayakaduwa","Sanjeeva's Invites",2),
  MK(24,"Samantha Wijesekara","Sanjeeva's Invites",2),
  MK(25,"Poshitha Delpola","Sanjeeva's Invites",2),
  MK(26,"Chinthaka Ayya","Sanjeeva's Invites",2),
  MK(27,"Chandana Bopegoda","Sanjeeva's Invites",2),
  MK(28,"Dr. Nirukshan Pradeep","Sanjeeva's Invites",2),
  MK(29,"Dr. Muditha Canskora","Sanjeeva's Invites",2),
  MK(30,"Kotte","Sanjeeva's Invites",3),
  MK(31,"Mahinda","Sanjeeva's Invites",2,null,"Ananda"),
  MK(32,"Maheepala","Sanjeeva's Invites",2),
  MK(33,"Mahi Chandana","Sanjeeva's Invites",2),
  MK(34,"Damika Perera","Sanjeeva's Invites",2),
  MK(35,"Pushpe Aiya","Sanjeeva's Invites",1),
  MK(36,"L P Shantha","Sanjeeva's Invites",2),
  MK(37,"Indika Bandara","Sanjeeva's Invites",2),
  MK(38,"Kamal Ranaweera","Sanjeeva's Invites",2),
  MK(39,"Jagath Ayya","Sanjeeva's Invites",2),
  MK(40,"Nalinda Mahawithana","Sanjeeva's Invites",4),
  MK(41,"Arosha","Sanjeeva's Invites",2),
  MK(42,"Damika Kabral","Sanjeeva's Invites",1),
  MK(43,"Dimuth Jagoda Arachchi","Sanjeeva's Invites",2),
  MK(44,"Kicho","Sanjeeva's Invites",1,null,"Basketball"),
  MK(45,"Raju","Sanjeeva's Invites",1,null,"Basketball"),
  MK(46,"Clifford","Sanjeeva's Invites",1,null,"Basketball"),
  MK(47,"Supun","Sanjeeva's Invites",1,null,"Basketball"),
  MK(48,"K I H","Sanjeeva's Invites",2),
  MK(49,"Bappa","Ushani's Invites",2),
  MK(50,"Nuwan","Ushani's Invites",4),
  MK(51,"Baby","Ushani's Invites",2),
  MK(52,"Nimali","Ushani's Invites",4),
  MK(53,"Asoka","Ushani's Invites",3),
  MK(54,"Nimal","Ushani's Invites",2),
  MK(55,"Gaya","Ushani's Invites",2),
  MK(56,"Champa","Ushani's Invites",4),
  MK(57,"Dammi","Ushani's Invites",0),
  MK(58,"Taniya","Ushani's Invites",1),
  MK(59,"Sandu Nangi","Neighbours",2),
  MK(60,"Renu","Neighbours",2),
  MK(61,"Nimal","Neighbours",2),
  MK(62,"Poojitha","Neighbours",2),
  MK(63,"Dr. Globy","Neighbours",2),
  MK(64,"Kumini","Neighbours",2),
  MK(65,"Thidasi","Lihini's Invites",1),
  MK(66,"Janani","Lihini's Invites",1),
  MK(67,"Sewmini","Lihini's Invites",1),
  MK(68,"Meedeesha","Lihini's Invites",3),
  MK(69,"Padeesha","Lihini's Invites",3),
  MK(70,"Nisini","Lihini's Invites",1),
  MK(71,"Oneli","Lihini's Invites",1),
  MK(72,"Nethi","Lihini's Invites",1),
  MK(73,"Rehan","Lihini's Invites",2),
  MK(74,"Thushan","Lihini's Invites",1),
  MK(75,"Indusara","Lihini's Invites",1),
  MK(76,"Andrea Wijewansha","Thulani's Invites",1,4),
  MK(77,"Sithmi Muthumala","Thulani's Invites",1,4),
  MK(78,"Sandini Paramulage","Thulani's Invites",1,4),
  MK(79,"Shanal & Kiran","Thulani's Invites",2,5),
  MK(80,"Abhishek","Thulani's Invites",1,5),
  MK(81,"Aswida Benedict","Thulani's Invites",1,5),
  MK(82,"Yashoda Desilva","Thulani's Invites",1,4),
  MK(83,"Lakshi Mahindasinghe","Thulani's Invites",1,5),
  MK(84,"Adithya Karaliadde","Thulani's Invites",1,4),
  MK(85,"Charuka","Thulani's Invites",1,5),
  MK(86,"Hashini","Thulani's Invites",2,5),
  MK(87,"Putte","Thulani's Invites",1),
  MK(88,"Oshadi","Thulani's Invites",1),
  MK(89,"Saliya Pieris","Thulani's Invites",1,6),
  MK(90,"Chandana Liyanapatabendy","Thulani's Invites",2,6),
  MK(91,"Keerthi Pieris","Thulani's Invites",2,6),
  MK(92,"Khan","Thulani's Invites",1),
  MK(93,"Anjana Alawatta","Thulani's Invites",1,4),
  MK(94,"Jagath Sumathipala","Thulani's Invites",2),
  MK(95,"Ishini Mutihetupliya","Thulani's Invites",1,4),
  MK(96,"Bavanishna","Thulani's Invites",1,4),
  MK(97,"Shanaka","Thulani's Invites",1,5),
  MK(98,"Ruvin","Thulani's Invites",1,null,"w/ mahawedage"),
  MK(99,"Nipun","Thulani's Invites",1,5),
  MK(100,"Imara","Thulani's Invites",1,6),
];

const getAttending = (g) => g.attendingCount != null ? g.attendingCount : g.count;
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_GUESTS = "wg_guests_v5";
const LS_CATS   = "wg_cats_v4";

const lsGet = (key) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
};
const lsSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Jost',sans-serif; background:${T.bg}; color:${T.text}; min-height:100vh; }
  h2,h3 { font-family:'Cormorant Garamond',serif; }
  .app { display:flex; flex-direction:column; min-height:100vh; }
  .header { background:${T.header}; padding:0 36px; display:flex; align-items:center; justify-content:space-between; height:64px; flex-shrink:0; border-bottom:1px solid #5C2840; }
  .header-brand { display:flex; align-items:center; gap:14px; }
  .lotus-icon { font-size:22px; }
  .header-title { font-family:'Cormorant Garamond',serif; color:${T.headerText}; font-size:22px; font-weight:600; }
  .header-sub { font-size:10px; color:${T.headerMuted}; font-weight:400; letter-spacing:1.5px; text-transform:uppercase; margin-top:1px; }
  .nav { display:flex; gap:2px; }
  .nav-btn { background:none; border:none; cursor:pointer; padding:8px 16px; border-radius:6px; font-family:'Jost',sans-serif; font-size:13px; font-weight:500; color:${T.headerMuted}; transition:all .15s; }
  .nav-btn:hover { background:rgba(255,255,255,.07); color:${T.headerText}; }
  .nav-btn.active { background:rgba(176,82,120,.25); color:${T.headerText}; }
  .nav-count { background:rgba(255,255,255,.12); border-radius:10px; padding:1px 7px; font-size:11px; margin-left:6px; }
  .main { flex:1; padding:30px 36px; }
  .top-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
  .page-title { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:600; color:${T.text}; }
  .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
  .stat-card { background:${T.surface}; border-radius:14px; padding:20px 22px; border:1px solid ${T.border}; position:relative; overflow:hidden; cursor:default; }
  .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--ac); }
  .stat-label { font-size:10px; color:${T.textMuted}; font-weight:500; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  .stat-value { font-family:'Cormorant Garamond',serif; font-size:38px; font-weight:600; line-height:1; }
  .stat-sub { font-size:11px; color:${T.textMuted}; margin-top:5px; }
  .card { background:${T.surface}; border-radius:14px; padding:24px; border:1px solid ${T.border}; }
  .card-title { font-size:10px; font-weight:500; color:${T.textMuted}; text-transform:uppercase; letter-spacing:1px; margin-bottom:20px; }
  .charts-row { display:grid; grid-template-columns:1.3fr 0.7fr; gap:20px; margin-bottom:24px; }
  .cat-list { display:flex; flex-direction:column; gap:13px; }
  .cat-row { display:flex; align-items:center; gap:10px; }
  .cat-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
  .cat-name { font-size:13px; color:${T.textMid}; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cat-bar-wrap { width:120px; background:${T.borderLight}; border-radius:4px; height:5px; overflow:hidden; flex-shrink:0; }
  .cat-bar { height:100%; border-radius:4px; }
  .cat-num { font-size:13px; font-weight:600; color:${T.text}; min-width:28px; text-align:right; }
  .table-summary { display:flex; flex-wrap:wrap; gap:10px; }
  .table-chip { background:${T.surfaceAlt}; border:1px solid ${T.border}; border-radius:12px; padding:14px 18px; min-width:110px; }
  .table-chip-label { font-size:10px; color:${T.textMuted}; font-weight:500; text-transform:uppercase; letter-spacing:.6px; margin-bottom:5px; }
  .table-chip-val { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:600; color:${T.text}; line-height:1; }
  .table-chip-sub { font-size:11px; color:${T.textMuted}; margin-top:3px; }
  .toolbar { display:flex; gap:10px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
  .search-wrap { position:relative; flex:1; min-width:200px; }
  .search-wrap input { width:100%; padding:9px 12px 9px 36px; border:1px solid ${T.border}; border-radius:9px; font-size:13px; font-family:'Jost',sans-serif; background:${T.surface}; outline:none; color:${T.text}; }
  .search-wrap input::placeholder { color:${T.textMuted}; }
  .search-wrap input:focus { border-color:${T.primary}; box-shadow:0 0 0 3px ${T.primary}18; }
  .search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:${T.textMuted}; pointer-events:none; font-size:14px; }
  .filter-select { padding:9px 10px; border:1px solid ${T.border}; border-radius:9px; font-size:13px; font-family:'Jost',sans-serif; background:${T.surface}; outline:none; cursor:pointer; color:${T.textMid}; }
  .filter-select:focus { border-color:${T.primary}; }
  .results-info { font-size:12px; color:${T.textMuted}; margin-left:auto; white-space:nowrap; }
  .btn { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:9px; font-size:13px; font-family:'Jost',sans-serif; font-weight:500; cursor:pointer; border:none; transition:all .15s; white-space:nowrap; }
  .btn-primary { background:${T.primary}; color:#fff; }
  .btn-primary:hover { background:${T.primaryDark}; }
  .btn-ghost { background:transparent; color:${T.textMid}; border:1px solid ${T.border}; }
  .btn-ghost:hover { background:${T.surfaceAlt}; }
  .btn-danger { background:#FCE8EC; color:#7A1830; border:1px solid #F5C0CC; }
  .btn-danger:hover { background:#F5C0CC; }
  .btn-sm { padding:6px 12px; font-size:12px; border-radius:7px; }
  .btn:disabled { opacity:.4; cursor:not-allowed; }
  .table-wrap { background:${T.surface}; border-radius:14px; border:1px solid ${T.border}; overflow:hidden; }
  table { width:100%; border-collapse:collapse; }
  thead { background:${T.surfaceAlt}; }
  th { padding:11px 16px; text-align:left; font-size:10px; font-weight:500; color:${T.textMuted}; text-transform:uppercase; letter-spacing:.8px; border-bottom:1px solid ${T.border}; white-space:nowrap; cursor:pointer; user-select:none; }
  th:hover { color:${T.primary}; }
  th.no-sort { cursor:default; }
  th.no-sort:hover { color:${T.textMuted}; }
  td { padding:11px 16px; font-size:13px; color:${T.textMid}; border-bottom:1px solid ${T.borderLight}; vertical-align:middle; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:#FDF0F4; }
  .name-cell { font-weight:500; color:${T.text}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:0; }
  .rsvp-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:500; cursor:pointer; border:none; font-family:'Jost',sans-serif; transition:opacity .15s; white-space:nowrap; }
  .rsvp-badge:hover { opacity:.8; }
  .rsvp-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .cat-badge { display:inline-block; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:500; }
  .table-tag { display:inline-block; background:${T.tag}; color:${T.tagText}; border-radius:6px; font-size:11px; padding:2px 8px; font-weight:500; }
  .action-btn { background:none; border:none; cursor:pointer; padding:5px 6px; border-radius:7px; color:${T.textMuted}; font-size:15px; transition:all .15s; line-height:1; }
  .action-btn:hover { background:${T.primaryBg}; color:${T.primary}; }
  .action-btn.del:hover { background:#FCE8EC; color:#E84060; }
  .inv-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; border-radius:20px; font-size:11px; font-weight:500; cursor:pointer; border:none; font-family:'Jost',sans-serif; transition:all .15s; white-space:nowrap; }
  .inv-badge:hover { opacity:.85; transform:scale(1.03); }
  .inv-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .inv-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
  .inv-progress-card { background:${T.surface}; border-radius:14px; padding:22px; border:1px solid ${T.border}; margin-bottom:24px; }
  .inv-progress-title { font-size:10px; color:${T.textMuted}; font-weight:500; text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; }
  .progress-bar-wrap { background:${T.borderLight}; border-radius:20px; height:12px; overflow:hidden; display:flex; }
  .progress-seg { height:100%; transition:width .4s; }
  .progress-legend { display:flex; gap:16px; margin-top:10px; flex-wrap:wrap; }
  .progress-legend-item { display:flex; align-items:center; gap:6px; font-size:12px; color:${T.textMid}; }
  .bulk-bar { display:flex; align-items:center; gap:12px; background:${T.header}; border-radius:10px; padding:12px 18px; margin-bottom:14px; }
  .bulk-text { font-size:13px; color:${T.headerText}; flex:1; }
  .bulk-actions { display:flex; gap:8px; }
  .bulk-btn { padding:6px 14px; border-radius:7px; font-size:12px; font-weight:500; font-family:'Jost',sans-serif; cursor:pointer; border:none; transition:all .15s; }
  .cb { width:16px; height:16px; border-radius:4px; border:1.5px solid ${T.border}; cursor:pointer; appearance:none; flex-shrink:0; background:${T.surface}; transition:all .15s; display:grid; place-items:center; }
  .cb:checked { background:${T.primary}; border-color:${T.primary}; }
  .cb:checked::after { content:'✓'; font-size:11px; color:#fff; line-height:1; }
  .modal-overlay { position:fixed; inset:0; background:rgba(61,24,41,.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
  .modal { background:${T.surface}; border-radius:18px; width:100%; max-width:540px; max-height:90vh; overflow-y:auto; border:1px solid ${T.border}; }
  .modal-header { padding:26px 30px 0; display:flex; align-items:center; justify-content:space-between; }
  .modal-title { font-family:'Cormorant Garamond',serif; font-size:24px; font-weight:600; color:${T.text}; }
  .modal-body { padding:22px 30px 30px; }
  .form-group { margin-bottom:16px; }
  .form-label { display:block; font-size:10px; font-weight:500; color:${T.textMuted}; text-transform:uppercase; letter-spacing:.8px; margin-bottom:7px; }
  .form-label em { color:${T.textMuted}; font-weight:300; text-transform:none; letter-spacing:0; font-style:normal; margin-left:4px; font-size:10px; opacity:.7; }
  .form-input { width:100%; padding:10px 13px; border:1px solid ${T.border}; border-radius:9px; font-size:14px; font-family:'Jost',sans-serif; outline:none; color:${T.text}; background:${T.surface}; }
  .form-input:focus { border-color:${T.primary}; box-shadow:0 0 0 3px ${T.primary}18; }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .divider { border:none; border-top:1px solid ${T.borderLight}; margin:18px 0; }
  .count-box { background:${T.surfaceAlt}; border-radius:11px; padding:18px; margin-bottom:16px; border:1px solid ${T.borderLight}; }
  .count-box-title { font-size:10px; color:${T.textMuted}; font-weight:500; text-transform:uppercase; letter-spacing:.8px; margin-bottom:16px; }
  .count-fields { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .count-field-label { font-size:12px; font-weight:500; color:${T.textMid}; margin-bottom:8px; }
  .count-field-hint { font-size:11px; color:${T.textMuted}; margin-top:6px; }
  .counter-row { display:flex; align-items:center; gap:10px; }
  .counter-btn { width:32px; height:32px; border-radius:50%; border:1px solid ${T.border}; background:${T.surface}; cursor:pointer; font-size:18px; color:${T.textMid}; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; }
  .counter-btn:hover { background:${T.primary}; color:#fff; border-color:${T.primary}; }
  .counter-val { width:36px; text-align:center; font-size:22px; font-weight:600; color:${T.text}; font-family:'Cormorant Garamond',serif; }
  .clear-link { font-size:11px; color:${T.textMuted}; text-decoration:underline; cursor:pointer; background:none; border:none; font-family:'Jost',sans-serif; margin-left:6px; }
  .clear-link:hover { color:${T.primary}; }
  .partial-banner { background:#FFF8E8; border:1px solid #F0D890; border-radius:9px; padding:10px 14px; font-size:12px; color:#7A5000; margin-top:10px; line-height:1.5; }
  .rsvp-picker { display:flex; gap:8px; }
  .rsvp-pick-btn { flex:1; padding:9px 6px; border-radius:9px; border:2px solid transparent; cursor:pointer; font-size:12px; font-weight:500; font-family:'Jost',sans-serif; transition:all .15s; }
  .modal-footer { display:flex; gap:10px; justify-content:flex-end; padding-top:16px; border-top:1px solid ${T.borderLight}; margin-top:4px; }
  .confirm-overlay { position:fixed; inset:0; background:rgba(61,24,41,.5); display:flex; align-items:center; justify-content:center; z-index:1100; }
  .confirm-box { background:${T.surface}; border-radius:16px; padding:30px 34px; max-width:380px; width:100%; text-align:center; border:1px solid ${T.border}; }
  .confirm-title { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:600; color:${T.text}; margin-bottom:10px; }
  .confirm-sub { font-size:13px; color:${T.textMuted}; margin-bottom:26px; line-height:1.5; }
  .confirm-btns { display:flex; gap:10px; justify-content:center; }
  .cat-manager { max-width:700px; }
  .cat-manager-list { display:flex; flex-direction:column; gap:10px; margin-bottom:24px; }
  .cat-manager-row { display:flex; align-items:center; gap:12px; background:${T.surface}; border:1px solid ${T.border}; border-radius:12px; padding:12px 16px; }
  .cat-manager-row:hover { border-color:${T.primary}40; }
  .cat-color-swatch { width:34px; height:34px; border-radius:9px; flex-shrink:0; cursor:pointer; border:2px solid transparent; transition:transform .15s; position:relative; }
  .cat-color-swatch:hover { transform:scale(1.08); }
  .cat-name-input { flex:1; border:none; background:transparent; font-size:14px; font-family:'Jost',sans-serif; color:${T.text}; outline:none; padding:4px 0; }
  .cat-name-input:focus { border-bottom:1.5px solid ${T.primary}; }
  .cat-guest-count { font-size:12px; color:${T.textMuted}; white-space:nowrap; min-width:80px; text-align:right; }
  .cat-del-btn { background:none; border:none; cursor:pointer; color:${T.textMuted}; font-size:16px; padding:5px; border-radius:6px; line-height:1; transition:all .15s; flex-shrink:0; }
  .cat-del-btn:hover:not(:disabled) { color:#E84060; background:#FCE8EC; }
  .cat-del-btn:disabled { opacity:.25; cursor:not-allowed; }
  .add-cat-row { display:flex; gap:10px; align-items:center; background:${T.surfaceAlt}; border:1.5px dashed ${T.border}; border-radius:12px; padding:16px; }
  .add-cat-input { flex:1; border:1px solid ${T.border}; border-radius:9px; padding:10px 13px; font-size:13px; font-family:'Jost',sans-serif; outline:none; background:${T.surface}; color:${T.text}; }
  .add-cat-input:focus { border-color:${T.primary}; box-shadow:0 0 0 3px ${T.primary}18; }
  .cat-manager-hint { font-size:13px; color:${T.textMuted}; margin-bottom:26px; line-height:1.7; }
  .color-picker-popover { display:flex; flex-wrap:wrap; gap:6px; padding:10px; background:${T.surface}; border:1px solid ${T.border}; border-radius:11px; position:absolute; top:38px; left:0; z-index:50; width:188px; }
  .color-option { width:26px; height:26px; border-radius:7px; cursor:pointer; border:2px solid transparent; transition:transform .1s; }
  .color-option:hover { transform:scale(1.12); }
  .color-option.sel { border-color:${T.text}; }
  .toast { position:fixed; bottom:28px; right:28px; background:${T.header}; color:${T.headerText}; padding:13px 22px; border-radius:12px; font-size:13px; font-weight:500; z-index:2000; animation:fadeup .2s; border:1px solid #5C2840; }
  @keyframes fadeup { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .empty { text-align:center; padding:60px 20px; }
  ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:${T.surfaceAlt}} ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
`;

// ── Small shared components ───────────────────────────────────────────────────

function RsvpBadge({ rsvp, onChange }) {
  const cfg = RSVP_CONFIG[rsvp]||RSVP_CONFIG.pending;
  const cycle = {confirmed:"pending",pending:"declined",declined:"confirmed"};
  return <button className="rsvp-badge" style={{background:cfg.bg,color:cfg.color}} onClick={()=>onChange(cycle[rsvp])} title="Click to cycle"><span className="rsvp-dot" style={{background:cfg.dot}}/>{cfg.label}</button>;
}

function InvBadge({ status, onChange }) {
  const cfg = INVITE_STATUS[status]||INVITE_STATUS.not_sent;
  const cycle = {not_sent:"sent",sent:"delivered",delivered:"not_sent"};
  return <button className="inv-badge" style={{background:cfg.bg,color:cfg.color}} onClick={()=>onChange(cycle[status])} title="Click to cycle"><span className="inv-dot" style={{background:cfg.dot}}/>{cfg.label}</button>;
}

function CatBadge({ category, categories }) {
  const cat = categories.find(c=>c.name===category);
  const color = cat?.color||T.primary;
  return <span className="cat-badge" style={{background:color+"22",color}}>{category.replace(" Invites","")}</span>;
}

function CountDisplay({ g }) {
  const att = getAttending(g);
  const partial = g.attendingCount!=null && g.attendingCount!==g.count;
  if(g.count===0) return <span style={{color:T.textMuted,fontSize:12}}>TBC</span>;
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:13}}><span style={{fontWeight:600,color:partial?"#C08020":T.text}}>{att}</span>{partial&&<><span style={{color:T.textMuted,margin:"0 1px"}}>/</span><span style={{color:T.textMuted,fontSize:12}}>{g.count}</span></>}</span>;
}

function ColorPicker({ value, onChange }) {
  const [open,setOpen]=useState(false);
  return <div style={{position:"relative"}}><div className="cat-color-swatch" style={{background:value}} onClick={()=>setOpen(o=>!o)}/>{open&&(<><div style={{position:"fixed",inset:0,zIndex:49}} onClick={()=>setOpen(false)}/><div className="color-picker-popover">{PALETTE.map(c=><div key={c} className={`color-option${value===c?" sel":""}`} style={{background:c}} onClick={()=>{onChange(c);setOpen(false);}}/>)}</div></>)}</div>;
}

// ── Invitations Tab ───────────────────────────────────────────────────────────

function InvitationsTab({ guests, updateGuests, categories, showToast }) {
  const [search,setSearch]=useState("");
  const [filterStatus,setFilterStatus]=useState("all");
  const [filterCat,setFilterCat]=useState("all");
  const [selected,setSelected]=useState(new Set());
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [user,setUser]=useState(null);

  const notSent=guests.filter(g=>(!g.inviteStatus||g.inviteStatus==="not_sent")).length;
  const sent=guests.filter(g=>g.inviteStatus==="sent").length;
  const delivered=guests.filter(g=>g.inviteStatus==="delivered").length;
  const total=guests.length;

  const filtered=guests.filter(g=>{
    const s=g.inviteStatus||"not_sent";
    if(search&&!g.name.toLowerCase().includes(search.toLowerCase())) return false;
    if(filterStatus!=="all"&&s!==filterStatus) return false;
    if(filterCat!=="all"&&g.category!==filterCat) return false;
    return true;
  }).sort((a,b)=>{
    let av,bv;
    if(sortCol==="status"){av=(a.inviteStatus||"not_sent");bv=(b.inviteStatus||"not_sent");}
    else if(sortCol==="date"){av=a.inviteSentDate||"";bv=b.inviteSentDate||"";}
    else if(sortCol==="category"){av=a.category;bv=b.category;}
    else{av=a.name.toLowerCase();bv=b.name.toLowerCase();}
    return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1);
  });

  const handleSort=(col)=>{if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("asc");}};
  const toggleSelect=(id)=>{setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});};
  const toggleAll=()=>{if(selected.size===filtered.length)setSelected(new Set());else setSelected(new Set(filtered.map(g=>g.id)));};

  const updateStatus=(ids,status)=>{
    const dateVal=(status==="sent"||status==="delivered")?today():null;
    updateGuests(guests.map(g=>ids.includes(g.id)?{...g,inviteStatus:status,inviteSentDate:dateVal}:g));
    setSelected(new Set());
    const lbl=status==="not_sent"?"Not Sent":status==="sent"?"Sent":"Delivered";
    showToast(`${ids.length} guest${ids.length!==1?"s":""} marked as ${lbl} ✓`);
  };

  const handleSingle=(id,newStatus)=>{
    const dateVal=(newStatus==="sent"||newStatus==="delivered")?today():null;
    updateGuests(guests.map(g=>g.id===id?{...g,inviteStatus:newStatus,inviteSentDate:dateVal}:g));
  };

  const SH=({col})=>(<span style={{color:sortCol===col?T.primary:T.borderLight,marginLeft:4,fontSize:10}}>{sortCol===col?(sortDir==="asc"?"▲":"▼"):"⇅"}</span>);

  const pctD=total>0?Math.round((delivered/total)*100):0;
  const pctS=total>0?Math.round((sent/total)*100):0;
  const pctN=100-pctD-pctS;

  return(
    <div>
      <div className="top-bar">
        <h2 className="page-title">Invitations</h2>
        {selected.size>0&&<div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>updateStatus([...selected],"not_sent")}>Mark Not Sent</button>
          <button className="btn btn-ghost btn-sm" style={{borderColor:"#4A7ADE",color:"#2A4A8E",background:"#EAF0FB"}} onClick={()=>updateStatus([...selected],"sent")}>Mark Sent</button>
          <button className="btn btn-primary btn-sm" onClick={()=>updateStatus([...selected],"delivered")}>Mark Delivered</button>
        </div>}
      </div>

      <div className="inv-stats">
        {[
          {label:"Not Sent",value:notSent,ac:INVITE_STATUS.not_sent.dot,vc:INVITE_STATUS.not_sent.color,f:"not_sent"},
          {label:"Sent",value:sent,ac:INVITE_STATUS.sent.dot,vc:INVITE_STATUS.sent.color,f:"sent"},
          {label:"Delivered",value:delivered,ac:INVITE_STATUS.delivered.dot,vc:INVITE_STATUS.delivered.color,f:"delivered"},
        ].map(s=>(
          <div key={s.label} className="stat-card" style={{"--ac":s.ac,cursor:"pointer"}} onClick={()=>setFilterStatus(filterStatus===s.f?"all":s.f)}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color:s.vc}}>{s.value}</div>
            <div className="stat-sub">{total>0?Math.round(s.value/total*100):0}% of {total} groups {filterStatus===s.f?"· filtered":""}</div>
          </div>
        ))}
      </div>

      <div className="inv-progress-card">
        <div className="inv-progress-title">Overall progress</div>
        <div className="progress-bar-wrap">
          <div className="progress-seg" style={{width:`${pctD}%`,background:INVITE_STATUS.delivered.dot}}/>
          <div className="progress-seg" style={{width:`${pctS}%`,background:INVITE_STATUS.sent.dot}}/>
          <div className="progress-seg" style={{width:`${pctN}%`,background:T.borderLight}}/>
        </div>
        <div className="progress-legend">
          {[{label:"Delivered",pct:pctD,color:INVITE_STATUS.delivered.dot},{label:"Sent",pct:pctS,color:INVITE_STATUS.sent.dot},{label:"Not Sent",pct:pctN,color:T.textMuted}].map(l=>(
            <div key={l.label} className="progress-legend-item"><span style={{width:10,height:10,borderRadius:"50%",background:l.color,display:"inline-block"}}/>{l.label} <b style={{marginLeft:3}}>{l.pct}%</b></div>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrap"><span className="search-icon">🔍</span><input placeholder="Search guests…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option><option value="not_sent">Not Sent</option><option value="sent">Sent</option><option value="delivered">Delivered</option>
        </select>
        <select className="filter-select" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="all">All categories</option>{categories.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {(search||filterStatus!=="all"||filterCat!=="all")&&<button className="btn btn-ghost" style={{padding:"7px 12px"}} onClick={()=>{setSearch("");setFilterStatus("all");setFilterCat("all");}}>✕ Clear</button>}
        <span className="results-info">{filtered.length} of {total} groups</span>
      </div>

      {selected.size>0&&(
        <div className="bulk-bar">
          <span className="bulk-text">{selected.size} guest{selected.size!==1?"s":""} selected</span>
          <div className="bulk-actions">
            <button className="bulk-btn" style={{background:"#F0DCE5",color:"#8E3D5F"}} onClick={()=>updateStatus([...selected],"not_sent")}>Not Sent</button>
            <button className="bulk-btn" style={{background:"#EAF0FB",color:"#2A4A8E"}} onClick={()=>updateStatus([...selected],"sent")}>Sent</button>
            <button className="bulk-btn" style={{background:"#2DBD72",color:"#fff"}} onClick={()=>updateStatus([...selected],"delivered")}>Delivered</button>
            <button className="bulk-btn" style={{background:"rgba(255,255,255,.1)",color:T.headerText}} onClick={()=>setSelected(new Set())}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        {filtered.length===0?(
          <div className="empty"><div style={{fontSize:36,marginBottom:12}}>🪷</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.textMuted}}>No guests found</div></div>
        ):(
          <table>
            <thead><tr>
              <th className="no-sort" style={{width:44}}><input type="checkbox" className="cb" checked={selected.size>0&&selected.size===filtered.length} onChange={toggleAll}/></th>
              <th style={{width:"24%"}} onClick={()=>handleSort("name")}>Name <SH col="name"/></th>
              <th style={{width:"17%"}} onClick={()=>handleSort("category")}>Category <SH col="category"/></th>
              <th style={{width:"15%"}} onClick={()=>handleSort("status")}>Invite Status <SH col="status"/></th>
              <th style={{width:"15%"}} onClick={()=>handleSort("date")}>Date Sent <SH col="date"/></th>
              <th style={{width:"13%"}} className="no-sort">RSVP</th>
              <th style={{width:"12%",textAlign:"right"}} className="no-sort">Quick Set</th>
            </tr></thead>
            <tbody>
              {filtered.map(g=>{
                const status=g.inviteStatus||"not_sent";
                return(
                  <tr key={g.id} style={{background:selected.has(g.id)?T.primaryBg:""}}>
                    <td><input type="checkbox" className="cb" checked={selected.has(g.id)} onChange={()=>toggleSelect(g.id)}/></td>
                    <td className="name-cell" title={g.name}>{g.name}</td>
                    <td><CatBadge category={g.category} categories={categories}/></td>
                    <td><InvBadge status={status} onChange={s=>handleSingle(g.id,s)}/></td>
                    <td style={{fontSize:12,color:T.textMuted}}>{g.inviteSentDate?fmtDate(g.inviteSentDate):<span style={{color:T.borderLight}}>—</span>}</td>
                    <td><span className="rsvp-badge" style={{background:RSVP_CONFIG[g.rsvp||"pending"].bg,color:RSVP_CONFIG[g.rsvp||"pending"].color,cursor:"default"}}><span className="rsvp-dot" style={{background:RSVP_CONFIG[g.rsvp||"pending"].dot}}/>{RSVP_CONFIG[g.rsvp||"pending"].label}</span></td>
                    <td style={{textAlign:"right"}}>
                      {status!=="delivered"?<button className="btn btn-primary btn-sm" onClick={()=>handleSingle(g.id,status==="not_sent"?"sent":"delivered")}>{status==="not_sent"?"Mark Sent":"Mark Delivered"}</button>:<span style={{fontSize:20}}>✅</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Category Manager ──────────────────────────────────────────────────────────

function CategoryManager({ categories, setCategories, guests, showToast }) {
  const [newName,setNewName]=useState("");
  const [newColor,setNewColor]=useState(PALETTE[5]);
  const handleRename=(idx,name)=>{const old=categories[idx].name;if(!name.trim()||name===old)return;setCategories(categories.map((c,i)=>i===idx?{...c,name:name.trim()}:c),old,name.trim());showToast(`Renamed to "${name.trim()}" ✓`);};
  const handleRecolor=(idx,color)=>setCategories(categories.map((c,i)=>i===idx?{...c,color}:c));
  const handleAdd=()=>{const t=newName.trim();if(!t)return;if(categories.find(c=>c.name.toLowerCase()===t.toLowerCase())){showToast("Already exists");return;}setCategories([...categories,{name:t,color:newColor}]);setNewName("");setNewColor(PALETTE[Math.floor(Math.random()*PALETTE.length)]);showToast(`"${t}" added ✓`);};
  const handleDelete=(idx)=>{const cat=categories[idx];const n=guests.filter(g=>g.category===cat.name).length;if(n>0){showToast(`${n} guest${n!==1?"s":""} in this category — reassign first`);return;}setCategories(categories.filter((_,i)=>i!==idx));showToast(`"${cat.name}" removed`);};
  return(
    <div className="cat-manager">
      <div className="top-bar"><h2 className="page-title">Categories</h2></div>
      <p className="cat-manager-hint">Click the colour swatch to change it · Click the name to rename · Categories with guests can't be deleted.</p>
      <div className="cat-manager-list">
        {categories.map((cat,idx)=>{
          const gCount=guests.filter(g=>g.category===cat.name).length;
          const attCount=guests.filter(g=>g.category===cat.name).reduce((a,g)=>a+getAttending(g),0);
          return(<div className="cat-manager-row" key={cat.name+idx}><ColorPicker value={cat.color} onChange={color=>handleRecolor(idx,color)}/><input className="cat-name-input" defaultValue={cat.name} onBlur={e=>handleRename(idx,e.target.value)} onKeyDown={e=>e.key==="Enter"&&e.target.blur()}/><span className="cat-guest-count">{gCount} groups · {attCount} attending</span><button className="cat-del-btn" disabled={gCount>0} onClick={()=>handleDelete(idx)} title={gCount>0?"Reassign guests first":"Delete"}>✕</button></div>);
        })}
      </div>
      <div className="add-cat-row"><ColorPicker value={newColor} onChange={setNewColor}/><input className="add-cat-input" placeholder="New category e.g. Isuru's Invites" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdd()}/><button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>+ Add</button></div>
    </div>
  );
}

// ── Guest Modal ───────────────────────────────────────────────────────────────

function GuestModal({ guest, categories, onClose, onSave }) {
  const isNew=!guest.id;
  const [form,setForm]=useState({name:guest.name||"",category:guest.category||categories[0]?.name||"",count:guest.count??1,attendingCount:guest.attendingCount??null,rsvp:guest.rsvp||"pending",table:guest.table!=null?String(guest.table):"",notes:guest.notes||""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const invN=Math.max(0,Number(form.count)||0);
  const hasP=form.attendingCount!==null;
  const attN=hasP?Math.min(invN,Math.max(0,Number(form.attendingCount)||0)):invN;
  const isP=hasP&&attN!==invN;
  const handleSave=()=>{if(!form.name.trim())return;onSave({...guest,name:form.name.trim(),category:form.category,count:invN,attendingCount:hasP?attN:null,rsvp:form.rsvp,table:form.table===""?null:Number(form.table),notes:form.notes.trim()});};
  const CF=({label,hint,val,onDec,onInc,onClear,showClear})=>(<div><div className="count-field-label">{label}</div><div className="counter-row"><button type="button" className="counter-btn" onClick={onDec}>−</button><span className="counter-val">{val===null?"—":val}</span><button type="button" className="counter-btn" onClick={onInc}>+</button>{showClear&&<button type="button" className="clear-link" onClick={onClear}>reset</button>}</div><div className="count-field-hint">{hint}</div></div>);
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><span className="modal-title">{isNew?"Add Guest":"Edit Guest"}</span><button className="action-btn" onClick={onClose} style={{fontSize:20}}>✕</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Name / Group</label><input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Andrea Wijewansha" autoFocus/></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e=>set("category",e.target.value)}>{categories.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Table No. <em>optional</em></label><input className="form-input" type="number" min="1" value={form.table} onChange={e=>set("table",e.target.value)} placeholder="Unassigned"/></div>
          </div>
          <hr className="divider"/>
          <div className="count-box">
            <div className="count-box-title">Headcount</div>
            <div className="count-fields">
              <CF label="Invited" hint="Total in the group" val={invN} onDec={()=>{const n=Math.max(0,invN-1);set("count",n);if(hasP&&attN>n)set("attendingCount",n);}} onInc={()=>set("count",invN+1)} showClear={false}/>
              <CF label="Attending" hint={hasP?(isP?`${attN} of ${invN}`:"All coming"):"Same as invited"} val={hasP?attN:null} onDec={()=>{const c=hasP?attN:invN;set("attendingCount",Math.max(0,c-1));}} onInc={()=>{const c=hasP?attN:invN;set("attendingCount",Math.min(invN,c+1));}} onClear={()=>set("attendingCount",null)} showClear={hasP}/>
            </div>
            {isP&&<div className="partial-banner">Only <b>{attN}</b> of <b>{invN}</b> are attending.</div>}
            {!hasP&&<div style={{fontSize:11,color:T.textMuted,marginTop:10}}>Hit − on Attending to set a partial count.</div>}
          </div>
          <div className="form-group"><label className="form-label">RSVP Status</label><div className="rsvp-picker">{Object.entries(RSVP_CONFIG).map(([k,v])=><button key={k} type="button" className="rsvp-pick-btn" style={{background:form.rsvp===k?v.bg:"#f5f5f5",color:form.rsvp===k?v.color:T.textMuted,borderColor:form.rsvp===k?v.dot:"transparent"}} onClick={()=>set("rsvp",k)}>{v.label}</button>)}</div></div>
          <div className="form-group"><label className="form-label">Notes <em>optional</em></label><input className="form-input" value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any extra details..."/></div>
          <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>{isNew?"Add Guest":"Save Changes"}</button></div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ guests, categories }) {
  const totalInvited=guests.reduce((a,g)=>a+g.count,0);
  const totalAttending=guests.reduce((a,g)=>a+getAttending(g),0);
  const confirmedAtt=guests.filter(g=>g.rsvp==="confirmed").reduce((a,g)=>a+getAttending(g),0);
  const pendingAtt=guests.filter(g=>g.rsvp==="pending").reduce((a,g)=>a+getAttending(g),0);
  const declinedAtt=guests.filter(g=>g.rsvp==="declined").reduce((a,g)=>a+getAttending(g),0);
  const catData=categories.map(cat=>({name:cat.name,color:cat.color,people:guests.filter(g=>g.category===cat.name).reduce((a,g)=>a+getAttending(g),0),entries:guests.filter(g=>g.category===cat.name).length}));
  const maxPeople=Math.max(...catData.map(d=>d.people),1);
  const pieData=[{name:"Confirmed",value:confirmedAtt,color:"#2DBD72"},{name:"Pending",value:pendingAtt,color:"#E8A020"},{name:"Declined",value:declinedAtt,color:"#E84060"}].filter(d=>d.value>0);
  const tables=[...new Set(guests.map(g=>g.table).filter(Boolean))].sort((a,b)=>a-b);
  const invSent=guests.filter(g=>g.inviteStatus==="sent"||g.inviteStatus==="delivered").length;
  return(
    <div>
      <div className="stat-grid">
        {[{label:"Attending",value:totalAttending,sub:`of ${totalInvited} invited · ${guests.length} groups`,ac:T.primary},{label:"Confirmed",value:confirmedAtt,sub:`${totalAttending>0?Math.round(confirmedAtt/totalAttending*100):0}% of attending`,ac:"#2DBD72"},{label:"Pending RSVP",value:pendingAtt,sub:`${guests.filter(g=>g.rsvp==="pending").length} groups awaiting`,ac:"#E8A020"},{label:"Invites Sent",value:invSent,sub:`of ${guests.length} total groups`,ac:INVITE_STATUS.sent.dot}].map(s=>(
          <div key={s.label} className="stat-card" style={{"--ac":s.ac}}><div className="stat-label">{s.label}</div><div className="stat-value" style={{color:s.ac===T.primary?T.text:s.ac}}>{s.value}</div><div className="stat-sub">{s.sub}</div></div>
        ))}
      </div>
      <div className="charts-row">
        <div className="card"><div className="card-title">Attending by category</div><div className="cat-list">{catData.filter(d=>d.entries>0).map(d=>(<div key={d.name} className="cat-row"><span className="cat-dot" style={{background:d.color}}/><span className="cat-name">{d.name}</span><div className="cat-bar-wrap"><div className="cat-bar" style={{width:`${(d.people/maxPeople)*100}%`,background:d.color}}/></div><span className="cat-num">{d.people}</span><span style={{fontSize:11,color:T.textMuted,minWidth:54,textAlign:"right"}}>{d.entries} groups</span></div>))}</div></div>
        <div className="card"><div className="card-title">RSVP breakdown</div>{pieData.length===0?<div style={{color:T.textMuted,fontSize:13,textAlign:"center",padding:"30px 0"}}>No RSVP data yet</div>:(<><ResponsiveContainer width="100%" height={160}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={3} dataKey="value">{pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={(v,n)=>[v+" people",n]}/></PieChart></ResponsiveContainer><div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginTop:8}}>{pieData.map(d=><div key={d.name} style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:d.color,display:"inline-block"}}/><span style={{fontSize:11,color:T.textMid}}>{d.name}: <b>{d.value}</b></span></div>)}</div></>)}</div>
      </div>
      <div className="card"><div className="card-title">Table summary</div>{tables.length===0?<span style={{color:T.textMuted,fontSize:13}}>No tables assigned yet</span>:<div className="table-summary">{tables.map(t=>{const tg=guests.filter(g=>g.table===t);const tc=tg.reduce((a,g)=>a+getAttending(g),0);return<div key={t} className="table-chip"><div className="table-chip-label">Table {t}</div><div className="table-chip-val">{tc}</div><div className="table-chip-sub">{tg.length} group{tg.length!==1?"s":""}</div></div>;})}{ guests.filter(g=>!g.table).length>0&&<div className="table-chip" style={{border:`1.5px dashed ${T.border}`,background:"transparent"}}><div className="table-chip-label">Unassigned</div><div className="table-chip-val" style={{color:T.textMuted}}>{guests.filter(g=>!g.table).reduce((a,g)=>a+getAttending(g),0)}</div><div className="table-chip-sub">{guests.filter(g=>!g.table).length} groups</div></div>}</div>}</div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [guests,setGuests]=useState([]);
  const [categories,setCategories]=useState(DEFAULT_CATEGORIES);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("dashboard");
  const [search,setSearch]=useState("");
  const [filterCat,setFilterCat]=useState("all");
  const [filterRsvp,setFilterRsvp]=useState("all");
  const [filterTable,setFilterTable]=useState("all");
  const [modalGuest,setModalGuest]=useState(null);
  const [confirmId,setConfirmId]=useState(null);
  const [toast,setToast]=useState(null);
  const [nextId,setNextId]=useState(101);
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [user,setUser]=useState(null);

  const [splash, setSplash] = useState(true);

  // ── Firebase realtime sync ────────────────────────────────────────
  useEffect(()=>{

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (!u) {
        setLoading(false);
        return;
      }

      const unsubGuests = onSnapshot(
        doc(db, "wedding", "guests"),
        async (snap) => {

          if (snap.exists()) {
            const data = snap.data();

            setGuests(data.guests || INITIAL_GUESTS);
            setCategories(data.categories || DEFAULT_CATEGORIES);

            setNextId(
              Math.max(
                ...(data.guests || []).map(g=>g.id),
                100
              ) + 1
            );
          } else {
            await setDoc(doc(db, "wedding", "guests"), {
              guests: INITIAL_GUESTS,
              categories: DEFAULT_CATEGORIES
            });

            setGuests(INITIAL_GUESTS);
            setCategories(DEFAULT_CATEGORIES);
          }

          setLoading(false);
        }
      );

      return () => unsubGuests();
    });

    const t = setTimeout(()=>setSplash(false), 2200);

    return ()=>{
      clearTimeout(t);
      unsubAuth();
    };

  },[]);

  const saveToCloud = async (updatedGuests, updatedCategories) => {
    await setDoc(
      doc(db, "wedding", "guests"),
      {
        guests: updatedGuests,
        categories: updatedCategories
      }
    );
  };

  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),2400);};
  const updateGuests=async(gs)=>{setGuests(gs);await saveToCloud(gs,categories);};

  const smartSetCategories=(newCats,renamedFrom,renamedTo)=>{
    setCategories(newCats); saveToCloud(guests,newCats);
    if(renamedFrom&&renamedTo){ const u=guests.map(g=>g.category===renamedFrom?{...g,category:renamedTo}:g); updateGuests(u); }
  };

  const handleRsvpChange=(id,rsvp)=>updateGuests(guests.map(g=>g.id===id?{...g,rsvp}:g));
  const handleSave=(guest)=>{
    let updated;
    if(!guest.id){updated=[...guests,{...guest,id:nextId,inviteStatus:guest.inviteStatus||"not_sent",inviteSentDate:guest.inviteSentDate||null}];setNextId(n=>n+1);showToast("Guest added ✓");}
    else{updated=guests.map(g=>g.id===guest.id?guest:g);showToast("Saved ✓");}
    updateGuests(updated);setModalGuest(null);
  };
  const handleDelete=(id)=>{updateGuests(guests.filter(g=>g.id!==id));setConfirmId(null);showToast("Guest removed");};
  const handleSort=(col)=>{if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("asc");}};

  const tables=[...new Set(guests.map(g=>g.table).filter(Boolean))].sort((a,b)=>a-b);
  const filtered=guests.filter(g=>{
    if(search&&!g.name.toLowerCase().includes(search.toLowerCase())&&!(g.notes||"").toLowerCase().includes(search.toLowerCase())) return false;
    if(filterCat!=="all"&&g.category!==filterCat) return false;
    if(filterRsvp!=="all"&&g.rsvp!==filterRsvp) return false;
    if(filterTable!=="all"){if(filterTable==="none"&&g.table)return false;if(filterTable!=="none"&&g.table!==Number(filterTable))return false;}
    return true;
  }).sort((a,b)=>{
    let av,bv;
    if(sortCol==="attending"){av=getAttending(a);bv=getAttending(b);}else if(sortCol==="table"){av=a.table||9999;bv=b.table||9999;}else if(sortCol==="count"){av=a.count;bv=b.count;}else{av=(a[sortCol]||"").toString().toLowerCase();bv=(b[sortCol]||"").toString().toLowerCase();}
    return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1);
  });

  const SH=({col})=>(<span style={{color:sortCol===col?T.primary:T.borderLight,marginLeft:4,fontSize:10}}>{sortCol===col?(sortDir==="asc"?"▲":"▼"):"⇅"}</span>);
  const invSentCount=guests.filter(g=>g.inviteStatus==="sent"||g.inviteStatus==="delivered").length;

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"\'Cormorant Garamond\',serif",fontSize:26,color:T.text}}>🪷</div>;

  if(!user) return <LoginScreen />;

  return(
    <>
      <style>{css}</style>
      <div className="app">
        <header className="header">
          <div className="header-brand"><span className="lotus-icon">🪷</span><div><div className="header-title">Thulani & Isuru</div><div className="header-sub">Wedding Guest Manager</div></div></div>
          <nav className="nav">
            <button className={`nav-btn${view==="dashboard"?" active":""}`} onClick={()=>setView("dashboard")}>Dashboard</button>
            <button className={`nav-btn${view==="guests"?" active":""}`} onClick={()=>setView("guests")}>Guest List<span className="nav-count">{guests.length}</span></button>
            <button className={`nav-btn${view==="invitations"?" active":""}`} onClick={()=>setView("invitations")}>Invitations<span className="nav-count">{invSentCount}/{guests.length}</span></button>
            <button className={`nav-btn${view==="categories"?" active":""}`} onClick={()=>setView("categories")}>Categories<span className="nav-count">{categories.length}</span></button>
          </nav><button className="btn btn-ghost" onClick={()=>signOut(auth)}>Logout</button>
        </header>

        <main className="main">
          {view==="dashboard"&&(<><div className="top-bar"><h2 className="page-title">Overview</h2><button className="btn btn-primary" onClick={()=>setView("guests")}>Manage guests →</button></div><Dashboard guests={guests} categories={categories}/></>)}

          {view==="guests"&&(
            <>
              <div className="top-bar"><h2 className="page-title">Guest List</h2><button className="btn btn-primary" onClick={()=>setModalGuest({})}>+ Add Guest</button></div>
              <div className="toolbar">
                <div className="search-wrap"><span className="search-icon">🔍</span><input placeholder="Search name or notes…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                <select className="filter-select" value={filterCat} onChange={e=>setFilterCat(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select>
                <select className="filter-select" value={filterRsvp} onChange={e=>setFilterRsvp(e.target.value)}><option value="all">All RSVP</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="declined">Declined</option></select>
                <select className="filter-select" value={filterTable} onChange={e=>setFilterTable(e.target.value)}><option value="all">All tables</option><option value="none">Unassigned</option>{tables.map(t=><option key={t} value={t}>Table {t}</option>)}</select>
                {(search||filterCat!=="all"||filterRsvp!=="all"||filterTable!=="all")&&<button className="btn btn-ghost" style={{padding:"7px 12px"}} onClick={()=>{setSearch("");setFilterCat("all");setFilterRsvp("all");setFilterTable("all");}}>✕ Clear</button>}
                <span className="results-info">{filtered.length}/{guests.length} groups · {filtered.reduce((a,g)=>a+getAttending(g),0)} attending</span>
              </div>
              <div className="table-wrap">
                {filtered.length===0?<div className="empty"><div style={{fontSize:36,marginBottom:12}}>🪷</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.textMuted}}>No guests found</div></div>:(
                  <table><thead><tr>
                    <th style={{width:"22%"}} onClick={()=>handleSort("name")}>Name <SH col="name"/></th>
                    <th style={{width:"16%"}} onClick={()=>handleSort("category")}>Category <SH col="category"/></th>
                    <th style={{width:"11%"}} onClick={()=>handleSort("attending")}>Attending <SH col="attending"/></th>
                    <th style={{width:"14%"}}>RSVP</th>
                    <th style={{width:"8%",textAlign:"center"}} onClick={()=>handleSort("table")}>Table <SH col="table"/></th>
                    <th style={{width:"17%"}}>Notes</th>
                    <th style={{width:"12%",textAlign:"right"}}>Actions</th>
                  </tr></thead><tbody>
                    {filtered.map(g=>(
                      <tr key={g.id}>
                        <td className="name-cell" title={g.name}>{g.name}</td>
                        <td><CatBadge category={g.category} categories={categories}/></td>
                        <td><CountDisplay g={g}/></td>
                        <td><RsvpBadge rsvp={g.rsvp} onChange={rsvp=>handleRsvpChange(g.id,rsvp)}/></td>
                        <td style={{textAlign:"center"}}>{g.table?<span className="table-tag">T{g.table}</span>:<span style={{color:T.borderLight}}>—</span>}</td>
                        <td style={{fontSize:12,color:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:0}} title={g.notes||""}>{g.notes||<span style={{color:T.borderLight}}>—</span>}</td>
                        <td style={{textAlign:"right"}}><button className="action-btn" onClick={()=>setModalGuest(g)} title="Edit">✏️</button><button className="action-btn del" onClick={()=>setConfirmId(g.id)} title="Remove">🗑</button></td>
                      </tr>
                    ))}
                  </tbody></table>
                )}
              </div>
            </>
          )}

          {view==="invitations"&&<InvitationsTab guests={guests} updateGuests={updateGuests} categories={categories} showToast={showToast}/>}
          {view==="categories"&&<CategoryManager categories={categories} setCategories={smartSetCategories} guests={guests} showToast={showToast}/>}
        </main>
      </div>

      {modalGuest!==null&&<GuestModal guest={modalGuest} categories={categories} onClose={()=>setModalGuest(null)} onSave={handleSave}/>}
      {confirmId&&(<div className="confirm-overlay"><div className="confirm-box"><div className="confirm-title">Remove guest?</div><div className="confirm-sub">"{guests.find(g=>g.id===confirmId)?.name}" will be permanently removed.</div><div className="confirm-btns"><button className="btn btn-ghost" onClick={()=>setConfirmId(null)}>Cancel</button><button className="btn btn-danger" onClick={()=>handleDelete(confirmId)}>Remove</button></div></div></div>)}
      {toast&&<div className="toast">{toast}</div>}
    </>
  );
}
