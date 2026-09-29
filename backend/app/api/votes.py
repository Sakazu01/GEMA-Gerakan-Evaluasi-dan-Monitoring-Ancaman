from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["votes"])


@router.post("/reports/{report_id}/false-vote")
async def false_vote(report_id: str):
    # TODO Checkpoint 8: satu suara per (report_id, voter_id); 3 suara unik -> disputed_hidden.
    raise HTTPException(status_code=501, detail="Belum diimplementasikan")


@router.post("/reports/{report_id}/help-vote")
async def help_vote(report_id: str):
    # TODO Checkpoint 8: simpan seen/not_seen, satu suara per (report_id, voter_id).
    raise HTTPException(status_code=501, detail="Belum diimplementasikan")
