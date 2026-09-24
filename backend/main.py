import io
import os
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import pypdf
import docx
from dotenv import load_dotenv

from analyze_contract import analyze_contract_text, ContractAnalysisResult

# Load environment variables
load_dotenv()
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent / ".env")

app = FastAPI(
    title="LegalDoc.AI Contract Analysis API",
    description="Deterministic contract risk assessment and plain-English translation engine",
    version="1.0.0",
)

# Configure CORS to allow frontend connections
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for seamless local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text_from_file(filename: str, content: bytes) -> str:
    """
    Extracts plain text from PDF, DOCX, and TXT file bytes.
    """
    ext = Path(filename).suffix.lower()

    if ext == ".txt":
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return content.decode("latin-1", errors="ignore")

    elif ext == ".pdf":
        try:
            reader = pypdf.PdfReader(io.BytesIO(content))
            extracted_pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    extracted_pages.append(text.strip())
            return "\n\n".join(extracted_pages)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse PDF document: {str(e)}",
            )

    elif ext in [".docx", ".doc"]:
        try:
            doc = docx.Document(io.BytesIO(content))
            full_text = []
            for para in doc.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())
            for table in doc.tables:
                for row in table.rows:
                    row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_text:
                        full_text.append(" | ".join(row_text))
            return "\n\n".join(full_text)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse Word (.docx) document: {str(e)}",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Please upload a .pdf, .docx, or .txt file.",
        )


@app.get("/")
async def root():
    return {
        "service": "LegalDoc.AI Contract Analysis API",
        "docs": "/docs",
        "health": "/api/health",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint for the backend service.
    """
    return {
        "status": "healthy",
        "service": "LegalDoc.AI Backend",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
    }


@app.post("/api/analyze", response_model=ContractAnalysisResult)
async def analyze_contract(file: UploadFile = File(...)):
    """
    Analyzes an uploaded contract document (.pdf, .docx, .txt) and returns
    structured risk evaluation, redlines, and plain-English translation.
    """
    filename = file.filename or "unknown_contract.txt"
    ext = Path(filename).suffix.lower()

    if ext not in [".pdf", ".docx", ".doc", ".txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported formats: .pdf, .docx, .txt",
        )

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading uploaded file: {str(e)}",
        )

    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    extracted_text = extract_text_from_file(filename, content)

    if not extracted_text or len(extracted_text.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract sufficient text from the uploaded document. Please check the file contents.",
        )

    try:
        result = analyze_contract_text(extracted_text)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Contract Analysis failed: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
