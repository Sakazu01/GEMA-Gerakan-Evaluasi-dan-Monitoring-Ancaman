from fastapi import APIRouter, HTTPException, UploadFile

router = APIRouter(tags=["analyze"])


@router.post("/analyze")
async def analyze(photo: UploadFile):
    # TODO Checkpoint 7: validasi MIME/size lalu panggil app.services.model.analyze_photo.
    raise HTTPException(status_code=501, detail="Belum diimplementasikan")
