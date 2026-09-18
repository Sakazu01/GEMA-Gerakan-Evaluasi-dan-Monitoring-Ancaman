from fastapi import APIRouter, Depends, HTTPException

from app.deps.auth import require_user
from app.schemas.requests import FalseVoteRequest, HelpVoteRequest
from app.services import reports as reports_service

router = APIRouter(tags=["votes"])

_FALSE_VOTE_STATUS = {
    "report_not_found": 404,
    "report_not_active": 404,
    "cannot_vote_own_report": 403,
    "already_voted": 409,
}
_HELP_VOTE_STATUS = {
    "report_not_found": 404,
    "report_not_active": 404,
}


@router.post("/reports/{report_id}/false-vote")
def false_vote(report_id: str, req: FalseVoteRequest, user_id: str = Depends(require_user)):
    try:
        return reports_service.cast_false_vote(report_id, user_id, req.reason)
    except reports_service.VoteError as e:
        raise HTTPException(status_code=_FALSE_VOTE_STATUS.get(e.code, 400), detail=e.code)


@router.post("/reports/{report_id}/help-vote")
def help_vote(report_id: str, req: HelpVoteRequest, user_id: str = Depends(require_user)):
    try:
        return reports_service.cast_help_vote(report_id, user_id, req.value)
    except reports_service.VoteError as e:
        raise HTTPException(status_code=_HELP_VOTE_STATUS.get(e.code, 400), detail=e.code)
