from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class SourceType(str, Enum):
    RSS     = "rss"
    REDDIT  = "reddit"
    TWITTER = "twitter"
    GDELT   = "gdelt"
    WEB     = "web"


class RawArticle(BaseModel):
    source_type:  SourceType
    source_name:  str
    url:          str
    title:        str
    snippet:      Optional[str]
    author:       Optional[str]
    published_at: Optional[datetime]
    fetched_at:   datetime
    raw_score:    Optional[float]
    language:     Optional[str]
    metadata:     dict

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
