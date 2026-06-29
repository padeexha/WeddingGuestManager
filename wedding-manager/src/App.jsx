import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { db, auth } from "./firebase";
import LoginScreen from "./LoginScreen";
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
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

const ADMIN_EMAIL = "admin@tiw.com";
const isAdminUser = (user) => user?.email?.toLowerCase() === ADMIN_EMAIL;
const auditCollection = () => collection(db, "wedding", "guests", "auditLogs");
const logAuditEvent = async (user, action, details={}) => {
  if(!user) return;
  try {
    await addDoc(auditCollection(), {
      action,
      details,
      userEmail:user.email||"unknown",
      userName:user.displayName||user.email?.split("@")[0]||"Unknown user",
      userUid:user.uid||null,
      createdAt:serverTimestamp(),
    });
  } catch (err) {
    console.warn("Audit log failed", err);
  }
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

// Canonical categories & guests restored from PDF exports (9 Jun 2026)
const RESTORED_CATEGORIES = [
  { name:"Neighbours",           color:"#6A8FAA" },
  { name:"Lihini's Invites",     color:"#AA7A6A" },
  { name:"Thulani's Invites",    color:"#7AAA8F" },
  { name:"Sanjeewa's Relations", color:"#A0547A" },
  { name:"Sanjeewa's Friends",   color:"#7A6BAA" },
  { name:"Ushani's Relations",   color:"#B07A54" },
  { name:"Ushani's Friends",     color:"#54B07A" },
  { name:"Audio & Photography",  color:"#B05490" },
];

const MKG = (id,name,cat,count,inviteStatus="not_sent",inviteSentDate=null,table=null,notes="") =>
  ({id,name,category:cat,count,attendingCount:null,rsvp:"pending",table,notes,inviteStatus,inviteSentDate});

const RESTORED_GUESTS = [
  // Neighbours
  MKG(1,"Amitha","Neighbours",2),
  MKG(2,"Menaka","Neighbours",2),
  MKG(3,"Nimal","Neighbours",2),
  MKG(4,"Poojitha","Neighbours",2),
  MKG(5,"Renu","Neighbours",2),
  MKG(6,"Sudu Nangi","Neighbours",2),
  // Lihini's Invites
  MKG(7,"Indusara","Lihini's Invites",1),
  MKG(8,"Janani","Lihini's Invites",1),
  MKG(9,"Nethi","Lihini's Invites",1),
  MKG(10,"Nisini","Lihini's Invites",1),
  MKG(11,"Oneli","Lihini's Invites",1),
  MKG(12,"Padeesha","Lihini's Invites",3),
  MKG(13,"Rehan","Lihini's Invites",2),
  MKG(14,"Sewmini","Lihini's Invites",1),
  MKG(15,"Thidasi","Lihini's Invites",1),
  // Thulani's Invites
  MKG(16,"Abhishek","Thulani's Invites",1,"not_sent",null,5),
  MKG(17,"Adithya Karaliadde","Thulani's Invites",1,"not_sent",null,4),
  MKG(18,"Andrea Wijewansha","Thulani's Invites",1,"not_sent",null,4),
  MKG(19,"Anjana Alawatta","Thulani's Invites",1,"not_sent",null,4),
  MKG(20,"Aswida Benedict","Thulani's Invites",1,"not_sent",null,5),
  MKG(21,"Bavanishna","Thulani's Invites",1,"not_sent",null,4),
  MKG(22,"Chandana Liyanapatabendy","Thulani's Invites",2,"not_sent",null,6),
  MKG(23,"Charuka","Thulani's Invites",1,"not_sent",null,5),
  MKG(24,"Hashini","Thulani's Invites",2,"not_sent",null,5),
  MKG(25,"Imara","Thulani's Invites",1,"not_sent",null,6),
  MKG(26,"Ishini Mutihetupliya","Thulani's Invites",1,"not_sent",null,4),
  MKG(27,"Jagath Sumathipala","Thulani's Invites",2),
  MKG(28,"Keerthi Pieris","Thulani's Invites",2,"not_sent",null,6),
  MKG(29,"Khan","Thulani's Invites",1),
  MKG(30,"Lakshi Mahindasinghe","Thulani's Invites",1,"not_sent",null,5),
  MKG(31,"Nipun","Thulani's Invites",1,"not_sent",null,5),
  MKG(32,"Oshadi","Thulani's Invites",1),
  MKG(33,"Putte","Thulani's Invites",1),
  MKG(34,"Ruvin","Thulani's Invites",1,"not_sent",null,null,"w/ mahawedage"),
  MKG(35,"Saliya Pieris","Thulani's Invites",1,"not_sent",null,6),
  MKG(36,"Sandini Paramulage","Thulani's Invites",1,"not_sent",null,4),
  MKG(37,"Shanaka","Thulani's Invites",1,"not_sent",null,5),
  MKG(38,"Shanal & Kiran","Thulani's Invites",2,"not_sent",null,5),
  MKG(39,"Sithmi Muthumala","Thulani's Invites",1,"not_sent",null,4),
  MKG(40,"Yashoda Desilva","Thulani's Invites",1,"not_sent",null,4),
  // Sanjeewa's Relations
  MKG(41,"Anusha & Family","Sanjeewa's Relations",6,"sent","2026-06-09"),
  MKG(42,"Charlie","Sanjeewa's Relations",2),
  MKG(43,"Deepika Perera","Sanjeewa's Relations",2,"sent","2026-06-09"),
  MKG(44,"Dharamarathna","Sanjeewa's Relations",2,"sent","2026-06-09"),
  MKG(45,"Dr Mahawedage Family","Sanjeewa's Relations",5,"sent","2026-06-09"),
  MKG(46,"Duminda","Sanjeewa's Relations",2,"sent","2026-06-09",null,"Panadura"),
  MKG(47,"Inamaluwa & Family","Sanjeewa's Relations",4,"sent","2026-06-09"),
  MKG(48,"Indrani Karunarathna","Sanjeewa's Relations",1,"sent","2026-06-09"),
  MKG(49,"Kavinda","Sanjeewa's Relations",5,"delivered","2026-06-09",null,"Amma Included"),
  MKG(50,"Malani NIshshnaka","Sanjeewa's Relations",1,"sent","2026-06-09"),
  MKG(51,"Maneesha","Sanjeewa's Relations",1,"delivered","2026-06-09"),
  MKG(52,"Mewan","Sanjeewa's Relations",1,"sent","2026-06-09"),
  MKG(53,"Mrs. Weerakon","Sanjeewa's Relations",1,"sent","2026-06-09"),
  MKG(54,"Prabath Amarathunga","Sanjeewa's Relations",2,"sent","2026-06-09"),
  MKG(55,"Prakrama Dharmarathna","Sanjeewa's Relations",2,"sent","2026-06-09"),
  MKG(56,"Rani","Sanjeewa's Relations",1),
  MKG(57,"Rohini Karunarathnna","Sanjeewa's Relations",1,"sent","2026-06-09"),
  MKG(58,"Sanjaya Amarathunga","Sanjeewa's Relations",1,"sent","2026-06-09"),
  MKG(59,"Sanjeewani & Pradeep","Sanjeewa's Relations",2,"sent","2026-06-09"),
  // Sanjeewa's Friends
  MKG(60,"Ananda Senerath","Sanjeewa's Friends",2,"sent","2026-06-09"),
  MKG(61,"Chaminda Liyanage","Sanjeewa's Friends",2,"sent","2026-06-09",null,"Evite"),
  MKG(62,"Chandana Bopegoda","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evite"),
  MKG(63,"Chinthaka Wijesekara","Sanjeewa's Friends",2,"sent","2026-05-22"),
  MKG(64,"Damika Cabral","Sanjeewa's Friends",1,"sent","2026-06-09"),
  MKG(65,"Dr. Nirukshan Pradeep","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evite"),
  MKG(66,"Gyruka Perusinghe","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evite"),
  MKG(67,"Harshana Mayakaduwa","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evites"),
  MKG(68,"Indika Bandara","Sanjeewa's Friends",2,"sent","2026-06-09",null,"Evites"),
  MKG(69,"Indika Dayarathna","Sanjeewa's Friends",3,"sent","2026-06-09",null,"Evite"),
  MKG(70,"Jagath Liyanagama","Sanjeewa's Friends",1,"sent","2026-06-09",null,"Evites"),
  MKG(71,"Jagath Sumathipala","Sanjeewa's Friends",2,"not_sent",null,null,"VIP"),
  MKG(72,"L P Shantha","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evite"),
  MKG(73,"Lal Hewagama","Sanjeewa's Friends",2,"sent","2026-06-09"),
  MKG(74,"Mahee Muthukumarana","Sanjeewa's Friends",1,"sent","2026-06-09",null,"Evite"),
  MKG(75,"Mahinda Pushpakumara","Sanjeewa's Friends",1,"sent","2026-06-09",null,"Evite"),
  MKG(76,"Muditha Lansakara","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evite"),
  MKG(77,"Nalinda Mahawithana","Sanjeewa's Friends",4,"sent","2026-05-22",null,"Evite"),
  MKG(78,"Nishantha de Silva","Sanjeewa's Friends",1,"sent","2026-06-09",null,"Evites"),
  MKG(79,"Poshitha Delpola","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evite"),
  MKG(80,"Prabath Maheepala","Sanjeewa's Friends",1,"not_sent",null,null,"Evite"),
  MKG(81,"Ranjan Gopallawa","Sanjeewa's Friends",2,"sent","2026-06-09"),
  MKG(82,"Salinda Samarakoon","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evite"),
  MKG(83,"Samantha Wijesekara","Sanjeewa's Friends",2,"sent","2026-05-22",null,"Evite"),
  MKG(84,"Sanjeewa Herath","Sanjeewa's Friends",2),
  MKG(85,"Shantha Sirisooriya","Sanjeewa's Friends",1,"not_sent",null,null,"Evite"),
  // Ushani's Friends
  MKG(86,"Dr. Chandani","Ushani's Friends",1),
  MKG(87,"Dr.Dilukshan","Ushani's Friends",1),
  MKG(88,"Kamini","Ushani's Friends",1),
  MKG(89,"Manjula Amarasinghe","Ushani's Friends",1),
  MKG(90,"Mr & Mrs Damith","Ushani's Friends",2),
  // Ushani's Relations
  MKG(91,"Asoka Katugaha","Ushani's Relations",1),
  MKG(92,"C N Wikramasinghe","Ushani's Relations",2,"not_sent",null,null,"Evite"),
  MKG(93,"Disna Manori","Ushani's Relations",2),
  MKG(94,"Gayan Ranasinghe","Ushani's Relations",2),
  MKG(95,"Hasa H U Wikramasinghe","Ushani's Relations",2,"not_sent",null,null,"Evite"),
  MKG(96,"Mr & Mrs Katugaha","Ushani's Relations",2),
  MKG(97,"Mr & Mrs Samarasinghe","Ushani's Relations",2,"not_sent",null,null,"Bappa"),
  MKG(98,"Nimal Ranasinghe","Ushani's Relations",2),
  MKG(99,"Nimali Adhikari","Ushani's Relations",4),
  MKG(100,"Nuwan Samarasinghe","Ushani's Relations",4),
  MKG(101,"Rukmani","Ushani's Relations",1),
  // Audio & Photography
  MKG(102,"Photography","Audio & Photography",2),
  MKG(103,"Watalappam","Audio & Photography",11),
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
  html, body, #root { width:100%; max-width:none; min-height:100%; margin:0; border:0; text-align:left; }
  body { font-family:'Jost',sans-serif; background:${T.bg}; color:${T.text}; min-height:100vh; overflow-x:hidden; }
  h2,h3 { font-family:'Cormorant Garamond',serif; }
  .app { display:flex; flex-direction:column; min-height:100vh; width:100%; background:linear-gradient(180deg,${T.bg} 0%,#fff 58%,${T.surfaceAlt} 100%); }
  .header { position:sticky; top:0; z-index:100; background:${T.header}; padding:0 32px; display:flex; align-items:center; justify-content:space-between; gap:20px; min-height:68px; flex-shrink:0; border-bottom:1px solid #5C2840; box-shadow:0 12px 34px rgba(61,24,41,.12); }
  .header-brand { display:flex; align-items:center; gap:14px; }
  .lotus-icon { font-size:22px; }
  .header-title { font-family:'Cormorant Garamond',serif; color:${T.headerText}; font-size:22px; font-weight:600; }
  .header-sub { font-size:10px; color:${T.headerMuted}; font-weight:400; letter-spacing:1.5px; text-transform:uppercase; margin-top:1px; }
  .nav { display:flex; gap:4px; min-width:0; }
  .nav-btn { background:none; border:none; cursor:pointer; padding:8px 16px; border-radius:6px; font-family:'Jost',sans-serif; font-size:13px; font-weight:500; color:${T.headerMuted}; transition:all .15s; }
  .nav-btn:hover { background:rgba(255,255,255,.07); color:${T.headerText}; }
  .nav-btn.active { background:rgba(176,82,120,.25); color:${T.headerText}; }
  .nav-count { background:rgba(255,255,255,.12); border-radius:10px; padding:1px 7px; font-size:11px; margin-left:6px; }
  .logout-btn { flex:0 0 auto; color:${T.headerText}; border-color:rgba(245,220,235,.22); background:rgba(255,255,255,.06); }
  .logout-btn:hover { color:#fff; background:rgba(255,255,255,.12); border-color:rgba(245,220,235,.34); }
  .main { flex:1; width:100%; max-width:1380px; margin:0 auto; padding:32px; }
  .top-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
  .page-title { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:600; color:${T.text}; }
  .page-eyebrow { font-size:10px; font-weight:600; letter-spacing:1.4px; text-transform:uppercase; color:${T.textMuted}; margin-bottom:4px; }
  .dashboard-topbar { align-items:flex-end; }
  .dashboard-shell { display:grid; gap:20px; }
  .dashboard-hero { min-height:210px; display:grid; grid-template-columns:minmax(0,1fr) minmax(310px,420px); gap:28px; align-items:end; padding:30px; border-radius:18px; border:1px solid rgba(92,40,64,.22); background:linear-gradient(135deg,${T.header} 0%,#6B2C49 58%,${T.primaryDark} 100%); color:${T.headerText}; position:relative; overflow:hidden; box-shadow:0 24px 54px rgba(61,24,41,.18); }
  .dashboard-hero::before { content:''; position:absolute; inset:18px; border:1px solid rgba(245,220,235,.16); border-radius:14px; pointer-events:none; }
  .dashboard-hero::after { content:''; position:absolute; right:-120px; top:-150px; width:380px; height:380px; border:1px solid rgba(196,154,108,.28); border-radius:50%; pointer-events:none; }
  .dashboard-kicker { display:inline-flex; align-items:center; gap:8px; color:${T.headerMuted}; font-size:11px; font-weight:600; letter-spacing:1.4px; text-transform:uppercase; margin-bottom:12px; }
  .dashboard-kicker::before { content:''; width:8px; height:8px; border-radius:50%; background:${T.accent}; box-shadow:0 0 0 5px rgba(196,154,108,.14); }
  .dashboard-welcome { color:#fff; font-size:15px; font-weight:500; margin-bottom:8px; }
  .dashboard-hero h2 { color:${T.headerText}; font-size:44px; line-height:.95; font-weight:600; letter-spacing:0; margin:0 0 12px; max-width:560px; }
  .dashboard-hero p { color:#E5C2D5; font-size:14px; line-height:1.7; max-width:580px; }
  .hero-metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; position:relative; z-index:1; }
  .hero-metric { min-height:92px; padding:16px; border-radius:12px; background:rgba(255,255,255,.08); border:1px solid rgba(245,220,235,.16); backdrop-filter:blur(10px); }
  .hero-metric-label { color:${T.headerMuted}; font-size:10px; font-weight:600; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; }
  .hero-metric-value { color:#fff; font-family:'Cormorant Garamond',serif; font-size:34px; font-weight:600; line-height:1; }
  .hero-metric-sub { color:#D9B7C8; font-size:11px; margin-top:7px; }
  .stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
  .stat-card { background:rgba(255,255,255,.92); border-radius:12px; padding:18px; border:1px solid ${T.border}; position:relative; overflow:hidden; cursor:default; box-shadow:0 12px 30px rgba(61,24,41,.06); }
  .stat-card::before { content:''; position:absolute; top:0; left:0; bottom:0; width:4px; background:var(--ac); }
  .stat-label { font-size:10px; color:${T.textMuted}; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
  .stat-value { font-family:'Cormorant Garamond',serif; font-size:42px; font-weight:600; line-height:.92; }
  .stat-sub { font-size:12px; color:${T.textMuted}; margin-top:8px; line-height:1.35; }
  .card { background:rgba(255,255,255,.95); border-radius:12px; padding:22px; border:1px solid ${T.border}; box-shadow:0 12px 30px rgba(61,24,41,.05); }
  .card-title { font-size:10px; font-weight:600; color:${T.textMuted}; text-transform:uppercase; letter-spacing:1px; margin-bottom:18px; }
  .dashboard-grid { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(300px,.8fr); gap:20px; }
  .dashboard-section-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:18px; }
  .dashboard-section-title { font-family:'Cormorant Garamond',serif; color:${T.text}; font-size:24px; font-weight:600; line-height:1; }
  .dashboard-section-note { color:${T.textMuted}; font-size:12px; margin-top:5px; }
  .dashboard-pill { display:inline-flex; align-items:center; height:28px; padding:0 10px; border-radius:999px; background:${T.primaryBg}; color:${T.primaryDark}; font-size:11px; font-weight:600; white-space:nowrap; }
  .charts-row { display:grid; grid-template-columns:1.3fr 0.7fr; gap:20px; margin-bottom:24px; }
  .cat-list { display:flex; flex-direction:column; gap:12px; }
  .cat-row { display:grid; grid-template-columns:10px minmax(130px,1fr) minmax(120px,34%) 42px 62px; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid ${T.borderLight}; }
  .cat-row:last-child { border-bottom:0; }
  .cat-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; box-shadow:0 0 0 5px rgba(176,82,120,.08); }
  .cat-name { font-size:13px; color:${T.text}; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cat-bar-wrap { width:100%; background:${T.borderLight}; border-radius:999px; height:7px; overflow:hidden; flex-shrink:0; }
  .cat-bar { height:100%; border-radius:4px; }
  .cat-num { font-size:14px; font-weight:600; color:${T.text}; min-width:28px; text-align:right; }
  .cat-groups { font-size:11px; color:${T.textMuted}; text-align:right; white-space:nowrap; }
  .rsvp-panel { min-height:100%; }
  .rsvp-chart-wrap { position:relative; height:190px; margin-top:-2px; }
  .rsvp-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
  .rsvp-center-value { font-family:'Cormorant Garamond',serif; font-size:34px; font-weight:600; color:${T.text}; line-height:1; }
  .rsvp-center-label { font-size:10px; color:${T.textMuted}; font-weight:600; letter-spacing:.8px; text-transform:uppercase; margin-top:4px; }
  .rsvp-legend { display:grid; gap:9px; margin-top:10px; }
  .rsvp-legend-row { display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:12px; color:${T.textMid}; }
  .rsvp-legend-label { display:flex; align-items:center; gap:7px; min-width:0; }
  .rsvp-legend-dot { width:8px; height:8px; border-radius:50%; flex:0 0 auto; }
  .rsvp-legend-value { color:${T.text}; font-weight:600; }
  .table-card { margin-top:0; }
  .table-overview { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:16px; }
  .table-overview-item { background:${T.surfaceAlt}; border:1px solid ${T.borderLight}; border-radius:10px; padding:13px 14px; }
  .table-overview-label { font-size:10px; color:${T.textMuted}; font-weight:600; letter-spacing:.7px; text-transform:uppercase; margin-bottom:6px; white-space:nowrap; }
  .table-overview-value { font-family:'Cormorant Garamond',serif; font-size:29px; font-weight:600; color:${T.text}; line-height:1; }
  .table-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; }
  .table-chip { background:#fff; border:1px solid ${T.border}; border-radius:10px; padding:14px; min-width:0; display:grid; gap:11px; }
  .table-chip.unassigned { background:transparent; border:1.5px dashed ${T.border}; }
  .table-chip-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .table-chip-label { font-size:10px; color:${T.textMuted}; font-weight:600; text-transform:uppercase; letter-spacing:.7px; }
  .table-chip-val { font-family:'Cormorant Garamond',serif; font-size:34px; font-weight:600; color:${T.text}; line-height:.9; }
  .table-chip-sub { font-size:12px; color:${T.textMuted}; line-height:1.25; }
  .table-load { height:6px; border-radius:999px; background:${T.borderLight}; overflow:hidden; }
  .table-load-bar { height:100%; border-radius:999px; background:${T.primary}; min-width:8px; }
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
  .table-wrap { background:${T.surface}; border-radius:14px; border:1px solid ${T.border}; overflow:auto; }
  table { width:100%; min-width:860px; border-collapse:collapse; }
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
  .cat-manager-item { display:flex; flex-direction:column; background:${T.surface}; border:1px solid ${T.border}; border-radius:12px; overflow:hidden; }
  .cat-manager-item:hover { border-color:${T.primary}40; }
  .cat-manager-row { display:flex; align-items:center; gap:12px; padding:12px 16px; }
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
  .audit-list { display:grid; gap:10px; }
  .audit-row { display:grid; grid-template-columns:160px minmax(140px,.6fr) minmax(0,1fr); gap:14px; align-items:center; background:${T.surface}; border:1px solid ${T.border}; border-radius:10px; padding:14px 16px; }
  .audit-time { color:${T.textMuted}; font-size:12px; white-space:nowrap; }
  .audit-user { min-width:0; }
  .audit-user-name { color:${T.text}; font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .audit-user-email { color:${T.textMuted}; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
  .audit-action { min-width:0; }
  .audit-action-title { color:${T.text}; font-size:13px; font-weight:600; }
  .audit-action-detail { color:${T.textMuted}; font-size:12px; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .toast { position:fixed; bottom:28px; right:28px; background:${T.header}; color:${T.headerText}; padding:13px 22px; border-radius:12px; font-size:13px; font-weight:500; z-index:2000; animation:fadeup .2s; border:1px solid #5C2840; }
  @keyframes fadeup { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .empty { text-align:center; padding:60px 20px; }
  @media (max-width:1100px) {
    .header { flex-wrap:wrap; height:auto; padding:14px 20px; gap:12px; }
    .header-brand { min-width:0; }
    .nav { order:3; width:100%; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
    .nav::-webkit-scrollbar { display:none; }
    .nav-btn { flex:0 0 auto; }
    .logout-btn { margin-left:auto; width:auto; }
    .main { padding:24px 20px; }
    .dashboard-hero { grid-template-columns:1fr; align-items:start; min-height:auto; }
    .dashboard-grid, .charts-row { grid-template-columns:1fr; }
    .stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
  @media (max-width:720px) {
    .main { padding:20px 14px; }
    .top-bar { align-items:flex-start; gap:14px; flex-direction:column; margin-bottom:18px; }
    .dashboard-topbar { flex-direction:row; align-items:flex-end; }
    .page-title { font-size:26px; }
    .dashboard-hero { padding:22px; border-radius:14px; }
    .dashboard-hero::before { inset:12px; }
    .dashboard-hero h2 { font-size:34px; line-height:1; }
    .dashboard-hero p { font-size:13px; }
    .hero-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .hero-metric { min-height:84px; padding:14px; }
    .hero-metric-value { font-size:29px; }
    .stat-grid, .inv-stats { grid-template-columns:1fr; gap:10px; }
    .stat-card { padding:16px 16px 16px 18px; }
    .stat-value { font-size:36px; }
    .card { padding:18px; border-radius:10px; }
    .dashboard-section-header { align-items:flex-start; }
    .dashboard-section-title { font-size:22px; }
    .cat-row { grid-template-columns:10px minmax(0,1fr) 44px; gap:10px; }
    .cat-bar-wrap { grid-column:2 / -1; grid-row:2; }
    .cat-groups { display:none; }
    .rsvp-chart-wrap { height:180px; }
    .table-overview, .table-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .toolbar, .bulk-bar, .bulk-actions { align-items:stretch; flex-direction:column; }
    .search-wrap, .filter-select, .results-info, .toolbar .btn { width:100%; }
    .results-info { margin-left:0; }
    .modal { max-height:calc(100vh - 24px); }
    .modal-header { padding:22px 20px 0; }
    .modal-body { padding:18px 20px 22px; }
    .form-row, .count-fields { grid-template-columns:1fr; }
    .audit-row { grid-template-columns:1fr; gap:8px; }
    .audit-action-detail { white-space:normal; }
  }
  @media (max-width:460px) {
    .header { padding:12px 14px; }
    .header-title { font-size:20px; }
    .header-sub { font-size:9px; letter-spacing:1.1px; }
    .nav-btn { padding:8px 11px; font-size:12px; }
    .logout-btn { padding:8px 12px; }
    .dashboard-topbar { flex-direction:column; align-items:stretch; }
    .dashboard-topbar .btn { justify-content:center; }
    .dashboard-hero { padding:20px 18px; }
    .dashboard-hero h2 { font-size:30px; }
    .hero-metrics, .table-overview, .table-summary { grid-template-columns:1fr; }
    .hero-metric { min-height:76px; }
    .dashboard-pill { display:none; }
    .toast { left:14px; right:14px; bottom:14px; text-align:center; }
  }
  ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:${T.surfaceAlt}} ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}

  /* Separate Declined and Category RSVP guests styles */
  .guest-list-container { display:flex; gap:20px; align-items:flex-start; width:100%; }
  .table-wrap-main { flex:1; min-width:0; }
  .declined-sidebar { width:320px; flex-shrink:0; background:#fff; border-radius:12px; border:1px solid ${T.border}; box-shadow:0 12px 30px rgba(61,24,41,.05); padding:18px; }
  .declined-sidebar-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; border-bottom:1px solid ${T.borderLight}; padding-bottom:10px; }
  .declined-sidebar-title { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:600; color:${T.text}; }
  .declined-list { display:flex; flex-direction:column; gap:10px; max-height:60vh; overflow-y:auto; padding-right:4px; }
  .declined-card { padding:12px; border-radius:8px; background:${T.surfaceAlt}; border:1px solid ${T.borderLight}; position:relative; transition:all 0.15s; text-align:left; }
  .declined-card:hover { border-color:${T.border}; box-shadow:0 2px 8px rgba(61,24,41,0.03); }
  .declined-card-name { font-weight:500; font-size:13px; color:${T.text}; margin-bottom:4px; padding-right:56px; word-break:break-word; }
  .declined-card-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .declined-card-cat { display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:500; }
  .declined-card-count { font-size:11px; color:${T.textMuted}; }
  .declined-card-actions { position:absolute; top:10px; right:10px; display:flex; gap:4px; }
  .toggle-separate-declined { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:${T.textMid}; cursor:pointer; user-select:none; padding:8px 12px; border-radius:9px; border:1.5px solid ${T.border}; background:none; font-family:'Jost',sans-serif; transition:all .15s; font-weight:500; white-space:nowrap; }
  .toggle-separate-declined:hover { background:${T.surfaceAlt}; border-color:${T.primary}; }
  .toggle-separate-declined.active { background:${T.primaryBg}; color:${T.primaryDark}; border-color:${T.primary}; }

  .cat-guests-expansion { background:${T.surfaceAlt}; border-top:1px dashed ${T.border}; padding:16px 20px; text-align:left; }
  .cat-guests-rsvp-group { margin-bottom:12px; }
  .cat-guests-rsvp-group:last-child { margin-bottom:0; }
  .cat-guests-rsvp-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.6px; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
  .cat-guests-names-list { display:flex; flex-wrap:wrap; gap:6px; }
  .cat-guest-bubble { font-size:12px; background:${T.surface}; border:1px solid ${T.borderLight}; padding:3px 10px; border-radius:15px; color:${T.textMid}; display:inline-flex; align-items:center; gap:5px; }
  .cat-guest-bubble-count { font-size:10px; font-weight:600; color:${T.textMuted}; background:${T.surfaceAlt}; border-radius:10px; padding:1px 5px; }

  @media (max-width: 960px) {
    .guest-list-container { flex-direction:column; }
    .declined-sidebar { width:100%; }
  }
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
    updateGuests(guests.map(g=>ids.includes(g.id)?{...g,inviteStatus:status,inviteSentDate:dateVal}:g),{action:"bulk_invite_status_changed",details:{count:ids.length,status}});
    setSelected(new Set());
    const lbl=status==="not_sent"?"Not Sent":status==="sent"?"Sent":"Delivered";
    showToast(`${ids.length} guest${ids.length!==1?"s":""} marked as ${lbl} ✓`);
  };

  const handleSingle=(id,newStatus)=>{
    const dateVal=(newStatus==="sent"||newStatus==="delivered")?today():null;
    const guest=guests.find(g=>g.id===id);
    updateGuests(guests.map(g=>g.id===id?{...g,inviteStatus:newStatus,inviteSentDate:dateVal}:g),{action:"invite_status_changed",details:{guestId:id,guestName:guest?.name,status:newStatus}});
  };

  const SH=({col})=>(<span style={{color:sortCol===col?T.primary:T.borderLight,marginLeft:4,fontSize:10}}>{sortCol===col?(sortDir==="asc"?"▲":"▼"):"⇅"}</span>);

  return(
    <div>
      <div className="top-bar"><h2 className="page-title">Invitations</h2></div>

      <div className="inv-stats">
        {[
          {label:"Not Sent",value:notSent,ac:INVITE_STATUS.not_sent.dot,vc:INVITE_STATUS.not_sent.color,f:"not_sent"},
          {label:"Sent",value:sent,ac:INVITE_STATUS.sent.dot,vc:INVITE_STATUS.sent.color,f:"sent"},
          {label:"Delivered",value:delivered,ac:INVITE_STATUS.delivered.dot,vc:INVITE_STATUS.delivered.color,f:"delivered"},
        ].map(s=>(
          <div key={s.label} className="stat-card" style={{"--ac":s.ac,cursor:"pointer"}} onClick={()=>setFilterStatus(filterStatus===s.f?"all":s.f)}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color:s.vc}}>{s.value}</div>
            <div className="stat-sub">{total>0?Math.round(s.value/total*100):0}% of {total} groups{filterStatus===s.f?" · filtered":""}</div>
          </div>
        ))}
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
              <th style={{width:"26%"}} onClick={()=>handleSort("name")}>Name <SH col="name"/></th>
              <th style={{width:"18%"}} onClick={()=>handleSort("category")}>Category <SH col="category"/></th>
              <th style={{width:"16%"}} onClick={()=>handleSort("status")}>Invite Status <SH col="status"/></th>
              <th style={{width:"16%"}} onClick={()=>handleSort("date")}>Date Sent <SH col="date"/></th>
              <th style={{width:"14%"}} className="no-sort">RSVP</th>
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

function CategoryManager({ categories, setCategories, guests, showToast, downloadCategoriesBreakdownPDF }) {
  const [newName,setNewName]=useState("");
  const [newColor,setNewColor]=useState(PALETTE[5]);
  const [expandedCats, setExpandedCats] = useState({});

  const toggleExpand = (catName) => {
    setExpandedCats(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const handleRename=(idx,name)=>{const old=categories[idx].name;const next=name.trim();if(!next||next===old)return;setCategories(categories.map((c,i)=>i===idx?{...c,name:next}:c),old,next,{action:"category_renamed",details:{from:old,to:next}});showToast(`Renamed to "${next}" ✓`);};
  const handleRecolor=(idx,color)=>setCategories(categories.map((c,i)=>i===idx?{...c,color}:c),null,null,{action:"category_recolored",details:{categoryName:categories[idx].name}});
  const handleAdd=()=>{const t=newName.trim();if(!t)return;if(categories.find(c=>c.name.toLowerCase()===t.toLowerCase())){showToast("Already exists");return;}setCategories([...categories,{name:t,color:newColor}],null,null,{action:"category_added",details:{categoryName:t}});setNewName("");setNewColor(PALETTE[Math.floor(Math.random()*PALETTE.length)]);showToast(`"${t}" added ✓`);};
  const handleDelete=(idx)=>{const cat=categories[idx];const n=guests.filter(g=>g.category===cat.name).length;if(n>0){showToast(`${n} guest${n!==1?"s":""} in this category — reassign first`);return;}setCategories(categories.filter((_,i)=>i!==idx),null,null,{action:"category_deleted",details:{categoryName:cat.name}});showToast(`"${cat.name}" removed`);};

  return(
    <div className="cat-manager">
      <div className="top-bar">
        <h2 className="page-title">Categories</h2>
        <button
          className="btn btn-ghost logout-btn"
          style={{borderColor:"rgba(196,154,108,.4)",color:"#C49A6C",display:"flex",alignItems:"center",gap:4}}
          onClick={downloadCategoriesBreakdownPDF}
        >⬇ Export PDF</button>
      </div>
      <p className="cat-manager-hint">Click the colour swatch to change it · Click the name to rename · Categories with guests can't be deleted.</p>
      <div className="cat-manager-list">
        {categories.map((cat,idx)=>{
          const catGuests = guests.filter(g=>g.category===cat.name);
          const gCount=catGuests.length;
          const attCount=catGuests.reduce((a,g)=>a+getAttending(g),0);
          const isExpanded=!!expandedCats[cat.name];

          const confGuests=catGuests.filter(g=>g.rsvp==="confirmed");
          const pendGuests=catGuests.filter(g=>g.rsvp==="pending"||!g.rsvp);
          const declGuests=catGuests.filter(g=>g.rsvp==="declined");

          return(
            <div className="cat-manager-item" key={cat.name+idx}>
              <div className="cat-manager-row">
                <ColorPicker value={cat.color} onChange={color=>handleRecolor(idx,color)}/>
                <input className="cat-name-input" defaultValue={cat.name} onBlur={e=>handleRename(idx,e.target.value)} onKeyDown={e=>e.key==="Enter"&&e.target.blur()}/>
                <span className="cat-guest-count">{gCount} groups · {attCount} attending</span>
                {gCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={()=>toggleExpand(cat.name)} style={{padding:"5px 10px", marginLeft:8, display:"flex", alignItems:"center", gap:4}}>
                    {isExpanded ? "▲ Hide Guests" : "▼ View Guests"}
                  </button>
                )}
                <button className="cat-del-btn" disabled={gCount>0} onClick={()=>handleDelete(idx)} title={gCount>0?"Reassign guests first":"Delete"}>✕</button>
              </div>
              {isExpanded && gCount > 0 && (
                <div className="cat-guests-expansion">
                  {confGuests.length > 0 && (
                    <div className="cat-guests-rsvp-group">
                      <div className="cat-guests-rsvp-title" style={{color:"#2DBD72"}}>
                        <span>●</span> Confirmed ({confGuests.length} groups · {confGuests.reduce((a,g)=>a+getAttending(g),0)} attending)
                      </div>
                      <div className="cat-guests-names-list">
                        {confGuests.map(g=>(
                          <span key={g.id} className="cat-guest-bubble" title={`${g.name} (Confirmed RSVP)`}>
                            {g.name}
                            <span className="cat-guest-bubble-count">{getAttending(g)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {pendGuests.length > 0 && (
                    <div className="cat-guests-rsvp-group">
                      <div className="cat-guests-rsvp-title" style={{color:"#E8A020"}}>
                        <span>●</span> Pending RSVP ({pendGuests.length} groups · {pendGuests.reduce((a,g)=>a+g.count,0)} invited)
                      </div>
                      <div className="cat-guests-names-list">
                        {pendGuests.map(g=>(
                          <span key={g.id} className="cat-guest-bubble" title={`${g.name} (RSVP Pending)`}>
                            {g.name}
                            <span className="cat-guest-bubble-count">{g.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {declGuests.length > 0 && (
                    <div className="cat-guests-rsvp-group">
                      <div className="cat-guests-rsvp-title" style={{color:"#E84060"}}>
                        <span>●</span> Declined ({declGuests.length} groups)
                      </div>
                      <div className="cat-guests-names-list">
                        {declGuests.map(g=>(
                          <span key={g.id} className="cat-guest-bubble" style={{textDecoration:"line-through", opacity:0.75}} title={`${g.name} (Declined RSVP)`}>
                            {g.name}
                            <span className="cat-guest-bubble-count" style={{textDecoration:"none"}}>{g.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
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

function Dashboard({ guests, categories, user }) {
  const totalInvited=guests.reduce((a,g)=>a+g.count,0);
  const totalAttending=guests.reduce((a,g)=>a+getAttending(g),0);
  const confirmedAtt=guests.filter(g=>g.rsvp==="confirmed").reduce((a,g)=>a+getAttending(g),0);
  const pendingAtt=guests.filter(g=>g.rsvp==="pending").reduce((a,g)=>a+getAttending(g),0);
  const declinedAtt=guests.filter(g=>g.rsvp==="declined").reduce((a,g)=>a+getAttending(g),0);
  const catData=categories.map(cat=>({name:cat.name,color:cat.color,people:guests.filter(g=>g.category===cat.name).reduce((a,g)=>a+getAttending(g),0),entries:guests.filter(g=>g.category===cat.name).length})).sort((a,b)=>b.people-a.people);
  const maxPeople=Math.max(...catData.map(d=>d.people),1);
  const pieData=[{name:"Confirmed",value:confirmedAtt,color:"#2DBD72"},{name:"Pending",value:pendingAtt,color:"#E8A020"},{name:"Declined",value:declinedAtt,color:"#E84060"}].filter(d=>d.value>0);
  const tables=[...new Set(guests.map(g=>g.table).filter(Boolean))].sort((a,b)=>a-b);
  const invSent=guests.filter(g=>g.inviteStatus==="sent"||g.inviteStatus==="delivered").length;
  const confirmedPct=totalAttending>0?Math.round((confirmedAtt/totalAttending)*100):0;
  const invitePct=guests.length>0?Math.round((invSent/guests.length)*100):0;
  const pendingGroups=guests.filter(g=>g.rsvp==="pending").length;
  const unassigned=guests.filter(g=>!g.table);
  const unassignedPeople=unassigned.reduce((a,g)=>a+getAttending(g),0);
  const tableData=tables.map(t=>{
    const tg=guests.filter(g=>g.table===t);
    return { table:t, groups:tg.length, people:tg.reduce((a,g)=>a+getAttending(g),0) };
  });
  const seatedPeople=tableData.reduce((a,t)=>a+t.people,0);
  const maxTablePeople=Math.max(...tableData.map(t=>t.people), unassignedPeople, 1);
  const userName=user?.displayName||user?.email?.split("@")[0]||"there";

  return(
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <div className="dashboard-kicker">Overview</div>
          <div className="dashboard-welcome">Welcome, {userName}</div>
          <h2>Wedding overview</h2>
        </div>
        <div className="hero-metrics">
          <div className="hero-metric">
            <div className="hero-metric-label">Guest groups</div>
            <div className="hero-metric-value">{guests.length}</div>
            <div className="hero-metric-sub">{totalInvited} invited people</div>
          </div>
          <div className="hero-metric">
            <div className="hero-metric-label">Confirmed</div>
            <div className="hero-metric-value">{confirmedPct}%</div>
            <div className="hero-metric-sub">{confirmedAtt} confirmed guests</div>
          </div>
          <div className="hero-metric">
            <div className="hero-metric-label">Invites sent</div>
            <div className="hero-metric-value">{invitePct}%</div>
            <div className="hero-metric-sub">{invSent} of {guests.length} groups</div>
          </div>
          <div className="hero-metric">
            <div className="hero-metric-label">Tables</div>
            <div className="hero-metric-value">{tables.length}</div>
            <div className="hero-metric-sub">{unassigned.length} groups unassigned</div>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        {[{label:"Attending",value:totalAttending,sub:`of ${totalInvited} invited`,ac:T.primary},{label:"Confirmed",value:confirmedAtt,sub:`${confirmedPct}% confirmed`,ac:"#2DBD72"},{label:"Pending RSVP",value:pendingAtt,sub:`${pendingGroups} groups pending`,ac:"#E8A020"},{label:"Invites Sent",value:invSent,sub:`${invitePct}% sent`,ac:INVITE_STATUS.sent.dot}].map(s=>(
          <div key={s.label} className="stat-card" style={{"--ac":s.ac}}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color:s.ac===T.primary?T.text:s.ac}}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="dashboard-section-header">
            <div>
              <h3 className="dashboard-section-title">Attending by category</h3>
              <p className="dashboard-section-note">Expected attendance.</p>
            </div>
            <span className="dashboard-pill">{categories.length} categories</span>
          </div>
          <div className="cat-list">
            {catData.filter(d=>d.entries>0).map(d=>(
              <div key={d.name} className="cat-row">
                <span className="cat-dot" style={{background:d.color}}/>
                <span className="cat-name" title={d.name}>{d.name}</span>
                <div className="cat-bar-wrap"><div className="cat-bar" style={{width:`${(d.people/maxPeople)*100}%`,background:d.color}}/></div>
                <span className="cat-num">{d.people}</span>
                <span className="cat-groups">{d.entries} groups</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card rsvp-panel">
          <div className="dashboard-section-header">
            <div>
              <h3 className="dashboard-section-title">RSVP breakdown</h3>
              <p className="dashboard-section-note">{pendingGroups} groups pending.</p>
            </div>
          </div>
          {pieData.length===0?(
            <div style={{color:T.textMuted,fontSize:13,textAlign:"center",padding:"42px 0"}}>No RSVP data yet</div>
          ):(
            <>
              <div className="rsvp-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={54} outerRadius={84} paddingAngle={4} dataKey="value">
                      {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[v+" people",n]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="rsvp-center">
                  <div className="rsvp-center-value">{totalAttending}</div>
                  <div className="rsvp-center-label">attending</div>
                </div>
              </div>
              <div className="rsvp-legend">
                {pieData.map(d=>(
                  <div key={d.name} className="rsvp-legend-row">
                    <span className="rsvp-legend-label"><span className="rsvp-legend-dot" style={{background:d.color}}/>{d.name}</span>
                    <span className="rsvp-legend-value">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card table-card">
        <div className="dashboard-section-header">
          <div>
            <h3 className="dashboard-section-title">Table summary</h3>
            <p className="dashboard-section-note">Seating by table.</p>
          </div>
          <span className="dashboard-pill">{tables.length || 0} assigned tables</span>
        </div>
        {tables.length===0?(
          <span style={{color:T.textMuted,fontSize:13}}>No tables assigned yet</span>
        ):(
          <>
            <div className="table-overview">
              <div className="table-overview-item"><div className="table-overview-label">Seated guests</div><div className="table-overview-value">{seatedPeople}</div></div>
              <div className="table-overview-item"><div className="table-overview-label">Assigned tables</div><div className="table-overview-value">{tables.length}</div></div>
              <div className="table-overview-item"><div className="table-overview-label">Unassigned</div><div className="table-overview-value">{unassignedPeople}</div></div>
            </div>
            <div className="table-summary">
              {tableData.map(t=>(
                <div key={t.table} className="table-chip">
                  <div className="table-chip-head">
                    <div>
                      <div className="table-chip-label">Table {t.table}</div>
                      <div className="table-chip-sub">{t.groups} group{t.groups!==1?"s":""}</div>
                    </div>
                    <div className="table-chip-val">{t.people}</div>
                  </div>
                  <div className="table-load"><div className="table-load-bar" style={{width:`${(t.people/maxTablePeople)*100}%`}}/></div>
                </div>
              ))}
              {unassigned.length>0&&(
                <div className="table-chip unassigned">
                  <div className="table-chip-head">
                    <div>
                      <div className="table-chip-label">Unassigned</div>
                      <div className="table-chip-sub">{unassigned.length} groups</div>
                    </div>
                    <div className="table-chip-val" style={{color:T.textMuted}}>{unassignedPeople}</div>
                  </div>
                  <div className="table-load"><div className="table-load-bar" style={{width:`${(unassignedPeople/maxTablePeople)*100}%`,background:T.textMuted}}/></div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

const AUDIT_LABELS = {
  login:"Logged in",
  guest_added:"Added guest",
  guest_updated:"Updated guest",
  guest_deleted:"Deleted guest",
  guests_updated:"Updated guests",
  rsvp_changed:"Changed RSVP",
  invite_status_changed:"Changed invite status",
  bulk_invite_status_changed:"Bulk invite update",
  category_added:"Added category",
  category_renamed:"Renamed category",
  category_recolored:"Changed category color",
  category_deleted:"Deleted category",
  categories_updated:"Updated categories",
};

const fmtAuditTime = (value) => {
  const date = value?.toDate ? value.toDate() : null;
  if(!date) return "Just now";
  return date.toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
};

const auditDetail = (log) => {
  const d = log.details||{};
  if(log.action==="login") return "Session started";
  if(d.guestName) return d.to ? `${d.guestName} → ${d.to}` : d.guestName;
  if(d.status) return d.count ? `${d.count} guests → ${d.status}` : `Status → ${d.status}`;
  if(d.from&&d.to) return `${d.from} → ${d.to}`;
  if(d.categoryName) return d.categoryName;
  if(d.count) return `${d.count} records`;
  return "";
};

function AuditLogsTab({ logs, loading }) {
  return(
    <div>
      <div className="top-bar">
        <div>
          <p className="page-eyebrow">Admin only</p>
          <h2 className="page-title">Audit Logs</h2>
        </div>
      </div>
      <div className="card">
        {loading?(
          <div className="empty"><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.textMuted}}>Loading audit logs…</div></div>
        ):logs.length===0?(
          <div className="empty"><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.textMuted}}>No audit logs yet</div></div>
        ):(
          <div className="audit-list">
            {logs.map(log=>(
              <div className="audit-row" key={log.id}>
                <div className="audit-time">{fmtAuditTime(log.createdAt)}</div>
                <div className="audit-user">
                  <div className="audit-user-name">{log.userName||"Unknown user"}</div>
                  <div className="audit-user-email">{log.userEmail||"unknown"}</div>
                </div>
                <div className="audit-action">
                  <div className="audit-action-title">{AUDIT_LABELS[log.action]||log.action}</div>
                  {auditDetail(log)&&<div className="audit-action-detail">{auditDetail(log)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const [auditLogs,setAuditLogs]=useState([]);
  const [auditLoading,setAuditLoading]=useState(false);
  const [pdfMenuOpen,setPdfMenuOpen]=useState(false);
  const [separateDeclined,setSeparateDeclined]=useState(true);

  const [splash, setSplash] = useState(true);
  const isAdmin = isAdminUser(user);

  // ── Firebase realtime sync ────────────────────────────────────────
  useEffect(()=>{

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (!u) {
        setLoading(false);
        return;
      }

      try {
        const key = `wg_audit_login_${u.uid}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          logAuditEvent(u, "login");
        }
      } catch {
        logAuditEvent(u, "login");
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

  useEffect(()=>{
    if(!isAdmin && view==="audit") setView("dashboard");
  },[isAdmin,view]);

  useEffect(()=>{
    if(!isAdmin) {
      setAuditLogs([]);
      setAuditLoading(false);
      return;
    }

    setAuditLoading(true);
    const q = query(auditCollection(), orderBy("createdAt","desc"), limit(100));
    return onSnapshot(q, (snap)=>{
      setAuditLogs(snap.docs.map(d=>({id:d.id,...d.data()})));
      setAuditLoading(false);
    }, ()=>{
      setAuditLoading(false);
    });
  },[isAdmin]);

  const saveToCloud = async (updatedGuests, updatedCategories) => {
    try {
      await setDoc(
        doc(db, "wedding", "guests"),
        { guests: updatedGuests, categories: updatedCategories }
      );
    } catch (err) {
      showToast("⚠ Save failed — check connection");
      throw err;
    }
  };

  const handleRestoreData = async () => {
    if (!window.confirm("This will REPLACE all current guest data with the PDF-restored data (103 guests, 8 categories). Continue?")) return;
    try {
      await setDoc(doc(db, "wedding", "guests"), { guests: RESTORED_GUESTS, categories: RESTORED_CATEGORIES });
      showToast("Data restored from PDF ✓");
    } catch (err) {
      showToast("⚠ Restore failed — check connection");
    }
  };

  const logAudit = useCallback((action, details={})=>logAuditEvent(user, action, details),[user]);
  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),2400);};
  const updateGuests=async(gs,audit={action:"guests_updated"})=>{
    setGuests(gs);
    await saveToCloud(gs,categories);
    await logAudit(audit.action||"guests_updated", audit.details||{count:gs.length});
  };

  const smartSetCategories=async(newCats,renamedFrom,renamedTo,audit={action:"categories_updated"})=>{
    setCategories(newCats);
    await saveToCloud(guests,newCats);
    await logAudit(audit.action||"categories_updated", audit.details||{count:newCats.length});
    if(renamedFrom&&renamedTo){
      const u=guests.map(g=>g.category===renamedFrom?{...g,category:renamedTo}:g);
      setGuests(u);
      await saveToCloud(u,newCats);
      await logAudit("guests_updated",{from:renamedFrom,to:renamedTo});
    }
  };

  const handleRsvpChange=(id,rsvp)=>{
    const guest=guests.find(g=>g.id===id);
    updateGuests(guests.map(g=>g.id===id?{...g,rsvp}:g),{action:"rsvp_changed",details:{guestId:id,guestName:guest?.name,to:rsvp}});
  };
  const handleInviteChange=(id,status)=>{
    const dateVal=(status==="sent"||status==="delivered")?today():null;
    const guest=guests.find(g=>g.id===id);
    updateGuests(guests.map(g=>g.id===id?{...g,inviteStatus:status,inviteSentDate:dateVal}:g),{action:"invite_status_changed",details:{guestId:id,guestName:guest?.name,status}});
  };
  const handleSave=(guest)=>{
    let updated;
    let audit;
    if(!guest.id){updated=[...guests,{...guest,id:nextId,inviteStatus:guest.inviteStatus||"not_sent",inviteSentDate:guest.inviteSentDate||null}];audit={action:"guest_added",details:{guestId:nextId,guestName:guest.name}};setNextId(n=>n+1);}
    else{updated=guests.map(g=>g.id===guest.id?guest:g);audit={action:"guest_updated",details:{guestId:guest.id,guestName:guest.name}};}
    updateGuests(updated,audit).then(()=>showToast(guest.id?"Saved ✓":"Guest added ✓")).catch(()=>{});setModalGuest(null);
  };
  const handleDelete=(id)=>{const guest=guests.find(g=>g.id===id);updateGuests(guests.filter(g=>g.id!==id),{action:"guest_deleted",details:{guestId:id,guestName:guest?.name}});setConfirmId(null);showToast("Guest removed");};
  const handleSort=(col)=>{if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("asc");}};

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const rose = [176, 82, 120];
    const dark = [61, 24, 41];
    const muted = [122, 77, 99];
    const now = new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });

    // ── Cover header ─────────────────────────────────────────────────
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(245, 220, 235);
    doc.text("Thulani & Isuru — Wedding Guest Report", pageW / 2, 13, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(196, 154, 108);
    doc.text(`Generated ${now}`, pageW / 2, 21, { align: "center" });

    // ── Summary stats ─────────────────────────────────────────────────
    const totalInvited    = guests.reduce((a, g) => a + g.count, 0);
    const totalAttending  = guests.reduce((a, g) => a + getAttending(g), 0);
    const confirmed       = guests.filter(g => g.rsvp === "confirmed").reduce((a, g) => a + getAttending(g), 0);
    const pending         = guests.filter(g => g.rsvp === "pending").reduce((a, g) => a + getAttending(g), 0);
    const declined        = guests.filter(g => g.rsvp === "declined").reduce((a, g) => a + getAttending(g), 0);
    const invDelivered    = guests.filter(g => g.inviteStatus === "delivered").length;
    const invSent         = guests.filter(g => g.inviteStatus === "sent").length;
    const invNotSent      = guests.filter(g => !g.inviteStatus || g.inviteStatus === "not_sent").length;
    const confirmedPct    = totalAttending > 0 ? Math.round((confirmed / totalAttending) * 100) : 0;
    const invPct          = guests.length > 0 ? Math.round(((invDelivered + invSent) / guests.length) * 100) : 0;

    const stats = [
      ["Guest Groups", guests.length],
      ["Total Invited", totalInvited],
      ["Total Attending", totalAttending],
      ["Confirmed", `${confirmed} (${confirmedPct}%)`],
      ["Pending RSVP", pending],
      ["Declined", declined],
      ["Invites Delivered", invDelivered],
      ["Invites Sent", invSent],
      ["Not Sent", invNotSent],
      ["Invite Sent %", `${invPct}%`],
    ];

    const colW = (pageW - 20) / 5;
    let sy = 36;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...rose);
    doc.text("Summary", 14, sy);
    sy += 5;

    stats.forEach((s, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = 14 + col * colW;
      const y = sy + row * 22;
      doc.setFillColor(253, 244, 247);
      doc.roundedRect(x, y, colW - 4, 18, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(String(s[0]).toUpperCase(), x + 4, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...dark);
      doc.text(String(s[1]), x + 4, y + 14);
    });

    // ── Category breakdown table ──────────────────────────────────────
    sy += 50;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...rose);
    doc.text("Attendance by Category", 14, sy);

    const catRows = categories.map(cat => {
      const gs = guests.filter(g => g.category === cat.name);
      const att = gs.reduce((a, g) => a + getAttending(g), 0);
      const conf = gs.filter(g => g.rsvp === "confirmed").reduce((a, g) => a + getAttending(g), 0);
      const pend = gs.filter(g => g.rsvp === "pending").reduce((a, g) => a + getAttending(g), 0);
      const decl = gs.filter(g => g.rsvp === "declined").reduce((a, g) => a + getAttending(g), 0);
      const del  = gs.filter(g => g.inviteStatus === "delivered").length;
      const snt  = gs.filter(g => g.inviteStatus === "sent").length;
      return [cat.name, gs.length, att, conf, pend, decl, del, snt, gs.length - del - snt];
    });

    autoTable(doc, {
      startY: sy + 4,
      head: [["Category", "Groups", "Attending", "Confirmed", "Pending", "Declined", "Delivered", "Sent", "Not Sent"]],
      body: catRows,
      theme: "grid",
      headStyles: { fillColor: dark, textColor: [245, 220, 235], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: dark },
      alternateRowStyles: { fillColor: [253, 244, 247] },
      columnStyles: { 0: { cellWidth: 50 } },
      margin: { left: 14, right: 14 },
    });

    // ── Guest list table (new page) ───────────────────────────────────
    doc.addPage();
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(245, 220, 235);
    doc.text("Full Guest List", pageW / 2, 12, { align: "center" });

    const rsvpLabel = { confirmed: "Confirmed", pending: "Pending", declined: "Declined" };
    const invLabel  = { delivered: "Delivered", sent: "Sent", not_sent: "Not Sent" };

    const guestRows = [...guests]
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
      .map(g => [
        g.name,
        g.category.replace(" Invites", ""),
        g.count || 0,
        getAttending(g),
        rsvpLabel[g.rsvp || "pending"],
        invLabel[g.inviteStatus || "not_sent"],
        g.inviteSentDate ? fmtDate(g.inviteSentDate) : "—",
        g.table ? `Table ${g.table}` : "—",
        g.notes || "—",
      ]);

    autoTable(doc, {
      startY: 22,
      head: [["Name", "Category", "Invited", "Attending", "RSVP", "Invite", "Date Sent", "Table", "Notes"]],
      body: guestRows,
      theme: "striped",
      headStyles: { fillColor: rose, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5, textColor: dark },
      alternateRowStyles: { fillColor: [253, 244, 247] },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 32 },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 24 },
        7: { cellWidth: 18, halign: "center" },
        8: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const v = data.cell.raw;
          if (v === "Confirmed") data.cell.styles.textColor = [26, 107, 64];
          else if (v === "Declined") data.cell.styles.textColor = [122, 24, 48];
          else data.cell.styles.textColor = [122, 80, 0];
        }
        if (data.section === "body" && data.column.index === 5) {
          const v = data.cell.raw;
          if (v === "Delivered") data.cell.styles.textColor = [26, 107, 64];
          else if (v === "Sent") data.cell.styles.textColor = [42, 74, 142];
        }
      },
      margin: { left: 14, right: 14 },
    });

    // ── Invitation status page ────────────────────────────────────────
    doc.addPage();
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(245, 220, 235);
    doc.text("Invitation Status", pageW / 2, 12, { align: "center" });

    const invRows = [...guests]
      .sort((a, b) => {
        const order = { not_sent: 0, sent: 1, delivered: 2 };
        const ao = order[a.inviteStatus || "not_sent"];
        const bo = order[b.inviteStatus || "not_sent"];
        return ao - bo || a.name.localeCompare(b.name);
      })
      .map(g => [
        g.name,
        g.category.replace(" Invites", ""),
        invLabel[g.inviteStatus || "not_sent"],
        g.inviteSentDate ? fmtDate(g.inviteSentDate) : "—",
        rsvpLabel[g.rsvp || "pending"],
        getAttending(g),
      ]);

    autoTable(doc, {
      startY: 22,
      head: [["Name", "Category", "Invite Status", "Date Sent", "RSVP", "Attending"]],
      body: invRows,
      theme: "striped",
      headStyles: { fillColor: [42, 74, 142], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: dark },
      alternateRowStyles: { fillColor: [234, 240, 251] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 28 },
        5: { cellWidth: 22, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const v = data.cell.raw;
          if (v === "Delivered") data.cell.styles.textColor = [26, 107, 64];
          else if (v === "Sent") data.cell.styles.textColor = [42, 74, 142];
          else data.cell.styles.textColor = [142, 61, 95];
        }
        if (data.section === "body" && data.column.index === 4) {
          const v = data.cell.raw;
          if (v === "Confirmed") data.cell.styles.textColor = [26, 107, 64];
          else if (v === "Declined") data.cell.styles.textColor = [122, 24, 48];
          else data.cell.styles.textColor = [122, 80, 0];
        }
      },
      margin: { left: 14, right: 14 },
    });

    // ── Footer on every page ──────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(`Page ${i} of ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
      doc.text("Thulani & Isuru — Wedding Guest Manager", 14, doc.internal.pageSize.getHeight() - 6);
    }

    doc.save(`wedding-guest-report-${new Date().toISOString().split("T")[0]}.pdf`);
    showToast("PDF downloaded ✓");
  };

  const downloadCategoryPDF = (categoryName) => {
    const catGuests = guests.filter(g => g.category === categoryName);
    if (!catGuests.length) { showToast("No guests in this category"); return; }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const rose = [176, 82, 120];
    const dark = [61, 24, 41];
    const muted = [122, 77, 99];
    const catObj = categories.find(c => c.name === categoryName);
    const now = new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });

    // Header
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(245, 220, 235);
    doc.text(`Thulani & Isuru — ${categoryName}`, pageW / 2, 13, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(196, 154, 108);
    doc.text(`Generated ${now}`, pageW / 2, 21, { align: "center" });

    // Category stats
    const totalInvited = catGuests.reduce((a, g) => a + g.count, 0);
    const totalAttending = catGuests.reduce((a, g) => a + getAttending(g), 0);
    const confirmed = catGuests.filter(g => g.rsvp === "confirmed").reduce((a, g) => a + getAttending(g), 0);
    const pending = catGuests.filter(g => g.rsvp === "pending").reduce((a, g) => a + getAttending(g), 0);
    const declined = catGuests.filter(g => g.rsvp === "declined").reduce((a, g) => a + getAttending(g), 0);
    const invDelivered = catGuests.filter(g => g.inviteStatus === "delivered").length;
    const invSent = catGuests.filter(g => g.inviteStatus === "sent").length;
    const invNotSent = catGuests.filter(g => !g.inviteStatus || g.inviteStatus === "not_sent").length;
    const confirmedPct = totalAttending > 0 ? Math.round((confirmed / totalAttending) * 100) : 0;
    const invPct = catGuests.length > 0 ? Math.round(((invDelivered + invSent) / catGuests.length) * 100) : 0;

    const stats = [
      ["Guest Groups", catGuests.length],
      ["Total Invited", totalInvited],
      ["Total Attending", totalAttending],
      ["Confirmed", `${confirmed} (${confirmedPct}%)`],
      ["Pending RSVP", pending],
      ["Declined", declined],
      ["Invites Delivered", invDelivered],
      ["Invites Sent", invSent],
      ["Not Sent", invNotSent],
      ["Invite Sent %", `${invPct}%`],
    ];

    const colW = (pageW - 20) / 5;
    let sy = 36;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...rose);
    doc.text("Summary", 14, sy);
    sy += 5;

    stats.forEach((s, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = 14 + col * colW;
      const y = sy + row * 22;
      doc.setFillColor(253, 244, 247);
      doc.roundedRect(x, y, colW - 4, 18, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(String(s[0]).toUpperCase(), x + 4, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...dark);
      doc.text(String(s[1]), x + 4, y + 14);
    });

    // Guest list (new page)
    doc.addPage();
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(245, 220, 235);
    doc.text(`Guest List — ${categoryName}`, pageW / 2, 12, { align: "center" });

    const rsvpLabel = { confirmed: "Confirmed", pending: "Pending", declined: "Declined" };
    const invLabel  = { delivered: "Delivered", sent: "Sent", not_sent: "Not Sent" };

    const guestRows = [...catGuests]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(g => [
        g.name,
        g.count || 0,
        getAttending(g),
        rsvpLabel[g.rsvp || "pending"],
        invLabel[g.inviteStatus || "not_sent"],
        g.inviteSentDate ? fmtDate(g.inviteSentDate) : "—",
        g.table ? `Table ${g.table}` : "—",
        g.notes || "—",
      ]);

    autoTable(doc, {
      startY: 22,
      head: [["Name", "Invited", "Attending", "RSVP", "Invite", "Date Sent", "Table", "Notes"]],
      body: guestRows,
      theme: "striped",
      headStyles: { fillColor: rose, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5, textColor: dark },
      alternateRowStyles: { fillColor: [253, 244, 247] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 26 },
        6: { cellWidth: 20, halign: "center" },
        7: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const v = data.cell.raw;
          if (v === "Confirmed") data.cell.styles.textColor = [26, 107, 64];
          else if (v === "Declined") data.cell.styles.textColor = [122, 24, 48];
          else data.cell.styles.textColor = [122, 80, 0];
        }
        if (data.section === "body" && data.column.index === 4) {
          const v = data.cell.raw;
          if (v === "Delivered") data.cell.styles.textColor = [26, 107, 64];
          else if (v === "Sent") data.cell.styles.textColor = [42, 74, 142];
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(`Page ${i} of ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
      doc.text("Thulani & Isuru — Wedding Guest Manager", 14, doc.internal.pageSize.getHeight() - 6);
    }

    const slug = categoryName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    doc.save(`guest-report-${slug}-${new Date().toISOString().split("T")[0]}.pdf`);
    showToast(`PDF for "${categoryName}" downloaded ✓`);
  };

  const downloadCategoriesBreakdownPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const rose = [176, 82, 120];
    const dark = [61, 24, 41];
    const muted = [122, 77, 99];
    const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const hexToRgb = (hex) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : [176, 82, 120];
    };

    let firstPage = true;

    categories.forEach((cat) => {
      const catGuests = guests.filter(g => g.category === cat.name);
      
      if (!firstPage) {
        doc.addPage();
      }
      firstPage = false;

      // Header block with the category's theme color
      const catColor = hexToRgb(cat.color || "#A0547A");
      doc.setFillColor(...catColor);
      doc.rect(0, 0, pageW, 25, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(`Category: ${cat.name}`, pageW / 2, 11, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(240, 240, 240);
      doc.text(`Generated ${now} • Wedding Guest Manager`, pageW / 2, 18, { align: "center" });

      // Stats calculations
      const totalInvited = catGuests.reduce((a, g) => a + g.count, 0);
      const totalAttending = catGuests.reduce((a, g) => a + getAttending(g), 0);
      const confirmed = catGuests.filter(g => g.rsvp === "confirmed").reduce((a, g) => a + getAttending(g), 0);
      const pending = catGuests.filter(g => g.rsvp === "pending").reduce((a, g) => a + getAttending(g), 0);
      const declined = catGuests.filter(g => g.rsvp === "declined").reduce((a, g) => a + getAttending(g), 0);
      const invDelivered = catGuests.filter(g => g.inviteStatus === "delivered").length;
      const invSent = catGuests.filter(g => g.inviteStatus === "sent").length;
      const invNotSent = catGuests.filter(g => !g.inviteStatus || g.inviteStatus === "not_sent").length;
      const confirmedPct = totalAttending > 0 ? Math.round((confirmed / totalAttending) * 100) : 0;
      const invPct = catGuests.length > 0 ? Math.round(((invDelivered + invSent) / catGuests.length) * 100) : 0;

      const stats = [
        ["Guest Groups", catGuests.length],
        ["Total Invited", totalInvited],
        ["Total Attending", totalAttending],
        ["Confirmed", `${confirmed} (${confirmedPct}%)`],
        ["Pending RSVP", pending],
        ["Declined", declined],
        ["Invites Delivered", invDelivered],
        ["Invites Sent", invSent],
        ["Not Sent", invNotSent],
        ["Invite Sent %", `${invPct}%`],
      ];

      // Draw stats grid
      const colW = (pageW - 28) / 5; // margins 14 on each side
      let sy = 31;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text("Category Summary", 14, sy);
      sy += 3;

      stats.forEach((s, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = 14 + col * colW;
        const y = sy + row * 18;
        doc.setFillColor(253, 244, 247);
        doc.roundedRect(x, y, colW - 3, 15, 1.5, 1.5, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...muted);
        doc.text(String(s[0]).toUpperCase(), x + 3, y + 5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...dark);
        doc.text(String(s[1]), x + 3, y + 11);
      });

      // Guest list table below
      let tableStartY = sy + 2 * 18 + 5;

      if (catGuests.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(...muted);
        doc.text("No guests assigned to this category.", 14, tableStartY + 10);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...dark);
        doc.text("Guests in Category", 14, tableStartY);
        tableStartY += 3;

        const rsvpLabel = { confirmed: "Confirmed", pending: "Pending", declined: "Declined" };
        const invLabel  = { delivered: "Delivered", sent: "Sent", not_sent: "Not Sent" };

        const guestRows = [...catGuests]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(g => [
            g.name,
            g.count || 0,
            getAttending(g),
            rsvpLabel[g.rsvp || "pending"],
            invLabel[g.inviteStatus || "not_sent"],
            g.inviteSentDate ? fmtDate(g.inviteSentDate) : "—",
            g.table ? `Table ${g.table}` : "—",
            g.notes || "—",
          ]);

        autoTable(doc, {
          startY: tableStartY,
          head: [["Name", "Invited", "Attending", "RSVP", "Invite", "Date Sent", "Table", "Notes"]],
          body: guestRows,
          theme: "striped",
          headStyles: { fillColor: catColor, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
          bodyStyles: { fontSize: 7.5, textColor: dark },
          alternateRowStyles: { fillColor: [253, 244, 247] },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 18, halign: "center" },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: 24 },
            4: { cellWidth: 24 },
            5: { cellWidth: 26 },
            6: { cellWidth: 20, halign: "center" },
            7: { cellWidth: "auto" },
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 3) {
              const v = data.cell.raw;
              if (v === "Confirmed") data.cell.styles.textColor = [26, 107, 64];
              else if (v === "Declined") data.cell.styles.textColor = [122, 24, 48];
              else data.cell.styles.textColor = [122, 80, 0];
            }
            if (data.section === "body" && data.column.index === 4) {
              const v = data.cell.raw;
              if (v === "Delivered") data.cell.styles.textColor = [26, 107, 64];
              else if (v === "Sent") data.cell.styles.textColor = [42, 74, 142];
            }
          },
          margin: { left: 14, right: 14 },
        });
      }
    });

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(`Page ${i} of ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
      doc.text("Thulani & Isuru — Wedding Guest Manager", 14, doc.internal.pageSize.getHeight() - 6);
    }

    doc.save(`categories-breakdown-report-${new Date().toISOString().split("T")[0]}.pdf`);
    showToast("Categories breakdown PDF downloaded ✓");
  };

  const tables=[...new Set(guests.map(g=>g.table).filter(Boolean))].sort((a,b)=>a-b);
  const filtered=guests.filter(g=>{
    if(search&&!g.name.toLowerCase().includes(search.toLowerCase())&&!(g.notes||"").toLowerCase().includes(search.toLowerCase())) return false;
    if(filterCat!=="all"&&g.category!==filterCat) return false;
    if(filterRsvp!=="all"&&g.rsvp!==filterRsvp) return false;
    if(separateDeclined&&filterRsvp!=="declined"&&g.rsvp==="declined") return false;
    if(filterTable!=="all"){if(filterTable==="none"&&g.table)return false;if(filterTable!=="none"&&g.table!==Number(filterTable))return false;}
    return true;
  }).sort((a,b)=>{
    let av,bv;
    if(sortCol==="attending"){av=getAttending(a);bv=getAttending(b);}else if(sortCol==="table"){av=a.table||9999;bv=b.table||9999;}else if(sortCol==="count"){av=a.count;bv=b.count;}else{av=(a[sortCol]||"").toString().toLowerCase();bv=(b[sortCol]||"").toString().toLowerCase();}
    return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1);
  });

  const declinedGuestsFiltered=guests.filter(g=>{
    if(g.rsvp!=="declined") return false;
    if(search&&!g.name.toLowerCase().includes(search.toLowerCase())&&!(g.notes||"").toLowerCase().includes(search.toLowerCase())) return false;
    if(filterCat!=="all"&&g.category!==filterCat) return false;
    if(filterTable!=="all"){if(filterTable==="none"&&g.table)return false;if(filterTable!=="none"&&g.table!==Number(filterTable))return false;}
    return true;
  }).sort((a,b)=>a.name.localeCompare(b.name));

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
            {isAdmin&&<button className={`nav-btn${view==="audit"?" active":""}`} onClick={()=>setView("audit")}>Audit<span className="nav-count">{auditLogs.length}</span></button>}
          </nav>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <div style={{position:"relative"}}>
              <button
                className="btn btn-ghost logout-btn"
                style={{borderColor:"rgba(196,154,108,.4)",color:"#C49A6C",display:"flex",alignItems:"center",gap:4}}
                onClick={()=>setPdfMenuOpen(o=>!o)}
                title="Download PDF report"
              >⬇ PDF <span style={{fontSize:9,opacity:.7}}>{pdfMenuOpen?"▲":"▼"}</span></button>
              {pdfMenuOpen&&(
                <div
                  style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"#fff",border:"1px solid #EDD8E2",borderRadius:8,boxShadow:"0 4px 16px rgba(61,24,41,.15)",minWidth:190,zIndex:999}}
                  onMouseLeave={()=>setPdfMenuOpen(false)}
                >
                  <div style={{padding:"6px 0"}}>
                    <button
                      style={{display:"block",width:"100%",textAlign:"left",padding:"8px 14px",background:"none",border:"none",color:"#3D1829",fontSize:13,cursor:"pointer",fontWeight:600}}
                      onMouseEnter={e=>e.currentTarget.style.background="#FDF4F7"}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}
                      onClick={()=>{setPdfMenuOpen(false);downloadPDF();}}
                    >Full Report</button>
                    <button
                      style={{display:"block",width:"100%",textAlign:"left",padding:"8px 14px",background:"none",border:"none",color:"#3D1829",fontSize:13,cursor:"pointer",fontWeight:600}}
                      onMouseEnter={e=>e.currentTarget.style.background="#FDF4F7"}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}
                      onClick={()=>{setPdfMenuOpen(false);downloadCategoriesBreakdownPDF();}}
                    >Categories Breakdown</button>
                    <div style={{height:1,background:"#EDD8E2",margin:"4px 0"}}/>
                    {categories.map(cat=>(
                      <button
                        key={cat.name}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"8px 14px",background:"none",border:"none",color:"#3D1829",fontSize:13,cursor:"pointer"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#FDF4F7"}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}
                        onClick={()=>{setPdfMenuOpen(false);downloadCategoryPDF(cat.name);}}
                      >
                        <span style={{width:10,height:10,borderRadius:"50%",background:cat.color,flexShrink:0,display:"inline-block"}}/>
                        {cat.name.replace(" Invites","")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
<button className="btn btn-ghost logout-btn" onClick={()=>signOut(auth)}>Logout</button>
          </div>
        </header>

        <main className="main">
          {view==="dashboard"&&(<><div className="top-bar dashboard-topbar"><div><p className="page-eyebrow">Wedding Guest Manager</p><h2 className="page-title">Dashboard</h2></div><button className="btn btn-primary" onClick={()=>setView("guests")}>Manage guests →</button></div><Dashboard guests={guests} categories={categories} user={user}/></>)}

          {view==="guests"&&(
            <>
              <div className="top-bar"><h2 className="page-title">Guest List</h2><button className="btn btn-primary" onClick={()=>setModalGuest({})}>+ Add Guest</button></div>
              <div className="toolbar">
                <div className="search-wrap"><span className="search-icon">🔍</span><input placeholder="Search name or notes…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                <select className="filter-select" value={filterCat} onChange={e=>setFilterCat(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select>
                <select className="filter-select" value={filterRsvp} onChange={e=>setFilterRsvp(e.target.value)}><option value="all">All RSVP</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="declined">Declined</option></select>
                <select className="filter-select" value={filterTable} onChange={e=>setFilterTable(e.target.value)}><option value="all">All tables</option><option value="none">Unassigned</option>{tables.map(t=><option key={t} value={t}>Table {t}</option>)}</select>
                <button type="button" className={`toggle-separate-declined${separateDeclined?" active":""}`} onClick={()=>setSeparateDeclined(!separateDeclined)}>
                  Separate Declined
                </button>
                {(search||filterCat!=="all"||filterRsvp!=="all"||filterTable!=="all")&&<button className="btn btn-ghost" style={{padding:"7px 12px"}} onClick={()=>{setSearch("");setFilterCat("all");setFilterRsvp("all");setFilterTable("all");}}>✕ Clear</button>}
                <span className="results-info">{filtered.length}/{guests.length} groups · {filtered.reduce((a,g)=>a+getAttending(g),0)} attending</span>
              </div>
              <div className="guest-list-container">
                <div className="table-wrap table-wrap-main">
                  {filtered.length===0?<div className="empty"><div style={{fontSize:36,marginBottom:12}}>🪷</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.textMuted}}>No guests found</div></div>:(
                    <table><thead><tr>
                      <th style={{width:"20%"}} onClick={()=>handleSort("name")}>Name <SH col="name"/></th>
                      <th style={{width:"14%"}} onClick={()=>handleSort("category")}>Category <SH col="category"/></th>
                      <th style={{width:"9%"}} onClick={()=>handleSort("attending")}>Attending <SH col="attending"/></th>
                      <th style={{width:"12%"}}>RSVP</th>
                      <th style={{width:"13%"}}>Invite</th>
                      <th style={{width:"7%",textAlign:"center"}} onClick={()=>handleSort("table")}>Table <SH col="table"/></th>
                      <th style={{width:"15%"}}>Notes</th>
                      <th style={{width:"10%",textAlign:"right"}}>Actions</th>
                    </tr></thead><tbody>
                      {filtered.map(g=>(
                        <tr key={g.id}>
                          <td className="name-cell" title={g.name}>{g.name}</td>
                          <td><CatBadge category={g.category} categories={categories}/></td>
                          <td><CountDisplay g={g}/></td>
                          <td><RsvpBadge rsvp={g.rsvp} onChange={rsvp=>handleRsvpChange(g.id,rsvp)}/></td>
                          <td><InvBadge status={g.inviteStatus||"not_sent"} onChange={s=>handleInviteChange(g.id,s)}/></td>
                          <td style={{textAlign:"center"}}>{g.table?<span className="table-tag">T{g.table}</span>:<span style={{color:T.borderLight}}>—</span>}</td>
                          <td style={{fontSize:12,color:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:0}} title={g.notes||""}>{g.notes||<span style={{color:T.borderLight}}>—</span>}</td>
                          <td style={{textAlign:"right"}}><button className="action-btn" onClick={()=>setModalGuest(g)} title="Edit">✏️</button><button className="action-btn del" onClick={()=>setConfirmId(g.id)} title="Remove">🗑</button></td>
                        </tr>
                      ))}
                    </tbody></table>
                  )}
                </div>

                {separateDeclined && filterRsvp !== "declined" && declinedGuestsFiltered.length > 0 && (
                  <div className="declined-sidebar">
                    <div className="declined-sidebar-header">
                      <span className="declined-sidebar-title">Declined RSVPs</span>
                      <span className="nav-count" style={{background:T.surfaceAlt, color:T.textMid, marginLeft:0}}>{declinedGuestsFiltered.length}</span>
                    </div>
                    <div className="declined-list">
                      {declinedGuestsFiltered.map(g=>{
                        const catColor = categories.find(c=>c.name===g.category)?.color || T.primary;
                        return (
                          <div key={g.id} className="declined-card">
                            <div className="declined-card-name" title={g.name}>{g.name}</div>
                            <div className="declined-card-meta">
                              <span className="declined-card-cat" style={{background:`${catColor}15`, color:catColor}}>{g.category.replace(" Invites","")}</span>
                              <span className="declined-card-count">{g.count} invited</span>
                            </div>
                            <div className="declined-card-actions">
                              <button className="action-btn" onClick={()=>handleRsvpChange(g.id,"pending")} title="Re-invite" style={{fontSize:13}}>🔄</button>
                              <button className="action-btn" onClick={()=>setModalGuest(g)} title="Edit" style={{fontSize:13}}>✏️</button>
                              <button className="action-btn del" onClick={()=>setConfirmId(g.id)} title="Remove" style={{fontSize:13}}>🗑</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {view==="invitations"&&<InvitationsTab guests={guests} updateGuests={updateGuests} categories={categories} showToast={showToast}/>}
          {view==="categories"&&<CategoryManager categories={categories} setCategories={smartSetCategories} guests={guests} showToast={showToast} downloadCategoriesBreakdownPDF={downloadCategoriesBreakdownPDF}/>}
          {view==="audit"&&isAdmin&&<AuditLogsTab logs={auditLogs} loading={auditLoading}/>}
        </main>
      </div>

      {modalGuest!==null&&<GuestModal guest={modalGuest} categories={categories} onClose={()=>setModalGuest(null)} onSave={handleSave}/>}
      {confirmId&&(<div className="confirm-overlay"><div className="confirm-box"><div className="confirm-title">Remove guest?</div><div className="confirm-sub">"{guests.find(g=>g.id===confirmId)?.name}" will be permanently removed.</div><div className="confirm-btns"><button className="btn btn-ghost" onClick={()=>setConfirmId(null)}>Cancel</button><button className="btn btn-danger" onClick={()=>handleDelete(confirmId)}>Remove</button></div></div></div>)}
      {toast&&<div className="toast">{toast}</div>}
    </>
  );
}
