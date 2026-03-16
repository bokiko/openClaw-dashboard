#!/usr/bin/env python3
"""
OpenClaw → Dashboard Sync
Reads all agent sessions.json files and generates dashboard task JSONs automatically.
Run via cron or systemd timer every 30-60 seconds.
"""

import json
import os
import re
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from glob import glob

AGENTS_DIR = Path(os.environ.get("OPENCLAW_AGENTS_DIR", os.path.expanduser("~/.openclaw/agents")))
TASKS_DIR = Path(os.environ.get("OPENCLAW_TASKS_DIR", os.path.expanduser("~/.openclaw/workspace/openClaw-dashboard/tasks")))
FEED_FILE = TASKS_DIR / "feed-items.json"
AGENTS_STATUS_FILE = TASKS_DIR / "agents-status.json"

# Agent display config
AGENT_META = {
    "main":     {"emoji": "🦞", "role": "Group Representation"},
    "brain":    {"emoji": "🧠", "role": "Lead Analyst"},
    "research": {"emoji": "🔬", "role": "Sector & Regulatory Research"},
    "creative": {"emoji": "✍️",  "role": "Writer/Editor"},
    "media":    {"emoji": "🎨", "role": "Visual/Data Support"},
}

def load_all_sessions():
    """Load sessions.json from every agent directory."""
    all_sessions = {}
    for agent_dir in AGENTS_DIR.iterdir():
        if not agent_dir.is_dir():
            continue
        sessions_file = agent_dir / "sessions" / "sessions.json"
        if sessions_file.exists():
            try:
                data = json.loads(sessions_file.read_text())
                for key, entry in data.items():
                    entry["_agent"] = agent_dir.name
                    entry["_sessionKey"] = key
                    all_sessions[key] = entry
            except (json.JSONDecodeError, OSError):
                continue
    return all_sessions

def get_session_log_info(agent, session_id):
    """Get basic info from session JSONL log."""
    log_path = AGENTS_DIR / agent / "sessions" / f"{session_id}.jsonl"
    if not log_path.exists():
        return {"lines": 0, "size": 0, "last_modified": None}
    
    stat = log_path.stat()
    # Count lines (approximate activity)
    try:
        with open(log_path, 'r') as f:
            lines = sum(1 for _ in f)
    except:
        lines = 0
    
    return {
        "lines": lines,
        "size": stat.st_size,
        "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
    }

