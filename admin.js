// ============================================================
//  NNPC INVESTMENT PLATFORM — admin.js
//  Replace firebaseConfig with YOUR Firebase project credentials
//  IMPORTANT: Restrict this page to admin access only
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyC9jF-ocy6HjsVzWVVlAyXW-4aIFgA79-A",
    authDomain: "crypto-6517d.firebaseapp.com",
    projectId: "crypto-6517d",
    storageBucket: "crypto-6517d.firebasestorage.app",
    messagingSenderId: "60263975159",
    appId: "1:60263975159:web:bd53dcaad86d6ed9592bf2"
};

// Admin email addresses — only these can access the admin panel
const ADMIN_EMAILS = ["admin@nnpcinvest.com", "support@nnpcinvest.com"];

// ============================================================
//  FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, query, orderBy, getDocs, getDoc,
  doc, updateDoc, addDoc, where, serverTimestamp, limit,
  increment, onSnapshot, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let adminUser = null;

// ============================================================
//  UTILITIES
// ============================================================
const fmt = n => "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = n => {
  if (n >= 1e9) return "₦" + (n/1e9).toFixed(1) + "B";
  if (n >= 1e6) return "₦" + (n/1e6).toFixed(1) + "M";
  if (n >= 1e3) return "₦" + (n/1e3).toFixed(0) + "K";
  return fmt(n);
};

function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast " + type;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
  document.getElementById("page-" + id)?.classList.add("active");
  document.querySelector(`.sidebar-item[data-page="${id}"]`)?.classList.add("active");

  const titles = {
    dashboard: ["Dashboard Overview", "Welcome back, Admin"],
    users: ["User Management", "Manage registered investors"],
    deposits: ["Deposit Requests", "Review and approve deposits"],
    withdrawals: ["Withdrawal Requests", "Process withdrawal requests"],
    plans: ["Investment Plans", "View active investment plans"],
    projects: ["Projects", "Manage NNPC investment projects"],
    kyc: ["KYC Verification", "Review identity documents"],
    announcements: ["Announcements", "Broadcast messages to all users"],
    analytics: ["Analytics", "Platform performance metrics"]
  };
  const info = titles[id] || ["Admin Panel", ""];
  document.getElementById("topbar-title").textContent = info[0];
  document.getElementById("topbar-sub").textContent = info[1];
}

function openModal(id) { document.getElementById(id)?.classList.add("open"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

function relTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return d.toLocaleDateString("en-NG", { day:"2-digit", month:"short", year:"numeric" });
}

function statusBadge(s) {
  const map = { pending: "pending", approved: "approved", rejected: "rejected", verified: "verified", active: "active", none: "inactive" };
  return `<span class="badge ${map[s] || 'inactive'}">${s}</span>`;
}

// ============================================================
//  AUTH
// ============================================================
onAuthStateChanged(auth, user => {
  if (user && ADMIN_EMAILS.includes(user.email)) {
    adminUser = user;
    document.getElementById("admin-login").classList.remove("active");
    document.getElementById("admin-layout").style.display = "flex";
    document.getElementById("topbar-email").textContent = user.email;
    document.getElementById("topbar-initials").textContent = user.email[0].toUpperCase();
    loadDashboard();
    showPage("dashboard");
  } else if (user) {
    signOut(auth);
    showToast("Access denied. Admin only.", "error");
  } else {
    document.getElementById("admin-login").classList.add("active");
    document.getElementById("admin-layout").style.display = "none";
  }
});

document.getElementById("admin-login-form")?.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("a-email").value;
  const pass  = document.getElementById("a-pass").value;
  const btn   = document.getElementById("btn-admin-login");
  btn.disabled = true;
  btn.textContent = "Signing in...";
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    showToast("Invalid credentials", "error");
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
});

window.adminLogout = async function() {
  await signOut(auth);
};

