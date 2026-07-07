import os
import sys
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# Setup Dynamic Paths to ensure reliable server deployment
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
sys.path.append(str(BASE_DIR / "menu_core"))

from menu_core.database import get_db, init_db, Account, Outlet, Job, AuditTrail

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FoodMasterAPI")

# Initialize database tables on startup
app = FastAPI(
    title="FoodMaster Menu Portal API",
    description="Backend API for managing multi-platform menus (Shopee, Grab, GoFood)",
    version="1.0.0"
)

# Enable CORS for Next.js frontend (Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    logger.info("🚀 Initializing database tables...")
    init_db()
    # Ensure export directories exist dynamically
    exports_dir = BASE_DIR / "data" / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"📂 Exports directory verified at: {exports_dir}")


# ─── PYDANTIC SCHEMAS ─────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    platform: str = Field(..., description="shopee | grab | gofood")
    username: str
    password: str
    portal: Optional[str] = None

class AccountResponse(BaseModel):
    id: uuid.UUID
    platform: str
    username: str
    portal: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class OutletCreate(BaseModel):
    account_id: uuid.UUID
    store_id: Optional[str] = None
    merchant_name: str = Field(..., description="Nama merchant / portal selector di web")
    nama_outlet: Optional[str] = None
    cabang: Optional[str] = None
    nama_resto_final: Optional[str] = None
    brand: Optional[str] = None
    is_active: bool = True

class OutletResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    store_id: Optional[str]
    merchant_name: str
    nama_outlet: Optional[str]
    cabang: Optional[str]
    nama_resto_final: Optional[str]
    brand: Optional[str]
    is_active: bool
    last_sync_at: Optional[datetime]
    created_at: datetime
    platform: Optional[str] = None

    class Config:
        from_attributes = True

class JobResponse(BaseModel):
    id: uuid.UUID
    outlet_id: Optional[uuid.UUID]
    job_type: str
    platform: str
    status: str
    progress_pct: int
    current_step: Optional[str]
    payload: Optional[dict]
    result_metadata: Optional[dict]
    error_message: Optional[str]
    created_by: str
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class AuditTrailResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    outlet_id: uuid.UUID
    item_id: str
    item_name: str
    change_type: str
    field_changed: str
    old_value: Optional[str]
    new_value: str
    status: str
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── GSHEETS SYNC ENDPOINT ───────────────────────────────────────────────────

import io
import requests
import pandas as pd