def extract_token_usage(agent, session_id):
    """Extract token usage from session log."""
    log_path = AGENTS_DIR / agent / "sessions" / f"{session_id}.jsonl"
    if not log_path.exists():
        return []
    
    usage_entries = []
    try:
        with open(log_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    # Look for usage data in assistant responses
                    if entry.get("role") == "assistant" and "usage" in entry:
                        u = entry["usage"]
                        usage_entries.append({
                            "inputTokens": u.get("input_tokens", u.get("prompt_tokens", 0)),
                            "outputTokens": u.get("output_tokens", u.get("completion_tokens", 0)),
                            "model": entry.get("model", "unknown"),
                            "timestamp": int(datetime.fromisoformat(entry["timestamp"]).timestamp() * 1000) if "timestamp" in entry else None,
                        })
                except (json.JSONDecodeError, KeyError):
                    continue
    except OSError:
        pass
    return usage_entries

def classify_session(key, entry):
    """Classify a session into a task type and status."""
    agent = entry["_agent"]
    session_id = entry.get("sessionId", "")
    label = entry.get("label", "")
    
    # Skip main sessions (they're not tasks)
    if key.endswith(":main") and "subagent" not in key and "cron" not in key:
        return None
    
    # Skip discord/telegram channel sessions
    if ":discord:" in key or ":telegram:" in key:
        return None
    
    # Determine type
    if "subagent" in key:
        task_type = "subagent"
    elif "cron" in key:
        task_type = "cron"
        # Skip cron run sub-sessions (duplicates)
        if ":run:" in key:
            return None
    else:
        return None
    
    # Determine status from log file
    log_info = get_session_log_info(agent, session_id)
    log_path = AGENTS_DIR / agent / "sessions" / f"{session_id}.jsonl"
    
    # Check if session is active (modified in last 5 minutes)
    if log_path.exists():
        mtime = log_path.stat().st_mtime
        age_seconds = (datetime.now(timezone.utc).timestamp() - mtime)
        if age_seconds < 300:  # 5 min
            status = "active"
        else:
            # Check for completion markers in last few lines
            status = "complete"
            try:
                with open(log_path, 'r') as f:
                    lines = f.readlines()
                    last_lines = lines[-10:] if len(lines) >= 10 else lines
                    for line in last_lines:
                        try:
                            entry_data = json.loads(line.strip())
                            if entry_data.get("role") == "system" and "error" in str(entry_data.get("content", "")).lower():
                                status = "failed"
                        except:
                            pass
            except:
                pass
    else:
        status = "unknown"
    
    return {
        "type": task_type,
        "status": status,
        "agent": agent,
        "session_id": session_id,
        "label": label,
        "log_info": log_info,
    }

def session_to_task(key, entry, classification):
    """Convert a session entry to a dashboard task JSON."""
    agent = classification["agent"]
    session_id = classification["session_id"]
    label = classification["label"]
    task_type = classification["type"]
    status = classification["status"]
    
    # Generate stable task ID from session key
    task_hash = hashlib.md5(key.encode()).hexdigest()[:8]
    task_id = f"auto-{task_hash}"
    
    # Build title
    if label:
        title = label
    elif task_type == "subagent":
        title = f"Sub-agent task ({session_id[:8]})"
    else:
        title = f"Cron job ({session_id[:8]})"
    
    # Map status
    status_map = {
        "active": "active",
        "complete": "complete",
        "failed": "failed",
        "unknown": "pending",
    }
    
    # Determine priority
    priority = "normal"
    if task_type == "cron":
        priority = "low"
    elif status == "active":
        priority = "high"
    
    # Get timestamps
    updated_at = entry.get("updatedAt")
    if updated_at:
        updated_iso = datetime.fromtimestamp(updated_at / 1000, tz=timezone.utc).isoformat()
    else:
        updated_iso = datetime.now(timezone.utc).isoformat()
    
    # Get spawned by info
    spawned_by = entry.get("spawnedBy", "")
    
    # Build description
    log_info = classification["log_info"]
    desc_parts = []
    if spawned_by:
        desc_parts.append(f"Spawned by: {spawned_by}")
    if entry.get("model"):
        desc_parts.append(f"Model: {entry['model']}")
    if log_info["lines"] > 0:
        desc_parts.append(f"Log: {log_info['lines']} entries, {log_info['size'] // 1024}KB")
    description = ". ".join(desc_parts) if desc_parts else f"Auto-tracked {task_type} session"
    
    # Tags
    tags = [task_type, agent]
    if entry.get("lastChannel"):
        tags.append(entry["lastChannel"])
    
    # Token usage
    usage = extract_token_usage(agent, session_id)
    
    task = {
        "id": task_id,
        "title": title,
        "description": description,
        "status": status_map.get(status, "pending"),
        "priority": priority,
        "claimed_by": agent,
        "assignee": agent,
        "tags": tags,
        "created_at": updated_iso,
        "updated_at": updated_iso,
        "progress": {
            "percent": 100 if status == "complete" else (50 if status == "active" else 0),
            "checkpoint": f"Session {session_id[:12]}",
            "last_activity": log_info.get("last_modified", updated_iso),
        },
        "usage": usage[-5:] if usage else [],  # Last 5 usage entries
        "_session_key": key,
        "_auto_synced": True,
    }
    
    return task

def build_feed(tasks):
    """Generate feed items from tasks."""
    feed = []
    for task in sorted(tasks, key=lambda t: t["updated_at"], reverse=True)[:20]:
        status_emoji = {"complete": "✅", "active": "🔄", "failed": "❌", "pending": "⏳"}.get(task["status"], "❓")
        feed.append({
            "id": f"feed-{task['id']}",
            "type": "task_update",
            "title": f"{status_emoji} {task['title']}",
            "description": task["description"],
            "timestamp": task["updated_at"],
            "agent": task.get("assignee", "unknown"),
            "taskId": task["id"],
        })
    return feed

def build_agents_status(all_sessions):
    """Build agent status summary."""
    agents = {}
    for key, entry in all_sessions.items():
        agent = entry["_agent"]
        if agent not in agents:
            agents[agent] = {
                "id": agent,
                "name": agent.capitalize(),
                "emoji": AGENT_META.get(agent, {}).get("emoji", "🤖"),
                "role": AGENT_META.get(agent, {}).get("role", "Agent"),
                "model": entry.get("model", "unknown"),
                "sessions": 0,
                "active": 0,
            }
        agents[agent]["sessions"] += 1
        # Check if session is active
        sid = entry.get("sessionId", "")
        log_path = AGENTS_DIR / agent / "sessions" / f"{sid}.jsonl"
        if log_path.exists():
            mtime = log_path.stat().st_mtime
            if (datetime.now(timezone.utc).timestamp() - mtime) < 300:
                agents[agent]["active"] += 1
    
    return list(agents.values())

def sync():
    """Main sync function."""
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    
    all_sessions = load_all_sessions()
    tasks = []
    
    # Remove old auto-synced tasks
    for f in TASKS_DIR.glob("auto-*.json"):
        f.unlink()
    
    for key, entry in all_sessions.items():
        classification = classify_session(key, entry)
        if classification is None:
            continue
        
        task = session_to_task(key, entry, classification)
        tasks.append(task)
        
        # Write individual task file
        task_file = TASKS_DIR / f"{task['id']}.json"
        task_file.write_text(json.dumps(task, indent=2))
    
    # Write feed
    feed = build_feed(tasks)
    FEED_FILE.write_text(json.dumps(feed, indent=2))
    
    # Write agents status
    agents_status = build_agents_status(all_sessions)
    AGENTS_STATUS_FILE.write_text(json.dumps(agents_status, indent=2))
    
    print(f"Synced {len(tasks)} tasks, {len(feed)} feed items, {len(agents_status)} agents")

if __name__ == "__main__":
    sync()