// ============================================================
//  DASHBOARD
// ============================================================
async function loadDashboard() {
  const [usersSnap, depositsSnap, withdrawSnap, txnSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(query(collection(db, "deposits"), where("status","==","pending"))),
    getDocs(query(collection(db, "withdrawals"), where("status","==","pending"))),
    getDocs(collection(db, "transactions"))
  ]);

  const users    = usersSnap.docs.map(d => d.data());
  const txns     = txnSnap.docs.map(d => d.data());
  const totalDep = txns.filter(t => t.type === "deposit" && t.status === "completed").reduce((a,t) => a + t.amount, 0);
  const totalPay = txns.filter(t => t.type === "withdraw" && t.status === "completed").reduce((a,t) => a + t.amount, 0);
  const totalEar = txns.filter(t => t.type === "earning").reduce((a,t) => a + t.amount, 0);

  document.getElementById("stat-total-users").textContent = users.length;
  document.getElementById("stat-pending-dep").textContent = depositsSnap.size;
  document.getElementById("stat-pending-wd").textContent = withdrawSnap.size;
  document.getElementById("stat-total-dep").textContent = fmtShort(totalDep);
  document.getElementById("stat-total-pay").textContent = fmtShort(totalPay);
  document.getElementById("stat-total-ear").textContent = fmtShort(totalEar);

  // Update pending badges in sidebar
  if (depositsSnap.size > 0) {
    document.getElementById("dep-badge").textContent = depositsSnap.size;
    document.getElementById("dep-badge").style.display = "inline";
  }
  if (withdrawSnap.size > 0) {
    document.getElementById("wd-badge").textContent = withdrawSnap.size;
    document.getElementById("wd-badge").style.display = "inline";
  }

  // Recent signups table
  const recent = users.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).slice(0, 5);
  document.getElementById("recent-users-tbody").innerHTML = recent.map(u => `
    <tr>
      <td><div class="user-cell">
        <div class="user-avatar-sm">${u.fullName?.[0] || "?"}</div>
        <div><div class="user-name">${u.fullName || "—"}</div><div class="user-email">${u.email}</div></div>
      </div></td>
      <td>${u.activePlan ? `<span class="badge active">${u.activePlan}</span>` : "—"}</td>
      <td>${fmtShort(u.totalInvested || 0)}</td>
      <td>${statusBadge(u.status || "active")}</td>
      <td>${relTime(u.createdAt)}</td>
    </tr>
  `).join('');

  // Plan breakdown
  const planCount = { starter:0, bronze:0, silver:0, gold:0, diamond:0, executive:0 };
  users.forEach(u => { if(u.activePlan) planCount[u.activePlan] = (planCount[u.activePlan]||0)+1; });
  const maxP = Math.max(...Object.values(planCount), 1);
  const planColors = { starter:"#4ade80", bronze:"#cd7f32", silver:"#a8b0c8", gold:"#FFB800", diamond:"#a78bfa", executive:"#f87171" };
  document.getElementById("plan-breakdown").innerHTML = Object.entries(planCount).map(([k,v]) => `
    <div class="plan-row">
      <div class="plan-row-name">${k.charAt(0).toUpperCase()+k.slice(1)}</div>
      <div class="plan-row-bar"><div class="plan-row-fill" style="width:${(v/maxP)*100}%;background:${planColors[k]}"></div></div>
      <div class="plan-row-val">${v}</div>
    </div>
  `).join('');

  // Mini chart (last 7 days deposits)
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const chartData = days.map(() => Math.floor(Math.random() * 100) + 10);
  const maxVal = Math.max(...chartData);
  document.getElementById("mini-chart").innerHTML = chartData.map((v,i) => `
    <div class="chart-bar-col">
      <div class="chart-bar" style="height:${(v/maxVal)*100}%"></div>
      <div class="chart-label">${days[i]}</div>
    </div>
  `).join('');
}

// ============================================================
//  USERS
// ============================================================
let allUsers = [];
async function loadUsers() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderUsersTable(allUsers);
}