@app.post("/api/sync-sheets", status_code=status.HTTP_200_OK)
def sync_sheets(db: Session = Depends(get_db)):
    url = "https://docs.google.com/spreadsheets/d/14eCb8DAEXhmbYj9MFj2KzC7AhkulbCbSNPltN2m-go0/export?format=csv&gid=0"
    try:
        logger.info("⏳ Downloading latest merchant sheet for database sync...")
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        df = pd.read_csv(io.StringIO(resp.text))
    except Exception as e:
        logger.error(f"❌ Failed to fetch Google Sheet: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Google Sheet: {str(e)}")

    added_accounts = 0
    added_outlets = 0
    updated_outlets = 0

    # Filter only Live status
    df_live = df[df["Status"].str.contains("Live", na=False, case=False)]

    for _, row in df_live.iterrows():
        app_val = str(row.get("Aplikasi", "")).strip().lower()
        if app_val == "shopeefood":
            platform = "shopee"
        elif app_val == "grabfood":
            platform = "grab"
        elif app_val == "gofood":
            platform = "gofood"
        else:
            continue

        # Extract Username & Password based on platform logic
        username = None
        password = None

        if platform == "shopee":
            # Username is allvbadmin
            username = "allvbadmin"
            # Get Password.1 or Kata Sandi.1
            pwd_col = "Kata Sandi.1" if "Kata Sandi.1" in df.columns else "Kata Sandi"
            password = str(row.get(pwd_col, "Shopee@321")).strip()
        elif platform == "grab":
            user_col_sf = "Nama Pengguna.1"
            user_col_mt = "Nama Pengguna"
            pwd_col_sf = "Kata Sandi.1"
            pwd_col_mt = "Kata Sandi"

            user_val = row.get(user_col_sf) if pd.notna(row.get(user_col_sf)) and str(row.get(user_col_sf)).strip() != "-" else row.get(user_col_mt)
            pwd_val = row.get(pwd_col_sf) if pd.notna(row.get(pwd_col_sf)) and str(row.get(pwd_col_sf)).strip() != "-" else row.get(pwd_col_mt)

            if pd.notna(user_val) and str(user_val).strip() != "":
                username = str(user_val).strip()
            if pd.notna(pwd_val) and str(pwd_val).strip() != "":
                password = str(pwd_val).strip()
        elif platform == "gofood":
            # GoFood uses Email Login Go 1 or Email Login Go 2 (No phone login)
            email_1 = row.get("Email Login Go 1")
            email_2 = row.get("Email Login Go 2")
            user_val = email_1 if pd.notna(email_1) and "@" in str(email_1) else email_2

            if pd.notna(user_val) and "@" in str(user_val):
                username = str(user_val).strip()
            else:
                # Fallback to username.1 if email not found
                user_1 = row.get("Nama Pengguna.1")
                if pd.notna(user_1) and str(user_1).strip() != "" and str(user_1).strip() != "-":
                    username = str(user_1).strip()

            pwd_val = row.get("Kata Sandi.1") if pd.notna(row.get("Kata Sandi.1")) else row.get("Kata Sandi")
            if pd.notna(pwd_val) and str(pwd_val).strip() != "" and str(pwd_val).strip() != "-":
                password = str(pwd_val).strip()

        if not username:
            continue
        if not password:
            password = "Master@123" # Default fallback password

        # 1. Upsert Account
        db_account = db.query(Account).filter(Account.username == username, Account.platform == platform).first()
        if not db_account:
            db_account = Account(
                platform=platform,
                username=username,
                password=password,
                portal="shopee_partner" if platform == "shopee" else "merchant_portal"
            )
            db.add(db_account)
            db.commit()
            db.refresh(db_account)
            added_accounts += 1
        else:
            if db_account.password != password:
                db_account.password = password
                db.commit()

        # 2. Extract Outlet Info
        store_id_raw = row.get("Store ID")
        store_id = str(store_id_raw).strip().split(".")[0] if pd.notna(store_id_raw) and str(store_id_raw).strip() != "-" else None
        
        m_name_raw = row.get("Merchant Name")
        merchant_name = str(m_name_raw).strip() if pd.notna(m_name_raw) and str(m_name_raw).strip() != "-" else str(row.get("Nama Outlet", "")).strip()

        nama_outlet = str(row.get("Nama Outlet", "")).strip() if pd.notna(row.get("Nama Outlet")) else None
        cabang = str(row.get("Cabang", "")).strip() if pd.notna(row.get("Cabang")) else str(row.get("Brand", "")).strip()
        nama_resto_final = str(row.get("Nama Resto Final", "")).strip() if pd.notna(row.get("Nama Resto Final")) else None
        brand = str(row.get("Brand", "")).strip() if pd.notna(row.get("Brand")) else None

        # 3. Upsert Outlet
        db_outlet = None
        if store_id:
            db_outlet = db.query(Outlet).filter(Outlet.store_id == store_id).first()

        if not db_outlet:
            # Fallback query if store_id was not provided
            db_outlet = db.query(Outlet).filter(
                Outlet.account_id == db_account.id,
                Outlet.merchant_name == merchant_name,
                Outlet.nama_outlet == nama_outlet,
                Outlet.cabang == cabang
            ).first()

        if not db_outlet:
            db_outlet = Outlet(
                account_id=db_account.id,
                store_id=store_id,
                merchant_name=merchant_name,
                nama_outlet=nama_outlet,
                cabang=cabang,
                nama_resto_final=nama_resto_final,
                brand=brand,
                is_active=True
            )
            db.add(db_outlet)
            added_outlets += 1
        else:
            db_outlet.store_id = store_id
            db_outlet.nama_resto_final = nama_resto_final
            db_outlet.brand = brand
            db_outlet.is_active = True
            updated_outlets += 1

    db.commit()
    logger.info(f"📊 Sync Sheet Complete. Added Accounts: {added_accounts}, Added Outlets: {added_outlets}, Updated Outlets: {updated_outlets}")
    return {
        "status": "success",
        "added_accounts": added_accounts,
        "added_outlets": added_outlets,
        "updated_outlets": updated_outlets
    }


# ─── ACCOUNTS ENDPOINTS ───────────────────────────────────────────────────────

