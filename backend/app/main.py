import asyncio
import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from app.api import analyze, chat, community, my_reports, nearby, reports, telegram, votes, push
from app.core.config import settings
from app.middleware import BodyLimitMiddleware
from app.services.reports import VoteError

logger=logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    stop=asyncio.Event()
    async def run():
        from app.services.worker import tick
        while not stop.is_set():
            try:
                await asyncio.to_thread(tick)
            except Exception as error:
                logger.warning("Worker gagal (%s)",type(error).__name__)
            try:
                await asyncio.wait_for(stop.wait(),timeout=settings.worker_interval_seconds)
            except TimeoutError:
                pass
    task=asyncio.create_task(run()) if settings.worker_enabled else None
    yield
    if task:
        stop.set()
        await task


app=FastAPI(title="GEMA API",lifespan=lifespan)
app.add_middleware(BodyLimitMiddleware,limit=settings.max_photo_bytes+1024*1024)
app.add_middleware(CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["Authorization","Content-Type","Idempotency-Key"],
    expose_headers=["Retry-After","X-Request-ID"])


@app.middleware("http")
async def request_id(request: Request,call_next):
    request.state.request_id=str(uuid4())
    response=await call_next(request)
    response.headers["X-Request-ID"]=request.state.request_id
    return response


@app.exception_handler(HTTPException)
async def http_error(request: Request,error: HTTPException):
    retry=error.status_code in (429,503)
    body={"detail":error.detail,"code":f"http_{error.status_code}","message_id":str(error.detail),
          "retryable":retry,"request_id":getattr(request.state,"request_id",None)}
    if error.headers and "Retry-After" in error.headers:
        body["retry_after_seconds"]=int(error.headers["Retry-After"])
    return JSONResponse(body,status_code=error.status_code,headers=error.headers)


@app.exception_handler(VoteError)
async def policy_error(request: Request,error: VoteError):
    codes={"report_not_found":404,"report_not_active":409,"report_not_draft":409,
        "cannot_vote_own_report":403,"cannot_observe_own_report":403,"forbidden":403,
        "idempotency_conflict":409,"version_conflict":409,"already_voted":409,
        "fresh_observation_required":422,"future_observation":422,"invalid_transition":409,
        "observation_time_required":422,"invalid_action":422,"reason_required":422,"draft_expired":409,
        "subscription_conflict":409,"outbox_conflict":409}
    codes.update({"camera_photo_required":422,"proximity_required":422,"invalid_observation":422})
    status=codes.get(error.code,503)
    message=error.code if status!=503 else "Layanan data belum tersedia. Coba lagi."
    return JSONResponse({"detail":message,"code":error.code if status!=503 else "data_unavailable",
        "retryable":status==503,"request_id":getattr(request.state,"request_id",None)},status)


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request,error: RequestValidationError):
    # Pydantic errors may echo user input. Only return field locations and safe messages.
    fields=[{"field":".".join(str(p) for p in e["loc"]),"message":e["msg"]} for e in error.errors()]
    return JSONResponse({"detail":"Periksa isian dan waktu pengamatan","code":"validation_error","fields":fields,"retryable":False},422)


@app.exception_handler(Exception)
async def unavailable(request: Request,error: Exception):
    logger.warning("Request gagal (%s), request_id=%s",type(error).__name__,getattr(request.state,"request_id",None))
    return JSONResponse({"detail":"Layanan belum tersedia. Coba lagi.","code":"service_unavailable",
        "retryable":True,"request_id":getattr(request.state,"request_id",None)},503)


for router in (analyze.router,chat.router,reports.router,nearby.router,my_reports.router,votes.router,community.router,telegram.router,push.router):
    app.include_router(router,prefix="/api")


@app.get("/health")
def health():
    return {"status":"ok"}