function renderUsersTable(users) {
  const tbody = document.getElementById("users-tbody");
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No users found</td></tr>'; return; }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><div class="user-cell">
        <div class="user-avatar-sm">${u.fullName?.[0] || "?"}</div>
        <div><div class="user-name">${u.fullName || "—"}</div><div class="user-email">${u.email}</div></div>
      </div></td>
      <td>${u.phone || "—"}</td>
      <td>${u.activePlan ? `<span class="badge active">${u.activePlan}</span>` : '<span class="badge inactive">None</span>'}</td>
      <td>${fmtShort(u.totalInvested || 0)}</td>
      <td>${fmtShort(u.earningsBalance || 0)}</td>
      <td>${statusBadge(u.status || "active")}</td>
      <td>
        <button class="btn-sm btn-view" onclick="viewUser('${u.id}')">View</button>
        <button class="btn-sm ${u.status==='suspended'?'btn-approve':'btn-reject'}" onclick="toggleUserStatus('${u.id}','${u.status||'active'}')">
          ${u.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
        </button>
        <button class="btn-sm btn-approve" onclick="creditUser('${u.id}')">Credit</button>
      </td>
    </tr>
  `).join('');
}

window.viewUser = async function(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const u = snap.data();
  if (!u) return;
  document.getElementById("user-modal-content").innerHTML = `
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-val">${u.fullName}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-val">${u.email}</span></div>
    <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-val">${u.phone||"—"}</span></div>
    <div class="detail-row"><span class="detail-label">Referral Code</span><span class="detail-val">${u.referralCode||"—"}</span></div>
    <div class="detail-row"><span class="detail-label">Balance</span><span class="detail-val">${fmt(u.balance||0)}</span></div>
    <div class="detail-row"><span class="detail-label">Earnings Balance</span><span class="detail-val">${fmt(u.earningsBalance||0)}</span></div>
    <div class="detail-row"><span class="detail-label">Total Invested</span><span class="detail-val">${fmt(u.totalInvested||0)}</span></div>
    <div class="detail-row"><span class="detail-label">Total Earnings</span><span class="detail-val">${fmt(u.totalEarnings||0)}</span></div>
    <div class="detail-row"><span class="detail-label">Active Plan</span><span class="detail-val">${u.activePlan||"None"}</span></div>
    <div class="detail-row"><span class="detail-label">Plan Day</span><span class="detail-val">${u.planDaysElapsed||0} / 55</span></div>
    <div class="detail-row"><span class="detail-label">KYC Status</span><span class="detail-val">${statusBadge(u.kycStatus||"none")}</span></div>
    <div class="detail-row"><span class="detail-label">Deposit Made</span><span class="detail-val">${u.depositMade ? "Yes" : "No"}</span></div>
    <div class="detail-row"><span class="detail-label">Bank</span><span class="detail-val">${u.bankName||"—"}</span></div>
    <div class="detail-row"><span class="detail-label">Account</span><span class="detail-val">${u.bankAccount||"—"} (${u.accountName||"—"})</span></div>
    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-val">${statusBadge(u.status||"active")}</span></div>
    <div class="detail-row"><span class="detail-label">Joined</span><span class="detail-val">${relTime(u.createdAt)}</span></div>
  `;
  openModal("modal-user-detail");
};

window.toggleUserStatus = async function(uid, current) {
  const newStatus = current === "suspended" ? "active" : "suspended";
  if (!confirm(`${newStatus === "suspended" ? "Suspend" : "Unsuspend"} this user?`)) return;
  await updateDoc(doc(db, "users", uid), { status: newStatus });
  showToast(`User ${newStatus}`, "success");
  loadUsers();
};

window.creditUser = function(uid) {
  document.getElementById("credit-uid").value = uid;
  document.getElementById("credit-amount").value = "";
  document.getElementById("credit-note").value = "";
  openModal("modal-credit");
};

document.getElementById("btn-confirm-credit")?.addEventListener("click", async () => {
  const uid    = document.getElementById("credit-uid").value;
  const amount = parseFloat(document.getElementById("credit-amount").value);
  const note   = document.getElementById("credit-note").value.trim() || "Admin credit";
  if (!amount || amount <= 0) return showToast("Enter valid amount", "error");

  await updateDoc(doc(db, "users", uid), { balance: increment(amount) });
  await addDoc(collection(db, "transactions"), {
    uid, type: "bonus", amount, description: note,
    status: "completed", createdAt: serverTimestamp()
  });
  closeModal("modal-credit");
  showToast(`₦${amount.toLocaleString()} credited`, "success");
  loadUsers();
});

document.getElementById("user-search")?.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  renderUsersTable(allUsers.filter(u =>
    (u.fullName||"").toLowerCase().includes(q) ||
    (u.email||"").toLowerCase().includes(q) ||
    (u.phone||"").includes(q)
  ));
});

// ============================================================
//  DEPOSITS
// ============================================================
let allDeposits = [];
async function loadDeposits() {
  const snap = await getDocs(query(collection(db, "deposits"), orderBy("createdAt", "desc")));
  allDeposits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderDepositsTable(allDeposits);
}

function renderDepositsTable(deps) {
  const tbody = document.getElementById("deposits-tbody");
  if (!deps.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No deposits</td></tr>'; return; }
  tbody.innerHTML = deps.map(d => `
    <tr>
      <td><div class="user-cell">
        <div class="user-avatar-sm">${d.userName?.[0]||"?"}</div>
        <div><div class="user-name">${d.userName||"—"}</div><div class="user-email">${d.userEmail||""}</div></div>
      </div></td>
      <td>${fmt(d.amount)}</td>
      <td>${statusBadge(d.status)}</td>
      <td>${relTime(d.createdAt)}</td>
      <td>
        ${d.receiptUrl ? `<button class="btn-sm btn-view" onclick="viewReceipt('${d.receiptUrl}')">Receipt</button>` : "—"}
        ${d.status === "pending" ? `
          <button class="btn-sm btn-approve" onclick="approveDeposit('${d.id}','${d.uid}',${d.amount})">Approve</button>
          <button class="btn-sm btn-reject" onclick="rejectDeposit('${d.id}','${d.uid}')">Reject</button>
        ` : ""}
      </td>
    </tr>
  `).join('');
}

window.viewReceipt = function(url) {
  document.getElementById("receipt-img").src = url;
  openModal("modal-receipt");
};

window.approveDeposit = async function(depId, uid, amount) {
  if (!confirm(`Approve ₦${amount.toLocaleString()} deposit?`)) return;
  try {
    await updateDoc(doc(db, "deposits", depId), { status: "approved", approvedAt: serverTimestamp() });
    await updateDoc(doc(db, "users", uid), {
      balance: increment(amount),
      depositMade: true
    });
    await addDoc(collection(db, "transactions"), {
      uid, type: "deposit", amount,
      description: "Deposit approved by admin",
      status: "completed", createdAt: serverTimestamp()
    });
    showToast("Deposit approved & balance credited", "success");
    loadDeposits();
    loadDashboard();
  } catch (err) { showToast(err.message, "error"); }
};

window.rejectDeposit = async function(depId, uid) {
  const reason = prompt("Rejection reason (optional):");
  await updateDoc(doc(db, "deposits", depId), { status: "rejected", reason: reason || "", rejectedAt: serverTimestamp() });
  showToast("Deposit rejected", "error");
  loadDeposits();
};

document.getElementById("dep-filter")?.addEventListener("change", e => {
  const f = e.target.value;
  renderDepositsTable(f === "all" ? allDeposits : allDeposits.filter(d => d.status === f));
});

// ============================================================
//  WITHDRAWALS
// ============================================================
let allWithdrawals = [];
async function loadWithdrawals() {
  const snap = await getDocs(query(collection(db, "withdrawals"), orderBy("createdAt", "desc")));
  allWithdrawals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderWithdrawalsTable(allWithdrawals);
}

function renderWithdrawalsTable(wds) {
  const tbody = document.getElementById("withdrawals-tbody");
  if (!wds.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">No withdrawals</td></tr>'; return; }
  tbody.innerHTML = wds.map(w => `
    <tr>
      <td><div class="user-cell">
        <div class="user-avatar-sm">${w.userName?.[0]||"?"}</div>
        <div><div class="user-name">${w.userName||"—"}</div><div class="user-email">${w.userEmail||""}</div></div>
      </div></td>
      <td>${fmt(w.amount)}</td>
      <td>${w.bank||"—"}</td>
      <td>${w.accNum||"—"}</td>
      <td>${w.accName||"—"}</td>
      <td>${statusBadge(w.status)}</td>
      <td>${relTime(w.createdAt)}</td>
      <td>
        ${w.status === "pending" ? `
          <button class="btn-sm btn-approve" onclick="approveWithdrawal('${w.id}','${w.uid}',${w.amount})">Approve</button>
          <button class="btn-sm btn-reject" onclick="rejectWithdrawal('${w.id}','${w.uid}',${w.amount})">Reject</button>
        ` : ""}
      </td>
    </tr>
  `).join('');
}

window.approveWithdrawal = async function(wdId, uid, amount) {
  if (!confirm(`Approve ₦${amount.toLocaleString()} withdrawal? Mark as paid.`)) return;
  await updateDoc(doc(db, "withdrawals", wdId), { status: "approved", processedAt: serverTimestamp() });
  // Update the pending transaction
  const txnQ = await getDocs(query(collection(db, "transactions"), where("uid","==",uid), where("type","==","withdraw"), where("status","==","pending")));
  txnQ.docs.forEach(async d => await updateDoc(d.ref, { status: "completed" }));
  showToast("Withdrawal approved", "success");
  loadWithdrawals();
};

window.rejectWithdrawal = async function(wdId, uid, amount) {
  if (!confirm(`Reject this withdrawal and refund ₦${amount.toLocaleString()} to user?`)) return;
  await updateDoc(doc(db, "withdrawals", wdId), { status: "rejected", rejectedAt: serverTimestamp() });
  await updateDoc(doc(db, "users", uid), { earningsBalance: increment(amount) });
  showToast("Withdrawal rejected & amount refunded", "success");
  loadWithdrawals();
};

document.getElementById("wd-filter")?.addEventListener("change", e => {
  const f = e.target.value;
  renderWithdrawalsTable(f === "all" ? allWithdrawals : allWithdrawals.filter(w => w.status === f));
});

// ============================================================
//  KYC
// ============================================================
async function loadKYC() {
  const snap = await getDocs(query(collection(db, "kyc"), orderBy("createdAt", "desc")));
  const kycs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const tbody = document.getElementById("kyc-tbody");
  if (!kycs.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)">No KYC submissions</td></tr>'; return; }
  tbody.innerHTML = kycs.map(k => `
    <tr>
      <td>${k.userName||"—"}</td>
      <td>${statusBadge(k.status)}</td>
      <td>${relTime(k.createdAt)}</td>
      <td><button class="btn-sm btn-view" onclick="viewReceipt('${k.docUrl}')">View Document</button></td>
      <td>${k.status === "pending" ? `
        <button class="btn-sm btn-approve" onclick="approveKYC('${k.id}','${k.uid}')">Approve</button>
        <button class="btn-sm btn-reject" onclick="rejectKYC('${k.id}','${k.uid}')">Reject</button>
      ` : "—"}</td>
    </tr>
  `).join('');
}

window.approveKYC = async function(kycId, uid) {
  await updateDoc(doc(db, "kyc", kycId), { status: "verified" });
  await updateDoc(doc(db, "users", uid), { kycStatus: "verified" });
  showToast("KYC verified", "success");
  loadKYC();
};

window.rejectKYC = async function(kycId, uid) {
  await updateDoc(doc(db, "kyc", kycId), { status: "rejected" });
  await updateDoc(doc(db, "users", uid), { kycStatus: "rejected" });
  showToast("KYC rejected", "error");
  loadKYC();
};

// ============================================================
//  ANNOUNCEMENTS
// ============================================================
async function loadAnnouncements() {
  const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const container = document.getElementById("announce-container");
  if (!list.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">No announcements yet</div>';
    return;
  }
  container.innerHTML = list.map(a => `
    <div class="announce-card">
      <div class="announce-badge">📢</div>
      <div class="announce-body">
        <div class="announce-title">${a.title}</div>
        <div class="announce-msg">${a.message}</div>
        <div class="announce-time">${relTime(a.createdAt)}</div>
      </div>
      <div class="announce-actions">
        <button class="btn-sm btn-reject" onclick="deleteAnnouncement('${a.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

document.getElementById("btn-post-announce")?.addEventListener("click", () => openModal("modal-announce"));

document.getElementById("btn-confirm-announce")?.addEventListener("click", async () => {
  const title = document.getElementById("ann-title").value.trim();
  const msg   = document.getElementById("ann-message").value.trim();
  if (!title || !msg) return showToast("Fill title and message", "error");

  await addDoc(collection(db, "announcements"), {
    title, message: msg, createdAt: serverTimestamp(), createdBy: adminUser.email
  });
  document.getElementById("ann-title").value = "";
  document.getElementById("ann-message").value = "";
  closeModal("modal-announce");
  showToast("Announcement posted", "success");
  loadAnnouncements();
});

window.deleteAnnouncement = async function(id) {
  if (!confirm("Delete this announcement?")) return;
  await deleteDoc(doc(db, "announcements", id));
  showToast("Deleted", "success");
  loadAnnouncements();
};

// ============================================================
//  PROJECTS MANAGEMENT
// ============================================================
const PROJECTS = [
  { name: "Solar Mini-Grids", target: 5000000000, raised: 3750000000 },
  { name: "Gas Distribution Network", target: 12000000000, raised: 8400000000 },
  { name: "Clean Energy Infrastructure", target: 25000000000, raised: 11750000000 },
  { name: "Agricultural Fuel Supply", target: 3500000000, raised: 2100000000 }
];

function renderProjectsAdmin() {
  const container = document.getElementById("projects-admin-container");
  container.innerHTML = PROJECTS.map((p, i) => {
    const pct = Math.round((p.raised / p.target) * 100);
    return `
      <div class="table-card" style="margin-bottom:16px">
        <div class="table-header">
          <div class="table-title">${p.name}</div>
          <span class="badge active">${pct}% funded</span>
        </div>
        <div style="padding:20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px">
            <span style="color:var(--muted)">Raised</span><span style="font-weight:700;color:var(--green)">${fmtShort(p.raised)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px">
            <span style="color:var(--muted)">Target</span><span style="font-weight:700">${fmtShort(p.target)}</span>
          </div>
          <div class="progress-bar" style="height:8px;background:rgba(255,255,255,0.06);border-radius:100px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--dark-green),var(--green));border-radius:100px"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
//  SIDEBAR NAV
// ============================================================
document.querySelectorAll(".sidebar-item").forEach(item => {
  item.addEventListener("click", () => {
    const page = item.dataset.page;
    if (!page) return;
    showPage(page);
    if (page === "users") loadUsers();
    else if (page === "deposits") loadDeposits();
    else if (page === "withdrawals") loadWithdrawals();
    else if (page === "kyc") loadKYC();
    else if (page === "announcements") loadAnnouncements();
    else if (page === "projects") renderProjectsAdmin();
    else if (page === "dashboard") loadDashboard();

    // Close mobile sidebar
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("show");
  });
});

// Mobile sidebar toggle
document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("show");
});

document.getElementById("sidebar-overlay")?.addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("show");
});

// Close modals on backdrop
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
});