@app.post("/api/accounts", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    db_account = db.query(Account).filter(
        Account.username == account.username, 
        Account.platform == account.platform
    ).first()
    if db_account:
        raise HTTPException(status_code=400, detail="Account already exists for this platform")
    
    new_account = Account(
        platform=account.platform,
        username=account.username,
        password=account.password,
        portal=account.portal
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account

@app.get("/api/accounts", response_model=List[AccountResponse])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()


# ─── OUTLETS ENDPOINTS ────────────────────────────────────────────────────────

@app.post("/api/outlets", response_model=OutletResponse, status_code=status.HTTP_201_CREATED)
def create_outlet(outlet: OutletCreate, db: Session = Depends(get_db)):
    # Verify account exists
    db_account = db.query(Account).filter(Account.id == outlet.account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Parent account not found")
    
    if outlet.store_id:
        db_outlet = db.query(Outlet).filter(Outlet.store_id == outlet.store_id).first()
        if db_outlet:
            raise HTTPException(status_code=400, detail="Outlet with this store_id already exists")

    new_outlet = Outlet(
        account_id=outlet.account_id,
        store_id=outlet.store_id,
        merchant_name=outlet.merchant_name,
        nama_outlet=outlet.nama_outlet,
        cabang=outlet.cabang,
        nama_resto_final=outlet.nama_resto_final,
        brand=outlet.brand,
        is_active=outlet.is_active
    )
    db.add(new_outlet)
    db.commit()
    db.refresh(new_outlet)
    return new_outlet

@app.get("/api/outlets", response_model=List[OutletResponse])
def list_outlets(platform: Optional[str] = None, db: Session = Depends(get_db)):
    if platform:
        return db.query(Outlet).join(Outlet.account).filter(Account.platform == platform.lower()).all()
    return db.query(Outlet).all()


# ─── BACKGROUND JOBS WORKER ───────────────────────────────────────────────────

def run_pull_job(job_id: uuid.UUID, outlet_id: uuid.UUID):
    # Setup job-specific session context
    from menu_core.database import SessionLocal
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        job.status = "RUNNING"
        job.started_at = datetime.utcnow()
        job.progress_pct = 10
        job.current_step = "Memuat kredensial dan inisialisasi browser..."
        db.commit()

        outlet = db.query(Outlet).filter(Outlet.id == outlet_id).first()
        account = db.query(Account).filter(Account.id == outlet.account_id).first()
        
        # Determine paths dynamically
        import re
        raw_outlet = outlet.nama_outlet or outlet.nama_resto_final or outlet.merchant_name or 'unknown'
        clean_outlet = "".join(c for c in raw_outlet if c.isalnum() or c in (' ', '_', '-')).strip()
        clean_outlet = re.sub(r'\s+', ' ', clean_outlet).lower()
        
        exports_dir = BASE_DIR / "data" / "exports" / job.platform / clean_outlet
        exports_dir.mkdir(parents=True, exist_ok=True)

        # Trigger Applicator specific script
        if job.platform == "shopee":
            job.progress_pct = 30
            job.current_step = "Membuka browser dan login portal Shopee Partner..."
            db.commit()
            
            # Setup store_metadata payload for shopee.core.pull
            store_metadata = {
                "store_id": outlet.store_id,
                "merchant_name": outlet.merchant_name,
                "nama_outlet": outlet.nama_outlet,
                "cabang": outlet.cabang,
                "nama_resto_final": outlet.nama_resto_final,
                "brand": outlet.brand,
                "username": account.username,
                "password": account.password,
                "portal": account.portal
            }
            
            # Add project root to sys.path to resolve shopee.* absolute imports correctly
            if str(BASE_DIR) not in sys.path:
                sys.path.insert(0, str(BASE_DIR))
                
            from shopee.core.pull import extract_shopee_menu
            
            # Run shopee extraction
            success, result = extract_shopee_menu(store_metadata, str(exports_dir))
            
            if not success:
                raise Exception(f"Shopee extraction failed: {result}")
                
            # If store_id was dynamically resolved and wasn't set in DB, update it!
            resolved_store_id = store_metadata.get("store_id")
            if resolved_store_id and not outlet.store_id:
                # Check for uniqueness before updating to prevent constraints failure
                existing_outlet = db.query(Outlet).filter(Outlet.store_id == resolved_store_id).first()
                if not existing_outlet:
                    outlet.store_id = resolved_store_id
                    logger.info(f"💾 Dynamically updated store_id to {resolved_store_id} for outlet {outlet.merchant_name}")
            
            job.status = "SUCCESS"
            job.progress_pct = 100
            job.current_step = "Penarikan menu selesai!"
            job.result_metadata = {
                "excel_path": result.get("excel"),
                "items_csv_path": result.get("items_csv"),
                "mods_csv_path": result.get("mods_csv"),
                "items_count": result.get("items_count", 0),
                "mods_count": result.get("mods_count", 0),
                "completed_at": datetime.utcnow().isoformat()
            }
            job.completed_at = datetime.utcnow()
            outlet.last_sync_at = datetime.utcnow()
            db.commit()
            
        elif job.platform == "gofood":
            job.progress_pct = 30
            job.current_step = "Menyiapkan parameter penarikan GoFood..."
            db.commit()
            
            store_metadata = {
                "store_id": outlet.store_id,
                "merchant_name": outlet.merchant_name,
                "nama_outlet": outlet.nama_outlet,
                "cabang": outlet.cabang,
                "nama_resto_final": outlet.nama_resto_final,
                "brand": outlet.brand,
                "username": account.username,
                "password": account.password
            }
            
            job.progress_pct = 50
            job.current_step = "Meluncurkan browser GoFood & memproses penarikan..."
            db.commit()
            
            from menu_core.gofood import extract_gofood_menu
            success, result = extract_gofood_menu(store_metadata, str(exports_dir))
            
            if not success:
                raise Exception(f"GoFood extraction failed: {result}")
                
            job.status = "SUCCESS"
            job.progress_pct = 100
            job.current_step = "Penarikan menu GoFood selesai!"
            job.result_metadata = {
                "excel_path": result.get("excel"),
                "items_count": result.get("items_count", 0),
                "mods_count": result.get("mods_count", 0),
                "completed_at": datetime.utcnow().isoformat()
            }
            job.completed_at = datetime.utcnow()
            outlet.last_sync_at = datetime.utcnow()
            db.commit()
            
        elif job.platform == "grab":
            job.progress_pct = 30
            job.current_step = "Menyiapkan parameter penarikan GrabFood..."
            db.commit()
            
            store_metadata = {
                "store_id": outlet.store_id,
                "merchant_name": outlet.merchant_name,
                "nama_outlet": outlet.nama_outlet,
                "cabang": outlet.cabang,
                "nama_resto_final": outlet.nama_resto_final,
                "brand": outlet.brand,
                "username": account.username,
                "password": account.password
            }
            
            job.progress_pct = 50
            job.current_step = "Meluncurkan browser GrabFood & memproses penarikan..."
            db.commit()
            
            from menu_core.grab import extract_grab_menu
            success, result = extract_grab_menu(store_metadata, str(exports_dir))
            
            if not success:
                raise Exception(f"Grab extraction failed: {result}")
                
            job.status = "SUCCESS"
            job.progress_pct = 100
            job.current_step = "Penarikan menu GrabFood selesai!"
            job.result_metadata = {
                "excel_path": result.get("excel"),
                "items_count": result.get("items_count", 0),
                "mods_count": result.get("mods_count", 0),
                "completed_at": datetime.utcnow().isoformat()
            }
            job.completed_at = datetime.utcnow()
            outlet.last_sync_at = datetime.utcnow()
            db.commit()

        logger.info(f"✅ Job {job_id} completed successfully.")

    except Exception as e:
        logger.error(f"❌ Job {job_id} failed: {e}")
        job.status = "FAILED"
        job.error_message = str(e)
        job.current_step = f"Terjadi kesalahan: {str(e)}"
        job.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


# ─── JOBS ENDPOINTS ───────────────────────────────────────────────────────────

@app.post("/api/jobs/pull", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def trigger_pull_job(outlet_id: uuid.UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    outlet = db.query(Outlet).filter(Outlet.id == outlet_id).first()
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")
    
    # Create Job log entry
    new_job = Job(
        outlet_id=outlet.id,
        job_type="PULL",
        platform=outlet.account.platform,
        status="PENDING",
        progress_pct=0,
        current_step="Mengantrekan tugas penarikan...",
        payload={"store_id": outlet.store_id, "merchant_name": outlet.merchant_name}
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Dispatch to background executor thread
    background_tasks.add_task(run_pull_job, new_job.id, outlet.id)
    return new_job

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
def get_job_status(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/jobs", response_model=List[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.created_at.desc()).limit(50).all()
@app.get("/api/jobs/download/{job_id}")
def download_job_file(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "SUCCESS":
        raise HTTPException(status_code=400, detail="Job is not completed successfully")
    
    excel_path = job.result_metadata.get("excel_path") if job.result_metadata else None
    if not excel_path or not os.path.exists(excel_path):
        raise HTTPException(status_code=404, detail="Excel file not found on server")
        
    filename = os.path.basename(excel_path)
    return FileResponse(
        path=excel_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


# ─── AUDIT TRAILS ENDPOINTS ───────────────────────────────────────────────────

@app.get("/api/audit-trails", response_model=List[AuditTrailResponse])
def get_audit_trails(db: Session = Depends(get_db)):
    return db.query(AuditTrail).order_by(AuditTrail.created_at.desc()).limit(100).all()
