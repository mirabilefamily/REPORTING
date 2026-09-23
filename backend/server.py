from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Goorin REPORTING", openapi_url="/api/openapi.json", docs_url="/api/docs", redoc_url="/api/redoc")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ---- Linesheets ----
class LinesheetIn(BaseModel):
    title: str
    ctx: str
    customerId: str = ""
    priceListId: str = "usw"
    notes: str = ""
    showMsrp: bool = True
    showMoq: bool = False
    itemIds: List[str]
    season: str = "all"

class Linesheet(LinesheetIn):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shareToken: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    createdBy: str = "Ryan Mirabile"
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    views: int = 0

@api_router.get("/linesheets", response_model=List[Linesheet])
async def list_linesheets():
    return await db.linesheets.find({}, {"_id": 0}).sort("updatedAt", -1).to_list(500)

@api_router.post("/linesheets", response_model=Linesheet, status_code=201)
async def create_linesheet(body: LinesheetIn):
    ls = Linesheet(**body.model_dump())
    await db.linesheets.insert_one(ls.model_dump())
    return ls

@api_router.get("/linesheets/{ls_id}", response_model=Linesheet)
async def get_linesheet(ls_id: str):
    doc = await db.linesheets.find_one({"id": ls_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Linesheet not found")
    return doc

@api_router.put("/linesheets/{ls_id}", response_model=Linesheet)
async def update_linesheet(ls_id: str, body: LinesheetIn):
    upd = {**body.model_dump(), "updatedAt": datetime.now(timezone.utc).isoformat()}
    res = await db.linesheets.find_one_and_update({"id": ls_id}, {"$set": upd}, projection={"_id": 0}, return_document=True)
    if not res:
        raise HTTPException(404, "Linesheet not found")
    return res

@api_router.post("/linesheets/{ls_id}/duplicate", response_model=Linesheet, status_code=201)
async def duplicate_linesheet(ls_id: str):
    doc = await db.linesheets.find_one({"id": ls_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Linesheet not found")
    src = LinesheetIn(**doc)
    copy = Linesheet(**{**src.model_dump(), "title": f"{src.title} (copy)"})
    await db.linesheets.insert_one(copy.model_dump())
    return copy

@api_router.delete("/linesheets/{ls_id}", status_code=204)
async def delete_linesheet(ls_id: str):
    res = await db.linesheets.delete_one({"id": ls_id})
    if not res.deleted_count:
        raise HTTPException(404, "Linesheet not found")

@api_router.get("/share/linesheets/{token}", response_model=Linesheet)
async def shared_linesheet(token: str):
    doc = await db.linesheets.find_one_and_update({"shareToken": token}, {"$inc": {"views": 1}}, projection={"_id": 0}, return_document=True)
    if not doc:
        raise HTTPException(404, "This link is no longer valid")
    return doc

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