from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models.db_models import User, Workspace, CanvasData
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import json

app = FastAPI(title="EduGen Admin Panel")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_workspaces = db.query(Workspace).count()
    users_data = []
    users = db.query(User).all()
    for user in users:
        ws_count = db.query(Workspace).filter(Workspace.user_id == user.id).count()
        users_data.append({
            "id": user.id,
            "username": user.username,
            "workspaces": ws_count,
            "bio": user.bio[:60] + "..." if user.bio and len(user.bio) > 60 else (user.bio or "N/A"),
            "interests": user.interests or "N/A",
            "learning_style": user.learning_style or "Intermediate"
        })
    return {
        "total_users": total_users,
        "total_workspaces": total_workspaces,
        "users": users_data
    }

@app.get("/api/admin/user/{user_id}/full")
def get_user_full_data(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    workspaces = db.query(Workspace).filter(Workspace.user_id == user_id).all()
    result = {
        "username": user.username,
        "user_id": user.id,
        "bio": user.bio,
        "interests": user.interests,
        "learning_style": user.learning_style,
        "workspaces": []
    }

    for ws in workspaces:
        ws_entry = {"id": ws.id, "name": ws.name, "pages": [], "has_canvas": False, "shape_count": 0}
        canvas = db.query(CanvasData).filter(CanvasData.workspace_id == ws.id).first()
        if canvas and canvas.data:
            ws_entry["has_canvas"] = True
            try:
                snapshot = json.loads(canvas.data)
                store = snapshot.get("store", {})
                pages = []
                shapes_by_page: dict = {}
                for key, record in store.items():
                    if record.get("typeName") == "page":
                        pages.append({"id": record["id"], "name": record.get("name", "Unnamed Page")})
                    elif record.get("typeName") == "shape":
                        pid = record.get("parentId", "unknown")
                        shapes_by_page.setdefault(pid, [])
                        shape_type = record.get("type", "")
                        props = record.get("props", {})
                        text = ""
                        if shape_type == "text":
                            def _extract(n):
                                if not n: return ""
                                if isinstance(n, str): return n
                                if n.get("text"): return n["text"]
                                return "".join(_extract(c) for c in n.get("content", []))
                            text = _extract(props.get("richText", {}))
                        elif shape_type in ("ai-text", "note"):
                            text = props.get("text", "")
                        elif shape_type == "ai-mermaid":
                            text = "[Mermaid Diagram] " + props.get("code", "")[:120]
                        shapes_by_page[pid].append({
                            "type": shape_type,
                            "text": text[:300] if text else "",
                            "x": round(record.get("x", 0)),
                            "y": round(record.get("y", 0))
                        })

                total_shapes = sum(len(v) for v in shapes_by_page.values())
                ws_entry["shape_count"] = total_shapes
                for page in pages:
                    page["shapes"] = shapes_by_page.get(page["id"], [])
                ws_entry["pages"] = pages
            except Exception as e:
                ws_entry["parse_error"] = str(e)
        result["workspaces"].append(ws_entry)

    return result

@app.delete("/api/admin/workspace/{workspace_id}")
def admin_delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        return {"error": "Workspace not found"}
    canvas = db.query(CanvasData).filter(CanvasData.workspace_id == workspace_id).first()
    if canvas:
        db.delete(canvas)
    db.delete(ws)
    db.commit()
    return {"status": "deleted", "workspace_id": workspace_id}

@app.get("/", response_class=HTMLResponse)
def admin_ui():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>EduGen Admin Console</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; background: #0a0f1e; color: #e2e8f0; min-height: 100vh; }

            .sidebar {
                position: fixed; left: 0; top: 0; bottom: 0; width: 240px;
                background: rgba(15, 23, 42, 0.95); border-right: 1px solid rgba(255,255,255,0.07);
                padding: 2rem 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; z-index: 100;
            }
            .logo { font-size: 1.3rem; font-weight: 800; margin-bottom: 2rem; color: white; }
            .logo span { color: #60a5fa; }
            .nav-item {
                padding: 0.7rem 1rem; border-radius: 0.7rem; cursor: pointer;
                color: #94a3b8; font-size: 0.9rem; font-weight: 500; transition: all 0.2s;
            }
            .nav-item:hover, .nav-item.active { background: rgba(96,165,250,0.1); color: #60a5fa; }

            .main { margin-left: 240px; padding: 2rem; min-height: 100vh; }
            .page { display: none; }
            .page.active { display: block; }

            .header { margin-bottom: 2rem; }
            .header h1 { font-size: 1.8rem; font-weight: 800; }
            .header p { color: #64748b; margin-top: 0.3rem; }

            .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; }
            .stat-card {
                background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.07);
                padding: 1.5rem; border-radius: 1rem;
            }
            .stat-label { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
            .stat-val { font-size: 2.2rem; font-weight: 800; color: #60a5fa; margin-top: 0.5rem; }

            .panel {
                background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.07);
                border-radius: 1rem; overflow: hidden; margin-bottom: 2rem;
            }
            .panel-header {
                padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);
                font-weight: 700; font-size: 0.95rem; color: #cbd5e1;
                display: flex; align-items: center; justify-content: space-between;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 0.85rem 1.2rem; text-align: left; font-size: 0.85rem; }
            th { color: #60a5fa; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(59,130,246,0.05); font-weight: 600; }
            tr { border-bottom: 1px solid rgba(255,255,255,0.04); }
            tr:last-child { border-bottom: none; }
            tr:hover td { background: rgba(255,255,255,0.02); }

            .badge {
                background: rgba(59,130,246,0.15); color: #60a5fa;
                padding: 0.2rem 0.6rem; border-radius: 0.4rem; font-size: 0.72rem; font-weight: 600;
            }
            .badge-green { background: rgba(16,185,129,0.15); color: #10b981; }
            .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
            .badge-yellow { background: rgba(245,158,11,0.15); color: #fbbf24; }

            .btn {
                padding: 0.5rem 1rem; border-radius: 0.6rem; border: none;
                cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;
            }
            .btn-inspect { background: rgba(96,165,250,0.1); color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
            .btn-inspect:hover { background: rgba(96,165,250,0.2); }
            .btn-delete { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
            .btn-delete:hover { background: rgba(239,68,68,0.25); }
            .btn-refresh { background: rgba(100,116,139,0.1); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); }
            .btn-refresh:hover { background: rgba(100,116,139,0.2); }

            /* Inspector / Data view */
            .inspector {
                position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
                z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem;
            }
            .inspector-box {
                background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 1.2rem;
                width: 100%; max-width: 900px; max-height: 85vh; display: flex; flex-direction: column;
                overflow: hidden;
            }
            .inspector-header {
                padding: 1.2rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.07);
                display: flex; justify-content: space-between; align-items: center;
            }
            .inspector-header h2 { font-size: 1.1rem; font-weight: 700; }
            .inspector-body { overflow-y: auto; padding: 1.5rem; flex: 1; }

            .ws-block {
                border: 1px solid rgba(255,255,255,0.07); border-radius: 0.8rem;
                margin-bottom: 1.2rem; overflow: hidden;
            }
            .ws-block-header {
                background: rgba(59,130,246,0.07); padding: 0.8rem 1rem;
                display: flex; align-items: center; justify-content: space-between;
                font-weight: 600; font-size: 0.9rem;
            }
            .page-block { padding: 0.7rem 1rem 0; }
            .page-title {
                font-size: 0.78rem; color: #60a5fa; font-weight: 700;
                text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.4rem;
            }
            .shape-row {
                display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.35rem 0;
                border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.8rem;
            }
            .shape-type { color: #94a3b8; min-width: 90px; font-size: 0.72rem; font-weight: 600; padding-top: 1px; }
            .shape-text { color: #e2e8f0; flex: 1; line-height: 1.4; }
            .no-data { color: #475569; font-size: 0.85rem; padding: 0.5rem 0; }

            #last-updated { color: #475569; font-size: 0.8rem; }

            /* Profile info */
            .user-profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.2rem; }
            .profile-field { background: rgba(255,255,255,0.03); border-radius: 0.6rem; padding: 0.8rem 1rem; }
            .profile-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 0.3rem; }
            .profile-value { font-size: 0.87rem; color: #cbd5e1; }
        </style>
    </head>
    <body>
        <div class="sidebar">
            <div class="logo">EduGen <span>Admin</span></div>
            <div class="nav-item active" onclick="showPage('dashboard')">Dashboard</div>
            <div class="nav-item" onclick="showPage('users')">Users</div>
            <div class="nav-item" onclick="showPage('workspaces')">Workspaces</div>
        </div>

        <div class="main">

            <!-- DASHBOARD -->
            <div class="page active" id="page-dashboard">
                <div class="header">
                    <h1>EduGen Admin Console</h1>
                    <p>Real-time database monitoring and management</p>
                </div>
                <div class="stat-grid">
                    <div class="stat-card"><div class="stat-label">Total Users</div><div id="total-users" class="stat-val">-</div></div>
                    <div class="stat-card"><div class="stat-label">Total Workspaces</div><div id="total-workspaces" class="stat-val">-</div></div>
                </div>
                <div class="panel">
                    <div class="panel-header">
                        User Overview
                        <div style="display:flex;gap:0.5rem;align-items:center">
                            <span id="last-updated"></span>
                            <button class="btn btn-refresh" onclick="loadStats()">Refresh</button>
                        </div>
                    </div>
                    <table>
                        <thead><tr><th>ID</th><th>Username</th><th>Workspaces</th><th>Learning Style</th><th>Actions</th></tr></thead>
                        <tbody id="user-table-body"></tbody>
                    </table>
                </div>
            </div>

            <!-- USERS -->
            <div class="page" id="page-users">
                <div class="header"><h1>All Users</h1><p>Complete user profiles stored in the database</p></div>
                <div class="panel">
                    <div class="panel-header">User Profiles</div>
                    <table>
                        <thead><tr><th>ID</th><th>Username</th><th>Bio</th><th>Interests</th><th>Style</th><th>Workspaces</th><th>Actions</th></tr></thead>
                        <tbody id="users-full-body"></tbody>
                    </table>
                </div>
            </div>

            <!-- WORKSPACES -->
            <div class="page" id="page-workspaces">
                <div class="header"><h1>All Workspaces</h1><p>Workspace management — view data and delete entries</p></div>
                <div class="panel">
                    <div class="panel-header">Workspaces</div>
                    <table>
                        <thead><tr><th>ID</th><th>Name</th><th>User</th><th>Has Canvas</th><th>Actions</th></tr></thead>
                        <tbody id="workspaces-body"></tbody>
                    </table>
                </div>
            </div>

        </div>

        <!-- Inspector Modal -->
        <div class="inspector" id="inspector" style="display:none">
            <div class="inspector-box">
                <div class="inspector-header">
                    <h2 id="inspector-title">User Data Inspector</h2>
                    <button class="btn btn-refresh" onclick="document.getElementById('inspector').style.display='none'">Close</button>
                </div>
                <div class="inspector-body" id="inspector-body"></div>
            </div>
        </div>

        <script>
            let statsData = null;

            function showPage(name) {
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.getElementById('page-' + name).classList.add('active');
                event.target.classList.add('active');
                if (name === 'users' || name === 'workspaces') loadAllData();
            }

            async function loadStats() {
                try {
                    const res = await fetch('/api/admin/stats');
                    statsData = await res.json();
                    document.getElementById('total-users').innerText = statsData.total_users;
                    document.getElementById('total-workspaces').innerText = statsData.total_workspaces;
                    document.getElementById('last-updated').innerText = 'Updated: ' + new Date().toLocaleTimeString();

                    const tbody = document.getElementById('user-table-body');
                    tbody.innerHTML = '';
                    statsData.users.forEach(u => {
                        tbody.innerHTML += `<tr>
                            <td style="color:#64748b">#${u.id}</td>
                            <td style="font-weight:700">${u.username}</td>
                            <td><span class="badge">${u.workspaces} Spaces</span></td>
                            <td><span class="badge badge-yellow">${u.learning_style}</span></td>
                            <td><button class="btn btn-inspect" onclick="inspectUser(${u.id}, '${u.username}')">Inspect Data</button></td>
                        </tr>`;
                    });

                    // Also populate users page
                    const ufull = document.getElementById('users-full-body');
                    if (ufull) {
                        ufull.innerHTML = '';
                        statsData.users.forEach(u => {
                            ufull.innerHTML += `<tr>
                                <td style="color:#64748b">#${u.id}</td>
                                <td style="font-weight:700">${u.username}</td>
                                <td style="color:#94a3b8;max-width:180px;overflow:hidden;text-overflow:ellipsis">${u.bio}</td>
                                <td style="color:#94a3b8;max-width:150px">${u.interests}</td>
                                <td><span class="badge badge-yellow">${u.learning_style}</span></td>
                                <td><span class="badge">${u.workspaces}</span></td>
                                <td><button class="btn btn-inspect" onclick="inspectUser(${u.id}, '${u.username}')">View Data</button></td>
                            </tr>`;
                        });
                    }
                } catch(e) { console.error('Stats load failed', e); }
            }

            async function loadAllData() {
                await loadStats();
                // Populate workspaces table by fetching each user's workspaces
                if (!statsData) return;
                const tbody = document.getElementById('workspaces-body');
                if (!tbody) return;
                tbody.innerHTML = '';
                for (const user of statsData.users) {
                    try {
                        const res = await fetch('/api/admin/user/' + user.id + '/full');
                        const data = await res.json();
                        if (data.workspaces) {
                            data.workspaces.forEach(ws => {
                                tbody.innerHTML += `<tr>
                                    <td style="color:#64748b">#${ws.id}</td>
                                    <td style="font-weight:600">${ws.name}</td>
                                    <td>${data.username}</td>
                                    <td>${ws.has_canvas
                                        ? '<span class="badge badge-green">Yes — ' + ws.shape_count + ' shapes</span>'
                                        : '<span class="badge badge-red">Empty</span>'}</td>
                                    <td style="display:flex;gap:0.5rem">
                                        <button class="btn btn-inspect" onclick="inspectUser(${user.id}, '${data.username}')">View Pages</button>
                                        <button class="btn btn-delete" onclick="deleteWorkspace(${ws.id}, '${ws.name}')">Delete</button>
                                    </td>
                                </tr>`;
                            });
                        }
                    } catch(e) {}
                }
            }

            async function inspectUser(userId, username) {
                document.getElementById('inspector-title').innerText = 'Data Inspector — ' + username;
                document.getElementById('inspector-body').innerHTML = '<div style="color:#64748b;padding:1rem">Loading...</div>';
                document.getElementById('inspector').style.display = 'flex';
                try {
                    const res = await fetch('/api/admin/user/' + userId + '/full');
                    const data = await res.json();

                    let html = '<div class="user-profile-grid">';
                    html += `<div class="profile-field"><div class="profile-label">Username</div><div class="profile-value">${data.username}</div></div>`;
                    html += `<div class="profile-field"><div class="profile-label">Learning Style</div><div class="profile-value">${data.learning_style || 'Intermediate'}</div></div>`;
                    html += `<div class="profile-field"><div class="profile-label">Bio</div><div class="profile-value">${data.bio || '<em style="color:#475569">Not set</em>'}</div></div>`;
                    html += `<div class="profile-field"><div class="profile-label">Interests</div><div class="profile-value">${data.interests || '<em style="color:#475569">Not set</em>'}</div></div>`;
                    html += '</div>';

                    if (!data.workspaces || data.workspaces.length === 0) {
                        html += '<div class="no-data">No workspaces found for this user.</div>';
                    }

                    data.workspaces.forEach(ws => {
                        html += `<div class="ws-block">
                            <div class="ws-block-header">
                                <span>Workspace: <strong>${ws.name}</strong> &nbsp;<span class="badge">#${ws.id}</span>
                                ${ws.has_canvas ? '&nbsp;<span class="badge badge-green">' + ws.shape_count + ' shapes</span>' : '&nbsp;<span class="badge badge-red">No Canvas Data</span>'}</span>
                                <button class="btn btn-delete" onclick="deleteWorkspace(${ws.id}, '${ws.name}', true)">Delete Workspace</button>
                            </div>`;

                        if (!ws.has_canvas || ws.pages.length === 0) {
                            html += '<div style="padding:1rem;color:#475569;font-size:0.85rem">No saved canvas data yet.</div>';
                        } else {
                            ws.pages.forEach(page => {
                                html += `<div class="page-block">
                                    <div class="page-title">Page: ${page.name}</div>`;
                                if (!page.shapes || page.shapes.length === 0) {
                                    html += '<div class="no-data">No shapes on this page.</div>';
                                } else {
                                    page.shapes.forEach(s => {
                                        html += `<div class="shape-row">
                                            <span class="shape-type">${s.type}</span>
                                            <span class="shape-text">${s.text ? escapeHtml(s.text) : '<em style="color:#475569">No text</em>'}</span>
                                        </div>`;
                                    });
                                }
                                html += '</div><hr style="border:none;border-top:1px solid rgba(255,255,255,0.05);margin:0.5rem 0">';
                            });
                        }
                        html += '</div>';
                    });

                    document.getElementById('inspector-body').innerHTML = html;
                } catch(e) {
                    document.getElementById('inspector-body').innerHTML = '<div style="color:#f87171;padding:1rem">Failed to load data: ' + e + '</div>';
                }
            }

            async function deleteWorkspace(wsId, wsName, fromInspector=false) {
                if (!confirm('Delete workspace "' + wsName + '"? This will permanently remove all canvas data, pages, and diagrams.')) return;
                try {
                    const res = await fetch('/api/admin/workspace/' + wsId, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.status === 'deleted') {
                        alert('Workspace "' + wsName + '" deleted successfully.');
                        if (fromInspector) {
                            document.getElementById('inspector').style.display = 'none';
                        }
                        loadStats();
                        loadAllData();
                    } else {
                        alert('Error: ' + JSON.stringify(data));
                    }
                } catch(e) { alert('Delete failed: ' + e); }
            }

            function escapeHtml(text) {
                return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            }

            loadStats();
            setInterval(loadStats, 10000);
        </script>
    </body>
    </html>
    """

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
