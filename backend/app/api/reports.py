from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.materials_common import (
    full_name_for_user,
    get_status_or_500,
    is_privileged_user,
)
from app.db.database import get_db
from app.models.comment import Comment
from app.models.enums import MaterialStatus as MaterialStatusEnum
from app.models.material import Material
from app.models.report import Report
from app.models.user import User


router = APIRouter(tags=["reports"])


REASONS = {"spam", "incorrect", "inappropriate", "copyright", "other"}
TARGET_TYPES = {"material", "comment"}
STATUSES = {"open", "resolved", "dismissed"}


class ReportCreateRequest(BaseModel):
    target_type: Literal["material", "comment"]
    target_id: int
    reason: Literal["spam", "incorrect", "inappropriate", "copyright", "other"]
    comment: Optional[str] = Field(None, max_length=1000)


class ReportItemResponse(BaseModel):
    id: int
    target_type: str
    target_id: int
    target_title: Optional[str]
    target_content: Optional[str]
    reason: str
    comment: Optional[str]
    status: str
    reporter_username: Optional[str]
    reporter_full_name: Optional[str]
    resolver_username: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime


class ReportsListResponse(BaseModel):
    items: list[ReportItemResponse]
    total: int
    open_count: int


class ReportUpdateRequest(BaseModel):
    status: Literal["resolved", "dismissed"]
    action: Optional[Literal["none", "unpublish_material", "delete_comment"]] = "none"


def _target_summary(db: Session, target_type: str, target_id: int) -> tuple[Optional[str], Optional[str]]:
    if target_type == "material":
        m = db.get(Material, target_id)
        if m:
            return m.title, (m.description or "")[:200]
    elif target_type == "comment":
        c = db.get(Comment, target_id)
        if c:
            return f"Комментарий #{c.id}", c.content[:200]
    return None, None


def _serialize_report(db: Session, r: Report) -> ReportItemResponse:
    title, content = _target_summary(db, r.target_type, r.target_id)
    return ReportItemResponse(
        id=r.id,
        target_type=r.target_type,
        target_id=r.target_id,
        target_title=title,
        target_content=content,
        reason=r.reason,
        comment=r.comment,
        status=r.status,
        reporter_username=r.reporter.username if r.reporter else None,
        reporter_full_name=full_name_for_user(r.reporter) if r.reporter else None,
        resolver_username=r.resolver.username if r.resolver else None,
        resolved_at=r.resolved_at,
        created_at=r.created_at,
    )


@router.post("/reports", status_code=201)
def create_report(
    data: ReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.target_type == "material":
        if db.get(Material, data.target_id) is None:
            raise HTTPException(status_code=404, detail="Material not found")
    else:
        if db.get(Comment, data.target_id) is None:
            raise HTTPException(status_code=404, detail="Comment not found")

    report = Report(
        reporter_user_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        comment=data.comment,
        status="open",
    )
    db.add(report)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already reported this item",
        )
    db.refresh(report)
    return {"id": report.id, "status": report.status}


@router.get("/admin/reports", response_model=ReportsListResponse)
def list_reports(
    status_filter: Optional[Literal["open", "resolved", "dismissed"]] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportsListResponse:
    if not is_privileged_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access is required")

    stmt = select(Report).options(
        joinedload(Report.reporter),
        joinedload(Report.resolver),
    )
    if status_filter:
        stmt = stmt.where(Report.status == status_filter)
    stmt = stmt.order_by(Report.created_at.desc())

    items = db.scalars(stmt).all()
    open_count = db.scalar(
        select(__import__("sqlalchemy").func.count()).select_from(Report).where(Report.status == "open")
    ) or 0

    return ReportsListResponse(
        items=[_serialize_report(db, r) for r in items],
        total=len(items),
        open_count=open_count,
    )


@router.get("/admin/reports/open_count")
def get_open_reports_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not is_privileged_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access is required")
    from sqlalchemy import func as sqlfunc
    count = db.scalar(
        select(sqlfunc.count()).select_from(Report).where(Report.status == "open")
    ) or 0
    return {"count": count}


@router.patch("/admin/reports/{report_id}")
def update_report(
    report_id: int,
    data: ReportUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not is_privileged_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access is required")

    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = data.status
    report.resolved_by = current_user.id
    report.resolved_at = datetime.now(timezone.utc)

    if data.action == "unpublish_material" and report.target_type == "material":
        material = db.get(Material, report.target_id)
        if material is not None:
            archived = get_status_or_500(db, MaterialStatusEnum.ARCHIVED)
            material.status_id = archived.id
            material.status = archived
    elif data.action == "delete_comment" and report.target_type == "comment":
        comment = db.get(Comment, report.target_id)
        if comment is not None:
            db.delete(comment)

    db.commit()
    db.refresh(report)

    return {"id": report.id, "status": report.status}
